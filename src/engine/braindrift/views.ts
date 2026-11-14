// 2D views of a [176,176,208] LIA crop for drawing. Every view returns a row-major image (width, height, data) in
// image pixel coordinates, with the radiological conventions the r2 figures use:
//   coronal (fixed k):  rows = superior at the top (j), columns = patient left on the image left (i flipped)
//   axial (fixed j):    rows = anterior at the top (k flipped), columns = patient left on the image left (i flipped)
//   sagittal (fixed i): rows = superior at the top (j), columns = anterior on the image left (k flipped)
// Mapping back: pixelToVoxel() gives (i, j, k) for any pixel, so overlays and clicks stay exact.
import { NI, NJ, NK, vox } from './assets'

export type ViewPlane = 'coronal' | 'axial' | 'sagittal'

export interface SliceImage {
  plane: ViewPlane
  index: number
  width: number
  height: number
  /** Row-major, one byte per pixel (intensity 0-255 or class id 0-5). */
  data: Uint8Array
}

export function planeSize(plane: ViewPlane): { width: number; height: number; depth: number } {
  if (plane === 'coronal') return { width: NI, height: NJ, depth: NK }
  if (plane === 'axial') return { width: NI, height: NK, depth: NJ }
  return { width: NK, height: NJ, depth: NI }
}

/** Voxel (i, j, k) shown at pixel (x, y) of the given view. */
export function pixelToVoxel(plane: ViewPlane, index: number, x: number, y: number): [number, number, number] {
  if (plane === 'coronal') return [NI - 1 - x, y, index]
  if (plane === 'axial') return [NI - 1 - x, index, NK - 1 - y]
  return [index, y, NK - 1 - x]
}

/** Pixel (x, y) of voxel (i, j, k) in a view (the inverse of pixelToVoxel for the in-plane axes). */
export function voxelToPixel(plane: ViewPlane, i: number, j: number, k: number): [number, number] {
  if (plane === 'coronal') return [NI - 1 - i, j]
  if (plane === 'axial') return [NI - 1 - i, NK - 1 - k]
  return [NK - 1 - k, j]
}

/** Extracts one slice of a volume (image or segmentation) as a 2D image. */
export function slice(vol: Uint8Array, plane: ViewPlane, index: number): SliceImage {
  const { width, height } = planeSize(plane)
  const data = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [i, j, k] = pixelToVoxel(plane, index, x, y)
      data[y * width + x] = vol[vox(i, j, k)]
    }
  }
  return { plane, index, width, height, data }
}

/** Coronal slices that contain brain (the slices the model runs on). */
export function brainSlices(vol: Uint8Array): number[] {
  const has = new Uint8Array(NK)
  for (let p = 0; p < NI * NJ; p++) {
    const b = p * NK
    for (let k = 0; k < NK; k++) if (vol[b + k]) has[k] = 1
  }
  const ks: number[] = []
  for (let k = 0; k < NK; k++) if (has[k]) ks.push(k)
  return ks
}
