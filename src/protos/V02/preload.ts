// Code for the module page and each check's working stage, fetched early (on hover or when a dive starts) so the
// camera move runs straight into the page instead of waiting on the network.
export const loadModule = () => import('./Module')

export const STAGES: Record<string, () => Promise<unknown>> = {
  tracktrace: () => import('../../moments/tracktrace'),
  bubblegrade: () => import('../../moments/bubblegrade'),
  veinsqueeze: () => import('../../moments/veinsqueeze'),
  braindrift: () => import('../../moments/braindrift'),
  garnmeter: () => import('../../moments/garnmeter'),
  spikecount: () => import('../../engine/spikecount'),
}

const asked = new Set<string>()
export function preload(id: string) {
  if (asked.has(id)) return
  asked.add(id)
  loadModule().catch(() => asked.delete(id))
  STAGES[id]?.().catch(() => asked.delete(id))
}
