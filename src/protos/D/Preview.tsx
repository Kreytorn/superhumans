// The other three checks (veins, brain, nausea): the specimen, the check's one sentence and a plain line that the full check
// arrives in the complete build. Each cuts its own window (a band for sound and brainwaves, a tall window for
// the ultrasound and the brain), always at least half the viewport.
import { useEffect, useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { hrefOf, posterUrl, type Check } from './data'
import { useViewport } from './fit'
import { FitWord } from './pieces'
import type { ViewProps } from './index'

export function Preview({ check, fonts, onStatus }: ViewProps & { check: Check }) {
  const { desktop, u, vw } = useViewport()
  const [image, setImage] = useState<'wait' | 'ok' | 'missing'>('wait')
  const portrait = !desktop || check.shape === 'tall'

  const ready = fonts && image !== 'wait'
  useEffect(() => onStatus({ ready, state: image === 'missing' ? 'error' : 'idle' }), [ready, image, onStatus])

  return (
    <div className="drp-sheet drp-check drp-preview" data-shape={desktop ? check.shape : 'square'} data-check={check.id}>
      <div className="drp-win" data-qa="hero">
        <div className="drp-stage">
          {image !== 'missing' && (
            <img
              className="drp-poster"
              src={posterUrl(check.id, portrait)}
              alt={check.specimen}
              style={{ inset: 0, width: '100%', height: '100%' }}
              draggable={false}
              onLoad={() => setImage('ok')}
              onError={() => setImage('missing')}
            />
          )}
        </div>
        <span className="drp-tab drp-tab-tr drp-tag">{image === 'missing' ? 'Still not found' : 'Stored still'}</span>
        {!desktop && (
          <a className="drp-back" href={hrefOf('home')}>
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            All six
          </a>
        )}
      </div>

      <div className="drp-col">
        {desktop && (
          <a className="drp-back" href={hrefOf('home')}>
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            All six checks
          </a>
        )}
        <FitWord as="h1" className="drp-name" text={check.name} weight={800} size={desktop ? 132 * u : 64} target={desktop ? 480 * u : Math.min(250, vw - 120)} ready={fonts} />
        <p className="drp-sentence">{check.sentence}</p>
        <p className="drp-note">The full check arrives in the complete build.</p>
        <a className="drp-btn" data-qa="primary" href={hrefOf('home')}>
          Back to all six checks
        </a>
        <a className="drp-link drp-how-link" href={hrefOf('spikecount')}>
          Open the blood check
        </a>
      </div>
    </div>
  )
}
