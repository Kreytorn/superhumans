// Browser-only helper: decode a user video (File/Blob/URL) into grey frames for prepareClip().
// Uses an off-screen <video> and canvas; nothing is drawn on the page.
import { linspaceRound, rgbaToGrey, type GreyFrame } from './prep'

/**
 * Seeks to `count` evenly spaced times and grabs each frame as grey uint8 ((R+G+B+1)//3, like vs_prep.py).
 * Browsers seek to the nearest decodable frame, so this is a close stand-in for "every frame of the clip"
 * followed by vs_prep.py's 64-frame selection; with count = 64 the selection is the identity.
 * `timesS[i]` is the time of frames[i]; pass it on as analyze({ frames, timesS }) so the evidence ticks get real times.
 */
export async function extractGreyFrames(
  src: Blob | string,
  count = 64,
  maxSide = 640,
): Promise<{ frames: GreyFrame[]; timesS: number[]; durationS: number; width: number; height: number }> {
  const url = typeof src === 'string' ? src : URL.createObjectURL(src)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'
  video.src = url
  try {
    await new Promise<void>((res, rej) => {
      video.onloadeddata = () => res()
      video.onerror = () => rej(new Error('this browser cannot decode the video'))
    })
    let dur = video.duration
    if (!Number.isFinite(dur)) {
      // some webm files report Infinity until the end is reached
      video.currentTime = 1e9
      await new Promise((r) => (video.onseeked = r))
      dur = video.duration
    }
    const s = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight))
    const w = Math.max(1, Math.round(video.videoWidth * s))
    const h = Math.max(1, Math.round(video.videoHeight * s))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('no 2d canvas')
    const frames: GreyFrame[] = []
    const timesS: number[] = []
    const ticks = linspaceRound(1000, count).map((i) => (i / 999) * Math.max(0, dur - 0.05))
    for (const t of ticks) {
      video.currentTime = t
      await new Promise((r) => (video.onseeked = r))
      ctx.drawImage(video, 0, 0, w, h)
      frames.push(rgbaToGrey(ctx.getImageData(0, 0, w, h).data, w, h))
      timesS.push(video.currentTime)
    }
    return { frames, timesS, durationS: dur, width: w, height: h }
  } finally {
    video.removeAttribute('src')
    video.load()
    if (typeof src !== 'string') URL.revokeObjectURL(url)
  }
}
