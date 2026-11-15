// The plate: one astronaut, drawn by code in fine glowing line, with six windows cut through the suit.
// The same drawing serves the home scene, the module page's backdrop and the small locator.
import { Fragment, memo, type CSSProperties, type KeyboardEvent, type MouseEvent, type Ref } from 'react'
import { HELMET_PARTS, HOSE_PATH, LAYERS } from './geom'
import { BAND, CHECKS, TALL, WIDE, coverImage, plateTransform, screenBox, windowBox, type Check, type Plate } from './data'

type Mode = 'home' | 'bg' | 'mini'

export interface SuitProps {
  mode: Mode
  upright?: boolean
  viewBox: string
  svgRef?: Ref<SVGSVGElement>
  /** the window in focus */
  active?: string | null
  /** the window whose page is open (locator) */
  current?: string
  onPress?: (c: Check, e: MouseEvent | KeyboardEvent) => void
  onPoint?: (id: string, on: boolean) => void
  title?: string
}

const d = (ms: number, dur?: number) => ({ ['--d' as string]: `${ms}ms`, ...(dur ? { ['--dur' as string]: `${dur}ms` } : {}) }) as CSSProperties

/** Windows light up in this order once the suit is drawn. */
export const ORDER: Record<string, number> = { braindrift: 0, garnmeter: 1, bubblegrade: 2, spikecount: 3, tracktrace: 4, veinsqueeze: 5 }

// ------------------------------------------------------------------ the ion's path
/** Two points on the ion track inside the TrackTrace picture (pixels of the 1600 x 1000 poster). */
const TRACK_A = [290, 372]
const TRACK_B = [264, 630]
/** The cosmic ray through the suit: the straight line the model found in the real nucleus, carried on across the plate. */
export function rayLine(upright: boolean): [number, number, number, number] {
  const c = CHECKS[0]
  const [sx, sy, sw, sh] = screenBox(c, upright)
  const im = coverImage(c, sx, sy, sw, sh)
  const ax = im.x + (TRACK_A[0] / 1600) * im.width
  const ay = im.y + (TRACK_A[1] / 1000) * im.height
  const bx = im.x + (TRACK_B[0] / 1600) * im.width
  const by = im.y + (TRACK_B[1] / 1000) * im.height
  const p = upright ? TALL : WIDE
  const y0 = -300
  const y1 = p.h + 300
  const k0 = (y0 - ay) / (by - ay)
  const k1 = (y1 - ay) / (by - ay)
  return [ax + (bx - ax) * k0, y0, ax + (bx - ax) * k1, y1]
}

// ------------------------------------------------------------------ one window
function ScreenPattern({ c, id, upright }: { c: Check; id: string; upright?: boolean }) {
  const [sx, sy, sw, sh] = screenBox(c, !!upright)
  const im = coverImage(c, sx, sy, sw, sh)
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" x={sx} y={sy} width={sw} height={sh}>
      <rect width={sw} height={sh} fill="#05060c" />
      <image href={c.img} x={im.x - sx} y={im.y - sy} width={im.width} height={im.height} preserveAspectRatio="none" />
    </pattern>
  )
}

/** The picture alone, placed over the module page's stage frame: the move into a window ends exactly here. */
export function ScreenPoster({ c, upright, viewBox }: { c: Check; upright?: boolean; viewBox: string }) {
  const [sx, sy, sw, sh] = screenBox(c, !!upright)
  const id = `v12-poster-${c.id}`
  return (
    <svg className="v12-m-poster" viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <ScreenPattern c={c} id={id} upright={upright} />
      </defs>
      <rect x={sx} y={sy} width={sw} height={sh} fill={`url(#${id})`} />
    </svg>
  )
}

