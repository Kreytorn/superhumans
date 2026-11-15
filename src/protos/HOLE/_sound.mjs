// Dev-only: does BubbleGrade make sound after the press? Records every AudioContext and media element that plays.
// node src/protos/HOLE/_sound.mjs
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(m.text()))
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message))
await page.addInitScript(() => {
  const w = window
  w.__ac = []
  const AC = w.AudioContext
  w.AudioContext = class extends AC {
    constructor(...a) {
      super(...a)
      w.__ac.push(this)
    }
  }
  w.__played = 0
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function (...a) {
    w.__played++
    return play.apply(this, a)
  }
  w.__src = 0
  const start = AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start = function (...a) {
    w.__src++
    return start.apply(this, a)
  }
})
await page.goto('http://localhost:5324/#/proto/HOLE/bubblegrade?q=1', { waitUntil: 'load' })
await page.waitForSelector('.hole[data-ready="1"]', { timeout: 30000 })
await page.waitForTimeout(3000)
await page.click('.hole-run')
await page.waitForTimeout(14000)
const r = await page.evaluate(() => ({
  contexts: window.__ac.map((c) => c.state),
  mediaPlays: window.__played,
  bufferStarts: window.__src,
  state: document.querySelector('.hole-mod')?.getAttribute('data-state'),
  button: document.querySelector('.hole-run')?.textContent,
  sound: document.querySelector('[data-sound]')?.getAttribute('data-sound'),
  beat: document.querySelector('[data-beat]')?.getAttribute('data-beat'),
  source: document.querySelector('[data-source]')?.getAttribute('data-source'),
  audios: [...document.querySelectorAll('audio')].map((a) => [a.paused, a.currentTime.toFixed(1), a.muted, a.volume]),
}))
console.log(JSON.stringify(r))
if (logs.length) console.log(logs.join('\n'))
await browser.close()
