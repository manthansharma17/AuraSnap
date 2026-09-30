import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays, ClipboardList, LayoutDashboard, Map as MapIcon, MapPin,
  ShieldCheck, SlidersHorizontal, Users, Video,
} from 'lucide-react'
import TopBar from '../components/TopBar'
import Card from '../components/Card'
import OverviewTab from '../tabs/OverviewTab'
import LiveTab from '../tabs/LiveTab'
import LogsTab from '../tabs/LogsTab'
import CleanScoreTab from '../tabs/CleanScoreTab'
import MapTab from '../tabs/MapTab'
import { CAMERAS, getSelectedCameras } from '../data/cameras'
import { LOG_SEED, loadFixed, saveFixed } from '../data/hygiene'
import { loadStaff } from '../data/staff'

const LOCATION = 'Mumbai, Maharashtra' // placeholder: becomes editable in Settings

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'live', label: 'Live', icon: Video },
  { key: 'logs', label: 'Logs', icon: ClipboardList },
  { key: 'score', label: 'Clean Score', icon: ShieldCheck },
  { key: 'map', label: 'Map', icon: MapIcon },
]

const getSession = () => {
  try { return JSON.parse(localStorage.getItem('aura_session')) } catch { return null }
}

// Tabs still to be built
const Deferred = ({ title }) => (
  <Card title={title}>
    <p className="rounded-2xl border border-dashed border-line bg-mint/50 p-10 text-center text-slate">This tab is built in the next step.</p>
  </Card>
)

export default function HomePage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'overview'
  const goTab = (key) => setParams(key === 'overview' ? {} : { tab: key })

  const name = getSession()?.name || 'Your kitchen'
  const staff = useMemo(loadStaff, [])
  const cams = useMemo(() => {
    const chosen = getSelectedCameras()
    return chosen.length ? chosen : CAMERAS
  }, [])

  // check logs: only for the cameras chosen on the Network page
  const [base] = useState(Date.now)
  const [fixed, setFixed] = useState(loadFixed)
  const logs = useMemo(
    () => LOG_SEED
      .filter((l) => cams.some((c) => c.id === l.cam))
      .map((l) => ({
        ...l,
        camera: cams.find((c) => c.id === l.cam),
        at: new Date(base - l.ago * 60000),
        fixedAt: fixed[l.id] ? new Date(fixed[l.id]) : l.fixedAgo ? new Date(base - l.fixedAgo * 60000) : null,
      })),
    [cams, base, fixed]
  )
  const openAlerts = logs.filter((l) => l.result === 'fail' && !l.fixedAt).length

  const fix = (id) => {
    const next = { ...fixed, [id]: Date.now() }
    setFixed(next)
    saveFixed(next)
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-8">
        {/* property + live status */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-slate">
              <MapPin size={16} aria-hidden="true" /> Main kitchen, {LOCATION}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold">
              <span className="h-2 w-2 rounded-full bg-ok motion-safe:animate-pulse" aria-hidden="true" />
              {cams.length} {cams.length === 1 ? 'camera' : 'cameras'} live
            </span>
            <button
              type="button" onClick={() => goTab('logs')}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                openAlerts > 0 ? 'border-bad bg-bad/20 text-bad-ink' : 'border-ok bg-ok/20 text-ink'
              }`}
            >
              {openAlerts > 0 ? `${openAlerts} open ${openAlerts === 1 ? 'alert' : 'alerts'}` : 'No open alerts'}
            </button>
          </div>
        </div>

        {/* tabs */}
        <div role="tablist" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key
            return (
              <button
                key={key} type="button" role="tab" aria-selected={active} onClick={() => goTab(key)}
                className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  active ? 'text-brand-ink' : 'text-slate hover:text-ink'
                }`}
              >
                <Icon size={16} aria-hidden="true" /> {label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3 -bottom-px h-0.5 origin-center rounded bg-brand-deep transition-transform duration-300 ${
                    active ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </button>
            )
          })}
        </div>

        {/* content: only one tab shows at a time */}
        <div key={tab} className="swap mt-6">
          {tab === 'overview' && <OverviewTab openAlerts={openAlerts} staff={staff} goTab={goTab} />}
          {tab === 'live' && <LiveTab cams={cams} logs={logs} staff={staff} />}
          {tab === 'logs' && <LogsTab logs={logs} staff={staff} onFix={fix} />}
          {tab === 'monthly' && <Deferred title="Monthly report" />}
          {tab === 'score' && <CleanScoreTab name={name} />}
          {tab === 'map' && <MapTab cameras={cams} />}
          {tab === 'staff' && <Deferred title="Staff shift" />}
          {tab === 'settings' && <Deferred title="Settings" />}
        </div>
      </main>
    </>
  )
}