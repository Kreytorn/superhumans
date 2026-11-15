// The plate: one deep-space ship, side-on, drawn by code in line. Our own invented design.
// The same drawing serves the home scene, the module page's backdrop and the small locator.
import { memo, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from 'react'
import { AX, CHECKS, RING_R, RING_SQUASH, RING_X, coverImage, screenRect, type Check } from './data'

type Mode = 'home' | 'bg' | 'mini'

export interface ShipProps {
  mode: Mode
  upright?: boolean
  viewBox: string
  svgRef?: Ref<SVGSVGElement>
  /** the room in focus */
  active?: string | null
  /** the room whose page is open (locator) */
  current?: string
  onPress?: (c: Check, e: MouseEvent | KeyboardEvent) => void
  onPoint?: (id: string, on: boolean, how: 'pointer' | 'focus') => void
  title?: string
}

const d = (ms: number, dur?: number) => ({ ['--d' as string]: `${ms}ms`, ...(dur ? { ['--dur' as string]: `${dur}ms` } : {}) }) as CSSProperties

// ---- geometry helpers (plain strings, built once)
const HULL =
  'M86,510 L114,446 L178,410 H700 V396 H840 V382 H1146 L1160,396 V470 L1200,484 V536 L1160,550 V624 L1146,638 H840 V624 H700 V610 H178 L114,574 Z'

function ticks(x0: number, x1: number, step: number, y: number, len: number): string {
  let s = ''
  for (let x = x0; x <= x1 + 0.01; x += step) s += `M${x},${y}v${len}`
  return s
}
function vlines(x0: number, x1: number, step: number, y0: number, y1: number): string {
  let s = ''
  for (let x = x0; x <= x1 + 0.01; x += step) s += `M${x.toFixed(1)},${y0}V${y1}`
  return s
}
function rungs(x0: number, x1: number, y0: number, y1: number, step: number): string {
  let s = ''
  for (let y = y0; y <= y1 + 0.01; y += step) s += `M${x0},${y}H${x1}`
  return s
}
const RIBS_A = ticks(270, 690, 21, 410, 7) + ticks(270, 690, 21, 603, 7)
const RIBS_B = ticks(862, 1140, 22, 382, 7) + ticks(862, 1140, 22, 631, 7)
const TRUSS = 'M1200,484H1420M1200,536H1420' + vlines(1200, 1420, 44, 484, 536) + 'M1200,536L1244,484L1288,536L1332,484L1376,536L1420,484'
const FINS_T = vlines(1218.5, 1394, 12.5, 88, 304)
const FINS_B = vlines(1218.5, 1394, 12.5, 716, 932)
const LADDER_T = rungs(757, 783, 286, 390, 13)
const LADDER_B = rungs(757, 783, 634, 740, 13)
const LOCKERS = vlines(298, 394, 32, 418, 468) + vlines(298, 394, 32, 552, 602)
/** The service bay between the cupola and the lab: conduits with clamps, two racks and the ties to a hatch. */
const BAY = (() => {
  let s = 'M266,478H426M266,542H426'
  for (let x = 282; x <= 410; x += 32) s += `M${x},474v8M${x},538v8`
  s += 'M276,488h40v44h-40Z M376,488h40v44h-40Z'
  for (let y = 495; y <= 526; y += 7.5) s += `M281,${y}h30M381,${y}h30`
  s += 'M316,510h10M366,510h10'
  // valve wheels and handles in the lockers
  for (const [x, y] of [
    [314, 456],
    [378, 456],
    [282, 566],
    [346, 566],
  ])
    s += `M${x - 4},${y}a4,4 0 1 0 8,0a4,4 0 1 0 -8,0M${x},${y - 7}v3M${x},${y + 4}v3`
  return s
})()
const TANKS: [number, number][] = [
  [1256, 434],
  [1256, 586],
  [1356, 434],
  [1356, 586],
]
const NOZZLES = [472, 510, 548]

// ring parts, in ring space (a true circle, squashed by the group it sits in)
/** Bulkheads across the ring band, in the gaps of the window rows. */
const RING_TICKS = (() => {
  let s = ''
  for (let i = 0; i < 8; i++) {
    const a = ((i * 5 + 4) / 40) * Math.PI * 2 + 0.0375
    const c = Math.cos(a)
    const n = Math.sin(a)
    s += `M${(c * (RING_R - 26)).toFixed(1)},${(n * (RING_R - 26)).toFixed(1)}L${(c * RING_R).toFixed(1)},${(n * RING_R).toFixed(1)}`
  }
  return s
})()
/** Lit windows riding the ring band: they slide along the ellipse as the ring turns. */
const RING_WINDOWS = (() => {
  let s = ''
  const p = (r: number, a: number) => `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`
  for (let i = 0; i < 40; i++) {
    if (i % 5 === 4) continue
    const a0 = (i / 40) * Math.PI * 2
    const a1 = a0 + 0.075
    s += `M${p(RING_R - 20, a0)}L${p(RING_R - 6, a0)}L${p(RING_R - 6, a1)}L${p(RING_R - 20, a1)}Z`
  }
  return s
})()
const RING_RX = RING_R * RING_SQUASH
const RING_IR = RING_R - 26
const RING_IRX = RING_IR * RING_SQUASH
/** The ring's band: the space between the outer and inner rim, as one even-odd shape in plate units. */
const RING_BAND =
  `M${RING_X - RING_RX},${AX}a${RING_RX},${RING_R} 0 1 0 ${2 * RING_RX},0a${RING_RX},${RING_R} 0 1 0 ${-2 * RING_RX},0Z` +
  `M${RING_X - RING_IRX},${AX}a${RING_IRX},${RING_IR} 0 1 0 ${2 * RING_IRX},0a${RING_IRX},${RING_IR} 0 1 0 ${-2 * RING_IRX},0Z`

/**
 * The glazed nose (side-on plate): the glazing ends above a sill band that runs across the nose from the hull's
 * lower facet to the bulkhead, like the sills of the other rooms. The band's left edge follows the hull, set in 6 units.
 */
/** On the side-on plate the cupola ends at a deck line just under its band; the hull's lower facet stays unlit. */
const NOSE_ROOM = '250,410 178,410 114,446 86,510 114,574 250,574'
const NOSE_FOCUS = '258,402 176,402 108,440 77,510 108,582 258,582'
const NOSE_FOCUS_UP = '258,402 176,402 108,440 77,510 108,580 176,618 258,618'
/** The glazing stops at y 536: 126 units under the room's top (screenRect in data.ts). */
const NOSE_GLAZE = '250,410 178,410 114,446 86,510 97.4,536 250,536'
const NOSE_BAND = '106,542 244,542 244,568 117.4,568'
const NOSE_MULLIONS = 'M178,410 V536 M114,446 V536 M86,510 H250 M178,410 L114,446 M97.4,536 H250'
const NOSE_MULLIONS_UP = 'M178,410 V610 M114,446 V574 M86,510 H250 M178,410 L114,446 M178,610 L114,574'

/** One room's wall screen, in plate units: the shape that carries the specimen and where the picture sits on it. */
export function screenOf(c: Check, upright?: boolean) {
  const poly = c.poly ? (upright ? c.poly : NOSE_GLAZE) : undefined
  const [sx, sy, sw, sh] = screenRect(c, !!upright)
  const scx = sx + sw / 2
  const scy = sy + sh / 2
  const img = upright ? coverImage(c, scx - sh / 2, scy - sw / 2, sh, sw) : coverImage(c, sx, sy, sw, sh)
  return { poly, sx, sy, sw, sh, scx, scy, img }
}

/** The pattern that paints a room's screen with its specimen (turned upright on the phone plate). */
function ScreenPattern({ c, id, upright }: { c: Check; id: string; upright?: boolean }) {
  const s = screenOf(c, upright)
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" x={s.sx} y={s.sy} width={s.sw} height={s.sh}>
      <rect width={s.sw} height={s.sh} fill={c.poly ? '#1a1240' : '#04060c'} />
      <image
        href={c.img}
        x={s.img.x - s.sx}
        y={s.img.y - s.sy}
        width={s.img.width}
        height={s.img.height}
        preserveAspectRatio="none"
        transform={upright ? `rotate(-90 ${s.scx - s.sx} ${s.scy - s.sy})` : undefined}
      />
    </pattern>
  )
}

