// DF's credits and AI-use page (r4): #/proto/DF/credits, in DF's look (the sky of the home behind dark cards).
// NASA first, then every dataset by check, the models we started from, code, type and tools, and how AI was used.
// Every entry comes from src/data/credits.json (written by scripts/gen-credits.mjs from the manifests and the
// installed packages; the same data as THIRD_PARTY.md). The few lines typed here (the ISS photo, the two
// self-hosted fonts, the QR tool) are marked where they are used. Styles: credits.css (loaded with the home).
import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import credits from '../../data/credits.json'
import { MODS, href } from './data'
import issPhoto from './earth_sunrise_iss074e0409626.jpg'
import { BackIcon, REPO_URL, SpaceBackdrop, useEscapeHome, useReducedMotion } from './qr'

interface Dataset {
  id: string
  nasa: boolean
  module: string
  name: string
  cite: string
  urls: string[]
  licence: string
  use: string
}
interface Pretrained {
  name: string
  by: string
  licence: string
  usedBy: string[]
  how: string
}
interface Ref {
  text: string
  url: string
  nasa: boolean
  resourcesTab?: boolean
}
interface Lib {
  name: string
  version: string
  licence: string
  kind: string
  importedInSrc: boolean
}
interface Font {
  family: string
  licence: string
  importedInSrc: boolean
}
interface Tool {
  name: string
  use: string
  licence: string
}

const DATASETS = credits.datasets as Dataset[]
const PRETRAINED = credits.pretrained as Pretrained[]
const REFS = credits.references as Ref[]
const LIBS = credits.libraries as Lib[]
const FONTS = credits.fonts as Font[]
const TOOLS = credits.tools as Tool[]
const NASA_DATA = DATASETS.find((d) => d.nasa)
const MOD = new Map(MODS.map((m) => [m.id, m]))
const THIRD_PARTY_URL = `${REPO_URL}/blob/main/THIRD_PARTY.md`
/** The section buttons under the title (buttons, not links: the address bar's hash belongs to the router). */
const JUMPS: [string, string][] = [
  ['nasa', 'NASA'],
  ['data', 'Data'],
  ['models', 'Models'],
  ['code', 'Code and type'],
  ['ai', 'AI use'],
]

/** Short names for the dataset cards (the full title is in the citation line under each). */
const LABEL: Record<string, string> = {
  'blogg-doppler': 'An Echo from the past: Doppler recordings of gas bubbles',
  'pierleoni-doppler': 'Pierleoni, Mercuri et al. Doppler recordings',
  redtell: 'RedTell red blood cell shapes',
  'thrombus-plus': 'ThrombUS+ leg-vein ultrasound',
  'gillman-2010': 'Neck-vein squeeze clip',
  segthy: 'SegThy neck ultrasound',
  'oasis-1': 'OASIS-1 brain MRI',
  'openneuro-ds005595': 'OpenNeuro ds005595: HCP-Aging brain masks',
  'openneuro-ds000239': 'OpenNeuro ds000239: repeat brain scans',
  'hacettepe-vr-eeg': 'Hacettepe University VR-sickness EEG',
}

const STAR = 'M0 -8C.9 -2.2 2.2 -.9 8 0C2.2 .9 .9 2.2 0 8C-.9 2.2 -2.2 .9 -8 0C-2.2 -.9 -.9 -2.2 0 -8Z'
const mc = (color: string) => ({ '--mc': color }) as CSSProperties

