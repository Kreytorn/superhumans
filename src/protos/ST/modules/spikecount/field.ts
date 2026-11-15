// Station, spikecount: the one blood field both the scene and the stage show. field-96 is the card's hero
// subject (work/Web/cards/spikecount.md): a real x100 light-microscope photo of lab blood, never seen in training.
export const FIELD = 'field-96'
export const FIELD_URL = `${import.meta.env.BASE_URL}spikecount/fields/96.png`

let asked = false
/** Starts fetching the field photo, once, so it is in the cache when the scene's lens opens. */
export function preloadField() {
  if (asked || typeof Image === 'undefined') return
  asked = true
  const img = new Image()
  img.decoding = 'async'
  img.src = FIELD_URL
}
