// Dev-only: BubbleGrade in the Viewbox. Checks that no sound exists before the press, that the press starts it,
// and what the answer column says at the end; also shoots the enlarged IonScan figure.
//   node src/protos/A/_bg.mjs <outDir>   (dev server on :5201)
import { chromium } from 'playwright-core'
const out = process.argv[2] ?? '.'
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-webgpu', '--autoplay-policy=document-user-activation-required'] })
const errs = []
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
p.on('pageerror', (e) => errs.push('pageerror ' + e.message))
await p.addInitScript(() => {
  window.__plays = 0
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function (...a) {
    window.__plays++
    return play.apply(this, a)
  }
})
await p.goto('http://localhost:5201/#/proto/A/bubblegrade')
await p.waitForSelector('.vb[data-ready="1"]')
await p.waitForTimeout(1500)
const snap = () => p.evaluate(() => ({ state: document.querySelector('.vb').dataset.state, source: document.querySelector('.vb').dataset.source ?? null, sound: document.querySelector('.bgm').dataset.sound, plays: window.__plays, clipS: document.querySelector('.bgm').dataset.clipS ?? null, edge: document.querySelector('.vb-edge').innerText.replace(/\s+/g, ' '), answer: document.querySelector('.vb-result').innerText.replace(/\s+/g, ' ') }))
console.log('before the press', await snap())
const t0 = Date.now()
await p.click('[data-qa="primary"]')
await p.waitForTimeout(3000)
console.log('3 s after the press', await snap())
await p.screenshot({ path: `${out}/live_listening_1440.png` })
while (Date.now() - t0 < 40000) {
  if ((await snap()).state === 'result') break
  await p.waitForTimeout(250)
}
await p.waitForTimeout(600)
console.log('result after', Date.now() - t0, 'ms', await snap())
await p.screenshot({ path: `${out}/live_result_1440.png` })
// the IonScan figure, enlarged
await p.goto('http://localhost:5201/#/proto/A/tracktrace?state=result')
await p.waitForSelector('.vb[data-ready="1"]')
await p.click('.vb-tt-down')
await p.waitForTimeout(900)
await p.click('.vb-tt-sheet')
await p.waitForTimeout(500)
console.log('figure pressed:', await p.evaluate(() => document.querySelector('.vb-tt-sheet').getAttribute('aria-pressed')))
await p.screenshot({ path: `${out}/figure_enlarged_1440.png` })
console.log('console errors:', errs.filter((e) => !/onnxruntime/.test(e)).length ? errs : 'none (onnxruntime warnings aside)')
await b.close()
