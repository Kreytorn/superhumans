// DF's credits page (r4): #/proto/DF/credits. Plain bullet lists under the names of things: one section per check
// (its data, licence and links, the models it builds on), then NASA, the Canadian Space Agency, the website,
// training, fonts, images, the use of AI and the team. Short, official wording; no slogans.
// Every fact is copied from the verified sources: public/<module>/manifest.json, THIRD_PARTY.md, src/data/credits.json,
// work/Web/SUBMISSION.md sections 6 and 8, work/Web/models/*.md and work/Web/CHEATSHEET_who_did_what.md.
// Styles: credits.css (loaded with the home; it also holds the sky and bar shared with the QR and licences pages).
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import credits from '../../data/credits.json'
import { MODS, href } from './data'
import { BackIcon, REPO_URL, SpaceBackdrop, useEscapeHome, useReducedMotion } from './qr'

interface Item {
  /** A short label before the text: "Data", "Model", ... */
  k?: string
  text: ReactNode
  /** A short licence on the same line, after the text. */
  inl?: string
  /** A second line: licence and links. */
  meta?: ReactNode
}
interface Block {
  title: string
  items: Item[]
}

const THIRD_PARTY_URL = `${REPO_URL}/blob/main/THIRD_PARTY.md`
const COLOR = new Map(MODS.map((m) => [m.name, m.color]))
const FONTS = (credits.fonts as { family: string; importedInSrc: boolean }[]).filter((f) => f.importedInSrc).map((f) => f.family)

function A({ url, children }: { url: string; children: ReactNode }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}
/** The second line of a bullet: "Licence: X", a note, then the links, separated by dots. */
function Meta({ lic, note, links = [] }: { lic?: string; note?: string; links?: [string, string][] }) {
  const parts: ReactNode[] = []
  if (lic) parts.push(`Licence: ${lic}`)
  if (note) parts.push(note)
  for (const [label, url] of links)
    parts.push(
      <A key={url} url={url}>
        {label}
      </A>,
    )
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} className="df-cr-part">
          {p}
        </span>
      ))}
    </>
  )
}

