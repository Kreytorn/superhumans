// Dev-only: checks the entrance, the move into a chamber and the way back, on the wall clock.
// node src/protos/V04/_tools/timing.mjs <outprefix> [WxH] [n] [--slow 4]  (--slow: CPU throttle rate)
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const val = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d)
const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')))
const [out, size = '1440x900', n = '3'] = pos
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone })
const logs = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text().slice(0, 200)}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
if (val('--slow')) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(val('--slow')) })
}
const shot = (name) => page.screenshot({ path: `${out}_${name}.png` })
const state = () =>
  page.evaluate(() => {
    const r = document.querySelector('.v04')
    const t = document.querySelector('.v04-title')
    const vis = [...document.querySelectorAll('.v04-ch')].map((b) => b.dataset.vis).join('')
    const big = [...document.querySelectorAll('.v04-ch')].some((b) => b.dataset.vis === '1' && b.getBoundingClientRect().width > innerWidth * 1.5)
    const home = document.querySelector('.v04-home')
    return `phase=${r?.dataset.phase} ready=${r?.dataset.ready} hash=${location.hash.slice(10)} title=${t ? getComputedStyle(t).opacity.slice(0, 4) : '-'} vis=${vis} inert=${home?.inert} big=${big} flash=${getComputedStyle(document.querySelector('.v04-flash')).opacity.slice(0, 4)}`
  })
const t0 = Date.now()
await page.goto('http://localhost:5504/#/proto/V04/home', { waitUntil: 'domcontentloaded' })
for (const t of [700, 1200, 1800]) {
  await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)))
  await shot(`load${t}`)
  console.log('load', Date.now() - t0, await state())
}
await page.waitForSelector('.v04[data-ready="1"]', { timeout: 30000 })
console.log('ready at', Date.now() - t0)
await page.waitForTimeout(500)
const c0 = Date.now()
await page.evaluate((n) => document.querySelector(`.v04-ch:nth-child(${n})`).click(), n)
let opened = 0
for (let i = 0; i < 40; i++) {
  const s = await state()
  if (i % 3 === 0 || (!opened && s.includes('phase=open'))) console.log('fly', Date.now() - c0, s)
  if (!opened && s.includes('phase=open')) opened = Date.now() - c0
  if (opened && Date.now() - c0 > opened + 400) break
  await page.waitForTimeout(60)
}
console.log('OPENED after', opened, 'ms')
await page.waitForTimeout(1500)
const b0 = Date.now()
await page.click('.v04-back')
for (let i = 0; i < 30; i++) {
  console.log('back', Date.now() - b0, await state())
  if (i === 4) await shot('back')
  await page.waitForTimeout(100)
}
await shot('backdone')
if (logs.length) console.log(logs.slice(-12).join('\n'))
await browser.close()
