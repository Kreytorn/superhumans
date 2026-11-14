// Dev-only parity runner: opens app/parity/<module>.html in headless Microsoft Edge (playwright-core,
// no browser download) and prints what the page reports.
//   node scripts/parity.mjs <module> [--port 5191] [--wasm] [--headed] [--timeout 300]
// The page must set document.body.dataset.parity to "pass" | "fail" | "error" when it is done,
// and window.__parity to a JSON-serialisable report (backend, adapter, per-case diffs, timings).
// "--wasm" opens the page with "#?backend=wasm", which src/lib/infer/client.ts reads to force wasm.
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const mod = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a))
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`)
  return i >= 0 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : d
}
const port = Number(opt('port', '5173'))
const wasm = args.includes('--wasm')
const headed = args.includes('--headed')
const timeoutS = Number(opt('timeout', '300'))
if (!mod) {
  console.error('usage: node scripts/parity.mjs <module> [--port N] [--wasm] [--headed] [--timeout S]')
  process.exit(2)
}

const browser = await chromium.launch({
  channel: 'msedge',
  headless: !headed,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=d3d11', '--hide-scrollbars'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
const url = `http://localhost:${port}/parity/${mod}.html${wasm ? '#?backend=wasm' : ''}`
await page.goto(url, { waitUntil: 'load' })
try {
  await page.waitForFunction(
    () => ['pass', 'fail', 'error'].includes(document.body?.dataset?.parity ?? ''),
    null,
    { timeout: timeoutS * 1000 },
  )
} catch {
  logs.push(`[runner] no data-parity after ${timeoutS} s`)
}
const status = await page.evaluate(() => document.body?.dataset?.parity ?? 'timeout')
const result = await page.evaluate(() => window.__parity ?? null)
console.log(JSON.stringify({ module: mod, url, backendRequested: wasm ? 'wasm' : 'webgpu', status, result }, null, 2))
if (logs.length) console.log('--- console (last 40) ---\n' + logs.slice(-40).join('\n'))
await browser.close()
process.exit(status === 'pass' ? 0 : 1)