function Star() {
  return (
    <svg viewBox="-10 -10 20 20" aria-hidden="true">
      <path d={STAR} fill="currentColor" />
      <circle r="1.6" fill="#fff" />
    </svg>
  )
}
function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5Z" fill="currentColor" />
      <path d="M19 15.5c.25 1.9 1.1 2.75 3 3-1.9.25-2.75 1.1-3 3-.25-1.9-1.1-2.75-3-3 1.9-.25 2.75-1.1 3-3Z" fill="currentColor" />
    </svg>
  )
}
function Out() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 14h2v2h-2zM18 14h2v2h-2zM16 16h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor" />
    </svg>
  )
}
function Ext({ url, children }: { url: string; children: ReactNode }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {children}
      <Out />
    </a>
  )
}
/** A readable name for a source link. */
function linkName(url: string) {
  try {
    const u = new URL(url)
    if (u.hostname === 'doi.org') return `DOI ${u.pathname.slice(1)}`
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
const isUrl = (s: string) => /^https?:\/\//.test(s)
/** A long model id ("timm/mobilenetv4_conv_medium.e500_r256_in1k") may wrap after a dot or a slash, not mid-word. */
const breakable = (s: string) =>
  s.split(/(?<=[./])/).map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
    </Fragment>
  ))
/** A licence line that names two sources ("A: ... . B: ...") reads better as two chips. */
const licenceParts = (s: string) => s.split(/\.\s+(?=[A-Z])/).filter(Boolean)

function Section({ id, n, title, sub, children }: { id: string; n: string; title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <section className="df-cr-sec" id={`credits-${id}`} aria-labelledby={`credits-${id}-h`}>
      <header className="df-cr-sec-head">
        <p className="df-cr-num">{n}</p>
        <h2 className="df-cr-h2" id={`credits-${id}-h`}>
          {title}
        </h2>
        {sub && <p className="df-cr-sub">{sub}</p>}
      </header>
      {children}
    </section>
  )
}

function UseChip({ id }: { id: string }) {
  const m = MOD.get(id)
  if (!m) return null
  return (
    <span className="df-cr-use" style={mc(m.color)}>
      <i />
      {m.name}
    </span>
  )
}

function DatasetCard({ d }: { d: Dataset }) {
  const links = d.urls.filter(isUrl)
  const plain = d.urls.filter((u) => !isUrl(u))
  return (
    <article className="df-cr-card">
      <h4>{LABEL[d.id] ?? d.name}</h4>
      <div className="df-cr-tags">
        <span className="df-cr-lic">{d.licence}</span>
      </div>
      <p>{d.use}</p>
      <p className="df-cr-cite">
        {d.cite}
        {plain.length > 0 && ` · ${plain.join(' · ')}`}
      </p>
      {links.length > 0 && (
        <div className="df-cr-links">
          {links.map((u) => (
            <Ext key={u} url={u}>
              {linkName(u)}
            </Ext>
          ))}
        </div>
      )}
    </article>
  )
}

