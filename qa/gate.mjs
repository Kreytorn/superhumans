// The gate for one view: every control must do something, no errors, no outside requests, accessible,
// no sideways scroll, and the BRIEF's first-viewport budget.
//   node qa/gate.mjs --port <p> --route "proto/A/home" --out <dir> [--url <full url>] [--budget warn] [--max-controls 60]
// Writes <dir>/gate.json and exits 0 (pass) or 1 (fail). Budget breaches are listed apart from failures;
// they fail the gate too unless "--budget warn" is given.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import axeModule from '@axe-core/playwright'
import { attachGuard, baseUrl, collectControls, launch, measure, newContext, openView, parseArgs, withParams } from './lib.mjs'

const AxeBuilder = axeModule.default ?? axeModule.AxeBuilder ?? axeModule
const o = parseArgs()
const base = baseUrl(o)
if (!base || typeof o.out !== 'string') {
  console.error('usage: node qa/gate.mjs --port <p> --route <hash route> --out <dir> [--url <full url>] [--budget warn] [--max-controls 60]')
  process.exit(2)
}
const out = resolve(o.out)
mkdirSync(out, { recursive: true })
const origin = new URL(base).origin
const MAX_CONTROLS = Number(o['max-controls'] ?? 60)
const EFFECT_MS = 1200
const BUDGET = { hero_share_min: 0.5, words_max: 60, text_blocks_max: 12, numbers_max: 4 }
const PROFILES = [
  { name: '1440', width: 1440, height: 900, phone: false },
  { name: '390', width: 390, height: 844, phone: true },
]
const started = Date.now()
const result = {
  url: base, checked_at: new Date().toISOString(), pass: false, functional_pass: false, budget_pass: false,
  failures: [], budget_breaches: [], dead_controls: [], controls_checked: 0, controls: [], skipped_controls: [], links: [],
  keyboard: null, console: [], axe: [], axe_minor: 0, budget: {}, sideways_scroll: {}, warnings: [], timings: { ready_ms: {} },
}
const fail = (kind, where, message) => {
  if (!result.failures.some((f) => f.kind === kind && f.where === where && f.message === message)) result.failures.push({ kind, where, message })
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const samePage = (a, b) => {
  const strip = (u) => { try { const x = new URL(u); return x.origin + x.pathname + x.search + x.hash.split('?')[0].replace(/\/$/, '') } catch { return u } }
  return strip(a) === strip(b)
}

/** Finds the control again after a reload and returns a point that really hits it. */
async function locate(page, c) {
  return page.evaluate(({ selector, via }) => {
    const el = window.__qa.find(selector)
    if (!el) return null
    const tgt = (via && window.__qa.find(via)) || el
    tgt.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
    const r = tgt.getBoundingClientRect()
    // Input coordinates are in the visual viewport; they differ from client coordinates when a phone page is zoomed to fit.
    const vv = window.visualViewport
    const k = vv ? vv.scale : 1
    const ox = vv ? vv.offsetLeft : 0
    const oy = vv ? vv.offsetTop : 0
    const name = (n) => (n ? `${n.localName}${n.id ? '#' + n.id : ''}${n.classList && n.classList.length ? '.' + [...n.classList].slice(0, 2).join('.') : ''}` : 'nothing')
    for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.25], [0.5, 0.75]]) {
      const x = r.left + r.width * fx
      const y = r.top + r.height * fy
      const hit = document.elementFromPoint(x, y)
      if (hit && (tgt.contains(hit) || el.contains(hit))) return { x: (x - ox) * k, y: (y - oy) * k, ok: true }
    }
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const inside = cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight
    return { x: (cx - ox) * k, y: (cy - oy) * k, ok: false, cover: inside ? `covered by ${name(document.elementFromPoint(cx, cy))}` : 'outside the viewport and cannot be scrolled into view' }
  }, c)
}

async function hold(page, cdp, pos, phone, ms = 900) {
  if (phone) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pos.x, y: pos.y }] })
    await sleep(ms)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } else {
    await page.mouse.move(pos.x, pos.y)
    await page.mouse.down()
    await sleep(ms)
    await page.mouse.up()
  }
}