const CHECKS: Block[] = [
  {
    title: 'TrackTrace',
    items: [
      {
        k: 'Data',
        text: 'NASA BPS Microscopy benchmark, from NASA OSDR study OSD-366 (Penninckx et al. 2019): 77,177 microscope images of mouse skin-cell nuclei after iron-ion, X-ray or no irradiation.',
        meta: (
          <Meta
            lic="no restrictions on use (AWS Open Data registry); OSD-366: NASA science data, no licence field"
            links={[
              ['AWS registry', 'https://registry.opendata.aws/bps_microscopy/'],
              ['NASA OSDR', 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-366'],
              ['DOI', 'https://doi.org/10.26030/v8w4-rg83'],
            ]}
          />
        ),
      },
      {
        k: 'Model',
        text: 'IonScan, built by the team. Whole-sample model: gated-attention MIL (Ilse et al. 2018).',
        inl: 'Licence: MIT',
      },
      {
        k: 'Methods',
        text: 'Mamba-style state-space scans (Gu & Dao 2023), SUGAR-ReGLU feed-forward (Horuz et al. 2025; Shazeer 2020), U-Net-style decoder (Ronneberger et al. 2015).',
      },
    ],
  },
  {
    title: 'BubbleGrade',
    items: [
      {
        k: 'Data',
        text: '“An Echo from the past” (Blogg et al. 2026): Doppler audio recordings of venous gas emboli in divers; 6,826 recordings from 310 divers used.',
        meta: <Meta lic="GPL-3.0-or-later" note="six clips shown, resampled to 16 kHz" links={[['Zenodo', 'https://zenodo.org/records/16877955']]} />,
      },
      {
        k: 'Test data',
        text: 'Pierleoni, Mercuri et al. 2019 (Data in Brief): 30 modern-probe Doppler recordings, for one test only; not used for training, not on the site.',
        meta: <Meta lic="CC BY-NC-ND 4.0" links={[['PMC', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6864345/']]} />,
      },
      {
        k: 'Model',
        text: 'MobileNetV4-Conv-Medium (Qin et al. 2024; ImageNet weights from timm), fine-tuned by the team with a CORAL ordinal head (Cao et al. 2020).',
        inl: 'Licence: Apache-2.0 (weights)',
      },
    ],
  },
  {
    title: 'SpikeCount',
    items: [
      {
        k: 'Data',
        text: 'RedTell DSE set (Sadafi et al. 2023; Helmholtz Munich / University of Zurich): about 5,700 expert-graded red blood cells in 152 microscope fields.',
        meta: <Meta lic="CC BY 4.0" links={[['Zenodo', 'https://zenodo.org/records/7801430']]} />,
      },
      {
        k: 'Models',
        text: 'U-Net cell outliner (Ronneberger et al. 2015) on MobileNetV4-Conv-Small; MobileNetV4-Conv-Medium shape grader. Fine-tuned by the team from timm weights.',
        meta: <Meta lic="Apache-2.0 (timm weights); MIT (segmentation_models_pytorch)" />,
      },
    ],
  },
  {
    title: 'VeinSqueeze',
    items: [
      {
        k: 'Data',
        text: 'ThrombUS+ Ultrasound Dataset #1: 2,341 compression-ultrasound clips of leg veins from 594 patients in 5 European hospitals.',
        meta: (
          <Meta
            lic="CC BY 4.0"
            links={[
              ['Zenodo', 'https://zenodo.org/records/17659415'],
              ['Paper', 'https://zenodo.org/records/18894312'],
            ]}
          />
        ),
      },
      {
        k: 'Context',
        text: 'Neck-vein compression clip, Gillman et al., Scand J Trauma Resusc Emerg Med 2010;18:39, additional file S3. Cropped; not a model input.',
        meta: <Meta lic="CC BY 2.0" note="Wikimedia Commons" />,
      },
      {
        k: 'Context',
        text: 'SegThy (Kronke et al., PLOS ONE 2022): one neck ultrasound sweep with the expert outline. Not a model input.',
        meta: <Meta lic="CC BY 4.0" links={[['Hugging Face', 'https://huggingface.co/datasets/MedOtter/SegThy']]} />,
      },
      {
        k: 'Model',
        text: 'MobileNetV4-Conv-Medium frame encoder and a 2-block transformer over 32 frames, trained by the team. Squeeze curve: SAM 2.1 (Meta), zero-shot.',
        meta: <Meta lic="Apache-2.0 (timm weights, SAM 2.1)" links={[['SAM 2.1', 'https://huggingface.co/facebook/sam2.1-hiera-large']]} />,
      },
    ],
  },
  {
    title: 'BrainDrift',
    items: [
      {
        k: 'Data',
        text: 'OASIS-1 brain MRI (Marcus et al. 2007), via neurite-oasis (Hoopes et al. 2021): 332 brains for training, 40 for testing.',
        meta: (
          <Meta
            lic="OASIS Data Use Terms (cite; no re-identification)"
            note="skull-stripped crops only"
            links={[
              ['OASIS', 'https://sites.wustl.edu/oasisbrains/'],
              ['neurite-oasis', 'https://github.com/adalca/medical-datasets/blob/master/neurite-oasis.md'],
            ]}
          />
        ),
      },
      {
        k: 'Data',
        text: 'OpenNeuro ds005595 (Chai et al.): HCP-Aging perivascular-space masks; 159 people for training, 20 for testing.',
        meta: (
          <Meta
            lic="CC0"
            note="Supported by the National Institute on Aging of the NIH under Award Number U01AG052564"
            links={[['OpenNeuro', 'https://openneuro.org/datasets/ds005595/versions/1.0.0']]}
          />
        ),
      },
      {
        k: 'Data',
        text: 'OpenNeuro ds000239 (Maclaren et al. 2014): 120 repeat scans of 3 healthy adults, for day-to-day variation.',
        meta: <Meta lic="CC0" links={[['OpenNeuro', 'https://openneuro.org/datasets/ds000239']]} />,
      },
      {
        k: 'Models',
        text: 'Brain map: 2.5D U-Net on MobileNetV4-Conv-Small, trained by the team. Perivascular spaces: nnU-Net ResEnc-L (Isensee et al.) with the OpenMind encoder (Wald et al. 2025). Skull removal: HD-BET (Isensee et al. 2019).',
        meta: <Meta lic="Apache-2.0 (timm weights, nnU-Net, HD-BET); CC BY 4.0 (OpenMind encoder)" />,
      },
      {
        k: 'Simulation',
        text: 'Ventricles +10.7% (Roberts et al., AJNR 2019); brain shift up 2.52 mm (Wang et al., PNAS 2026).',
        meta: (
          <Meta
            links={[
              ['Roberts 2019', 'https://doi.org/10.3174/ajnr.A6249'],
              ['Wang 2026', 'https://doi.org/10.1073/pnas.2505682122'],
            ]}
          />
        ),
      },
    ],
  },
  {
    title: 'Garn Meter',
    items: [
      {
        k: 'Data',
        text: 'Hacettepe University VR-sickness EEG (Ozkan, Uyan & Celikcan 2023; Uyan & Celikcan 2024): 14-channel EEG of 33 people with 1-7 discomfort ratings.',
        meta: (
          <Meta
            lic="none stated; cited as the authors request"
            note="one anonymised 224-second excerpt shown"
            links={[
              ['Paper 2023', 'https://doi.org/10.1016/j.displa.2023.102415'],
              ['Paper 2024', 'https://doi.org/10.1016/j.displa.2024.102704'],
            ]}
          />
        ),
      },
      {
        k: 'Model',
        text: 'CorrFuse-EEG: a team member’s earlier code (June 2026, not made for Space Apps), adapted to EEG.',
        inl: 'Licence: MIT',
      },
      {
        k: 'Methods',
        text: 'S4D (Gu et al. 2022), GSS (Mehta et al. 2023), GeM (Radenović et al. 2019), CORAL (Cao et al. 2020); baseline EEGNet (Lawhern et al. 2018).',
      },
    ],
  },
]

const GENERAL: Block[] = [
  {
    title: 'NASA Human Research Program',
    items: [
      { text: <A url="https://www.nasa.gov/hrp/hazards/">5 Hazards of Human Spaceflight</A>, inl: 'Resources tab' },
      { text: <A url="https://www.nasa.gov/hrp/risks/">Risks of Human Spaceflight</A>, inl: 'Resources tab' },
      { text: <A url="https://www.nasa.gov/hrp/ongoing-hrp-research/">Ongoing HRP Research in Space</A>, inl: 'Resources tab' },
    ],
  },
  {
    title: 'Canadian Space Agency',
    items: [
      {
        text: <A url="https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp">Monitoring Radiation for Astronaut Health</A>,
        inl: 'Resources tab',
      },
      {
        text: <A url="https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp">Why Do We Conduct Science Experiments in Space?</A>,
        inl: 'Resources tab',
      },
      {
        text: (
          <>
            <A url="https://www.asc-csa.gc.ca/eng/sciences/marrow.asp">MARROW study of space anemia</A> (Trudel et al. 2022, Nature Medicine)
          </>
        ),
        meta: 'Background for SpikeCount',
      },
    ],
  },
  {
    title: 'Website',
    items: [
      { text: 'React, Vite, TypeScript, Tailwind CSS', inl: 'MIT; TypeScript: Apache-2.0' },
      { text: 'three.js, react-three-fiber, drei, postprocessing', inl: 'MIT; Zlib' },
      { text: 'ONNX Runtime Web (Microsoft), runs the models', inl: 'MIT' },
      { text: 'Motion, D3, Base UI, NumberFlow, Phosphor Icons, Lucide', inl: 'MIT or ISC' },
      { text: 'Electron (desktop app); coi-serviceworker (Guido Zuidhof)', inl: 'MIT' },
      {
        text: 'Our code, text, figures and model weights',
        inl: 'MIT, Team SuperHumans',
        meta: (
          <Meta
            links={[
              ['Code repository', REPO_URL],
              [`THIRD_PARTY.md (all ${credits.totals.libraries} packages)`, THIRD_PARTY_URL],
            ]}
          />
        ),
      },
    ],
  },
  {
    title: 'Training',
    items: [
      { text: 'PyTorch (BSD-3-Clause); timm, MONAI, nnU-Net, Hugging Face transformers (Apache-2.0); segmentation_models_pytorch (MIT)' },
      { text: 'ONNX and ONNX Runtime (model export)', inl: 'Apache-2.0; MIT' },
      { text: 'NumPy, SciPy, scikit-learn, scikit-image, pandas, Matplotlib, OpenCV, Pillow, SimpleITK, nibabel, pydicom, soundfile, trimesh', inl: 'open-source licences' },
      { text: 'Architecture diagrams: LaTeX and TikZ', inl: 'LPPL' },
      { text: 'ffmpeg (video encoding), Blender 4.5 (Station renders)', meta: <Meta lic="LGPL-2.1+ / GPL (ffmpeg); GPL-2.0+ (Blender); tools only, not shipped" /> },
      { text: 'GPUs: Google Colab' },
    ],
  },
  {
    title: 'Fonts',
    items: [
      { text: 'Space Grotesk, JetBrains Mono', inl: 'SIL Open Font License 1.1' },
      { text: `Also bundled: ${FONTS.join(', ')}`, inl: 'OFL-1.1' },
      { text: 'Self-hosted files built by Fontsource' },
    ],
  },
  {
    title: 'Images',
    items: [
      {
        text: '“Star trails and an orbital sunrise above the southern Indian Ocean”, NASA / Chris Williams, ISS image iss074e0409626 (23 March 2026).',
        meta: <Meta lic="NASA imagery, public domain" links={[['images.nasa.gov', 'https://images.nasa.gov/details/iss074e0409626']]} />,
      },
      { text: 'Illustrations drawn by AI-written code, such as the glowing body on the home page, are marked “AI-generated illustration”.' },
      { text: 'Architecture diagrams are marked “AI-generated diagram”; the small images inside are held-out dataset samples.' },
      {
        text: 'Station version of the home page: star map from NASA/Goddard SVS Deep Star Maps 2020 (Gaia DR2: ESA/Gaia/DPAC); Saturn maps by Solar System Scope. Marked “AI-generated imagery”.',
        meta: (
          <Meta
            lic="public domain (NASA); CC BY 4.0 (Solar System Scope)"
            links={[
              ['NASA SVS', 'https://svs.gsfc.nasa.gov/4851'],
              ['Solar System Scope', 'https://www.solarsystemscope.com/textures/'],
            ]}
          />
        ),
      },
      { text: 'QR code made with segno 1.6.6', inl: 'BSD-3-Clause' },
      { text: 'No NASA logos or insignia are used.' },
    ],
  },
  {
    title: 'Use of AI',
    items: [
      { text: 'Claude by Anthropic, through Claude Code, wrote the code: the website, the desktop app, the in-browser model code and the training scripts. The team decided what to build, ran the training and read the results.' },
      { text: 'Claude drew the six architecture diagrams as LaTeX/TikZ code; each is marked “AI-generated diagram”.' },
      { text: 'Claude helped with research and with the wording of the project page, and listed candidate health problems with their sources. The team chose the idea and the six checks.' },
      { text: 'AI generated no health data and no results. Every sample is openly published research data; every number comes from our trained models on data they had not seen.' },
    ],
  },
  {
    title: 'Team',
    items: [
      { text: 'Team SuperHumans' },
      { text: 'NASA Space Apps Challenge 2026, Istanbul local event' },
      { text: 'Challenge: “Create Health Monitoring Software for Astronauts on Space Missions”' },
    ],
  },
]

function Section({ b, order }: { b: Block; order?: number }) {
  const color = COLOR.get(b.title)
  const style = { ...(color ? { '--mc': color } : {}), ...(order !== undefined ? { order } : {}) } as CSSProperties
  return (
    <section className="df-cr-sec" aria-label={b.title} style={style}>
      <h2 className={color ? 'df-cr-h2 has-dot' : 'df-cr-h2'}>
        {b.title}
      </h2>
      <ul className="df-cr-list">
        {b.items.map((it, i) => (
          <li key={i}>
            {it.k && <b>{it.k}: </b>}
            {it.text}
            {it.inl && <span className="df-cr-inl">{it.inl}</span>}
            {it.meta && <span className="df-cr-meta">{it.meta}</span>}
          </li>
        ))}
      </ul>
    </section>
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

function Links() {
  return (
    <div className="df-cr-links">
      <a href={href('licences')}>Data and licences</a>
      <a href={href('qr')}>
        <QrIcon />
        QR code
      </a>
    </div>
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
          <nav className="df-cr-bar" aria-label="Site">
            <a className="df-cr-back" href={href('home')} data-qa="primary">
              <BackIcon />
              Back
            </a>
            <Links />
          </nav>
          <h1 className="df-cr-h1" data-qa="hero">
            Credits
          </h1>
          {/* two columns that end at about the same height, read across in pitch order; one column, in pitch order, on a phone */}
          <div className="df-cr-checks">
            {[0, 1].map((col) => (
              <div key={col} className="df-cr-col">
                {CHECKS.map((b, i) => (i % 2 === col ? <Section key={b.title} b={b} order={i} /> : null))}
              </div>
            ))}
          </div>
          <div className="df-cr-cols is-general">
            {GENERAL.map((b) => (
              <Section key={b.title} b={b} />
            ))}
          </div>
          <footer className="df-cr-end">
            <a className="df-cr-back" href={href('home')}>
              <BackIcon />
              Back
            </a>
            <Links />
          </footer>
        </div>
      </div>
    </div>
  )
}
