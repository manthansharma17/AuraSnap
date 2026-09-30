import { Map as MapIcon } from 'lucide-react'

// TEAMMATE: build the live kitchen map inside this box (id="kitchen-map").
// `cameras` = the cameras chosen on the Network page (each has id, name, zone).
export default function MapTab({ cameras }) {
  return (
    <section
      id="kitchen-map"
      data-cameras={cameras.length}
      aria-label="Live kitchen map"
      className="grid min-h-[32rem] place-items-center rounded-3xl border border-line bg-white p-6 shadow-[0_10px_40px_-12px_rgba(46,148,136,0.2)]"
    >
      <div className="text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-mint text-slate">
          <MapIcon size={36} aria-hidden="true" />
        </span>
        <p className="mt-4 text-lg font-semibold text-slate">Live Kitchen Map</p>
      </div>
    </section>
  )
}