async function act(page, cdp, c, pos, phone, alt = false) {
  if (c.kind === 'slider') return page.keyboard.press(alt ? 'ArrowLeft' : 'ArrowRight')
  if (c.kind === 'type') return page.keyboard.type('7')
  if (c.kind === 'select') {
    return page.evaluate((sel) => {
      const el = window.__qa.find(sel)
      if (!el || el.options.length < 2) return
      el.selectedIndex = (el.selectedIndex + 1) % el.options.length
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, c.selector)
  }
  if (c.kind === 'hold') return hold(page, cdp, pos, phone)
  if (phone) return page.touchscreen.tap(pos.x, pos.y)
  return page.mouse.click(pos.x, pos.y)
}

/** Waits up to EFFECT_MS for anything observable. Returns the kind of effect, or null for a dead control. */
async function waitEffect(page, guard, before, networkQuiet) {
  const t0 = Date.now()
  for (;;) {
    const final = Date.now() - t0 >= EFFECT_MS
    if (guard.popups > before.popups) return 'popup'
    if (guard.dialogs > before.dialogs) return 'dialog'
    if (guard.downloads > before.downloads) return 'download'
    let r
    try { r = await page.evaluate((f) => (window.__qa && window.__qa.snap ? window.__qa.check(f) : 'navigation'), final) } catch { return 'navigation' }
    if (r) return r
    if (networkQuiet && guard.requests > before.requests) return 'network'
    if (final) return null
    await sleep(80)
  }
}

/** Uses one control from a fresh load and reports what happened. `opener` is a control to use first (one level deep). */
async function checkControl(page, cdp, guard, url, c, phone, opener) {
  const res = await openView(page, url)
  if (!res.ready) return { status: 'skipped', reason: 'view not ready after reload' }
  if (opener) {
    const p = await locate(page, opener)
    if (!p) return { status: 'skipped', reason: 'its opener was not found after reload' }
    if (!phone && opener.kind !== 'slider') await page.mouse.move(p.x, p.y)
    await page.evaluate((s) => window.__qa.find(s)?.focus({ preventScroll: true }), opener.selector)
    await act(page, cdp, opener, p, phone)
    await sleep(700)
  }
  const pos = await locate(page, c) // scrolls the control into view; let that settle before the quiet watch
  if (!pos) return { status: 'skipped', reason: 'not found again after reload' }
  await sleep(150)
  await page.evaluate(() => window.__qa.startNoise())
  const req0 = guard.requests
  const pointer = c.kind === 'click' || c.kind === 'link' || c.kind === 'hold'
  if (pointer && !pos.ok) return { status: 'dead', reason: pos.cover }
  if (pointer && !phone) await page.mouse.move(pos.x, pos.y)
  // Hover and focus happen before the watch starts, so a hover or focus style never counts as an effect.
  await page.evaluate((s) => window.__qa.find(s)?.focus({ preventScroll: true }), c.selector)
  await sleep(350)
  const networkQuiet = guard.requests === req0
  const before = { requests: guard.requests, popups: guard.popups, dialogs: guard.dialogs, downloads: guard.downloads }
  await page.evaluate((s) => window.__qa.arm(s), c.selector)
  await act(page, cdp, c, pos, phone)
  let effect = await waitEffect(page, guard, before, networkQuiet)
  if (!effect && c.kind === 'slider') {
    await page.evaluate((s) => window.__qa.arm(s), c.selector).catch(() => {})
    await act(page, cdp, c, pos, phone, true)
    effect = await waitEffect(page, guard, before, networkQuiet)
  }
  if (pointer) {
    const miss = await page.evaluate(({ selector, via }) => {
      const q = window.__qa
      if (!q || !q.hit || !q.hit.isConnected) return null
      const el = q.find(selector)
      const tgt = (via && q.find(via)) || el
      if (!el || el.contains(q.hit) || (tgt && tgt.contains(q.hit))) return null
      return `${q.hit.localName}${q.hit.id ? '#' + q.hit.id : ''}`
    }, c).catch(() => null)
    if (miss) return { status: 'skipped', reason: `harness miss: the press landed on ${miss}, not on the control` }
  }
  return effect ? { status: 'alive', effect } : { status: 'dead', reason: `no change in the DOM, URL, media or network within ${EFFECT_MS} ms` }
}

async function followLink(page, ctx, c, where, url) {
  const entry = { where, selector: c.selector, text: c.text, href: c.href, ok: false, note: '' }
  await sleep(300)
  const pages = ctx.pages()
  const target = pages.length > 1 ? pages.at(-1) : page
  try {
    await target.waitForSelector('[data-ready="1"]', { state: 'attached', timeout: 10000 })
    entry.ok = true
  } catch {
    const info = await target.evaluate(() => ({ text: document.body ? document.body.innerText.trim().slice(0, 80) : '', spa: !!document.querySelector('#root') })).catch(() => ({ text: '', spa: false }))
    // A static page (no app root) with content counts as rendered; an app view must set data-ready.
    entry.ok = !info.spa && info.text.length > 0
    entry.note = entry.ok ? 'static page, has content' : `target never set data-ready (shows: "${info.text}")`
  }
  const bad = await target.evaluate(() => (document.querySelector('[data-error]') ? 'the view crashed' : /SuperHumans, build index/.test(document.body?.innerText ?? '') ? 'no such route (build index shown)' : '')).catch(() => '')
  if (bad) { entry.ok = false; entry.note = bad }
  if (target !== page) await target.close().catch(() => {})
  else {
    await page.goBack({ timeout: 10000 }).catch(() => {})
    const back = await page.waitForSelector('[data-ready="1"]', { state: 'attached', timeout: 10000 }).then(() => true, () => false)
    if (!back || !samePage(page.url(), url)) { entry.back_ok = false; fail('link', where, `browser Back from "${c.text}" (${c.href}) did not restore the view`) } else entry.back_ok = true
  }
  if (!entry.ok) fail('link', where, `link "${c.text}" -> ${c.href}: ${entry.note}`)
  result.links.push(entry)
}

async function crawl(page, ctx, cdp, guard, url, where, phone, seen) {
  const res = await openView(page, url)
  if (!res.ready) return
  const base = (await page.evaluate(collectControls)).filter((c) => !seen.has(`${c.selector}|${c.text}`))
  const queue = base.map((c) => ({ c, opener: null }))
  let revealed = 0
  for (let i = 0; i < queue.length; i++) {
    const { c, opener } = queue[i]
    const key = `${c.selector}|${c.text}`
    if (seen.has(key)) continue
    seen.add(key)
    const row = { where, selector: c.selector, text: c.text, kind: c.kind, primary: c.primary, opened_by: opener ? opener.text || opener.selector : undefined }
    if (result.controls_checked >= MAX_CONTROLS * PROFILES.length || seen.size > MAX_CONTROLS) {
      result.skipped_controls.push({ ...row, reason: `over the limit of ${MAX_CONTROLS} controls per size` })
      continue
    }
    if (c.selected) { result.skipped_controls.push({ ...row, reason: 'already selected (tab or radio)' }); continue }
    if (c.kind === 'link') {
      let ext = true
      try { ext = new URL(c.href).origin !== origin } catch { /* mailto: and the like */ }
      if (ext) { result.skipped_controls.push({ ...row, reason: `outside link, not followed (${c.href})` }); continue }
      if (samePage(c.href, url)) { result.skipped_controls.push({ ...row, reason: 'link to the current page' }); continue }
    }
    const t0 = Date.now()
    let r
    try { r = await checkControl(page, cdp, guard, url, c, phone, opener) } catch (e) { r = { status: 'skipped', reason: `harness error: ${String(e.message).split('\n')[0]}` } }
    result.controls_checked++
    if (r.status === 'alive') {
      result.controls.push({ ...row, effect: r.effect, ms: Date.now() - t0 })
      if (c.kind === 'link') await followLink(page, ctx, c, where, url)
      else if (!opener && r.effect !== 'navigation' && r.effect !== 'url' && revealed < 30) {
        // Controls that only exist after this one was used (a sheet, a menu) are checked one level deep.
        await sleep(500)
        const now = await page.evaluate(collectControls).catch(() => [])
        const baseKeys = new Set(base.map((b) => `${b.selector}|${b.text}`))
        for (const n of now) {
          const k = `${n.selector}|${n.text}`
          if (baseKeys.has(k) || seen.has(k) || queue.some((q) => `${q.c.selector}|${q.c.text}` === k) || revealed >= 30) continue
          queue.push({ c: n, opener: c })
          revealed++
        }
      }
    } else if (r.status === 'dead') {
      result.dead_controls.push({ ...row, reason: r.reason })
      fail('dead-control', where, `"${c.text || c.selector}" does nothing: ${r.reason}`)
    } else result.skipped_controls.push({ ...row, reason: r.reason })
  }
}

async function keyboardCheck(page, guard, url) {
  const k = { reachable: false, tabs: 0, activated: false, by: null, focus_visible: null }
  const res = await openView(page, url)
  if (!res.ready) return k
  const info = await page.evaluate(() => {
    const p = document.querySelector('[data-qa="primary"]')
    return p ? { hold: p.hasAttribute('data-hold'), slider: p.getAttribute('role') === 'slider' || p.matches('input[type="range"]') } : null
  })
  if (!info) { fail('keyboard', '1440', 'no [data-qa="primary"] on the page'); return k }
  for (let i = 1; i <= 80 && !k.reachable; i++) {
    await page.keyboard.press('Tab')
    k.reachable = await page.evaluate(() => { const p = document.querySelector('[data-qa="primary"]'); const a = document.activeElement; return !!p && !!a && a !== document.body && (p === a || p.contains(a)) })
    k.tabs = i
  }
  if (!k.reachable) { fail('keyboard', '1440', 'the primary action cannot be reached with the Tab key'); return k }
  k.focus_visible = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none' })
  if (!k.focus_visible) result.warnings.push('primary action shows no outline or ring when focused by keyboard')
  await page.evaluate(() => window.__qa.startNoise())
  const req0 = guard.requests
  await sleep(350)
  const quiet = guard.requests === req0
  const tryKey = async (key) => {
    const before = { requests: guard.requests, popups: guard.popups, dialogs: guard.dialogs, downloads: guard.downloads }
    await page.evaluate(() => window.__qa.arm('[data-qa="primary"]'))
    if (info.hold) { await page.keyboard.down(key); await sleep(900); await page.keyboard.up(key) } else await page.keyboard.press(key)
    return waitEffect(page, guard, before, quiet)
  }
  for (const key of info.slider ? ['ArrowRight', 'ArrowLeft'] : ['Enter', 'Space']) {
    const eff = await tryKey(key).catch(() => 'navigation')
    if (eff) { k.activated = true; k.by = key; k.effect = eff; break }
  }
  if (!k.activated) fail('keyboard', '1440', 'the primary action has focus but Enter and Space (arrow keys for a slider) do nothing')
  return k
}

async function staticChecks(page, base, profile, readyMs) {
  for (const state of ['idle', 'result']) {
    const where = `${state}@${profile.name}`
    const res = await openView(page, withParams(base, { state }), readyMs)
    result.timings.ready_ms[where] = res.ready_ms
    if (res.error) { fail('load', where, res.error); continue }
    if (!res.ready) fail('ready', where, `no [data-ready="1"] within ${readyMs / 1000} s`)
    await sleep(400)
    const m = await page.evaluate(measure, profile.width)
    if (res.ready && m.data_state !== state) fail('state', where, `?state=${state} shows data-state="${m.data_state}"`)
    result.budget[where] = { hero_share: Number(m.hero_share.toFixed(3)), words: m.words, text_blocks: m.text_blocks, numbers: m.numbers, number_list: m.number_list, font_families: m.font_families.length, text_colours: m.text_colours.length, primary_count: m.primary_count }
    const breach = (what, value, limit) => result.budget_breaches.push({ where, what, value, limit })
    if (m.hero_count === 0) breach('no [data-qa="hero"] element', 0, '>= 1')
    else if (m.hero_share < BUDGET.hero_share_min) breach('hero share of the viewport', Number(m.hero_share.toFixed(3)), `>= ${BUDGET.hero_share_min}`)
    if (m.words > BUDGET.words_max) breach('visible words', m.words, `<= ${BUDGET.words_max}`)
    if (m.text_blocks > BUDGET.text_blocks_max) breach('text blocks', m.text_blocks, `<= ${BUDGET.text_blocks_max}`)
    if (m.numbers > BUDGET.numbers_max) breach('numbers', m.numbers, `<= ${BUDGET.numbers_max}`)
    if (m.font_families.length > 3) result.warnings.push(`${where}: ${m.font_families.length} font families (budget 3)`)
    if (m.text_colours.length > 3) result.warnings.push(`${where}: ${m.text_colours.length} text colours (budget 3; computed values, so tints count)`)
    if (m.primary_count !== 1) result.warnings.push(`${where}: ${m.primary_count} elements marked data-qa="primary" (budget 1)`)
    result.sideways_scroll[where] = { scrolls: m.sideways_scroll, content_width: m.content_width }
    if (m.sideways_scroll) fail('sideways-scroll', where, `content is ${m.content_width} px wide in a ${profile.width} px viewport: ${m.overflow_offenders.join('; ')}`)
    else if (m.clipped_overflow) result.warnings.push(`${where}: content is ${m.content_width} px wide but clipped by overflow hidden: ${m.overflow_offenders.join('; ')}`)
    try {
      const ax = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      for (const v of ax.violations) {
        if (v.impact === 'critical' || v.impact === 'serious') {
          result.axe.push({ where, id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) })
          fail('axe', where, `${v.impact}: ${v.id} (${v.help}) on ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(', ')}`)
        } else result.axe_minor++
      }
    } catch (e) { fail('axe', where, `axe could not run: ${String(e.message).split('\n')[0]}`) }
  }
  if (profile.phone) {
    await page.setViewportSize({ width: 320, height: 700 })
    for (const state of ['idle', 'result']) {
      const where = `${state}@320`
      const res = await openView(page, withParams(base, { state }), readyMs)
      if (!res.ready) continue
      await sleep(300)
      const m = await page.evaluate(measure, 320)
      result.sideways_scroll[where] = { scrolls: m.sideways_scroll, content_width: m.content_width }
      if (m.sideways_scroll) fail('sideways-scroll', where, `content is ${m.content_width} px wide in a 320 px viewport: ${m.overflow_offenders.join('; ')}`)
    }
    await page.setViewportSize({ width: profile.width, height: profile.height })
  }
}

