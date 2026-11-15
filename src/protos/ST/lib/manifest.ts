// Station assets: the manifest and the hotspot track written by the render pipeline (work/Station/CONTRACT.md
// section 1). Sizes, frame counts and anchors are always read from here, never hard-coded.
import type { Anchors, CheckId, VariantName } from '../modules/types'

export interface Shot {
  in: string
  out: string
  still: string
  frames: number
  anchors: Anchors
}

export interface Variant {
  w: number
  h: number
  loop: { src: string; poster: string; frames: number; track: string }
  shots: Partial<Record<CheckId, Shot>>
}

export interface Manifest {
  version: number
  placeholder: boolean
  fps: number
  order: CheckId[]
  variants: Partial<Record<VariantName, Variant>>
}

export interface Track {
  fps: number
  frames: number
  ids: string[]
  x: Record<string, number[]>
  y: Record<string, number[]>
  v: Record<string, number[]>
  s: Record<string, number[]>
}

const BASE = `${import.meta.env.BASE_URL}station/`

/** Address of a file named in the manifest. */
export const assetUrl = (path: string) => BASE + path.replace(/^\/+/, '')

async function getJson<T>(path: string): Promise<T> {
  // no-cache: a new render set replaces the files at the same paths, and must show up on a plain reload.
  const res = await fetch(assetUrl(path), { cache: 'no-cache' })
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function loadManifest(): Promise<Manifest> {
  const m = await getJson<Manifest>('manifest.json')
  if (!m || typeof m !== 'object' || !m.variants || !(m.variants.wide || m.variants.tall)) throw new Error('manifest.json has no variants')
  if (!(m.fps > 0)) m.fps = 24
  return m
}

export async function loadTrack(path: string): Promise<Track> {
  const t = await getJson<Track>(path)
  if (!t || !t.x || !t.y || !(t.frames > 0)) throw new Error(`${path} is not a track`)
  return t
}

/** tall for a portrait screen, wide otherwise; whichever exists when only one was rendered. */
export function pickVariant(m: Manifest, portrait: boolean): VariantName {
  if (portrait && m.variants.tall) return 'tall'
  if (m.variants.wide) return 'wide'
  return 'tall'
}

/** The part of the frame the renders promise to keep every hotspot inside, as a width in frame pixels. */
export function safeWidth(name: VariantName, v: Variant): number {
  return name === 'wide' ? Math.min(v.w, (v.h * 4) / 3) : v.w * 0.8
}
