import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import './hero.css'

const AI_GLB = '/models/optimized/Meshy_AI_Futuristic_humanoid_t_0808114600_texture.glb'
const HUMAN_GLB = '/models/optimized/Meshy_AI_Classical_marble_scul_0808115614_texture.glb'

const ACTIVITY_EXAMPLES = [
	{ id: 'work', title: 'Work', summary: 'Contribute skills', goal: 'Repair a shared workshop', need: 'A safe place to build', action: 'Offer construction skills', resources: 'Tools, timber, and energy', decision: 'The citizen weighs repair urgency against available supplies.' },
	{ id: 'learn', title: 'Learn', summary: 'Build knowledge', goal: 'Understand a new crop', need: 'Reliable food', action: 'Study the harvest records', resources: 'Time, memory, and observations', decision: 'Past crop failures make learning more useful than immediate expansion.' },
	{ id: 'shop', title: 'Shop', summary: 'Exchange goods', goal: 'Stock a neighborhood kitchen', need: 'Food for nearby homes', action: 'Trade surplus materials', resources: 'Inventory, credits, and market supply', decision: 'The citizen compares local scarcity with the cost of exchange.' },
	{ id: 'socialize', title: 'Socialize', summary: 'Form connections', goal: 'Coordinate with neighbors', need: 'Trust and cooperation', action: 'Meet at the commons', resources: 'Social ties and available time', decision: 'A recent shared project makes collaboration more likely.' },
	{ id: 'resources', title: 'Manage Resources', summary: 'Balance the realm', goal: 'Keep homes supplied', need: 'Energy and water', action: 'Redistribute reserves', resources: 'Stored energy, water, and demand', decision: 'The citizen prioritizes homes with the greatest immediate need.' },
	{ id: 'explore', title: 'Explore', summary: 'Discover change', goal: 'Find a new settlement site', need: 'Room to grow', action: 'Survey the outer district', resources: 'Travel time, map, and energy', decision: 'Current crowding outweighs the cost of a short expedition.' },
]

const ACTIVITY_TASKS = {
	work: ['Repair shared spaces', 'Coordinate tasks'],
	learn: ['Study new patterns', 'Share discoveries'],
	shop: ['Exchange supplies', 'Track local demand'],
	socialize: ['Meet neighbors', 'Build trust'],
	resources: ['Balance reserves', 'Route essential goods'],
	explore: ['Survey new ground', 'Map opportunities'],
}

function ActivityIcon({ id }) {
	const shapes = {
		work: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></>,
		learn: <><path d="M12 6c-2-2-5-2-9-1v14c4-1 7-1 9 1 2-2 5-2 9-1V5c-4-1-7-1-9 1ZM12 6v14" /></>,
		shop: <><path d="M3 4h2l2 11h12l2-8H6M9 20h.01M18 20h.01" /></>,
		socialize: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 15a5 5 0 0 1 5 5" /></>,
		resources: <><path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5" /></>,
		explore: <><circle cx="12" cy="12" r="9" /><path d="m15 9-2 4-4 2 2-4 4-2Z" /></>,
	}
	return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[id]}</svg>
}

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

function alignAiLowerFace(model) {
	model.updateMatrixWorld(true)
	const point = new THREE.Vector3()
	const inverseMatrix = new THREE.Matrix4()

	model.traverse((child) => {
		if (!child.isMesh) return
		const position = child.geometry.getAttribute('position')
		inverseMatrix.copy(child.matrixWorld).invert()

		for (let i = 0; i < position.count; i++) {
			point.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld)
			const belowEyes = 1 - getPhase(point.y, -0.42, 0.45, easeInOutQuad)
			const aboveNeck = getPhase(point.y, -1.15, -0.42, easeInOutQuad)
			const faceDepth = getPhase(point.z, -0.45, 0.15, easeInOutQuad)
			const rise = 0.1 * belowEyes * aboveNeck * faceDepth
			if (rise < 0.0001) continue
			point.y += rise
			point.applyMatrix4(inverseMatrix)
			position.setXYZ(i, point.x, point.y, point.z)
		}
		position.needsUpdate = true
		child.geometry.computeBoundingBox()
		child.geometry.computeBoundingSphere()
	})
}

