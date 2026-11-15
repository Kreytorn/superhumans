// The problem as a four-frame zoom, like a film title sequence: deep space -> the ground stand-in -> one nucleus -> its spots.
// Frame 1 is a drawn picture (marked). Frames 2-4 are real: the sample's nuclei and the hero nucleus with IonScan's stored
// circles and line, turned so the fitted line lies level with the beam drawn in frames 1-2.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import * as tt from '../../engine/tracktrace'
import type { NucleusResult } from '../../engine/tracktrace'
import { N, paintNucleus } from './paint'

function Sky() {
  const cv = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = cv.current
    if (!el) return
    const W = 360
    const H = 560
    el.width = W * 2
    el.height = H * 2
    const ctx = el.getContext('2d')
    if (!ctx) return
    ctx.scale(2, 2)
    let s = 7
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const neb = ctx.createRadialGradient(W * 0.7, H * 0.3, 10, W * 0.7, H * 0.3, H * 0.6)
    neb.addColorStop(0, 'rgba(125, 90, 255, 0.35)')
    neb.addColorStop(0.5, 'rgba(255, 79, 176, 0.08)')
    neb.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = neb
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 520; i++) {
      const r = rnd() < 0.96 ? rnd() * 0.8 + 0.2 : rnd() * 1.4 + 0.8
      ctx.globalAlpha = 0.25 + rnd() * 0.75
      ctx.fillStyle = rnd() < 0.15 ? '#ffd9b0' : rnd() < 0.3 ? '#c9c6ff' : '#ffffff'
      ctx.beginPath()
      ctx.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [])
  return <canvas ref={cv} className="w2-sky" aria-hidden="true" />
}

function Crowd({ onCount }: { onCount: (n: number) => void }) {
  const cv = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let dead = false
    const el = cv.current
    if (!el) return
    tt.wellImages('P242_G4')
      .then((buf) => {
        if (dead) return
        const n = Math.floor(buf.length / (N * N))
        onCount(n)
        const cols = 6
        const rows = 10
        const T = 60
        el.width = cols * T
        el.height = rows * T
        const ctx = el.getContext('2d')
        if (!ctx) return
        const tmp = document.createElement('canvas')
        for (let i = 0; i < Math.min(n, cols * rows); i++) {
          paintNucleus(tmp, buf, (i + 60) * N * N)
          const j = (i * 7) % 5
          ctx.drawImage(tmp, (i % cols) * T + 3 + j, Math.floor(i / cols) * T + 3 + (j % 3), T - 8, T - 8)
        }
      })
      .catch(() => undefined)
    return () => { dead = true }
  }, [onCount])
  return <canvas ref={cv} className="w2-crowd" aria-hidden="true" />
}

/** The hero nucleus, turned so its fitted line is level, centred on the line's middle. `zoom` is its size in panel heights. */
function Level({ r, zoom, cls }: { r: NucleusResult; zoom: number; cls: string }) {
  const cv = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (cv.current) paintNucleus(cv.current, r.x)
  }, [r])
  const L = r.line.drawn && r.line.p0 && r.line.p1 ? r.line : null
  let ang = 0
  let cx = 64
  let cy = 64
  if (L && L.p0 && L.p1) {
    ang = (Math.atan2(L.p1[0] - L.p0[0], L.p1[1] - L.p0[1]) * 180) / Math.PI
    if (ang > 90) ang -= 180
    if (ang < -90) ang += 180
    cx = (L.p0[1] + L.p1[1]) / 2
    cy = (L.p0[0] + L.p1[0]) / 2
  }
  const fx = cx / N
  const fy = cy / N
  const style = {
    '--z': zoom,
    left: `calc(50% - var(--ph) * ${zoom} * ${fx.toFixed(4)})`,
    top: `calc(var(--beam) - var(--ph) * ${zoom} * ${fy.toFixed(4)})`,
    transformOrigin: `calc(var(--ph) * ${zoom} * ${fx.toFixed(4)}) calc(var(--ph) * ${zoom} * ${fy.toFixed(4)})`,
    transform: `rotate(${(-ang).toFixed(2)}deg)`,
  } as CSSProperties
  return (
    <span className={`w2-level ${cls}`} style={style}>
      <canvas ref={cv} width={N} height={N} />
      <svg viewBox={`0 0 ${N} ${N}`}>
        {L && L.p0 && L.p1 && <line x1={L.p0[1]} y1={L.p0[0]} x2={L.p1[1]} y2={L.p1[0]} className="w2-level-line" />}
        {r.circles.map((c) => (
          <circle key={c.id} cx={c.x} cy={c.y} r={c.radiusPx} className="w2-level-ring" />
        ))}
      </svg>
    </span>
  )
}

export default function Story({ hero, wallN: wallN0 }: { hero: NucleusResult | null; wallN: number }) {
  const [crowdN, setCrowdN] = useState(0)
  const wallN = wallN0 || crowdN
  const lineWords = hero ? (hero.line.drawn ? `${hero.line.nInliers} of them in a straight line` : 'no straight line') : ''
  return (
    <div className="w2-story">
      <div className="w2-story-beam" aria-hidden="true"><i /></div>
      <figure className="w2-frame" data-f="1">
        <Sky />
        <span className="w2-frame-k"><b>1</b>Deep space</span>
        <figcaption>Cosmic rays carry heavy ions. Each one cuts a straight path.</figcaption>
        <span className="w2-ai w2-ai-dark">AI-generated illustration</span>
      </figure>
      <figure className="w2-frame" data-f="2">
        <Crowd onCount={setCrowdN} />
        <span className="w2-frame-k"><b>2</b>On the ground</span>
        <figcaption>An accelerator beam of iron ions stands in for them. Real mouse skin cells{wallN ? `: ${wallN} in one sample` : ''}.</figcaption>
      </figure>
      <figure className="w2-frame" data-f="3">
        {hero && <Level r={hero} zoom={0.9} cls="w2-level-mid" />}
        <span className="w2-frame-k"><b>3</b>One nucleus</span>
        <figcaption>Each bright spot is a DNA break: the repair protein 53BP1 piles up on it.</figcaption>
      </figure>
      <figure className="w2-frame" data-f="4">
        {hero && <Level r={hero} zoom={2.5} cls="w2-level-close" />}
        <span className="w2-frame-k"><b>4</b>IonScan</span>
        <figcaption>
          {hero ? <><b className="w2-frame-n">{hero.count} spots circled</b>{lineWords} · {tt.HONESTY.lineLabel} · {tt.HONESTY.precomputed}</> : ' '}
        </figcaption>
      </figure>
    </div>
  )
}
