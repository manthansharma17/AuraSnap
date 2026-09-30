import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Pencil, Trash2, UserPlus } from 'lucide-react'
import TopBar from '../components/TopBar'
import Stepper from '../components/Stepper'
import { Field, Select, inputCls } from '../components/Field'
import { AREAS, ROLES, fmtTime, loadStaff, nextEmpId, saveStaff } from '../data/staff'

/* ---------- helpers ---------- */
const PHONE = /^(\+91)?[6-9]\d{9}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const cleanPhone = (s) => s.replace(/[\s-]/g, '')
const rise = (n) => ({ animationDelay: `${n * 90}ms` })

const blank = (list) => ({
  empId: nextEmpId(list), name: '', role: 'Chef', area: 'Cooking Line',
  from: '08:00', to: '17:00', phone: '', email: '', notify: true,
})

function validate(f) {
  const e = {}
  if (f.name.trim().length < 2) e.name = 'Enter the full name.'
  if (!f.from) e.from = 'Set the shift start time.'
  if (!f.to) e.to = 'Set the shift end time.'
  else if (f.from === f.to) e.to = 'Shift end must be different from shift start.'
  const p = cleanPhone(f.phone)
  if (!p) e.phone = 'Enter a contact number.'
  else if (!PHONE.test(p)) e.phone = 'Enter a valid 10-digit mobile number.'
  if (f.email.trim() && !EMAIL.test(f.email.trim())) e.email = 'Enter a valid email address.'
  return e
}

const initials = (name) => name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const TONES = ['bg-brand/30', 'bg-warn/50', 'bg-ok/40', 'bg-bad/30']
const tone = (id) => TONES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length]

