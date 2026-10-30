import SectionMotion from '../sectionMotion/SectionMotion'
import { useState } from 'react'
import './Agents.css'

const AGENT_ACTIVITIES = [
  {
    id: 'schedules',
    title: 'Dynamic Schedule Orchestration',
    tag: 'TEMPORAL REASONING',
    icon: '🗓️',
    summary: 'Autonomous prioritization and rescheduling across human biological and professional rhythms.',
    behavior: 'When a transport delay is perceived, the agent independently reschedules secondary appointments, informs collaborators, and protects resting windows.',
    telemetry: 'Autonomous Re-prioritization: Active',
    logs: [
      '[08:14:02] Ingested transit delay notice (Metro Line 4 stalled +18m)',
      '[08:14:05] Calculated downstream cascade: 09:00 Design Sprint at risk',
      '[08:14:07] Action: Postponed Sprint by 20m, notified 4 attendees, re-routed transit'
    ]
  },
  {
    id: 'navigation',
    title: 'Physical & Hybrid Space Navigation',
    tag: 'SPATIAL INTELLIGENCE',
    icon: '🧭',
    summary: 'Continuous 3D path planning through dynamic human spaces without collision or disruption.',
    behavior: 'Navigates hallways, doorways, elevators, and crowded rooms by predicting human trajectory vectors and granting polite personal space.',
    telemetry: 'Dynamic Collision Buffer: 0.85m',
    logs: [
      '[11:22:15] Approaching double doors; perceived human walking outward',
      '[11:22:16] Yielding right-of-way; adjusting approach speed -40%',
      '[11:22:19] Clear corridor confirmed; resume primary trajectory'
    ]
  },
  {
    id: 'communication',
    title: 'Natural Human Dialogue & Intent Empathy',
    tag: 'CONVERSATIONAL DYNAMICS',
    icon: '💬',
    summary: 'Fluid multimodal communication adjusting tone, brevity, and modality based on human emotional state.',
    behavior: 'Understands implied requests and non-verbal cues. If a user is rushing, agent uses ultra-concise spoken confirmations.',
    telemetry: 'Pragmatic Intent Parsing: 99.2%',
    logs: [
      '[14:05:40] Acoustic stress analyzer: Rapid cadence detected',
      '[14:05:41] Switched output modality to brief heads-up summary (12 words)',
      '[14:05:43] Delivered audio confirmation: "Files uploaded, summary pinned on tablet."'
    ]
  },
  {
    id: 'assistance',
    title: 'Contextual Everyday Task Assistance',
    tag: 'EMBODIED CO-PILOT',
    icon: '🤝',
    summary: 'Anticipates human task needs before explicit instructions are spoken.',
    behavior: 'Observing a cooking session, prepares timers, surfaces ingredient substitutes, and monitors stove temperatures autonomously.',
    telemetry: 'Proactive Action Precision: 96.8%',
    logs: [
      '[18:30:11] Visual recognition: Pasta pot placed on burner induction #2',
      '[18:30:14] Auto-initialized boil-over guard & 9-minute pasta timer',
      '[18:30:15] Dimmed kitchen counter spot to reduce eye strain'
    ]
  },
  {
    id: 'routines',
    title: 'Lifelong Routine & Habit Learning',
    tag: 'HABITUAL CONSOLIDATION',
    icon: '🧬',
    summary: 'Passively learns household and personal habits, developing intuitive synergy with occupants.',
    behavior: 'Learns that occupant drinks tea at 21:30 and reads. Silently prepares kettle and adjusts reading lamp warmth at 21:28.',
    telemetry: 'Routine Convergence: 14-Day Cycle',
    logs: [
      '[21:28:00] Habitual trigger: 98% confidence evening reading pattern',
      '[21:28:02] Electric kettle pre-heat triggered to 85°C',
      '[21:28:05] Color temperature shifted to 2700K warm incandescent'
    ]
  },
  {
    id: 'objects',
    title: 'Real-World Object Interaction & Handling',
    tag: 'PHYSICAL AFFORDANCE',
    icon: '📦',
    summary: 'Interacts with physical appliances, doors, packages, and everyday utensils with gentle compliance.',
    behavior: 'Estimates object mass, fragility, and surface friction before physical contact to ensure 100% gentle manipulation.',
    telemetry: 'Force Feedback Limit: 12.4N',
    logs: [
      '[16:10:02] Package delivery box detected at entryway threshold',
      '[16:10:04] Object boundary calculated: 32x22x15cm, estimated 1.2kg',
      '[16:10:07] Picked and placed onto hallway console table safely'
    ]
  },
  {
    id: 'decisions',
    title: 'Multi-Variable Autonomous Decisions',
    tag: 'SAFETY & VALUE ALIGNMENT',
    icon: '⚖️',
    summary: 'Evaluates conflicting objectives (urgency vs. quietness, cost vs. speed) autonomously.',
    behavior: 'Balances appliance noise with sleep schedules, energy tariffs with charging speeds, without bothering the user for trivial choices.',
    telemetry: 'Value Optimization: Multi-Objective Pareto',
    logs: [
      '[02:15:00] Grid tariff drop: 45% lower electricity rate detected',
      '[02:15:01] Check bedroom occupancy: Deep sleep state confirmed',
      '[02:15:03] Initiated silent cycle dishwasher (under 32dB acoustic threshold)'
    ]
  }
]

