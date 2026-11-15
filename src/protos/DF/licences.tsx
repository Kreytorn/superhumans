// DF's "Data and licences" page (r4): #/proto/DF/licences, in DF's look (the sky of the home behind dark cards).
// One card per check: the data it learned from, who published it, the licence in plain words, and what we used it
// for (trained / tested / on screen), with one source link each. Then the models and code we built on, and three
// plain facts on top. Reached from the home's top-right links, the credits page and the end of every check.
// Every line here is copied from the verified sources, not written fresh: public/<module>/manifest.json,
// THIRD_PARTY.md ("Data" and "Model weights"), src/data/credits.json, work/Web/SUBMISSION.md section 8 and
// work/Web/CHEATSHEET_who_did_what.md. The "plain words" only restate what each licence allows.
// Styles: licences.css (this page only); the shared sky and bar are in credits.css (loaded with the home).
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import './licences.css'
import { MODS, href } from './data'
import { BackIcon, REPO_URL, SpaceBackdrop, useEscapeHome, useReducedMotion } from './qr'

type Use = 'trained' | 'tested' | 'shown'
interface Source {
  name: string
  by: string
  /** The licence exactly as the manifest or THIRD_PARTY.md names it. */
  licence: string
  /** What the licence lets anyone do, in plain words. */
  plain: string
  /** False when it is not an open licence (use terms, no licence stated, no-derivatives). */
  open: boolean
  uses: Use[]
  what: string
  /** An acknowledgement the dataset asks for, printed under the authors. */
  ack?: string
  link?: { url: string; label: string }
  /** Where to find it when there is no link we have checked. */
  where?: string
}
interface Extra extends Source {
  /** What this extra source is to the check, in two or three words. */
  role: string
}
interface CheckData {
  id: string
  nasa?: boolean
  main: Source
  more?: Extra[]
  note?: string
}

const ALL: Use[] = ['trained', 'tested', 'shown']
const CC_BY = 'Free to use, share and change, with credit.'
const CC0 = 'No rights reserved: free for any use.'

