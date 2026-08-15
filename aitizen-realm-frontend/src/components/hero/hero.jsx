import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import './hero.css'

const AI_GLB = '/models/ai/Meshy_AI_Futuristic_humanoid_t_0808114600_texture.glb'
const HUMAN_GLB = '/models/humans/Meshy_AI_Classical_marble_scul_0808115614_texture.glb'

// ── Math & Easing Utilities ──────────────────────────────────────────────────
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value))
}

function lerp(start, end, amount) {
	return start + (end - start) * amount
}

function easeInOutCubic(t) {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easeOutCubic(t) {
	return 1 - Math.pow(1 - t, 3)
}

function easeInOutQuad(t) {
	return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function easeOutQuad(t) {
	return 1 - (1 - t) * (1 - t)
}

function easeInOutSine(t) {
	return -(Math.cos(Math.PI * t) - 1) / 2
}

// Maps progress within [start, end] into a normalized [0, 1] eased value
function getPhase(progress, start, end, easingFn = (t) => t) {
	if (progress <= start) return 0
	if (progress >= end) return 1
	const t = (progress - start) / (end - start)
	return easingFn(clamp(t, 0, 1))
}

function normalizeAndCenter(model, targetHeight = 3.2) {
	const box = new THREE.Box3().setFromObject(model)
	const size = box.getSize(new THREE.Vector3())
	const center = box.getCenter(new THREE.Vector3())
	const scale = targetHeight / (size.y || 1)

	model.scale.setScalar(scale)
	// Center the model relative to its group so rotation and alignment are symmetrical
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

// ── HeroScene Component ──────────────────────────────────────────────────────
function HeroScene({ hudRefs, onReady }) {
	const canvasRef = useRef(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return undefined

		let rafId = null
		let isDestroyed = false

		const scene = new THREE.Scene()
		scene.background = new THREE.Color(0x050a14)
		scene.fog = new THREE.FogExp2(0x050a14, 0.035)

		// Stable Camera Setup: Rock-solid framing with no wobble during scroll
		const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 80)
		camera.position.set(0, 0.22, 5.0)
		camera.lookAt(0, 0.12, 0)

		const renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance',
		})
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
		renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false)
		renderer.outputColorSpace = THREE.SRGBColorSpace
		renderer.toneMapping = THREE.ACESFilmicToneMapping
		renderer.toneMappingExposure = 1.4
		renderer.localClippingEnabled = true

		const root = new THREE.Group()
		scene.add(root)

		// Lighting Setup
		const ambientLight = new THREE.AmbientLight(0x1a2638, 2.2)
		scene.add(ambientLight)

		const aiLight = new THREE.PointLight(0x00d4ff, 16, 12)
		aiLight.position.set(-3.0, 2.5, 3.0)
		scene.add(aiLight)

		const huLight = new THREE.PointLight(0xff9944, 16, 12)
		huLight.position.set(3.0, 2.5, 3.0)
		scene.add(huLight)

		const seamLight = new THREE.PointLight(0x88e5ff, 8, 6)
		seamLight.position.set(0, 0.3, 1.5)
		scene.add(seamLight)

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

		// Floor Grid
		const grid = new THREE.GridHelper(30, 40, 0x003366, 0x001122)
		grid.position.y = -2.2
		grid.material.opacity = 0.18
		grid.material.transparent = true
		scene.add(grid)

		// Seam Visual Glow Plane at x=0
		const seamGeo = new THREE.PlaneGeometry(0.04, 3.6)
		const seamMat = new THREE.MeshBasicMaterial({
			color: 0x00f0ff,
			transparent: true,
			opacity: 0.85,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
		})
		const seamMesh = new THREE.Mesh(seamGeo, seamMat)
		seamMesh.position.set(0, 0.2, 0.05)
		scene.add(seamMesh)

		// Clipping Planes: AI on left (x <= constant), Human on right (x >= -constant)
		const aiClipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.012)
		const huClipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.012)

		// Independent Model Groups driven by synchronized animation progress
		const aiGroup = new THREE.Group()
		const huGroup = new THREE.Group()
		root.add(aiGroup, huGroup)

		let loadedCount = 0
		const checkAllLoaded = () => {
			loadedCount += 1
			if (loadedCount >= 2 && onReady) {
				onReady()
			}
		}

		const loader = new GLTFLoader()
		loader.setMeshoptDecoder(MeshoptDecoder)

		loader.load(
			AI_GLB,
			(gltf) => {
				if (isDestroyed) return
				const model = gltf.scene
				normalizeAndCenter(model, 3.2)
				applyClippingAndMaterial(model, aiClipPlane, true)
				aiGroup.add(model)
				checkAllLoaded()
			},
			undefined,
			(err) => console.error('AI GLB load error:', err),
		)

		loader.load(
			HUMAN_GLB,
			(gltf) => {
				if (isDestroyed) return
				const model = gltf.scene
				normalizeAndCenter(model, 3.2)
				applyClippingAndMaterial(model, huClipPlane, false)
				huGroup.add(model)
				checkAllLoaded()
			},
			undefined,
			(err) => console.error('Human GLB load error:', err),
		)

		// ── Direct HUD Synchronizer (0 React Re-renders) ─────────────────────
		const updateHUD = (progress) => {
			if (!hudRefs) return

			// Tactical side panels fade out during separation
			const sideOpacity = clamp(1 - getPhase(progress, 0.12, 0.30, easeInOutQuad), 0, 1)
			// Scroll hint fades out immediately on first scroll
			const hintOpacity = clamp(1 - getPhase(progress, 0.02, 0.12, easeOutQuad), 0, 1)
			// Headline typography reveals as models finish separation
			const titleProgress = getPhase(progress, 0.38, 0.68, easeInOutCubic)
			const titleTranslateY = lerp(30, 0, titleProgress)

			if (hudRefs.progressBar?.current) {
				hudRefs.progressBar.current.style.width = `${progress * 100}%`
			}
			if (hudRefs.panelLeft?.current) {
				hudRefs.panelLeft.current.style.opacity = sideOpacity
			}
			if (hudRefs.panelRight?.current) {
				hudRefs.panelRight.current.style.opacity = sideOpacity
			}
			if (hudRefs.hint?.current) {
				hudRefs.hint.current.style.opacity = hintOpacity
			}
			if (hudRefs.title?.current) {
				hudRefs.title.current.style.opacity = titleProgress
				hudRefs.title.current.style.transform = `translate(-50%, calc(-50% + ${titleTranslateY}px))`
				hudRefs.title.current.style.pointerEvents = titleProgress > 0.5 ? 'auto' : 'none'
			}
			if (hudRefs.titleLine?.current) {
				hudRefs.titleLine.current.style.width = titleProgress > 0.35 ? '100%' : '0%'
			}
		}

		// Initial HUD sync
		updateHUD(0)

		// ── Scroll Input Tracking ────────────────────────────────────────────
		const scrollTarget = { value: 0 }
		const smoothedProgress = { value: 0 }

		const updateScrollTarget = () => {
			const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1)
			scrollTarget.value = clamp(window.scrollY / maxScroll, 0, 1)
		}
		updateScrollTarget()
		window.addEventListener('scroll', updateScrollTarget, { passive: true })
		window.addEventListener('resize', updateScrollTarget)

		const resize = () => {
			const width = canvas.clientWidth || window.innerWidth
			const height = canvas.clientHeight || window.innerHeight
			camera.aspect = width / height
			camera.updateProjectionMatrix()
			renderer.setSize(width, height, false)
		}

		// ── Cinematic Animation Engine ────────────────────────────────────────
		// Frame-rate independent exponential smoothing with delta-time damping
		const DAMPING_LAMBDA = 7.5 // Responsive, luxurious catch-up curve
		let lastTime = performance.now()
		let isTabHidden = document.hidden
		let floatIntensity = 0

		const animate = (now) => {
			if (isDestroyed) return
			rafId = window.requestAnimationFrame(animate)

			const dt = Math.min((now - lastTime) / 1000, 0.1)
			lastTime = now

			if (isTabHidden) return

			// ── Frame-Rate Independent Exponential Smoothing ──────────────────
			// progress += (target - progress) * (1 - exp(-lambda * dt))
			const alpha = 1 - Math.exp(-DAMPING_LAMBDA * dt)
			smoothedProgress.value += (scrollTarget.value - smoothedProgress.value) * alpha

			const p = smoothedProgress.value

			// Update HUD DOM styles directly (zero React overhead)
			updateHUD(p)

			// ── Animation Timeline Mapping ────────────────────────────────────
			// Phase 1 (0.00 – 0.15): Combined Face Hold
			// Phase 2 (0.15 – 0.40): Gradual Controlled Separation
			// Phase 3 (0.30 – 0.58): Model Reveal (clipping planes open)
			// Phase 4 (0.40 – 0.90): 3D Rotation toward each other
			// Phase 5 (0.90 – 1.00): Settle smoothly into final face-to-face

			// 1. Separation curve (0.15 -> 0.40)
			const separation = getPhase(p, 0.15, 0.40, easeInOutCubic)

			// 2. Unclipping curve (0.25 -> 0.55)
			const unclipPhase = getPhase(p, 0.25, 0.55, easeInOutQuad)

			// 3. Continuous 3D Rotation (0.40 -> 0.92) with smooth deceleration
			const rotatePhase = getPhase(p, 0.40, 0.92, easeInOutCubic)

			// 4. Settling curve (0.88 -> 1.00)
			const settlePhase = getPhase(p, 0.88, 1.00, easeOutCubic)

			// Dynamic idle floating: only active when user is resting at a scroll position
			const scrollDelta = Math.abs(scrollTarget.value - p)
			if (scrollDelta < 0.001) {
				floatIntensity = lerp(floatIntensity, 1.0, dt * 2.0)
			} else {
				floatIntensity = lerp(floatIntensity, 0.0, dt * 10.0)
			}
			const elapsedTime = now / 1000
			const floatY = Math.sin(elapsedTime * 1.1) * 0.025 * floatIntensity

			// Model X Positions:
			// Initial (0.00 - 0.15): x = 0 (perfect split face)
			// Separating (0.15 - 0.40): moves outward to x = ±2.6
			// Settling (0.90 - 1.00): gentle mutual focus adjustment to x = ±2.45
			const baseAiX = lerp(0, -2.6, separation)
			const finalAiX = lerp(baseAiX, -2.45, settlePhase)
			const baseHuX = lerp(0, 2.6, separation)
			const finalHuX = lerp(baseHuX, 2.45, settlePhase)

			aiGroup.position.set(finalAiX, -0.22 + floatY, 0)
			huGroup.position.set(finalHuX, -0.22 - floatY, 0)

			// Model Y Rotations:
			// Initial (0.00 - 0.40): 0 rad (facing camera)
			// Rotated (0.40 - 0.92): smoothly turns to face each other (+1.48 rad AI, -1.48 rad Human)
			const targetAiRot = 1.48
			const targetHuRot = -1.48
			aiGroup.rotation.y = lerp(0, targetAiRot, rotatePhase)
			huGroup.rotation.y = lerp(0, targetHuRot, rotatePhase)

			// Clipping Planes:
			// Initial: constant = 0.012 (strictly halves each mesh at seam)
			// Unclipping: expands to 25.0 to reveal full 3D models seamlessly
			const clipConst = lerp(0.012, 25.0, unclipPhase)
			aiClipPlane.constant = clipConst
			huClipPlane.constant = clipConst

			// Seam visual indicator
			seamMesh.scale.y = lerp(1, 0, separation)
			seamMat.opacity = clamp(0.85 * (1 - separation * 2.2), 0, 0.85)

			// Dynamic lights follow models smoothly
			aiLight.position.x = finalAiX - 0.8
			huLight.position.x = finalHuX + 0.8
			seamLight.intensity = (1 - separation) * 8

			// Stable camera with gentle, subtle framing zoom
			const camZ = lerp(5.0, 5.35, separation)
			camera.position.set(0, 0.22, camZ)
			camera.lookAt(0, 0.12, 0)

			// Ambient background star drift
			stars.rotation.y = elapsedTime * 0.012

			renderer.render(scene, camera)
		}

		// Visibility listener: halts GPU updates when tab is in background
		const onVisibilityChange = () => {
			isTabHidden = document.hidden
			if (!isTabHidden) {
				lastTime = performance.now()
			}
		}
		document.addEventListener('visibilitychange', onVisibilityChange)

		resize()
		window.addEventListener('resize', resize)
		rafId = window.requestAnimationFrame(animate)

		return () => {
			isDestroyed = true
			if (rafId) window.cancelAnimationFrame(rafId)
			document.removeEventListener('visibilitychange', onVisibilityChange)
			window.removeEventListener('resize', resize)
			window.removeEventListener('scroll', updateScrollTarget)
			window.removeEventListener('resize', updateScrollTarget)
			renderer.dispose()
			stars.geometry.dispose()
			stars.material.dispose()
			grid.geometry.dispose()
			grid.material.dispose()
			seamGeo.dispose()
			seamMat.dispose()
		}
	}, [hudRefs, onReady])

	return <canvas ref={canvasRef} className="cover-page__canvas" aria-hidden="true" />
}

