// Shared helpers for qa/capture.mjs and qa/gate.mjs: argument parsing, Edge launch, the two device
// profiles, the console/network guard, the in-page effect probe and the first-viewport metrics.
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

export const PHONE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
export const READY_MS = 20000

export function parseArgs(argv = process.argv.slice(2)) {
  const o = {}
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue
    const k = argv[i].slice(2)
    const v = argv[i + 1]
    if (v === undefined || v.startsWith('--')) o[k] = true
    else { o[k] = v; i++ }
  }
  return o
}

/** Base URL of the view under test: --url wins, otherwise http://localhost:<port>/#/<route>. */
export function baseUrl(o) {
  if (typeof o.url === 'string') return o.url
  if (!o.port || typeof o.route !== 'string') return null
  return `http://localhost:${o.port}/#/${o.route.replace(/^#?\/?/, '')}`
}

/** Adds query parameters where the view reads them: inside the hash for hash routes, else in the search part. */
export function withParams(url, params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (!entries.length) return url
  const u = new URL(url)
  if (u.hash.length > 1) {
    const [path, q = ''] = u.hash.slice(1).split('?')
    const sp = new URLSearchParams(q)
    for (const [k, v] of entries) sp.set(k, String(v))
    u.hash = `${path}?${sp}`
  } else for (const [k, v] of entries) u.searchParams.set(k, String(v))
  return u.toString()
}

export function parseSize(s) {
  const [w, h] = s.toLowerCase().split('x').map(Number)
  return { width: w, height: h, phone: w <= 500 }
}

export async function launch(headed = false) {
  return chromium.launch({
    channel: 'msedge',
    headless: !headed,
    // Same flags as scripts/parity.mjs so WebGPU stays available in headless Edge.
    args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=d3d11', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
  })
}

/** A browser context for one size. Widths of 500 px or less get phone emulation (touch, mobile UA, scale 2). */
export async function newContext(browser, size, extra = {}) {
  const phone = size.phone
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: phone ? 2 : 1,
    isMobile: phone,
    hasTouch: phone,
    ...(phone ? { userAgent: PHONE_UA } : {}),
    serviceWorkers: 'block',
    ...extra,
  })
  await ctx.addInitScript(PROBE)
  return ctx
}

/**
 * Console and network guard. Requests to another origin are aborted and recorded, so a flaky hotspot can
 * never change a result. Returns the live log object; read it after the page work is done.
 */
export async function attachGuard(ctx, origin) {
  const log = { console_errors: [], console_warnings: [], page_errors: [], failed_requests: [], bad_responses: [], external_requests: [], requests: 0, popups: 0, dialogs: 0, downloads: 0 }
  const isExternal = (url) => {
    if (/^(data|blob|about|chrome|devtools|chrome-extension|edge):/i.test(url)) return false
    try { return new URL(url).origin !== origin } catch { return false }
  }
  await ctx.route('**/*', (route) => {
    const url = route.request().url()
    if (url.startsWith('http://qa.local/')) return route.fallback()
    if (isExternal(url)) {
      log.external_requests.push(url)
      return route.abort('blockedbyclient')
    }
    return route.fallback()
  })
  ctx.on('page', (page) => watchPage(page))
  function watchPage(page) {
    page.on('console', (m) => {
      const loc = m.location()
      const line = `${m.text().slice(0, 400)}${loc?.url ? ` (${basename(loc.url.split('?')[0])}:${loc.lineNumber})` : ''}`
      if (m.type() === 'error') {
        // The browser's own line for a request this guard blocked is already listed under external_requests.
        if (/ERR_BLOCKED_BY_CLIENT/.test(line)) return
        log.console_errors.push(line)
      } else if (m.type() === 'warning') log.console_warnings.push(line)
    })
    page.on('pageerror', (e) => log.page_errors.push(String(e.message ?? e).slice(0, 400)))
    page.on('request', () => { log.requests++ })
    page.on('requestfailed', (r) => {
      const err = r.failure()?.errorText ?? ''
      // ERR_ABORTED is the browser cancelling its own request (navigation away, media range seeks).
      if (/ERR_ABORTED|ERR_BLOCKED_BY_CLIENT/.test(err) || isExternal(r.url())) return
      log.failed_requests.push(`${err} ${r.url()}`)
    })
    page.on('response', (r) => {
      if (r.status() >= 400 && !isExternal(r.url())) log.bad_responses.push(`${r.status()} ${r.url()}`)
    })
    page.on('websocket', (ws) => { if (isExternal(ws.url().replace(/^ws/, 'http'))) log.external_requests.push(ws.url()) })
    page.on('popup', () => { log.popups++ })
    page.on('dialog', (d) => { log.dialogs++; d.dismiss().catch(() => {}) })
    page.on('download', () => { log.downloads++ })
  }
  return log
}

