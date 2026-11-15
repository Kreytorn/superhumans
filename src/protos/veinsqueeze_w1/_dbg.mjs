import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu', '--use-angle=d3d11'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (m) => console.log(m.type(), m.text().slice(0, 300)))
await page.goto('http://localhost:5604/#/proto/veinsqueeze_w1/home?state=result', { waitUntil: 'load' })
await page.waitForSelector('.vw1[data-ready="1"]', { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(1000)
console.log(await page.evaluate(() => {
  const c = document.querySelector('.vw1-tunnel')
  const cs = getComputedStyle(c)
  const body = getComputedStyle(document.body)
  const chain = []
  let el = document.querySelector('.vw1')
  while (el) { const s = getComputedStyle(el); chain.push(el.tagName + '.' + el.className + ' bg=' + s.backgroundColor + ' filter=' + s.filter + ' color-scheme=' + s.colorScheme); el = el.parentElement }
  return JSON.stringify({ w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight, pos: cs.position, z: cs.zIndex, chain }, null, 1)
}))
await page.addStyleTag({ content: '.vw1-veil,.vw1 section{display:none !important}' })
await page.waitForTimeout(500)
await page.screenshot({ path: '/tmp/vw1_tunnel.png' })
await browser.close()
