// Dev-only (polish 2): measures the module page heads and the home labels, and saves pictures.
// node src/protos/V04/_tools/p2.mjs mods <outdir> <WxH> [ids]      one picture per module page + head measurements
// node src/protos/V04/_tools/p2.mjs home <outdir> <WxH> [hoverN]   home picture + label boxes and overlaps
import { chromium } from 'playwright-core'
const [mode, outDir, size = '1440x900', extra] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone })
const logs = []
page.on('console', (m) => m.type() === 'error' && !m.text().includes('VerifyEachNode') && logs.push(`[error] ${m.text().slice(0, 200)}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
const ids = (mode === 'mods' && extra ? extra : 'tracktrace,bubblegrade,spikecount,veinsqueeze,braindrift,garnmeter').split(',')
if (mode === 'mods') {
  for (const id of ids) {
    await page.goto(`http://localhost:5504/#/proto/V04/${id}`, { waitUntil: 'load' })
    await page.waitForSelector('.v04[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push('not ready ' + id))
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${outDir}/mod_${id}_${size}.png` })
    const m = await page.evaluate(() => {
      const r = (s) => document.querySelector(s)?.getBoundingClientRect()
      const h1 = document.querySelector('.v04-head h1')
      const run = document.querySelector('.v04-run')
      const sen = document.querySelector('.v04-sentence')
      const f = r('.v04-frame')
      const mod = document.querySelector('.v04-mod')
      const lh = sen ? parseFloat(getComputedStyle(sen).lineHeight) : 1
      return {
        h1: h1 ? `${Math.round(h1.getBoundingClientRect().width)}w sw${h1.scrollWidth} cw${h1.clientWidth} fs${getComputedStyle(h1).fontSize} lines${Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight))}` : '-',
        run: run ? `${Math.round(run.getBoundingClientRect().width)}w sw${run.scrollWidth} cw${run.clientWidth}` : 'none',
        sentence: sen ? `${Math.round(sen.getBoundingClientRect().width)}w ${Math.round(sen.getBoundingClientRect().height / lh)}lines top${Math.round(sen.getBoundingClientRect().top)}` : '-',
        frame: f ? `top${Math.round(f.top)} h${Math.round(f.height)} bottom${Math.round(f.bottom)}` : '-',
        scroll: mod ? mod.scrollHeight - mod.clientHeight : 0,
        sw: document.documentElement.scrollWidth,
        homeButtons: document.querySelectorAll('.v04-ch').length,
        primary: [...document.querySelectorAll('[data-qa="primary"]')].map((e) => e.className.toString().slice(0, 20)).join('|'),
      }
    })
    console.log(id, size, JSON.stringify(m))
  }
} else {
  const t0 = Date.now()
  await page.goto('http://localhost:5504/#/proto/V04/home', { waitUntil: 'load' })
  await page.waitForSelector('.v04[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push('not ready'))
  console.log('ready', Date.now() - t0)
  await page.waitForTimeout(600)
  if (extra) {
    await page.hover(`.v04-ch:nth-child(${extra})`, { force: true })
    await page.waitForTimeout(900)
  }
  await page.screenshot({ path: `${outDir}/home_${size}${extra ? '_h' + extra : ''}.png` })
  const tags = await page.evaluate(() =>
    [...document.querySelectorAll('.v04-ch')].map((b) => {
      const t = b.querySelector('.v04-ch-tag').getBoundingClientRect()
      const c = b.getBoundingClientRect()
      return { vis: b.dataset.vis, tag: [t.left, t.top, t.right, t.bottom].map(Math.round), ch: [c.left, c.top, c.right, c.bottom].map(Math.round) }
    }),
  )
  tags.forEach((t, i) => console.log(i + 1, JSON.stringify(t)))
  const title = await page.evaluate(() => {
    const h = document.querySelector('.v04-title h1').getBoundingClientRect()
    return [h.left, h.top, h.right, h.bottom].map(Math.round)
  })
  console.log('title', JSON.stringify(title))
  // overlaps between labels
  for (let i = 0; i < 6; i++)
    for (let j = i + 1; j < 6; j++) {
      const a = tags[i].tag
      const b = tags[j].tag
      const gapY = Math.max(b[1] - a[3], a[1] - b[3])
      const gapX = Math.max(b[0] - a[2], a[0] - b[2])
      if (gapY < 24 && gapX < 24) console.log(`labels ${i + 1} and ${j + 1} close: gapX ${gapX} gapY ${gapY}`)
    }
}
if (logs.length) console.log(logs.slice(-10).join('\n'))
await browser.close()
