import { ChevronDown } from 'lucide-react'

// Shared form pieces (used by Staff Details, Network and later Settings)
export const inputCls = (err) =>
  `w-full rounded-xl border bg-white px-3.5 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-slate/60 focus:border-brand-deep focus:ring-2 focus:ring-brand/40 ${
    err ? 'border-bad' : 'border-line'
  }`

export function Field({ id, label, hint, error, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-semibold text-ink">
        {label}
        {hint && <span className="text-xs font-normal text-slate">{hint}</span>}
      </label>
      {children}
      {error && <p role="alert" className="mt-1.5 text-sm text-bad-ink">{error}</p>}
    </div>
  )
}

export function Select({ id, value, onChange, options }) {
  return (
    <div className="relative">
      <select id={id} name={id} value={value} onChange={onChange} className={`${inputCls(false)} appearance-none pr-10`}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={18} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate" />
    </div>
  )
}