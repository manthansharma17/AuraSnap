import { useEffect, useRef, useState } from 'react'

// Hand-drawn SVG chart, so no chart library needs installing.
const W = 640, H = 240, PL = 38, PR = 14, PT = 14, PB = 28, MIN = 60, MAX = 100

// Smooth curve through the points (Catmull-Rom converted to bezier)
function smooth(pts) {
  return pts.reduce((d, p, i, a) => {
    if (i === 0) return `M${p[0]},${p[1]}`
    const p0 = a[i - 2] || a[i - 1], p1 = a[i - 1], p3 = a[i + 1] || p
    const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6]
    const c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6]
    return `${d} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p[0]},${p[1]}`
  }, '')
}

export default function TrendChart({ data, target }) {
  const line = useRef(null)
  const [hover, setHover] = useState(null)
  const n = data.length
  const x = (i) => PL + (i * (W - PL - PR)) / (n - 1)
  const y = (v) => PT + (1 - (v - MIN) / (MAX - MIN)) * (H - PT - PB)
  const d = smooth(data.map((p, i) => [x(i), y(p.v)]))
  const area = `${d} L${x(n - 1)},${H - PB} L${x(0)},${H - PB} Z`

  // draw the line in from left to right whenever the range changes
  useEffect(() => {
    const p = line.current
    if (!p) return
    const len = p.getTotalLength()
    p.style.transition = 'none'
    p.style.strokeDasharray = len
    p.style.strokeDashoffset = len
    p.getBoundingClientRect()
    p.style.transition = 'stroke-dashoffset 1.1s ease-out'
    p.style.strokeDashoffset = 0
  }, [data])

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - PL) / (W - PL - PR)) * (n - 1)))))
  }

  const h = hover ?? n - 1
  const tx = Math.min(Math.max(x(h) - 46, PL), W - PR - 92)
  const ticks = [60, 70, 80, 90, 100]
  const labels = [[0, 'start'], [Math.floor((n - 1) / 2), 'middle'], [n - 1, 'end']]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Hygiene score over the last ${n} days`}
      className="w-full touch-none select-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ccfc4" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7ccfc4" stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="#e3efec" />
          <text x={PL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5b6673">{t}</text>
        </g>
      ))}

      <path key={n} d={area} fill="url(#trendFill)" className="swap" />

      <line x1={PL} x2={W - PR} y1={y(target)} y2={y(target)} stroke="#2e9488" strokeDasharray="5 5" strokeOpacity="0.7" />
      <text x={W - PR} y={y(target) - 6} textAnchor="end" fontSize="11" fontWeight="600" fill="#1f6f65">Target {target}</text>

      <path ref={line} d={d} fill="none" stroke="#2e9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {labels.map(([i, anchor]) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor={anchor} fontSize="11" fill="#5b6673">{data[i].label}</text>
      ))}

      {hover !== null && <line x1={x(h)} x2={x(h)} y1={PT} y2={H - PB} stroke="#2e9488" strokeOpacity="0.35" />}
      <circle cx={x(h)} cy={y(data[h].v)} r="5.5" fill="#fff" stroke="#2e9488" strokeWidth="3" />

      {hover !== null && (
        <g>
          <rect x={tx} y={PT - 2} width="92" height="24" rx="8" fill="#1f2937" />
          <text x={tx + 46} y={PT + 14} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">
            {data[h].label}: {data[h].v}%
          </text>
        </g>
      )}
    </svg>
  )
}