// Garn Meter, free take W2 "The Garn Room": a museum wall brought to life. The working stage is the specimen in the
// middle of a title sequence made only of the real recording: the 14 recorded brainwaves light the room, the scenes
// hang on the wall as 27 close-ups, and the honest result is drawn from the engine's own numbers.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@fontsource/instrument-serif'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/schibsted-grotesk'
import '@fontsource-variable/spline-sans-mono'
import * as garn from '../../engine/garnmeter'
import type { Card, GarnAct, GarnResult } from '../../engine/garnmeter'
import GarnMoment, { type GarnMomentHandle, type MomentState } from '../../moments/garnmeter'
import { GarnScalp } from '../../moments/garnmeter/scalp'
import { Aurora, SceneTile, type Sig } from './paint'
import './g2.css'

const SENTENCE = "Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn't work yet."
const SESSION = 'user19-s3'
const CUE: Record<string, string> = { Complexity: 'scene complexity', Speed: 'speed', Stereo: 'stereo depth' }
const ZONE = ['ok', 'watch', 'alert'] as const
const zoneOf = (ids: number) => (ids >= 4 ? 2 : ids >= 2 ? 1 : 0)
const fmtG = (g: number) => (g >= 0.995 ? '1.0' : g.toFixed(2))

/** A stable shuffle (count is data; which dot glows is not). */
function litSet(n: number, k: number) {
  const idx = Array.from({ length: n }, (_, i) => i)
  let s = 7
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return new Set(idx.slice(0, k))
}

function useInView<T extends Element>(ref: React.RefObject<T | null>) {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver === 'undefined') return setSeen(true)
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeen(true), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, seen])
  return seen
}

