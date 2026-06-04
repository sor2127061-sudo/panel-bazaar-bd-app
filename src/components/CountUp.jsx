import { useEffect, useRef, useState } from 'react'

export default function CountUp({ value, prefix = '৳', duration = 800 }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    const start = prev.current
    const end = Number(value) || 0
    prev.current = end
    if (start === end) { setDisplay(end); return }

    const startTime = performance.now()
    let raf

    function step(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return (
    <span>
      {prefix}
      {display.toLocaleString('bn-BD')}
    </span>
  )
}
