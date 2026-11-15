// Dev helper: tile several shots (each cropped to a region) into one image, to compare variants at a glance.
// node src/protos/V02/_tools/crop.mjs <out.jpg> <x,y,w,h> <img1> <img2> ...
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'

const [out, box, ...imgs] = process.argv.slice(2)
const [x, y, w, h] = box.split(',').map(Number)
const cols = Math.min(imgs.length, 4)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: cols * w, height: 400 } })
const cells = imgs
  .map((f) => {
    const src = `data:image/png;base64,${readFileSync(f).toString('base64')}`
    return `<div style="position:relative;width:${w}px;height:${h + 18}px;overflow:hidden"><img src="${src}" style="position:absolute;left:${-x}px;top:${-y + 18}px"><b style="position:absolute;left:4px;top:0;font:12px monospace;color:#fff">${f.split(/[\/]/).pop()}</b></div>`
  })
  .join('')
await page.setContent(`<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${w}px)">${cells}</body>`, { waitUntil: 'load' })
await page.screenshot({ path: out, type: 'jpeg', quality: 85, fullPage: true })
await browser.close()