export default function GarnW2({ params }: { view: string; params: URLSearchParams }) {
  const pinned = params.get('state') === 'result' ? 'result' : params.get('state') === 'idle' ? 'idle' : undefined
  const stageRef = useRef<GarnMomentHandle>(null)
  const [stageState, setStageState] = useState<MomentState>('idle')
  const [stageReady, setStageReady] = useState(false)
  const [live, setLive] = useState<{ r: GarnResult; a: GarnAct } | null>(null)
  const [story, setStory] = useState<GarnResult | null>(null)
  const [card, setCard] = useState<Card | null>(null)
  const [sig, setSig] = useState<Sig | null>(null)
  const [focus, setFocus] = useState(24)

  useEffect(() => {
    let off = false
    garn.getSignal().then((s) => !off && setSig({ eeg: s.eeg, nSamples: s.nSamples, sigma: s.sigma, trials: s.trials }))
    garn.replay(SESSION).then((r) => !off && setStory(r))
    garn.getCard().then((c) => !off && setCard(c))
    return () => {
      off = true
    }
  }, [])

  const onResult = useCallback((r: GarnResult, a: GarnAct) => {
    setLive({ r, a })
    const t = Number(document.querySelector('.g2 .gm-root')?.getAttribute('data-focus'))
    if (Number.isFinite(t) && t > 0) setFocus(t)
  }, [])

  const run = useCallback(() => {
    stageRef.current?.run()
  }, [])

  const showScene = useCallback(async (trial: number) => {
    setFocus(trial)
    document.querySelector('.g2-hero')?.scrollIntoView({ behavior: 'smooth' })
    if (stageState !== 'result') await stageRef.current?.run()
    stageRef.current?.focusOn(trial)
  }, [stageState])

  const a = live?.a ?? null
  const hasResult = stageState === 'result' && a !== null
  const ready = stageReady && !!story && !!card && !!sig
  const source = live?.r.source === 'live' ? 'LIVE' : live ? 'REPLAY' : null
  const focusTrial = story?.trials.find((t) => t.index === focus)

  return (
    <div className="g2" data-ready={ready ? '1' : '0'} data-state={stageState === 'running' ? 'running' : hasResult ? 'result' : 'idle'}>
      {/* ───────── first screen ───────── */}
      <section className="g2-hero">
        <Aurora sig={sig} trial={focusTrial ?? null} zone={a ? a.tier : -1} />
        <header className="g2-top">
          <span className="g2-brand">SuperHumans</span>
          <span className="g2-crumb">Check 06 / 06 · head &amp; inner ear</span>
          <a className="g2-toplink" href="#g2-story" onClick={(e) => (e.preventDefault(), document.getElementById('g2-story')?.scrollIntoView({ behavior: 'smooth' }))}>
            The story ↓
          </a>
        </header>

        <div className="g2-grid">
          <div className="g2-copy">
            <p className="g2-kicker">
              <span className="g2-dot" /> Space motion sickness
            </p>
            <h1 className="g2-title">
              <em>Garn</em>
              <span>Meter</span>
            </h1>
            <p className="g2-sentence">{SENTENCE}</p>

            <div className="g2-actions">
              <button type="button" className="g2-play" data-qa="primary" onClick={run} disabled={stageState === 'running'}>
                <span className="g2-play-ico" aria-hidden="true">
                  {stageState === 'running' ? <i className="g2-spin" /> : <svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></svg>}
                </span>
                {stageState === 'running' ? 'Reading the brainwaves' : hasResult ? 'Play again' : 'Play the session'}
              </button>
              <div className="g2-tags">
                {source && <span className={`g2-tag ${source === 'LIVE' ? 'is-live' : ''}`}>{source}</span>}
                <span className="g2-tag">recorded session</span>
              </div>
            </div>

            <div className={`g2-act z-${a ? ZONE[a.tier] ?? 'ok' : 'none'}`} aria-live="polite">
              {a ? (
                <>
                  <p className="g2-act-k">What to do next · {a.tierName}</p>
                  <p className="g2-act-h">{a.headline}</p>
                  <p className="g2-act-who">
                    <i className="g2-shape" /> {a.whoActs}
                  </p>
                  {a.tier === 2 && <p className="g2-act-note">{garn.STRINGS.neverDoses}</p>}
                </>
              ) : (
                <>
                  <p className="g2-act-k">What to do next</p>
                  <p className="g2-act-h is-quiet">Press play, or tap how you feel on the 1–7 rail.</p>
                </>
              )}
            </div>
          </div>

          <div className="g2-specimen" data-qa="hero">
            <span className="g2-corner tl" />
            <span className="g2-corner tr" />
            <span className="g2-corner bl" />
            <span className="g2-corner br" />
            <p className="g2-plate">
              <b>Specimen</b> 14 electrodes<span> · 128 samples a second</span>
            </p>
            <GarnMoment
              ref={stageRef}
              className="g2-stage"
              state={pinned}
              onResult={onResult}
              onState={setStageState}
              onReady={() => setStageReady(true)}
            />
          </div>
        </div>
      </section>

      {/* ───────── the story ───────── */}
      <Story story={story} card={card} sig={sig} onScene={showScene} />
    </div>
  )
}

/* ─────────────────────────── story ─────────────────────────── */

function Story({ story, card, sig, onScene }: { story: GarnResult | null; card: Card | null; sig: Sig | null; onScene: (t: number) => void }) {
  return (
    <div className="g2-story" id="g2-story">
      <Incidence />
      <Ruler />
      <Wall story={story} sig={sig} onScene={onScene} />
      <Honest story={story} card={card} />
      <Zones story={story} />
      <Credits card={card} />
    </div>
  )
}

function Incidence() {
  const ref = useRef<HTMLElement>(null)
  const seen = useInView(ref)
  const lit = useMemo(() => litSet(588, 419), [])
  const cols = 28
  return (
    <section ref={ref} className={`g2-sec g2-inc ${seen ? 'is-in' : ''}`}>
      <div className="g2-sec-copy">
        <p className="g2-num">01 · The problem</p>
        <h2 className="g2-big">
          7 <em>in</em> 10
        </h2>
        <p className="g2-lede">{garn.STRINGS.context}</p>
        <p className="g2-fine">One dot = one person-mission. Which dots glow is a shuffle; the count is the data.</p>
      </div>
      <svg className="g2-dots" viewBox={`0 0 ${cols * 20} ${21 * 20}`} role="img" aria-label="588 dots, 419 lit: person-missions with space motion sickness">
        {Array.from({ length: 588 }, (_, i) => (
          <circle
            key={i}
            cx={(i % cols) * 20 + 10}
            cy={Math.floor(i / cols) * 20 + 10}
            r={lit.has(i) ? 5.2 : 3}
            className={lit.has(i) ? 'on' : 'off'}
            style={{ transitionDelay: `${((i % cols) + Math.floor(i / cols)) * 18}ms` }}
          />
        ))}
      </svg>
    </section>
  )
}