/** Opens a URL from a blank page (so a hash-only change still reloads) and waits for [data-ready="1"]. */
export async function openView(page, url, readyMs = READY_MS) {
  const t0 = Date.now()
  await page.goto('about:blank')
  let error = null
  try { await page.goto(url, { waitUntil: 'load', timeout: 30000 }) } catch (e) { error = String(e.message).split('\n')[0] }
  let ready = false
  if (!error) {
    try { await page.waitForSelector('[data-ready="1"]', { state: 'attached', timeout: readyMs }); ready = true } catch { /* reported by the caller */ }
  }
  if (ready) await page.evaluate(() => document.fonts?.ready).catch(() => {})
  const state = await page.evaluate(() => document.querySelector('[data-ready="1"]')?.getAttribute('data-state') ?? document.querySelector('[data-state]')?.getAttribute('data-state') ?? null).catch(() => null)
  return { ready, ready_ms: Date.now() - t0, state, error }
}

export function pngSize(file) {
  const b = readFileSync(file)
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
}

// ---------------------------------------------------------------------------------------------------------
// In-page code. PROBE is installed before any page script; the others are passed to page.evaluate.
// ---------------------------------------------------------------------------------------------------------

/** Effect probe: counts what a control changed (DOM, URL, media, audio, scroll, focus, clipboard). */
export const PROBE = `(() => {
  if (window.__qa) return
  const qa = (window.__qa = { ev: 0, evKinds: [], noise: new WeakMap(), mode: 'off', outside: 0, inside: 0, el: null, snap: null })
  qa.noiseKinds = new Set()
  // Events that already fire while nothing is being used (a looping clip, an auto-scroller) are not effects.
  const bump = (kind) => {
    if (qa.mode === 'noise') { qa.noiseKinds.add(kind); return }
    if (qa.noiseKinds.has(kind)) return
    qa.ev++; if (qa.evKinds.length < 8) qa.evKinds.push(kind)
  }
  const key = (m) => m.type + ':' + (m.attributeName || '')
  const obs = new MutationObserver((list) => {
    for (const m of list) {
      if (qa.mode === 'noise') {
        let s = qa.noise.get(m.target); if (!s) qa.noise.set(m.target, (s = new Set())); s.add(key(m))
      } else if (qa.mode === 'armed') {
        if (qa.noise.get(m.target)?.has(key(m))) continue
        if (qa.el && (qa.el === m.target || qa.el.contains(m.target))) qa.inside++
        else qa.outside++
      }
    }
  })
  const start = () => { if (document.documentElement) obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }) }
  if (document.documentElement) start(); else document.addEventListener('readystatechange', start, { once: true })
  for (const t of ['play', 'pause', 'seeked', 'ratechange', 'volumechange']) document.addEventListener(t, () => bump('media:' + t), true)
  document.addEventListener('scroll', () => bump('scroll'), true)
  // Where the last press really landed, so the gate can tell a harness miss from a dead control.
  document.addEventListener('pointerdown', (e) => { qa.hit = e.target }, true)
  window.addEventListener('hashchange', () => bump('url'))
  window.addEventListener('popstate', () => bump('url'))
  const wrap = (proto, name, kind) => { try { const f = proto && proto[name]; if (typeof f !== 'function') return; proto[name] = function (...a) { bump(kind); return f.apply(this, a) } } catch {} }
  wrap(window.HTMLMediaElement && HTMLMediaElement.prototype, 'play', 'media:play')
  wrap(window.HTMLMediaElement && HTMLMediaElement.prototype, 'pause', 'media:pause')
  wrap(window.AudioContext && AudioContext.prototype, 'resume', 'audio:resume')
  wrap(window.AudioScheduledSourceNode && AudioScheduledSourceNode.prototype, 'start', 'audio:start')
  wrap(window.AudioScheduledSourceNode && AudioScheduledSourceNode.prototype, 'stop', 'audio:stop')
  wrap(window.Clipboard && Clipboard.prototype, 'writeText', 'clipboard')
  wrap(window.Element && Element.prototype, 'requestFullscreen', 'fullscreen')
  wrap(window.Navigator && Navigator.prototype, 'share', 'share')
  const val = (el) => el ? [el.value, el.checked, el.getAttribute && el.getAttribute('aria-valuenow'), el.selectedIndex].join('|') : ''
  qa.find = (sel) => { try { return document.querySelector(sel) } catch { return null } }
  qa.startNoise = () => { obs.takeRecords(); qa.noise = new WeakMap(); qa.noiseKinds = new Set(); qa.mode = 'noise' }
  qa.arm = (sel) => {
    obs.takeRecords()
    qa.el = qa.find(sel); qa.outside = 0; qa.inside = 0; qa.ev = 0; qa.evKinds = []; qa.hit = null
    qa.snap = { html: qa.el ? qa.el.outerHTML : '', val: val(qa.el), href: location.href, active: document.activeElement }
    qa.mode = 'armed'
  }
  qa.check = (final) => {
    const s = qa.snap
    if (!s) return null
    if (location.href !== s.href) return 'url'
    if (qa.outside > 0) return 'dom'
    if (qa.ev > 0) return qa.evKinds[0] || 'event'
    if (qa.el && val(qa.el) !== s.val) return 'value'
    const a = document.activeElement
    if (a && a !== s.active && a !== document.body && !(qa.el && qa.el.contains(a))) return 'focus'
    // Changes only inside the control itself count when they are still there at the end of the window
    // (a pressed flash or a ripple that leaves no trace is not an effect).
    if (final && qa.el && qa.el.isConnected && qa.el.outerHTML !== s.html) return 'dom-self'
    if (final && qa.el && !qa.el.isConnected) return 'dom'
    return null
  }
})()`