function applyClippingAndMaterial(model, clipPlane, isAI = false) {
	model.traverse((child) => {
		if (!child.isMesh) return

		child.castShadow = true
		child.receiveShadow = true
		// Replace the scan's coarse normals with smooth vertex shading.
		child.geometry.deleteAttribute('normal')
		child.geometry.computeVertexNormals()

		const cloneMat = (mat) => {
			if (!mat) return new THREE.MeshStandardMaterial({ color: isAI ? 0x00d4ff : 0xd4c2a0 })
			const m = mat.clone()
			m.clippingPlanes = [clipPlane]
			m.clipShadows = true
			m.clipIntersection = false
			m.side = THREE.DoubleSide

			if (isAI) {
				m.metalness = 0.62
				m.roughness = 0.42
				m.color = new THREE.Color(0x3d74ad)
				m.emissive = new THREE.Color(0x001225)
				m.emissiveIntensity = 0.08
			} else {
				m.metalness = 0
				m.roughness = 0.82
				m.color = new THREE.Color(0xf0ddc6)
				m.map = null
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

function createCivilizationPlatform(detailed = true) {
	const group = new THREE.Group()
	group.position.y = -1.65
	group.scale.z = 0.58
	const materials = new Set()
	const districtMaterials = new Map()
	const material = (color, opacity, emissive = 0x000000) => {
		const mat = new THREE.MeshStandardMaterial({
			color, emissive, emissiveIntensity: 0.22, metalness: 0.42, roughness: 0.5,
			transparent: true, opacity, depthWrite: false,
		})
		mat.userData.baseOpacity = opacity
		materials.add(mat)
		return mat
	}

	const base = new THREE.Mesh(new THREE.CylinderGeometry(2.13, 2.04, 0.14, 48), material(0x06192b, 0.82))
	group.add(base)
	const contact = new THREE.Mesh(new THREE.CircleGeometry(1.14, 40), material(0x020712, 0.58))
	contact.rotation.x = -Math.PI / 2
	contact.position.y = 0.074
	group.add(contact)
	const ring = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.017, 6, 64), material(0x38c9ff, 0.9, 0x0068ad))
	ring.rotation.x = Math.PI / 2
	ring.position.y = 0.09
	group.add(ring)
	const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.009, 4, 64), material(0xffb778, 0.42, 0xff8b35))
	innerRing.rotation.x = Math.PI / 2
	innerRing.position.y = 0.09
	group.add(innerRing)
	const orbitalArc = new THREE.Mesh(new THREE.TorusGeometry(2.28, 0.006, 4, 64, Math.PI * 1.55), material(0x67cfff, 0.25, 0x087ec4))
	orbitalArc.rotation.x = Math.PI / 2
	orbitalArc.position.set(0, 1.61, -0.58)
	group.add(orbitalArc)
	const blueTrim = material(0x7cdbff, 0.85, 0x148fca)
	const amberTrim = material(0xffca91, 0.85, 0xd77b28)
	const blueWindow = material(0xa6eeff, 0.92, 0x45caff)
	const amberWindow = material(0xffddb0, 0.92, 0xffac54)
	blueWindow.emissiveIntensity = 1.4
	amberWindow.emissiveIntensity = 1.4
	const trunkMaterial = material(0x3c443e, 0.78)
	const canopyMaterial = material(0x326b5b, 0.8)

	ACTIVITY_EXAMPLES.forEach((activity, index) => {
		const angle = -1.2 + index * 0.48
		const district = new THREE.Group()
		district.position.set(Math.sin(angle) * 1.6, 0.09, Math.cos(angle) * 0.95)
		const warm = index >= 3
		const glow = material(warm ? 0x744626 : 0x134c75, 0.92, warm ? 0xff9a48 : 0x00baff)
		const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.39, 0.055, 16), material(warm ? 0x5d3923 : 0x113a58, 0.9))
		district.add(pad)
		for (let building = 0; building < (detailed ? 3 : 2); building++) {
			const height = 0.24 + ((index + building * 2) % 4) * 0.095
			const width = building === 1 ? 0.16 : 0.12
			const depth = 0.13
			const x = (building - 1) * 0.19
			const z = (building % 2) * 0.13 - 0.08
			const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), glow)
			mesh.position.set(x, height / 2 + 0.04, z)
			district.add(mesh)
			const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.035, 0.015, depth + 0.035), warm ? amberTrim : blueTrim)
			roof.position.set(x, height + 0.05, z)
			district.add(roof)
			if (detailed) {
				for (let floor = 0; floor < 2; floor++) {
					const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.45, 0.025), warm ? amberWindow : blueWindow)
					windowMesh.position.set(x, 0.11 + floor * Math.max(0.08, height * 0.33), z + depth / 2 + 0.002)
					district.add(windowMesh)
				}
			}
		}
		for (const side of detailed ? [-1, 1] : []) {
			const tree = new THREE.Group()
			tree.position.set(side * 0.31, 0.03, 0.19)
			const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.12, 5), trunkMaterial)
			trunk.position.y = 0.06
			const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 6), canopyMaterial)
			canopy.position.y = 0.19
			tree.add(trunk, canopy)
			district.add(tree)
		}
		const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), material(warm ? 0xffbe73 : 0x8cecff, 0.95, warm ? 0xff9a48 : 0x00baff))
		beacon.position.y = 0.57
		district.add(beacon)
		group.add(district)
		districtMaterials.set(activity.id, glow)
	})
	for (let index = 0; index < (detailed ? 8 : 0); index++) {
		const angle = -1.4 + index * 0.4
		const height = 0.42 + ((index * 3) % 5) * 0.12
		const tower = new THREE.Mesh(new THREE.BoxGeometry(0.12, height, 0.14), index < 4 ? blueTrim : amberTrim)
		tower.position.set(Math.sin(angle) * 2.0, height / 2 + 0.08, -0.6 - Math.cos(angle) * 0.34)
		group.add(tower)
	}

	return { group, materials, districtMaterials }
}