/**
 * A room's screen alone, drawn in a box that sits over the module page's stage frame: at the end of the move into
 * the room the specimen is exactly here, so the page takes over from the zoom without a jump. `viewBox` maps the
 * frame's pixels to plate units (see Module).
 */
export function ScreenPoster({ c, upright, viewBox }: { c: Check; upright?: boolean; viewBox: string }) {
  const s = screenOf(c, upright)
  const id = `v03-poster-pat-${c.id}`
  return (
    <svg className="v03-m-poster" viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <ScreenPattern c={c} id={id} upright={upright} />
      </defs>
      <g transform={upright ? 'translate(1000 0) rotate(90)' : undefined}>
        {s.poly ? <polygon points={s.poly} fill={`url(#${id})`} /> : <rect x={s.sx} y={s.sy} width={s.sw} height={s.sh} rx="4" fill={`url(#${id})`} />}
      </g>
    </svg>
  )
}

/**
 * Each lit room carries its check's name on a lit nameplate along its sill, inside the room's own frame,
 * so a name never crosses a line of the ship. On the upright (phone) plate the names sit outside instead.
 */
function Sill({ c, upright }: { c: Check; upright?: boolean }) {
  const [x, y, w, h] = c.box
  const text = (tx: number, ty: number) => (
    <text className="v03-sill-text" x={tx} y={ty} textAnchor="middle">
      <tspan className="v03-sill-n">{c.n}</tspan>
      <tspan dx="7">{c.name.toUpperCase()}</tspan>
    </text>
  )
  if (c.poly) {
    if (upright) return null
    // centred between the hull edge at the baseline (x 114) and the band's right end
    return (
      <g className="v03-sill v03-sill-nose">
        <polygon className="v03-sill-plate" points={NOSE_BAND} />
        {text(179.5, 561.5)}
      </g>
    )
  }
  // on the upright plate the sill would stand on end: the room keeps its plain lit margin there
  if (upright) return null
  return (
    <g className="v03-sill">
      <rect className="v03-sill-plate" x={x + 5} y={y + h - 31} width={w - 10} height={26} rx="3" />
      {text(x + w / 2, y + h - 11.5)}
    </g>
  )
}

