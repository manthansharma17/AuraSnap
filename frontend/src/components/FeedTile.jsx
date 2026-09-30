import { useEffect, useState } from 'react'
import { ChefHat, Droplets, Snowflake, Utensils, Video } from 'lucide-react'

const ZONE_ICON = { 'Cooking Line': ChefHat, 'Wash Area': Droplets, Storage: Snowflake, 'Prep Station': Utensils }

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return <>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</>
}

// Stand-in for a live camera feed: swap the inside for the real stream later.
// chip = small result label at the bottom-left, bad = show it in coral.
export default function FeedTile({ cam, chip, bad = false, className = 'h-36' }) {
  const Icon = ZONE_ICON[cam.zone] || Video
  return (
    <div className={`relative overflow-hidden rounded-xl border border-line bg-gradient-to-br ${cam.tint} ${className}`}>
      <Icon size={56} strokeWidth={1.25} aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-ink/15" />
      <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold">
        <span className="h-2 w-2 rounded-full bg-bad-ink motion-safe:animate-pulse" aria-hidden="true" /> Live
      </span>
      <span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium tabular-nums text-slate">
        <Clock />
      </span>
      {chip && (
        <span className={`swap absolute bottom-2.5 left-2.5 max-w-[85%] truncate rounded-full px-2.5 py-1 text-xs font-semibold text-ink ${bad ? 'bg-bad' : 'bg-ok/90'}`}>
          {chip}
        </span>
      )}
    </div>
  )
}