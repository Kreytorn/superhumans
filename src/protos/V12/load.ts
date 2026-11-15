// Code loading for the move into a window: the module page and each stage load once and are kept,
// so the home fetches them ahead (once settled, and on hover or focus) and the zoom never waits on a blank screen.
import type { ComponentType } from 'react'
import type { Check } from './data'

type ModuleView = ComponentType<{ check: Check }>

let modulePromise: Promise<{ default: ModuleView }> | null = null
let moduleView: ModuleView | null = null

export function loadModule(): Promise<{ default: ModuleView }> {
  modulePromise ??= import('./Module').then((m) => {
    moduleView = m.default
    return m
  })
  return modulePromise
}

/** The module page, if its code is already in (so it renders without suspending). */
export function loadedModule(): ModuleView | null {
  return moduleView
}

export const MOMENTS = {
  tracktrace: () => import('../../moments/tracktrace'),
  bubblegrade: () => import('../../moments/bubblegrade'),
  veinsqueeze: () => import('../../moments/veinsqueeze'),
  braindrift: () => import('../../moments/braindrift'),
  garnmeter: () => import('../../moments/garnmeter'),
}
type MomentId = keyof typeof MOMENTS
const momentPromises: Partial<Record<MomentId, Promise<unknown>>> = {}

/** Starts loading one stage (SpikeCount's is part of the module page). Never rejects. */
export function preloadMoment(id: string): Promise<unknown> {
  if (!(id in MOMENTS)) return loadModule().catch(() => null)
  const k = id as MomentId
  momentPromises[k] ??= MOMENTS[k]().catch(() => null)
  return momentPromises[k]
}
