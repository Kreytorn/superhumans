// Presses through the take: each room from the home, back, the pager, a locator room, phone tap-tap; reports errors.
import { chromium } from 'playwright-core'
const base = 'http://localhost:5503/#/proto/V03/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const logs = []
const watch = (p) => {
  p.on('console', (m) => m.type() === 'error' && logs.push(m.text()))
  p.on('pageerror', (e) => logs.push(e.message))
}
const page = await browser.newPage({ viewport: { width: 1440, height: 731 } })
watch(page)
await page.goto(base + 'home', { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
const sizes = await page.evaluate(() => {
  const o = {}
  for (const t of document.querySelectorAll('.v03-svg-home .v03-sill-text')) o[t.textContent] = +t.getBoundingClientRect().height.toFixed(1)
  o.aimark = getComputedStyle(document.querySelector('.v03-aimark')).fontSize
  o.title = getComputedStyle(document.querySelector('.v03-title h1')).fontSize
  o.name = getComputedStyle(document.querySelector('.v03-ro-name')).fontSize
  o.tag = getComputedStyle(document.querySelector('.v03-ro-tag')).fontSize
  return o
})
console.log('731 sizes (sill = glyph box height px):', JSON.stringify(sizes))
const ids = ['tracktrace', 'bubblegrade', 'spikecount', 'veinsqueeze', 'braindrift', 'garnmeter']
for (const id of ids) {
  await page.waitForTimeout(400)
  const t0 = Date.now()
  await page.click(`.v03-svg-home [data-room="${id}"]`)
  await page.waitForURL(new RegExp(`/V03/${id}$`), { timeout: 8000 })
  const tr = Date.now() - t0
  await page.waitForSelector('.v03-module[data-ready="1"]', { timeout: 20000 })
  const poster = await page.$('.v03-m-poster')
  console.log(id, 'route', tr, 'ms; ready', Date.now() - t0, 'ms; poster', !!poster)
  await page.click('.v03-m-back')
  await page.waitForURL(/home\?from=/, { timeout: 8000 })
  await page.waitForSelector('.v03-home[data-ready="1"]', { timeout: 20000 })
}
await page.goto(base + 'spikecount', { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { timeout: 20000 })
await page.click('.v03-m-go.is-next')
await page.waitForURL(/\/veinsqueeze$/)
await page.click('.v03-m-go:not(.is-next)')
await page.waitForURL(/\/spikecount$/)
await page.click('.v03-m-loc [data-room="garnmeter"]')
await page.waitForURL(/\/garnmeter$/)
console.log('pager and locator ok')
await page.close()
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })
watch(phone)
await phone.goto(base + 'home', { waitUntil: 'load' })
await phone.waitForSelector('[data-ready="1"]', { timeout: 30000 })
const r = phone.locator('.v03-svg-home [data-room="spikecount"]')
await r.tap()
await phone.waitForTimeout(300)
console.log('phone after one tap:', phone.url().split('#')[1], await phone.textContent('.v03-ro-name'))
await r.tap()
await phone.waitForURL(/\/spikecount$/, { timeout: 8000 })
console.log('phone after second tap:', phone.url().split('#')[1])
console.log(logs.length ? 'errors:\n' + logs.join('\n') : 'no console errors')
await browser.close()
