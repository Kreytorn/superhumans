// Dev-only (polish 2): run a check on its page, wait for the result, save pictures while running and at the result.
// node src/protos/V04/_tools/run2.mjs <outprefix> <module> <WxH>
import { chromium } from 'playwright-core'
const [out, id, size = '1440x731'] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone })
const logs = []
page.on('console', (m) => m.type() === 'error' && !m.text().includes('VerifyEachNode') && logs.push(`[error] ${m.text().slice(0, 200)}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(`http://localhost:5504/#/proto/V04/${id}`, { waitUntil: 'load' })
await page.waitForSelector('.v04[data-ready="1"]', { timeout: 30000 })
await page.waitForTimeout(1500)
const head = () => page.evaluate(() => {
  const r = (s) => document.querySelector(s)?.getBoundingClientRect()
  const f = r('.v04-frame'), run = r('.v04-run'), s = document.querySelector('.v04-sentence')
  return `frameTop=${Math.round(f.top)} run=${run ? Math.round(run.width) : '-'} sentenceH=${s ? Math.round(s.getBoundingClientRect().height) : '-'}`
})
console.log('before', await head())
const sel = id === 'veinsqueeze' ? '.vsq-hold' : '.v04-run'
await page.click(sel)
await page.waitForTimeout(1200)
console.log('running', await head())
await page.screenshot({ path: `${out}_running.png` })
await page.waitForSelector('.v04-mod[data-state="result"]', { timeout: 60000 }).catch(() => logs.push('no result'))
await page.waitForTimeout(2500)
await page.screenshot({ path: `${out}_result.png` })
console.log('result', await head())
const m = await page.evaluate(() => {
  const st = document.querySelector('.v04-stage-in').getBoundingClientRect()
  const nx = document.querySelector('.ttm-next')?.getBoundingClientRect()
  const sm = document.querySelector('.v04-act-mid small')
  const act = document.querySelector('.v04-act')?.getBoundingClientRect()
  return { stage: [st.top, st.bottom].map(Math.round), next: nx ? [nx.top, nx.bottom].map(Math.round) : null, small: sm ? `${sm.scrollWidth}/${sm.clientWidth} ${Math.round(sm.getBoundingClientRect().bottom)}` : null, actBottom: act ? Math.round(act.bottom) : null, scroll: document.querySelector('.v04-mod').scrollHeight - document.querySelector('.v04-mod').clientHeight, h: innerHeight }
})
console.log(JSON.stringify(m))
if (logs.length) console.log(logs.join('\n'))
await browser.close()
