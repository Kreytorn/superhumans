// Types for figure.json (written by _tools/build-figure.mjs).
interface FigLine {
  d: string
  top: number
  len: number
  k?: number
}
declare const fig: {
  navel: number
  levels: number
  a: { outline: FigLine[]; hatch: FigLine[] }
  b: { outline: FigLine[]; hatch: FigLine[] }
  aura: FigLine[]
}
export default fig
