import { useEffect, useRef } from 'react'
import './SectionMotion.css'

// Decorative only: the existing section text and controls remain normal HTML.
export default function SectionMotion({ variant }) {
  const viewRef = useRef(null)

  useEffect(() => {
    const view = viewRef.current
    let cancelled = false
    let unregister
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      import('./sectionMotionEngine').then(({ registerSectionView }) => {
        if (!cancelled) unregister = registerSectionView(view, variant)
      }).catch(() => {
        // Keep the CSS illustration and all content usable if WebGL cannot load.
      })
    }, { rootMargin: '500px' })
    observer.observe(view)
    return () => {
      cancelled = true
      observer.disconnect()
      unregister?.()
    }
  }, [variant])

  return (
    <div className={`chapter-visual chapter-visual--${variant}`} ref={viewRef} aria-hidden="true">
      <div className="chapter-visual__fallback"><i /><i /><i /></div>
      <div className="chapter-visual__horizon" />
    </div>
  )
}
