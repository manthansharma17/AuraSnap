import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Droplets, Eye, EyeOff, FileCheck2, Lock, Mail, ShieldCheck, Zap,
} from 'lucide-react'

/* ---------- helpers (prototype auth: everything lives in localStorage) ---------- */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^(\+91)?[6-9]\d{9}$/
const DEMO = { name: 'Demo Kitchen', id: 'demo@aurasnap.in', password: 'demo123' }

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage blocked */ }
}
const normId = (s) => s.trim().toLowerCase().replace(/[\s-]/g, '')

function validate(mode, f) {
  const e = {}
  if (mode === 'register' && f.name.trim().length < 2) e.name = 'Enter your restaurant or hotel name.'
  const id = normId(f.id)
  if (!id) e.id = 'Enter your work email or phone number.'
  else if (!EMAIL.test(id) && !PHONE.test(id)) e.id = 'Enter a valid email or a 10-digit phone number.'
  if (!f.password) e.password = 'Enter your password.'
  else if (f.password.length < 6) e.password = 'Password must be at least 6 characters.'
  if (mode === 'register' && f.confirm !== f.password) e.confirm = 'Passwords do not match.'
  return e
}

const rise = (n) => ({ animationDelay: `${n * 90}ms` })

/* ---------- small pieces ---------- */
function Field({ id, label, icon: Icon, error, right, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>
      <div
        className={`relative flex items-center rounded-xl border bg-white transition-colors focus-within:border-brand-deep focus-within:ring-2 focus-within:ring-brand/40 ${
          error ? 'border-bad' : 'border-line'
        }`}
      >
        <Icon size={18} className="pointer-events-none absolute left-3.5 text-slate" aria-hidden="true" />
        <input
          id={id}
          name={id}
          aria-invalid={!!error}
          className="w-full bg-transparent py-3 pl-11 pr-11 text-[15px] text-ink outline-none placeholder:text-slate/60"
          {...props}
        />
        {right}
      </div>
      {error && <p role="alert" className="mt-1.5 text-sm text-bad-ink">{error}</p>}
    </div>
  )
}

function Chip({ icon: Icon, children, delay }) {
  return (
    <li
      style={rise(delay)}
      className="rise flex items-center gap-2 rounded-full border border-line bg-white/80 px-3.5 py-2 text-sm font-medium text-ink"
    >
      <Icon size={15} className="text-brand-deep" aria-hidden="true" />
      {children}
    </li>
  )
}

