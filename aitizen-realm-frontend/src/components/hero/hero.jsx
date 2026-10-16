import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import './hero.css'

const AI_GLB = '/models/ai/Meshy_AI_Futuristic_humanoid_t_0808114600_texture.glb'
const HUMAN_GLB = '/models/humans/Meshy_AI_Classical_marble_scul_0808115614_texture.glb'

// ── Math & Easing Utilities ──────────────────────────────────────────
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value))
}

function lerp(start, end, amount) {
	return start + (end - start) * amount
}

function smoothDamp(current, target, currentVelocity, smoothTime, deltaTime) {
	const safeSmoothTime = Math.max(0.0001, smoothTime)
	const omega = 2 / safeSmoothTime
	const step = omega * deltaTime
	const decay = 1 / (1 + step + 0.48 * step * step + 0.235 * step * step * step)
	const change = current - target
	const temporary = (currentVelocity + omega * change) * deltaTime
	let velocity = (currentVelocity - omega * temporary) * decay
	let value = target + (change + temporary) * decay

	const crossedTarget = (target - current > 0 && value > target) || (target - current < 0 && value < target)
	if (crossedTarget) {
		value = target
		velocity = 0
	}

	return { value, velocity }
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
	model.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
	return { size, center, scale }
}

function applyClippingAndMaterial(model, clipPlane, isAI = false) {
	const wireframes = []
	const pointClouds = []

	model.traverse((child) => {
		if (child.userData.isOverlay) return
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
				m.metalness = 0.88
				m.roughness = 0.22
				m.color = new THREE.Color(0x6e8fb5)
				m.emissive = new THREE.Color(0x002850)
				m.emissiveIntensity = 0.45
			} else {
				m.metalness = 0.04
				m.roughness = 0.68
				m.color = new THREE.Color(0xe2d6c8)
			}
			return m
		}

		if (Array.isArray(child.material)) {
			child.material = child.material.map(cloneMat)
		} else {
			child.material = cloneMat(child.material)
		}

		// Create Cybernetic Neural Points & Wireframe Overlay for the AI model
		if (isAI && child.geometry) {
			const wireMat = new THREE.MeshBasicMaterial({
				color: 0x00d9ff,
				wireframe: true,
				transparent: true,
				opacity: 0.35,
				clippingPlanes: [clipPlane],
				blending: THREE.AdditiveBlending,
			})
			const wireMesh = new THREE.Mesh(child.geometry, wireMat)
			wireMesh.userData.isOverlay = true
			wireMesh.scale.copy(child.scale)
			wireMesh.position.copy(child.position)
			wireMesh.rotation.copy(child.rotation)
			child.add(wireMesh)
			wireframes.push(wireMesh)

			const pointsMat = new THREE.PointsMaterial({
				color: 0x66e5ff,
				size: 0.042,
				transparent: true,
				opacity: 0.8,
				clippingPlanes: [clipPlane],
				blending: THREE.AdditiveBlending,
			})
			const points = new THREE.Points(child.geometry, pointsMat)
			points.userData.isOverlay = true
			points.scale.copy(child.scale)
			points.position.copy(child.position)
			points.rotation.copy(child.rotation)
			child.add(points)
			pointClouds.push(points)
		}
	})

	return { wireframes, pointClouds }
}

function makeStars(count = 3000) {
	const geometry = new THREE.BufferGeometry()
	const positions = new Float32Array(count * 3)
	const colors = new Float32Array(count * 3)

	for (let i = 0; i < count; i += 1) {
		positions[i * 3] = (Math.random() - 0.5) * 85
		positions[i * 3 + 1] = (Math.random() - 0.5) * 55
		positions[i * 3 + 2] = (Math.random() - 0.5) * 65 - 12

		const r = Math.random()
		if (r < 0.42) {
			colors[i * 3] = 0.0
			colors[i * 3 + 1] = 0.88
			colors[i * 3 + 2] = 1.0
		} else if (r < 0.72) {
			colors[i * 3] = 0.58
			colors[i * 3 + 1] = 0.42
			colors[i * 3 + 2] = 1.0
		} else {
			colors[i * 3] = 0.88
			colors[i * 3 + 1] = 0.94
			colors[i * 3 + 2] = 1.0
		}
	}

	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

	return new THREE.Points(
		geometry,
		new THREE.PointsMaterial({ size: 0.038, vertexColors: true, transparent: true, opacity: 0.75 }),
	)
}

