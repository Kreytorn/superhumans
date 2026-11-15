// Station: the film finish over everything: light animated grain and a soft vignette.
// The grain is one small noise tile made once in a canvas; the animation only moves that layer (transform),
// so it costs no repaint. The vignette is a still gradient.
import { useEffect, useRef } from 'react'

const TILE = 192

function noiseTile(): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = TILE
  canvas.height = TILE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const img = ctx.createImageData(TILE, TILE)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    // Light and dark specks, most of them faint: light ones show on the dark of space, dark ones on lit metal.
    const tone = Math.random() < 0.5 ? 0 : 255
    d[i] = tone
    d[i + 1] = tone
    d[i + 2] = tone
    d[i + 3] = Math.pow(Math.random(), 2) * 72
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

export function Finish() {
  const grain = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = grain.current
    if (!el) return
    const url = noiseTile()
    if (url) el.style.backgroundImage = `url(${url})`
  }, [])
  return (
    <div className="st-finish" aria-hidden="true">
      <i className="st-vignette" />
      <i className="st-grain" ref={grain} />
    </div>
  )
}