function Ruler() {
  const ref = useRef<HTMLElement>(null)
  const seen = useInView(ref)
  const x = (g: number) => 40 + g * 1120
  return (
    <section ref={ref} className={`g2-sec g2-ruler ${seen ? 'is-in' : ''}`}>
      <div className="g2-sec-copy wide">
        <p className="g2-num">02 · A unit for it</p>
        <h2 className="g2-mid">
          One <em>Garn</em> is totally sick.
        </h2>
        <p className="g2-lede">Named after Senator Jake Garn. Astronaut folklore, not an official or clinical NASA unit.</p>
      </div>
      <svg className="g2-scale" viewBox="0 0 1200 230" role="img" aria-label="The Garn scale from 0 to 1, with the 7 check-in steps">
        <defs>
          <linearGradient id="g2-grad" x1="0" x2="1">
            <stop offset="0" stopColor="#2ee6a6" />
            <stop offset="0.3" stopColor="#ffb224" />
            <stop offset="0.55" stopColor="#ff4d5e" />
            <stop offset="1" stopColor="#ff2f6d" />
          </linearGradient>
        </defs>
        <rect className="g2-scale-bar" x={x(0)} y={120} width={1120} height={10} rx={5} fill="url(#g2-grad)" />
        {[1, 2, 3, 4, 5, 6, 7].map((s) => (
          <g key={s} className="g2-scale-step" style={{ transitionDelay: `${s * 90}ms` }}>
            <line x1={x((s - 1) / 6)} x2={x((s - 1) / 6)} y1={104} y2={146} />
            <text x={x((s - 1) / 6)} y={186} className="g2-scale-n">
              {s}
            </text>
            <text x={x((s - 1) / 6)} y={214} className="g2-scale-g">
              {s === 1 ? '0' : s === 7 ? '1 Garn' : ((s - 1) / 6).toFixed(2)}
            </text>
          </g>
        ))}
        <g className="g2-scale-pin">
          <line x1={x(0.1)} x2={x(0.1)} y1={30} y2={118} />
          <circle cx={x(0.1)} cy={125} r={9} />
          <text x={x(0.1) + 14} y={44}>
            a tenth of a Garn
          </text>
        </g>
        <text x={x(0)} y={186} className="g2-scale-cap" dx={-40} textAnchor="start" />
      </svg>
      <div className="g2-ruler-foot">
        <blockquote>“{garn.STRINGS.greenCaption.replace("NASA's Robert Stevenson: ", '')}”</blockquote>
        <p className="g2-cite">NASA’s Robert Stevenson, oral history</p>
        <p className="g2-fine">{garn.STRINGS.garnDefinition} The numbers under the bar are the 1–7 check-in.</p>
      </div>
    </section>
  )
}