// ── HeroScene Component ──────────────────────────────────────────────
function HeroScene({ containerRef, hudRefs, hoveredActivityRef, onReady }) {
	const canvasRef = useRef(null)

	useEffect(() => {
		const canvas = canvasRef.current
		const container = containerRef.current
		if (!canvas || !container) return undefined

		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
		const saveDataEnabled = Boolean(navigator.connection?.saveData)
		const useStaticScene = saveDataEnabled

		// Data-saver connections retain the lightweight CSS fallback.
		if (useStaticScene) {
			onReady?.()
			return undefined
		}

		const refs = {
			progressBar: hudRefs.progressBar,
			coverOverlay: hudRefs.coverOverlay,
			activity: hudRefs.activity,
			encounterOverlay: hudRefs.encounterOverlay,
			panelLeft: hudRefs.panelLeft,
			panelRight: hudRefs.panelRight,
			hint: hudRefs.hint,
		}

		let rafId = null
		let isDestroyed = false

		const scene = new THREE.Scene()
		scene.background = null
		scene.fog = new THREE.FogExp2(0x030711, 0.030)

		const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 90)
		camera.position.set(0, 0.18, 4.1)
		camera.lookAt(0, 0.25, 0)

		const renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance',
		})
		renderer.setClearColor(0x030711, 0)
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1 : 1.25))
		renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false)
		renderer.outputColorSpace = THREE.SRGBColorSpace
		renderer.toneMapping = THREE.ACESFilmicToneMapping
		renderer.toneMappingExposure = 1.2
		renderer.localClippingEnabled = true

		const root = new THREE.Group()
		scene.add(root)

		// Lighting Setup
		const ambientLight = new THREE.AmbientLight(0x25344b, 1.5)
		scene.add(ambientLight)

		const aiLight = new THREE.PointLight(0x39a7ff, 14, 15)
		aiLight.position.set(-3.0, 2.5, 3.2)
		scene.add(aiLight)

		const huLight = new THREE.PointLight(0xffc38c, 10, 15)
		huLight.position.set(3.0, 2.5, 3.2)
		scene.add(huLight)

		const seamLight = new THREE.PointLight(0x55d0ff, 12, 8)
		seamLight.position.set(0, 0.25, 1.8)
		scene.add(seamLight)

		const aiRim = new THREE.PointLight(0x008dff, 8, 11)
		aiRim.position.set(-4.5, 0.5, -2.0)
		scene.add(aiRim)

		const huRim = new THREE.PointLight(0xffb874, 6, 11)
		huRim.position.set(4.5, 0.5, -2.0)
		scene.add(huRim)

		const topLight = new THREE.DirectionalLight(0xe8f2ff, 1.9)
		topLight.position.set(0, 6, 4.5)
		scene.add(topLight)

		// Background Stars
		const starCount = window.innerWidth < 768 ? 250 : 1000
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
		const platform = createCivilizationPlatform(window.innerWidth >= 768)
		scene.add(platform.group)

		// Join the cybernetic left and human right at one world-space seam.
		const aiClipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0)
		const huClipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)

		const aiGroup = new THREE.Group()
		const huGroup = new THREE.Group()
		aiGroup.scale.setScalar(0.94)
		root.add(aiGroup, huGroup)
		const aiHeadAnchor = new THREE.Vector3(0, 0.55, 0.82)
		const huHeadAnchor = new THREE.Vector3(0, 0.55, 0.82)
		const aiHeadWorld = new THREE.Vector3()
		const huHeadWorld = new THREE.Vector3()

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
				alignAiLowerFace(model)
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
				refs.coverOverlay.current.style.visibility = heroCoverOpacity > 0.05 ? 'visible' : 'hidden'
				refs.coverOverlay.current.style.pointerEvents = 'none'
			}
			if (refs.activity?.current) {
				const activityRise = prefersReducedMotion ? 0 : lerp(0, -16, getPhase(progress, 0.03, 0.22, easeOutQuad))
				refs.activity.current.style.transform = `translate3d(0, ${activityRise}px, 0)`
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
		let dragging = false
		let dragStartX = 0
		let dragBase = 0
		let dragTarget = 0
		let dragYaw = 0
		const onPointerDown = (event) => {
			if ((event.pointerType === 'mouse' && event.button !== 0) || scrollTarget.value > 0.18) return
			const x = event.clientX / window.innerWidth
			const y = event.clientY / window.innerHeight
			if (x < 0.34 || x > 0.74 || y < 0.1 || y > 0.84) return
			dragging = true
			dragStartX = event.clientX
			dragBase = dragYaw
			canvas.style.cursor = 'grabbing'
		}
		const onPointerMove = (event) => {
			if (dragging) dragTarget = clamp(dragBase + (event.clientX - dragStartX) / window.innerWidth, -0.22, 0.22)
		}
		const onPointerUp = () => {
			dragging = false
			dragTarget = 0
			canvas.style.cursor = ''
		}
		canvas.addEventListener('pointerdown', onPointerDown)
		window.addEventListener('pointermove', onPointerMove)
		window.addEventListener('pointerup', onPointerUp)
		window.addEventListener('pointercancel', onPointerUp)

		let vpWidth = window.innerWidth
		let vpHeight = window.innerHeight

		const resize = () => {
			vpWidth = canvas.clientWidth || window.innerWidth
			vpHeight = canvas.clientHeight || window.innerHeight
			camera.aspect = vpWidth / vpHeight
			camera.updateProjectionMatrix()
			renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, vpWidth < 768 ? 1 : 1.25))
			renderer.setSize(vpWidth, vpHeight, false)
			updateScrollTarget()
		}
		window.addEventListener('resize', resize)

		// ── Animation Loop ───────────────────────────────────────────────
		const SCROLL_SMOOTH_TIME = 0.07
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
			dragYaw += (dragTarget - dragYaw) * (prefersReducedMotion ? 1 : 1 - Math.exp(-10 * dt))

			const p = smoothedProgress.value
			updateHUD(p)

			// ── Multi-Phase Timeline (0% -> 20% -> 40% -> 60% -> 80% -> 100%) ──
			const separation = getPhase(p, 0.18, 0.45, easeInOutCubic)
			const unclipPhase = getPhase(p, 0.22, 0.40, easeInOutQuad)
			const rotatePhase = getPhase(p, 0.40, 0.88, easeInOutCubic)
			const settlePhase = getPhase(p, 0.85, 1.00, easeOutCubic)

			// Idle floating
			const scrollDelta = Math.abs(scrollTarget.value - p)
			if (scrollDelta < 0.001 && !prefersReducedMotion) {
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

			aiGroup.position.set(finalAiX, -0.08 + floatY, 0)
			huGroup.position.set(finalHuX, -0.18 + lerp(floatY, -floatY, separation), 0)

			// Model Y Rotations: Face-to-face confrontation
			const targetAiRot = 1.46
			const targetHuRot = -1.46
			const joinedYaw = (smoothedMouse.x * 0.045 + dragYaw) * (1 - separation)
			aiGroup.rotation.y = lerp(0, targetAiRot, rotatePhase) + joinedYaw
			huGroup.rotation.y = lerp(0, targetHuRot, rotatePhase) + joinedYaw

			// Mouse parallax on models
			if (!prefersReducedMotion) {
				aiGroup.rotation.x = smoothedMouse.y * 0.06
				huGroup.rotation.x = smoothedMouse.y * 0.06
				aiGroup.position.y += smoothedMouse.y * -0.03
				huGroup.position.y += smoothedMouse.y * -0.03
			}

			// Clipping Planes: Push plane constant away once separation starts
			const clipConst = lerp(0, 50.0, unclipPhase)
			aiClipPlane.constant = clipConst
			huClipPlane.constant = clipConst

			// Seam visual indicator
			seamMesh.scale.y = lerp(1, 0, separation)
			seamMat.opacity = clamp(0.95 * (1 - separation * 3.0), 0, 0.95)
			const platformOpacity = 1 - getPhase(p, 0.16, 0.42, easeInOutQuad)
			platform.group.visible = platformOpacity > 0.01
			for (const mat of platform.materials) mat.opacity = mat.userData.baseOpacity * platformOpacity
			for (const [id, mat] of platform.districtMaterials) {
				const highlight = hoveredActivityRef.current === id ? 1.2 : 0.22
				mat.emissiveIntensity = lerp(mat.emissiveIntensity, highlight, 1 - Math.exp(-9 * dt))
			}
			if (!prefersReducedMotion) platform.group.rotation.y = Math.sin(elapsedTime * 0.32) * 0.012

			// Synaptic Data Stream between eyes during separation and face-to-face
			const synapticAlpha = getPhase(p, 0.35, 0.65, easeInOutQuad) * (1 - getPhase(p, 0.96, 1.0, easeOutQuad))
			synaptic.points.material.opacity = synapticAlpha * 0.9
			if (synapticAlpha > 0.01 && !prefersReducedMotion) {
				aiHeadWorld.copy(aiHeadAnchor)
				huHeadWorld.copy(huHeadAnchor)
				aiGroup.localToWorld(aiHeadWorld)
				huGroup.localToWorld(huHeadWorld)
				const posAttr = synaptic.geometry.attributes.position
				for (let i = 0; i < synaptic.count; i++) {
					const t = (i / synaptic.count + elapsedTime * 0.35) % 1.0
					const px = lerp(huHeadWorld.x, aiHeadWorld.x, t)
					const py = lerp(huHeadWorld.y, aiHeadWorld.y, t) + Math.sin(t * Math.PI) * 0.2 + Math.sin(elapsedTime * 3 + i) * 0.045
					const pz = lerp(huHeadWorld.z, aiHeadWorld.z, t) + Math.sin(elapsedTime * 2 + i * 2) * 0.05
					posAttr.setXYZ(i, px, py, pz)
				}
				posAttr.needsUpdate = true
			}

			// Light tracking
			aiLight.position.x = finalAiX - 0.8 + smoothedMouse.x * 0.4
			aiLight.position.y = 2.5 - smoothedMouse.y * 0.3
			huLight.position.x = finalHuX + 0.8 + smoothedMouse.x * 0.4
			huLight.position.y = 2.5 - smoothedMouse.y * 0.3
			seamLight.intensity = (1 - separation) * 5

			// Open on the joined faces, then reveal the full busts as they separate.
			const portraitCamZ = isMobile ? 7.4 : isTablet ? 5.8 : 5.5
			const encounterCamZ = isMobile ? 6.8 : isTablet ? 5.9 : 5.3
			const framingPhase = getPhase(p, 0.08, 0.42, easeInOutCubic)
			const camZ = lerp(portraitCamZ, encounterCamZ, framingPhase)
			const portraitCenterX = isMobile ? -0.32 : isTablet ? -0.18 : -0.39
			const portraitFocusY = isMobile ? 0.45 : isTablet ? 0.18 : -0.3
			const frameX = lerp(portraitCenterX, 0, framingPhase)
			camera.position.x = frameX + smoothedMouse.x * 0.2
			camera.position.y = 0.18 - smoothedMouse.y * 0.14
			camera.position.z = camZ
			camera.lookAt(frameX + smoothedMouse.x * 0.03, lerp(portraitFocusY, 0.10, framingPhase), 0)

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
			canvas.removeEventListener('pointerdown', onPointerDown)
			window.removeEventListener('pointermove', onPointerMove)
			window.removeEventListener('pointerup', onPointerUp)
			window.removeEventListener('pointercancel', onPointerUp)
			renderer.dispose()
			const geometries = new Set()
			platform.group.traverse((object) => {
				if (object.isMesh) geometries.add(object.geometry)
			})
			for (const geometry of geometries) geometry.dispose()
			for (const mat of platform.materials) mat.dispose()
			stars.geometry.dispose()
			stars.material.dispose()
			grid.geometry.dispose()
			grid.material.dispose()
			seamGeo.dispose()
			seamMat.dispose()
			synaptic.geometry.dispose()
			synaptic.points.material.dispose()
		}
	}, [containerRef, hudRefs, hoveredActivityRef, onReady])

	return <canvas ref={canvasRef} className="cover-page__canvas" aria-hidden="true" />
}

