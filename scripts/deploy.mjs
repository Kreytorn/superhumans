// One-command release: builds the site from a git snapshot and publishes it.
//   node app/scripts/deploy.mjs [--ref HEAD] [--repo superhumans] [--no-push] [--no-verify]
// Run from the project root with Node on PATH. Needs git and the GitHub CLI (gh, logged in).
//
// What it does (work/Web/RELEASE_STEPS.md, rules 2-9):
//   1. exports app/ at <ref> with `git archive` into a temp folder (never builds the live tree),
//   2. links node_modules with a junction and runs `vite build` there,
//   3. drops what must not be on the site (parity references, mock data, QA fixtures), adds .nojekyll,
//   4. refuses to continue if the snapshot or the built site holds personal data or a restricted licence,
//   5. commits the source snapshot to `main` and the built site to `gh-pages` of the public clone
//      (.public/<repo>, a separate repository; the project repository itself is never pushed),
//   6. checks the live site: HTTPS 200, one model file byte-for-byte, and the engine self-test in
//      headless Microsoft Edge (cross-origin isolated through coi-serviceworker).
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const argv = process.argv.slice(2)
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`)
  return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : d
}
const flag = (k) => argv.includes(`--${k}`)

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.resolve(appDir, '..')
const ref = opt('ref', 'HEAD')
const publicRoot = path.join(root, '.public')
const shotsDir = path.join(root, 'work', 'Web', 'shots', 'release')
const RETRIES = 5

const checks = []
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`)
}
const step = (s) => console.log(`\n== ${new Date().toTimeString().slice(0, 8)} ${s}`)
const die = (msg) => {
  console.error(`\nDEPLOY STOPPED: ${msg}`)
  process.exit(1)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function run(cmd, args, o = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'], ...o }).trim()
}
function tryRun(cmd, args, o = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...o })
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() }
}
async function retry(label, fn) {
  for (let i = 1; ; i++) {
    try {
      return await fn()
    } catch (e) {
      const msg = String(e.stderr || e.message || e).trim().split('\n').slice(-3).join(' | ')
      if (i >= RETRIES) throw new Error(`${label} failed after ${RETRIES} tries: ${msg}`)
      console.log(`   ${label}: try ${i} failed (${msg.slice(0, 200)}); retrying in ${5 * i} s`)
      await sleep(5000 * i)
    }
  }
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.isFile()) out.push(p)
  }
  return out
}
function emptyDirExceptGit(dir) {
  for (const e of fs.readdirSync(dir)) if (e !== '.git') fs.rmSync(path.join(dir, e), { recursive: true, force: true })
}
function copyTree(src, dst) {
  // top-level node_modules, dist and release never travel
  fs.cpSync(src, dst, { recursive: true, filter: (s) => !(path.dirname(s) === src && ['node_modules', 'dist', 'release'].includes(path.basename(s))) })
}

// ---------------------------------------------------------------- 0. identity and names
step('identity')
const login = await retry('gh api user', () => run('gh', ['api', 'user', '--jq', '.login']))
const uid = await retry('gh api user', () => run('gh', ['api', 'user', '--jq', '.id']))
const idName = login
const idEmail = `${uid}+${login}@users.noreply.github.com`
const repoName = opt('repo', fs.existsSync(publicRoot) ? (fs.readdirSync(publicRoot).find((d) => fs.existsSync(path.join(publicRoot, d, '.git'))) ?? 'superhumans') : 'superhumans')
const clone = path.join(publicRoot, repoName)
const repoUrl = `https://github.com/${login}/${repoName}`
const siteUrl = `https://${login.toLowerCase()}.github.io/${repoName}/`
const commit = run('git', ['-C', root, 'rev-parse', ref])
const short = commit.slice(0, 7)
console.log(`repo ${repoUrl}\nsite ${siteUrl}\nref  ${ref} = ${short}\nas   ${idName} <${idEmail}>`)

