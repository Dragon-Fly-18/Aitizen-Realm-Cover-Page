import Hero from './components/hero/hero'
import Idea from './components/idea/Idea'
import HowItWorks from './components/howItWorks/HowItWorks'
import Agents from './components/agents/Agents'
import HumanWorld from './components/humanWorld/HumanWorld'
import AutonomousAction from './components/autonomousAction/AutonomousAction'
import Future from './components/future/Future'
import ProjectInfo from './components/projectInfo/ProjectInfo'
import './App.css'

function App() {
  return (
    <main className="app-shell">
      {/* 1. Cinematic 3D Split-Face & Face-to-Face Hero Experience */}
      <Hero />

      {/* 2. The Idea: From Intelligence to Action */}
      <Idea />

      {/* 3. How Aitizen Works: The 6-Stage Autonomous Cognitive Cycle */}
      <HowItWorks />

      {/* 4. AI Agents: Everyday Autonomous Activities */}
      <Agents />

      {/* 5. The Human World: Real-World Environments */}
      <HumanWorld />

      {/* 6. Autonomous Action: Situational Resilience & Stress-Testing */}
      <AutonomousAction />

      {/* 7. The Future: Vision Manifesto */}
      <Future />

      {/* 8. Project Information: Academic Final Year Documentation & Credentials */}
      <ProjectInfo />
    </main>
  )
}

export default App
