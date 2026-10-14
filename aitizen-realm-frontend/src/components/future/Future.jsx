import React from 'react'
import './Future.css'

export default function Future() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToInfo = () => {
    const el = document.getElementById('project-info')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="future" className="future-section" aria-label="The Future Manifesto">
      <div className="future-ambient-glow" />

      <div className="section-container future-content">
        <div className="future-badge">
          <span className="badge-pulse" />
          <span>06 // THE VISION</span>
        </div>

        <blockquote className="future-statement">
          <span className="statement-line">THE FUTURE IS NOT ABOUT</span>
          <span className="statement-line statement-line--dim">HUMANS OR MACHINES.</span>
          <span className="statement-line statement-line--gradient">
            IT IS ABOUT INTELLIGENCE WORKING WITH THE WORLD.
          </span>
        </blockquote>

        <div className="future-brand-banner">
          <div className="brand-logo-ring">
            <span className="brand-orb" />
          </div>
          <h3 className="future-realm-title">AITIZEN REALM</h3>
          <p className="future-tagline">
            “Where autonomous AI agents become a seamless, trustworthy part of everyday human life.”
          </p>
        </div>

        <div className="future-actions">
          <button type="button" className="future-btn-primary" onClick={scrollToInfo}>
            <span>VIEW PROJECT DOSSIER</span>
            <span className="btn-arrow">↓</span>
          </button>
          <button type="button" className="future-btn-secondary" onClick={scrollToTop}>
            <span>RETURN TO 3D HERO</span>
            <span className="btn-arrow">↑</span>
          </button>
        </div>
      </div>
    </section>
  )
}
