import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import './hero.css'

const AI_GLB = '/models/ai/Meshy_AI_Futuristic_humanoid_t_0808114600_texture.glb'
const HUMAN_GLB = '/models/humans/Meshy_AI_Classical_marble_scul_0808115614_texture.glb'

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value))
}

function lerp(start, end, amount) {
	return start + (end - start) * amount
}

function smoothstep(value) {
	const clamped = clamp(value, 0, 1)
	return clamped * clamped * (3 - 2 * clamped)
}

function useScrollProgress() {
	const [progress, setProgress] = useState(0)

	useEffect(() => {
		let raf = null
		const target = { value: 0 }
		const current = { value: 0 }

		const updateTarget = () => {
			const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1)
			target.value = clamp(window.scrollY / maxScroll, 0, 1)
		}

		const loop = () => {
			current.value = lerp(current.value, target.value, 0.1)
			if (Math.abs(current.value - target.value) < 0.0004) {
				current.value = target.value
			}
			setProgress(current.value)
			raf = window.requestAnimationFrame(loop)
		}

		updateTarget()
		window.addEventListener('scroll', updateTarget, { passive: true })
		window.addEventListener('resize', updateTarget)
		loop()

		return () => {
			window.removeEventListener('scroll', updateTarget)
			window.removeEventListener('resize', updateTarget)
			if (raf) window.cancelAnimationFrame(raf)
		}
	}, [])

	return progress
}

function normalizeAndCenter(model, targetHeight = 3.2) {
	const box = new THREE.Box3().setFromObject(model)
	const size = box.getSize(new THREE.Vector3())
	const center = box.getCenter(new THREE.Vector3())
	const scale = targetHeight / (size.y || 1)

	model.scale.setScalar(scale)
	// Offset model relative to group so its head/center sits near (0, 0, 0)
	model.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
	return { size, center, scale }
}

function applyClippingAndMaterial(model, clipPlane, isAI = false) {
	model.traverse((child) => {
		if (!child.isMesh) return

		child.castShadow = true
		child.receiveShadow = true

		const cloneMat = (mat) => {
			if (!mat) return new THREE.MeshStandardMaterial({ color: isAI ? 0x00d4ff : 0xd4c2a0 })
			const m = mat.clone()
			m.clippingPlanes = [clipPlane]
			m.clipShadows = true
			m.clipIntersection = false
			m.side = THREE.DoubleSide

			if (isAI) {
				// Futuristic graphite/titanium metalness with cyan accent
				m.metalness = Math.max(m.metalness ?? 0.8, 0.65)
				m.roughness = Math.min(m.roughness ?? 0.35, 0.38)
			} else {
				// Warm marble / human skin tone softness
				m.metalness = Math.min(m.metalness ?? 0.05, 0.1)
				m.roughness = Math.max(m.roughness ?? 0.6, 0.55)
			}
			return m
		}

		if (Array.isArray(child.material)) {
			child.material = child.material.map(cloneMat)
		} else {
			child.material = cloneMat(child.material)
		}
	})
}

function makeStars(count = 2800) {
	const geometry = new THREE.BufferGeometry()
	const positions = new Float32Array(count * 3)
	const colors = new Float32Array(count * 3)

	for (let i = 0; i < count; i += 1) {
		positions[i * 3] = (Math.random() - 0.5) * 80
		positions[i * 3 + 1] = (Math.random() - 0.5) * 50
		positions[i * 3 + 2] = (Math.random() - 0.5) * 60 - 15

		const r = Math.random()
		if (r < 0.35) {
			// Cyan / AI particle
			colors[i * 3] = 0.0
			colors[i * 3 + 1] = 0.8
			colors[i * 3 + 2] = 1.0
		} else if (r < 0.65) {
			// Warm / Human particle
			colors[i * 3] = 1.0
			colors[i * 3 + 1] = 0.7
			colors[i * 3 + 2] = 0.4
		} else {
			// White star
			colors[i * 3] = 0.9
			colors[i * 3 + 1] = 0.95
			colors[i * 3 + 2] = 1.0
		}
	}

	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

	return new THREE.Points(
		geometry,
		new THREE.PointsMaterial({ size: 0.038, vertexColors: true, transparent: true, opacity: 0.65 }),
	)
}

