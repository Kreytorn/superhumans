// Dev-only: times the live press on a laptop (first press at once, second press after the first run).   node src/protos/A/_live.mjs   (dev server on :5201)
import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-webgpu'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
p.on('pageerror', (e) => errs.push('pageerror ' + e.message))
await p.goto('http://localhost:5201/#/proto/A/spikecount')
await p.waitForSelector('.vb[data-ready="1"]')
const snap = () => p.evaluate(() => { const r = document.querySelector('.vb'); return { state: r.dataset.state, source: r.dataset.source ?? null, edge: document.querySelector('.vb-edge').innerText.replace(/\s+/g, ' '), result: document.querySelector('.vb-result').innerText.replace(/\s+/g, ' ') } })
async function press(label) {
  const t0 = Date.now()
  await p.click('[data-qa="primary"]')
  let firstMark = null, live = null, result = null
  while (Date.now() - t0 < 40000) {
    const s = await snap()
    const t = Date.now() - t0
    if (firstMark === null && /cells outlined/.test(s.edge)) firstMark = t
    if (live === null && s.source === 'live') live = t
    if (result === null && s.state === 'result') result = t
    if (result !== null && (live !== null || t > result + 8000)) break
    await p.waitForTimeout(50)
  }
  console.log(label, { firstMark, live, result }, await snap())
}
await press('first press, at once')
await p.waitForTimeout(1500)
await press('second press')
await p.click('.vb-link')
await p.waitForTimeout(600)
console.log('how:', (await p.locator('.vb-how-list section').first().innerText()).replace(/\s+/g, ' ').slice(0, 260))
console.log(errs.length ? errs : 'no console errors')
await b.close()