/** Two dashed lines from the lifted panel's near side to the matching side of the place it came from. */
function liftLeads(b: [number, number, number, number], s: [number, number, number, number]): string {
  const [x, y, w, h] = b
  const dx = s[0] + s[2] / 2 - (x + w / 2)
  const dy = s[1] + s[3] / 2 - (y + h / 2)
  const k = 14
  if (Math.abs(dy) >= Math.abs(dx)) {
    const yy = dy > 0 ? y + h + k : y - k
    const sy = dy > 0 ? s[1] : s[1] + s[3]
    return `M${x - 4},${yy}L${s[0]},${sy}M${x + w + 4},${yy}L${s[0] + s[2]},${sy}`
  }
  const xx = dx > 0 ? x + w + k : x - k
  const sx = dx > 0 ? s[0] : s[0] + s[2]
  return `M${xx},${y - 4}L${sx},${s[1]}M${xx},${y + h + 4}L${sx},${s[1] + s[3]}`
}

function Window({ c, mode, upright, active, current, onPress, onPoint }: { c: Check; mode: Mode } & Pick<SuitProps, 'upright' | 'active' | 'current' | 'onPress' | 'onPoint'>) {
  const [x, y, w, h] = windowBox(c, !!upright)
  const [sx, sy, sw, sh] = screenBox(c, !!upright)
  const cx = x + w / 2
  const cy = y + h / 2
  const on = active === c.id
  const here = current === c.id
  const pid = `v12-${mode}-pat-${c.id}`
  const rr = (k: number, cls: string, extra?: Record<string, string | number>) => <rect className={cls} x={x - k} y={y - k} width={w + 2 * k} height={h + 2 * k} rx={6 + k * 0.6} {...extra} />

  let inner
  if (mode === 'mini') {
    inner = (
      <>
        {rr(10, 'v12-cut-edge')}
        {rr(0, 'v12-wall-mini')}
        {rr(18, 'v12-hit')}
      </>
    )
  } else {
    const visor = c.kind === 'visor'
    const src = c.kind === 'lifted' && c.from ? (upright ? c.from.tall : c.from.wide) : null
    inner = (
      <>
        <ellipse className="v12-glow-a" cx={cx} cy={cy} rx={w * 0.95} ry={h * 1.05} fill={`url(#v12-${mode}-amber)`} />
        <ellipse className="v12-glow-h" cx={cx} cy={cy} rx={w * 1.1} ry={h * 1.2} fill={`url(#v12-${mode}-g-${c.id})`} />
        {src && (
          // an exploded-view detail: the panel is drawn lifted off the helmet, its place there dashed
          <g className="v12-lift">
            <rect className="v12-lift-src" x={src[0]} y={src[1]} width={src[2]} height={src[3]} rx="6" />
            <path className="v12-lift-lead" d={liftLeads([x, y, w, h], src)} />
          </g>
        )}
        {/* the cut through the suit's layers, seen in section; through the visor only a thin rim */}
        {!visor && rr(13, 'v12-cut', { fill: `url(#v12-${mode}-sect)` })}
        {!visor && rr(13, 'v12-cut-edge')}
        {!visor && rr(3, 'v12-cut-in')}
        {visor && rr(4, 'v12-cut-edge v12-visor-edge')}
        {rr(0, 'v12-wall', { fill: `url(#v12-${mode}-wall)` })}
        {rr(0, 'v12-wall-h')}
        {mode === 'home' && rr(0, 'v12-dark')}
        <defs>
          <ScreenPattern c={c} id={pid} upright={upright} />
        </defs>
        <rect className="v12-screen" x={sx} y={sy} width={sw} height={sh} rx="3" fill={`url(#${pid})`} />
        <rect className="v12-sheen" x={sx} y={sy} width={sw} height={sh} rx="3" fill={`url(#v12-${mode}-sheen)`} />
        {mode === 'home' && <rect className="v12-flash" x={sx} y={sy} width={sw} height={sh} rx="3" />}
        {mode === 'home' && <rect className="v12-scan" x={sx} y={sy} width={sw} height="22" fill="url(#v12-home-scan)" style={{ ['--sh' as string]: `${sh - 22}px` }} />}
        <rect className="v12-bezel" x={sx} y={sy} width={sw} height={sh} rx="3" />
        {visor && <path className="v12-gloss" d={`M${x - 13},${y + h * 0.62}C${x - 16},${y + h * 0.3} ${x + w * 0.12},${y - 12} ${x + w * 0.5},${y - 15}`} />}
        <g className="v12-band">
          <rect className="v12-band-plate" x={x + 5} y={y + h - 5 - BAND + 4} width={w - 10} height={BAND - 4} rx="3" />
          <text className="v12-band-text" x={cx} y={y + h - 5 - BAND / 2 + 8.5} textAnchor="middle">
            {!upright && <tspan className="v12-band-n">{c.n}</tspan>}
            <tspan dx={upright ? 0 : 8}>{c.name.toUpperCase()}</tspan>
          </text>
        </g>
        {rr(0, 'v12-shade')}
        {rr(visor ? 13 : 21, 'v12-focus')}
      </>
    )
  }
  if (mode === 'bg') return <g className="v12-win" style={{ ['--hue' as string]: c.hue }}>{inner}</g>
  const label = mode === 'mini' ? `${c.name}: ${c.site.toLowerCase()}` : `${c.name}, ${c.site.toLowerCase()}. ${c.sentence}`
  return (
    <a
      className={`v12-win${on ? ' is-on' : ''}${here ? ' is-here' : ''}`}
      href={`#/proto/V12/${c.id}`}
      aria-label={label}
      aria-current={here ? 'page' : undefined}
      data-win={c.id}
      data-qa={mode === 'home' && c.id === 'tracktrace' ? 'primary' : undefined}
      style={{ ['--hue' as string]: c.hue, ['--i' as string]: ORDER[c.id] ?? 0 }}
      onClick={onPress ? (e) => onPress(c, e) : undefined}
      onKeyDown={
        onPress
          ? (e) => {
              if (e.key === ' ') onPress(c, e)
            }
          : undefined
      }
      onPointerEnter={onPoint ? (e) => e.pointerType === 'mouse' && onPoint(c.id, true) : undefined}
      onPointerLeave={onPoint ? (e) => e.pointerType === 'mouse' && onPoint(c.id, false) : undefined}
      onFocus={onPoint ? () => onPoint(c.id, true) : undefined}
      onBlur={onPoint ? () => onPoint(c.id, false) : undefined}
    >
      {inner}
    </a>
  )
}

