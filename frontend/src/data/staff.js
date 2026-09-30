// Staff data + helpers. Later pages (Home > Staff Shift, alerts) read from here too.
export const ROLES = ['Manager', 'Supervisor', 'Chef', 'Kitchen staff', 'Cleaner']
export const AREAS = ['All areas', 'Prep Station', 'Cooking Line', 'Wash Area', 'Storage', 'Service Pass']

// Sample team so the demo never starts empty. Managers can remove or edit them.
export const SEED_STAFF = [
  { empId: 'EMP-1036', name: 'Anil Kulkarni', role: 'Manager', area: 'All areas', from: '09:00', to: '18:00', phone: '9827011122', email: 'anil@sunrisekitchen.in', notify: true },
  { empId: 'EMP-1037', name: 'Priya Nambiar', role: 'Supervisor', area: 'Wash Area', from: '08:00', to: '17:00', phone: '9827033445', email: '', notify: true },
  { empId: 'EMP-1038', name: 'Ramesh Yadav', role: 'Cleaner', area: 'Cooking Line', from: '06:00', to: '14:00', phone: '9827055667', email: '', notify: false },
]

export function loadStaff() {
  try {
    const saved = JSON.parse(localStorage.getItem('aura_staff'))
    return Array.isArray(saved) ? saved : SEED_STAFF
  } catch {
    return SEED_STAFF
  }
}

export function saveStaff(list) {
  try { localStorage.setItem('aura_staff', JSON.stringify(list)) } catch { /* storage blocked */ }
}

export const nextEmpId = (list) =>
  `EMP-${Math.max(1035, ...list.map((s) => parseInt(s.empId.slice(4), 10) || 0)) + 1}`

// "08:00" -> "8:00 AM"
export function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export const toMins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

// Is this person on shift at `date`? Handles night shifts that end after midnight.
export function inShift(s, date = new Date()) {
  const now = date.getHours() * 60 + date.getMinutes()
  const a = toMins(s.from), b = toMins(s.to)
  return a <= b ? now >= a && now < b : now >= a || now < b
}

// Who was working in this zone at this time? (used by the Logs tab)
export function onDutyAt(list, zone, date) {
  const on = list.filter((s) => inShift(s, date))
  return on.find((s) => s.area === zone) || on.find((s) => s.area === 'All areas') || null
}