import React, { useState } from 'react'
import './HowItWorks.css'

const STEPS = [
  {
    id: 'perceive',
    num: '01',
    title: 'PERCEIVE',
    tag: 'MULTI-MODAL INGESTION',
    desc: 'The agent continuously observes real-world spatial geometries, ambient acoustics, visual scenes, and human gestures using real-time sensor streams.',
    detail: 'Constructs dynamic 3D semantic voxel grids and object coordinate graphs rather than simple 2D bounding boxes.',
    telemetry: 'Latency: 4.2ms // Voxel Res: 1cm³',
    icon: '👁'
  },
  {
    id: 'understand',
    num: '02',
    title: 'UNDERSTAND',
    tag: 'SITUATIONAL SEMANTICS',
    desc: 'Extracts deep relational context from raw perceptual signals, identifying affordances, social dynamics, and room-level state changes.',
    detail: 'Maps semantic ontology: recognizes not just "chair", but "unoccupied study chair available for human sitting".',
    telemetry: 'Ontology Depth: 8 Levels // Confidence: 99.4%',
    icon: '🧠'
  },
  {
    id: 'reason',
    num: '03',
    title: 'REASON',
    tag: 'COUNTERFACTUAL INFERENCE',
    desc: 'Simulates hypothetical outcomes and evaluates prospective decisions against human comfort, safety protocols, and daily efficiency.',
    detail: 'Evaluates branching scenario graphs: "If I move the coffee mug now, will it obstruct the notebook?"',
    telemetry: 'Branch Factor: 128 paths // Horizon: 60s',
    icon: '⚡'
  },
  {
    id: 'plan',
    num: '04',
    title: 'PLAN',
    tag: 'HIERARCHICAL GOAL DECOMPOSITION',
    desc: 'Decomposes open-ended objectives into atomic action trajectories, parameterized for physical space and temporal coordination.',
    detail: 'Constructs fault-tolerant state-machine graphs with fallback sub-goals for sudden environmental interruptions.',
    telemetry: 'Graph Complexity: O(N log N) // Dynamic Replanning',
    icon: '🧭'
  },
  {
    id: 'act',
    num: '05',
    title: 'ACT',
    tag: 'SPATIAL & DIGITAL EXECUTION',
    desc: 'Executes physical movement, digital API interactions, or verbal communication with natural compliance and gentle presence.',
    detail: 'Translates high-level plans into fluid trajectory splines and natural, non-robotic acoustic dialogue.',
    telemetry: 'Motion Jitter: < 0.05mm // Audio Flux: 48kHz',
    icon: '🎯'
  },
  {
    id: 'learn',
    num: '06',
    title: 'LEARN',
    tag: 'EPISODIC REINFORCEMENT',
    desc: 'Consolidates the interaction outcome into long-term episodic memory, refining behavioral policies for subsequent days.',
    detail: 'Adapts to individual human idiosyncrasies, preferred schedules, and daily household rhythms without retraining weights.',
    telemetry: 'Episodic Memory Buffer: Persistent // Lifelong Tuning',
    icon: '🔄'
  }
]

export default function HowItWorks() {
  const [selectedStep, setSelectedStep] = useState(0)

  return (
    <section id="how-it-works" className="hiw-section" aria-label="How Aitizen Works">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span className="badge-pulse" />
            <span>02 // THE COGNITIVE PIPELINE</span>
          </div>
          <h2 className="section-title">
            THE AUTONOMOUS <br />
            <span className="text-gradient">6-STAGE COGNITIVE CYCLE.</span>
          </h2>
          <p className="section-description">
            Instead of executing hardcoded linear scripts, AITIZEN agents operate across a continuous feedback loop:
            transforming raw sensory observation into situated intelligence and adaptive physical action.
          </p>
        </div>

        {/* Interactive Stepper Pipeline */}
        <div className="pipeline-container">
          <div className="pipeline-track">
            <div
              className="pipeline-progress"
              style={{ width: `${(selectedStep / (STEPS.length - 1)) * 100}%` }}
            />
          </div>

          <div className="pipeline-nodes">
            {STEPS.map((step, idx) => {
              const isCurrent = idx === selectedStep
              const isPast = idx < selectedStep

              return (
                <button
                  key={step.id}
                  type="button"
                  className={`pipeline-node ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}
                  onClick={() => setSelectedStep(idx)}
                  aria-label={`Step ${step.num}: ${step.title}`}
                >
                  <div className="node-circle">
                    <span className="node-icon">{step.icon}</span>
                    <span className="node-num">{step.num}</span>
                  </div>
                  <span className="node-label">{step.title}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Detailed Stage Showcase */}
        <div className="stage-showcase">
          <div className="showcase-card">
            <div className="showcase-header">
              <div className="showcase-badge-wrap">
                <span className="showcase-step-num">STAGE {STEPS[selectedStep].num} / 06</span>
                <span className="showcase-tag">{STEPS[selectedStep].tag}</span>
              </div>
              <h3 className="showcase-title">{STEPS[selectedStep].title}</h3>
            </div>

            <p className="showcase-desc">{STEPS[selectedStep].desc}</p>
            <div className="showcase-detail">
              <span className="detail-label">ENGINEERING ARCHITECTURE:</span>
              <p className="detail-text">{STEPS[selectedStep].detail}</p>
            </div>

            <div className="showcase-footer">
              <div className="telemetry-box">
                <span className="telemetry-led" />
                <span className="telemetry-text">{STEPS[selectedStep].telemetry}</span>
              </div>
              <div className="stage-nav-btns">
                <button
                  type="button"
                  className="stage-nav-btn"
                  onClick={() => setSelectedStep((prev) => Math.max(0, prev - 1))}
                  disabled={selectedStep === 0}
                >
                  ← PREVIOUS
                </button>
                <button
                  type="button"
                  className="stage-nav-btn stage-nav-btn--next"
                  onClick={() => setSelectedStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
                  disabled={selectedStep === STEPS.length - 1}
                >
                  NEXT STAGE →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