function createSynapticStream(count = 180) {
	const geometry = new THREE.BufferGeometry()
	const positions = new Float32Array(count * 3)
	const colors = new Float32Array(count * 3)

	for (let i = 0; i < count; i++) {
		positions[i * 3] = 0
		positions[i * 3 + 1] = 0
		positions[i * 3 + 2] = 0

		colors[i * 3] = 0.0
		colors[i * 3 + 1] = 0.85
		colors[i * 3 + 2] = 1.0
	}

	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

	const mat = new THREE.PointsMaterial({
		size: 0.065,
		vertexColors: true,
		transparent: true,
		opacity: 0,
		blending: THREE.AdditiveBlending,
	})

	const points = new THREE.Points(geometry, mat)
	return { points, geometry, count }
}

// ── HeroScene Component ──────────────────────────────────────────────
function HeroScene({ containerRef, hudRefs, onReady }) {
	const canvasRef = useRef(null)

	useEffect(() => {
		const canvas = canvasRef.current
		const container = containerRef.current
		if (!canvas || !container) return undefined

		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
		const saveDataEnabled = Boolean(navigator.connection?.saveData)
		const useStaticScene = window.innerWidth < 640 || saveDataEnabled

		// Avoid downloading almost 20 MB of 3D models on small screens or data-saver connections.
		// The layered CSS ambience remains as a lightweight visual fallback.
		if (useStaticScene) {
			onReady?.()
			return undefined
		}

		const refs = {
			progressBar: hudRefs.progressBar,
			coverOverlay: hudRefs.coverOverlay,
			encounterOverlay: hudRefs.encounterOverlay,
			panelLeft: hudRefs.panelLeft,
			panelRight: hudRefs.panelRight,
			hint: hudRefs.hint,
		}

		let rafId = null
		let isDestroyed = false

		const scene = new THREE.Scene()
		scene.background = new THREE.Color(0x030711)
		scene.fog = new THREE.FogExp2(0x030711, 0.030)

		const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 90)
		camera.position.set(0, 0.18, 5.0)
		camera.lookAt(0, 0.10, 0)

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
		renderer.toneMappingExposure = 1.45
		renderer.localClippingEnabled = true

		const root = new THREE.Group()
		scene.add(root)

		// Lighting Setup
		const ambientLight = new THREE.AmbientLight(0x162235, 2.5)
		scene.add(ambientLight)

		const aiLight = new THREE.PointLight(0x00e5ff, 19, 15)
		aiLight.position.set(-3.0, 2.5, 3.2)
		scene.add(aiLight)

		const huLight = new THREE.PointLight(0xd7e5ff, 17, 15)
		huLight.position.set(3.0, 2.5, 3.2)
		scene.add(huLight)

		const seamLight = new THREE.PointLight(0x55d0ff, 12, 8)
		seamLight.position.set(0, 0.25, 1.8)
		scene.add(seamLight)

		const aiRim = new THREE.PointLight(0x3877ff, 13, 11)
		aiRim.position.set(-4.5, 0.5, -2.0)
		scene.add(aiRim)

		const huRim = new THREE.PointLight(0x9db7df, 11, 11)
		huRim.position.set(4.5, 0.5, -2.0)
		scene.add(huRim)

		const topLight = new THREE.DirectionalLight(0xe8f2ff, 1.9)
		topLight.position.set(0, 6, 4.5)
		scene.add(topLight)

		// Background Stars
		const starCount = window.innerWidth < 768 ? 700 : 1800
		const stars = makeStars(starCount)
		scene.add(stars)

		// Floor Digital Grid
		const grid = new THREE.GridHelper(36, 48, 0x0055aa, 0x001428)
		grid.position.y = -2.2
		grid.material.opacity = 0.18
		grid.material.transparent = true
		scene.add(grid)

		// Center Seam Glow Line
		const seamGeo = new THREE.PlaneGeometry(0.038, 3.9)
		const seamMat = new THREE.MeshBasicMaterial({
			color: 0x00e5ff,
			transparent: true,
			opacity: 0.95,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
		})
		const seamMesh = new THREE.Mesh(seamGeo, seamMat)
		seamMesh.position.set(0, 0.2, 0.08)
		scene.add(seamMesh)

		// Synaptic Stream
		const synaptic = createSynapticStream(180)
		scene.add(synaptic.points)

		// AI on Left (x <= 0), Human on Right (x >= 0)
		const aiClipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.012)
		const huClipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.012)

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

		// ── Direct HUD Synchronizer ──────────────────────────────────────
		const updateHUD = (progress) => {
			// Hero Cover Title (0% -> 22%)
			const heroCoverOpacity = clamp(1 - getPhase(progress, 0.05, 0.22, easeInOutQuad), 0, 1)
			const heroCoverTranslateY = lerp(0, -28, getPhase(progress, 0.03, 0.22, easeOutQuad))

			// Scroll Hint
			const hintOpacity = clamp(1 - getPhase(progress, 0.02, 0.12, easeOutQuad), 0, 1)

			// Side HUD Indicators (Visible during Separation in middle phase)
			const sideOpacity = clamp(
				getPhase(progress, 0.22, 0.36, easeInOutQuad) * (1 - getPhase(progress, 0.70, 0.82, easeInOutQuad)),
				0,
				1,
			)

			// Face-to-Face Encounter Banner (0.80 -> 1.00)
			const encounterOpacity = clamp(getPhase(progress, 0.80, 0.95, easeInOutCubic), 0, 1)
			const encounterTranslateY = lerp(24, 0, getPhase(progress, 0.80, 0.95, easeOutCubic))

			// Progress bar
			if (refs.progressBar?.current) {
				refs.progressBar.current.style.width = `${progress * 100}%`
			}

			// Hero Cover Text
			if (refs.coverOverlay?.current) {
				refs.coverOverlay.current.style.opacity = heroCoverOpacity
				refs.coverOverlay.current.style.transform = `translateY(${heroCoverTranslateY}px)`
				refs.coverOverlay.current.style.pointerEvents = heroCoverOpacity > 0.25 ? 'auto' : 'none'
			}

			// Encounter Text
			if (refs.encounterOverlay?.current) {
				refs.encounterOverlay.current.style.opacity = encounterOpacity
				refs.encounterOverlay.current.style.transform = `translate(-50%, ${encounterTranslateY}px)`
				refs.encounterOverlay.current.style.pointerEvents = encounterOpacity > 0.4 ? 'auto' : 'none'
			}

			// Side Panels
			if (refs.panelLeft?.current) refs.panelLeft.current.style.opacity = sideOpacity
			if (refs.panelRight?.current) refs.panelRight.current.style.opacity = sideOpacity

			// Scroll Hint
			if (refs.hint?.current) {
				refs.hint.current.style.opacity = hintOpacity
				refs.hint.current.style.pointerEvents = hintOpacity > 0.2 ? 'auto' : 'none'
			}
		}

		updateHUD(0)

		// ── Scroll & Mouse Tracking ──────────────────────────────────────
		const scrollTarget = { value: 0 }
		const smoothedProgress = { value: 0 }
		const scrollVelocity = { value: 0 }

		const mouseTarget = { x: 0, y: 0 }
		const smoothedMouse = { x: 0, y: 0 }

		const updateScrollTarget = () => {
			const rect = container.getBoundingClientRect()
			const totalScrollable = container.offsetHeight - window.innerHeight
			if (totalScrollable <= 0) {
				scrollTarget.value = 0
				return
			}
			scrollTarget.value = clamp(-rect.top / totalScrollable, 0, 1)
		}

		updateScrollTarget()
		window.addEventListener('scroll', updateScrollTarget, { passive: true })

		const onMouseMove = (e) => {
			mouseTarget.x = (e.clientX / window.innerWidth - 0.5) * 2
			mouseTarget.y = (e.clientY / window.innerHeight - 0.5) * 2
		}
		window.addEventListener('mousemove', onMouseMove, { passive: true })

		let vpWidth = window.innerWidth
		let vpHeight = window.innerHeight

		const resize = () => {
			vpWidth = canvas.clientWidth || window.innerWidth
			vpHeight = canvas.clientHeight || window.innerHeight
			camera.aspect = vpWidth / vpHeight
			camera.updateProjectionMatrix()
			renderer.setSize(vpWidth, vpHeight, false)
			updateScrollTarget()
		}
		window.addEventListener('resize', resize)

		// ── Animation Loop ───────────────────────────────────────────────
		const SCROLL_SMOOTH_TIME = 0.14
		let lastTime = performance.now()
		let isTabHidden = document.hidden
		let floatIntensity = 0

		const animate = (now) => {
			if (isDestroyed) return
			rafId = window.requestAnimationFrame(animate)

			const dt = Math.min((now - lastTime) / 1000, 0.1)
			lastTime = now

			if (isTabHidden) return

			// Critically damped scroll progress stays responsive without jitter or overshoot.
			if (prefersReducedMotion) {
				smoothedProgress.value = scrollTarget.value
				scrollVelocity.value = 0
			} else {
				const smoothedScroll = smoothDamp(
					smoothedProgress.value,
					scrollTarget.value,
					scrollVelocity.value,
					SCROLL_SMOOTH_TIME,
					dt,
				)
				smoothedProgress.value = clamp(smoothedScroll.value, 0, 1)
				scrollVelocity.value = smoothedScroll.velocity
			}

			if (!prefersReducedMotion) {
				smoothedMouse.x += (mouseTarget.x - smoothedMouse.x) * (1 - Math.exp(-4.5 * dt))
				smoothedMouse.y += (mouseTarget.y - smoothedMouse.y) * (1 - Math.exp(-4.5 * dt))
			} else {
				smoothedMouse.x = 0
				smoothedMouse.y = 0
			}

			const p = smoothedProgress.value
			updateHUD(p)

			// ── Multi-Phase Timeline (0% -> 20% -> 40% -> 60% -> 80% -> 100%) ──
			const separation = getPhase(p, 0.18, 0.45, easeInOutCubic)
			const unclipPhase = getPhase(p, 0.22, 0.40, easeInOutQuad)
			const rotatePhase = getPhase(p, 0.40, 0.88, easeInOutCubic)
			const settlePhase = getPhase(p, 0.85, 1.00, easeOutCubic)

			// Idle floating
			const scrollDelta = Math.abs(scrollTarget.value - p)
			if (scrollDelta < 0.001 && separation > 0.01 && !prefersReducedMotion) {
				floatIntensity = lerp(floatIntensity, 1.0, dt * 2.0)
			} else {
				floatIntensity = lerp(floatIntensity, 0.0, dt * 8.0)
			}
			const elapsedTime = now / 1000
			const floatY = Math.sin(elapsedTime * 1.2) * 0.02 * floatIntensity

			// Adaptive separation distance
			const isMobile = vpWidth < 768
			const isTablet = vpWidth >= 768 && vpWidth < 1024
			const maxSepX = isMobile ? 1.45 : isTablet ? 2.05 : 2.55
			const finalSepOffset = isMobile ? 0.15 : 0.22

			const baseAiX = lerp(0, -maxSepX, separation)
			const finalAiX = lerp(baseAiX, -(maxSepX - finalSepOffset), settlePhase)
			const baseHuX = lerp(0, maxSepX, separation)
			const finalHuX = lerp(baseHuX, maxSepX - finalSepOffset, settlePhase)

			aiGroup.position.set(finalAiX, -0.18 + floatY, 0)
			huGroup.position.set(finalHuX, -0.18 - floatY, 0)

			// Model Y Rotations: Face-to-face confrontation
			const targetAiRot = 1.46
			const targetHuRot = -1.46
			aiGroup.rotation.y = lerp(0, targetAiRot, rotatePhase)
			huGroup.rotation.y = lerp(0, targetHuRot, rotatePhase)

			// Mouse parallax on models
			if (!prefersReducedMotion) {
				aiGroup.rotation.x = smoothedMouse.y * 0.06
				huGroup.rotation.x = smoothedMouse.y * 0.06
				aiGroup.position.y += smoothedMouse.y * -0.03
				huGroup.position.y += smoothedMouse.y * -0.03
			}

			// Clipping Planes: Push plane constant away once separation starts
			const clipConst = lerp(0.012, 50.0, unclipPhase)
			aiClipPlane.constant = clipConst
			huClipPlane.constant = clipConst

			// Seam visual indicator
			seamMesh.scale.y = lerp(1, 0, separation)
			seamMat.opacity = clamp(0.95 * (1 - separation * 3.0), 0, 0.95)

			// Synaptic Data Stream between eyes during separation and face-to-face
			const synapticAlpha = getPhase(p, 0.35, 0.65, easeInOutQuad) * (1 - getPhase(p, 0.96, 1.0, easeOutQuad))
			synaptic.points.material.opacity = synapticAlpha * 0.9
			if (synapticAlpha > 0.01 && !prefersReducedMotion) {
				const posAttr = synaptic.geometry.attributes.position
				for (let i = 0; i < synaptic.count; i++) {
					const t = (i / synaptic.count + elapsedTime * 0.35) % 1.0
					const px = lerp(finalAiX + 0.3, finalHuX - 0.3, t)
					const py = -0.12 + Math.sin(t * Math.PI) * 0.42 + Math.sin(elapsedTime * 3 + i) * 0.06
					const pz = Math.cos(t * Math.PI) * 0.3 + Math.sin(elapsedTime * 2 + i * 2) * 0.05
					posAttr.setXYZ(i, px, py, pz)
				}
				posAttr.needsUpdate = true
			}

			// Light tracking
			aiLight.position.x = finalAiX - 0.8 + smoothedMouse.x * 0.4
			aiLight.position.y = 2.5 - smoothedMouse.y * 0.3
			huLight.position.x = finalHuX + 0.8 + smoothedMouse.x * 0.4
			huLight.position.y = 2.5 - smoothedMouse.y * 0.3
			seamLight.intensity = (1 - separation) * 12

			// Camera subtle parallax & adaptive viewport distance
			const baseCamZ = isMobile ? 6.5 : isTablet ? 5.6 : 5.0
			const camZ = lerp(baseCamZ, baseCamZ + 0.3, separation)
			camera.position.x = smoothedMouse.x * 0.2
			camera.position.y = 0.18 - smoothedMouse.y * 0.14
			camera.position.z = camZ
			camera.lookAt(smoothedMouse.x * 0.03, 0.10, 0)

			if (!prefersReducedMotion) stars.rotation.y = elapsedTime * 0.012

			renderer.render(scene, camera)
		}

		const onVisibilityChange = () => {
			isTabHidden = document.hidden
			if (!isTabHidden) {
				lastTime = performance.now()
				scrollVelocity.value = 0
			}
		}
		document.addEventListener('visibilitychange', onVisibilityChange)

		resize()
		rafId = window.requestAnimationFrame(animate)

		return () => {
			isDestroyed = true
			if (rafId) window.cancelAnimationFrame(rafId)
			document.removeEventListener('visibilitychange', onVisibilityChange)
			window.removeEventListener('resize', resize)
			window.removeEventListener('scroll', updateScrollTarget)
			window.removeEventListener('mousemove', onMouseMove)
			renderer.dispose()
			stars.geometry.dispose()
			stars.material.dispose()
			grid.geometry.dispose()
			grid.material.dispose()
			seamGeo.dispose()
			seamMat.dispose()
			synaptic.geometry.dispose()
			synaptic.points.material.dispose()
		}
	}, [containerRef, hudRefs, onReady])

	return <canvas ref={canvasRef} className="cover-page__canvas" aria-hidden="true" />
}