// ---------------------------------------------------------------- 1. snapshot (rule 6)
step('snapshot of app/ at ' + short)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `sh-deploy-${short}-`))
// autocrlf off: files must come out byte-for-byte as committed (the manifests record sizes and hashes).
run('git', ['-C', root, '-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'archive', '--format=tar', '-o', path.join(tmp, 'app.tar'), commit, 'app'])
run('tar', ['-xf', 'app.tar'], { cwd: tmp })
fs.rmSync(path.join(tmp, 'app.tar'))
const snap = path.join(tmp, 'app')
if (!fs.existsSync(path.join(snap, 'LICENSE'))) die('app/LICENSE is not in the snapshot')
console.log(`${walk(snap).length} files in ${snap}`)

// ---------------------------------------------------------------- 2. build
step('vite build')
const nm = path.join(snap, 'node_modules')
fs.symlinkSync(path.join(appDir, 'node_modules'), nm, 'junction')
let dist = path.join(snap, 'dist')
try {
  const b = spawnSync(process.execPath, [path.join(appDir, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
    cwd: snap,
    encoding: 'utf8',
    env: { ...process.env, VITE_CACHE_DIR: 'node_modules/.vite-deploy' },
    maxBuffer: 1 << 28,
  })
  console.log((b.stdout ?? '').trim().split('\n').slice(-6).join('\n'))
  if (b.status !== 0) die('vite build failed:\n' + (b.stderr ?? '').slice(-3000))
} finally {
  // Remove the junction only, never its target (the project's shared node_modules).
  try {
    fs.rmdirSync(nm)
  } catch {
    fs.unlinkSync(nm)
  }
}
if (fs.existsSync(nm)) die('could not remove the node_modules junction in ' + snap + '; remove it by hand (rmdir, not a recursive delete)')
if (!fs.existsSync(path.join(dist, 'index.html'))) die('no dist/index.html after the build')

// ---------------------------------------------------------------- 3. not on the site (rule 5), Pages files (rule 7)
step('prune and stamp')
const pruned = []
for (const e of fs.readdirSync(dist, { withFileTypes: true })) {
  if (!e.isDirectory()) continue
  for (const sub of e.name === 'tracktrace' ? ['parity', 'mock'] : ['parity', 'fixtures']) {
    const p = path.join(dist, e.name, sub)
    if (fs.existsSync(p)) (fs.rmSync(p, { recursive: true }), pruned.push(`${e.name}/${sub}`))
  }
}
for (const d of ['parity', 'qa']) {
  const p = path.join(dist, d)
  if (fs.existsSync(p)) (fs.rmSync(p, { recursive: true }), pruned.push(d))
}
fs.writeFileSync(path.join(dist, '.nojekyll'), '')
const builtAt = new Date().toISOString()
fs.writeFileSync(path.join(dist, 'version.json'), JSON.stringify({ commit: short, builtAt }) + '\n')
console.log('removed from the site: ' + (pruned.join(', ') || 'nothing'))
check('coi-serviceworker.js is in the site', fs.existsSync(path.join(dist, 'coi-serviceworker.js')))
check('coi-serviceworker is the first script of index.html', /<head>(?:(?!<script)[\s\S])*<script src="\.\/coi-serviceworker\.js">/.test(fs.readFileSync(path.join(dist, 'index.html'), 'utf8')))
const distFiles = walk(dist)
const distBytes = distFiles.reduce((s, f) => s + fs.statSync(f).size, 0)
const tooBig = distFiles.filter((f) => fs.statSync(f).size > 95 * 1024 * 1024)
check('no file over 95 MB (GitHub limit is 100 MB)', tooBig.length === 0, tooBig.map((f) => path.relative(dist, f)).join(', '))
console.log(`site: ${distFiles.length} files, ${(distBytes / 1e6).toFixed(1)} MB`)

// ---------------------------------------------------------------- 4. nothing personal ships (rule 3), licences (rule 4)
step('personal-data and licence scan')
// The words to look for are read from this machine at run time, so none of them is written in this file.
const owner = new Set([os.userInfo().username])
for (const k of ['user.name', 'user.email']) {
  const v = tryRun('git', ['-C', root, 'config', k]).out
  if (!v) continue
  owner.add(v)
  for (const w of v.split(/[\s@._+-]+/)) if (w.length >= 5 && !/^(users|noreply|github|gmail|team|superhumans)$/i.test(w)) owner.add(w)
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hard = new RegExp([...[...owner].filter((w) => w.length >= 4).map(esc), 'gmail', '[A-Za-z]:[\\\\/]+Users[\\\\/]', '/[a-z]/Users/', '/mnt/[a-z]/', '/home/[a-z0-9_]+/', '/content/', '/root/', '/Users/[A-Za-z0-9_]+/'].join('|'), 'gi')
const mail = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[a-z]{2,}/g
const hits = []
const mails = new Map()
// The public GitHub login is part of the site's own address (repo and Pages URL, e.g. on the QR screen and the
// credits page), so it is public by design: mask it before the search, or a shorter git user.name inside it would hit.
const publicLogin = new RegExp(esc(login), 'gi')
const scanOne = (label, buf) => {
  const s = buf.toString('latin1').replace(publicLogin, (x) => '#'.repeat(x.length))
  for (const m of s.matchAll(hard)) {
    hits.push(`${label}: "${s.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/[^\x20-\x7e]/g, '.')}"`)
    if (hits.length > 40) return
  }
  if (!/\.(onnx|bin|glb|webp|png|jpg|webm|wav|woff2?|f32|u8|gz|ico|tar)$/i.test(label))
    for (const m of s.matchAll(mail)) if (!/@(\d|users\.noreply)/.test(m[0]) && !/\.(png|jpg|webp|svg|js|css|woff2?)$/i.test(m[0])) mails.set(m[0], label)
}
for (const [name, dir] of [['source', snap], ['site', dist]]) {
  for (const f of walk(dir)) {
    if (name === 'source' && f.startsWith(dist)) continue
    const rel = `${name}/${path.relative(dir, f).replaceAll('\\', '/')}`
    if (rel === 'source/package-lock.json') continue // registry URLs and hashes only
    if (rel === 'source/scripts/deploy.mjs') continue // this file: it holds the search patterns themselves
    const buf = fs.readFileSync(f)
    scanOne(rel, buf)
    if (f.endsWith('.gz')) {
      try {
        scanOne(rel + ' (unzipped)', gunzipSync(buf))
      } catch {
        /* not a real gzip stream */
      }
    }
  }
}
check('no owner name, private mail or local path in the source snapshot or the site', hits.length === 0, hits.slice(0, 8).join(' ; '))
if (mails.size) console.log('e-mail addresses found (third-party notices; review):\n   ' + [...mails].map(([m, f]) => `${m}  in ${f}`).slice(0, 30).join('\n   '))
const restricted = []
for (const f of walk(path.join(snap, 'public')).filter((f) => path.basename(f) === 'manifest.json')) {
  const m = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const e of m.files ?? []) {
    const text = `${e.licence ?? ''} ${e.license ?? ''} ${e.credit ?? ''}`
    if (/\bNC\b|\bND\b|non-?commercial|no-?deriv|all rights reserved|unclear/i.test(text)) restricted.push(`${path.basename(path.dirname(f))}: ${e.path}`)
  }
}
check('no manifest entry with a non-commercial, no-derivatives or unclear licence', restricted.length === 0, restricted.slice(0, 6).join(' ; '))
if (checks.some((c) => !c.ok)) die('a pre-publish check failed; nothing was pushed')

// ---------------------------------------------------------------- 5. public clone: main (rule 8) and gh-pages (rule 7)
const git = (...a) => run('git', ['-C', clone, ...a])
const gitTry = (...a) => tryRun('git', ['-C', clone, ...a])
const report = { repoUrl, siteUrl, commit: short, builtAt, identity: `${idName} <${idEmail}>`, pruned, siteFiles: distFiles.length, siteBytes: distBytes }

if (!flag('no-push')) {
  step('public clone ' + clone)
  if (!fs.existsSync(path.join(clone, '.git'))) {
    fs.mkdirSync(publicRoot, { recursive: true })
    await retry('git clone', () => run('git', ['clone', '--quiet', `${repoUrl}.git`, clone]))
  }
  git('config', 'user.name', idName)
  git('config', 'user.email', idEmail)
  git('config', 'core.autocrlf', 'false')
  git('config', 'core.safecrlf', 'false')
  git('config', 'http.postBuffer', '524288000')
  git('config', 'http.lowSpeedLimit', '0')
  git('config', '--replace-all', 'credential.helper', '')
  git('config', '--add', 'credential.helper', '!gh auth git-credential')
  await retry('git fetch', () => run('git', ['-C', clone, 'fetch', '--quiet', '--prune', 'origin']))

  const publish = async (branch, srcDir, message, extra = () => {}) => {
    step(`${branch}: commit and push`)
    const remote = gitTry('rev-parse', '--verify', '--quiet', `origin/${branch}`).ok
    if (remote) git('checkout', '--quiet', '--force', '-B', branch, `origin/${branch}`)
    else if (gitTry('rev-parse', '--verify', '--quiet', `refs/heads/${branch}`).ok) git('checkout', '--quiet', '--force', branch)
    else {
      git('symbolic-ref', 'HEAD', `refs/heads/${branch}`) // a new branch with no history
      git('read-tree', '--empty')
    }
    emptyDirExceptGit(clone)
    copyTree(srcDir, clone)
    extra()
    git('add', '--all')
    if (gitTry('diff', '--cached', '--quiet').ok && gitTry('rev-parse', '--verify', '--quiet', 'HEAD').ok) console.log('   no changes on ' + branch)
    else git('commit', '--quiet', '-m', message)
    const who = git('log', '-1', '--format=%an <%ae> | %cn <%ce>')
    const okWho = who === `${idName} <${idEmail}> | ${idName} <${idEmail}>`
    check(`${branch}: last commit carries the public identity`, okWho, who)
    if (!okWho) die('wrong identity on the commit; not pushing')
    await retry(`git push ${branch}`, () => run('git', ['-C', clone, 'push', '--quiet', '--set-upstream', 'origin', branch], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 45 * 60 * 1000 }))
    report[branch] = git('rev-parse', '--short', 'HEAD')
    console.log(`   pushed ${branch} at ${report[branch]}`)
  }

  await publish('main', snap, `Source snapshot ${short}`, () => {
    fs.rmSync(path.join(clone, 'dist'), { recursive: true, force: true })
    for (const f of ['LICENSE', 'README.md']) if (!fs.existsSync(path.join(clone, f))) die(`${f} is missing at the top of the source snapshot`)
  })
  await publish('gh-pages', dist, `Site built from ${short}`)
  git('checkout', '--quiet', '--force', 'main')

  step('GitHub Pages')
  const api = `repos/${login}/${repoName}/pages`
  let pages = tryRun('gh', ['api', api])
  if (!pages.ok) {
    await retry('enable Pages', () => {
      const r = tryRun('gh', ['api', '-X', 'POST', api, '-f', 'source[branch]=gh-pages', '-f', 'source[path]=/'])
      if (!r.ok && !/409|already/i.test(r.err + r.out)) throw new Error(r.err || r.out)
    })
    pages = tryRun('gh', ['api', api])
  }
  let pagesInfo = {}
  try {
    pagesInfo = JSON.parse(pages.out)
  } catch {
    /* reported below */
  }
  check('Pages serves gh-pages from /', pagesInfo?.source?.branch === 'gh-pages' && pagesInfo?.source?.path === '/', `${pagesInfo?.html_url ?? pages.err}`)
}

// ---------------------------------------------------------------- 6. verify the live site (rule 9)
if (!flag('no-verify') && !flag('no-push')) {
  step('verify ' + siteUrl)
  const get = async (u, o = {}) => fetch(u, { cache: 'no-store', redirect: 'follow', ...o })
  let live = false
  for (let i = 0; i < 150 && !live; i++) {
    try {
      const r = await get(`${siteUrl}version.json?t=${Date.now()}`)
      if (r.ok) live = (await r.json()).builtAt === builtAt
    } catch {
      /* not up yet */
    }
    if (!live) {
      if (i % 6 === 0) console.log(`   waiting for Pages to publish this build (${i * 10} s)`)
      await sleep(10000)
    }
  }
  check('the live site serves this build (version.json)', live, short)
  try {
    const r = await retry('GET site', () => get(siteUrl))
    check('site answers 200 over HTTPS', r.status === 200 && r.url.startsWith('https://'), `${r.status} ${r.url}`)
  } catch (e) {
    check('site answers 200 over HTTPS', false, String(e.message))
  }
  // the smallest real model file (over 1 MB), to keep the check light on a slow link
  const model = distFiles.filter((f) => /\.onnx(\.part\d+)?$/.test(f) && fs.statSync(f).size > 1e6).sort((a, b) => fs.statSync(a).size - fs.statSync(b).size)[0]
  if (model) {
    const rel = path.relative(dist, model).replaceAll('\\', '/')
    try {
      const buf = await retry('GET model', async () => {
        const r = await get(siteUrl + rel)
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return Buffer.from(await r.arrayBuffer())
      })
      const local = fs.readFileSync(model)
      check(`model file ${rel}: 200, ${local.length} bytes, same sha256`, buf.length === local.length && sha256(buf) === sha256(local), `got ${buf.length} bytes`)
    } catch (e) {
      check(`model file ${rel}`, false, String(e.message))
    }
  }
  try {
    const { chromium } = await import('playwright-core')
    fs.mkdirSync(shotsDir, { recursive: true })
    const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=d3d11', '--hide-scrollbars'] })
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    const logs = []
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
    await page.goto(`${siteUrl}#/selftest`, { waitUntil: 'load' })
    let text = ''
    let isolated = false
    for (let i = 0; i < 90; i++) {
      await sleep(1000)
      try {
        text = await page.evaluate(() => document.body.innerText)
        isolated = await page.evaluate(() => self.crossOriginIsolated === true)
      } catch {
        continue // the service worker's one reload is in flight
      }
      if (/SELFTEST (PASS|FAIL)/.test(text) && isolated) break
    }
    const backend = /backend (\w+)/.exec(text)?.[1] ?? 'unknown'
    const threads = /threads (\d+)/.exec(text)?.[1] ?? '?'
    check('self-test on the live site: SELFTEST PASS', text.includes('SELFTEST PASS'), text.split('\n')[0].slice(0, 160))
    check('crossOriginIsolated === true after the service worker reload', isolated, `backend ${backend}, threads ${threads}`)
    report.backend = backend
    report.threads = threads
    await page.screenshot({ path: path.join(shotsDir, 'live_selftest.png') })
    await page.goto(siteUrl, { waitUntil: 'load' })
    await sleep(4000)
    await page.screenshot({ path: path.join(shotsDir, 'live_home_1440.png') })
    const phone = await ctx.newPage()
    await phone.setViewportSize({ width: 390, height: 844 })
    await phone.goto(siteUrl, { waitUntil: 'load' })
    await sleep(3000)
    await phone.screenshot({ path: path.join(shotsDir, 'live_home_390.png') })
    const errs = logs.filter((l) => /^\[(error|pageerror)\]/.test(l))
    if (errs.length) console.log('   browser errors:\n   ' + errs.slice(0, 10).join('\n   '))
    report.browserErrors = errs.slice(0, 10)
    await browser.close()
    console.log('   screenshots in ' + shotsDir)
  } catch (e) {
    check('headless Edge self-test', false, String(e.message).split('\n')[0])
  }
}

// ---------------------------------------------------------------- report
report.checks = checks
report.ok = checks.every((c) => c.ok)
fs.mkdirSync(shotsDir, { recursive: true })
fs.writeFileSync(path.join(shotsDir, 'last_deploy.json'), JSON.stringify(report, null, 1))
try {
  fs.rmSync(tmp, { recursive: true, force: true })
} catch {
  /* a locked temp folder is harmless */
}
console.log(`\n${report.ok ? 'DEPLOY OK' : 'DEPLOY FINISHED WITH FAILED CHECKS'}  ${new Date().toTimeString().slice(0, 5)}\nsite ${siteUrl}\nrepo ${repoUrl}\n${checks.filter((c) => !c.ok).map((c) => 'FAILED: ' + c.name).join('\n')}`)
process.exit(report.ok ? 0 : 1)
