import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Eye, EyeOff, Link2, Lock, RefreshCw, User, Video,
} from 'lucide-react'
import TopBar from '../components/TopBar'
import Stepper from '../components/Stepper'
import FeedTile from '../components/FeedTile'
import { Field, inputCls } from '../components/Field'
import { CAMERAS, DEMO_LOGIN, loadNetwork, saveNetwork } from '../data/cameras'

/* ---------- helpers ---------- */
const rise = (n) => ({ animationDelay: `${n * 90}ms` })
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/
const timeLabel = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function validate(f) {
  const e = {}
  const url = f.url.trim()
  if (!url) e.url = 'Enter the recorder address or RTSP link.'
  else if (!/^rtsp:\/\/\S+$/i.test(url) && !IPV4.test(url)) e.url = 'Use an RTSP link (rtsp://…) or an IP address like 192.168.1.120.'
  const port = Number(f.port)
  if (!f.port || !Number.isInteger(port) || port < 1 || port > 65535) e.port = 'Enter a port between 1 and 65535.'
  if (!f.username.trim()) e.username = 'Enter the recorder username.'
  if (!f.password) e.password = 'Enter the recorder password.'
  return e
}

const STATUS = {
  idle:      { card: 'border-line bg-mint/60', dot: 'bg-slate/40', title: 'Not connected yet', text: 'Test the connection to find your cameras.' },
  testing:   { card: 'border-warn bg-warn/20', dot: 'bg-warn motion-safe:animate-pulse', title: 'Testing connection…', text: 'Reaching your recorder.' },
  connected: { card: 'border-ok bg-ok/15', dot: 'bg-ok', title: 'Connected', text: 'All camera streams are responding.', pill: 'Active' },
  failed:    { card: 'border-bad bg-bad/15', dot: 'bg-bad', title: 'Could not connect', text: 'Check the address, port, username and password, then try again.' },
}

/* ---------- small pieces ---------- */
function IconInput({ icon: Icon, right, error, ...props }) {
  return (
    <div className="relative flex items-center">
      <Icon size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 text-slate" />
      <input {...props} aria-invalid={!!error} className={`${inputCls(error)} pl-10 ${right ? 'pr-11' : ''}`} />
      {right}
    </div>
  )
}

