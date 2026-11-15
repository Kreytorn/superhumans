// The architecture page at the end of every DF check (r4, the owner's feedback: "add architecture diagram").
// Each check's figure lives in public/<module>/ with a small architecture.json beside it:
//   { "src": "<file in that folder>", "title": "...", "caption": "...", "alt": "..." }
// so a new or rebuilt figure needs no code change. A check whose json is missing shows no section.
// On a phone held upright a wide figure is turned a quarter turn (arch.css, [data-turn]), so it runs along the
// phone's long side at about twice the size; a small line under it says to turn the phone. Once loaded, the figure's
// own width-to-height ratio is set as --ar; figures close to square (IonScan) are never turned.
import { useEffect, useState, type CSSProperties } from 'react'
import './arch.css'

const BASE = import.meta.env.BASE_URL
/** Figures wider than this (width / height) are turned on an upright phone. */
const TURN_FROM = 1.3

interface ArchInfo {
  src: string
  title: string
  caption?: string
  alt: string
}

function TurnIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="3" width="10" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 15a8 8 0 0 0 6 6.5M3 15l-.4 3.1M3 15l2.9 1.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ArchSection({ id, kicker = 'The model' }: { id: string; kicker?: string }) {
  const [info, setInfo] = useState<ArchInfo | null>(null)
  const [ar, setAr] = useState(0)
  useEffect(() => {
    let off = false
    fetch(`${BASE}${id}/architecture.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: ArchInfo | null) => !off && j && typeof j.src === 'string' && setInfo(j))
      .catch(() => undefined)
    return () => {
      off = true
    }
  }, [id])
  if (!info) return null
  const turn = ar >= TURN_FROM
  return (
    <section
      className="df-arch"
      aria-labelledby={`df-arch-${id}`}
      data-arch={id}
      data-turn={turn ? '1' : undefined}
      style={ar ? ({ '--ar': ar.toFixed(4) } as CSSProperties) : undefined}
    >
      <header className="df-arch-head">
        <p className="df-arch-kicker">{kicker}</p>
        <h2 id={`df-arch-${id}`} className="df-arch-h">
          {info.title}
        </h2>
        {info.caption && <p className="df-arch-cap">{info.caption}</p>}
      </header>
      <figure className="df-arch-fig">
        <div className="df-arch-card">
          {/* a tap opens the figure full size (pinch-zoom on a phone); no lazy loading, so the page does not grow while it is read */}
          <a className="df-arch-open" href={`${BASE}${id}/${info.src}`} target="_blank" rel="noopener" aria-label={`Open the ${info.title} diagram full size`}>
            <img
              src={`${BASE}${id}/${info.src}`}
              alt={info.alt}
              decoding="async"
              onLoad={(e) => {
                const im = e.currentTarget
                if (im.naturalWidth > 0 && im.naturalHeight > 0) setAr(im.naturalWidth / im.naturalHeight)
              }}
            />
          </a>
        </div>
        {turn && (
          <figcaption className="df-arch-turn">
            <TurnIcon />
            Turn your phone to read the diagram
          </figcaption>
        )}
      </figure>
    </section>
  )
}
