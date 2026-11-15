// Video time -> frame index, so the hotspots move in step with the picture they are glued to.
// Uses requestVideoFrameCallback where it exists (it reports the frame that is really on screen) and falls
// back to reading currentTime once per animation frame.

type FrameMeta = { mediaTime: number }
type VfcVideo = HTMLVideoElement & {
  requestVideoFrameCallback(cb: (now: number, meta: FrameMeta) => void): number
  cancelVideoFrameCallback(id: number): void
}

export function frameAt(time: number, fps: number, frames: number, exact = false): number {
  // A presented frame's media time is its exact start (n / fps), so it is rounded; a running clock is floored.
  const n = exact ? Math.round(time * fps) : Math.floor(time * fps + 1e-3)
  return ((n % frames) + frames) % frames
}

/** Calls `onFrame` whenever the video shows another frame of the loop. Returns the stop function. */
export function watchFrames(video: HTMLVideoElement, fps: number, frames: number, onFrame: (frame: number) => void): () => void {
  let stopped = false
  let last = -1
  const emit = (time: number, exact: boolean) => {
    const f = frameAt(time, fps, frames, exact)
    if (f === last) return
    last = f
    onFrame(f)
  }
  const onSeek = () => emit(video.currentTime, false)
  video.addEventListener('seeked', onSeek)
  video.addEventListener('loadeddata', onSeek)
  emit(video.currentTime, false)

  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    const v = video as VfcVideo
    let id = 0
    const cb = (_now: number, meta: FrameMeta) => {
      if (stopped) return
      emit(meta.mediaTime, true)
      id = v.requestVideoFrameCallback(cb)
    }
    id = v.requestVideoFrameCallback(cb)
    return () => {
      stopped = true
      v.cancelVideoFrameCallback(id)
      video.removeEventListener('seeked', onSeek)
      video.removeEventListener('loadeddata', onSeek)
    }
  }

  let raf = 0
  const tick = () => {
    if (stopped) return
    if (!video.paused) emit(video.currentTime, false)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => {
    stopped = true
    cancelAnimationFrame(raf)
    video.removeEventListener('seeked', onSeek)
    video.removeEventListener('loadeddata', onSeek)
  }
}
