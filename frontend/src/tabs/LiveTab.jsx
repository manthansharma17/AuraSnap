import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Card from '../components/Card'
import FeedTile from '../components/FeedTile'
import { CAMERAS } from '../data/cameras'
import { inShift, onDutyAt } from '../data/staff'

function Stat({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-sm text-slate">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-0.5 text-sm text-slate">{note}</p>
    </div>
  )
}

// Live view of the cameras chosen on the Network page. A camera shows an alert while it has any unfixed fail in Logs.
export default function LiveTab({ cams, logs, staff }) {
  const now = new Date()
  const onNow = staff.filter((s) => inShift(s)).length
  const open = logs.filter((l) => l.result === 'fail' && !l.fixedAt).length
  const openFail = (id) => logs.find((l) => l.cam === id && l.result === 'fail' && !l.fixedAt)

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Cameras live"
          value={<>{cams.length}<span className="text-lg font-semibold text-slate">/{CAMERAS.length}</span></>}
          note={cams.length === CAMERAS.length ? 'All feeds verified as live' : `${CAMERAS.length - cams.length} not monitored`}
        />
        <Stat label="Checks passed today" value="96%" note="298 of 312 checks" />
        <Stat label="On duty now" value={onNow} note={`of ${staff.length} team members`} />
        <Stat label="Open alerts" value={open} note={open > 0 ? 'Fix them in Logs' : 'Everything is clear'} />
      </div>

      <Card
        title="Live cameras"
        subtitle="A live view of the cameras you chose. Each feed is checked to be real, not a replayed recording."
        action={
          <Link to="/network" className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-mint">
            <Plus size={15} aria-hidden="true" /> Manage cameras
          </Link>
        }
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {cams.map((c, i) => {
            const alert = openFail(c.id)
            const fail = !!alert
            const who = onDutyAt(staff, c.zone, now)
            return (
              <li
                key={c.id} style={{ animationDelay: `${i * 90}ms` }}
                className={`rise rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${fail ? 'border-bad bg-bad/10' : 'border-line bg-white'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {c.name}
                    <span className="rounded-full bg-brand/25 px-2 py-0.5 text-xs font-semibold text-brand-ink">{c.zone}</span>
                  </p>
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className={`h-2 w-2 rounded-full ${fail ? 'bg-bad-ink motion-safe:animate-pulse' : 'bg-ok'}`} aria-hidden="true" />
                    {fail ? 'Alert open' : 'All clear'}
                  </span>
                </div>
                <FeedTile cam={c} chip={fail ? alert.msg : c.preview} bad={fail} className="mt-3 h-44" />
                <p className="mt-3 text-sm text-slate">Watches for: {c.checks.join(', ')}.</p>
                <p className="text-sm text-slate">{who ? `On duty: ${who.name} (${who.role})` : 'No one is rostered here right now'}</p>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-sm text-slate">Video is only analyzed for hygiene checks. We save results and alert snapshots, not continuous footage.</p>
      </Card>
    </div>
  )
}