export default function Hero() {
	// HUD DOM element refs updated directly with 0 React re-renders during animation
	const progressBarRef = useRef(null)
	const panelLeftRef = useRef(null)
	const panelRightRef = useRef(null)
	const hintRef = useRef(null)
	const titleRef = useRef(null)
	const titleLineRef = useRef(null)

	const hudRefs = useRef({
		progressBar: progressBarRef,
		panelLeft: panelLeftRef,
		panelRight: panelRightRef,
		hint: hintRef,
		title: titleRef,
		titleLine: titleLineRef,
	}).current

	const [loaderVisible, setLoaderVisible] = useState(true)

	// Callback when models finish loading
	const handleReady = useCallback(() => {
		window.setTimeout(() => {
			setLoaderVisible(false)
		}, 300)
	}, [])

	// Fallback loader dismiss timer
	useEffect(() => {
		const timer = window.setTimeout(() => setLoaderVisible(false), 2400)
		return () => window.clearTimeout(timer)
	}, [])

	return (
		<section className="cover-page">
			{/* Loading Screen */}
			<div
				className="cover-page__loader"
				style={{ opacity: loaderVisible ? 1 : 0, pointerEvents: loaderVisible ? 'all' : 'none' }}
				aria-hidden="true"
			>
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
				<HeroScene hudRefs={hudRefs} onReady={handleReady} />

				<div className="cover-page__hud">
					{/* Scroll Progress Bar */}
					<div className="cover-page__progress" aria-hidden="true">
						<span ref={progressBarRef} style={{ width: '0%' }} />
					</div>

					{/* Tactical Corner Accents */}
					<div className="cover-page__corner cover-page__corner--tl" aria-hidden="true" />
					<div className="cover-page__corner cover-page__corner--tr" aria-hidden="true" />
					<div className="cover-page__corner cover-page__corner--bl" aria-hidden="true" />
					<div className="cover-page__corner cover-page__corner--br" aria-hidden="true" />

					{/* Initial Split HUD Panels */}
					<div ref={panelLeftRef} className="cover-page__panel cover-page__panel--left" style={{ opacity: 1 }}>
						<div className="cover-page__panelLabel">◈ SYNTHETIC ENTITY</div>
						<div className="cover-page__panelLine">TYPE ▸ ARTIFICIAL INTELLIGENCE</div>
						<div className="cover-page__panelLine">UNIT ▸ AI-v4.7 / NEURAL</div>
						<div className="cover-page__panelLine">STATUS ▸ <span style={{ color: 'var(--ai)' }}>AUTONOMOUS</span></div>
						<div className="cover-page__panelDot" />
					</div>

					<div ref={panelRightRef} className="cover-page__panel cover-page__panel--right" style={{ opacity: 1 }}>
						<div className="cover-page__panelLabel cover-page__panelLabel--warm">HOMO SAPIENS ◈</div>
						<div className="cover-page__panelLine">BIOLOGICAL ◂ TYPE</div>
						<div className="cover-page__panelLine">REAL WORLD ◂ ENVIRONMENT</div>
						<div className="cover-page__panelLine"><span style={{ color: 'var(--hu)' }}>CONNECTED</span> ◂ STATUS</div>
						<div className="cover-page__panelDot cover-page__panelDot--warm" />
					</div>

					{/* Minimal Scroll Indicator */}
					<div ref={hintRef} className="cover-page__hint" style={{ opacity: 1 }}>
						<span>SCROLL TO ENTER</span>
						<i />
					</div>

					{/* Scroll Revealed Typography */}
					<div
						ref={titleRef}
						className="cover-page__title"
						style={{
							opacity: 0,
							transform: 'translate(-50%, calc(-50% + 30px))',
							pointerEvents: 'none',
						}}
					>
						<span className="cover-page__eyebrow">◈ &nbsp;&nbsp; AUTONOMOUS INTELLIGENCE IN THE PHYSICAL WORLD &nbsp;&nbsp; ◈</span>
						<h1 className="cover-page__headline">AITIZEN<br />REALM</h1>
						<div ref={titleLineRef} className="cover-page__titleLine" style={{ width: '0%' }} />
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