function Nasa() {
  const hrp = REFS.filter((r) => r.nasa && r.resourcesTab)
  const partner = REFS.filter((r) => !r.nasa && r.resourcesTab)
  return (
    <Section
      id="nasa"
      n="01"
      title="NASA first"
      sub="The challenge’s Resources tab pointed us to NASA’s Human Research Program. NASA’s own open science data trained our radiation model."
    >
      <div className="df-cr-grid">
        <article className="df-cr-card is-nasa df-cr-span">
          <h3>NASA Human Research Program</h3>
          <div className="df-cr-tags">
            <span className="df-cr-lic is-plain">From the Resources tab</span>
          </div>
          <p>Its hazards and risks pages set what SuperHumans checks: five of the six checks answer a hazard or risk that NASA names there.</p>
          <ul className="df-cr-hrp df-cr-links">
            {hrp.map((r) => (
              <li key={r.url}>
                <Ext url={r.url}>{r.text.replace(/^NASA Human Research Program:\s*/, '')}</Ext>
              </li>
            ))}
          </ul>
        </article>
        {NASA_DATA && (
          <article className="df-cr-card is-nasa">
            <h3>NASA BPS Microscopy benchmark</h3>
            <div className="df-cr-tags">
              <UseChip id={NASA_DATA.module} />
              {licenceParts(NASA_DATA.licence).map((l) => (
                <span key={l} className="df-cr-lic">
                  {l}
                </span>
              ))}
            </div>
            <p>{NASA_DATA.use}</p>
            <p className="df-cr-cite">{NASA_DATA.cite}</p>
            <div className="df-cr-links">
              {NASA_DATA.urls.map((u) => (
                <Ext key={u} url={u}>
                  {u.includes('osdr.nasa.gov') ? 'NASA OSDR, OSD-366' : u.includes('opendata.aws') ? 'AWS Open Data registry' : linkName(u)}
                </Ext>
              ))}
            </div>
          </article>
        )}
        {/* typed here, from deck/CREDITS.md: the photo is not in a module manifest */}
        <article className="df-cr-card is-nasa">
          <img className="df-cr-photo" src={issPhoto} alt="Orbital sunrise over the Earth's limb, seen from the International Space Station" loading="lazy" decoding="async" />
          <h3>NASA ISS photo</h3>
          <div className="df-cr-tags">
            <span className="df-cr-lic">NASA imagery, public domain</span>
          </div>
          <p>“Star trails and an orbital sunrise above the southern Indian Ocean”, from the International Space Station. The planet under the body on the home page.</p>
          <p className="df-cr-cite">NASA / Chris Williams, ISS image iss074e0409626 (23 March 2026)</p>
          <div className="df-cr-links">
            <Ext url="https://images.nasa.gov/details/iss074e0409626">images.nasa.gov</Ext>
          </div>
        </article>
        {partner.length > 0 && (
          <article className="df-cr-card df-cr-span">
            <h3>Canadian Space Agency</h3>
            <div className="df-cr-tags">
              <span className="df-cr-lic is-plain">From the Resources tab</span>
            </div>
            <p>Two partner-agency pages from the same Resources tab.</p>
            <ul className="df-cr-hrp df-cr-links">
              {partner.map((r) => (
                <li key={r.url}>
                  <Ext url={r.url}>{r.text.replace(/^Canadian Space Agency:\s*/, '')}</Ext>
                </li>
              ))}
            </ul>
          </article>
        )}
      </div>
    </Section>
  )
}

/** A rough height of one check's block of dataset cards: its heading, then each card, longer texts weighing more. */
const blockWeight = (list: Dataset[]) => 0.5 + list.reduce((n, d) => n + 1 + (d.use.length + d.cite.length) / 260, 0)