function HeroScene({ progress }) {
	const canvasRef = useRef(null)
	const progressRef = useRef(progress)
	const frameRef = useRef(0)
	const startTimeRef = useRef(performance.now())

	useEffect(() => {
		progressRef.current = progress
	}, [progress])

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return undefined

		const scene = new THREE.Scene()
		scene.background = new THREE.Color(0x050a14)
		scene.fog = new THREE.FogExp2(0x050a14, 0.035)

		const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 80)
		camera.position.set(0, 0.35, 5.2)
		camera.lookAt(0, 0.15, 0)

		const renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance',
		})
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
		renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false)
		renderer.outputColorSpace = THREE.SRGBColorSpace
		renderer.toneMapping = THREE.ACESFilmicToneMapping
		renderer.toneMappingExposure = 1.4
		renderer.localClippingEnabled = true

		const root = new THREE.Group()
		scene.add(root)

		// Environment Lighting
		const ambientLight = new THREE.AmbientLight(0x1a2638, 2.2)
		scene.add(ambientLight)

		// Left AI Cyan Key Light
		const aiLight = new THREE.PointLight(0x00d4ff, 16, 12)
		aiLight.position.set(-3.0, 2.5, 3.0)
		scene.add(aiLight)

		// Right Human Warm Key Light
		const huLight = new THREE.PointLight(0xff9944, 16, 12)
		huLight.position.set(3.0, 2.5, 3.0)
		scene.add(huLight)

		// Central Seam Accent Light
		const seamLight = new THREE.PointLight(0x88e5ff, 8, 6)
		seamLight.position.set(0, 0.3, 1.5)
		scene.add(seamLight)

		// Rim Lights
		const aiRim = new THREE.PointLight(0x0055ff, 8, 8)
		aiRim.position.set(-4.5, 0.5, -2.0)
		scene.add(aiRim)

		const huRim = new THREE.PointLight(0xff5500, 8, 8)
		huRim.position.set(4.5, 0.5, -2.0)
		scene.add(huRim)

		const topLight = new THREE.DirectionalLight(0xffffff, 1.5)
		topLight.position.set(0, 6, 4)
		scene.add(topLight)

		// Background Stars
		const stars = makeStars()
		scene.add(stars)

		// Subtle floor grid
		const grid = new THREE.GridHelper(30, 40, 0x003366, 0x001122)
		grid.position.y = -2.2
		grid.material.opacity = 0.18
		grid.material.transparent = true
		scene.add(grid)

		// Seam Visual Line (Glow Seam Plane at x=0)
		const seamGeo = new THREE.PlaneGeometry(0.04, 3.6)
		const seamMat = new THREE.MeshBasicMaterial({
			color: 0x00f0ff,
			transparent: true,
			opacity: 0.8,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
		})
		const seamMesh = new THREE.Mesh(seamGeo, seamMat)
		seamMesh.position.set(0, 0.2, 0.05)
		scene.add(seamMesh)

		// Clipping Planes setup:
		// AI: normal (-1, 0, 0) -> keeps x <= constant. At start, constant=0.015 (left half)
		// Human: normal (1, 0, 0) -> keeps x >= -constant. At start, constant=0.015 (right half)
		const aiClipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.015)
		const huClipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.015)

		// AI & Human Model Container Groups
		const aiGroup = new THREE.Group()
		const huGroup = new THREE.Group()
		root.add(aiGroup, huGroup)

		let aiLoaded = false
		let huLoaded = false

		const loader = new GLTFLoader()

		loader.load(
			AI_GLB,
			(gltf) => {
				const model = gltf.scene
				normalizeAndCenter(model, 3.2)
				applyClippingAndMaterial(model, aiClipPlane, true)
				aiGroup.add(model)
				aiLoaded = true
			},
			undefined,
			(err) => console.error('AI GLB load error:', err),
		)

		loader.load(
			HUMAN_GLB,
			(gltf) => {
				const model = gltf.scene
				normalizeAndCenter(model, 3.2)
				applyClippingAndMaterial(model, huClipPlane, false)
				huGroup.add(model)
				huLoaded = true
			},
			undefined,
			(err) => console.error('Human GLB load error:', err),
		)

		const resize = () => {
			const width = canvas.clientWidth || window.innerWidth
			const height = canvas.clientHeight || window.innerHeight
			camera.aspect = width / height
			camera.updateProjectionMatrix()
			renderer.setSize(width, height, false)
		}

		const animate = () => {
			const elapsedTime = (performance.now() - startTimeRef.current) / 1000
			const scroll = progressRef.current

			// Key Timeline Phases:
			// 0% -> 20%: Split face centered at x=0, seam splitting starts
			// 20% -> 50%: Separation & Clipping expansion
			// 40% -> 80%: Y-Axis Rotation
			// 80% -> 100%: Face-to-Face orientation
			const separation = smoothstep(clamp((scroll - 0.02) / 0.4, 0, 1))
			const unclipPhase = smoothstep(clamp((scroll - 0.05) / 0.35, 0, 1))
			const rotatePhase = smoothstep(clamp((scroll - 0.25) / 0.65, 0, 1))

			// Subtle breathing float motion
			const floatY = Math.sin(elapsedTime * 1.2) * 0.03

			// Model X Positions:
			// Initial (0%): AI at x = 0, Human at x = 0 (forming split-face!)
			// Final (100%): AI at x = -2.85, Human at x = +2.85
			const aiX = lerp(0, -2.85, separation)
			const huX = lerp(0, 2.85, separation)

			aiGroup.position.set(aiX, -0.25 + floatY, 0)
			huGroup.position.set(huX, -0.25 - floatY, 0)

			// Model Y Rotations:
			// Initial (0%): Front facing camera (0 rad)
			// Final (100%): Facing each other (AI turns +1.45 rad right, Human turns -1.45 rad left)
			const aiRotY = lerp(0, 1.45, rotatePhase)
			const huRotY = lerp(0, -1.45, rotatePhase)

			aiGroup.rotation.y = aiRotY
			huGroup.rotation.y = huRotY

			// Clipping Planes adjustment:
			// At start (0%): constant = 0.015 (strictly clips AI to left half, Human to right half)
			// As scroll opens (unclipPhase): constant expands to 20 so full 3D models become visible!
			const aiClipConst = lerp(0.015, 20.0, unclipPhase)
			const huClipConst = lerp(0.015, 20.0, unclipPhase)

			aiClipPlane.constant = aiClipConst
			huClipPlane.constant = huClipConst

			// Seam visual indicator line
			seamMesh.scale.y = lerp(1, 0, separation)
			seamMat.opacity = clamp((1 - separation * 2.5), 0, 0.8)

			// Dynamic lights follow models
			aiLight.position.x = aiX - 0.8
			huLight.position.x = huX + 0.8
			seamLight.intensity = (1 - separation) * 8

			// Gentle camera subtle motion
			const camZ = lerp(5.2, 5.8, separation)
			camera.position.x = Math.sin(elapsedTime * 0.3) * 0.08
			camera.position.y = 0.35 + Math.cos(elapsedTime * 0.2) * 0.05
			camera.position.z = camZ
			camera.lookAt(0, 0.15, 0)

			// Animate background stars gently
			stars.rotation.y = elapsedTime * 0.015

			renderer.render(scene, camera)
			frameRef.current = window.requestAnimationFrame(animate)
		}

		startTimeRef.current = performance.now()
		resize()
		window.addEventListener('resize', resize)
		frameRef.current = window.requestAnimationFrame(animate)

		return () => {
			window.cancelAnimationFrame(frameRef.current)
			window.removeEventListener('resize', resize)
			renderer.dispose()
			stars.geometry.dispose()
			stars.material.dispose()
			grid.geometry.dispose()
			grid.material.dispose()
			seamGeo.dispose()
			seamMat.dispose()
		}
	}, [])

	return <canvas ref={canvasRef} className="cover-page__canvas" aria-hidden="true" />
}

