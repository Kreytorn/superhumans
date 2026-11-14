// ACT band (PLAYBOOK §1.6, Direction A bottom band): full tier ladder, the active tier filled,
// greyed tiers tagged, action headline, steps, trigger + "our product rule" badge, sources, fixed line.
import './act.css'

export type StatusColor = 'green' | 'yellow' | 'amber' | 'orange' | 'red' | 'reddeep'

export interface Tier {
  id: string
  name: string
  color: StatusColor
  bars: number
  who: string
  action: string
  steps: string[]
  sources: string[]
  greyed?: 'next step' | 'text only' | 'never triggered'
}

interface Props {
  tiers: Tier[]
  activeId: string
  trigger: string
  ourRule?: boolean
  fixedLine?: string
  note?: string
}

function Bars({ n, color }: { n: number; color: string }) {
  return (
    <span className="act-bars" aria-hidden>
      {[1, 2, 3, 4, 5].map((k) => (
        <i key={k} style={{ height: `${0.35 + k * 0.14}rem`, background: k <= n ? color : 'currentColor', opacity: k <= n ? 1 : 0.25 }} />
      ))}
    </span>
  )
}

export function ActBand({ tiers, activeId, trigger, ourRule, fixedLine, note }: Props) {
  const active = tiers.find((t) => t.id === activeId) ?? tiers[0]
  return (
    <section className="act" aria-live="polite">
      <div className="act-left">
        <div className="act-head">
          <span className="act-title">What to do next</span>
          <span className="act-who">{active.who}</span>
          <span className="act-trigger">
            Trigger <b>{trigger}</b>
          </span>
          {ourRule && <span className="badge">our product rule</span>}
        </div>
        <ol className="act-ladder">
          {tiers.map((t) => {
            const on = t.id === active.id
            return (
              <li key={t.id} className={`act-tier ${on ? 'on' : ''} ${t.greyed ? 'greyed' : ''}`} style={on ? { background: `var(--s-${t.color})` } : undefined}>
                <span className="act-tier-name">{t.name}</span>
                <span className="act-tier-foot">
                  <span>{t.greyed ?? (on ? '' : '')}</span>
                  <Bars n={t.bars} color={on ? 'var(--on-status)' : `var(--s-${t.color})`} />
                </span>
              </li>
            )
          })}
        </ol>
        {fixedLine && <p className="act-fixed">{fixedLine}</p>}
      </div>
      <div className="act-right">
        <h3 className="act-action">{active.action}</h3>
        <ol className="act-steps">
          {active.steps.slice(0, 3).map((s, i) => (
            <li key={i}>
              <span className="act-n mono">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="act-sources">
          {active.sources.map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
          {note && <span className="act-note">{note}</span>}
        </div>
      </div>
    </section>
  )
}
