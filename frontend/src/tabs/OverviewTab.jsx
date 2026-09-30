import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bug, Check, Download, Droplet, Hand, RefreshCw, Snowflake, SprayCan,
  TrendingDown, TrendingUp, TriangleAlert, Utensils, X,
} from 'lucide-react'
import Card from '../components/Card'
import CountUp from '../components/CountUp'
import TrendChart from '../components/TrendChart'
import { CATEGORIES, TARGET, downloadReport, level, overall, trend } from '../data/hygiene'
import { fmtTime, inShift, toMins } from '../data/staff'

const ICONS = { hygiene: Hand, floor: SprayCan, cold: Snowflake, oil: Droplet, cross: Utensils, pest: Bug }
const RESULT_ICON = { Pass: Check, Review: TriangleAlert, Fail: X }
const RANGES = [7, 14, 30]
const TONES = ['bg-brand/30', 'bg-warn/50', 'bg-ok/40', 'bg-bad/30']
const hash = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0)
const initials = (name) => name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

// demo check-in time: a few minutes after the shift starts
function checkIn(s) {
  const m = (toMins(s.from) + 3 + (hash(s.empId) % 12)) % 1440
  return fmtTime(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
}

function Stat({ label, className = '', children }) {
  return (
    <div className={`rounded-2xl border border-line bg-mint/50 p-4 ${className}`}>
      <p className="text-sm text-slate">{label}</p>
      {children}
    </div>
  )
}

export default function OverviewTab({ openAlerts, staff, goTab }) {
  const [days, setDays] = useState(30)
  const [ready, setReady] = useState(false)
  const [rechecking, setRechecking] = useState(false)
  const [rechecked, setRechecked] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 150) // lets the score bars grow in
    return () => { clearTimeout(t); clearTimeout(timer.current) }
  }, [])

  const data = useMemo(() => trend(days), [days])
  const score = overall()
  const delta = data[data.length - 1].v - data[0].v
  const standing = score >= TARGET
    ? { label: 'Good standing', pill: 'bg-ok/40 text-ink' }
    : { label: 'Below target', pill: 'bg-bad/40 text-bad-ink' }
  const ranked = [...CATEGORIES].sort((a, b) => b.score - a.score)
  const team = [...staff].sort((a, b) => inShift(b) - inShift(a))

  const recheck = () => {
    setRechecking(true)
    timer.current = setTimeout(() => { setRechecking(false); setRechecked(true) }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* 1. Hygiene trend */}
      <Card
        title="Hygiene trend"
        subtitle="Your overall hygiene score, based on every CCTV check."
        action={
          <div role="group" aria-label="Time range" className="flex rounded-xl border border-line bg-mint p-1">
            {RANGES.map((r) => (
              <button
                key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${days === r ? 'bg-white shadow-sm' : 'text-slate hover:text-ink'}`}
              >
                {r} days
              </button>
            ))}
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Current score">
            <p className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight"><CountUp to={score} />%</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${standing.pill}`}>{standing.label}</span>
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-brand-ink">
              {delta >= 0 ? <TrendingUp size={15} aria-hidden="true" /> : <TrendingDown size={15} aria-hidden="true" />}
              {delta >= 0 ? '+' : ''}{delta} points over {days} days
            </p>
          </Stat>

          <Stat label="Your target">
            <p className="mt-1 text-4xl font-extrabold tracking-tight">{TARGET}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brand-deep transition-[width] duration-1000" style={{ width: ready ? `${score}%` : '0%' }} />
            </div>
            <p className="mt-1 text-sm text-slate">
              {score >= TARGET ? `${score - TARGET} points above target` : `${TARGET - score} points below target`}
            </p>
          </Stat>

          <Stat label="Checks today">
            <p className="mt-1 text-4xl font-extrabold tracking-tight">312</p>
            <p className="mt-1 text-sm text-slate">298 passed, 14 failed</p>
          </Stat>

          <Stat label="Open alerts" className={openAlerts > 0 ? '!border-bad !bg-bad/15' : ''}>
            <p className="mt-1 text-4xl font-extrabold tracking-tight">{openAlerts}</p>
            <button type="button" onClick={() => goTab('logs')} className="mt-1 text-sm font-semibold text-brand-ink hover:underline">
              {openAlerts > 0 ? 'Review in Logs' : 'View Logs'}
            </button>
          </Stat>
        </div>

        <div className="mt-4 rounded-2xl border border-line p-3">
          <TrendChart data={data} target={TARGET} />
        </div>
      </Card>

      {/* 2. Clean Board */}
      <Card title="Clean Board" subtitle="The six FSSAI-based areas we check, ranked from best to weakest.">
        <ul className="space-y-2.5">
          {ranked.map((c, i) => {
            const lv = level(c.score)
            const Icon = ICONS[c.key]
            return (
              <li key={c.key} className="swap flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line p-4">
                <span className="w-5 text-center text-lg font-extrabold text-slate">{i + 1}</span>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${lv.pill}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {c.name}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${lv.pill}`}>{lv.label}</span>
                  </p>
                  <p className="text-sm text-slate">{c.detail}</p>
                </div>
                <div className="w-full sm:w-40">
                  <p className="mb-1 text-right text-sm font-bold">{c.score}<span className="font-normal text-slate">/100</span></p>
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div className={`h-full rounded-full transition-[width] duration-1000 ease-out ${lv.bar}`} style={{ width: ready ? `${c.score}%` : '0%' }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      {/* 3. FSSAI compliance */}
      <Card
        title="FSSAI compliance"
        subtitle="Every check ends in a pass or a fail. A fail raises an alert so the issue can be fixed and checked again."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button" onClick={recheck} disabled={rechecking}
              className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-mint disabled:opacity-70"
            >
              <RefreshCw size={15} className={rechecking ? 'spin' : ''} aria-hidden="true" /> {rechecking ? 'Checking…' : 'Check now'}
            </button>
            <button
              type="button" onClick={downloadReport}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-ok px-4 py-2 text-sm font-bold text-[#0f3b36] shadow-sm hover:brightness-95"
            >
              <Download size={15} aria-hidden="true" /> Download report
            </button>
          </div>
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map((c) => {
            const lv = level(c.score)
            const R = RESULT_ICON[lv.result]
            return (
              <li key={c.key} className="flex flex-col rounded-2xl border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className={`h-2.5 w-2.5 rounded-full ${lv.dot} ${lv.result === 'Fail' ? 'motion-safe:animate-pulse' : ''}`} aria-hidden="true" />
                    {c.name}
                  </p>
                  <span className="text-sm font-bold">{c.score}%</span>
                </div>
                <p className="mt-2 flex-1 text-sm text-slate">{c.rule}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate">
                  <span>{rechecking ? 'Checking…' : rechecked ? 'Checked just now' : `Checked ${c.ago}`}</span>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${lv.pill}`}>
                    <R size={12} aria-hidden="true" /> {lv.result}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      {/* 4. Team on duty (manager, cleaner and the rest, from the Staff page) */}
      <Card
        title="Team on duty"
        subtitle="Everyone you added, with who is on shift right now."
        action={<Link to="/staff" className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-mint">Manage team</Link>}
      >
        {team.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-mint/50 p-6 text-center text-slate">No team members added yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {team.map((s) => {
              const on = inShift(s)
              return (
                <li key={s.empId} className="flex items-center gap-3 rounded-2xl border border-line p-3.5">
                  <span aria-hidden="true" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${TONES[hash(s.empId) % TONES.length]}`}>
                    {initials(s.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {s.name}
                      <span className="rounded-full bg-brand/25 px-2 py-0.5 text-xs font-semibold text-brand-ink">{s.role}</span>
                    </p>
                    <p className="text-sm text-slate">{s.area}, {fmtTime(s.from)} to {fmtTime(s.to)}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-right text-xs font-semibold">
                    <span className={`h-2 w-2 rounded-full ${on ? 'bg-ok' : 'bg-slate/40'}`} aria-hidden="true" />
                    {on ? `Checked in ${checkIn(s)}` : 'Off shift'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}