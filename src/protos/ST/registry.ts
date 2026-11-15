// Station: the six checks, in pitch order, with their words and their lazily loaded modules.
// Labels and names are from work/Station/CONTRACT.md section 2; each sentence is the "5-second sentence
// (on screen)" at the top of work/Web/cards/<id>.md. Nothing here is a number or a medical claim.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { CheckId, SceneProps, StageProps } from './modules/types'

export interface Check {
  id: CheckId
  /** The problem in plain words: the label on the station. */
  label: string
  name: string
  sentence: string
  /** What the panel's main button says. */
  cta: string
  Scene: LazyExoticComponent<ComponentType<SceneProps>>
  Stage: LazyExoticComponent<ComponentType<StageProps>>
  /** Fetches the module chunks ahead of time: the scene only (small; every scene once the station has settled),
   *  or the scene and the stage (a check that was pressed, and the next one while a panel is open). */
  preload(parts?: 'scene' | 'both'): void
  /** After a part failed to load: a fresh lazy wrapper, so the next render fetches it again (React keeps a
   *  failed lazy component failed for good). */
  retry(part: 'scene' | 'stage'): void
  /** The component itself once its chunk is in (see `ready`), else the lazy wrapper. */
  scene(): SceneComponent
  stage(): StageComponent
}

export type SceneComponent = ComponentType<SceneProps> | LazyExoticComponent<ComponentType<SceneProps>>
export type StageComponent = ComponentType<StageProps> | LazyExoticComponent<ComponentType<StageProps>>

type Loader<P> = () => Promise<{ default: ComponentType<P> }>

function check(
  id: CheckId,
  label: string,
  name: string,
  sentence: string,
  cta: string,
  scene: Loader<SceneProps>,
  stage: Loader<StageProps>,
): Check {
  // A lazy component suspends on its first render even when its chunk is already in, and React then holds the
  // reveal back for about 300 ms: the frozen scene would start late and the panel would open on an empty body.
  // So a chunk that has been preloaded is rendered as the plain component it exports.
  const ready: { scene: ComponentType<SceneProps> | null; stage: ComponentType<StageProps> | null } = { scene: null, stage: null }
  const c: Check = {
    id,
    label,
    name,
    sentence,
    cta,
    Scene: lazy(scene),
    Stage: lazy(stage),
    preload(parts = 'both') {
      scene().then(
        (m) => {
          ready.scene = m.default
        },
        () => {},
      )
      if (parts === 'both')
        stage().then(
          (m) => {
            ready.stage = m.default
          },
          () => {},
        )
    },
    retry(part) {
      if (part === 'scene') {
        ready.scene = null
        c.Scene = lazy(scene)
      } else {
        ready.stage = null
        c.Stage = lazy(stage)
      }
    },
    scene: () => ready.scene ?? c.Scene,
    stage: () => ready.stage ?? c.Stage,
  }
  return c
}

export const CHECKS: Check[] = [
  check(
    'tracktrace',
    'Cosmic rays',
    'TrackTrace',
    'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
    'Scan the nucleus',
    () => import('./modules/tracktrace/Scene'),
    () => import('./modules/tracktrace/Stage'),
  ),
  check(
    'bubblegrade',
    'The bends',
    'BubbleGrade',
    'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    'Play the heart sound',
    () => import('./modules/bubblegrade/Scene'),
    () => import('./modules/bubblegrade/Stage'),
  ),
  check(
    'spikecount',
    'Space anemia',
    'SpikeCount',
    'Every red blood cell, outlined. The spiky ones, counted.',
    'Grade this blood',
    () => import('./modules/spikecount/Scene'),
    () => import('./modules/spikecount/Stage'),
  ),
  check(
    'veinsqueeze',
    'Blood clots',
    'VeinSqueeze',
    'A clot is a vein that won’t squash.',
    'Press on the veins',
    () => import('./modules/veinsqueeze/Scene'),
    () => import('./modules/veinsqueeze/Stage'),
  ),
  check(
    'braindrift',
    'Brain drift',
    'BrainDrift',
    'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    'Fly the brain',
    () => import('./modules/braindrift/Scene'),
    () => import('./modules/braindrift/Stage'),
  ),
  check(
    'garnmeter',
    'Space sickness',
    'Garn Meter',
    'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    'Play the brainwaves',
    () => import('./modules/garnmeter/Scene'),
    () => import('./modules/garnmeter/Stage'),
  ),
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

const BY_ID = new Map(CHECKS.map((c) => [c.id, c]))

export const isCheckId = (v: string): v is CheckId => BY_ID.has(v as CheckId)
export const checkOf = (id: CheckId): Check => BY_ID.get(id) as Check

/** The check `step` places after `id` in pitch order, wrapping round. */
export function neighbour(id: CheckId, step: 1 | -1): Check {
  const i = CHECKS.findIndex((c) => c.id === id)
  return CHECKS[(i + step + CHECKS.length) % CHECKS.length]
}