// ── Main Hero Pinned Section ─────────────────────────────────────────
export default function Hero() {
	const heroContainerRef = useRef(null)
	const progressBarRef = useRef(null)
	const coverOverlayRef = useRef(null)
	const activityRef = useRef(null)
	const encounterOverlayRef = useRef(null)
	const panelLeftRef = useRef(null)
	const panelRightRef = useRef(null)
	const hintRef = useRef(null)
	const hoveredActivityRef = useRef(null)

	const [hudRefs] = useState(() => ({
		progressBar: progressBarRef,
		coverOverlay: coverOverlayRef,
		activity: activityRef,
		encounterOverlay: encounterOverlayRef,
		panelLeft: panelLeftRef,
		panelRight: panelRightRef,
		hint: hintRef,
	}))

	const [loaderVisible, setLoaderVisible] = useState(true)
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [activeNav, setActiveNav] = useState('realm')
	const [selectedActivityId, setSelectedActivityId] = useState(null)
	const selectedActivity = ACTIVITY_EXAMPLES.find((activity) => activity.id === selectedActivityId)
	useEffect(() => {
		if (!selectedActivityId) return undefined
		const closeOnEscape = (event) => {
			if (event.key === 'Escape') setSelectedActivityId(null)
		}
		const closeOnScroll = () => {
			if (window.scrollY > window.innerHeight * 0.2) setSelectedActivityId(null)
		}
		window.addEventListener('keydown', closeOnEscape)
		window.addEventListener('scroll', closeOnScroll, { passive: true })
		return () => {
			window.removeEventListener('keydown', closeOnEscape)
			window.removeEventListener('scroll', closeOnScroll)
		}
	}, [selectedActivityId])

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
		scrollToSection('agents')
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
							HOME
						</button>
						<button
							type="button"
							className={`cover-nav__link ${activeNav === 'agents' ? 'cover-nav__link--active' : ''}`}
							onClick={() => scrollToSection('agents')}
						>
							AI CITIZENS
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
							className={`cover-nav__link ${activeNav === 'idea' ? 'cover-nav__link--active' : ''}`}
							onClick={() => scrollToSection('idea')}
						>
							EXPLORE REALM
						</button>
						<button
							type="button"
							className={`cover-nav__link ${activeNav === 'project-info' ? 'cover-nav__link--active' : ''}`}
							onClick={() => scrollToSection('project-info')}
						>
							PROJECT INFO
						</button>
					</nav>
					<button type="button" className="cover-nav__enter" onClick={handleObserverClick}>
						ENTER REALM <span aria-hidden="true">→</span>
					</button>

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
							<span>HOME</span>
						</button>
						<button type="button" className="cover-nav__drawerItem" onClick={() => scrollToSection('agents')}>
							<span className="cover-nav__drawerNum">02</span>
							<span>AI CITIZENS</span>
						</button>
						<button type="button" className="cover-nav__drawerItem" onClick={() => scrollToSection('how-it-works')}>
							<span className="cover-nav__drawerNum">03</span>
							<span>HOW IT WORKS</span>
						</button>
						<button type="button" className="cover-nav__drawerItem" onClick={() => scrollToSection('idea')}>
							<span className="cover-nav__drawerNum">04</span>
							<span>EXPLORE REALM</span>
						</button>
						<button type="button" className="cover-nav__drawerItem" onClick={() => scrollToSection('project-info')}>
							<span className="cover-nav__drawerNum">05</span>
							<span>PROJECT INFO</span>
						</button>
						<button type="button" className="cover-nav__drawerItem" onClick={handleObserverClick}>
							<span className="cover-nav__drawerNum">06</span>
							<span>ENTER REALM</span>
						</button>
					</nav>
					<div className="cover-nav__drawerFooter">
						<span>AITIZEN REALM — NEURAL INTERFACE</span>
					</div>
				</div>

				{/* 3D WebGL Canvas */}
				<HeroScene containerRef={heroContainerRef} hudRefs={hudRefs} hoveredActivityRef={hoveredActivityRef} onReady={handleReady} />

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

							<h1 className="cover-hero__title" aria-label="A WORLD THAT THINKS FOR ITSELF.">
								<span className="cover-hero__titleEyebrow">A WORLD THAT</span>
								<span className="cover-hero__titleMain">THINKS FOR<br />ITSELF.</span>
							</h1>
							<h2 className="cover-hero__support">A CIVILIZATION THAT LIVES, LEARNS &amp; EVOLVES.</h2>

							<p className="cover-hero__subtitle">
								Explore a living digital civilization where autonomous AI citizens independently work,
								learn, interact, manage resources, make decisions, and shape their evolving world.
							</p>

							<div className="cover-hero__actions">
								<button
									type="button"
									className="cover-hero__btn"
									onClick={handleObserverClick}
									aria-label="Open the observer view"
								>
									<span className="cover-hero__btnGlow" aria-hidden="true" />
									<span className="cover-hero__btnText">OBSERVE THE REALM</span>
									<span className="cover-hero__btnArrow" aria-hidden="true">→</span>
								</button>
								<button
									type="button"
									className="cover-hero__btn cover-hero__btn--secondary"
									onClick={handleExploreClick}
								>
									<span className="cover-hero__btnText">HOW IT WORKS</span>
								</button>
							</div>
						</div>

						<aside ref={activityRef} className="realm-activity" aria-label="What happens in the realm">
							{ACTIVITY_EXAMPLES.map((activity, index) => (
								<button
									key={activity.id}
									type="button"
									className={`realm-activity__card realm-activity__card--${index < 3 ? 'left' : 'right'} realm-activity__card--slot-${index % 3}`}
									onMouseEnter={() => { hoveredActivityRef.current = activity.id }}
									onMouseLeave={() => { hoveredActivityRef.current = null }}
									onFocus={() => { hoveredActivityRef.current = activity.id }}
									onBlur={() => { hoveredActivityRef.current = null }}
									onClick={() => setSelectedActivityId(activity.id)}
									aria-pressed={selectedActivityId === activity.id}
								>
									<span className="realm-activity__icon"><ActivityIcon id={activity.id} /></span>
									<span className="realm-activity__copy">
										<strong>{activity.title}</strong>
										<span>{activity.summary}</span>
										<span className="realm-activity__tasks">{ACTIVITY_TASKS[activity.id].map((task) => <span key={task}>{task}</span>)}</span>
									</span>
								</button>
							))}
						</aside>
						{selectedActivity && (
							<section className="realm-activity__detail" aria-label={`${selectedActivity.title} decision example`}>
								<div className="realm-activity__detailHead">
									<span>ILLUSTRATIVE CITIZEN DECISION</span>
									<button type="button" onClick={() => setSelectedActivityId(null)} aria-label="Close activity details">×</button>
								</div>
								<h3>{selectedActivity.title}</h3>
								<dl>
									<div><dt>Goal</dt><dd>{selectedActivity.goal}</dd></div>
									<div><dt>Need</dt><dd>{selectedActivity.need}</dd></div>
									<div><dt>Action</dt><dd>{selectedActivity.action}</dd></div>
									<div><dt>Resources</dt><dd>{selectedActivity.resources}</dd></div>
								</dl>
								<p>{selectedActivity.decision}</p>
							</section>
						)}
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
					<nav className="cover-page__chapters" aria-label="Experience chapters">
						<button type="button" onClick={() => scrollToSection('realm')} aria-current={activeNav === 'realm' ? 'step' : undefined}><b>01</b><span>The Realm</span></button>
						<button type="button" onClick={() => scrollToSection('agents')} aria-current={activeNav === 'agents' ? 'step' : undefined}><b>02</b><span>AI Citizens</span></button>
						<button type="button" onClick={() => scrollToSection('project-info')} aria-current={activeNav === 'project-info' ? 'step' : undefined}><b>03</b><span>Real Impact</span></button>
					</nav>
				</div>
			</div>
		</section>
	)
}
