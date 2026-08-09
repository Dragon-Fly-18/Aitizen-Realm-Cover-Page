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

function stepped(start, end, value) {
	return smoothstep((value - start) / (end - start))
}

function useScrollProgress() {
	const [progress, setProgress] = useState(0)

	useEffect(() => {
		const updateProgress = () => {
			const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1)
			setProgress(clamp(window.scrollY / maxScroll, 0, 1))
		}

		updateProgress()
		window.addEventListener('scroll', updateProgress, { passive: true })
		window.addEventListener('resize', updateProgress)

		return () => {
			window.removeEventListener('scroll', updateProgress)
			window.removeEventListener('resize', updateProgress)
		}
	}, [])

	return progress
}

function normalise(model, targetHeight = 3.2) {
	const box = new THREE.Box3().setFromObject(model)
	const size = box.getSize(new THREE.Vector3())
	const center = box.getCenter(new THREE.Vector3())
	const scale = targetHeight / size.y

	model.scale.setScalar(scale)
	model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)
}

function tintMeshes(model, tone) {
	model.traverse((child) => {
		if (!child.isMesh) {
			return
		}

		child.castShadow = true
		child.receiveShadow = true
		const material = child.material?.clone?.() ?? new THREE.MeshStandardMaterial({ color: 0xd7e3ff })
		if (material.color) {
			material.color.multiplyScalar(tone)
		}
		material.roughness = material.roughness ?? 0.45
		material.metalness = material.metalness ?? 0.08
		child.material = material
	})
}

function makeStars() {
	const geometry = new THREE.BufferGeometry()
	const count = 3200
	const positions = new Float32Array(count * 3)
	const colors = new Float32Array(count * 3)

	for (let index = 0; index < count; index += 1) {
		positions[index * 3] = (Math.random() - 0.5) * 90
		positions[index * 3 + 1] = (Math.random() - 0.5) * 55
		positions[index * 3 + 2] = (Math.random() - 0.5) * 70 - 18

		const random = Math.random()
		if (random < 0.28) {
			colors[index * 3] = 0.3
			colors[index * 3 + 1] = 0.65
			colors[index * 3 + 2] = 1
		} else if (random < 0.55) {
			colors[index * 3] = 1
			colors[index * 3 + 1] = 0.92
			colors[index * 3 + 2] = 0.6
		} else {
			colors[index * 3] = 1
			colors[index * 3 + 1] = 1
			colors[index * 3 + 2] = 1
		}
	}

	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

	return new THREE.Points(
		geometry,
		new THREE.PointsMaterial({ size: 0.042, vertexColors: true, transparent: true, opacity: 0.75 }),
	)
}

function makeOrbit(color, count = 90) {
	const geometry = new THREE.BufferGeometry()
	const positions = new Float32Array(count * 3)
	const angles = []
	const radii = []
	const speeds = []
	const heights = []

	for (let index = 0; index < count; index += 1) {
		angles.push(Math.random() * Math.PI * 2)
		radii.push(0.42 + Math.random() * 0.9)
		speeds.push((0.28 + Math.random() * 0.65) * (Math.random() < 0.5 ? 1 : -1))
		heights.push(Math.random() * 3.2 - 0.4)
	}

	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

	return {
		points: new THREE.Points(
			geometry,
			new THREE.PointsMaterial({
				color,
				size: 0.038,
				transparent: true,
				opacity: 0.65,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
			}),
		),
		geometry,
		angles,
		radii,
		speeds,
		heights,
	}
}

