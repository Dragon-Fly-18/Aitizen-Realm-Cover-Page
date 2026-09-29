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
			// 1. Subtle glowing wireframe
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

			// 2. Glowing Neural Constellation Points
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

function makeStars(count = 3400) {
	const geometry = new THREE.BufferGeometry()
	const positions = new Float32Array(count * 3)
	const colors = new Float32Array(count * 3)

	for (let i = 0; i < count; i += 1) {
		positions[i * 3] = (Math.random() - 0.5) * 85
		positions[i * 3 + 1] = (Math.random() - 0.5) * 55
		positions[i * 3 + 2] = (Math.random() - 0.5) * 65 - 12

		const r = Math.random()
		if (r < 0.42) {
			// Cyan / AI particle
			colors[i * 3] = 0.0
			colors[i * 3 + 1] = 0.88
			colors[i * 3 + 2] = 1.0
		} else if (r < 0.72) {
			// Violet / Ethereal particle
			colors[i * 3] = 0.58
			colors[i * 3 + 1] = 0.42
			colors[i * 3 + 2] = 1.0
		} else {
			// Soft white star
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

// Synaptic Data Stream linking AI and Human across space
function createSynapticStream(count = 160) {
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

// ── HeroScene Component ──────────────────────────────────────────────────────
function HeroScene({ hudRefs, onReady, onScrollProgress }) {
	const canvasRef = useRef(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return undefined

		let rafId = null
		let isDestroyed = false

		const scene = new THREE.Scene()
		scene.background = new THREE.Color(0x030711)
		scene.fog = new THREE.FogExp2(0x030711, 0.030)

		const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 90)
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

		const huLight = new THREE.PointLight(0xffb066, 17, 15)
		huLight.position.set(3.0, 2.5, 3.2)
		scene.add(huLight)

		const seamLight = new THREE.PointLight(0x55d0ff, 12, 8)
		seamLight.position.set(0, 0.25, 1.8)
		scene.add(seamLight)

		const aiRim = new THREE.PointLight(0x3877ff, 13, 11)
		aiRim.position.set(-4.5, 0.5, -2.0)
		scene.add(aiRim)

		const huRim = new THREE.PointLight(0xff7722, 11, 11)
		huRim.position.set(4.5, 0.5, -2.0)
		scene.add(huRim)

		const topLight = new THREE.DirectionalLight(0xe8f2ff, 1.9)
		topLight.position.set(0, 6, 4.5)
		scene.add(topLight)

		// Background Stars
		const stars = makeStars()
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
		const synaptic = createSynapticStream(160)
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

		// ── Direct HUD Synchronizer (Zero React Re-renders during Scroll) ─────
		const updateHUD = (progress) => {
			if (!hudRefs) return

			// 1. Chapter 1: Initial Cover Page Hero (0% -> 22%)
			const heroCoverOpacity = clamp(1 - getPhase(progress, 0.04, 0.22, easeInOutQuad), 0, 1)
			const heroCoverTranslateY = lerp(0, -32, getPhase(progress, 0.02, 0.22, easeOutQuad))

			// 2. Scroll Hint (Fades out quickly upon initial scroll)
			const hintOpacity = clamp(1 - getPhase(progress, 0.01, 0.09, easeOutQuad), 0, 1)

			// 3. Side HUD Indicators (Visible during Separation & Dialogue in Chapter 2)
			const sideOpacity = clamp(
				getPhase(progress, 0.16, 0.28, easeInOutQuad) * (1 - getPhase(progress, 0.46, 0.54, easeInOutQuad)),
				0,
				1,
			)

			// 4. Chapter 2: The Convergence / Idea (Visible ~26% -> 54%)
			const ideaIn = getPhase(progress, 0.24, 0.38, easeInOutCubic)
			const ideaOut = 1 - getPhase(progress, 0.50, 0.58, easeInOutCubic)
			const ideaOpacity = clamp(ideaIn * ideaOut, 0, 1)
			const ideaTranslateY = lerp(32, 0, ideaIn) - lerp(0, 24, getPhase(progress, 0.50, 0.58, easeInOutQuad))

			// 5. Chapter 3: The Architecture / Experience (Visible ~56% -> 82%)
			const expIn = getPhase(progress, 0.58, 0.68, easeInOutCubic)
			const expOut = 1 - getPhase(progress, 0.80, 0.86, easeInOutCubic)
			const expOpacity = clamp(expIn * expOut, 0, 1)
			const expTranslateY = lerp(32, 0, expIn) - lerp(0, 24, getPhase(progress, 0.80, 0.86, easeInOutQuad))

			// 6. Chapter 4: The Manifesto / About (Visible ~84% -> 100%)
			const aboutIn = getPhase(progress, 0.84, 0.94, easeInOutCubic)
			const aboutOpacity = clamp(aboutIn, 0, 1)
			const aboutTranslateY = lerp(32, 0, aboutIn)

			// Progress bar
			if (hudRefs.progressBar?.current) {
				hudRefs.progressBar.current.style.width = `${progress * 100}%`
			}

			// Chapter 1 Hero
			if (hudRefs.coverOverlay?.current) {
				hudRefs.coverOverlay.current.style.opacity = heroCoverOpacity
				hudRefs.coverOverlay.current.style.transform = `translate(-50%, calc(-50% + ${heroCoverTranslateY}px))`
				hudRefs.coverOverlay.current.style.pointerEvents = heroCoverOpacity > 0.3 ? 'auto' : 'none'
			}

			// Side Panels
			if (hudRefs.panelLeft?.current) {
				hudRefs.panelLeft.current.style.opacity = sideOpacity
			}
			if (hudRefs.panelRight?.current) {
				hudRefs.panelRight.current.style.opacity = sideOpacity
			}

			// Scroll Hint
			if (hudRefs.hint?.current) {
				hudRefs.hint.current.style.opacity = hintOpacity
				hudRefs.hint.current.style.pointerEvents = hintOpacity > 0.2 ? 'auto' : 'none'
			}

			// Chapter 2: Idea
			if (hudRefs.chapterIdea?.current) {
				hudRefs.chapterIdea.current.style.opacity = ideaOpacity
				hudRefs.chapterIdea.current.style.transform = `translate(-50%, calc(-50% + ${ideaTranslateY}px))`
				hudRefs.chapterIdea.current.style.pointerEvents = ideaOpacity > 0.4 ? 'auto' : 'none'
			}

			// Chapter 3: Experience
			if (hudRefs.chapterExperience?.current) {
				hudRefs.chapterExperience.current.style.opacity = expOpacity
				hudRefs.chapterExperience.current.style.transform = `translate(-50%, calc(-50% + ${expTranslateY}px))`
				hudRefs.chapterExperience.current.style.pointerEvents = expOpacity > 0.4 ? 'auto' : 'none'
			}

			// Chapter 4: About
			if (hudRefs.chapterAbout?.current) {
				hudRefs.chapterAbout.current.style.opacity = aboutOpacity
				hudRefs.chapterAbout.current.style.transform = `translate(-50%, calc(-50% + ${aboutTranslateY}px))`
				hudRefs.chapterAbout.current.style.pointerEvents = aboutOpacity > 0.4 ? 'auto' : 'none'
			}
		}

		updateHUD(0)

		// ── Scroll & Mouse Tracking ──────────────────────────────────────────
		const scrollTarget = { value: 0 }
		const smoothedProgress = { value: 0 }

		const mouseTarget = { x: 0, y: 0 }
		const smoothedMouse = { x: 0, y: 0 }

		const updateScrollTarget = () => {
			const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1)
			scrollTarget.value = clamp(window.scrollY / maxScroll, 0, 1)
		}
		updateScrollTarget()
		window.addEventListener('scroll', updateScrollTarget, { passive: true })

		const onMouseMove = (e) => {
			mouseTarget.x = (e.clientX / window.innerWidth - 0.5) * 2
			mouseTarget.y = (e.clientY / window.innerHeight - 0.5) * 2
		}
		window.addEventListener('mousemove', onMouseMove, { passive: true })

		// Dynamic Aspect Ratio & Viewport Responsive Sizing
		let vpWidth = window.innerWidth
		let vpHeight = window.innerHeight

		const resize = () => {
			vpWidth = canvas.clientWidth || window.innerWidth
			vpHeight = canvas.clientHeight || window.innerHeight
			const aspect = vpWidth / vpHeight
			camera.aspect = aspect
			camera.updateProjectionMatrix()
			renderer.setSize(vpWidth, vpHeight, false)
		}
		window.addEventListener('resize', resize)
		window.addEventListener('resize', updateScrollTarget)

		// ── Cinematic Animation Engine ────────────────────────────────────────
		const DAMPING_LAMBDA = 8.0
		let lastTime = performance.now()
		let isTabHidden = document.hidden
		let floatIntensity = 0
		let lastReportedProgress = -1

		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

		const animate = (now) => {
			if (isDestroyed) return
			rafId = window.requestAnimationFrame(animate)

			const dt = Math.min((now - lastTime) / 1000, 0.1)
			lastTime = now

			if (isTabHidden) return

			// Smooth exponential progress damping
			const alpha = prefersReducedMotion ? 1 : 1 - Math.exp(-DAMPING_LAMBDA * dt)
			smoothedProgress.value += (scrollTarget.value - smoothedProgress.value) * alpha

			// Smooth mouse damping
			if (!prefersReducedMotion) {
				smoothedMouse.x += (mouseTarget.x - smoothedMouse.x) * (1 - Math.exp(-4.5 * dt))
				smoothedMouse.y += (mouseTarget.y - smoothedMouse.y) * (1 - Math.exp(-4.5 * dt))
			} else {
				smoothedMouse.x = 0
				smoothedMouse.y = 0
			}

			const p = smoothedProgress.value
			updateHUD(p)

			// Throttled notification for active nav highlighting
			if (Math.abs(p - lastReportedProgress) > 0.02 && onScrollProgress) {
				lastReportedProgress = p
				onScrollProgress(p)
			}

			// ── Multi-Phase Timeline ─────────────────────────────────────────
			const separation = getPhase(p, 0.14, 0.42, easeInOutCubic)
			const unclipPhase = getPhase(p, 0.25, 0.58, easeInOutQuad)
			const rotatePhase = getPhase(p, 0.42, 0.90, easeInOutCubic)
			const settlePhase = getPhase(p, 0.86, 1.00, easeOutCubic)

			// Idle floating & breathing
			const scrollDelta = Math.abs(scrollTarget.value - p)
			if (scrollDelta < 0.001 && separation > 0.01 && !prefersReducedMotion) {
				floatIntensity = lerp(floatIntensity, 1.0, dt * 2.0)
			} else {
				floatIntensity = lerp(floatIntensity, 0.0, dt * 8.0)
			}
			const elapsedTime = now / 1000
			const floatY = Math.sin(elapsedTime * 1.2) * 0.022 * floatIntensity

			// Adaptive mobile separation distance
			const isMobile = vpWidth < 768
			const isTablet = vpWidth >= 768 && vpWidth < 1024
			const maxSepX = isMobile ? 1.45 : isTablet ? 2.05 : 2.65
			const finalSepOffset = isMobile ? 0.15 : 0.25

			// Model X Positions
			const baseAiX = lerp(0, -maxSepX, separation)
			const finalAiX = lerp(baseAiX, -(maxSepX - finalSepOffset), settlePhase)
			const baseHuX = lerp(0, maxSepX, separation)
			const finalHuX = lerp(baseHuX, maxSepX - finalSepOffset, settlePhase)

			aiGroup.position.set(finalAiX, -0.20 + floatY, 0)
			huGroup.position.set(finalHuX, -0.20 - floatY, 0)

			// Model Y Rotations: Facing each other across space
			const targetAiRot = 1.48
			const targetHuRot = -1.48
			aiGroup.rotation.y = lerp(0, targetAiRot, rotatePhase)
			huGroup.rotation.y = lerp(0, targetHuRot, rotatePhase)

			// Subtle mouse parallax on models
			if (!prefersReducedMotion) {
				aiGroup.rotation.x = smoothedMouse.y * 0.07
				huGroup.rotation.x = smoothedMouse.y * 0.07
				aiGroup.position.y += smoothedMouse.y * -0.04
				huGroup.position.y += smoothedMouse.y * -0.04
			}

			// Clipping Planes
			const clipConst = lerp(0.012, 25.0, unclipPhase)
			aiClipPlane.constant = clipConst
			huClipPlane.constant = clipConst

			// Seam visual indicator
			seamMesh.scale.y = lerp(1, 0, separation)
			seamMat.opacity = clamp(0.95 * (1 - separation * 2.5), 0, 0.95)

			// Synaptic Data Stream between heads during separation and rotation
			const synapticAlpha = getPhase(p, 0.30, 0.65, easeInOutQuad) * (1 - getPhase(p, 0.88, 1.0, easeOutQuad))
			synaptic.points.material.opacity = synapticAlpha * 0.88
			if (synapticAlpha > 0.01) {
				const posAttr = synaptic.geometry.attributes.position
				for (let i = 0; i < synaptic.count; i++) {
					const t = (i / synaptic.count + elapsedTime * 0.35) % 1.0
					const px = lerp(finalAiX + 0.3, finalHuX - 0.3, t)
					const py = -0.15 + Math.sin(t * Math.PI) * 0.45 + Math.sin(elapsedTime * 3 + i) * 0.08
					const pz = Math.cos(t * Math.PI) * 0.3 + Math.sin(elapsedTime * 2 + i * 2) * 0.06
					posAttr.setXYZ(i, px, py, pz)
				}
				posAttr.needsUpdate = true
			}

			// Dynamic light tracking & mouse parallax
			aiLight.position.x = finalAiX - 0.8 + smoothedMouse.x * 0.5
			aiLight.position.y = 2.5 - smoothedMouse.y * 0.4
			huLight.position.x = finalHuX + 0.8 + smoothedMouse.x * 0.5
			huLight.position.y = 2.5 - smoothedMouse.y * 0.4
			seamLight.intensity = (1 - separation) * 12

			// Camera subtle parallax & adaptive viewport distance
			const baseCamZ = isMobile ? 6.6 : isTablet ? 5.7 : 5.0
			const camZ = lerp(baseCamZ, baseCamZ + 0.35, separation)
			camera.position.x = smoothedMouse.x * 0.22
			camera.position.y = 0.22 - smoothedMouse.y * 0.16
			camera.position.z = camZ
			camera.lookAt(smoothedMouse.x * 0.04, 0.12, 0)

			// Ambient background star drift
			stars.rotation.y = elapsedTime * 0.014

			renderer.render(scene, camera)
		}

		const onVisibilityChange = () => {
			isTabHidden = document.hidden
			if (!isTabHidden) {
				lastTime = performance.now()
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
			window.removeEventListener('resize', updateScrollTarget)
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
	}, [hudRefs, onReady, onScrollProgress])

	return <canvas ref={canvasRef} className="cover-page__canvas" aria-hidden="true" />
}

export default function Hero() {
	const progressBarRef = useRef(null)
	const coverOverlayRef = useRef(null)
	const panelLeftRef = useRef(null)
	const panelRightRef = useRef(null)
	const hintRef = useRef(null)
	const chapterIdeaRef = useRef(null)
	const chapterExperienceRef = useRef(null)
	const chapterAboutRef = useRef(null)

	const hudRefs = useRef({
		progressBar: progressBarRef,
		coverOverlay: coverOverlayRef,
		panelLeft: panelLeftRef,
		panelRight: panelRightRef,
		hint: hintRef,
		chapterIdea: chapterIdeaRef,
		chapterExperience: chapterExperienceRef,
		chapterAbout: chapterAboutRef,
	}).current

	const [loaderVisible, setLoaderVisible] = useState(true)
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [activeSection, setActiveSection] = useState('REALM')

	const handleReady = useCallback(() => {
		window.setTimeout(() => {
			setLoaderVisible(false)
		}, 300)
	}, [])

	useEffect(() => {
		const timer = window.setTimeout(() => setLoaderVisible(false), 2400)
		return () => window.clearTimeout(timer)
	}, [])

	const handleScrollProgress = useCallback((p) => {
		if (p < 0.24) {
			setActiveSection('REALM')
		} else if (p < 0.56) {
			setActiveSection('IDEA')
		} else if (p < 0.82) {
			setActiveSection('EXPERIENCE')
		} else {
			setActiveSection('ABOUT')
		}
	}, [])

	const handleNavClick = (targetRatio) => {
		setMobileMenuOpen(false)
		const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1)
		window.scrollTo({
			top: maxScroll * targetRatio,
			behavior: 'smooth',
		})
	}

	const handleExploreClick = () => {
		handleNavClick(0.38)
	}

	// Close mobile menu on Escape key
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === 'Escape') setMobileMenuOpen(false)
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [])

	return (
		<section className="cover-page" aria-label="AITIZEN REALM Digital Experience">
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
				<div className="cover-page__loaderSub">SYNCHRONIZING NEURAL ARCHITECTURE</div>
			</div>

			{/* Background Ambience */}
			<div className="cover-page__ambient" aria-hidden="true" />
			<div className="cover-page__grain" aria-hidden="true" />

			<div className="cover-page__sticky">
				{/* Top Navigation Bar */}
				<header className="cover-nav">
					<div
						className="cover-nav__brand"
						onClick={() => handleNavClick(0)}
						role="button"
						tabIndex={0}
						aria-label="AITIZEN REALM Home"
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') handleNavClick(0)
						}}
					>
						<span className="cover-nav__logoOrb" aria-hidden="true" />
						<span className="cover-nav__title">AITIZEN REALM</span>
						<span className="cover-nav__statusTag" aria-hidden="true">
							● SYS.ONLINE
						</span>
					</div>

					{/* Desktop Navigation Links */}
					<nav className="cover-nav__links" aria-label="Primary Navigation">
						<button
							type="button"
							className={`cover-nav__link ${activeSection === 'REALM' ? 'cover-nav__link--active' : ''}`}
							onClick={() => handleNavClick(0)}
							aria-current={activeSection === 'REALM' ? 'true' : undefined}
						>
							REALM
						</button>
						<button
							type="button"
							className={`cover-nav__link ${activeSection === 'IDEA' ? 'cover-nav__link--active' : ''}`}
							onClick={() => handleNavClick(0.38)}
							aria-current={activeSection === 'IDEA' ? 'true' : undefined}
						>
							IDEA
						</button>
						<button
							type="button"
							className={`cover-nav__link ${activeSection === 'EXPERIENCE' ? 'cover-nav__link--active' : ''}`}
							onClick={() => handleNavClick(0.68)}
							aria-current={activeSection === 'EXPERIENCE' ? 'true' : undefined}
						>
							EXPERIENCE
						</button>
						<button
							type="button"
							className={`cover-nav__link ${activeSection === 'ABOUT' ? 'cover-nav__link--active' : ''}`}
							onClick={() => handleNavClick(0.95)}
							aria-current={activeSection === 'ABOUT' ? 'true' : undefined}
						>
							ABOUT
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
						<button
							type="button"
							className={`cover-nav__drawerItem ${activeSection === 'REALM' ? 'cover-nav__drawerItem--active' : ''}`}
							onClick={() => handleNavClick(0)}
						>
							<span className="cover-nav__drawerNum">01</span>
							<span>REALM</span>
						</button>
						<button
							type="button"
							className={`cover-nav__drawerItem ${activeSection === 'IDEA' ? 'cover-nav__drawerItem--active' : ''}`}
							onClick={() => handleNavClick(0.38)}
						>
							<span className="cover-nav__drawerNum">02</span>
							<span>IDEA</span>
						</button>
						<button
							type="button"
							className={`cover-nav__drawerItem ${activeSection === 'EXPERIENCE' ? 'cover-nav__drawerItem--active' : ''}`}
							onClick={() => handleNavClick(0.68)}
						>
							<span className="cover-nav__drawerNum">03</span>
							<span>EXPERIENCE</span>
						</button>
						<button
							type="button"
							className={`cover-nav__drawerItem ${activeSection === 'ABOUT' ? 'cover-nav__drawerItem--active' : ''}`}
							onClick={() => handleNavClick(0.95)}
						>
							<span className="cover-nav__drawerNum">04</span>
							<span>ABOUT</span>
						</button>
					</nav>
					<div className="cover-nav__drawerFooter">
						<span>AITIZEN REALM ◈ NEURAL INTERFACE</span>
					</div>
				</div>

				{/* 3D WebGL Canvas */}
				<HeroScene hudRefs={hudRefs} onReady={handleReady} onScrollProgress={handleScrollProgress} />

				{/* Interactive HUD Overlay */}
				<div className="cover-page__hud">
					{/* Scroll Progress Bar */}
					<div className="cover-page__progress" aria-hidden="true">
						<span ref={progressBarRef} style={{ width: '0%' }} />
					</div>

					{/* ── CHAPTER 1: HERO COVER (One Mind. Infinite Possibilities.) ── */}
					<div
						ref={coverOverlayRef}
						className="cover-hero"
						style={{
							opacity: 1,
							transform: 'translate(-50%, -50%)',
							pointerEvents: 'auto',
						}}
					>
						<div className="cover-hero__badge">
							<span className="cover-hero__badgeDot" />
							<span>EXP.01 // SYMBIOTIC CONSCIOUSNESS</span>
						</div>

						<h1 className="cover-hero__title">
							<span className="cover-hero__titlePrimary">ONE MIND.</span>
							<span className="cover-hero__titleAccent">INFINITE</span>
							<span className="cover-hero__titleGradient">POSSIBILITIES.</span>
						</h1>

						<p className="cover-hero__subtitle">
							Where human imagination meets artificial intelligence.
						</p>

						<button
							type="button"
							className="cover-hero__btn"
							onClick={handleExploreClick}
							aria-label="Explore the Realm"
						>
							<span className="cover-hero__btnGlow" aria-hidden="true" />
							<span className="cover-hero__btnText">EXPLORE THE REALM</span>
							<span className="cover-hero__btnArrow" aria-hidden="true">→</span>
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
						<div className="cover-page__panelLabel">◈ SYNTHETIC ENTITY</div>
						<div className="cover-page__panelLine">TYPE ▸ ARTIFICIAL INTELLIGENCE</div>
						<div className="cover-page__panelLine">UNIT ▸ AI-v4.7 / NEURAL CORE</div>
						<div className="cover-page__panelLine">
							STATUS ▸ <span style={{ color: 'var(--ai)' }}>AUTONOMOUS</span>
						</div>
						<div className="cover-page__panelLine">LOGIC ▸ NON-LINEAR SYNAPSE</div>
						<div className="cover-page__panelDot" />
					</div>

					<div ref={panelRightRef} className="cover-page__panel cover-page__panel--right" style={{ opacity: 0 }}>
						<div className="cover-page__panelLabel cover-page__panelLabel--warm">HOMO SAPIENS ◈</div>
						<div className="cover-page__panelLine">BIOLOGICAL ◂ TYPE</div>
						<div className="cover-page__panelLine">REAL WORLD ◂ ENVIRONMENT</div>
						<div className="cover-page__panelLine">
							<span style={{ color: 'var(--hu)' }}>CONNECTED</span> ◂ STATUS
						</div>
						<div className="cover-page__panelLine">INTUITION ◂ TRANSCENDENT</div>
						<div className="cover-page__panelDot cover-page__panelDot--warm" />
					</div>

					{/* ── CHAPTER 2: THE IDEA / CONVERGENCE ───────────────────────── */}
					<div
						ref={chapterIdeaRef}
						className="cover-story cover-story--idea"
						style={{
							opacity: 0,
							transform: 'translate(-50%, calc(-50% + 32px))',
							pointerEvents: 'none',
						}}
					>
						<div className="cover-story__chapterBadge">
							<span>02 // THE CONVERGENCE</span>
						</div>
						<h2 className="cover-story__headline">
							A SYNTHESIS OF<br />
							<span className="cover-story__headlineGradient">TWO WORLDS</span>
						</h2>
						<p className="cover-story__body">
							Neither replaces the other. In the Aitizen Realm, machine cognition magnifies human creativity
							into uncharted dimensions—transforming solitary thought into boundless collective possibility.
						</p>
						<div className="cover-story__telemetry">
							<div className="cover-story__telemetryItem">
								<span className="cover-story__telemetryVal">&lt; 0.12ms</span>
								<span className="cover-story__telemetryLabel">NEURAL LATENCY</span>
							</div>
							<div className="cover-story__telemetryDivider" />
							<div className="cover-story__telemetryItem">
								<span className="cover-story__telemetryVal">99.98%</span>
								<span className="cover-story__telemetryLabel">SYNAPSE EFFICIENCY</span>
							</div>
							<div className="cover-story__telemetryDivider" />
							<div className="cover-story__telemetryItem">
								<span className="cover-story__telemetryVal">1 : 1</span>
								<span className="cover-story__telemetryLabel">HARMONIC RATIO</span>
							</div>
						</div>
					</div>

					{/* ── CHAPTER 3: THE EXPERIENCE / ARCHITECTURE ────────────────── */}
					<div
						ref={chapterExperienceRef}
						className="cover-story cover-story--experience"
						style={{
							opacity: 0,
							transform: 'translate(-50%, calc(-50% + 32px))',
							pointerEvents: 'none',
						}}
					>
						<div className="cover-story__chapterBadge">
							<span>03 // THE ARCHITECTURE</span>
						</div>
						<h2 className="cover-story__headline">
							ENGINEERED FOR THE<br />
							<span className="cover-story__headlineGradient">UNIMAGINED</span>
						</h2>

						<div className="cover-story__pillars">
							<div className="cover-story__pillar">
								<div className="cover-story__pillarNum">01</div>
								<h3 className="cover-story__pillarTitle">AUTONOMOUS AGENTS</h3>
								<p className="cover-story__pillarDesc">
									Self-evolving intelligences with persistent context, reasoning across digital and physical domains.
								</p>
							</div>
							<div className="cover-story__pillar">
								<div className="cover-story__pillarNum">02</div>
								<h3 className="cover-story__pillarTitle">SPATIAL REALMS</h3>
								<p className="cover-story__pillarDesc">
									Immersive 3D environments responsive to neural input and real-time human intent.
								</p>
							</div>
							<div className="cover-story__pillar">
								<div className="cover-story__pillarNum">03</div>
								<h3 className="cover-story__pillarTitle">SYMBIOTIC CO-CREATION</h3>
								<p className="cover-story__pillarDesc">
									Direct translation pipelines bridging imagination and digital form instantaneously.
								</p>
							</div>
						</div>
					</div>

					{/* ── CHAPTER 4: THE ABOUT / MANIFESTO ───────────────────────── */}
					<div
						ref={chapterAboutRef}
						className="cover-story cover-story--about"
						style={{
							opacity: 0,
							transform: 'translate(-50%, calc(-50% + 32px))',
							pointerEvents: 'none',
						}}
					>
						<div className="cover-story__chapterBadge">
							<span>04 // THE MANIFESTO</span>
						</div>
						<h2 className="cover-story__headline">
							THE DAWN OF<br />
							<span className="cover-story__headlineGradient">DIGITAL EVOLUTION</span>
						</h2>
						<p className="cover-story__manifesto">
							“We do not build machines to replace the human soul. We build realms where the human soul expands
							through artificial intelligence.”
						</p>

						<div className="cover-story__actions">
							<button
								type="button"
								className="cover-story__primaryBtn"
								onClick={() => handleNavClick(0)}
							>
								<span>ENTER SIMULATION</span>
								<span className="cover-story__btnIcon">⚡</span>
							</button>
							<button
								type="button"
								className="cover-story__secondaryBtn"
								onClick={() => handleNavClick(0.38)}
							>
								<span>EXPLORE ARCHITECTURE</span>
								<span>→</span>
							</button>
						</div>

						{/* Futuristic Sub-footer Bar */}
						<div className="cover-story__footer">
							<span>© 2026 AITIZEN REALM. ALL RIGHTS RESERVED.</span>
							<span className="cover-story__footerDivider">•</span>
							<span>QUANTUM NODE 0x9F42</span>
							<span className="cover-story__footerDivider">•</span>
							<button
								type="button"
								className="cover-story__topBtn"
								onClick={() => handleNavClick(0)}
								aria-label="Return to top"
							>
								TOP ↑
							</button>
						</div>
					</div>

					{/* Minimal Scroll Indicator */}
					<div ref={hintRef} className="cover-page__hint" onClick={handleExploreClick} style={{ opacity: 1 }}>
						<span className="cover-page__hintLabel">SCROLL TO DISCOVER</span>
						<div className="cover-page__hintTrack">
							<span className="cover-page__hintBeam" />
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

