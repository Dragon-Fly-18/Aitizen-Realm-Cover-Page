import SectionMotion from '../sectionMotion/SectionMotion'
import './ProjectInfo.css'

const TECH_STACK = [
  { name: 'React 19', role: 'Reactive Frontend Framework & Component Hierarchy', tag: 'UI' },
  { name: 'Three.js / WebGL', role: '3D Scene Graph, Local Clipping Planes, Dynamic Lighting', tag: '3D' },
  { name: 'Blender', role: 'High-Fidelity 3D Character Modeling & Optimization', tag: 'ASSETS' },
  { name: 'GLB 3D Pipeline', role: 'Dual Separated Asset Streaming (Meshopt Compression)', tag: 'PIPELINE' },
  { name: 'Autonomous Agents', role: 'Hierarchical Cognitive Architecture & Action Deconstruction', tag: 'AI' }
]

export default function ProjectInfo() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer id="project-info" className="pi-section" aria-label="Project Information & Credits">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span className="badge-pulse" />
            <span>07 // PROJECT DOSSIER</span>
          </div>
          <h2 className="section-title">
            FINAL YEAR PROJECT <br />
            <span className="text-gradient">SPECIFICATIONS.</span>
          </h2>
          <p className="section-description">
            Academic engineering documentation, technical specifications, and team credentials for AITIZEN REALM.
          </p>
          <SectionMotion variant="dossier" />
        </div>

        {/* Project Metadata Grid */}
        <div className="pi-grid">
          {/* Overview Card */}
          <div className="pi-card pi-card--overview">
            <div className="pi-card-header">
              <span className="pi-tag">CAPSTONE SPECIFICATION</span>
              <span className="pi-dot" />
            </div>
            <div className="pi-spec-list">
              <div className="pi-spec-row">
                <span className="pi-spec-lbl">PROJECT TITLE</span>
                <span className="pi-spec-val highlight">AITIZEN REALM</span>
              </div>
              <div className="pi-spec-row">
                <span className="pi-spec-lbl">PROJECT TYPE</span>
                <span className="pi-spec-val">Final Year Engineering Project</span>
              </div>
              <div className="pi-spec-row">
                <span className="pi-spec-lbl">ACADEMIC YEAR</span>
                <span className="pi-spec-val">2023 — 2027</span>
              </div>
              <div className="pi-spec-row">
                <span className="pi-spec-lbl">DOMAIN</span>
                <span className="pi-spec-val">Autonomous Agents & Human-AI Interaction</span>
              </div>
              <div className="pi-spec-row">
                <span className="pi-spec-lbl">KEY METRIC</span>
                <span className="pi-spec-val">Zero Hardcoded Real-World Execution</span>
              </div>
            </div>
          </div>

          {/* Team Members Card (Placeholders as specified, no invented names) */}
          <div className="pi-card pi-card--team">
            <div className="pi-card-header">
              <span className="pi-tag">ENGINEERING TEAM</span>
              <span className="pi-team-count">[3-4 CANDIDATES]</span>
            </div>
            <div className="pi-team-slots">
              <div className="pi-member-slot">
                <div className="member-avatar">01</div>
                <div className="member-info">
                  <span className="member-name">[Team Member 1 — Krithik.S]</span>
                  <span className="member-role">Core Architecture & AI Agent Framework</span>
                </div>
              </div>
              <div className="pi-member-slot">
                <div className="member-avatar">02</div>
                <div className="member-info">
                  <span className="member-name">[Team Member 2 — Gowtham.G]</span>
                  <span className="member-role">Frontend 3D Interactive Pipeline & Three.js</span>
                </div>
              </div>
              <div className="pi-member-slot">
                <div className="member-avatar">03</div>
                <div className="member-info">
                  <span className="member-name">[Team Member 3 — Adhi Keshavan.B]</span>
                  <span className="member-role">3D Modeling, Blender Assets & Shaders</span>
                </div>
              </div>
              <div className="pi-member-slot">
                <div className="member-avatar">04</div>
                <div className="member-info">
                  <span className="member-name">[Team Member 4 — Sugandhan.B]</span>
                  <span className="member-role">Evaluation Metrics & Situational Simulations</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack Matrix */}
        <div className="pi-tech-box">
          <div className="tech-box-header">
            <span className="tech-box-title">PRIMARY TECHNOLOGIES & PIPELINES</span>
            <span className="tech-box-count">5 CORE COMPONENTS</span>
          </div>
          <div className="tech-chips-grid">
            {TECH_STACK.map((tech, idx) => (
              <div key={idx} className="tech-chip-card">
                <div className="tech-chip-top">
                  <span className="tech-name">{tech.name}</span>
                  <span className="tech-tag">{tech.tag}</span>
                </div>
                <span className="tech-role">{tech.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sub-footer Bar */}
        <div className="pi-footer-bar">
          <div className="footer-left">
            <span className="footer-brand">AITIZEN REALM</span>
            <span className="footer-copyright">© 2026 FINAL YEAR PROJECT. ALL RIGHTS RESERVED.</span>
          </div>
          <div className="footer-center">
            <span className="footer-status">SYS.ONLINE // NEURAL NODE 0x9F42</span>
          </div>
          <button type="button" className="footer-top-btn" onClick={scrollToTop} aria-label="Back to top">
            <span>BACK TO TOP</span>
            <span className="top-arrow">↑</span>
          </button>
        </div>
      </div>
    </footer>
  )
}