// ------------------------------------------------------------------ the figure
function Figure({ mode }: { mode: Mode }) {
  const mini = mode === 'mini'
  return (
    <>
      {LAYERS.map((L, i) => (
        <Fragment key={L.id}>
          <g className={`v12-part${L.far ? ' is-far' : ''}`} data-part={L.id}>
            <path className="v12-solid v12-fd" style={d(260 + i * 40, 500)} d={L.solid} />
            {!mini && !L.far && <path className="v12-weave v12-fd" style={d(900, 900)} d={L.solid} fill={`url(#v12-${mode}-weave)`} />}
            {!mini && !L.far && <path className="v12-halo2 v12-fd" style={d(600, 900)} d={L.line} />}
            {!mini && !L.far && <path className="v12-halo v12-fd" style={d(500, 900)} d={L.line} />}
            <g className={`v12-dr ${L.far ? 'v12-l2' : 'v12-l0'}`} style={d(i * 70, 1250)}>
              <path pathLength={1} d={L.line} />
            </g>
            {!mini && (
              <g className={`v12-dr ${L.far ? 'v12-l3' : 'v12-l2'}`} style={d(620 + i * 50, 900)}>
                <path pathLength={1} d={L.detail} />
              </g>
            )}
          </g>
          {L.id === 'dcm' && !mini && (
            <g className="v12-hose">
              <path className="v12-hose-body v12-fd" style={d(700, 600)} d={HOSE_PATH} />
              <g className="v12-dr v12-l1" style={d(760, 900)}>
                <path pathLength={1} d={HOSE_PATH} />
              </g>
              <path className="v12-hose-ribs v12-fd" style={d(1000, 600)} d={HOSE_PATH} />
            </g>
          )}
          {L.id === 'helmet' && (
            <g className="v12-head">
              <path className="v12-evva v12-fd" style={d(420, 600)} d={HELMET_PARTS.evva} />
              <path className="v12-visor v12-fd" style={d(520, 700)} d={HELMET_PARTS.visor} fill={mini ? undefined : `url(#v12-${mode}-visor)`} />
              {!mini && (
                <>
                  <g className="v12-dr v12-l1" style={d(380, 1000)}>
                    <path pathLength={1} d={HELMET_PARTS.evva} />
                    <path pathLength={1} d={HELMET_PARTS.visor} />
                  </g>
                  <path className="v12-solid v12-fd" style={d(600, 500)} d={HELMET_PARTS.lamp} />
                  <g className="v12-dr v12-l2" style={d(700, 800)}>
                    <path pathLength={1} d={HELMET_PARTS.lamp} />
                  </g>
                </>
              )}
            </g>
          )}
        </Fragment>
      ))}
    </>
  )
}

