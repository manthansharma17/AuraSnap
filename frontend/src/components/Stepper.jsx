import { Check } from 'lucide-react'

const STEPS = ['Account', 'Staff details', 'Cameras', 'Dashboard']

// current: 0-based index of the active step
export default function Stepper({ current }) {
  return (
    <ol className="flex flex-wrap items-center gap-y-2 text-sm">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center">
          <span
            className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
              i < current ? 'bg-brand text-ink' : i === current ? 'bg-ink text-white' : 'bg-line text-slate'
            }`}
          >
            {i < current ? <Check size={14} aria-hidden="true" /> : i + 1}
          </span>
          <span className={`ml-2 ${i === current ? 'font-semibold text-ink' : 'text-slate'}`}>{label}</span>
          {i < STEPS.length - 1 && <span className="mx-3 h-px w-6 bg-line" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  )
}