// ── Main Hero Pinned Section ─────────────────────────────────────────
export default function Hero() {
	const heroContainerRef = useRef(null)
	const progressBarRef = useRef(null)
	const coverOverlayRef = useRef(null)
	const encounterOverlayRef = useRef(null)
	const panelLeftRef = useRef(null)
	const panelRightRef = useRef(null)
	const hintRef = useRef(null)

	const [hudRefs] = useState(() => ({
		progressBar: progressBarRef,
		coverOverlay: coverOverlayRef,
		encounterOverlay: encounterOverlayRef,
		panelLeft: panelLeftRef,
		panelRight: panelRightRef,
		hint: hintRef,
	}))

	const [loaderVisible, setLoaderVisible] = useState(true)
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [activeNav, setActiveNav] = useState('realm')

	const handleReady = useCallback(() => {
		window.setTimeout(() => setLoaderVisible(false), 300)
	}, [])

	useEffect(() => {
		const timer = window.setTimeout(() => setLoaderVisible(false), 2400)
		return () => window.clearTimeout(timer)
	}, [])

	// Track active section for top navigation
	useEffect(() => {
		const handleScroll = () => {
			const scrollY = window.scrollY
			const ideaEl = document.getElementById('idea')
			const hiwEl = document.getElementById('how-it-works')
			const agentsEl = document.getElementById('agents')
			const hwEl = document.getElementById('human-world')
			const piEl = document.getElementById('project-info')

			if (piEl && scrollY >= piEl.offsetTop - 300) {
				setActiveNav('project-info')
			} else if (hwEl && scrollY >= hwEl.offsetTop - 300) {
				setActiveNav('human-world')
			} else if (agentsEl && scrollY >= agentsEl.offsetTop - 300) {
				setActiveNav('agents')
			} else if (hiwEl && scrollY >= hiwEl.offsetTop - 300) {
				setActiveNav('how-it-works')
			} else if (ideaEl && scrollY >= ideaEl.offsetTop - 300) {
				setActiveNav('idea')
			} else {
				setActiveNav('realm')
			}
		}

		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	const scrollToSection = (id) => {
		setMobileMenuOpen(false)
		if (id === 'realm') {
			window.scrollTo({ top: 0, behavior: 'smooth' })
			return
		}
		const el = document.getElementById(id)
		if (el) el.scrollIntoView({ behavior: 'smooth' })
	}

	const handleObserverClick = () => {
		window.location.assign('https://aitizen-realm-observer.netlify.app/')
	}

	const handleExploreClick = () => {
		scrollToSection('how-it-works')
	}

	return (
		<section ref={heroContainerRef} className="cover-page" aria-label="AITIZEN REALM Digital Experience">
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
				<div className="cover-page__loaderSub">SYNCHRONIZING EMBODIED 3D COGNITION</div>
			</div>

			{/* Background Ambience */}
			<div className="cover-page__ambient" aria-hidden="true" />
			<div className="cover-page__grain" aria-hidden="true" />

			<div className="cover-page__sticky">
				{/* Top Navigation Bar */}
				<header className="cover-nav">
					<div
						className="cover-nav__brand"
						onClick={() => scrollToSection('realm')}
						role="button"
						tabIndex={0}
						aria-label="AITIZEN REALM Home"
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') scrollToSection('realm')
						}}
					>
						<span className="cover-nav__logo" aria-hidden="true">
							<img src="/aitizen-realm-logo.png" alt="" />
						</span>
						<span className="cover-nav__title">AITIZEN REALM</span>
						<span className="cover-nav__statusTag" aria-hidden="true">
							● SYS.ONLINE
						</span>
					</div>

					{/* Desktop Navigation Links */}
					<nav className="cover-nav__links" aria-label="Primary Navigation">
						<button
							type="button"
							className={`cover-nav__link ${activeNav === 'realm' ? 'cover-nav__link--active' : ''}`}
							onClick={() => scrollToSection('realm')}
						>
							REALM
						</button>
						<button
							type="button"
							className={`cover-nav__link ${activeNav === 'idea' ? 'cover-nav__link--active' : ''}`}
							onClick={() => scrollToSection('idea')}
						>
							THE IDEA
						</button>
						<button
							type="button"
							className={`cover-nav__link ${activeNav === 'how-it-works' ? 'cover-nav__link--active' : ''}`}
							onClick={() => scrollToSection('how-it-works')}
						>
							HOW IT WORKS
						</button>
						<button
							type="button"
							className={`cover-nav__link ${activeNav === 'agents' ? 'cover-nav__link--active' : ''}`}
							onClick={() => scrollToSection('agents')}
						>
							AI AGENTS
						</button>
						<button
							type="button"
							className={`cover-nav__link ${activeNav === 'human-world' ? 'cover-nav__link--active' : ''}`}
							onClick={() => scrollToSection('human-world')}
						>
							HUMAN WORLD
						</button>
						<button
							type="button"
							className={`cover-nav__link ${activeNav === 'project-info' ? 'cover-nav__link--active' : ''}`}
							onClick={() => scrollToSection('project-info')}
						>
							PROJECT INFO
						</button>
					</nav>

					{/* Mobile Hamburger Button */}
					<button
						type="button"
						className={`cover-nav__toggle ${mobileMenuOpen ? 'cover-nav__toggle--open' : ''}`}
						onClick={() => setMobileMenuOpen((prev) => !prev)}
						aria-expanded={mobileMenuOpen}
						aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
					>
						<span className="cover-nav__toggleLine" />
						<span className="cover-nav__toggleLine" />
						<span className="cover-nav__toggleLine" />
					</button>
				</header>

				{/* Mobile Navigation Drawer */}
				<div
					className={`cover-nav__drawer ${mobileMenuOpen ? 'cover-nav__drawer--open' : ''}`}
					aria-hidden={!mobileMenuOpen}
				>
					<div className="cover-nav__drawerHeader">
						<span className="cover-nav__drawerBadge">NAVIGATION MENU</span>
					</div>
					<nav className="cover-nav__drawerList">
						<button type="button" className="cover-nav__drawerItem" onClick={() => scrollToSection('realm')}>
							<span className="cover-nav__drawerNum">01</span>
							<span>REALM (HERO)</span>
						</button>
						<button type="button" className="cover-nav__drawerItem" onClick={() => scrollToSection('idea')}>
							<span className="cover-nav__drawerNum">02</span>
							<span>THE IDEA</span>
						</button>
						<button type="button" className="cover-nav__drawerItem" onClick={() => scrollToSection('how-it-works')}>
							<span className="cover-nav__drawerNum">03</span>
							<span>HOW IT WORKS</span>
						</button>
						<button type="button" className="cover-nav__drawerItem" onClick={() => scrollToSection('agents')}>
							<span className="cover-nav__drawerNum">04</span>
							<span>AI AGENTS</span>
						</button>
						<button type="button" className="cover-nav__drawerItem" onClick={() => scrollToSection('human-world')}>
							<span className="cover-nav__drawerNum">05</span>
							<span>HUMAN WORLD</span>
						</button>
						<button type="button" className="cover-nav__drawerItem" onClick={() => scrollToSection('project-info')}>
							<span className="cover-nav__drawerNum">06</span>
							<span>PROJECT INFO</span>
						</button>
					</nav>
					<div className="cover-nav__drawerFooter">
						<span>AITIZEN REALM — NEURAL INTERFACE</span>
					</div>
				</div>

				{/* 3D WebGL Canvas */}
				<HeroScene containerRef={heroContainerRef} hudRefs={hudRefs} onReady={handleReady} />

				{/* Interactive HUD Overlay */}
				<div className="cover-page__hud">
					{/* Scroll Progress Bar */}
					<div className="cover-page__progress" aria-hidden="true">
						<span ref={progressBarRef} style={{ width: '0%' }} />
					</div>

					{/* ── CHAPTER 1: INITIAL HERO COVER ─────────────────── */}
					<div ref={coverOverlayRef} className="cover-hero">
						<div className="cover-hero__content">
							<div className="cover-hero__badge">
								<span className="cover-hero__badgeDot" />
								<span>AUTONOMOUS CIVILIZATION SIMULATION</span>
							</div>

							<h1 className="cover-hero__title">
								<span className="cover-hero__titleEyebrow">A CIVILIZATION THAT</span>
								<span className="cover-hero__titleMain">LIVES, LEARNS<br />&amp; EVOLVES.</span>
							</h1>

							<p className="cover-hero__subtitle">
								AITIZEN Realm is a living simulation where autonomous AI citizens perceive their world,
								make decisions, manage resources, and shape settlements together.
							</p>

							<div className="cover-hero__traits" aria-label="Simulation features">
								<span>Autonomous citizens</span>
								<span>Shared resources</span>
								<span>Emergent settlements</span>
							</div>

							<div className="cover-hero__actions">
								<button
									type="button"
									className="cover-hero__btn"
									onClick={handleObserverClick}
									aria-label="Open the observer view"
								>
									<span className="cover-hero__btnGlow" aria-hidden="true" />
									<span className="cover-hero__btnText">OBSERVER</span>
									<span className="cover-hero__btnArrow" aria-hidden="true">→</span>
								</button>
								<button
									type="button"
									className="cover-hero__btn cover-hero__btn--secondary"
									onClick={handleExploreClick}
								>
									<span className="cover-hero__btnText">EXPLORE HOW IT WORKS</span>
								</button>
							</div>
						</div>

						<aside className="realm-preview" aria-label="Illustrative realm simulation preview">
							<div className="realm-preview__header">
								<span><i /> CONCEPT REALM VIEW</span>
								<small>ILLUSTRATIVE</small>
							</div>
							<div className="realm-preview__map" aria-hidden="true">
								<div className="realm-preview__district realm-preview__district--one"><span /></div>
								<div className="realm-preview__district realm-preview__district--two"><span /></div>
								<div className="realm-preview__district realm-preview__district--three"><span /></div>
								<div className="realm-preview__route realm-preview__route--one" />
								<div className="realm-preview__route realm-preview__route--two" />
								<span className="realm-preview__citizen realm-preview__citizen--one" />
								<span className="realm-preview__citizen realm-preview__citizen--two" />
								<span className="realm-preview__citizen realm-preview__citizen--three" />
							</div>
							<div className="realm-preview__legend">
								<span>CITIZEN → RESOURCE</span>
								<span>HOME → SETTLEMENT</span>
								<span>DECISION → MEMORY</span>
							</div>
							<p>See how individual choices connect citizens, resources, homes, and a growing realm.</p>
						</aside>
					</div>

					{/* ── CHAPTER 1.5: FACE-TO-FACE ENCOUNTER BANNER ───── */}
					<div ref={encounterOverlayRef} className="cover-encounter" style={{ opacity: 0 }}>
						<div className="encounter-badge">
							<span className="encounter-badge-dot" />
							<span>EXP. 01 // THE SYMBIOSIS</span>
						</div>
						<h2 className="encounter-title">
							TWO ENTITIES.<br />
							<span className="encounter-gradient">ONE SHARED WORLD.</span>
						</h2>
						<p className="encounter-subtitle">
							Where synthetic cognition steps into the human lifeworld—not to compete, but to co-exist.
						</p>
						<button
							type="button"
							className="encounter-scroll-cue"
							onClick={handleExploreClick}
						>
							<span>EXPLORE THE COGNITIVE ARCHITECTURE</span>
							<span className="cue-arrow">↓</span>
						</button>
					</div>

					{/* Tactical Corner Accents with Telemetry */}
					<div className="cover-page__corner cover-page__corner--tl" aria-hidden="true">
						<span className="cover-page__cornerTag">SYS // 01</span>
					</div>
					<div className="cover-page__corner cover-page__corner--tr" aria-hidden="true">
						<span className="cover-page__cornerTag">NODE // ALPHA</span>
					</div>
					<div className="cover-page__corner cover-page__corner--bl" aria-hidden="true">
						<span className="cover-page__cornerTag">LAT: 37.77° N</span>
					</div>
					<div className="cover-page__corner cover-page__corner--br" aria-hidden="true">
						<span className="cover-page__cornerTag">SYNC: 1:1</span>
					</div>

					{/* Split HUD Tactical Labels */}
					<div ref={panelLeftRef} className="cover-page__panel cover-page__panel--left" style={{ opacity: 0 }}>
						<div className="cover-page__panelLabel">● SYNTHETIC ENTITY</div>
						<div className="cover-page__panelLine">TYPE // ARTIFICIAL INTELLIGENCE</div>
						<div className="cover-page__panelLine">UNIT // AI-v4.7 / NEURAL CORE</div>
						<div className="cover-page__panelLine">
							STATUS // <span style={{ color: 'var(--ai)' }}>AUTONOMOUS</span>
						</div>
						<div className="cover-page__panelLine">LOGIC // NON-LINEAR SYNAPSE</div>
						<div className="cover-page__panelDot" />
					</div>

					<div ref={panelRightRef} className="cover-page__panel cover-page__panel--right" style={{ opacity: 0 }}>
						<div className="cover-page__panelLabel cover-page__panelLabel--warm">HOMO SAPIENS ●</div>
						<div className="cover-page__panelLine">BIOLOGICAL // TYPE</div>
						<div className="cover-page__panelLine">REAL WORLD // ENVIRONMENT</div>
						<div className="cover-page__panelLine">
							<span style={{ color: 'var(--hu)' }}>CONNECTED</span> // STATUS
						</div>
						<div className="cover-page__panelLine">INTUITION // TRANSCENDENT</div>
						<div className="cover-page__panelDot cover-page__panelDot--warm" />
					</div>

					{/* Minimal Scroll Indicator */}
					<button
						type="button"
						ref={hintRef}
						className="cover-page__hint"
						onClick={() => scrollToSection('idea')}
						style={{ opacity: 1 }}
						aria-label="Scroll to discover"
					>
						<span className="cover-page__hintLabel">SCROLL TO DISCOVER</span>
						<div className="cover-page__hintTrack">
							<span className="cover-page__hintBeam" />
						</div>
					</button>
				</div>
			</div>
		</section>
	)
}
