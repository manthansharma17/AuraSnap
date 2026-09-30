import { Star } from 'lucide-react'
import Card from '../components/Card'
import { CATEGORIES, overall, stars } from '../data/hygiene'

export default function CleanScoreTab({ name }) {
  const score = overall()
  const n = stars(score)
  const todo = CATEGORIES.filter((c) => c.score < 90).sort((a, b) => a.score - b.score)
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card title="Your Clean Score" subtitle="The badge your customers can see." className="lg:col-span-2">
        <div className="rounded-2xl border border-line bg-gradient-to-br from-brand/25 via-white to-warn/30 p-6 text-center">
          <p className="font-bold">{name}</p>
          <p className="mt-3 text-6xl font-extrabold tracking-tight">{score}</p>
          <div className="mt-2 flex justify-center gap-1" role="img" aria-label={`${n} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={22} className={i <= n ? 'fill-[#f2c94c] text-[#f2c94c]' : 'text-[#cbd5d1]'} />
            ))}
          </div>
          <p className="mt-3 text-sm text-slate">Monitored with AURA-Snap CCTV checks. Updated {today}.</p>
        </div>
        <p className="mt-3 text-xs text-slate">A self-monitored score on AURA-Snap's own scale. It is not an FSSAI certificate.</p>
      </Card>

      <Card title="How to reach 5 stars" subtitle="Fix these areas first. Scoring 90 or more in every area earns the top rating." className="lg:col-span-3">
        {todo.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-mint/50 p-6 text-center text-slate">Every area is at 90 or above.</p>
        ) : (
          <ul className="space-y-3">
            {todo.map((c) => (
              <li key={c.key} className="rounded-2xl border border-line p-4">
                <p className="flex items-center justify-between gap-2 font-semibold">
                  {c.name}
                  <span className="text-sm font-bold">{c.score}<span className="font-normal text-slate"> / 100, needs +{90 - c.score}</span></span>
                </p>
                <p className="mt-1 text-sm text-slate">{c.tip}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}