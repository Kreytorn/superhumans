// The r2 prototype screen (TrackTrace on mock spots), kept for reference at #/r2. Its CSS loads only with this chunk.
import '../index.css'
import { Starfield } from '../components/Starfield'
import { TrackTrace } from '../modules/tracktrace/TrackTrace'

export default function R2App() {
  return (
    <>
      <Starfield tint="rgba(150,70,60,.20)" />
      <TrackTrace />
    </>
  )
}