function Data() {
  const groups = MODS.map((m, i) => ({ m, i, list: DATASETS.filter((d) => !d.nasa && d.module === m.id) })).filter((g) => g.list.length > 0)
  const count = groups.reduce((n, g) => n + g.list.length, 0)
  // Two columns on a wide screen, each block going to the shorter one, so neither column ends in an empty stretch.
  // On a narrow screen the columns dissolve (display: contents) and `order` puts the blocks back in pitch order.
  const cols: (typeof groups)[] = [[], []]
  const high = [0, 0]
  for (const g of groups) {
    const k = high[0] <= high[1] ? 0 : 1
    cols[k].push(g)
    high[k] += blockWeight(g.list)
  }
  return (
    <Section
      id="data"
      n="02"
      title="The data behind each check"
      sub={`${count} more openly published datasets from research teams around the world. No astronaut data and no personal data: people appear only under neutral ids.`}
    >
      <div className="df-cr-checks">
        {cols.map((col, k) => (
          <div key={k} className="df-cr-col">
            {col.map(({ m, i, list }) => (
              <div key={m.id} className="df-cr-check" style={{ ...mc(m.color), order: i }}>
                <h3 className="df-cr-check-head">
                  <Star />
                  {m.name}
                  <span>{m.hook}</span>
                </h3>
                {list.map((d) => (
                  <DatasetCard key={d.id} d={d} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Section>
  )
}

function Models() {
  const corr = TOOLS.find((t) => t.name === 'CorrFuse')
  return (
    <Section
      id="models"
      n="03"
      title="Models we started from"
      sub="Open pretrained networks we fine-tuned, or used to prepare data. None of their files ship; the six checks run our own trained models."
    >
      <div className="df-cr-rows">
        {PRETRAINED.map((p) => {
          const [head, ...rest] = p.name.split(', ')
          return (
            <article key={p.name} className="df-cr-row">
              <h3>
                {head}
                {rest.length > 0 && <small>{breakable(rest.join(', '))}</small>}
              </h3>
              <p>
                {p.by}. {p.how[0].toUpperCase() + p.how.slice(1)}.
              </p>
              <div className="df-cr-uses">
                <span className="df-cr-lic">{p.licence}</span>
                {p.usedBy.map((u) => (
                  <UseChip key={u} id={u} />
                ))}
              </div>
            </article>
          )
        })}
        {corr && (
          <article className="df-cr-row">
            <h3>
              CorrFuse
              <small>Team SuperHumans</small>
            </h3>
            <p>{corr.use[0].toUpperCase() + corr.use.slice(1)}.</p>
            <div className="df-cr-uses">
              <span className="df-cr-lic">{corr.licence}</span>
              <UseChip id="garnmeter" />
            </div>
          </article>
        )}
      </div>
    </Section>
  )
}

function Code() {
  const run = LIBS.filter((l) => l.importedInSrc && l.kind === 'runtime')
  const desk = LIBS.filter((l) => l.importedInSrc && l.kind === 'desktop')
  const fonts = FONTS.filter((f) => f.importedInSrc)
  const tools = TOOLS.filter((t) => t.name !== 'CorrFuse')
  return (
    <Section id="code" n="04" title="Code, type and tools" sub="All open source. Nothing on this site is loaded from another server.">
      <div className="df-cr-cols">
        <article className="df-cr-card">
          <h3>In your browser</h3>
          <ul className="df-cr-chips">
            {run.map((l) => (
              <li key={l.name} className="df-cr-chip">
                {l.name} <small>{l.version} · {l.licence}</small>
              </li>
            ))}
            <li className="df-cr-chip">
              coi-serviceworker <small>0.1.7 · MIT</small>
            </li>
            {desk.map((l) => (
              <li key={l.name} className="df-cr-chip">
                {l.name} <small>{l.version} · {l.licence} · desktop app</small>
              </li>
            ))}
          </ul>
        </article>
        <article className="df-cr-card">
          <h3>Type</h3>
          <ul className="df-cr-chips">
            {/* typed here: the two DF faces are self-hosted files in src/assets/fonts (Fontsource builds) */}
            <li className="df-cr-chip">
              Space Grotesk <small>OFL-1.1</small>
            </li>
            <li className="df-cr-chip">
              JetBrains Mono <small>OFL-1.1</small>
            </li>
            {fonts.map((f) => (
              <li key={f.family} className="df-cr-chip">
                {f.family} <small>{f.licence}</small>
              </li>
            ))}
          </ul>
          <p className="df-cr-note">SIL Open Font License 1.1, served with the site (Fontsource files).</p>
        </article>
        <article className="df-cr-card df-cr-wide">
          <h3>Training, figures and this page</h3>
          <ul className="df-cr-chips">
            {tools.map((t) => (
              <li key={t.name} className="df-cr-chip" title={t.use}>
                {t.name} <small>{t.licence}</small>
              </li>
            ))}
            {/* typed here: used once to draw public/qr/superhumans_qr.svg; none of its code ships */}
            <li className="df-cr-chip" title="drew the QR code once as a picture; none of its code ships">
              segno 1.6.6 <small>BSD-3-Clause</small>
            </li>
          </ul>
          <p className="df-cr-note">
            {credits.totals.libraries} npm packages in all, each with its version and licence, are listed in{' '}
            <a className="df-cr-a" href={THIRD_PARTY_URL} target="_blank" rel="noopener noreferrer">
              THIRD_PARTY.md
            </a>
            .
          </p>
        </article>
      </div>
    </Section>
  )
}

function AiUse() {
  return (
    <Section id="ai" n="05" title="How we used AI" sub="The rules call it Super Intelligence. Here is exactly what it did, and what it did not do.">
      <div className="df-cr-ai">
        <p className="df-cr-ai-who">
          <Sparkle />
          Our AI tool: Claude by Anthropic, through Claude Code.
        </p>
        <div className="df-cr-ai-cols">
          <div>
            <h3>What AI did</h3>
            <ul>
              <li>
                <b>Wrote the code:</b> this website, the desktop app, the engines that run the six models in your browser, and the scripts that trained, tested and exported the models.
              </li>
              <li>
                <b>Suggested idea options</b> and helped with research: NASA and partner sources, published space-medicine findings and open datasets.
              </li>
              <li>
                <b>Drew the six architecture diagrams</b> as LaTeX/TikZ code, and wrote the shaders that draw the glowing body and the aurora.
              </li>
              <li>
                <b>Helped word</b> the texts on this site and our project page.
              </li>
            </ul>
          </div>
          <div style={{ '--ac': '#2EE6A6' } as CSSProperties}>
            <h3>What people did</h3>
            <ul>
              <li>
                <b>Picked the idea</b> and the six checks from the options.
              </li>
              <li>
                Decided what to build, <b>ran the training,</b> read the results and directed every change.
              </li>
              <li>
                <b>Checked</b> every statement and number against our own result files.
              </li>
            </ul>
          </div>
          <div style={{ '--ac': '#FFB224' } as CSSProperties}>
            <h3>What AI did not do</h3>
            <ul>
              <li>
                <b>It made no health data.</b> The health data shown is real, openly published research data.
              </li>
              <li>
                <b>It did not produce the results.</b> Every number comes from running our trained models on data they had never seen.
              </li>
              <li>
                Pictures made with AI say so on screen, like the{' '}
                <span className="df-cr-mark">
                  <Sparkle />
                  AI-generated illustration
                </span>{' '}
                mark on the glowing body and “AI-generated diagram” on every architecture diagram.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Section>
  )
}

export default function Credits({ params }: { params: URLSearchParams }) {
  const reduce = useReducedMotion()
  const pinned = params.get('state') === 'result'
  const [ready, setReady] = useState(false)
  useEscapeHome()
  useEffect(() => setReady(true), [])

  return (
    <div className="df df-xs df-cr" data-view="credits" data-ready={ready ? '1' : undefined} data-state={pinned ? 'result' : 'idle'}>
      <SpaceBackdrop still={reduce || pinned} slow />
      <div className="df-xs-scroll">
        <div className="df-cr-wrap">
          <nav className="df-xs-bar" aria-label="Site">
            <a className="df-back" href={href('home')} data-qa="primary">
              <BackIcon />
              Back to the body
            </a>
            <a className="df-xs-link" href={href('qr')}>
              <QrIcon />
              QR code
            </a>
          </nav>
          <header className="df-cr-hero" data-qa="hero">
            <p className="df-cr-kicker">Credits and AI use</p>
            <h1 className="df-cr-h1">Built on open science.</h1>
            <p className="df-cr-lead">
              <b>Team SuperHumans</b> made this for the NASA Space Apps Challenge 2026 in Istanbul, for the challenge “Create Health Monitoring Software for Astronauts on Space Missions”. It runs on openly
              published research data, and every source keeps its own licence.
            </p>
            <ul className="df-cr-jump" aria-label="On this page">
              {JUMPS.map(([id, label]) => (
                <li key={id}>
                  <button type="button" onClick={() => document.getElementById(`credits-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </header>
          <Nasa />
          <Data />
          <Models />
          <Code />
          <AiUse />
          <footer className="df-cr-end">
            <p>
              Our code, text, figures and trained model weights are under the <b>MIT licence</b> (Team SuperHumans). Everything else keeps its own licence; the full list, file by file, is in{' '}
              <a className="df-cr-a" href={THIRD_PARTY_URL} target="_blank" rel="noopener noreferrer">
                THIRD_PARTY.md
              </a>{' '}
              in our{' '}
              <a className="df-cr-a" href={REPO_URL} target="_blank" rel="noopener noreferrer">
                code repository
              </a>
              .
            </p>
            <div className="df-cr-end-links">
              <a className="df-xs-link" href={href('qr')}>
                <QrIcon />
                QR code
              </a>
              <a className="df-back" href={href('home')}>
                <BackIcon />
                Back to the body
              </a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
