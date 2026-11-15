// What survives the route change between the hall and a gate's page: which gate we are coming back from,
// and the sheet of the gate's light that covers the cut.
export const transit: { from: number | undefined } = { from: undefined }

export interface Flood {
  /** cover the screen with a gate's light; amount 0..1, with an optional fade time */
  set: (hue: string, amount: number, ms?: number) => void
  /** let the light go */
  clear: (ms?: number) => void
}