export default function Agents() {
  const [activeActivity, setActiveActivity] = useState(AGENT_ACTIVITIES[0])

  return (
    <section id="agents" className="agents-section" aria-label="AI Agents in Action">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span className="badge-pulse" />
            <span>03 // AUTONOMOUS BEHAVIORS</span>
          </div>
          <h2 className="section-title">
            AI AGENTS IN THE <br />
            <span className="text-gradient">REAL WORLD.</span>
          </h2>
          <p className="section-description">
            Aitizen agents execute real-world tasks not as static pre-programmed scripts, but through continuous situational
            awareness, commonsense reasoning, and proactive everyday collaboration.
          </p>
          <SectionMotion variant="agents" />
        </div>

        {/* Interactive Capability Showcase */}
        <div className="agents-layout">
          {/* Activity Selector List */}
          <div className="activities-list" role="tablist">
            {AGENT_ACTIVITIES.map((act) => {
              const isSelected = act.id === activeActivity.id
              return (
                <button
                  key={act.id}
                  type="button"
                  className={`activity-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => setActiveActivity(act)}
                  role="tab"
                  aria-selected={isSelected}
                >
                  <span className="activity-icon">{act.icon}</span>
                  <div className="activity-meta">
                    <span className="activity-title">{act.title}</span>
                    <span className="activity-tag">{act.tag}</span>
                  </div>
                  <span className="activity-arrow">→</span>
                </button>
              )
            })}
          </div>

          {/* Active Detail & Live Simulated Telemetry Card */}
          <div className="agent-detail-card">
            <div className="agent-detail-header">
              <div className="header-meta">
                <span className="status-indicator">
                  <span className="status-blink" />
                  <span>SIMULATED AUTONOMOUS AGENT CORE</span>
                </span>
                <span className="activity-focus-tag">{activeActivity.tag}</span>
              </div>
              <h3 className="detail-headline">{activeActivity.title}</h3>
              <p className="detail-summary">{activeActivity.summary}</p>
            </div>

            <div className="behavior-box">
              <span className="behavior-label">AUTONOMOUS BEHAVIOR LOGIC</span>
              <p className="behavior-desc">{activeActivity.behavior}</p>
            </div>

            <div className="terminal-window">
              <div className="terminal-header">
                <span className="terminal-dot red" />
                <span className="terminal-dot yellow" />
                <span className="terminal-dot green" />
                <span className="terminal-title">AGENT_SYNAPSE_LOG // LIVE_REACTIVE_CYCLE</span>
              </div>
              <div className="terminal-body">
                {activeActivity.logs.map((log, i) => (
                  <div key={i} className="terminal-line">
                    <span className="terminal-prompt">$</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="agent-card-footer">
              <div className="telemetry-chip">
                <span className="chip-label">SYSTEM STATE:</span>
                <span className="chip-value">{activeActivity.telemetry}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
