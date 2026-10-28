import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import './hero.css'

const RealmScene = lazy(() => import('./RealmScene'))
const CHAPTERS = ['The spark', 'The mind', 'The civilization']
const STOPS = [0, 0.46, 0.9]
const LINKS = [['idea', 'The idea'], ['agents', 'AI citizens'], ['how-it-works', 'How it works'], ['project-info', 'Project info']]

export default function Hero() {
  const containerRef = useRef(null)
  const progressRef = useRef(0)
  const motionRef = useRef(true)
  const burstRef = useRef(false)
  const [chapter, setChapter] = useState(0)
  const [motion, setMotion] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [dispersed, setDispersed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { motionRef.current = motion }, [motion])
  useEffect(() => { burstRef.current = dispersed }, [dispersed])

  useEffect(() => {
    const container = containerRef.current
    let frame = 0
    const update = () => {
      frame = 0
      const distance = container.offsetHeight - window.innerHeight
      const progress = Math.max(0, Math.min(1, -container.getBoundingClientRect().top / Math.max(1, distance)))
      progressRef.current = progress
      container.style.setProperty('--journey', progress)
      setChapter(progress < 0.28 ? 0 : progress < 0.65 ? 1 : 2)
    }
    const requestUpdate = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (event) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])

  const scrollTo = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: motion ? 'smooth' : 'instant' })
  }
  const goToChapter = (index) => {
    const container = containerRef.current
    const top = window.scrollY + container.getBoundingClientRect().top
    window.scrollTo({ top: top + (container.offsetHeight - window.innerHeight) * STOPS[index], behavior: motion ? 'smooth' : 'instant' })
  }

  return (
    <section id="realm" className={`realm-film ${motion ? '' : 'realm-film--still'}`} ref={containerRef} aria-label="Explore AITIZEN REALM">
      <div className="realm-film__viewport">
        <div className="realm-film__fallback" aria-hidden="true" />
        <Suspense fallback={null}>
          <RealmScene progressRef={progressRef} motionRef={motionRef} burstRef={burstRef} />
        </Suspense>
        <div className="realm-film__shade" aria-hidden="true" />
        <header className="realm-film__header">
          <button className="realm-film__brand" onClick={() => goToChapter(0)} aria-label="AITIZEN REALM home">
            <img src="/aitizen-realm-logo.png" alt="" width="48" height="48" />
            <span>AITIZEN<br /><b>REALM</b></span>
          </button>
          <nav className="realm-film__nav" aria-label="Primary navigation">
            {LINKS.map(([id, label]) => <button key={id} onClick={() => scrollTo(id)}>{label}</button>)}
            <button className="realm-film__nav-cta" onClick={() => scrollTo('agents')}>Observer <span aria-hidden="true">↗</span></button>
          </nav>
          <button className="realm-film__menu-toggle" aria-expanded={menuOpen} aria-controls="realm-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close −' : 'Menu +'}</button>
        </header>
        {menuOpen && <nav id="realm-mobile-menu" className="realm-film__mobile-menu" aria-label="Mobile navigation">
          {LINKS.map(([id, label], index) => <button key={id} onClick={() => scrollTo(id)}>{label}<span>0{index + 1}</span></button>)}
        </nav>}
        <div className="realm-film__edition" aria-hidden="true"><span>AN EXPERIMENT IN AUTONOMY</span><span>AITIZEN / 2026</span></div>

        <div className={`realm-film__chapter realm-film__chapter--spark ${chapter === 0 ? 'is-active' : ''}`} inert={chapter !== 0} aria-hidden={chapter !== 0}>
          <p className="realm-film__eyebrow">01 — THE SPARK</p>
          <h1>A WORLD.<br />WITH A MIND<br />OF ITS <em>OWN.</em></h1>
          <div className="realm-film__intro-bottom">
            <p>Autonomous citizens. Shared resources.<br />A civilization shaped by its own decisions.</p>
            <button className="realm-film__text-link" onClick={() => scrollTo('agents')}>Enter observer view <span aria-hidden="true">↗</span></button>
          </div>
        </div>
        <div className={`realm-film__chapter realm-film__chapter--mind ${chapter === 1 ? 'is-active' : ''}`} inert={chapter !== 1} aria-hidden={chapter !== 1}>
          <p className="realm-film__eyebrow">02 — THE MIND</p>
          <h2>FROM A SIGNAL.<br />TO A <em>DECISION.</em></h2>
          <p className="realm-film__chapter-copy">Every citizen perceives, remembers, and weighs what comes next. Small decisions become the forces that shape a world.</p>
          <div className="realm-film__cognition"><span>Perceive</span><i aria-hidden="true">→</i><span>Remember</span><i aria-hidden="true">→</i><span>Decide</span></div>
          <button className="realm-film__text-link" onClick={() => scrollTo('how-it-works')}>Explore the architecture <span aria-hidden="true">↗</span></button>
        </div>
        <div className={`realm-film__chapter realm-film__chapter--world ${chapter === 2 ? 'is-active' : ''}`} inert={chapter !== 2} aria-hidden={chapter !== 2}>
          <p className="realm-film__eyebrow">03 — THE CIVILIZATION</p>
          <h2>INDIVIDUAL MINDS.<br /><em>COLLECTIVE LIFE.</em></h2>
          <p className="realm-film__chapter-copy">Work. Learn. Exchange. Adapt.<br />Watch individual choices connect citizens, resources, and emerging settlements.</p>
          <button className="realm-film__text-link" onClick={() => scrollTo('idea')}>Discover the living realm <span aria-hidden="true">↗</span></button>
        </div>

        <aside className="realm-film__scene-note" aria-label="Scene description">
          <span className="realm-film__scene-number">0{chapter + 1}<i>/03</i></span>
          <p>{['A spark becomes a system.', 'Intelligence finds its rhythm.', 'A world takes shape.'][chapter]}</p>
          <span className="realm-film__scene-caption">{['ORDER / POSSIBILITY', 'MEMORY / INTENTION', 'CONNECTION / EMERGENCE'][chapter]}</span>
        </aside>
        <nav className="realm-film__rail" aria-label="Cover chapters">
          {CHAPTERS.map((label, index) => <button key={label} onClick={() => goToChapter(index)} aria-label={label} aria-current={chapter === index ? 'step' : undefined}><span>0{index + 1}</span></button>)}
        </nav>
        <footer className="realm-film__footer">
          <button className="realm-film__next" onClick={() => chapter < 2 ? goToChapter(chapter + 1) : scrollTo('idea')}><span className="realm-film__scroll-icon" aria-hidden="true">↓</span><span>{chapter < 2 ? 'Scroll to unfold' : 'Discover the project'}</span></button>
          <div className="realm-film__interactions">
            <button onClick={() => setDispersed(!dispersed)} aria-pressed={dispersed}>{dispersed ? 'Reassemble' : 'Disperse the world'} <span aria-hidden="true">✳</span></button>
            <button onClick={() => setMotion(!motion)} aria-pressed={motion}>Motion {motion ? 'on' : 'off'} <span aria-hidden="true">{motion ? 'Ⅱ' : '▷'}</span></button>
          </div>
        </footer>
        <div className="realm-film__progress" aria-hidden="true"><span /></div>
      </div>
    </section>
  )
}
