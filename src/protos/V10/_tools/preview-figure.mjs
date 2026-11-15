// Dev-only: draws figure.json on its own and saves a picture, to judge the engraving without the page.
//   node src/protos/V10/_tools/preview-figure.mjs <out.png>
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const HERE = dirname(fileURLToPath(import.meta.url))
const fig = JSON.parse(readFileSync(join(HERE, '..', 'figure.json'), 'utf8'))
const out = process.argv[2]
const p = (d, cls, w) => `<path d="${d}" class="${cls}" style="stroke-width:${w}"/>`
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1100 -1150 2200 2250" width="1100" height="1125">
<defs><linearGradient id="g" x1="0" y1="-1000" x2="0" y2="1000" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#e9b85c"/><stop offset="1" stop-color="#a8641c"/></linearGradient></defs>
<style>path{fill:none;stroke:url(#g);stroke-linecap:round;stroke-linejoin:round}.b{opacity:.55}.au{opacity:.3}</style>
<circle r="1030" fill="none" stroke="#c99a4a" stroke-width="3"/>
<rect x="-875" y="-720" width="1750" height="1750" fill="none" stroke="#c99a4a" stroke-width="2" opacity=".5"/>
${fig.aura.map((l) => p(l.d, 'au', 2)).join('')}
${fig.b.hatch.map((l) => p(l.d, 'b', 1.6)).join('')}
${fig.b.outline.map((l) => p(l.d, 'b', 3.2)).join('')}
${fig.a.hatch.map((l) => p(l.d, 'a', 1.2 + (1 - l.k / fig.levels) * 1.8)).join('')}
${fig.a.outline.map((l) => p(l.d, 'a', 4.5)).join('')}
</svg>`
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1100, height: 1125 } })
await page.setContent(`<body style="margin:0;background:#0b0a1e">${svg}</body>`)
await page.screenshot({ path: out })
await browser.close()
console.log('saved', out)