/** Lists the visible, enabled controls on the page. Runs in the page. */
export function collectControls() {
  const ROLES = new Set(['button', 'link', 'checkbox', 'switch', 'slider', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'combobox', 'textbox', 'searchbox', 'spinbutton', 'treeitem'])
  const sel = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role], [tabindex], [data-qa="primary"], [data-hold], [contenteditable=""], [contenteditable="true"], [onclick]'
  const cssPath = (el) => {
    const parts = []
    let n = el
    while (n && n.nodeType === 1 && n !== document.documentElement) {
      if (n.id && document.querySelectorAll('#' + CSS.escape(n.id)).length === 1) { parts.unshift('#' + CSS.escape(n.id)); break }
      if (n === document.body) { parts.unshift('body'); break }
      const tag = n.localName
      const same = n.parentElement ? [...n.parentElement.children].filter((c) => c.localName === tag) : [n]
      parts.unshift(same.length > 1 ? `${CSS.escape(tag)}:nth-of-type(${same.indexOf(n) + 1})` : CSS.escape(tag))
      n = n.parentElement
    }
    return parts.join(' > ')
  }
  const out = []
  for (const el of document.querySelectorAll(sel)) {
    const tag = el.localName
    const role = el.getAttribute('role')
    const native = ['button', 'a', 'input', 'select', 'textarea', 'summary'].includes(tag)
    const marked = el.matches('[data-qa="primary"], [data-hold], [onclick], [contenteditable=""], [contenteditable="true"]')
    if (!native && !marked) {
      if (role) { if (!ROLES.has(role)) continue }
      else {
        const ti = Number(el.getAttribute('tabindex'))
        if (!(ti >= 0)) continue
        const cs = getComputedStyle(el)
        const scrolls = /(auto|scroll)/.test(cs.overflowX + cs.overflowY) && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
        if (scrolls) continue // a focusable scroll area is not a control
      }
    }
    if (el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('[inert], [aria-hidden="true"], fieldset[disabled]')) continue
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) continue
    let box = el.getBoundingClientRect()
    // A visually hidden native input is used through its label.
    let via = null
    if ((box.width < 8 || box.height < 8) && el.labels && el.labels[0]) { via = cssPath(el.labels[0]); box = el.labels[0].getBoundingClientRect() }
    if (box.width < 1 || box.height < 1) continue
    const type = (el.getAttribute('type') || '').toLowerCase()
    let kind = 'click'
    if (el.hasAttribute('data-hold')) kind = 'hold'
    else if (role === 'slider' || (tag === 'input' && type === 'range')) kind = 'slider'
    else if (tag === 'select') kind = 'select'
    else if (tag === 'textarea' || role === 'textbox' || role === 'searchbox' || el.isContentEditable || (tag === 'input' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'color', 'image'].includes(type))) kind = 'type'
    else if (tag === 'a' && el.hasAttribute('href')) kind = 'link'
    const selected = (tag === 'input' && type === 'radio' && el.checked) || ((role === 'tab' || role === 'radio' || role === 'option') && (el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-checked') === 'true'))
    const text = (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('title') || el.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 80)
    out.push({
      selector: cssPath(el), via, text, tag, role, kind, type,
      primary: el.matches('[data-qa="primary"]'),
      selected: !!selected,
      href: tag === 'a' ? el.href : null,
      target: tag === 'a' ? el.getAttribute('target') : null,
      size: [Math.round(box.width), Math.round(box.height)],
    })
  }
  return out
}