function createAiPlaceholder() {
	const group = new THREE.Group()
	const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x005577, emissive: 0x001e33, metalness: 0.88, roughness: 0.12 })
	const wireMaterial = new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.22 })
	const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff })
	const accentMaterial = new THREE.MeshBasicMaterial({ color: 0x00eeff })

	const head = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.54, 0.42), baseMaterial)
	head.position.y = 1.68
	group.add(head)
	const headWire = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.44), wireMaterial)
	headWire.position.y = 1.68
	group.add(headWire)

	const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.065, 0.05), eyeMaterial)
	eyeLeft.position.set(-0.14, 1.75, 0.215)
	group.add(eyeLeft)
	const eyeRight = eyeLeft.clone()
	eyeRight.position.x = 0.14
	group.add(eyeRight)

	const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), baseMaterial)
	antenna.position.set(0, 2.06, 0)
	group.add(antenna)
	const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeMaterial)
	bulb.position.set(0, 2.18, 0)
	group.add(bulb)

	const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.22, 8), baseMaterial)
	neck.position.y = 1.32
	group.add(neck)

	const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.02, 0.42), baseMaterial)
	torso.position.y = 0.76
	group.add(torso)
	const torsoWire = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.04, 0.44), wireMaterial)
	torsoWire.position.y = 0.76
	group.add(torsoWire)

	const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 1), eyeMaterial)
	core.position.y = 0.85
	group.add(core)
	const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 32), accentMaterial)
	ring.position.y = 0.85
	group.add(ring)

	for (const x of [-0.54, 0.54]) {
		const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), baseMaterial)
		shoulder.position.set(x, 1.22, 0)
		group.add(shoulder)
		const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.58, 0.2), baseMaterial)
		upperArm.position.set(x, 0.76, 0)
		group.add(upperArm)
		const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), baseMaterial)
		elbow.position.set(x, 0.46, 0)
		group.add(elbow)
		const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.46, 0.16), baseMaterial)
		lowerArm.position.set(x, 0.18, 0)
		group.add(lowerArm)
		const hand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.12), baseMaterial)
		hand.position.set(x, -0.06, 0)
		group.add(hand)
	}

	const hips = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.26, 0.4), baseMaterial)
	hips.position.y = 0.21
	group.add(hips)

	for (const x of [-0.18, 0.18]) {
		const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.58, 0.3), baseMaterial)
		upperLeg.position.set(x, -0.15, 0)
		group.add(upperLeg)
		const knee = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.28), baseMaterial)
		knee.position.set(x, -0.5, 0)
		group.add(knee)
		const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 0.26), baseMaterial)
		lowerLeg.position.set(x, -0.82, 0)
		group.add(lowerLeg)
		const foot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.36), baseMaterial)
		foot.position.set(x, -1.12, 0.06)
		group.add(foot)
	}

	return { group, core, ring }
}

function createHumanPlaceholder() {
	const group = new THREE.Group()
	const material = new THREE.MeshStandardMaterial({ color: 0xd4c2a0, roughness: 0.78, metalness: 0.02 })

	const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 18, 18), material)
	head.position.y = 1.7
	head.scale.y = 1.14
	group.add(head)

	const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.26, 12), material)
	neck.position.y = 1.35
	group.add(neck)

	const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.23, 1.02, 14), material)
	torso.position.y = 0.76
	group.add(torso)

	for (const x of [-0.38, 0.38]) {
		const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), material)
		shoulder.position.set(x, 1.22, 0)
		group.add(shoulder)
		const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.56, 10), material)
		upperArm.position.set(x, 0.78, 0)
		upperArm.rotation.z = x > 0 ? -0.18 : 0.18
		group.add(upperArm)
		const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), material)
		elbow.position.set(x * 0.97, 0.5, 0)
		group.add(elbow)
		const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.5, 10), material)
		lowerArm.position.set(x * 0.97, 0.24, 0)
		group.add(lowerArm)
		const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), material)
		hand.position.set(x, 0, 0)
		hand.scale.set(1, 0.62, 0.82)
		group.add(hand)
	}

	const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.26, 12), material)
	hips.position.y = 0.2
	group.add(hips)

	for (const x of [-0.14, 0.14]) {
		const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.62, 12), material)
		thigh.position.set(x, -0.15, 0)
		group.add(thigh)
		const knee = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), material)
		knee.position.set(x, -0.5, 0)
		group.add(knee)
		const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.56, 10), material)
		calf.position.set(x, -0.82, 0)
		group.add(calf)
		const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.3), material)
		foot.position.set(x, -1.12, 0.07)
		group.add(foot)
	}

	return { group }
}