/* ---------- page ---------- */
export default function NetworkPage() {
  const navigate = useNavigate()
  const timers = useRef([])
  const [saved] = useState(loadNetwork)

  const [form, setForm] = useState({
    url: saved?.url ?? '', port: saved?.port ?? '554', username: saved?.username ?? '', password: '',
  })
  const [errors, setErrors] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [status, setStatus] = useState(saved?.connected ? 'connected' : 'idle') // idle | testing | connected | failed
  const [feeds, setFeeds] = useState(saved?.connected ? CAMERAS.map((c) => c.id) : [])   // cameras found so far
  const [verified, setVerified] = useState(                                             // id -> time the feed was confirmed live
    saved?.connected ? Object.fromEntries(CAMERAS.map((c) => [c.id, 'earlier'])) : {}
  )
  const [selected, setSelected] = useState(saved?.selected ?? [])
  const [navError, setNavError] = useState('')
  const [progress, setProgress] = useState(0)

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  // progress bar fills once on load: step 3 of 4 = 75%
  useEffect(() => {
    const t = setTimeout(() => setProgress(75), 150)
    return () => { clearTimeout(t); clearTimers() }
  }, [])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
    if (status === 'failed') setStatus('idle')
  }

  // cameras appear one by one, then each feed is "verified" (live, not a replayed recording)
  const findCameras = () => {
    clearTimers()
    setFeeds([]); setVerified({}); setSelected([])
    CAMERAS.forEach((c, i) => {
      later(() => setFeeds((f) => [...f, c.id]), 350 * (i + 1))
      later(() => {
        setVerified((v) => ({ ...v, [c.id]: timeLabel() }))
        setSelected((s) => [...s, c.id])
      }, 350 * (i + 1) + 900)
    })
  }

  // Simulated test. Tip for demos: type "wrong" as the password to show the failed state.
  const testConnection = () => {
    const errs = validate(form)
    setErrors(errs)
    setNavError('')
    if (Object.keys(errs).length) return
    clearTimers()
    setStatus('testing')
    setFeeds([]); setVerified({}); setSelected([])
    later(() => {
      if (form.password === 'wrong') return setStatus('failed')
      setStatus('connected')
      findCameras()
    }, 1800)
  }

  const useDemo = () => {
    setForm({ ...DEMO_LOGIN })
    setErrors({})
    setStatus((s) => (s === 'failed' ? 'idle' : s))
  }

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const goNext = () => {
    if (status !== 'connected') return setNavError('Test the connection first, so we can find your cameras.')
    if (!selected.length) return setNavError('Select at least one camera to monitor.')
    saveNetwork({ url: form.url.trim(), port: form.port, username: form.username.trim(), connected: true, selected })
    navigate('/home')
  }

  const st = STATUS[status]
  const testing = status === 'testing'

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-8">
        {/* heading + progress */}
        <div style={rise(0)} className="rise">
          <Stepper current={2} />
          <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-xl">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Connect your cameras</h1>
              <p className="mt-2 leading-relaxed text-slate">
                Give AURA-Snap access to your kitchen's CCTV stream. We check it for hygiene and safety lapses automatically.
              </p>
            </div>
            <span className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-brand-ink">Step 3 of 4</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={75} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-ok transition-[width] duration-1000 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* left: recorder login */}
          <section
            style={rise(1)}
            className="rise h-fit rounded-3xl border border-line bg-white p-6 shadow-[0_10px_40px_-12px_rgba(46,148,136,0.2)] lg:sticky lg:top-24 lg:col-span-2"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/25 text-brand-ink">
                <Video size={20} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-bold leading-tight">Recorder login</h2>
                <p className="text-sm text-slate">Your NVR, DVR or camera system</p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); testConnection() }} noValidate className="mt-6 space-y-4 border-t border-line pt-6">
              <Field
                id="url" label="NVR / DVR address or RTSP link" error={errors.url}
                hint={<button type="button" onClick={useDemo} className="font-semibold text-brand-deep hover:underline">Use demo values</button>}
              >
                <IconInput icon={Link2} id="url" name="url" value={form.url} onChange={onChange} placeholder="rtsp://192.168.1.120:554/live/ch1" autoComplete="off" error={errors.url} />
              </Field>

              <Field id="port" label="Port" error={errors.port}>
                <input id="port" name="port" inputMode="numeric" value={form.port} onChange={onChange} aria-invalid={!!errors.port} className={inputCls(errors.port)} />
              </Field>

              <Field id="username" label="Username" error={errors.username}>
                <IconInput icon={User} id="username" name="username" value={form.username} onChange={onChange} placeholder="Recorder username" autoComplete="off" error={errors.username} />
              </Field>

              <Field id="password" label="Password" error={errors.password}>
                <IconInput
                  icon={Lock} id="password" name="password" type={showPw ? 'text' : 'password'}
                  value={form.password} onChange={onChange} placeholder="Recorder password" autoComplete="off" error={errors.password}
                  right={
                    <button
                      type="button" onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-2 grid h-8 w-8 place-items-center rounded-lg text-slate hover:bg-mint hover:text-ink"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />
              </Field>

              <button
                type="submit" disabled={testing}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-ok py-3.5 font-bold text-[#0f3b36] shadow-sm transition hover:brightness-95 active:scale-[0.99] disabled:opacity-70"
              >
                {testing
                  ? <span className="spin h-4 w-4 rounded-full border-2 border-ink/25 border-t-ink" aria-hidden="true" />
                  : <RefreshCw size={17} aria-hidden="true" />}
                {testing ? 'Testing…' : 'Test connection'}
              </button>

              <div key={status} role="status" aria-live="polite" className={`swap flex items-center gap-3 rounded-xl border p-3.5 ${st.card}`}>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{st.title}</p>
                  <p className="text-sm text-slate">{st.text}</p>
                </div>
                {st.pill && <span className="rounded-full bg-ok/40 px-2.5 py-0.5 text-xs font-semibold">{st.pill}</span>}
              </div>
            </form>
          </section>

          {/* right: detected cameras */}
          <section style={rise(2)} className="rise rounded-3xl border border-line bg-white p-6 shadow-[0_10px_40px_-12px_rgba(46,148,136,0.2)] lg:col-span-3" aria-labelledby="cams-h">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="cams-h" className="flex items-center gap-2 font-bold">
                  Detected cameras
                  {feeds.length > 0 && <span className="rounded-full bg-brand/25 px-2 py-0.5 text-xs font-semibold text-brand-ink">{feeds.length} found</span>}
                </h2>
                <p className="mt-1 max-w-md text-sm text-slate">
                  Pick the cameras to monitor. Each feed is checked to be live, not a replayed recording.
                </p>
              </div>
              <button
                type="button" onClick={findCameras} disabled={status !== 'connected'}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-mint disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={14} aria-hidden="true" /> Rescan
              </button>
            </div>

            <div className="mt-5 border-t border-line pt-5">
              {feeds.length === 0 ? (
                <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-mint/50 px-6 py-14 text-center">
                  {testing
                    ? <span className="spin mb-3 h-6 w-6 rounded-full border-2 border-brand-deep/25 border-t-brand-deep" aria-hidden="true" />
                    : <Video size={28} className="mb-3 text-slate" aria-hidden="true" />}
                  <p className="font-semibold">{testing ? 'Searching for cameras…' : 'Your cameras will appear here'}</p>
                  <p className="mt-1 text-sm text-slate">
                    {testing ? 'This takes a few seconds.' : 'Test the connection on the left to find them.'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {CAMERAS.filter((c) => feeds.includes(c.id)).map((c) => {
                    const ok = !!verified[c.id]
                    return (
                      <li key={c.id} className="swap rounded-2xl border border-line bg-white p-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox" checked={selected.includes(c.id)} disabled={!ok}
                            onChange={() => toggle(c.id)} aria-label={`Monitor ${c.name}`}
                            className="mt-1.5 h-4 w-4 accent-[#2e9488] disabled:opacity-40"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 font-semibold">
                              {c.name}
                              <span className="rounded-full bg-brand/25 px-2 py-0.5 text-xs font-semibold text-brand-ink">{c.zone}</span>
                            </p>
                            <p className="text-sm text-slate">{c.note}</p>
                          </div>
                          <span
                            className="flex shrink-0 items-center gap-1.5 text-sm font-semibold"
                            title="Confirms the feed is live and not a replayed recording"
                          >
                            <span className={`h-2 w-2 rounded-full ${ok ? 'bg-ok' : 'bg-warn motion-safe:animate-pulse'}`} aria-hidden="true" />
                            {ok ? (verified[c.id] === 'earlier' ? 'Feed verified' : `Verified ${verified[c.id]}`) : 'Checking feed…'}
                          </span>
                        </div>
                        <FeedTile cam={c} chip={ok ? c.preview : null} className="mt-3 h-36" />
                        <p className="mt-3 text-sm text-slate">Watches for: {c.checks.join(', ')}.</p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* privacy */}
        <section style={rise(3)} className="rise mt-6 flex items-start gap-4 rounded-2xl border border-line bg-white/80 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/25 text-brand-ink">
            <Lock size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold">Your video stays private</h2>
            <p className="mt-0.5 text-sm text-slate">
              AURA-Snap only analyzes the feed to check hygiene. We save check results and alert snapshots, not continuous video.
            </p>
          </div>
        </section>

        {/* navigation */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <button type="button" onClick={() => navigate('/staff')} className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-semibold text-slate hover:bg-white hover:text-ink">
            <ArrowLeft size={18} aria-hidden="true" /> Back to staff details
          </button>
          <div className="flex flex-wrap items-center justify-end gap-4">
            {navError && <p role="alert" className="text-sm text-bad-ink">{navError}</p>}
            <button
              type="button" onClick={goNext}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-ok px-6 py-3.5 font-bold text-[#0f3b36] shadow-sm transition hover:brightness-95 active:scale-[0.99]"
            >
              Save and continue
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </main>
    </>
  )
}