/** First-viewport metrics. Runs in the page; `vw` is the configured viewport width. */
export function measure(vw) {
  const W = window.innerWidth
  const H = window.innerHeight
  const inView = (r) => r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < W && r.top < H
  const INLINE = new Set(['inline', 'inline-block', 'inline-flex', 'inline-grid', 'contents', 'ruby', 'ruby-text'])
  const blocks = new Map() // block element -> { text, tick }
  const fonts = {}
  const colours = {}
  const hiddenByClip = (el) => {
    for (let n = el; n && n !== document.body && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.overflow !== 'visible' || cs.clip !== 'auto' || cs.clipPath !== 'none') {
        const r = n.getBoundingClientRect()
        if (r.width <= 2 || r.height <= 2) return true
      }
    }
    return false
  }
  const blockOf = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (n instanceof SVGElement) { if (n.localName === 'text' || n.localName === 'foreignObject') return n; continue }
      if (!INLINE.has(getComputedStyle(n).display)) return n
    }
    return document.body
  }
  const addText = (text, el, rectsOf) => {
    if (!/[\p{L}\p{N}]/u.test(text)) return
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) return
    if (![...rectsOf()].some(inView)) return
    if (hiddenByClip(el)) return
    const cs = getComputedStyle(el)
    const b = blockOf(el)
    const rec = blocks.get(b) ?? { text: '', tick: false }
    rec.text += text
    rec.tick = rec.tick || !!el.closest('[data-qa="tick"]')
    blocks.set(b, rec)
    const n = text.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
    const fam = cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '')
    fonts[fam] = (fonts[fam] ?? 0) + n
    const col = el instanceof SVGElement && cs.fill && cs.fill !== 'none' ? cs.fill : cs.color
    colours[col] = (colours[col] ?? 0) + n
  }
  const walk = (root) => {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (n.nodeType === 1) {
        if (n.shadowRoot) {
          // Rolling-digit components keep every digit 0-9 in their shadow tree; read their label instead.
          if (n.localName.startsWith('number-flow')) {
            const label = n.getAttribute('aria-label') || n.shadowRoot.querySelector('[aria-label]')?.getAttribute('aria-label') || n.textContent || ''
            addText(label, n, () => n.getClientRects())
          } else walk(n.shadowRoot)
        }
        continue
      }
      const p = n.parentElement
      if (!p || ['script', 'style', 'noscript', 'title', 'desc', 'template', 'option'].includes(p.localName)) continue
      if (p.closest('number-flow, number-flow-react, number-flow-vue, number-flow-svelte')) continue
      const range = document.createRange()
      range.selectNodeContents(n)
      addText(n.nodeValue, p, () => range.getClientRects())
    }
  }
  walk(document.body)
  let words = 0, numbers = 0, textBlocks = 0, ticks = 0
  const numberList = []
  for (const rec of blocks.values()) {
    const text = rec.text.replace(/\s+/g, ' ').trim()
    if (rec.tick) { ticks++; continue }
    textBlocks++
    words += text.split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w)).length
    // A digit group is a number unless it is glued to a letter in front of it ("V4", "G4").
    const found = text.match(/(?<![\p{L}\d.,])\d+(?:[.,]\d+)*/gu) ?? []
    numbers += found.length
    numberList.push(...found)
  }
  let heroArea = 0
  const heroes = [...document.querySelectorAll('[data-qa="hero"]')].filter((h) => h.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
  for (const h of heroes) {
    const r = h.getBoundingClientRect()
    heroArea += Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0))
  }
  const de = document.documentElement
  const contentW = Math.max(de.scrollWidth, document.body ? document.body.scrollWidth : 0, W)
  const hidden = (el) => el && /hidden|clip/.test(getComputedStyle(el).overflowX)
  const overflowing = contentW > vw + 1
  const offenders = []
  if (overflowing) {
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      // Either the box itself sticks out, or its content does (long unbroken text in a narrow box).
      const spill = el.scrollWidth > el.clientWidth + 1 && r.left + el.scrollWidth > vw + 1 && getComputedStyle(el).overflowX === 'visible'
      if (r.width > 0 && (r.right > vw + 1 || spill) && el.checkVisibility()) {
        offenders.push(`${el.localName}${el.id ? '#' + el.id : ''}${el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''} (right edge ${Math.round(Math.max(r.right, spill ? r.left + el.scrollWidth : 0))} px)`)
        if (offenders.length >= 5) break
      }
    }
  }
  const root = document.querySelector('[data-ready="1"]') || document.querySelector('[data-state]')
  return {
    words, text_blocks: textBlocks, numbers, number_list: numberList.slice(0, 20), ticks,
    hero_share: Math.min(1, heroArea / (W * H)), hero_count: heroes.length,
    primary_count: document.querySelectorAll('[data-qa="primary"]').length,
    font_families: Object.entries(fonts).sort((a, b) => b[1] - a[1]).map(([family, w]) => ({ family, words: w })),
    text_colours: Object.entries(colours).sort((a, b) => b[1] - a[1]).map(([colour, w]) => ({ colour, words: w })),
    sideways_scroll: overflowing && !(hidden(de) || hidden(document.body)),
    content_width: contentW, viewport_width: vw, clipped_overflow: overflowing && (hidden(de) || hidden(document.body)), overflow_offenders: offenders,
    data_state: root ? root.getAttribute('data-state') : null,
  }
}