function HeroScene({ progress }) {
	const canvasRef = useRef(null)
	const progressRef = useRef(progress)
	const startTimeRef = useRef(0)
	const frameRef = useRef(0)

	useEffect(() => {
		progressRef.current = progress
	}, [progress])

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) {
			return undefined
		}

		const scene = new THREE.Scene()
		scene.background = new THREE.Color(0x000814)
		scene.fog = new THREE.FogExp2(0x000814, 0.038)

		const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80)
		camera.position.set(0, 1.6, 7.8)
		camera.lookAt(0, 0.5, 0)

		const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
		renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false)
		renderer.outputColorSpace = THREE.SRGBColorSpace
		renderer.toneMapping = THREE.ACESFilmicToneMapping
		renderer.toneMappingExposure = 1.5

		const root = new THREE.Group()
		scene.add(root)

		scene.add(new THREE.AmbientLight(0x112244, 2.5))

		const aiLight = new THREE.PointLight(0x00d4ff, 18, 10)
		aiLight.position.set(-2.5, 2.2, 2.2)
		scene.add(aiLight)
		const huLight = new THREE.PointLight(0xff8c42, 18, 10)
		huLight.position.set(2.5, 2.2, 2.2)
		scene.add(huLight)
		const aiRim = new THREE.PointLight(0x0033aa, 6, 6)
		aiRim.position.set(-4.5, 0.5, -2.5)
		scene.add(aiRim)
		const huRim = new THREE.PointLight(0xaa4400, 6, 6)
		huRim.position.set(4.5, 0.5, -2.5)
		scene.add(huRim)
		const topLight = new THREE.DirectionalLight(0xffffff, 1.8)
		topLight.position.set(0, 8, 5)
		scene.add(topLight)

		const stars = makeStars()
		scene.add(stars)

		const grid = new THREE.GridHelper(34, 44, 0x001133, 0x000a22)
		grid.position.y = -2.6
		grid.material.opacity = 0.22
		grid.material.transparent = true
		scene.add(grid)

		const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), new THREE.MeshBasicMaterial({ color: 0x001133, transparent: true, opacity: 0.07 }))
		floor.rotation.x = -Math.PI / 2
		floor.position.y = -2.61
		scene.add(floor)

		const strip = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.6), new THREE.MeshBasicMaterial({ color: 0x002244, transparent: true, opacity: 0.5 }))
		strip.rotation.x = -Math.PI / 2
		strip.position.y = -2.58
		scene.add(strip)

		const beamPath = [
			new THREE.Vector3(-1.8, 0.55, 0.35),
			new THREE.Vector3(-0.6, 0.72, 0.12),
			new THREE.Vector3(0, 0.82, 0),
			new THREE.Vector3(0.6, 0.72, 0.12),
			new THREE.Vector3(1.8, 0.55, 0.35),
		]
		const beamCurve = new THREE.CatmullRomCurve3(beamPath)
		const beamGeometry = new THREE.TubeGeometry(beamCurve, 32, 0.018, 7, false)
		const beamGlowGeometry = new THREE.TubeGeometry(beamCurve, 32, 0.058, 7, false)
		const beamMaterial = new THREE.MeshBasicMaterial({ color: 0x9933ff, transparent: true, opacity: 0.9 })
		const beamGlowMaterial = new THREE.MeshBasicMaterial({ color: 0x4400bb, transparent: true, opacity: 0.28, side: THREE.BackSide })
		scene.add(new THREE.Mesh(beamGeometry, beamMaterial))
		scene.add(new THREE.Mesh(beamGlowGeometry, beamGlowMaterial))

		const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), new THREE.MeshBasicMaterial({ color: 0xbb44ff }))
		orb.position.set(0, 0.82, 0)
		scene.add(orb)

		const orbitAI = makeOrbit(0x00d4ff)
		const orbitHU = makeOrbit(0xff8c42)
		root.add(orbitAI.points, orbitHU.points)

		const aiGroup = new THREE.Group()
		const huGroup = new THREE.Group()
		aiGroup.position.set(-2.1, -1.4, 0)
		huGroup.position.set(2.1, -1.4, 0)
		aiGroup.rotation.y = -Math.PI / 2
		huGroup.rotation.y = Math.PI / 2
		root.add(aiGroup, huGroup)

		const aiPlaceholder = createAiPlaceholder()
		const huPlaceholder = createHumanPlaceholder()
		let aiReady = false
		let huReady = false

		const disposeModel = (model) => {
			model.traverse((node) => {
				if (!node.isMesh) {
					return
				}
				node.geometry?.dispose?.()
				if (Array.isArray(node.material)) {
					node.material.forEach((material) => material?.dispose?.())
				} else {
					node.material?.dispose?.()
				}
			})
		}

		const applyAiModel = (model) => {
			normalise(model)
			tintMeshes(model, 1.08)
			model.rotation.y = Math.PI / 2
			aiGroup.add(model)
			aiReady = true
		}

		const applyHumanModel = (model) => {
			normalise(model)
			tintMeshes(model, 0.98)
			model.rotation.y = -Math.PI / 2
			huGroup.add(model)
			huReady = true
		}

		const fallbackAI = () => {
			if (aiReady) {
				return
			}
			aiGroup.add(aiPlaceholder.group)
			aiReady = true
		}

		const fallbackHU = () => {
			if (huReady) {
				return
			}
			huGroup.add(huPlaceholder.group)
			huReady = true
		}

		const loader = new GLTFLoader()
		loader.load(AI_GLB, (gltf) => applyAiModel(gltf.scene.clone(true)), undefined, fallbackAI)
		loader.load(HUMAN_GLB, (gltf) => applyHumanModel(gltf.scene.clone(true)), undefined, fallbackHU)
		const placeholderTimer = window.setTimeout(() => {
			fallbackAI()
			fallbackHU()
		}, 3000)

		const resize = () => {
			const width = canvas.clientWidth || window.innerWidth
			const height = canvas.clientHeight || window.innerHeight
			camera.aspect = width / height
			camera.updateProjectionMatrix()
			renderer.setSize(width, height, false)
		}

		const animate = () => {
			const elapsedTime = (performance.now() - startTimeRef.current) / 1000
			const scrollMotion = smoothstep(progressRef.current)
			const rotationMotion = stepped(0, 0.72, scrollMotion)
			const introMotion = stepped(0, 2.8, elapsedTime)
			const introOffset = (1 - introMotion) * 5.5
			const aiX = lerp(-2.1, -4.6, rotationMotion) - introOffset
			const huX = lerp(2.1, 4.6, rotationMotion) + introOffset
			const floatMotion = Math.sin(elapsedTime * 0.82) * 0.085

			aiGroup.position.x = aiX
			aiGroup.position.y = -1.4 + floatMotion
			aiGroup.rotation.y = lerp(-Math.PI / 2, 0, rotationMotion)

			huGroup.position.x = huX
			huGroup.position.y = -1.4 - floatMotion
			huGroup.rotation.y = lerp(Math.PI / 2, 0, rotationMotion)

			aiLight.position.set(aiGroup.position.x, 2.2, 2.2)
			huLight.position.set(huGroup.position.x, 2.2, 2.2)
			aiRim.position.set(aiGroup.position.x - 1.8, 0.5, -2.5)
			huRim.position.set(huGroup.position.x + 1.8, 0.5, -2.5)

			const beamMotion = clamp(1 - rotationMotion * 1.5, 0, 1) * introMotion
			beamMaterial.opacity = beamMotion * 0.88
			beamGlowMaterial.opacity = beamMotion * 0.28
			orb.visible = beamMaterial.opacity > 0.05
			if (orb.visible) {
				orb.position.y = 0.82 + Math.sin(elapsedTime * 3.2) * 0.065
				const scale = 0.08 + Math.abs(Math.sin(elapsedTime * 4.5)) * 0.05
				orb.scale.setScalar(scale / 0.08)
			}

			for (let index = 0; index < orbitAI.angles.length; index += 1) {
				orbitAI.angles[index] += orbitAI.speeds[index] * 0.012
				orbitAI.geometry.attributes.position.setXYZ(
					index,
					Math.cos(orbitAI.angles[index]) * orbitAI.radii[index],
					orbitAI.heights[index] + Math.sin(elapsedTime * 0.5 + index) * 0.04,
					Math.sin(orbitAI.angles[index]) * orbitAI.radii[index] * 0.4,
				)
				orbitHU.angles[index] += orbitHU.speeds[index] * 0.012 * -1
				orbitHU.geometry.attributes.position.setXYZ(
					index,
					Math.cos(orbitHU.angles[index]) * orbitHU.radii[index],
					orbitHU.heights[index] + Math.sin(elapsedTime * 0.5 + index) * 0.04,
					Math.sin(orbitHU.angles[index]) * orbitHU.radii[index] * 0.4,
				)
			}
			orbitAI.geometry.attributes.position.needsUpdate = true
			orbitHU.geometry.attributes.position.needsUpdate = true

			if (!aiReady) {
				aiPlaceholder.core.rotation.y += 0.032
				aiPlaceholder.core.rotation.x += 0.016
				aiPlaceholder.ring.rotation.y += 0.026
				aiPlaceholder.ring.rotation.z = Math.sin(elapsedTime * 0.9) * 0.28
			}

			camera.position.x = Math.sin(elapsedTime * 0.14) * 0.22
			camera.position.y = 1.6 + Math.sin(elapsedTime * 0.21) * 0.11
			camera.lookAt(0, 0.4, 0)

			renderer.render(scene, camera)
			frameRef.current = window.requestAnimationFrame(animate)
		}

		startTimeRef.current = performance.now()
		resize()
		window.addEventListener('resize', resize)
		frameRef.current = window.requestAnimationFrame(animate)

		return () => {
			window.cancelAnimationFrame(frameRef.current)
			window.clearTimeout(placeholderTimer)
			window.removeEventListener('resize', resize)
			renderer.dispose()
			stars.geometry.dispose()
			stars.material.dispose()
			grid.geometry.dispose()
			grid.material.dispose()
			floor.geometry.dispose()
			floor.material.dispose()
			strip.geometry.dispose()
			strip.material.dispose()
			beamGeometry.dispose()
			beamGlowGeometry.dispose()
			beamMaterial.dispose()
			beamGlowMaterial.dispose()
			orb.geometry.dispose()
			orb.material.dispose()
			orbitAI.geometry.dispose()
			orbitAI.points.material.dispose()
			orbitHU.geometry.dispose()
			orbitHU.points.material.dispose()
			disposeModel(aiPlaceholder.group)
			disposeModel(huPlaceholder.group)
		}
	}, [])

	return <canvas ref={canvasRef} className="cover-page__canvas" aria-hidden="true" />
}