const CHECKS: CheckData[] = [
  {
    id: 'tracktrace',
    nasa: true,
    main: {
      name: 'NASA BPS Microscopy benchmark',
      by: 'NASA Biological and Physical Sciences, from NASA OSDR study OSD-366 (Penninckx et al. 2019)',
      licence: 'No restrictions on use',
      plain: 'Free to use, per the AWS Open Data registry. Its source study at NASA sets no licence of its own; we cite it by its DOI.',
      open: true,
      uses: ALL,
      what: '77,177 mouse skin-cell nuclei after iron ions, X-rays or no radiation, on the ground. The nuclei on screen come from 3 mice the model never saw.',
      link: { url: 'https://registry.opendata.aws/bps_microscopy/', label: 'AWS Open Data registry' },
    },
  },
  {
    id: 'bubblegrade',
    main: {
      name: 'An Echo from the past',
      by: 'Blogg et al. 2026, Diving and Hyperbaric Medicine: over 10,000 Doppler recordings of gas bubbles in divers',
      licence: 'GPL-3.0-or-later',
      plain: 'Free to use and share. Copies and changed versions stay under the same licence, so the six clips we play keep it too.',
      open: true,
      uses: ALL,
      what: '6,826 recordings from 310 divers. Six clips play on screen, changed only to one channel at 16 kHz, with neutral names.',
      link: { url: 'https://zenodo.org/records/16877955', label: 'Zenodo 16877955' },
    },
    more: [
      {
        role: 'Test only',
        name: 'Pierleoni, Mercuri et al. Doppler recordings',
        by: 'Pierleoni, Mercuri et al. 2019, Data in Brief',
        licence: 'CC BY-NC-ND 4.0',
        plain: 'Share with credit; no commercial use and no changed versions. Not an open licence.',
        open: false,
        uses: ['tested'],
        what: 'One outside test on 30 recordings. Not used for training; no audio or labels from it are in the project.',
        link: { url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6864345/', label: 'PMC6864345' },
      },
    ],
  },
  {
    id: 'spikecount',
    main: {
      name: 'RedTell',
      by: 'Sadafi et al. 2023, Frontiers in Physiology; Helmholtz Munich and University of Zurich',
      licence: 'CC BY 4.0',
      plain: CC_BY,
      open: true,
      uses: ALL,
      what: 'About 5,700 red blood cells in 152 microscope fields, each graded by experts. The 31 fields on screen were held out from training.',
      link: { url: 'https://zenodo.org/records/7801430', label: 'Zenodo 7801430' },
    },
  },
  {
    id: 'veinsqueeze',
    main: {
      name: 'ThrombUS+ Ultrasound Dataset #1',
      by: 'ThrombUS+, with its HEALTHINF 2026 paper (Zenodo 18894312)',
      licence: 'CC BY 4.0',
      plain: CC_BY,
      open: true,
      uses: ALL,
      what: '2,341 leg-vein squeeze clips from 594 patients in 5 European hospitals. Six anonymised clips play on screen, Clip A to F.',
      link: { url: 'https://zenodo.org/records/17659415', label: 'Zenodo 17659415' },
    },
    more: [
      {
        role: 'Neck clip',
        name: 'Neck-vein squeeze clip',
        by: 'Gillman, Blaivas, Lord, Al-Kadi & Kirkpatrick 2010, Scand J Trauma Resusc Emerg Med 18:39',
        licence: 'CC BY 2.0',
        plain: CC_BY,
        open: true,
        uses: ['shown'],
        what: 'One real neck-vein squeeze, cropped by us. Shown for context; the model never sees it.',
        where: 'Wikimedia Commons, additional file S3 of the paper',
      },
      {
        role: 'Neck sweep',
        name: 'SegThy',
        by: 'Kronke et al. 2022, PLOS ONE',
        licence: 'CC BY 4.0',
        plain: CC_BY,
        open: true,
        uses: ['shown'],
        what: 'One neck sweep of a healthy volunteer, with the expert’s outline. Shown for context; the model never sees it.',
        link: { url: 'https://huggingface.co/datasets/MedOtter/SegThy', label: 'Hugging Face mirror' },
      },
    ],
  },
  {
    id: 'braindrift',
    main: {
      name: 'OASIS-1 brain MRI',
      by: 'Marcus et al. 2007, Washington University; prepared as neurite-oasis (Hoopes et al. 2021)',
      licence: 'OASIS Data Use Terms',
      plain: 'Use terms, not an open licence: cite the source and never try to identify anyone. We show skull-stripped crops only, no faces.',
      open: false,
      uses: ALL,
      what: '332 brains trained the brain map and 40 tested it. The 3 brains on screen are from those 40, never seen in training.',
      link: { url: 'https://sites.wustl.edu/oasisbrains/', label: 'OASIS Brains' },
    },
    more: [
      {
        role: 'Second model',
        name: 'HCP-Aging perivascular-space masks',
        by: 'Chai et al., OpenNeuro ds005595',
        ack: 'Supported by the National Institute on Aging of the NIH under Award Number U01AG052564.',
        licence: 'CC0',
        plain: CC0,
        open: true,
        uses: ALL,
        what: '159 people trained the perivascular-space finder and 20 tested it. Slices and 3D meshes of 3 of those 20 are on screen.',
        link: { url: 'https://openneuro.org/datasets/ds005595/versions/1.0.0', label: 'OpenNeuro ds005595' },
      },
      {
        role: 'Repeat scans',
        name: 'Repeat brain scans',
        by: 'Maclaren et al. 2014, OpenNeuro ds000239',
        licence: 'CC0',
        plain: CC0,
        open: true,
        uses: ['tested'],
        what: '120 repeat scans of 3 healthy adults showed how much our reading wobbles when nothing changed. Numbers only; no image is shown.',
        link: { url: 'https://openneuro.org/datasets/ds000239', label: 'OpenNeuro ds000239' },
      },
    ],
    note: 'The “after flight” brain is our simulation, made from two published numbers: Roberts et al., AJNR 2019 and Wang et al., PNAS 2026.',
  },
  {
    id: 'garnmeter',
    main: {
      name: 'Hacettepe University VR-sickness EEG',
      by: 'Ozkan, Uyan & Celikcan 2023 and Uyan & Celikcan 2024, Displays',
      licence: 'No licence stated',
      plain: 'The authors state no licence. We cite them as they ask, and show one anonymised excerpt.',
      open: false,
      uses: ALL,
      what: 'Brainwaves (EEG, 14 channels) of 33 people. The 224-second excerpt on screen is from a person the model never saw.',
      link: { url: 'https://doi.org/10.1016/j.displa.2023.102415', label: 'DOI 10.1016/j.displa.2023.102415' },
    },
  },
]

/** The models and code each check stands on (THIRD_PARTY.md "Model weights" and tools; the cheat sheet, section 3). */
interface Built {
  name: string
  by: string
  licence: string
  how: string
  mods: string[]
}
const EVERY = MODS.map((m) => m.id)
const BUILT: Built[] = [
  { name: 'MobileNetV4', by: 'Qin et al., Google, 2024; ImageNet weights from timm', licence: 'Apache-2.0', how: 'Starting point for fine-tuning', mods: ['bubblegrade', 'spikecount', 'veinsqueeze', 'braindrift'] },
  { name: 'IonScan', by: 'Our own design', licence: 'MIT', how: 'Built and trained by us', mods: ['tracktrace'] },
  { name: 'CorrFuse-EEG', by: 'A team member’s own earlier code', licence: 'MIT', how: 'Adapted to EEG and trained here', mods: ['garnmeter'] },
  { name: 'SAM 2.1', by: 'Meta', licence: 'Apache-2.0', how: 'Vein outlines, computed in advance', mods: ['veinsqueeze'] },
  { name: 'nnU-Net', by: 'Isensee et al., DKFZ; encoder by Wald et al. 2025 (OpenMind)', licence: 'Apache-2.0 · CC BY 4.0 (encoder)', how: 'Perivascular-space map, computed in advance', mods: ['braindrift'] },
  { name: 'HD-BET', by: 'Isensee et al. 2019', licence: 'Apache-2.0', how: 'Removes the skull from MRI', mods: ['braindrift'] },
  { name: 'ONNX Runtime Web', by: 'Microsoft', licence: 'MIT', how: 'Runs the models in your browser', mods: EVERY },
  { name: 'PyTorch and timm', by: 'timm by Ross Wightman', licence: 'BSD-3-Clause · Apache-2.0', how: 'Training', mods: EVERY },
]

const MOD = new Map(MODS.map((m) => [m.id, m]))
const THIRD_PARTY_URL = `${REPO_URL}/blob/main/THIRD_PARTY.md`
const USE_LABEL: Record<Use, string> = { trained: 'Trained', tested: 'Tested', shown: 'On screen' }
const USE_SAY: Record<Use, string> = { trained: 'used to train the model', tested: 'used to test it', shown: 'shown on screen' }
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
function Out() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function Tick() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
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
/** The three facts on top: open research data, nothing uploaded, our code is MIT. */
function FactIcon({ kind }: { kind: 'data' | 'device' | 'code' }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {kind === 'data' && (
        <>
          <ellipse cx="12" cy="6" rx="7" ry="2.6" {...s} />
          <path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6" {...s} />
        </>
      )}
      {kind === 'device' && (
        <>
          <rect x="3.5" y="4.5" width="17" height="11.5" rx="2" {...s} />
          <path d="M8 20h8M12 16v4M12 7.5v5M9.6 10.4 12 12.8l2.4-2.4" {...s} />
        </>
      )}
      {kind === 'code' && <path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15" {...s} />}
    </svg>
  )
}
function Ext({ url, children, className }: { url: string; children: ReactNode; className?: string }) {
  return (
    <a className={className} href={url} target="_blank" rel="noopener noreferrer">
      {children}
      <Out />
    </a>
  )
}

function Uses({ uses }: { uses: Use[] }) {
  const said = ALL.filter((u) => uses.includes(u))
    .map((u) => USE_SAY[u])
    .join(', ')
  return (
    <ul className="df-lc-uses" aria-label={`What we did with it: ${said}`}>
      {ALL.map((u) => {
        const on = uses.includes(u)
        return (
          <li key={u} className={on ? 'is-on' : undefined} aria-hidden="true">
            {on && <Tick />}
            {USE_LABEL[u]}
          </li>
        )
      })}
    </ul>
  )
}

function Licence({ s }: { s: Source }) {
  return (
    <p className={`df-lc-lic${s.open ? '' : ' is-terms'}`}>
      <b>{s.licence}</b>
      <span>{s.plain}</span>
    </p>
  )
}

function SourceLink({ s }: { s: Source }) {
  if (s.link)
    return (
      <Ext className="df-lc-link" url={s.link.url}>
        {s.link.label}
      </Ext>
    )
  if (s.where) return <p className="df-lc-where">{s.where}</p>
  return null
}

function Main({ s }: { s: Source }) {
  return (
    <div className="df-lc-main">
      <div className="df-lc-top">
        <h3>{s.name}</h3>
        <Uses uses={s.uses} />
      </div>
      <p className="df-lc-by">{s.by}</p>
      {s.ack && <p className="df-lc-ack">{s.ack}</p>}
      <Licence s={s} />
      <p className="df-lc-what">{s.what}</p>
      <SourceLink s={s} />
    </div>
  )
}

function More({ s }: { s: Extra }) {
  return (
    <div className="df-lc-more">
      <p className="df-lc-role">{s.role}</p>
      <h4>{s.name}</h4>
      <p className="df-lc-by">{s.by}</p>
      {s.ack && <p className="df-lc-ack">{s.ack}</p>}
      <Uses uses={s.uses} />
      <Licence s={s} />
      <p className="df-lc-what">{s.what}</p>
      <SourceLink s={s} />
    </div>
  )
}

function CheckCard({ c }: { c: CheckData }) {
  const m = MOD.get(c.id)
  if (!m) return null
  return (
    <article className={`df-lc-card${c.nasa ? ' is-nasa' : ''}`} style={mc(m.color)} aria-labelledby={`lc-${c.id}`}>
      <header className="df-lc-who">
        <h2 id={`lc-${c.id}`}>
          <Star />
          {m.name}
        </h2>
        <p>{m.hook}</p>
        {c.nasa && <span className="df-lc-nasa">NASA open science data</span>}
      </header>
      <div className="df-lc-body">
        <Main s={c.main} />
        {c.more && (
          <div className="df-lc-mores">
            {c.more.map((s) => (
              <More key={s.name} s={s} />
            ))}
          </div>
        )}
        {c.note && <p className="df-lc-note">{c.note}</p>}
      </div>
    </article>
  )
}

function Dots({ mods }: { mods: string[] }) {
  const all = mods.length === MODS.length
  return (
    <span className="df-lc-dots" aria-label={all ? 'Used by all six checks' : `Used by ${mods.map((id) => MOD.get(id)?.name).join(', ')}`}>
      {mods.map((id) => {
        const m = MOD.get(id)
        return m ? <i key={id} style={mc(m.color)} title={m.name} /> : null
      })}
      <small aria-hidden="true">{all ? 'All six' : mods.map((id) => MOD.get(id)?.name).join(', ')}</small>
    </span>
  )
}

export default function Licences({ params }: { params: URLSearchParams }) {
  const reduce = useReducedMotion()
  const pinned = params.get('state') === 'result'
  const [ready, setReady] = useState(false)
  useEscapeHome()
  useEffect(() => setReady(true), [])

  return (
    <div className="df df-xs df-lc" data-view="licences" data-ready={ready ? '1' : undefined} data-state={pinned ? 'result' : 'idle'}>
      <SpaceBackdrop still={reduce || pinned} slow />
      <div className="df-xs-scroll">
        <div className="df-lc-wrap">
          <nav className="df-xs-bar" aria-label="Site">
            <a className="df-back" href={href('home')} data-qa="primary">
              <BackIcon />
              Back to the body
            </a>
            <span className="df-lc-bar-end">
              <a className="df-xs-link df-lc-hide-s" href={href('credits')}>
                Credits and AI use
              </a>
              <a className="df-xs-link" href={href('qr')}>
                <QrIcon />
                QR code
              </a>
            </span>
          </nav>

          <header className="df-lc-hero" data-qa="hero">
            <p className="df-lc-kicker">Data and licences</p>
            <h1 className="df-lc-h1">Where our data comes from.</h1>
            <p className="df-lc-lead">One card per check: the data, who published it, its licence in plain words, and what we did with it.</p>
          </header>

          <ul className="df-lc-facts" aria-label="In short">
            <li>
              <FactIcon kind="data" />
              <b>Published research data</b>
              <span>Every dataset comes from a research team. None of it is astronaut data or personal data.</span>
            </li>
            <li>
              <FactIcon kind="device" />
              <b>Nothing is uploaded</b>
              <span>Every check runs in your browser, on your device. There is no server.</span>
            </li>
            <li>
              <FactIcon kind="code" />
              <b>Our code is MIT</b>
              <span>Code, figures and trained models by Team SuperHumans. Everything else keeps its own licence.</span>
            </li>
          </ul>

          <div className="df-lc-cards">
            {CHECKS.map((c) => (
              <CheckCard key={c.id} c={c} />
            ))}
          </div>

          <section className="df-lc-built" aria-labelledby="lc-built">
            <h2 className="df-lc-h2" id="lc-built">
              Models and code we built on
            </h2>
            <ul className="df-lc-tiles">
              {BUILT.map((b) => (
                <li key={b.name} className="df-lc-tile">
                  <b>{b.name}</b>
                  <span className="df-lc-tile-by">{b.by}</span>
                  <span className="df-lc-tile-lic">{b.licence}</span>
                  <span className="df-lc-tile-how">{b.how}</span>
                  <Dots mods={b.mods} />
                </li>
              ))}
            </ul>
            <p className="df-lc-foot">
              Some results are computed in advance and ship as files: TrackTrace’s whole-sample call, SAM 2.1’s vein outlines and BrainDrift’s perivascular-space map. On a phone, every check
              replays stored results of the same models.
            </p>
          </section>

          <footer className="df-lc-end">
            <p>
              Every file, with its licence, is listed in{' '}
              <a className="df-cr-a" href={THIRD_PARTY_URL} target="_blank" rel="noopener noreferrer">
                THIRD_PARTY.md
              </a>
              .
            </p>
            <div className="df-lc-end-links">
              <a className="df-xs-link" href={href('credits')}>
                Credits and AI use
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