function Defs({ mode }: { mode: Mode }) {
  const p = `v12-${mode}`
  return (
    <defs>
      <radialGradient id={`${p}-amber`}>
        <stop offset="0" stopColor="#ffb44d" stopOpacity="0.5" />
        <stop offset="0.45" stopColor="#ff9a2e" stopOpacity="0.18" />
        <stop offset="1" stopColor="#ff8a1e" stopOpacity="0" />
      </radialGradient>
      {CHECKS.map((c) => (
        <radialGradient key={c.id} id={`${p}-g-${c.id}`}>
          <stop offset="0" stopColor={c.hue} stopOpacity="0.8" />
          <stop offset="0.5" stopColor={c.hue} stopOpacity="0.26" />
          <stop offset="1" stopColor={c.hue} stopOpacity="0" />
        </radialGradient>
      ))}
      <linearGradient id={`${p}-wall`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffd08a" />
        <stop offset="0.5" stopColor="#e08a2a" />
        <stop offset="1" stopColor="#7a3f0a" />
      </linearGradient>
      <linearGradient id={`${p}-sheen`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
        <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.26" />
      </linearGradient>
      <linearGradient id={`${p}-visor`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1c2a5c" />
        <stop offset="0.45" stopColor="#070a1c" />
        <stop offset="1" stopColor="#020309" />
      </linearGradient>
      {/* the suit's layers in section: fine parallel lines */}
      <pattern id={`${p}-sect`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="7" fill="#0a0f2a" />
        <line x1="0" y1="0" x2="0" y2="7" stroke="#9fd6ff" strokeWidth="1.3" strokeOpacity="0.55" />
      </pattern>
      {/* the outer fabric's weave on the near side of the suit */}
      <pattern id={`${p}-weave`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
        <line x1="0" y1="0" x2="0" y2="9" stroke="#8fc8ff" strokeWidth="0.8" strokeOpacity="0.16" />
      </pattern>
      {mode === 'home' && (
        <>
          <linearGradient id={`${p}-scan`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9fe6ff" stopOpacity="0" />
            <stop offset="0.78" stopColor="#9fe6ff" stopOpacity="0.16" />
            <stop offset="0.92" stopColor="#f2fdff" stopOpacity="0.75" />
            <stop offset="1" stopColor="#f2fdff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${p}-ray`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd6ef" stopOpacity="0" />
            <stop offset="0.65" stopColor="#ffe6f6" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
        </>
      )}
    </defs>
  )
}

function SuitImpl({ mode, upright, viewBox, svgRef, active, current, onPress, onPoint, title }: SuitProps) {
  const plate: Plate = upright ? TALL : WIDE
  const ray = rayLine(!!upright)
  const windows = CHECKS.map((c) => <Window key={c.id} c={c} mode={mode} upright={upright} active={active} current={current} onPress={onPress} onPoint={onPoint} />)
  return (
    <svg
      ref={svgRef}
      className={`v12-svg v12-svg-${mode}`}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      role={mode === 'bg' ? 'presentation' : 'group'}
      aria-label={mode === 'bg' ? undefined : title}
      aria-hidden={mode === 'bg' ? true : undefined}
      focusable="false"
    >
      <Defs mode={mode} />
      <g className="v12-float">
        {mode !== 'mini' && (
          <g className="v12-track v12-fd" style={d(1500, 700)}>
            <line x1={ray[0]} y1={ray[1]} x2={ray[2]} y2={ray[3]} />
          </g>
        )}
        <g className="v12-lines">
          <g className="v12-fig" transform={plateTransform(plate)}>
            <Figure mode={mode} />
          </g>
        </g>
        {mode === 'home' && (
          <g className="v12-ray">
            <line className="v12-ray-glow" stroke="url(#v12-home-ray)" />
            <line className="v12-ray-mid" stroke="url(#v12-home-ray)" />
            <line className="v12-ray-core" stroke="url(#v12-home-ray)" />
          </g>
        )}
        <g className="v12-wins">{windows}</g>
      </g>
      {mode === 'home' && typeof location !== 'undefined' && location.hash.includes('debug') && <DebugGrid w={plate.w} h={plate.h} />}
    </svg>
  )
}

export const Suit = memo(SuitImpl)

/** Dev only (#...?debug): a plate-unit grid for placing the windows. */
function DebugGrid({ w, h }: { w: number; h: number }) {
  const xs = Array.from({ length: Math.ceil(w / 100) + 1 }, (_, i) => i * 100)
  const ys = Array.from({ length: Math.ceil(h / 100) + 1 }, (_, i) => i * 100)
  return (
    <g pointerEvents="none">
      {xs.map((x) => (
        <g key={`x${x}`}>
          <line x1={x} y1={0} x2={x} y2={h} stroke="#0f0" strokeOpacity="0.35" />
          <text x={x + 3} y={14} fill="#0f0" fontSize="13">
            {x}
          </text>
        </g>
      ))}
      {ys.map((y) => (
        <g key={`y${y}`}>
          <line x1={0} y1={y} x2={w} y2={y} stroke="#0f0" strokeOpacity="0.35" />
          <text x={3} y={y - 3} fill="#0f0" fontSize="13">
            {y}
          </text>
        </g>
      ))}
    </g>
  )
}

// ------------------------------------------------------------------ the sheet behind the figure: faint drafting marks
function BackdropImpl({ viewBox, svgRef, upright }: { viewBox: string; svgRef?: Ref<SVGSVGElement>; upright?: boolean }) {
  const p = upright ? TALL : WIDE
  const cx = upright ? 500 : 800
  const cy = upright ? 760 : 500
  const ticks = (() => {
    let s = ''
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2
      const r0 = upright ? 560 : 520
      const r1 = r0 + (i % 10 === 0 ? 22 : 9)
      s += `M${(cx + Math.cos(a) * r0).toFixed(1)},${(cy + Math.sin(a) * r0).toFixed(1)}L${(cx + Math.cos(a) * r1).toFixed(1)},${(cy + Math.sin(a) * r1).toFixed(1)}`
    }
    return s
  })()
  const ax = (p.rot * Math.PI) / 180
  // the body's long axis, dashed, through the hip
  const bx = Math.sin(ax)
  const by = -Math.cos(ax)
  const axis = `M${p.hip[0] - bx * 1400},${p.hip[1] - by * 1400}L${p.hip[0] + bx * 1400},${p.hip[1] + by * 1400}`
  return (
    <svg ref={svgRef} className="v12-svg v12-backdrop" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="v12-pool" gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={upright ? 900 : 760}>
          <stop offset="0" stopColor="#1d3cb8" stopOpacity="0.34" />
          <stop offset="0.5" stopColor="#10237a" stopOpacity="0.13" />
          <stop offset="1" stopColor="#081241" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={upright ? 1100 : 900} fill="url(#v12-pool)" />
      <g className="v12-con">
        <path d={axis} className="v12-con-axis" />
        <circle cx={cx} cy={cy} r={upright ? 560 : 520} className="v12-con-thin" />
        <path d={ticks} className="v12-con-thin" />
        <circle cx={cx} cy={cy} r={upright ? 640 : 600} className="v12-con-dash" />
        {(upright
          ? [
              [60, 60],
              [940, 60],
              [60, 1500],
              [940, 1500],
            ]
          : [
              [1550, 50],
              [50, 950],
            ]
        ).map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x - 16},${y}H${x + 16}M${x},${y - 16}V${y + 16}M${x - 8},${y}a8,8 0 1 0 16,0a8,8 0 1 0 -16,0`} className="v12-con-mark" />
        ))}
      </g>
    </svg>
  )
}

export const Backdrop = memo(BackdropImpl)
