import React, { useState } from 'react'
import './AutonomousAction.css'

const SCENARIOS = [
  {
    id: 'transit',
    title: 'Incident 01: Sudden Commute Disruption',
    incident: 'Downtown subway power outage leaves passenger stranded 35 minutes before an academic presentation.',
    legacy: {
      status: 'SYSTEM FAULT // EXCEPTION THROWN',
      log: 'Error: Route ID 404 unserviceable. Script halted. Waiting for human manual intervention.',
      result: 'Missed presentation deadline. Human user stressed and delayed.'
    },
    aitizen: {
      status: 'AUTONOMOUS RE-PLANNING (12ms)',
      log: 'Detected transit alert -> Inferred alternate electric bike corridor -> Reserved bike dock 2 blocks ahead -> Adjusted ETA (+4m, still on schedule) -> Briefed user via audio.',
      result: 'Arrived smoothly with 6 minutes to spare without manual phone fiddling.'
    }
  },
  {
    id: 'room',
    title: 'Incident 02: Scheduled Workspace Pre-empted',
    incident: 'Meeting room 3B is occupied by emergency executive session despite active calendar booking.',
    legacy: {
      status: 'CONFLICT UNRESOLVED',
      log: 'Collision detected: Resource locked. Output: "Resource Busy". Program aborted.',
      result: 'Team stands awkwardly outside room waiting 20 minutes with lost momentum.'
    },
    aitizen: {
      status: 'AUTONOMOUS RE-PLANNING (8ms)',
      log: 'Audio-visual check: Room 3B occupied -> Scanned 4 nearby micro-pods -> Pod 2A available -> Re-routed video feed & sent haptic map pin to team members.',
      result: 'Meeting started on time in Pod 2A seamlessly with smart screens auto-transferred.'
    }
  },
  {
    id: 'kitchen',
    title: 'Incident 03: Kitchen Appliance Hazard',
    incident: 'Human user unexpectedly leaves stove simmering while answering an urgent knock on the front door.',
    legacy: {
      status: 'PASSIVE TIMEOUT ONLY',
      log: 'No pre-set timer configured by user. Sensor monitoring disabled. Idle state.',
      result: 'Pot boils over, smoke alarm triggers, potential thermal fire hazard.'
    },
    aitizen: {
      status: 'AUTONOMOUS RE-PLANNING (15ms)',
      log: 'Spatial tracking: Occupant left kitchen towards front entryway -> IR sensor: Liquid temperature rising near boil-over -> Smart induction dial throttled to warm simmer (level 2) -> Subtle alert sent to watch.',
      result: 'Stove preserved, hazard averted, user finishes conversation peacefully.'
    }
  }
]

export default function AutonomousAction() {
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0])

  return (
    <section id="autonomous-action" className="aa-section" aria-label="Autonomous Action">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span className="badge-pulse" />
            <span>05 // SITUATIONAL RESILIENCE</span>
          </div>
          <h2 className="section-title">
            NO HARD-CODED ROUTINE. <br />
            <span className="text-gradient">INTELLIGENCE ADAPTS TO THE WORLD.</span>
          </h2>
          <p className="section-description">
            The fundamental goal is transcending rigid predefined behavior toward agents that formulate and execute novel
            action paths dynamically when everyday reality defies static expectations.
          </p>
        </div>

        {/* Interactive Scenario Stress Tester */}
        <div className="aa-stress-box">
          <div className="stress-tabs">
            <span className="stress-tabs-label">SIMULATE REAL-WORLD PERTURBATION:</span>
            <div className="stress-buttons">
              {SCENARIOS.map((sc, i) => (
                <button
                  key={sc.id}
                  type="button"
                  className={`stress-btn ${selectedScenario.id === sc.id ? 'active' : ''}`}
                  onClick={() => setSelectedScenario(sc)}
                >
                  <span className="stress-btn-num">SCENARIO {i + 1}</span>
                  <span className="stress-btn-title">{sc.title.split(':')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="incident-banner">
            <span className="incident-icon">⚠️</span>
            <div className="incident-text">
              <strong>UNFORESEEN SITUATION:</strong> {selectedScenario.incident}
            </div>
          </div>

          {/* Side by side comparison */}
          <div className="response-matrix">
            {/* Legacy response */}
            <div className="response-card response-card--legacy">
              <div className="res-top">
                <span className="res-tag res-tag--red">LEGACY SCRIPT / PRE-PROGRAMMED</span>
                <span className="res-state">FAIL</span>
              </div>
              <h4 className="res-title">{selectedScenario.legacy.status}</h4>
              <div className="res-log-box">
                <span className="log-label">STACK LOG:</span>
                <code>{selectedScenario.legacy.log}</code>
              </div>
              <p className="res-outcome">
                <strong>OUTCOME:</strong> {selectedScenario.legacy.result}
              </p>
            </div>

            {/* Aitizen autonomous response */}
            <div className="response-card response-card--aitizen">
              <div className="res-top">
                <span className="res-tag res-tag--cyan">AITIZEN COGNITIVE AGENT</span>
                <span className="res-state res-state--pass">SUCCESS</span>
              </div>
              <h4 className="res-title res-title--cyan">{selectedScenario.aitizen.status}</h4>
              <div className="res-log-box res-log-box--cyan">
                <span className="log-label log-label--cyan">AUTONOMOUS ADAPTATION PIPELINE:</span>
                <code>{selectedScenario.aitizen.log}</code>
              </div>
              <p className="res-outcome">
                <strong>OUTCOME:</strong> {selectedScenario.aitizen.result}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
