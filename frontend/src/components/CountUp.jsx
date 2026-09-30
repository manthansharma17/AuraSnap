import { useEffect, useState } from 'react'

// Number that counts up from 0 on load (skipped if the user prefers reduced motion)
export default function CountUp({ to, ms = 900 }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(to); return }
    let raf, start
    const tick = (t) => {
      start ??= t
      const p = Math.min((t - start) / ms, 1)
      setV(Math.round(to * (1 - (1 - p) ** 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return <>{v}</>
}