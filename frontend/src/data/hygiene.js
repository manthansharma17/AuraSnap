// Mock analysis results. Replace with your backend's API later; the tabs only read from here.
export const TARGET = 80

// Six FSSAI-based categories, scored from the CCTV checks
export const CATEGORIES = [
  { key: 'hygiene', name: 'Personal Hygiene', score: 96, ago: '4 min ago',
    rule: 'Clean uniforms, gloves, hairnets and regular handwashing.',
    detail: 'Gloves, hairnets and aprons were worn correctly in 96% of checks today.',
    tip: 'Keep gloves and hairnets stocked at every station.' },
  { key: 'floor', name: 'Floor & Surface Safety', score: 94, ago: '12 min ago',
    rule: 'Floors and work surfaces kept clean, dry and free of spills.',
    detail: 'No wet-floor alert is open. Surfaces were cleaned on schedule.',
    tip: 'Place a wet-floor sign as soon as a spill is cleaned.' },
  { key: 'cold', name: 'Cold Storage', score: 92, ago: '20 min ago',
    rule: 'Cold rooms kept closed and at safe temperatures.',
    detail: 'The cold room door was closed in 46 of 48 checks. No open-door alert in 72 hours.',
    tip: 'Remind staff to close the cold room door after every use.' },
  { key: 'oil', name: 'Cooking Oil Quality', score: 88, ago: '32 min ago',
    rule: 'Frying oil replaced before it breaks down (FSSAI limit: 25% total polar compounds).',
    detail: 'Dark oil was seen at Fryer 3. A filter change is due.',
    tip: 'Filter or replace the oil at Fryer 3 before the next service.' },
  { key: 'cross', name: 'Cross-Contamination Control', score: 84, ago: '1 hr ago',
    rule: 'Raw and cooked food kept apart, with separate boards and tools.',
    detail: 'Raw and cooked boards were mixed once at the Prep Station in the last 24 hours.',
    tip: 'Use colour-coded boards and keep raw items on a separate table.' },
  { key: 'pest', name: 'Pest Control', score: 68, ago: '28 min ago',
    rule: 'No signs of pests, with doors and drains kept sealed.',
    detail: 'Possible pest movement was seen near the Storage back door.',
    tip: 'Inspect the Storage back door and log a pest-control check today.' },
]

// 90+ passes, 75-89 needs review, below 75 fails
export function level(score) {
  if (score >= 90) return { key: 'good', label: 'Optimal', result: 'Pass', pill: 'bg-ok/40 text-ink', dot: 'bg-ok', bar: 'bg-ok' }
  if (score >= 75) return { key: 'warn', label: 'Needs attention', result: 'Review', pill: 'bg-warn/50 text-ink', dot: 'bg-warn', bar: 'bg-warn' }
  return { key: 'bad', label: 'Action needed', result: 'Fail', pill: 'bg-bad/40 text-bad-ink', dot: 'bg-bad', bar: 'bg-bad' }
}

export const overall = () => Math.round(CATEGORIES.reduce((a, c) => a + c.score, 0) / CATEGORIES.length) // 87
export const stars = (s) => (s >= 90 ? 5 : s >= 80 ? 4 : s >= 70 ? 3 : s >= 60 ? 2 : 1)

// Daily overall score for the last 30 days (last value = today)
const TREND_30 = [79, 80, 78, 81, 82, 81, 83, 84, 82, 81, 80, 82, 85, 86, 84, 83, 82, 81, 83, 85, 86, 88, 87, 85, 84, 83, 85, 86, 84, 87]

export function trend(days) {
  const now = new Date()
  return TREND_30.slice(-days).map((v, i, a) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (a.length - 1 - i))
    return { v, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
  })
}

// Recent checks. `ago` = minutes before the page opened. cam ids match data/cameras.js
export const LOG_SEED = [
  { id: 'l1', ago: 8, cam: 'cam-1', result: 'fail', msg: 'Gloves not worn while handling food' },
  { id: 'l2', ago: 19, cam: 'cam-2', result: 'pass', msg: 'Handwashing completed before prep' },
  { id: 'l3', ago: 28, cam: 'cam-3', result: 'fail', msg: 'Back door left open, possible pest entry' },
  { id: 'l4', ago: 41, cam: 'cam-4', result: 'pass', msg: 'Cutting boards separated correctly' },
  { id: 'l5', ago: 65, cam: 'cam-4', result: 'fail', msg: 'Raw and cooked boards used together' },
  { id: 'l6', ago: 82, cam: 'cam-1', result: 'pass', msg: 'Hairnets and aprons worn by all staff' },
  { id: 'l7', ago: 110, cam: 'cam-2', result: 'fail', fixedAgo: 96, msg: 'Wet floor near sink, no sign placed' },
  { id: 'l8', ago: 135, cam: 'cam-3', result: 'pass', msg: 'Cold room door closed after use' },
  { id: 'l9', ago: 160, cam: 'cam-1', result: 'pass', msg: 'Cooking oil colour within limit' },
  { id: 'l10', ago: 190, cam: 'cam-2', result: 'pass', msg: 'Dishes and sinks clean' },
]

// Alerts the manager marked as fixed: { logId: timestamp }
export function loadFixed() {
  try { return JSON.parse(localStorage.getItem('aura_fixed')) || {} } catch { return {} }
}
export function saveFixed(v) {
  try { localStorage.setItem('aura_fixed', JSON.stringify(v)) } catch { /* storage blocked */ }
}

// Downloads the compliance summary as a CSV file
export function downloadReport() {
  const rows = [['Category', 'Score', 'Result', 'Last checked']]
  CATEGORIES.forEach((c) => rows.push([`"${c.name}"`, c.score, level(c.score).result, c.ago]))
  rows.push(['Overall', overall(), overall() >= TARGET ? 'Pass' : 'Review', ''])
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' }))
  a.download = 'aura-snap-fssai-report.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}