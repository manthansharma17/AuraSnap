import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, ArrowLeft, ArrowRight, BadgeCheck, ClipboardCheck, Eye, KeyRound, RotateCcw, Users, Video, X,
} from 'lucide-react'

// The whole product in 7 steps, following the workflow: CCTV -> verify -> AI check -> pass/fail -> alerts -> reports
const STEPS = [
  { icon: KeyRound, title: 'Create your account', to: '/', text: 'Sign up with your restaurant or hotel name. It takes a minute, and there is no new hardware to buy.' },
  { icon: Users, title: 'Add your team', to: '/staff', text: 'Add managers, chefs and cleaners with their shifts, so every alert shows who was on duty.' },
  { icon: Video, title: 'Connect your cameras', to: '/network', text: 'AURA-Snap reads the CCTV you already have. Each feed is verified as live, not a replayed recording.' },
  { icon: Eye, title: 'AI checks your kitchen', to: '/home?tab=live', text: 'It watches for gloves, hairnets, spills, oil and pests against FSSAI hygiene rules. Every check ends in a pass or a fail.' },
  { icon: ClipboardCheck, title: 'Fix alerts fast', to: '/home?tab=logs', text: 'A fail raises an alert. Mark it as fixed once the issue is sorted, and the score updates.' },
  { icon: Activity, title: 'Track your score', to: '/home', text: 'See the hygiene trend, the Clean Board and FSSAI compliance on one page.' },
  { icon: BadgeCheck, title: 'Show customers you are clean', to: '/home?tab=score', text: 'Get a Clean Score badge and an inspection report, ready for customers and inspectors.' },
]
const TINTS = ['from-warn/40 to-white', 'from-brand/35 to-white', 'from-ok/40 to-white', 'from-bad/25 to-white']

// Floating button on every page after login: opens a step-by-step tour of the whole product
export default function TourButton() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const [seen, setSeen] = useState(() => {
    try { return !!localStorage.getItem('aura_tour_seen') } catch { return true }
  })

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const toggle = () => {
    setOpen((o) => !o)
    if (!seen) {
      setSeen(true)
      try { localStorage.setItem('aura_tour_seen', '1') } catch { /* ignore */ }
    }
  }

  const step = STEPS[i]
  const Icon = step.icon
  const last = i === STEPS.length - 1

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div role="dialog" aria-label="System tour" className="rise w-[min(92vw,380px)] rounded-3xl border border-line bg-white p-5 shadow-[0_20px_60px_-15px_rgba(31,41,55,0.35)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-ink">Step {i + 1} of {STEPS.length}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close tour" className="grid h-8 w-8 place-items-center rounded-lg text-slate hover:bg-mint hover:text-ink">
              <X size={18} />
            </button>
          </div>

          <div key={i} className="swap">
            <div className={`mt-3 grid h-32 place-items-center rounded-2xl bg-gradient-to-br ${TINTS[i % TINTS.length]}`}>
              <Icon size={52} strokeWidth={1.4} className="text-ink/70" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate">{step.text}</p>
          </div>

          <button type="button" onClick={() => navigate(step.to)} className="mt-4 w-full rounded-xl border border-line py-2.5 text-sm font-semibold hover:bg-mint">
            Open this page
          </button>

          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={() => setI(i - 1)} disabled={i === 0} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate hover:text-ink disabled:opacity-40">
              <ArrowLeft size={15} aria-hidden="true" /> Back
            </button>
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, k) => (
                <button
                  key={k} type="button" onClick={() => setI(k)} aria-label={`Go to step ${k + 1}`}
                  className={`h-2 rounded-full transition-all ${k === i ? 'w-5 bg-brand-deep' : 'w-2 bg-line hover:bg-slate/40'}`}
                />
              ))}
            </div>
            {last ? (
              <button type="button" onClick={() => setI(0)} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-brand-ink">
                <RotateCcw size={15} aria-hidden="true" /> Restart
              </button>
            ) : (
              <button type="button" onClick={() => setI(i + 1)} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-brand-ink">
                Next <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button" onClick={toggle} aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-lg transition hover:bg-mint active:scale-[0.98]"
      >
        <span className="relative grid h-2.5 w-2.5 place-items-center" aria-hidden="true">
          {!seen && <span className="absolute h-full w-full rounded-full bg-brand-deep/60 motion-safe:animate-ping" />}
          <span className="h-2.5 w-2.5 rounded-full bg-brand-deep" />
        </span>
        {open ? 'Close tour' : 'Interactive system tour'}
        {open ? <X size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
      </button>
    </div>
  )
}