function Room({ c, i, mode, upright, active, current, onPress, onPoint }: { c: Check; i: number; mode: Mode } & Pick<ShipProps, 'upright' | 'active' | 'current' | 'onPress' | 'onPoint'>) {
  const [x, y, w, h] = c.box
  const cx = x + w / 2
  const cy = y + h / 2
  const poly = c.poly ? (upright ? c.poly : NOSE_ROOM) : undefined
  // the wall screen: the room minus a lit margin and the sill with the nameplate
  const { poly: glaze, sx, sy, sw, sh } = screenOf(c, upright)
  const on = active === c.id
  const here = current === c.id
  const label = mode === 'mini' ? `${c.name}, ${c.room}` : `${c.name}: ${c.room}. ${c.sentence}`
  const shape = (cls: string, extra?: Record<string, string | number>) =>
    poly ? <polygon className={cls} points={poly} {...extra} /> : <rect className={cls} x={x} y={y} width={w} height={h} rx="9" {...extra} />
  // the specimen is a pattern fill of the screen, so the room's box stays the room (an image clipped by a
  // clip path would still widen the link's bounding box to the whole picture)
  const pid = `v03-${mode}-pat-${c.id}`
  const screen = (cls: string | undefined, fill: string) =>
    glaze ? <polygon className={cls} points={glaze} fill={fill} /> : <rect className={cls} x={sx} y={sy} width={sw} height={sh} rx="4" fill={fill} />

  const inner = (
    <>
      {mode !== 'mini' && (
        <>
          <ellipse className="v03-glow-a" cx={cx} cy={cy} rx={w * 0.92} ry={h * 0.96} fill={`url(#v03-${mode}-amber)`} />
          <ellipse className="v03-glow-h" cx={cx} cy={cy} rx={w * 1.05} ry={h * 1.1} fill={`url(#v03-${mode}-g-${c.id})`} />
        </>
      )}
      {shape('v03-wall-a', { fill: mode === 'mini' ? undefined : `url(#v03-${mode}-wall)` } as Record<string, string>)}
      {shape('v03-wall-h')}
      {mode !== 'mini' && (
        <>
          {/* the room's lights going down as the view moves in: only the screen stays lit */}
          {mode === 'home' && shape('v03-dark')}
          <defs>
            <ScreenPattern c={c} id={pid} upright={upright} />
          </defs>
          {screen('v03-screen', `url(#${pid})`)}
          {screen('v03-sheen', `url(#v03-${mode}-sheen)`)}
          {mode === 'home' && screen('v03-flash', '#dff6ff')}
          {mode === 'home' && !poly && (
            <rect className="v03-scan" x={sx} y={sy} width={sw} height="24" fill="url(#v03-home-scan)" style={{ ['--sh' as string]: `${sh - 24}px` }} />
          )}
          {poly ? <path className="v03-mullion" d={upright ? NOSE_MULLIONS_UP : NOSE_MULLIONS} /> : <rect className="v03-bezel" x={sx} y={sy} width={sw} height={sh} rx="4" />}
          <Sill c={c} upright={upright} />
          {shape('v03-shade')}
        </>
      )}
      {shape('v03-edge')}
      {poly ? <polygon className="v03-focus" points={upright ? NOSE_FOCUS_UP : NOSE_FOCUS} /> : <rect className="v03-focus" x={x - 8} y={y - 8} width={w + 16} height={h + 16} rx="15" />}
    </>
  )
  // behind the module page the rooms are part of the picture, not controls
  if (mode === 'bg') return <g className="v03-room" style={{ ['--hue' as string]: c.hue }}>{inner}</g>
  return (
    <a
      className={`v03-room${on ? ' is-on' : ''}${here ? ' is-here' : ''}`}
      href={`#/proto/V03/${c.id}`}
      aria-label={label}
      aria-current={here ? 'page' : undefined}
      data-room={c.id}
      data-qa={mode === 'home' && c.id === 'tracktrace' ? 'primary' : undefined}
      style={{ ['--hue' as string]: c.hue, ['--i' as string]: i }}
      onClick={onPress ? (e) => onPress(c, e) : undefined}
      onKeyDown={
        onPress
          ? (e) => {
              if (e.key === ' ') onPress(c, e)
            }
          : undefined
      }
      onPointerEnter={onPoint ? (e) => e.pointerType === 'mouse' && onPoint(c.id, true, 'pointer') : undefined}
      onPointerLeave={onPoint ? (e) => e.pointerType === 'mouse' && onPoint(c.id, false, 'pointer') : undefined}
      onFocus={onPoint ? () => onPoint(c.id, true, 'focus') : undefined}
      onBlur={onPoint ? () => onPoint(c.id, false, 'focus') : undefined}
    >
      {inner}
    </a>
  )
}

