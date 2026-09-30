// Cameras the (mock) recorder reports. `zone` matches the AREAS list in staff.js and the Map tab zones.
export const CAMERAS = [
  {
    id: 'cam-1', name: 'Kitchen Cam 1', zone: 'Cooking Line',
    note: 'Main stove and grill area',
    checks: ['Gloves and hairnets', 'Cooking oil', 'Stove and chimney'],
    preview: 'Gloves worn: pass', tint: 'from-warn/40 to-white',
  },
  {
    id: 'cam-2', name: 'Wash Station Cam 2', zone: 'Wash Area',
    note: 'Sinks, dishes and pot cleaning',
    checks: ['Handwashing', 'Dish and sink cleanliness', 'Floor spills'],
    preview: 'Sink area: clean', tint: 'from-brand/35 to-white',
  },
  {
    id: 'cam-3', name: 'Storage Cam 3', zone: 'Storage',
    note: 'Cold storage and dry pantry',
    checks: ['Cross-contamination', 'Pest signs', 'Shelves and floor'],
    preview: 'Shelves: clear', tint: 'from-ok/40 to-white',
  },
  {
    id: 'cam-4', name: 'Prep Cam 4', zone: 'Prep Station',
    note: 'Cutting boards and prep tables',
    checks: ['Cutting board separation', 'Gloves and hairnets', 'Surface cleaning'],
    preview: 'Surfaces: clean', tint: 'from-bad/25 to-white',
  },
]

// Values for the "Use demo values" link (the connection test is simulated)
export const DEMO_LOGIN = {
  url: 'rtsp://192.168.1.120:554/live/ch1', port: '554', username: 'kitchen_nvr', password: 'demo1234',
}

// Saved when the manager continues. The password is never stored.
export function loadNetwork() {
  try { return JSON.parse(localStorage.getItem('aura_network')) } catch { return null }
}
export function saveNetwork(data) {
  try { localStorage.setItem('aura_network', JSON.stringify(data)) } catch { /* storage blocked */ }
}
// Cameras the manager chose to monitor (for Home and the Map tab)
export const getSelectedCameras = () => {
  const ids = loadNetwork()?.selected ?? []
  return CAMERAS.filter((c) => ids.includes(c.id))
}