// TrackTrace parity: runs the engine on the stored reference inputs and compares with the stored Python
// outputs. Reference values: gallery.json (onnxruntime CPU, probabilities rounded to 5 dp, centroids to
// 4 dp), wells/live_P242_G4.json (PyTorch fp32 on the same bytes, about 4 significant digits) and
// results/wells_test.json (tt_mil.act_tier_ref tiers).
import { initInference } from '../../lib/infer/client'
import { act, analyzeMany, analyzeWell, listSamples, listWells, load } from './index'
import { fetchJson } from './decode'
import { fitTrackLine, type Vec2 } from './post'

interface Case { name: string; maxAbsDiff: number; tol: number; pass: boolean; ms: number; detail?: string }
interface GalleryRef {
  nuclei: {
    id: string
    ref: { count: number; circles: [number, number, number][]; line: { drawn: boolean; score: number; n_inliers: number } }
    out: { particle: number[]; dose: number[]; time: number[]; lam: number; count: number }
  }[]
}
interface LiveRef {
  n: number; mu: number; verdict: { particle: number[]; dose: number[]; time: number[] }; attention: number[]; highlight: number[]
  nuclei: { particle: number[][]; dose: number[][]; time: number[][]; lambda: number[]; count: number[]; circles: [number, number][][] }
}

const out = document.getElementById('out')!
const maxDiff = (a: number[], b: number[]) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0)
const push = (cases: Case[], name: string, d: number, tol: number, ms: number, detail?: string, strict = false) =>
  cases.push({ name, maxAbsDiff: d, tol, pass: strict ? d < tol : d <= tol, ms, detail })