export default function Hero() {
	const progress = useScrollProgress()
	const [loaderVisible, setLoaderVisible] = useState(true)

	useEffect(() => {
		const timer = window.setTimeout(() => setLoaderVisible(false), 2200)
		return () => window.clearTimeout(timer)
	}, [])

	const smoothProgress = smoothstep(progress)
	const titleMotion = stepped(0.72, 1, smoothProgress)
	const sideOpacity = clamp(1 - smoothProgress * 1.4, 0, 1)
	const hintOpacity = clamp(1 - smoothProgress * 4, 0, 1)

	return (
		<section className="cover-page">
			<div className="cover-page__loader" style={{ opacity: loaderVisible ? 1 : 0 }} aria-hidden="true">
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

				<div className="cover-page__hud" aria-hidden="true">
					<div className="cover-page__progress">
						<span style={{ width: `${progress * 100}%` }} />
					</div>

					<div className="cover-page__corner cover-page__corner--tl" />
					<div className="cover-page__corner cover-page__corner--tr" />
					<div className="cover-page__corner cover-page__corner--bl" />
					<div className="cover-page__corner cover-page__corner--br" />

					<div className="cover-page__panel cover-page__panel--left" style={{ opacity: sideOpacity }}>
						<div className="cover-page__panelLabel">◈ SYNTHETIC ENTITY</div>
						<div className="cover-page__panelLine">TYPE ▸ ARTIFICIAL INTELLIGENCE</div>
						<div className="cover-page__panelLine">UNIT ▸ AI-v4.7 / NEURAL</div>
						<div className="cover-page__panelLine">UPTIME ▸ ∞ CYCLES</div>
						<div className="cover-page__panelLine">STATUS ▸ <span style={{ color: 'var(--ai)' }}>ACTIVE</span></div>
						<div className="cover-page__panelDot" />
					</div>

					<div className="cover-page__panel cover-page__panel--right" style={{ opacity: sideOpacity }}>
						<div className="cover-page__panelLabel cover-page__panelLabel--warm">HOMO SAPIENS ◈</div>
						<div className="cover-page__panelLine">BIOLOGICAL ◂ TYPE</div>
						<div className="cover-page__panelLine">SAPIEN-001 ◂ UNIT</div>
						<div className="cover-page__panelLine">GENESIS ◂ ORIGIN</div>
						<div className="cover-page__panelLine"><span style={{ color: 'var(--hu)' }}>ALIVE</span> ◂ STATUS</div>
						<div className="cover-page__panelDot cover-page__panelDot--warm" />
					</div>

					<div className="cover-page__rule cover-page__rule--left" style={{ opacity: sideOpacity }} />
					<div className="cover-page__rule cover-page__rule--right" style={{ opacity: sideOpacity }} />

					<div className="cover-page__badge cover-page__badge--left" style={{ opacity: sideOpacity }}>
						<div className="cover-page__badgeType">◈ INTELLIGENCE</div>
						<div className="cover-page__badgeName">ARTIFICIAL</div>
					</div>

					<div className="cover-page__badge cover-page__badge--right" style={{ opacity: sideOpacity }}>
						<div className="cover-page__badgeType cover-page__badgeType--warm">HUMANITY ◈</div>
						<div className="cover-page__badgeName">EVOLVED</div>
					</div>

					<div className="cover-page__rift" style={{ opacity: clamp((1 - smoothProgress) * 0.35, 0, 0.35) }} />

					<div className="cover-page__burst cover-page__burst--left" style={{ opacity: titleMotion * 0.9 }} />
					<div className="cover-page__burst cover-page__burst--right" style={{ opacity: titleMotion * 0.9 }} />

					<div className="cover-page__hint" style={{ opacity: hintOpacity }}>
						<span>SCROLL TO REVEAL</span>
						<i />
					</div>

					<div className="cover-page__title" style={{ opacity: titleMotion, transform: `translate(-50%, calc(-50% + ${(1 - titleMotion) * 28}px))` }}>
						<span className="cover-page__eyebrow">◈ &nbsp;&nbsp; THE CONVERGENCE BEGINS &nbsp;&nbsp; ◈</span>
						<h1 className="cover-page__headline">AITIZEN<br />REALM</h1>
						<div className="cover-page__titleLine" style={{ width: titleMotion > 0.55 ? '100%' : '0' }} />
						<p className="cover-page__subhead">Where Artificial Intelligence Meets Human Destiny</p>
					</div>
				</div>
			</div>
		</section>
	)
}
