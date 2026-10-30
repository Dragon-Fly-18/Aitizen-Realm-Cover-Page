import SectionMotion from '../sectionMotion/SectionMotion'
import { useState } from 'react'
import './Idea.css'

export default function Idea() {
  const [activeTab, setActiveTab] = useState('paradigm')

  return (
    <section id="idea" className="idea-section" aria-label="The Idea">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span className="badge-pulse" />
            <span>01 // THE IDEA</span>
          </div>
          <h2 className="section-title">
            FROM INTELLIGENCE <br />
            <span className="text-gradient">TO AUTONOMOUS ACTION.</span>
          </h2>
          <p className="section-description">
            Traditional software executes rigid predefined instructions. AITIZEN REALM explores AI agents
            capable of actively perceiving their environment, reasoning over novel situations, and performing everyday
            human activities without every step being hardcoded.
          </p>
          <SectionMotion variant="idea" />
        </div>

        {/* Tab Switcher */}
        <div className="idea-tabs" role="tablist">
          <button
            type="button"
            className={`idea-tab ${activeTab === 'paradigm' ? 'active' : ''}`}
            onClick={() => setActiveTab('paradigm')}
            role="tab"
            aria-selected={activeTab === 'paradigm'}
          >
            <span className="tab-indicator" />
            <span>THE PARADIGM SHIFT</span>
          </button>
          <button
            type="button"
            className={`idea-tab ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
            role="tab"
            aria-selected={activeTab === 'comparison'}
          >
            <span className="tab-indicator" />
            <span>TRADITIONAL VS AUTONOMOUS</span>
          </button>
          <button
            type="button"
            className={`idea-tab ${activeTab === 'philosophy' ? 'active' : ''}`}
            onClick={() => setActiveTab('philosophy')}
            role="tab"
            aria-selected={activeTab === 'philosophy'}
          >
            <span className="tab-indicator" />
            <span>SYMBIOTIC PHILOSOPHY</span>
          </button>
        </div>

        {/* Tab Content 1: The Paradigm Shift */}
        {activeTab === 'paradigm' && (
          <div className="idea-grid">
            <div className="idea-card idea-card--primary">
              <div className="card-glow" />
              <div className="card-top">
                <span className="card-tag">CORE BREAKTHROUGH</span>
                <span className="card-num">01</span>
              </div>
              <h3 className="card-title">Situated Physical & Digital Cognition</h3>
              <p className="card-text">
                AI agents in the Aitizen Realm do not simply process static text in isolated chat boxes. They exist as
                persistent autonomous entities embedded in the human everyday sphere—perceiving spatial relations, observing
                temporal routines, and adapting to continuous environmental dynamics.
              </p>
              <div className="card-telemetry">
                <div className="telemetry-pill">
                  <span className="pill-dot pill-dot--cyan" />
                  <span>Continuous Context Stream</span>
                </div>
                <div className="telemetry-pill">
                  <span className="pill-dot pill-dot--purple" />
                  <span>Non-Linear Planning</span>
                </div>
              </div>
            </div>

            <div className="idea-card">
              <div className="card-top">
                <span className="card-tag">ADAPTIVE INTELLIGENCE</span>
                <span className="card-num">02</span>
              </div>
              <h3 className="card-title">Zero-Shot Real-World Adaptation</h3>
              <p className="card-text">
                When an unexpected event occurs—a closed door, a sudden meeting reschedule, or an unfamiliar object—the
                agent does not crash. It perceives the discrepancy, infers alternative pathways, and dynamically reframes its
                operational goal in real time.
              </p>
              <div className="card-stats">
                <div className="stat-item">
                  <span className="stat-val">100%</span>
                  <span className="stat-lbl">DYNAMIC RE-PLANNING</span>
                </div>
                <div className="stat-item">
                  <span className="stat-val">&lt; 15ms</span>
                  <span className="stat-lbl">INFERENCE CYCLE</span>
                </div>
              </div>
            </div>

            <div className="idea-card">
              <div className="card-top">
                <span className="card-tag">HUMAN CONVERGENCE</span>
                <span className="card-num">03</span>
              </div>
              <h3 className="card-title">Not AI vs Human — Symbiosis</h3>
              <p className="card-text">
                AITIZEN REALM is fundamentally not about artificial intelligence competing with or dominating humanity. It is
                the realization of AI as helpful, reliable, and companionate citizens (Aitizens) working alongside humans to
                magnify quality of life.
              </p>
              <div className="card-badge-row">
                <span className="subtle-chip">Co-existence</span>
                <span className="subtle-chip">Context-Aware</span>
                <span className="subtle-chip">Everyday Harmony</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: Comparison */}
        {activeTab === 'comparison' && (
          <div className="comparison-container">
            <div className="comparison-col comparison-col--legacy">
              <div className="col-header">
                <div className="col-badge legacy-badge">LEGACY PARADIGM</div>
                <h4 className="col-title">Traditional Pre-Programmed Software</h4>
                <p className="col-sub">Fixed if/else branches, static scripts, and fragile workflows</p>
              </div>
              <ul className="comparison-list">
                <li className="comparison-item negative">
                  <span className="item-icon">✕</span>
                  <div>
                    <strong>Brittle Execution:</strong> Breaks when encountering unforeseen states or changed environments.
                  </div>
                </li>
                <li className="comparison-item negative">
                  <span className="item-icon">✕</span>
                  <div>
                    <strong>Manual Scripting:</strong> Every single action and edge case must be explicitly hardcoded by engineers.
                  </div>
                </li>
                <li className="comparison-item negative">
                  <span className="item-icon">✕</span>
                  <div>
                    <strong>Isolated Silos:</strong> Operates in strict application silos without situational human understanding.
                  </div>
                </li>
                <li className="comparison-item negative">
                  <span className="item-icon">✕</span>
                  <div>
                    <strong>Zero Learning:</strong> Does not consolidate episodic experiences or improve from daily interactions.
                  </div>
                </li>
              </ul>
            </div>

            <div className="comparison-divider">
              <span className="divider-icon">⚡</span>
              <span className="divider-label">TRANSFORMATION</span>
            </div>

            <div className="comparison-col comparison-col--aitizen">
              <div className="col-header">
                <div className="col-badge aitizen-badge">AITIZEN REALM</div>
                <h4 className="col-title">Autonomous Situated AI Agents</h4>
                <p className="col-sub">Goal-oriented active perception, hierarchical planning, continuous learning</p>
              </div>
              <ul className="comparison-list">
                <li className="comparison-item positive">
                  <span className="item-icon">✓</span>
                  <div>
                    <strong>Dynamic Adaptation:</strong> Infers new strategies automatically when conditions shift.
                  </div>
                </li>
                <li className="comparison-item positive">
                  <span className="item-icon">✓</span>
                  <div>
                    <strong>Goal-Driven Autonomy:</strong> Requires only high-level intent; decomposes and executes steps independently.
                  </div>
                </li>
                <li className="comparison-item positive">
                  <span className="item-icon">✓</span>
                  <div>
                    <strong>Everyday Integration:</strong> Interacts seamlessly across home, work, urban transit, and daily routines.
                  </div>
                </li>
                <li className="comparison-item positive">
                  <span className="item-icon">✓</span>
                  <div>
                    <strong>Continuous Learning:</strong> Stores episodic memory and refines policies from ongoing human interaction.
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab Content 3: Philosophy */}
        {activeTab === 'philosophy' && (
          <div className="philosophy-card">
            <div className="philosophy-quote">
              <span className="quote-mark">“</span>
              <blockquote className="quote-text">
                The objective of AITIZEN REALM is not to construct an entity that mimics human biology or replaces human agency,
                but to pioneer autonomous synthetic entities that respect, understand, and enrich the human lifeworld.
              </blockquote>
            </div>
            <div className="philosophy-pillars">
              <div className="phil-pillar">
                <span className="phil-num">01</span>
                <h5>Human-Centricity</h5>
                <p>AI designed to enhance human liberty, dignity, and daily fulfillment rather than supplant it.</p>
              </div>
              <div className="phil-pillar">
                <span className="phil-num">02</span>
                <h5>Situated Realism</h5>
                <p>Validated within realistic everyday situations: apartments, offices, transit, and social spaces.</p>
              </div>
              <div className="phil-pillar">
                <span className="phil-num">03</span>
                <h5>Academic Rigor</h5>
                <p>Developed with principled cognitive architectures and verifiable state transitions for final-year evaluation.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