function Wall({ story, sig, onScene }: { story: GarnResult | null; sig: Sig | null; onScene: (t: number) => void }) {
  const ref = useRef<HTMLElement>(null)
  const seen = useInView(ref)
  const groups = useMemo(() => {
    if (!story) return []
    const out: { cue: string; trials: GarnResult['trials'] }[] = []
    for (const t of story.trials) {
      const last = out[out.length - 1]
      if (last && last.cue === t.cue) last.trials.push(t)
      else out.push({ cue: t.cue, trials: [t] })
    }
    return out
  }, [story])
  return (
    <section ref={ref} className={`g2-sec g2-wall ${seen ? 'is-in' : ''}`}>
      <div className="g2-sec-copy wide">
        <p className="g2-num">03 · The experiment</p>
        <h2 className="g2-mid">
          27 scenes. <em>Each one</em> rated by the person.
        </h2>
        <p className="g2-lede">{garn.STRINGS.groundAnalog}</p>
      </div>
      <div className="g2-legend">
        <span>
          <b className="k-said" /> what the person said (1–7)
        </span>
        <span>
          <b className="k-model" /> what the brainwave model read
        </span>
        <span className="g2-legend-tap">tap a scene to put it on the stage</span>
      </div>
      <div className="g2-wall-rows">
        {groups.map((g) => (
          <div key={g.cue} className="g2-wall-row">
            <p className="g2-wall-cue">{CUE[g.cue] ?? g.cue}</p>
            <div className="g2-wall-tiles" style={{ gridTemplateColumns: `repeat(${g.trials.length}, minmax(0, 1fr))` }}>
              {g.trials.map((t) => (
                <SceneTile key={t.index} t={t} sig={sig} zone={ZONE[zoneOf(t.ids)]} onClick={() => onScene(t.index)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="g2-fine">{garn.STRINGS.playback} Model values {garn.STRINGS.precomputedLabel}.</p>
    </section>
  )
}

function Honest({ story, card }: { story: GarnResult | null; card: Card | null }) {
  const ref = useRef<HTMLElement>(null)
  const seen = useInView(ref)
  const roc = card?.pooled_roc_ids_ge2
  const curves: { key: string; name: string; cls: string }[] = [
    { key: 'scene_settings_only', name: 'Scene settings alone', cls: 'c-scene' },
    { key: 'eegnet', name: 'EEGNet', cls: 'c-eegnet' },
    { key: 'corrfuse_eeg', name: 'CorrFuse-EEG (ours)', cls: 'c-ours' },
    { key: 'bandpower_floor', name: 'Band-power floor', cls: 'c-floor' },
  ]
  const W = 420
  const path = (fpr: number[], tpr: number[]) => fpr.map((f, i) => `${i ? 'L' : 'M'}${(f * W).toFixed(1)},${((1 - tpr[i]) * W).toFixed(1)}`).join('')
  const wolf = useMemo(() => {
    if (!story) return null
    const n = story.windows.length
    const yr = story.windows.filter((w) => w.eegZone >= 1).length
    const red = story.windows.filter((w) => w.eegZone >= 2).length
    let worst = story.trials[0]
    for (const t of story.trials) if ((t.modelGarnMean ?? -1) > (worst.modelGarnMean ?? -1)) worst = t
    const sickest = story.trials.reduce((m, t) => (t.ids > m.ids ? t : m), story.trials[0])
    return { n, yr: Math.round((yr / n) * 100), red: Math.round((red / n) * 100), worst, sickest }
  }, [story])
  return (
    <section ref={ref} className={`g2-sec g2-honest ${seen ? 'is-in' : ''}`}>
      <div className="g2-sec-copy">
        <p className="g2-num">04 · The honest result</p>
        <h2 className="g2-mid">
          On new people, the brainwaves are <em>close to a coin flip.</em>
        </h2>
        <div className="g2-scores">
          <div>
            <b>{card ? card.networks.corrfuse_eeg.M1.toFixed(2) : '–'}</b>
            <span>our brainwave model</span>
          </div>
          <div className="is-scene">
            <b>{card ? card.scene_settings_only.M1.toFixed(2) : '–'}</b>
            <span>what the person was looking at</span>
          </div>
        </div>
        <p className="g2-lede">0.5 is a coin flip. The scene tells more than the brain, so the app asks the crew member instead.</p>
      </div>
      <figure className="g2-roc">
        <svg viewBox={`-50 -20 ${W + 70} ${W + 70}`} role="img" aria-label="Four ROC curves on 32 people the models never saw">
          <rect x={0} y={0} width={W} height={W} className="g2-roc-bg" />
          {[0.25, 0.5, 0.75].map((v) => (
            <g key={v} className="g2-roc-grid">
              <line x1={v * W} x2={v * W} y1={0} y2={W} />
              <line y1={v * W} y2={v * W} x1={0} x2={W} />
            </g>
          ))}
          <line x1={0} y1={W} x2={W} y2={0} className="g2-roc-coin" />
          <text x={W * 0.62} y={W * 0.47} className="g2-roc-coin-t" transform={`rotate(-45 ${W * 0.62} ${W * 0.47})`}>
            coin flip
          </text>
          {roc &&
            curves.map((c) => roc[c.key] && <path key={c.key} d={path(roc[c.key].fpr, roc[c.key].tpr)} className={`g2-roc-c ${c.cls}`} />)}
          <text x={W / 2} y={W + 36} className="g2-roc-ax" data-qa="tick">
            false alarms →
          </text>
          <text x={-30} y={W / 2} className="g2-roc-ax" transform={`rotate(-90 -30 ${W / 2})`} data-qa="tick">
            sick people caught →
          </text>
        </svg>
        <figcaption>
          {roc &&
            curves.map((c) => (
              <span key={c.key} className={c.cls}>
                <i /> {c.name} <b>{roc[c.key]?.auroc.toFixed(2)}</b>
              </span>
            ))}
        </figcaption>
      </figure>
      {wolf && (
        <div className="g2-wolf">
          <div>
            <b>{wolf.yr}%</b>
            <p>
              of {wolf.n} windows would ring yellow or red if the brainwaves drove the alarm ({wolf.red}% red). It would cry wolf.
            </p>
          </div>
          <div>
            <b>{wolf.worst.modelGarnMean !== null ? fmtG(wolf.worst.modelGarnMean) : '–'}</b>
            <p>
              Garn: the model’s highest reading, on scene {wolf.worst.index}, where the person said {wolf.worst.ids} of 7. A false alarm.
            </p>
          </div>
          <div>
            <b>{wolf.sickest.modelGarnMean !== null ? fmtG(wolf.sickest.modelGarnMean) : '–'}</b>
            <p>
              Garn: what it read on scene {wolf.sickest.index}, where the person said {wolf.sickest.ids} of 7, the sickest moment.
            </p>
          </div>
          {story && (
            <div className="g2-scalp-card">
              <GarnScalp result={story} trial={wolf.sickest.index} size={200} />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Zones({ story }: { story: GarnResult | null }) {
  const ref = useRef<HTMLElement>(null)
  const seen = useInView(ref)
  const rows = useMemo(() => (story ? [1, 3, 7].map((ids) => ({ ids, a: garn.act(story, { checkinIds: ids }) })) : []), [story])
  return (
    <section ref={ref} className={`g2-sec g2-zones ${seen ? 'is-in' : ''}`}>
      <div className="g2-sec-copy wide">
        <p className="g2-num">05 · So the app asks you</p>
        <h2 className="g2-mid">
          Your own <span className="g2-nw">check-in</span> <em>moves the gauge.</em>
        </h2>
        <p className="g2-lede">The brainwave line stays on screen as an experiment; it never sets the colour. Trigger levels are our product rule.</p>
      </div>
      <div className="g2-zone-cards">
        {rows.map(({ ids, a }) => (
          <article key={ids} className={`g2-zone z-${ZONE[a.tier]}`}>
            <p className="g2-zone-k">
              Check-in {ids} of 7 · {ids === 1 ? '0' : fmtG((ids - 1) / 6)} Garn
            </p>
            <p className="g2-zone-t">{a.tierName}</p>
            <p className="g2-zone-h">{a.headline}</p>
            <p className="g2-zone-w">{a.whoActs}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Credits({ card }: { card: Card | null }) {
  return (
    <section className="g2-sec g2-credits">
      <p className="g2-num">06 · The work behind it</p>
      <div className="g2-cred-grid">
        <div>
          <h3>The model</h3>
          <p>{card?.shipped.badge ?? 'CorrFuse-EEG · state-space · 137,852 parameters'}</p>
          <p>Runs in this browser with onnxruntime-web; no server.</p>
        </div>
        <div>
          <h3>The test</h3>
          <p>{card?.result_card_sentence}</p>
        </div>
        <div>
          <h3>The person on the stage</h3>
          <p>{garn.STRINGS.personLabel}, never in training.</p>
          <p>{garn.STRINGS.playback}</p>
        </div>
        <div>
          <h3>Sources</h3>
          <p>EEG: Ozkan, Uyan &amp; Celikcan 2023; Uyan &amp; Celikcan 2024 (Displays). NASA OCHMO-MTB-004, MEDPRAT ICL97. Fonts: Instrument Serif, Schibsted Grotesk, Spline Sans Mono (SIL OFL).</p>
        </div>
      </div>
    </section>
  )
}
