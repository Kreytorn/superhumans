// The one line every check shows under its result (r4, the owner's ruling): the AI gives a first reading, a human
// decides. When the decision's "who acts" is someone other than the astronaut, it names them, from the engine's own
// whoActs value; when the astronaut acts, it says so; a check with no decision (Garn Meter) is marked experimental.
// Same words and same look on all six checks. It never changes a number or a decision; it only reads whoActs.
import type { CSSProperties } from 'react'
import './review.css'

export type Review = { kind: 'human'; who: string } | { kind: 'self' } | { kind: 'experimental' }

const REPORTING = /^self,\s*reporting to\s+/i

/** Reads an engine's whoActs. "self" (and "nobody", where no rule fires) leave the call to the astronaut;
 *  anyone else is named. A parenthesis (an expansion such as "(Space Radiation Analysis Group)") is left out. */
export function reviewOf(whoActs: string | null | undefined): Review {
  const w = (whoActs ?? '').trim()
  const lower = w.toLowerCase()
  if (!w || lower === 'self' || lower.startsWith('astronaut') || lower.startsWith('nobody') || lower.startsWith('no one')) return { kind: 'self' }
  // BubbleGrade's amber tier: the astronaut acts and reports, so the people they report to review it
  const named = REPORTING.test(w) ? w.replace(REPORTING, '').replace(/^the\s+/i, '') : w.startsWith('self,') ? w.slice(5).trim() : w
  return { kind: 'human', who: named.split(' (')[0].trim() }
}

const WORDS: Record<Review['kind'], [string, string]> = {
  human: ['Human review needed:', ''],
  self: ['AI first reading.', 'You decide.'],
  experimental: ['AI first reading, experimental.', 'A human decides.'],
}

/** A small, quiet badge in the check's colour (--mc on DF pages; `color` overrides it). */
export default function ReviewLine({ review, color, className }: { review: Review; color?: string; className?: string }) {
  const [lead, rest] = WORDS[review.kind]
  const tail = review.kind === 'human' ? review.who : rest
  return (
    <p className={`ai-review${className ? ` ${className}` : ''}`} data-kind={review.kind} style={color ? ({ '--rv-c': color } as CSSProperties) : undefined}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="5" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.8 14c.5-2.9 2.6-4.5 5.2-4.5s4.7 1.6 5.2 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span>
        <b>{lead}</b> <span className="ai-review-t">{tail}</span>
      </span>
    </p>
  )
}