/* ---------- page ---------- */
export default function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ name: '', id: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shaking, setShaking] = useState(false)

  const isRegister = mode === 'register'

  const switchMode = (next) => {
    if (next === mode) return
    setMode(next)
    setErrors({})
    setFormError('')
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
    if (formError) setFormError('')
  }

  const shake = () => {
    setShaking(true)
    setTimeout(() => setShaking(false), 450)
  }

  const fail = (msg) => {
    setLoading(false)
    setFormError(msg)
    shake()
  }

  const startSession = (user) => {
    write('aura_session', { name: user.name, id: user.id })
    navigate('/staff')
  }

  const submit = (ev) => {
    ev.preventDefault()
    const errs = validate(mode, form)
    setErrors(errs)
    setFormError('')
    if (Object.keys(errs).length) return shake()

    setLoading(true)
    setTimeout(() => {
      const saved = read('aura_users', [])
      const id = normId(form.id)
      if (!isRegister) {
        const user = [DEMO, ...saved].find((u) => normId(u.id) === id && u.password === form.password)
        return user ? startSession(user) : fail('Email/phone or password is incorrect. Check both and try again.')
      }
      if ([DEMO, ...saved].some((u) => normId(u.id) === id)) {
        return fail('This email or phone already has an account. Switch to Sign in.')
      }
      const user = { name: form.name.trim(), id, password: form.password }
      write('aura_users', [...saved, user])
      startSession(user)
    }, 700)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-mint px-5 py-12">
      {/* soft background glow */}
      <div aria-hidden="true" className="blob pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand/25 blur-3xl" />
      <div aria-hidden="true" className="blob pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-warn/30 blur-3xl [animation-delay:-7s]" />

      <div className="relative mx-auto flex max-w-xl flex-col items-center text-center">
        <div style={rise(0)} className="rise grid h-16 w-16 place-items-center rounded-2xl border border-line bg-white shadow-sm">
          <Droplets size={30} className="breathe text-brand-deep" aria-hidden="true" />
        </div>

        <p style={rise(1)} className="rise mt-4 text-xl font-extrabold tracking-tight">
          AURA-Snap
          <span className="ml-2 rounded-full bg-brand/30 px-2.5 py-0.5 align-middle text-xs font-semibold text-brand-deep">Hygiene</span>
        </p>

        <p style={rise(2)} className="rise mt-4 rounded-full border border-line bg-white/80 px-4 py-1.5 text-sm text-slate">
          Aligned with FSSAI food safety standards
        </p>

        <h1 style={rise(3)} className="rise mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
          Automated kitchen hygiene,
          <br />
          <span className="text-brand-deep">made effortless.</span>
        </h1>

        <p style={rise(4)} className="rise mt-4 max-w-md text-base leading-relaxed text-slate">
          Keep your kitchen clean, safe and inspection-ready using the CCTV cameras you already have. No extra hardware required.
        </p>

        <ul className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Chip icon={Zap} delay={5}>5-minute setup</Chip>
          <Chip icon={Lock} delay={5.5}>Private and secure</Chip>
          <Chip icon={FileCheck2} delay={6}>Automated compliance reports</Chip>
        </ul>

        {/* form card */}
        <section
          style={rise(7)}
          className={`rise mt-8 w-full max-w-[440px] rounded-3xl border border-line bg-white p-6 text-left shadow-[0_10px_40px_-12px_rgba(46,148,136,0.25)] ${shaking ? 'shake' : ''}`}
        >
          {/* Sign in / Create account toggle with sliding pill */}
          <div role="tablist" className="relative grid grid-cols-2 rounded-xl border border-line bg-mint p-1">
            <span
              aria-hidden="true"
              className="absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out"
              style={{ transform: isRegister ? 'translateX(100%)' : 'translateX(0)' }}
            />
            {[['login', 'Sign in'], ['register', 'Create account']].map(([key, text]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => switchMode(key)}
                className={`relative z-10 rounded-lg py-2.5 text-sm font-bold transition-colors ${
                  mode === key ? 'text-ink' : 'text-slate hover:text-ink'
                }`}
              >
                {text}
              </button>
            ))}
          </div>

          <form onSubmit={submit} noValidate className="mt-5">
            <div key={mode} className="swap space-y-4">
              {isRegister && (
                <Field
                  id="name" label="Restaurant or hotel name" icon={Building2}
                  placeholder="e.g. Sunrise Kitchen, Indore" autoComplete="organization"
                  value={form.name} onChange={onChange} error={errors.name}
                />
              )}
              <Field
                id="id" label="Work email or phone" icon={Mail}
                placeholder="chef@restaurant.com" autoComplete="username"
                value={form.id} onChange={onChange} error={errors.id}
              />
              <Field
                id="password" label="Password" icon={Lock}
                type={showPw ? 'text' : 'password'}
                placeholder="At least 6 characters"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={form.password} onChange={onChange} error={errors.password}
                right={
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-2 grid h-8 w-8 place-items-center rounded-lg text-slate hover:bg-mint hover:text-ink"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              {isRegister && (
                <Field
                  id="confirm" label="Confirm password" icon={ShieldCheck}
                  type={showPw ? 'text' : 'password'} placeholder="Re-enter your password"
                  autoComplete="new-password"
                  value={form.confirm} onChange={onChange} error={errors.confirm}
                />
              )}
            </div>

            {formError && (
              <p role="alert" className="mt-4 rounded-xl border border-bad bg-bad/20 px-3.5 py-2.5 text-sm text-bad-ink">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-ok py-3.5 font-bold text-[#0f3b36] shadow-sm transition hover:brightness-95 active:scale-[0.99] disabled:opacity-70"
            >
              {loading && <span className="spin h-4 w-4 rounded-full border-2 border-ink/25 border-t-ink" aria-hidden="true" />}
              {loading
                ? (isRegister ? 'Creating account…' : 'Signing in…')
                : (isRegister ? 'Create account' : 'Sign in to dashboard')}
            </button>

            {!isRegister && (
              <p className="mt-3 text-center text-xs text-slate">
                Demo login: demo@aurasnap.in / demo123
              </p>
            )}
          </form>
        </section>

        <p style={rise(8)} className="rise mt-6 max-w-sm text-sm text-slate">
          Works with Hikvision, Dahua, CP Plus, Axis and standard IP cameras.
        </p>
      </div>
    </main>
  )
}