import SectionMotion from '../sectionMotion/SectionMotion'
import { useState } from 'react'
import './HumanWorld.css'

const DOMAINS = [
  {
    id: 'home',
    title: 'HOME & DOMESTIC LIFE',
    icon: '🏡',
    tag: 'SPATIAL CO-LIVING',
    headline: 'Autonomous Habitat Management',
    desc: 'Managing interior climate, appliances, groceries, ambient lighting, and domestic security with subtle, non-intrusive awareness of human presence and preferences.',
    highlight: 'Contextual adaptation: Dims lights and softens acoustic feedback when occupants are resting; pre-ventilates kitchen during cooking.',
    telemetry: 'Connected Sensors: 18 Nodes // Ambient Noise: 28dB'
  },
  {
    id: 'work',
    title: 'WORK & COLLABORATION',
    icon: '💼',
    tag: 'INTELLIGENT CO-WORKER',
    headline: 'Cross-Disciplinary Project Synergist',
    desc: 'Synthesizing technical documents, coordinating cross-time-zone sprints, orchestrating design iterations, and handling logistical friction so humans can focus on high-order creativity.',
    highlight: 'Real-time synthesis: Automatically turns messy whiteboard photographs into structured architecture diagrams and task backlogs.',
    telemetry: 'Synthesis Rate: 1.2M tokens/s // Sync Status: 100%'
  },
  {
    id: 'education',
    title: 'EDUCATION & LEARNING',
    icon: '🎓',
    tag: 'SOCRATIC MENTOR',
    headline: 'Personalized Pedagogical Partner',
    desc: 'Adapts instructional depth, pace, and analogies to individual cognitive learning styles—whether teaching quantum mechanics or conversational languages.',
    highlight: 'Scaffolded reasoning: Never just hands out the answer; guides the student with inquiry-based hints to cultivate true mastery.',
    telemetry: 'Cognitive Model: Bayesian Knowledge Tracing'
  },
  {
    id: 'transport',
    title: 'TRANSPORT & TRANSIT',
    icon: '🚆',
    tag: 'URBAN MOBILITY',
    headline: 'Multi-Modal Commute Logistics',
    desc: 'Navigating train connections, autonomous rideshares, walking routes, weather advisories, and sudden transit delays with zero manual micro-management.',
    highlight: 'Predictive rerouting: If rainfall is imminent, reserves a sheltered transit connection 15 minutes before the first drop hits.',
    telemetry: 'Multi-Modal ETA Precision: ±45 seconds'
  },
  {
    id: 'communication',
    title: 'COMMUNICATION & EMPATHY',
    icon: '🤝',
    tag: 'NATURAL DIALOGUE',
    headline: 'Empathetic Human Interaction',
    desc: 'Understanding nuanced emotional intonations, situational stressors, cultural formalities, and human social conventions with respectful alignment.',
    highlight: 'Gentle presence: Knows when to offer advice, when to stay silent, and how to communicate without causing cognitive fatigue.',
    telemetry: 'Pragmatic Social Alignment: Verified'
  },
  {
    id: 'routines',
    title: 'DAILY ROUTINES & WELLNESS',
    icon: '🌱',
    tag: 'LIFELONG WELLNESS',
    headline: 'Rhythm & Vitality Equilibrium',
    desc: 'Supporting balanced circadian rhythms, gentle hydration reminders, medication adherence, and restorative mindfulness amidst demanding days.',
    highlight: 'Biometric harmony: Syncs lighting warmth to the human melatonin cycle, fostering natural restorative rest.',
    telemetry: 'Circadian Phase Tracking: Active'
  }
]

export default function HumanWorld() {
  const [activeDomain, setActiveDomain] = useState(DOMAINS[0])

  return (
    <section id="human-world" className="hw-section" aria-label="The Human World">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span className="badge-pulse badge-pulse--warm" />
            <span>04 // EVERYDAY CONTEXTS</span>
          </div>
          <h2 className="section-title">
            AI IN THE <br />
            <span className="text-gradient-warm">HUMAN WORLD.</span>
          </h2>
          <p className="section-description">
            Aitizen Realm does not exist in an abstract digital vacuum. Our agents are situated inside the rich, tactile,
            and diverse spaces of everyday human life.
          </p>
          <SectionMotion variant="contexts" />
        </div>

        {/* Domain Explorer */}
        <div className="hw-explorer">
          {/* Domain Navigation Pills */}
          <div className="hw-nav">
            {DOMAINS.map((domain) => {
              const isActive = domain.id === activeDomain.id
              return (
                <button
                  key={domain.id}
                  type="button"
                  className={`hw-nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveDomain(domain)}
                >
                  <span className="hw-nav-icon">{domain.icon}</span>
                  <span className="hw-nav-title">{domain.title}</span>
                </button>
              )
            })}
          </div>

          {/* Active Domain Cinematic Card */}
          <div className="hw-display">
            <div className="hw-display-ambient" />
            <div className="hw-display-header">
              <span className="hw-display-tag">{activeDomain.tag}</span>
              <span className="hw-display-icon">{activeDomain.icon}</span>
            </div>

            <h3 className="hw-display-headline">{activeDomain.headline}</h3>
            <p className="hw-display-desc">{activeDomain.desc}</p>

            <div className="hw-highlight-box">
              <span className="hw-highlight-label">REAL-WORLD SITUATION:</span>
              <p className="hw-highlight-text">{activeDomain.highlight}</p>
            </div>

            <div className="hw-display-footer">
              <div className="hw-telemetry">
                <span className="hw-telemetry-dot" />
                <span>{activeDomain.telemetry}</span>
              </div>
              <span className="hw-status-badge">EMBEDDED IN SITU</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
