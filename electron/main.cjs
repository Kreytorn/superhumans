// SuperHumans desktop app: serves the built web app (dist/) from app://superhumans/ with
// cross-origin isolation, so onnxruntime-web gets WebGPU and wasm threads offline.
// PLAYBOOK §4 gotcha 10. Kiosk fullscreen with --kiosk (pitch), windowed otherwise.
const { app, BrowserWindow, protocol, net, shell } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const DIST = path.join(__dirname, '..', 'dist')
const HOST = 'superhumans'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true },
  },
])

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.u8': 'application/octet-stream',
  '.gz': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
}

const HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

function registerAppProtocol() {
  protocol.handle('app', async (req) => {
    const { host, pathname } = new URL(req.url)
    if (host !== HOST) return new Response('not found', { status: 404 })
    const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname)
    const file = path.normalize(path.join(DIST, rel))
    const inside = path.relative(DIST, file)
    if (!inside || inside.startsWith('..') || path.isAbsolute(inside)) return new Response('bad path', { status: 400 })
    const res = await net.fetch(pathToFileURL(file).toString())
    if (!res.ok) return new Response('not found', { status: 404 })
    const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
    return new Response(res.body, { status: 200, headers: { 'Content-Type': type, ...HEADERS } })
  })
}

function createWindow() {
  const kiosk = process.argv.includes('--kiosk')
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    backgroundColor: '#05070F',
    show: false,
    kiosk,
    fullscreen: kiosk,
    autoHideMenuBar: true,
    title: 'SuperHumans',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false },
  })
  win.once('ready-to-show', () => win.show())
  // Test hook: --capture=<png> [--capture-delay=ms] screenshots the window, prints the page text, quits.
  const cap = process.argv.find((a) => a.startsWith('--capture='))?.slice(10)
  if (cap) {
    const delay = Number(process.argv.find((a) => a.startsWith('--capture-delay='))?.slice(16) ?? 6000)
    win.webContents.once('did-finish-load', () =>
      setTimeout(async () => {
        const img = await win.webContents.capturePage()
        require('node:fs').writeFileSync(cap, img.toPNG())
        const text = await win.webContents.executeJavaScript('document.body.innerText')
        console.log(text)
        app.quit()
      }, delay),
    )
  }
  // External links (credits) open in the system browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  const hash = process.argv.find((a) => a.startsWith('--route='))?.slice(8) ?? ''
  win.loadURL(`app://${HOST}/index.html${hash ? `#/${hash}` : ''}`)
}

app.whenReady().then(() => {
  registerAppProtocol()
  createWindow()
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})

app.on('window-all-closed', () => app.quit())