const browser = await launch(!!o.headed)
try {
  for (const profile of PROFILES) {
    const t0 = Date.now()
    const ctx = await newContext(browser, profile)
    const guard = await attachGuard(ctx, origin)
    const page = await ctx.newPage()
    const cdp = await ctx.newCDPSession(page)
    const first = await openView(page, base)
    result.timings.ready_ms[`plain@${profile.name}`] = first.ready_ms
    if (first.error) fail('load', profile.name, first.error)
    else if (!first.ready) fail('ready', profile.name, 'no [data-ready="1"] within 20 s')
    else {
      const seen = new Set()
      await crawl(page, ctx, cdp, guard, base, `plain@${profile.name}`, profile.phone, seen)
      await crawl(page, ctx, cdp, guard, withParams(base, { state: 'result' }), `result@${profile.name}`, profile.phone, seen)
      if (!profile.phone) result.keyboard = await keyboardCheck(page, guard, base)
    }
    // A view that never became ready is not given the full wait again for every later load.
    if (!first.error) await staticChecks(page, base, profile, first.ready ? 20000 : 5000)
    for (const e of new Set(guard.console_errors)) fail('console-error', profile.name, e)
    for (const e of new Set(guard.page_errors)) fail('page-error', profile.name, e)
    for (const e of new Set(guard.failed_requests)) fail('failed-request', profile.name, e)
    for (const e of new Set(guard.bad_responses)) fail('failed-request', profile.name, e)
    for (const e of new Set(guard.external_requests)) fail('external-request', profile.name, e)
    result.console.push(...[...new Set(guard.console_errors)].map((l) => `[${profile.name}] [error] ${l}`), ...[...new Set(guard.page_errors)].map((l) => `[${profile.name}] [pageerror] ${l}`), ...[...new Set(guard.console_warnings)].slice(0, 20).map((l) => `[${profile.name}] [warning] ${l}`))
    result.timings[`total_ms_${profile.name}`] = Date.now() - t0
    await ctx.close()
  }
} catch (e) {
  fail('harness', 'gate', `the gate itself crashed: ${String(e.stack ?? e).split('\n').slice(0, 3).join(' | ')}`)
} finally {
  await browser.close().catch(() => {})
}

result.console = result.console.slice(0, 100)
result.timings.total_ms = Date.now() - started
result.functional_pass = result.failures.length === 0
result.budget_pass = result.budget_breaches.length === 0
result.pass = result.functional_pass && (result.budget_pass || o.budget === 'warn')
writeFileSync(join(out, 'gate.json'), JSON.stringify(result, null, 2))

console.log(`${result.pass ? 'PASS' : 'FAIL'}  ${base}`)
console.log(`controls checked ${result.controls_checked}, dead ${result.dead_controls.length}, skipped ${result.skipped_controls.length}, links followed ${result.links.length}, ${Math.round(result.timings.total_ms / 1000)} s`)
for (const f of result.failures.slice(0, 40)) console.log(`  FAIL [${f.kind}] ${f.where}: ${f.message}`)
for (const b of result.budget_breaches) console.log(`  BUDGET ${b.where}: ${b.what} = ${b.value} (limit ${b.limit})`)
for (const w of result.warnings.slice(0, 10)) console.log(`  note: ${w}`)
console.log(`gate.json written to ${out}`)
process.exit(result.pass ? 0 : 1)
