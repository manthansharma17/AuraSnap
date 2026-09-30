import { useState } from 'react'
import { Check } from 'lucide-react'
import Card from '../components/Card'
import { onDutyAt } from '../data/staff'

const time = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

// Each log = one CCTV check. A fail stays open until the manager marks it fixed.
export default function LogsTab({ logs, staff, onFix }) {
  const [filter, setFilter] = useState('all')
  const open = logs.filter((l) => l.result === 'fail' && !l.fixedAt).length
  const shown = logs.filter((l) => filter === 'all' || l.result === filter)

  const FILTERS = [
    ['all', `All (${logs.length})`],
    ['fail', `Fails (${logs.filter((l) => l.result === 'fail').length})`],
    ['pass', `Passes (${logs.filter((l) => l.result === 'pass').length})`],
  ]

  return (
    <Card
      title="Check log"
      subtitle={open > 0 ? `${open} open ${open === 1 ? 'alert needs' : 'alerts need'} action. Mark each as fixed once the issue is sorted.` : 'All alerts are fixed. Nice work.'}
      action={
        <div role="group" aria-label="Filter checks" className="flex rounded-xl border border-line bg-mint p-1">
          {FILTERS.map(([key, label]) => (
            <button
              key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${filter === key ? 'bg-white shadow-sm' : 'text-slate hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-mint/50 p-8 text-center text-slate">No checks to show.</p>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((l) => {
            const isFail = l.result === 'fail'
            const fixed = isFail && l.fixedAt
            const who = onDutyAt(staff, l.camera.zone, l.at)
            const badge = !isFail
              ? { text: 'Pass', cls: 'bg-ok/40 text-ink' }
              : fixed ? { text: 'Fixed', cls: 'bg-warn/50 text-ink' } : { text: 'Fail', cls: 'bg-bad/40 text-bad-ink' }
            return (
              <li key={`${l.id}-${!!fixed}`} className="swap flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line p-4">
                <span className={`w-14 rounded-full px-2.5 py-1 text-center text-xs font-bold ${badge.cls}`}>{badge.text}</span>
                <div className="min-w-0 flex-1 basis-60">
                  <p className="font-semibold">{l.msg}</p>
                  <p className="text-sm text-slate">{l.camera.name} in {l.camera.zone}</p>
                  <p className="text-sm text-slate">{who ? `On duty: ${who.name} (${who.role})` : 'No one was rostered here'}</p>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                  <span className="text-sm font-medium tabular-nums text-slate">{time(l.at)}</span>
                  {isFail && !fixed && (
                    <button
                      type="button" onClick={() => onFix(l.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-mint"
                    >
                      <Check size={14} aria-hidden="true" /> Mark as fixed
                    </button>
                  )}
                  {fixed && <span className="text-sm font-semibold text-brand-ink">Fixed at {time(l.fixedAt)}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}