/** Names on the upright (phone) plate, set in clear space beside each room; given in upright plate units. */
function PhoneLabels({ active }: { active?: string | null }) {
  return (
    <g className="v03-labels" aria-hidden="true">
      {CHECKS.map((c, i) => {
        const [lx, ly, anchor] = c.phone
        return (
          <g key={c.id} className={`v03-label${active === c.id ? ' is-on' : ''}`} style={{ ['--hue' as string]: c.hue, ['--i' as string]: ORDER[c.id] ?? i }}>
            <text className="v03-lab-name" x={lx} y={ly} textAnchor={anchor}>
              <tspan className="v03-lab-n">{c.n}</tspan>
              <tspan dx="9">{c.name.toUpperCase()}</tspan>
            </text>
          </g>
        )
      })}
    </g>
  )
}

/** Rooms light up from the shielded core outwards: the storm shelter (TrackTrace) first. */
const ORDER: Record<string, number> = { tracktrace: 0, bubblegrade: 1, braindrift: 2, veinsqueeze: 3, spikecount: 4, garnmeter: 5 }

function Defs({ mode }: { mode: Mode }) {
  const p = `v03-${mode}`
  return (
    <defs>
      <radialGradient id={`${p}-amber`}>
        <stop offset="0" stopColor="#ffb44d" stopOpacity="0.62" />
        <stop offset="0.45" stopColor="#ff9a2e" stopOpacity="0.24" />
        <stop offset="1" stopColor="#ff8a1e" stopOpacity="0" />
      </radialGradient>
      {CHECKS.map((c) => (
        <radialGradient key={c.id} id={`${p}-g-${c.id}`}>
          <stop offset="0" stopColor={c.hue} stopOpacity="0.85" />
          <stop offset="0.5" stopColor={c.hue} stopOpacity="0.3" />
          <stop offset="1" stopColor={c.hue} stopOpacity="0" />
        </radialGradient>
      ))}
      <linearGradient id={`${p}-wall`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffc267" />
        <stop offset="0.55" stopColor="#c9791c" />
        <stop offset="1" stopColor="#6b3a08" />
      </linearGradient>
      <linearGradient id={`${p}-sheen`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
        <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.28" />
      </linearGradient>
      <linearGradient id={`${p}-rad`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#3fb8d8" stopOpacity="0.13" />
        <stop offset="1" stopColor="#7fb4ff" stopOpacity="0.03" />
      </linearGradient>
      <linearGradient id={`${p}-rad2`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3fb8d8" stopOpacity="0.13" />
        <stop offset="1" stopColor="#7fb4ff" stopOpacity="0.03" />
      </linearGradient>
      <linearGradient id={`${p}-plume`} gradientUnits="userSpaceOnUse" x1="1552" y1="0" x2="1790" y2="0">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.98" />
        <stop offset="0.1" stopColor="#b9f1ff" stopOpacity="0.85" />
        <stop offset="0.42" stopColor="#6a86ff" stopOpacity="0.36" />
        <stop offset="1" stopColor="#5a4dff" stopOpacity="0" />
      </linearGradient>
      <radialGradient id={`${p}-burn`}>
        <stop offset="0" stopColor="#9fe6ff" stopOpacity="0.7" />
        <stop offset="0.4" stopColor="#4f6dff" stopOpacity="0.28" />
        <stop offset="1" stopColor="#3b3bff" stopOpacity="0" />
      </radialGradient>
      {mode === 'home' && (
        <>
          {/* a scan line sweeping down a lit screen: a bright edge with a soft trail above it */}
          <linearGradient id={`${p}-scan`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9fe6ff" stopOpacity="0" />
            <stop offset="0.78" stopColor="#9fe6ff" stopOpacity="0.16" />
            <stop offset="0.92" stopColor="#f2fdff" stopOpacity="0.75" />
            <stop offset="1" stopColor="#f2fdff" stopOpacity="0" />
          </linearGradient>
          {/* the cosmic ray's streak: its tail fades out behind the head (the ends are moved every frame) */}
          <linearGradient id={`${p}-ray`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bdf0ff" stopOpacity="0" />
            <stop offset="0.65" stopColor="#d6f6ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
        </>
      )}
      <pattern id={`${p}-hatch`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="9" stroke="#8fd3ff" strokeWidth="1.5" strokeOpacity="0.55" />
      </pattern>
      <clipPath id={`${p}-far`}>
        <rect x={RING_X - 400} y="-200" width="400" height="1400" />
      </clipPath>
      <clipPath id={`${p}-near`}>
        <rect x={RING_X} y="-200" width="400" height="582" />
        <rect x={RING_X} y="638" width="400" height="600" />
      </clipPath>
      <clipPath id={`${p}-hid`}>
        <rect x={RING_X} y="382" width="400" height="256" />
      </clipPath>
    </defs>
  )
}

/**
 * The habitat ring, side-on. The far half sits behind the hull; the near half passes in front of it,
 * except where it would cover the cut-open hull: there it is drawn as a dashed hidden line.
 */
function Ring({ mode, side }: { mode: Mode; side: 'far' | 'near' | 'hid' }) {
  const clip = `url(#v03-${mode}-${side})`
  if (side === 'hid')
    return (
      <g className="v03-ring-hid v03-fd" style={d(900, 800)} clipPath={clip}>
        <ellipse cx={RING_X} cy={AX} rx={RING_RX} ry={RING_R} />
        <ellipse cx={RING_X} cy={AX} rx={RING_IRX} ry={RING_IR} />
      </g>
    )
  return (
    <g className={`v03-ringhalf v03-ring-${side}`} clipPath={clip}>
      <path className="v03-ring-band v03-fd" style={d(700, 700)} d={RING_BAND} fillRule="evenodd" />
      <g className="v03-fd" style={d(1200, 900)} transform={`translate(${RING_X} ${AX}) scale(${RING_SQUASH} 1)`}>
        <g className="v03-spin">
          <path d={RING_WINDOWS} className="v03-ring-win" />
          <path d={RING_TICKS} className="v03-ring-tick" />
        </g>
      </g>
      <path className="v03-halo v03-fd" style={d(700, 900)} d={RING_BAND} />
      <g className="v03-dr v03-l1" style={d(380, 1200)}>
        <ellipse pathLength={1} cx={RING_X} cy={AX} rx={RING_RX} ry={RING_R} />
        <ellipse pathLength={1} cx={RING_X} cy={AX} rx={RING_IRX} ry={RING_IR} />
      </g>
    </g>
  )
}

function Machinery({ mode }: { mode: Mode }) {
  const p = `v03-${mode}`
  return (
    <g className="v03-mech">
      {/* radiators */}
      <rect className="v03-fd" style={d(900, 900)} x="1206" y="76" width="200" height="240" fill={`url(#${p}-rad)`} />
      <rect className="v03-fd" style={d(900, 900)} x="1206" y="704" width="200" height="240" fill={`url(#${p}-rad2)`} />
      <g className="v03-dr v03-l2 v03-rad" style={d(560, 1000)}>
        <rect pathLength={1} x="1206" y="76" width="200" height="240" />
        <rect pathLength={1} x="1206" y="704" width="200" height="240" />
        <path pathLength={1} d="M1206,88H1406M1206,304H1406M1206,716H1406M1206,932H1406" />
      </g>
      <g className="v03-dr v03-l2" style={d(560, 1000)}>
        <path pathLength={1} d="M1303,316V484M1309,316V484M1303,536V704M1309,536V704" />
        <path pathLength={1} d="M1306,424L1226,316M1306,424L1386,316M1306,596L1226,704M1306,596L1386,704" />
      </g>
      <g className="v03-dr v03-l3" style={d(820, 1100)}>
        <path pathLength={1} d={FINS_T} />
        <path pathLength={1} d={FINS_B} />
      </g>
      {/* truss and the line that feeds the engines */}
      <g className="v03-dr v03-l2" style={d(480, 1000)}>
        <path pathLength={1} d={TRUSS} />
        <path pathLength={1} d="M1160,510H1442" />
      </g>
      {/* tanks */}
      {TANKS.map(([x, y], i) => (
        <g key={i}>
          <circle className="v03-solid v03-fd" style={d(700, 600)} cx={x} cy={y} r="46" />
          <g className="v03-dr v03-l1" style={d(640 + i * 60, 900)}>
            <circle pathLength={1} cx={x} cy={y} r="46" />
          </g>
          <g className="v03-dr v03-l3" style={d(900 + i * 60, 800)}>
            <ellipse pathLength={1} cx={x} cy={y} rx="46" ry="13" />
            <ellipse pathLength={1} cx={x} cy={y} rx="15" ry="46" />
            <ellipse pathLength={1} cx={x} cy={y} rx="32" ry="46" />
          </g>
        </g>
      ))}
      {/* reactor, shadow shield, engines */}
      <path className="v03-solid v03-fd" style={d(700, 600)} d="M1420,470L1438,458V562L1420,550Z M1442,476h46v68h-46Z M1500,454h10v112h-10Z" />
      <g className="v03-dr v03-l1" style={d(760, 900)}>
        <path pathLength={1} d="M1420,470L1438,458V562L1420,550Z" />
        <rect pathLength={1} x="1442" y="476" width="46" height="68" rx="10" />
        <path pathLength={1} d="M1500,454h10v112h-10Z" />
        {NOZZLES.map((cy) => (
          <path key={cy} pathLength={1} d={`M1510,${cy - 6}C1524,${cy - 7} 1538,${cy - 11} 1552,${cy - 17}M1510,${cy + 6}C1524,${cy + 7} 1538,${cy + 11} 1552,${cy + 17}`} />
        ))}
      </g>
      <g className="v03-dr v03-l3" style={d(980, 800)}>
        <rect pathLength={1} x="1452" y="490" width="26" height="40" rx="4" />
        <path pathLength={1} d="M1458,490V530M1465,490V530M1472,490V530M1488,488L1500,474M1488,532L1500,546M1488,510H1500M1438,510H1442" />
        {NOZZLES.map((cy) => (
          <path key={cy} pathLength={1} d={`M1552,${cy - 17}V${cy + 17}M1524,${cy - 8}V${cy + 8}M1538,${cy - 11.5}V${cy + 11.5}`} />
        ))}
      </g>
      {/* dish, docking port, whiskers */}
      <g className="v03-dr v03-l2" style={d(900, 900)}>
        <path pathLength={1} d="M563,410V374M569,410V374" />
        <path pathLength={1} d="M320,410V398H356V410M314,398H362M328,398V391H348V398" />
        <g transform="translate(566 352) rotate(-24)">
          <path pathLength={1} d="M-46,0Q0,38 46,0Z" className="v03-solidline" />
          <path pathLength={1} d="M-40,3L0,-30L40,3M0,18V-30" />
          <circle pathLength={1} cx="0" cy="-32" r="3.4" />
        </g>
      </g>
    </g>
  )
}

function Hull({ mode }: { mode: Mode }) {
  const p = `v03-${mode}`
  return (
    <g className="v03-hull">
      {/* capsules on the ring, the shafts down to the hub, the airlock */}
      <path className="v03-solid v03-fd" style={d(300, 700)} d="M757,274H783V396H757Z M757,624H783V746H757Z" />
      <g className="v03-dr v03-l2" style={d(420, 900)}>
        <path pathLength={1} d="M757,274V396M783,274V396M757,624V746M783,624V746" />
        <path pathLength={1} d="M667,274L757,344M873,274L783,344M664,746L757,676M876,746L783,676" />
      </g>
      <g className="v03-dr v03-l3" style={d(900, 700)}>
        <path pathLength={1} d={LADDER_T} />
        <path pathLength={1} d={LADDER_B} />
      </g>
      <path className="v03-solid v03-fd" style={d(200, 700)} d={HULL} />
      <path className="v03-solid v03-fd" style={d(300, 700)} d="M677,84H863Q887,84 887,108V250Q887,274 863,274H677Q653,274 653,250V108Q653,84 677,84Z M672,746H868Q892,746 892,770V912Q892,936 868,936H672Q648,936 648,912V770Q648,746 672,746Z M905,636V776Q905,800 929,800H1071Q1095,800 1095,776V636Z" />
      {/* the soft outer glow of the skin, then the skin itself */}
      <path className="v03-halo v03-fd" style={d(500, 900)} d={HULL} />
      <g className="v03-dr v03-l0" style={d(0, 1500)}>
        <path pathLength={1} d={HULL} />
      </g>
      <g className="v03-dr v03-l1" style={d(260, 1100)}>
        <path pathLength={1} d="M677,84H863Q887,84 887,108V250Q887,274 863,274H677Q653,274 653,250V108Q653,84 677,84Z" />
        <path pathLength={1} d="M672,746H868Q892,746 892,770V912Q892,936 868,936H672Q648,936 648,912V770Q648,746 672,746Z" />
        <path pathLength={1} d="M905,638V776Q905,800 929,800H1071Q1095,800 1095,776V638" />
      </g>
      {/* pressure shell, frames, bulkheads */}
      <g className="v03-dr v03-l2" style={d(620, 1000)}>
        <path pathLength={1} d="M256,417H694M256,603H694" />
        <path pathLength={1} d="M846,389H1143L1153,399V621L1143,631H846Z" />
        <path pathLength={1} d="M250,410V610M256,417V603M432,417V603M676,417V603M700,410V610M840,396V624" />
        <path pathLength={1} d="M712,396V624M728,396V624M812,396V624M828,396V624" />
        <path pathLength={1} d="M676,486H866M676,534H866" />
        <path pathLength={1} d="M266,468H426M266,552H426M266,418V468M426,418V468M266,552V602M426,552V602" />
        <path pathLength={1} d="M978,800V808H1022V800M985,632H1015V644H985Z M899,660V704M1101,660V704" />
      </g>
      <g className="v03-dr v03-l3" style={d(880, 900)}>
        <path pathLength={1} d={RIBS_A} />
        <path pathLength={1} d={RIBS_B} />
        <path pathLength={1} d={LOCKERS} />
        <path pathLength={1} d={BAY} />
        <circle pathLength={1} cx="346" cy="510" r="20" />
        <circle pathLength={1} cx="346" cy="510" r="13" />
        <path pathLength={1} d="M332,496l4,4M360,496l-4,4M332,524l4,-4M360,524l-4,-4" />
        <path pathLength={1} d="M274,443H290M306,443H322M338,443H354M370,443H386M402,443H418M274,577H290M306,577H322M338,577H354M370,577H386M402,577H418" />
        <path pathLength={1} d="M246,486V534M260,486V534M428,486V534M436,486V534M672,486V534M680,486V534" />
        <path pathLength={1} d="M300,610v8h-7M300,610v8h7M640,610v8h-7M640,610v8h7M1150,382v-8h-7M1150,382v-8h7" />
        {/* under the cupola's deck: a conduit and its clamps in the hull's lower facet */}
        <path pathLength={1} d="M154,592H244M178,586v12M206,586v12M234,586v12" />
      </g>
      {/* the shielded core: water wall round the shelter */}
      <path className="v03-fd" style={d(1000, 900)} fillRule="evenodd" fill={`url(#${p}-hatch)`} d="M866,394H1134Q1148,394 1148,408V612Q1148,626 1134,626H866Q852,626 852,612V408Q852,394 866,394Z M884,412H1116Q1128,412 1128,424V596Q1128,608 1116,608H884Q872,608 872,596V424Q872,412 884,412Z" />
      <g className="v03-dr v03-l1" style={d(760, 1000)}>
        <rect pathLength={1} x="852" y="394" width="296" height="232" rx="14" />
        <rect pathLength={1} x="872" y="412" width="256" height="196" rx="12" />
      </g>
      {/* the hub of the ring */}
      <circle className="v03-solid v03-fd" style={d(500, 600)} cx={RING_X} cy={AX} r="31" />
      <g className="v03-dr v03-l1" style={d(700, 900)}>
        <circle pathLength={1} cx={RING_X} cy={AX} r="31" />
        <circle pathLength={1} cx={RING_X} cy={AX} r="15" />
      </g>
      <g className="v03-fd v03-l2" style={d(1100, 600)}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <circle key={i} cx={RING_X + Math.cos((i / 8) * 6.2832) * 23} cy={AX + Math.sin((i / 8) * 6.2832) * 23} r="1.7" />
        ))}
      </g>
      {/* small lit panels on the command deck */}
      <g className="v03-fd v03-lit" style={d(1500, 700)}>
        <rect x="304" y="424" width="20" height="13" rx="1.5" />
        <rect x="368" y="424" width="20" height="13" rx="1.5" />
        <rect x="336" y="583" width="20" height="13" rx="1.5" />
        <rect x="400" y="558" width="20" height="13" rx="1.5" />
      </g>
    </g>
  )
}

function Life({ mode }: { mode: Mode }) {
  const p = `v03-${mode}`
  return (
    <g className="v03-life">
      {/* engines burning */}
      <g className="v03-fd" style={d(1700, 900)}>
        <ellipse className="v03-burn" cx="1600" cy={AX} rx="190" ry="120" fill={`url(#${p}-burn)`} />
        <g className="v03-plumes">
          {NOZZLES.map((cy) => (
            <path key={cy} d={`M1552,${cy - 16}L1790,${cy - 4}V${cy + 4}L1552,${cy + 16}Z`} fill={`url(#${p}-plume)`} />
          ))}
        </g>
      </g>
      {/* a cosmic ray now and then: a straight bright streak across the hull (moved by startLife in motion.ts) */}
      {mode === 'home' && (
        <g className="v03-ray">
          <line className="v03-ray-glow" stroke={`url(#${p}-ray)`} />
          <line className="v03-ray-mid" stroke={`url(#${p}-ray)`} />
          <line className="v03-ray-core" stroke={`url(#${p}-ray)`} />
        </g>
      )}
    </g>
  )
}

function ShipImpl({ mode, upright, viewBox, svgRef, active, current, onPress, onPoint, title }: ShipProps) {
  const rooms = CHECKS.map((c) => <Room key={c.id} c={c} i={ORDER[c.id] ?? 0} mode={mode} upright={upright} active={active} current={current} onPress={onPress} onPoint={onPoint} />)
  let body: ReactNode
  if (mode === 'mini') {
    body = (
      <>
        <g className="v03-mini-lines">
          <ellipse cx={RING_X} cy={AX} rx={RING_R * RING_SQUASH} ry={RING_R} />
          <path d={HULL} className="v03-mini-solid" />
          <path d="M1200,484H1420M1200,536H1420M1420,470L1438,458V562L1420,550ZM1442,476h46v68h-46ZM1500,454h10v112h-10Z" />
          <path d="M1206,76h200v240h-200ZM1206,704h200v240h-200ZM1306,316V484M1306,536V704" />
          {TANKS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="46" />
          ))}
          <path d="M757,274V396M783,274V396M757,624V746M783,624V746" />
          <path d="M1510,472l42,-14v28ZM1510,510l42,-14v28ZM1510,548l42,-14v28Z" />
        </g>
        {rooms}
      </>
    )
  } else {
    body = (
      <>
        <g className="v03-lines">
          <Ring mode={mode} side="far" />
          <Machinery mode={mode} />
          <Hull mode={mode} />
          <Ring mode={mode} side="near" />
          <Ring mode={mode} side="hid" />
        </g>
        <g className="v03-rooms">{rooms}</g>
        <Life mode={mode} />
      </>
    )
  }
  return (
    <svg ref={svgRef} className={`v03-svg v03-svg-${mode}`} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role={mode === 'bg' ? 'presentation' : 'group'} aria-label={mode === 'bg' ? undefined : title} aria-hidden={mode === 'bg' ? true : undefined} focusable="false">
      <Defs mode={mode} />
      <g transform={upright ? 'translate(1000 0) rotate(90)' : undefined}>{body}</g>
      {mode === 'home' && upright && <PhoneLabels active={active} />}
    </svg>
  )
}

export const Ship = memo(ShipImpl)

// ------------------------------------------------------------------ the sheet behind the ship
const PROTRACTOR = (() => {
  let s = ''
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2
    const r0 = 452
    const r1 = i % 6 === 0 ? 484 : 466
    s += `M${(RING_X + Math.cos(a) * r0).toFixed(1)},${(AX + Math.sin(a) * r0).toFixed(1)}L${(RING_X + Math.cos(a) * r1).toFixed(1)},${(AX + Math.sin(a) * r1).toFixed(1)}`
  }
  return s
})()

function BackdropImpl({ viewBox, svgRef, upright }: { viewBox: string; svgRef?: Ref<SVGSVGElement>; upright?: boolean }) {
  return (
    <svg ref={svgRef} className="v03-svg v03-backdrop" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="v03-grid-l" width="200" height="200" patternUnits="userSpaceOnUse">
          <path d="M200,0H0V200" fill="none" stroke="#6f8fe0" strokeOpacity="0.07" strokeWidth="1" />
          <path d="M96,100h8M100,96v8" fill="none" stroke="#8fb0ff" strokeOpacity="0.16" strokeWidth="1" />
        </pattern>
        <radialGradient id="v03-pool" gradientUnits="userSpaceOnUse" cx={RING_X + 60} cy={AX} r="820">
          <stop offset="0" stopColor="#1d3cb8" stopOpacity="0.3" />
          <stop offset="0.5" stopColor="#10237a" stopOpacity="0.12" />
          <stop offset="1" stopColor="#081241" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={upright ? 'translate(1000 0) rotate(90)' : undefined}>
        <rect x="-2400" y="-2400" width="6400" height="5800" fill="url(#v03-grid-l)" />
        <circle cx={RING_X} cy={AX} r="900" fill="url(#v03-pool)" />
        <g className="v03-con">
          <path d={`M-900,${AX}H2500M${RING_X},-900V1900`} className="v03-con-axis" />
          <circle cx={RING_X} cy={AX} r={RING_R} />
          <circle cx={RING_X} cy={AX} r={RING_R - 26} className="v03-con-thin" />
          <circle cx={RING_X} cy={AX} r="452" className="v03-con-thin" />
          <path d={PROTRACTOR} className="v03-con-thin" />
          <circle cx={RING_X} cy={AX} r="610" className="v03-con-dash" />
          {/* registration marks and a scale bar with no numbers */}
          {(upright
            ? [
                [56, 56],
                [1544, 56],
                [56, 944],
                [1544, 944],
              ]
            : [[1544, 56]]
          ).map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M${x - 16},${y}H${x + 16}M${x},${y - 16}V${y + 16}M${x - 8},${y}a8,8 0 1 0 16,0a8,8 0 1 0 -16,0`} className="v03-con-mark" />
          ))}
          {!upright && (
            <g className="v03-con-mark">
              <path d="M1216,40H1396M1216,34V46M1252,34V46M1288,34V46M1324,34V46M1360,34V46M1396,34V46" />
              <path d="M1216,36h36v8h-36ZM1288,36h36v8h-36ZM1360,36h36v8h-36Z" className="v03-con-fill" />
            </g>
          )}
        </g>
      </g>
    </svg>
  )
}

export const Backdrop = memo(BackdropImpl)