export default function Hero() {
	const progress = useScrollProgress()
	const [loaderVisible, setLoaderVisible] = useState(true)

	useEffect(() => {
		const timer = window.setTimeout(() => setLoaderVisible(false), 1600)
		return () => window.clearTimeout(timer)
	}, [])

	const smoothProgress = smoothstep(progress)
	// Typography reveals as models separate (scroll > 0.2)
	const titleOpacity = smoothstep(clamp((progress - 0.22) / 0.35, 0, 1))
	const titleTranslateY = lerp(35, 0, titleOpacity)
	const sideOpacity = clamp(1 - smoothProgress * 2.2, 0, 1)
	const hintOpacity = clamp(1 - smoothProgress * 4.5, 0, 1)

	return (
		<section className="cover-page">
			{/* Loading Screen */}
			<div className="cover-page__loader" style={{ opacity: loaderVisible ? 1 : 0, pointerEvents: loaderVisible ? 'all' : 'none' }} aria-hidden="true">
				<div className="cover-page__loaderDots">
					<span className="cover-page__loaderDot" />
					<span className="cover-page__loaderDot" />
					<span className="cover-page__loaderDot" />
				</div>
				<div className="cover-page__loaderText">INITIALIZING AITIZEN REALM</div>
				<div className="cover-page__loaderBar">
					<div className="cover-page__loaderFill" />
				</div>
			</div>

			<div className="cover-page__ambient" aria-hidden="true" />
			<div className="cover-page__grain" aria-hidden="true" />

			<div className="cover-page__sticky">
				<HeroScene progress={progress} />

				<div className="cover-page__hud">
					{/* Scroll Progress Bar */}
					<div className="cover-page__progress" aria-hidden="true">
						<span style={{ width: `${progress * 100}%` }} />
					</div>

					{/* Tactical Corner Accents */}
					<div className="cover-page__corner cover-page__corner--tl" aria-hidden="true" />
					<div className="cover-page__corner cover-page__corner--tr" aria-hidden="true" />
					<div className="cover-page__corner cover-page__corner--bl" aria-hidden="true" />
					<div className="cover-page__corner cover-page__corner--br" aria-hidden="true" />

					{/* Initial Split HUD Panels */}
					<div className="cover-page__panel cover-page__panel--left" style={{ opacity: sideOpacity }}>
						<div className="cover-page__panelLabel">◈ SYNTHETIC ENTITY</div>
						<div className="cover-page__panelLine">TYPE ▸ ARTIFICIAL INTELLIGENCE</div>
						<div className="cover-page__panelLine">UNIT ▸ AI-v4.7 / NEURAL</div>
						<div className="cover-page__panelLine">STATUS ▸ <span style={{ color: 'var(--ai)' }}>AUTONOMOUS</span></div>
						<div className="cover-page__panelDot" />
					</div>

					<div className="cover-page__panel cover-page__panel--right" style={{ opacity: sideOpacity }}>
						<div className="cover-page__panelLabel cover-page__panelLabel--warm">HOMO SAPIENS ◈</div>
						<div className="cover-page__panelLine">BIOLOGICAL ◂ TYPE</div>
						<div className="cover-page__panelLine">REAL WORLD ◂ ENVIRONMENT</div>
						<div className="cover-page__panelLine"><span style={{ color: 'var(--hu)' }}>CONNECTED</span> ◂ STATUS</div>
						<div className="cover-page__panelDot cover-page__panelDot--warm" />
					</div>

					{/* Minimal Scroll Indicator */}
					<div className="cover-page__hint" style={{ opacity: hintOpacity }}>
						<span>SCROLL TO ENTER</span>
						<i />
					</div>

					{/* Scroll Revealed Typography */}
					<div
						className="cover-page__title"
						style={{
							opacity: titleOpacity,
							transform: `translate(-50%, calc(-50% + ${titleTranslateY}px))`,
							pointerEvents: titleOpacity > 0.5 ? 'auto' : 'none',
						}}
					>
						<span className="cover-page__eyebrow">◈ &nbsp;&nbsp; AUTONOMOUS INTELLIGENCE IN THE PHYSICAL WORLD &nbsp;&nbsp; ◈</span>
						<h1 className="cover-page__headline">AITIZEN<br />REALM</h1>
						<div className="cover-page__titleLine" style={{ width: titleOpacity > 0.4 ? '100%' : '0%' }} />
						<h2 className="cover-page__tagline">AI AGENTS IN THE REAL WORLD</h2>
						<p className="cover-page__subhead">
							Autonomous intelligence that learns, adapts and acts within everyday human life.
						</p>
					</div>
				</div>
			</div>
		</section>
	)
}