/* ---------- page ---------- */
export default function StaffDetailsPage() {
  const navigate = useNavigate()
  const formRef = useRef(null)
  const flashTimer = useRef(null)

  const [staff, setStaff] = useState(loadStaff)
  const [form, setForm] = useState(() => blank(loadStaff()))
  const [editingId, setEditingId] = useState(null)
  const [errors, setErrors] = useState({})
  const [flash, setFlash] = useState('')
  const [navError, setNavError] = useState('')
  const [progress, setProgress] = useState(0)

  // progress bar fills in once on load: step 2 of 4 = 50%
  useEffect(() => {
    const t = setTimeout(() => setProgress(50), 150)
    return () => { clearTimeout(t); clearTimeout(flashTimer.current) }
  }, [])

  const showFlash = (msg) => {
    setFlash(msg)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(''), 2600)
  }

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
  }

  // validate the form, then add (or update) the member. Returns the new list, or null if invalid.
  const commit = () => {
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) return null

    const member = { ...form, name: form.name.trim(), email: form.email.trim(), phone: cleanPhone(form.phone) }
    const next = editingId
      ? staff.map((s) => (s.empId === editingId ? member : s))
      : [...staff, member]

    setStaff(next)
    saveStaff(next)
    setForm(blank(next))
    setEditingId(null)
    setNavError('')
    showFlash(`${member.name} ${editingId ? 'updated.' : 'added to your team.'}`)
    return next
  }

  const startEdit = (m) => {
    setForm({ ...m })
    setEditingId(m.empId)
    setErrors({})
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const cancelEdit = () => {
    setForm(blank(staff))
    setEditingId(null)
    setErrors({})
  }

  const remove = (m) => {
    const next = staff.filter((s) => s.empId !== m.empId)
    setStaff(next)
    saveStaff(next)
    if (editingId === m.empId) {
      setForm(blank(next))
      setEditingId(null)
      setErrors({})
    }
    showFlash(`${m.name} removed.`)
  }

  const goNext = () => {
    let list = staff
    // if the form has someone half-typed, save them first
    if (editingId || form.name.trim() || form.phone.trim() || form.email.trim()) {
      const next = commit()
      if (!next) return
      list = next
    }
    if (!list.length) return setNavError('Add at least one team member to continue.')
    navigate('/network')
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        {/* heading + progress */}
        <div style={rise(0)} className="rise">
          <Stepper current={1} />
          <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-xl">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Add your team</h1>
              <p className="mt-2 leading-relaxed text-slate">
                Tell us who works in your kitchen and when. When a hygiene alert is logged, AURA-Snap shows who was on duty in that area.
              </p>
            </div>
            <span className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-brand-ink">Step 2 of 4</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={50} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-ok transition-[width] duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* team so far */}
        <section style={rise(1)} className="rise mt-8" aria-labelledby="team-h">
          <div className="mb-3 flex min-h-6 items-center justify-between">
            <h2 id="team-h" className="font-bold">Your team ({staff.length})</h2>
            {flash && (
              <p role="status" className="swap flex items-center gap-1.5 text-sm font-semibold text-brand-ink">
                <Check size={16} aria-hidden="true" /> {flash}
              </p>
            )}
          </div>

          {staff.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-white/60 p-6 text-center text-slate">
              No team members yet. Add your first person below.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {staff.map((m) => (
                <li key={m.empId} className="swap flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
                  <span aria-hidden="true" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${tone(m.empId)}`}>
                    {initials(m.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {m.name}
                      <span className="rounded-full bg-brand/25 px-2 py-0.5 text-xs font-semibold text-brand-ink">{m.role}</span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate">
                      <span>{m.area}</span>
                      <span>{fmtTime(m.from)} to {fmtTime(m.to)}</span>
                      <span className="rounded bg-warn/40 px-1.5 text-xs font-semibold text-ink">{m.empId}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(m)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-mint">
                      <Pencil size={14} aria-hidden="true" /> Edit
                    </button>
                    <button type="button" onClick={() => remove(m)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-bad-ink hover:bg-bad/20">
                      <Trash2 size={14} aria-hidden="true" /> Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* add / edit form */}
        <section
          ref={formRef}
          style={rise(2)}
          className="rise mt-8 scroll-mt-24 rounded-3xl border border-line bg-white p-6 shadow-[0_10px_40px_-12px_rgba(46,148,136,0.2)] sm:p-8"
        >
          <h2 className="text-xl font-bold">{editingId ? `Edit ${form.name || 'team member'}` : 'New team member'}</h2>
          <p className="mt-1 text-slate">Basic details, so alerts reach the right person for each area.</p>

          <form
            onSubmit={(e) => { e.preventDefault(); commit() }}
            noValidate
            className="mt-6 grid gap-5 border-t border-line pt-6 sm:grid-cols-2"
          >
            <Field id="name" label="Full name" hint="Required" error={errors.name}>
              <input id="name" name="name" value={form.name} onChange={onChange} placeholder="e.g. Vikram Sharma" autoComplete="off" aria-invalid={!!errors.name} className={inputCls(errors.name)} />
            </Field>
            <Field id="empId" label="Staff ID" hint="Auto-assigned">
              <input id="empId" value={form.empId} readOnly className={`${inputCls(false)} bg-mint text-slate`} />
            </Field>

            <Field id="role" label="Role">
              <Select id="role" value={form.role} onChange={onChange} options={ROLES} />
            </Field>
            <Field id="area" label="Kitchen area">
              <Select id="area" value={form.area} onChange={onChange} options={AREAS} />
            </Field>

            <Field id="from" label="Shift starts" error={errors.from}>
              <input id="from" name="from" type="time" value={form.from} onChange={onChange} aria-invalid={!!errors.from} className={inputCls(errors.from)} />
            </Field>
            <Field id="to" label="Shift ends" error={errors.to}>
              <input id="to" name="to" type="time" value={form.to} onChange={onChange} aria-invalid={!!errors.to} className={inputCls(errors.to)} />
            </Field>
            <p className="-mt-2 text-sm text-slate sm:col-span-2">
              Used to show who was on duty when an alert is logged. Night shifts that end after midnight are fine.
            </p>

            <Field id="phone" label="Contact phone" error={errors.phone}>
              <input id="phone" name="phone" type="tel" value={form.phone} onChange={onChange} placeholder="98270 11122" autoComplete="off" aria-invalid={!!errors.phone} className={inputCls(errors.phone)} />
            </Field>
            <Field id="email" label="Email" hint="Optional" error={errors.email}>
              <input id="email" name="email" type="email" value={form.email} onChange={onChange} placeholder="vikram@yourkitchen.in" autoComplete="off" aria-invalid={!!errors.email} className={inputCls(errors.email)} />
            </Field>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-mint/60 p-4 sm:col-span-2">
              <input type="checkbox" name="notify" checked={form.notify} onChange={onChange} className="mt-1 h-4 w-4 accent-[#2e9488]" />
              <span>
                <span className="block text-sm font-semibold">Send alerts to this person</span>
                <span className="block text-sm text-slate">Notify them when a hygiene check fails in their area, so it can be fixed quickly.</span>
              </span>
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-deep/50 py-3.5 font-bold text-brand-ink transition-colors hover:border-brand-deep hover:bg-brand/15"
              >
                <UserPlus size={18} aria-hidden="true" />
                {editingId ? 'Update team member' : 'Add to team'}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="mx-auto mt-3 block text-sm font-semibold text-slate underline-offset-2 hover:text-ink hover:underline">
                  Cancel editing
                </button>
              )}
            </div>
          </form>
        </section>

        {/* continue */}
        <div className="mt-8 flex flex-wrap items-center justify-end gap-4 border-t border-line pt-6">
          {navError && <p role="alert" className="mr-auto text-sm text-bad-ink">{navError}</p>}
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-ok px-6 py-3.5 font-bold text-[#0f3b36] shadow-sm transition hover:brightness-95 active:scale-[0.99]"
          >
            Save and continue
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </main>
    </>
  )
}