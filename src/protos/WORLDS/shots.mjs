// Dev-only: final screenshots. node src/protos/WORLDS/shots.mjs <outDir> [names, comma separated]
// names: home_1440 home_390 check_<id>_1440 check_<id>_390 check_<id>_scroll_1440 check_<id>_scroll_390 still_1440 home_late_1440
import { chromium } from 'playwright-core'
const [out, only = ''] = process.argv.slice(2)
const all = 'home_1440,home_390,check_tracktrace_1440,check_tracktrace_scroll_1440,check_spikecount_1440'
const names = (only || all).split(',')
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--hide-scrollbars', '--enable-unsafe-webgpu', '--use-angle=d3d11'],
})
const logs = []
for (const name of names) {
  const phone = name.endsWith('_390')
  const ctx = await browser.newContext({
    viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: phone ? 2 : 1,
    hasTouch: phone,
    isMobile: phone,
  })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && logs.push(`[${name}] ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[${name}] pageerror ${e.message}`))
  const parts = name.split('_')
  const view = parts[0] === 'check' ? parts[1] : 'home'
  const still = parts[0] === 'still' ? '?still=1' : ''
  await page.goto(`http://localhost:5323/#/proto/WORLDS/${view}${still}`, {
    waitUntil: 'load',
  })
  await page.waitForSelector('.wd-root[data-ready="1"]', { timeout: 40000 }).catch(() => logs.push(`[${name}] never ready`))
  await page.waitForTimeout(parts.includes('late') ? 20000 : 1200)
  if (parts.includes('run')) {
    await page.locator('.wd-run').click()
    await page.waitForFunction(() => document.querySelector('.wd-run')?.textContent?.includes('again'), null, { timeout: 45000 }).catch(() => logs.push(`[${name}] run did not finish`))
    await page.waitForTimeout(1500)
  }
  if (parts.includes('scroll')) {
    await page.evaluate(
      (y) => {
        const p = document.querySelector('.wd-page')
        const s = document.querySelector('.wd-story')
        if (p && s) p.scrollTo({ top: s.offsetTop + y })
      },
      Number(parts[parts.indexOf('scroll') + 1]) || 0,
    )
    await page.waitForTimeout(1600)
  }
  const full = parts.includes('full')
  if (full) {
    const h = await page.evaluate(() => document.querySelector('.wd-page')?.scrollHeight ?? 900)
    await page.setViewportSize({
      width: phone ? 390 : 1440,
      height: Math.min(h, 9000),
    })
    await page.waitForTimeout(1500)
  }
  await page.screenshot({ path: `${out}/${name}.png` })
  await ctx.close()
}
if (logs.length) console.log('--- errors ---\n' + [...new Set(logs)].slice(0, 30).join('\n'))
await browser.close()