;(async () => {
  const cases: Case[] = []
  const notes: string[] = []
  try {
    const env = await initInference()
    const tl = performance.now()
    const ld = await load()
    const loadMs = performance.now() - tl
    const gref = await fetchJson<GalleryRef>('tracktrace/gallery/gallery.json')

    // 1) pure JS port of the line rule on the stored reference circles (no model involved)
    let t = performance.now()
    let lineMis = 0
    let scoreD = 0
    for (const n of gref.nuclei) {
      const f = fitTrackLine(n.ref.circles.map((c) => [c[0], c[1]] as Vec2))
      if (f.drawn !== n.ref.line.drawn || f.nInliers !== n.ref.line.n_inliers) lineMis++
      scoreD = Math.max(scoreD, Math.abs(f.score - n.ref.line.score))
    }
    push(cases, 'line-rule port on reference circles: drawn/inlier mismatches (243)', lineMis, 0, performance.now() - t)
    push(cases, 'line-rule port on reference circles: max |score diff|', scoreD, 1e-5, 0)

    // 2) IonScan live on all 243 gallery nuclei
    const samples = await listSamples()
    t = performance.now()
    const res = await analyzeMany(samples.map((s) => s.id), 16)
    const galMs = performance.now() - t
    const byId = new Map(gref.nuclei.map((n) => [n.id, n]))
    let pD = 0
    let lamRel = 0
    let cntMis = 0
    let cntD = 0
    let centD = 0
    let lineDrawnMis = 0
    let lineScoreD = 0
    const misList: string[] = []
    for (const r of res) {
      const g = byId.get(r.sampleId)!
      pD = Math.max(pD, maxDiff(r.probs.particle, g.out.particle), maxDiff(r.probs.dose, g.out.dose), maxDiff(r.probs.time, g.out.time))
      lamRel = Math.max(lamRel, Math.abs(r.lambda - g.out.lam) / Math.max(g.out.lam, 1))
      if (r.count !== g.ref.count) {
        cntMis++
        cntD = Math.max(cntD, Math.abs(r.count - g.ref.count))
        misList.push(`${r.sampleId} js ${r.count} ref ${g.ref.count}`)
      } else {
        r.circles.forEach((c, i) => {
          centD = Math.max(centD, Math.abs(c.row - g.ref.circles[i][0]), Math.abs(c.col - g.ref.circles[i][1]))
        })
        if (r.line.drawn !== g.ref.line.drawn) lineDrawnMis++
        lineScoreD = Math.max(lineScoreD, Math.abs(r.line.score - g.ref.line.score))
      }
    }
    const per = galMs / res.length
    push(cases, 'gallery 243: max |prob diff| particle/dose/time vs ORT CPU (5 dp)', pD, 1e-3, galMs)
    push(cases, 'gallery 243: max |lambda diff| / max(lambda, 1)', lamRel, 1e-3, 0)
    push(cases, 'gallery 243: nuclei with a different circle count', cntMis, 0, 0, misList.join('; '))
    push(cases, 'gallery 243: max |centroid diff| px (same-count nuclei)', centD, 0.5, 0)
    push(cases, 'gallery 243: track-line drawn mismatches', lineDrawnMis, 0, 0)
    push(cases, 'gallery 243: max |line score diff|', lineScoreD, 1e-2, 0)
    notes.push(`gallery: ${res.length} nuclei in ${galMs.toFixed(0)} ms (${per.toFixed(1)} ms per nucleus at batch 16, incl. post-processing)`)
    const first = await analyzeMany([samples[0].id], 1)
    const warm: number[] = []
    for (let k = 1; k <= 3; k++) warm.push((await analyzeMany([samples[k].id], 1))[0].timing.ms)
    notes.push(`single nucleus at batch 1: first call ${first[0].timing.ms.toFixed(1)} ms (new shape), then ${warm.map((v) => v.toFixed(1)).join(' / ')} ms`)

    // 3) whole live well P242_G4 (583 nuclei) + MIL, vs PyTorch fp32 outputs
    const lref = await fetchJson<LiveRef>('tracktrace/wells/live_P242_G4.json')
    t = performance.now()
    const w = await analyzeWell('P242_G4', undefined, 16)
    const wMs = performance.now() - t
    let wp = 0
    let wcm = 0
    let wcd = 0
    const wmis: string[] = []
    w.nuclei.forEach((nu, i) => {
      wp = Math.max(wp, maxDiff(nu.particle, lref.nuclei.particle[i]), maxDiff(nu.dose, lref.nuclei.dose[i]), maxDiff(nu.time, lref.nuclei.time[i]))
      if (nu.count !== lref.nuclei.count[i]) {
        wcm++
        wcd = Math.max(wcd, Math.abs(nu.count - lref.nuclei.count[i]))
        wmis.push(`${nu.key} js ${nu.count} ref ${lref.nuclei.count[i]}`)
      }
    })
    push(cases, 'well P242_G4 583: max |prob diff| vs PyTorch fp32 (4 dp)', wp, 1e-3, wMs)
    push(cases, 'well P242_G4 583: nuclei with a different circle count', wcm, 0, 0, wmis.join('; '))
    push(cases, 'well P242_G4: max |MIL verdict prob diff|', Math.max(maxDiff(w.verdict.particle, lref.verdict.particle), maxDiff(w.verdict.dose, lref.verdict.dose), maxDiff(w.verdict.time, lref.verdict.time)), 1e-3, w.timing.mil.ms)
    // Attention values are ~1e-3 (583 weights summing to 1), stored to 4 significant digits (<= 5e-6
    // rounding), so the tolerance is 2e-5 absolute, not 1e-4 (that would allow a 10% error on a typical weight).
    push(cases, 'well P242_G4: max |MIL attention diff|', maxDiff(w.attention, lref.attention), 2e-5, 0)
    const refTop = new Set(lref.highlight)
    push(cases, 'well P242_G4: top-10 attention nuclei not in the reference top 10', w.highlight.filter((i) => !refTop.has(i)).length, 0, 0,
      `js ${w.highlight.join(',')} ref ${lref.highlight.join(',')}`)
    push(cases, 'well P242_G4: relative |mu diff|', Math.abs(w.mu - lref.mu) / lref.mu, 1e-3, 0)
    notes.push(`well scan: 583 nuclei in ${w.timing.scan.ms.toFixed(0)} ms (${w.timing.perNucleusMs.toFixed(1)} ms model per nucleus at batch 16), MIL ${w.timing.mil.ms.toFixed(1)} ms`)
    if (wcd) notes.push(`well count max |diff| ${wcd}`)

    // 4) ACT tiers on all 34 precomputed wells vs tt_mil.act_tier_ref, plus the live well
    t = performance.now()
    const wells = await listWells()
    let tierMis = 0
    const tierList: string[] = []
    for (const x of wells) {
      const a = act(x)
      if (a.tierRef !== x.actTierRef || a.ledgerHit !== x.hzeLedgerHitRef) {
        tierMis++
        tierList.push(`${x.wellId} js ${a.tierRef} ref ${x.actTierRef}`)
      }
    }
    const live = act(w)
    const ref = wells.find((x) => x.wellId === 'P242_G4')!
    if (live.tierRef !== ref.actTierRef) tierList.push(`live P242_G4 js ${live.tierRef} ref ${ref.actTierRef}`)
    push(cases, 'ACT: tier/ledger mismatches on 34 test wells (+ live well)', tierMis + (live.tierRef !== ref.actTierRef ? 1 : 0), 0, performance.now() - t, tierList.join('; '))
    const tiers: Record<string, number> = {}
    wells.forEach((x) => (tiers[String(x.actTierRef)] = (tiers[String(x.actTierRef)] ?? 0) + 1))
    notes.push(`ACT tiers over 34 wells: ${JSON.stringify(tiers)}`)
    notes.push(`model load: IonScan ${ld.ionscanMs.toFixed(0)} ms, MIL ${ld.milMs.toFixed(0)} ms (load() total ${loadMs.toFixed(0)} ms)`)

    const report = { backend: env.backend, adapter: env.adapter, threads: env.threads, isolated: env.isolated, loadMs, cases, notes }
    ;(window as unknown as { __parity: unknown }).__parity = report
    out.textContent = JSON.stringify(report, null, 2)
    document.body.dataset.parity = cases.every((c) => c.pass) ? 'pass' : 'fail'
  } catch (e) {
    ;(window as unknown as { __parity: unknown }).__parity = { error: String(e), stack: (e as Error)?.stack, cases, notes }
    out.textContent = String(e)
    document.body.dataset.parity = 'error'
  }
})()
