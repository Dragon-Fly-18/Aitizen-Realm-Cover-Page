import * as THREE from 'three'
import { createContextActivity } from './contextActivity.js'

const TAU = Math.PI * 2
const mix = THREE.MathUtils.lerp
const smooth = (value) => { const p = THREE.MathUtils.clamp(value, 0, 1); return p * p * (3 - 2 * p) }
const gold = 0xc9b58e
const ivory = 0xf1f0e9
const sage = 0x91a69a

function randomSequence(seed = 73) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
}

function mesh(parent, geometry, material, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material)
  object.position.set(...position)
  parent.add(object)
  return object
}

function ring(parent, radius, opacity = 0.4, color = gold) {
  return mesh(parent, new THREE.TorusGeometry(radius, 0.006, 4, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }))
}

function lines(parent, coordinates, opacity = 0.3, color = gold) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(coordinates, 3))
  const object = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }))
  parent.add(object)
  return object
}

function edges(parent, geometry, opacity = 0.5) {
  const object = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: gold, transparent: true, opacity }))
  parent.add(object)
  return object
}

function fibonacci(index, count, radius = 1) {
  const y = 1 - (index + 0.5) * 2 / count
  const r = Math.sqrt(1 - y * y)
  const angle = index * Math.PI * (3 - Math.sqrt(5))
  return new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r).multiplyScalar(radius)
}

// 01 — Scattered matter gathers into a coherent, slowly turning idea.
function idea(root, materials) {
  const core = mesh(root, new THREE.IcosahedronGeometry(0.8, 2), materials.dark)
  const cage = mesh(root, new THREE.IcosahedronGeometry(0.84, 1), new THREE.MeshBasicMaterial({ color: gold, wireframe: true, transparent: true, opacity: 0.15 }))
  const count = 144
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.stone, count)
  blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  blocks.frustumCulled = false
  root.add(blocks)
  const random = randomSequence()
  const positions = Array.from({ length: count }, (_, i) => ({
    target: fibonacci(i, count, 1.55),
    from: fibonacci(i, count, 2.1 + random() * 0.8),
    size: 0.045 + random() * 0.07,
    spin: random() * TAU,
  }))
  const orbit = ring(root, 2.05, 0.45)
  orbit.rotation.set(1.15, 0.3, -0.2)
  const dummy = new THREE.Object3D()
  return (p, time) => {
    const gather = smooth(p * 1.2)
    root.rotation.y = time * 0.09 + p * 0.5
    core.scale.setScalar(0.55 + gather * 0.45)
    core.rotation.set(time * 0.04, time * 0.06, 0.1)
    cage.rotation.copy(core.rotation)
    cage.scale.copy(core.scale)
    orbit.rotation.z = p * 0.55 + time * 0.035
    positions.forEach((item, i) => {
      dummy.position.copy(item.from).lerp(item.target, gather)
      dummy.position.multiplyScalar(1 + Math.sin(time * 0.5 + item.spin) * 0.025)
      dummy.rotation.set(item.spin + time * 0.07, item.spin, time * 0.05)
      dummy.scale.setScalar(item.size)
      dummy.updateMatrix()
      blocks.setMatrixAt(i, dummy.matrix)
    })
    blocks.instanceMatrix.needsUpdate = true
  }
}

// 02 — Six separated gates align around a continuous stream of signals.
function pipeline(root, materials) {
  const assembly = new THREE.Group()
  root.add(assembly)
  const gates = Array.from({ length: 6 }, (_, i) => {
    const group = new THREE.Group()
    group.position.x = (i - 2.5) * 0.72
    const hoop = ring(group, 0.66, 0.65)
    hoop.rotation.y = Math.PI / 2
    const inner = ring(group, 0.48, 0.22, sage)
    inner.rotation.y = Math.PI / 2
    mesh(group, new THREE.BoxGeometry(0.16, 0.13, 0.13), materials.gold, [0, 0.66, 0])
    assembly.add(group)
    return group
  })
  const route = []
  const pathAt = (t, target) => target.set((t - 0.5) * 4.5, Math.sin(t * TAU * 2) * 0.19, Math.cos(t * TAU * 2) * 0.19)
  const point = new THREE.Vector3()
  for (let i = 0; i < 120; i++) {
    pathAt(i / 120, point); route.push(point.x, point.y, point.z)
    pathAt((i + 1) / 120, point); route.push(point.x, point.y, point.z)
  }
  lines(assembly, route, 0.65)
  const signals = Array.from({ length: 8 }, () => mesh(assembly, new THREE.SphereGeometry(0.055, 10, 8), materials.light))
  return (p, time) => {
    assembly.rotation.set(0.15, -0.35 + p * 0.2, -0.22)
    gates.forEach((gate, i) => {
      gate.position.y = Math.sin(i * 1.8) * (1 - smooth(p * 1.3)) * 0.85
      gate.rotation.x = time * 0.14 + i * 0.55
      gate.children[0].material.opacity = 0.3 + 0.5 * Math.pow(0.5 + 0.5 * Math.sin(time * 1.8 - i + p * TAU), 4)
    })
    signals.forEach((signal, i) => pathAt((time * 0.12 + i / signals.length + p * 0.5) % 1, signal.position))
  }
}

// 03 — Independent citizens follow different orbits around a connected core.
function agents(root, materials) {
  const core = mesh(root, new THREE.SphereGeometry(0.59, 32, 24), materials.dark)
  const wire = ring(root, 0.7, 0.8)
  const citizens = Array.from({ length: 7 }, (_, i) => {
    const pivot = new THREE.Group()
    pivot.rotation.set(i * 0.41, i * 0.63, 0.3)
    const radius = 1.15 + (i % 3) * 0.32
    const orbit = ring(pivot, radius, 0.16, i % 2 ? sage : gold)
    const citizen = mesh(pivot, new THREE.OctahedronGeometry(0.13, 0), i % 2 ? materials.gold : materials.stone)
    const connection = lines(pivot, [0, 0, 0, radius, 0, 0], 0.25)
    root.add(pivot)
    return { pivot, orbit, citizen, connection, radius }
  })
  return (p, time) => {
    root.rotation.y = p * 0.65
    core.rotation.y = time * 0.1
    wire.rotation.set(1.1, p * 0.8, time * 0.12)
    citizens.forEach(({ citizen, connection, radius, orbit }, i) => {
      const angle = time * (0.17 + i * 0.018) + i * TAU / 7 + p * 0.8
      const spread = mix(0.65, 1.1, smooth(p))
      citizen.position.set(Math.cos(angle) * radius * spread, Math.sin(angle) * radius * spread, 0)
      citizen.rotation.set(time * 0.3, angle, i)
      orbit.scale.setScalar(spread)
      const position = connection.geometry.attributes.position
      position.setXYZ(1, citizen.position.x, citizen.position.y, 0)
      position.needsUpdate = true
    })
  }
}

// 04 — A miniature habitat with AI-driven traffic, facade workers, and air travel.
function contexts(root, materials) {
  const city = new THREE.Group()
  root.add(city)
  const roadCoordinates = []
  for (let i = -2; i <= 2; i++) {
    roadCoordinates.push(-1.9, -1.34, i * 0.76, 1.9, -1.34, i * 0.76)
    roadCoordinates.push(i * 0.76, -1.34, -1.9, i * 0.76, -1.34, 1.9)
  }
  lines(city, roadCoordinates, 0.35)
  const random = randomSequence(192)
  const buildings = []
  for (let z = 0; z < 4; z++) for (let x = 0; x < 4; x++) {
    const height = 0.35 + random() * 1.05
    const group = new THREE.Group()
    group.position.set((x - 1.5) * 0.76, -1.33, (z - 1.5) * 0.76)
    const shape = new THREE.BoxGeometry(0.42, height, 0.42)
    mesh(group, shape, (x + z) % 3 ? materials.stone : materials.dark, [0, height / 2, 0])
    const outline = edges(group, shape, 0.3)
    outline.position.y = height / 2
    for (let floor = 0.16; floor < height; floor += 0.2) {
      lines(group, [-0.15, floor, 0.213, 0.15, floor, 0.213, 0.213, floor, -0.15, 0.213, floor, 0.15], 0.6)
    }
    city.add(group)
    buildings.push({ group, height, delay: random() * 0.25 })
  }
  const updateActivity = createContextActivity(city, buildings, materials)
  return (p, time) => {
    city.rotation.y = -0.12 + p * 0.32
    buildings.forEach(({ group, delay }) => {
      group.scale.y = 0.03 + 0.97 * smooth((p - delay) * 1.7)
    })
    updateActivity(p, time)
  }
}

// 05 — An intact lattice ruptures, then precisely rebuilds as the page advances.
function resilience(root, materials) {
  const count = 27
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.47, 0.47, 0.47), materials.stone, count)
  blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  blocks.frustumCulled = false
  root.add(blocks)
  const seeds = Array.from({ length: count }, (_, i) => new THREE.Vector3(i % 3 - 1, Math.floor(i / 3) % 3 - 1, Math.floor(i / 9) - 1))
  const heart = mesh(root, new THREE.IcosahedronGeometry(0.19, 1), materials.light)
  const shock = ring(root, 1, 0.45)
  shock.rotation.x = Math.PI / 2.4
  const dummy = new THREE.Object3D()
  return (p, time) => {
    const breakApart = smooth((p - 0.05) / 0.35) * (1 - smooth((p - 0.55) / 0.4))
    root.rotation.set(0.18, p * 0.7 + time * 0.04, 0.12)
    seeds.forEach((seed, i) => {
      dummy.position.copy(seed).multiplyScalar(0.5 + breakApart * 0.62)
      dummy.position.y += Math.sin(i * 1.3 + time * 0.45) * breakApart * 0.13
      dummy.rotation.set(breakApart * Math.sin(i), breakApart * Math.cos(i) * 0.8, breakApart * 0.3)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      blocks.setMatrixAt(i, dummy.matrix)
    })
    blocks.instanceMatrix.needsUpdate = true
    heart.scale.setScalar(1 + breakApart * 0.5)
    shock.scale.setScalar(1 + breakApart * 1.25)
    shock.material.opacity = 0.12 + breakApart * 0.4
  }
}

// 06 — A field of possibilities resolves into an expanding, orbital world.
function vision(root, materials) {
  const count = 900
  const sphere = new Float32Array(count * 3)
  const scattered = new Float32Array(count * 3)
  const random = randomSequence(81)
  for (let i = 0; i < count; i++) {
    fibonacci(i, count, 1.32).toArray(sphere, i * 3)
    const angle = random() * TAU, radius = 0.3 + random() * 2
    scattered.set([Math.cos(angle) * radius, (random() - 0.5) * 0.2, Math.sin(angle) * radius], i * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(scattered, 3))
  geometry.morphAttributes.position = [new THREE.BufferAttribute(sphere, 3)]
  const world = new THREE.Points(geometry, new THREE.PointsMaterial({ color: ivory, size: 0.023, transparent: true, opacity: 0.8, depthWrite: false }))
  world.frustumCulled = false
  root.add(world)
  const core = mesh(root, new THREE.SphereGeometry(1.23, 40, 28), materials.dark)
  const orbits = Array.from({ length: 3 }, (_, i) => {
    const orbit = ring(root, 1.65 + i * 0.28, 0.35, i === 1 ? sage : gold)
    orbit.rotation.set(0.85 + i * 0.34, 0.2 + i * 0.7, 0)
    return orbit
  })
  return (p, time) => {
    const expansion = smooth(p)
    root.rotation.y = time * 0.065 + p * 0.35
    world.morphTargetInfluences[0] = expansion
    core.scale.setScalar(0.12 + expansion * 0.88)
    orbits.forEach((orbit, i) => {
      orbit.scale.setScalar(0.7 + expansion * 0.3)
      orbit.rotation.z = time * 0.035 * (i % 2 ? -1 : 1) + p * 0.35
    })
  }
}

// 07 — Exploded architectural layers assemble into an ordered archive.
function dossier(root, materials) {
  const layers = Array.from({ length: 7 }, (_, i) => {
    const group = new THREE.Group()
    const shape = new THREE.BoxGeometry(1.8, 0.07, 1.35)
    mesh(group, shape, materials.dark)
    edges(group, shape, i === 6 ? 0.8 : 0.35)
    const traces = []
    for (let j = 0; j < 4; j++) {
      const z = j * 0.22 - 0.33
      traces.push(-0.65, 0.039, z, 0.45 - j * 0.12, 0.039, z)
    }
    lines(group, traces, 0.36)
    root.add(group)
    return group
  })
  const enclosureGeometry = new THREE.BoxGeometry(2, 2.3, 1.55)
  const enclosure = edges(root, enclosureGeometry, 0.15)
  enclosureGeometry.dispose() // EdgesGeometry owns its own copied positions.
  const scan = mesh(root, new THREE.PlaneGeometry(1.9, 1.45), new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.075, side: THREE.DoubleSide, depthWrite: false }))
  scan.rotation.x = -Math.PI / 2
  return (p, time) => {
    const assembled = smooth(p * 1.15)
    root.rotation.set(0.22, -0.45 + p * 0.7, 0)
    layers.forEach((layer, i) => {
      layer.position.set(Math.sin(i * 1.7) * (1 - assembled) * 0.7, (i - 3) * mix(0.46, 0.29, assembled), Math.cos(i) * (1 - assembled) * 0.5)
      layer.rotation.y = (1 - assembled) * (i - 3) * 0.16
    })
    enclosure.material.opacity = 0.08 + assembled * 0.16
    scan.position.y = Math.sin(time * 0.65 + p * Math.PI) * 1.02
  }
}

const builders = { idea, pipeline, agents, contexts, resilience, vision, dossier }

export function createChapterScene(variant) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40)
  const root = new THREE.Group()
  scene.add(root)
  scene.add(new THREE.HemisphereLight(0xd4dfd6, 0x11140f, 2.4))
  const key = new THREE.DirectionalLight(0xf4dfbb, 5)
  key.position.set(-3, 5, 4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xa3bfb2, 3)
  rim.position.set(4, 1, -2)
  scene.add(rim)
  const materials = {
    dark: new THREE.MeshStandardMaterial({ color: 0x202922, metalness: 0.65, roughness: 0.3 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x6c7061, metalness: 0.58, roughness: 0.34 }),
    gold: new THREE.MeshStandardMaterial({ color: gold, metalness: 0.65, roughness: 0.25 }),
    light: new THREE.MeshBasicMaterial({ color: 0xffe7b8 }),
  }
  const updateScene = builders[variant](root, materials)

  const floor = mesh(scene, new THREE.CircleGeometry(2.65, 64), new THREE.MeshBasicMaterial({ color: 0x060806, transparent: true, opacity: 0.5, depthWrite: false }), [0, -1.48, 0])
  floor.rotation.x = -Math.PI / 2
  const floorRing = ring(scene, 2.5, 0.16)
  floorRing.rotation.x = -Math.PI / 2
  floorRing.position.y = -1.47
  const random = randomSequence(18)
  const particles = new Float32Array(260 * 3)
  for (let i = 0; i < particles.length; i += 3) {
    particles[i] = (random() - 0.5) * 6
    particles[i + 1] = random() * 4.8 - 1.5
    particles[i + 2] = (random() - 0.5) * 5
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(particles, 3))
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: gold, size: 0.012, transparent: true, opacity: 0.32, depthWrite: false }))
  scene.add(dust)

  return {
    scene,
    camera,
    update(progress, time, aspect = 1) {
      updateScene(progress, time)
      dust.rotation.y = time * 0.012
      const fit = Math.max(1, 1.1 / aspect)
      const city = variant === 'contexts'
      camera.position.set((city ? 3.5 : Math.sin(progress * 0.7) * 0.35) * fit, (city ? 3 : 0.75 + progress * 0.2) * fit, (city ? 6.6 : 8.3) * fit)
      camera.lookAt(0, city ? -0.45 : 0, 0)
      camera.updateMatrixWorld()
    },
    dispose() {
      const geometries = new Set(), allMaterials = new Set(Object.values(materials))
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry)
        if (object.material) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) allMaterials.add(material)
        }
        if (object.isInstancedMesh) object.dispose()
      })
      geometries.forEach((geometry) => geometry.dispose())
      allMaterials.forEach((material) => material.dispose())
    },
  }
}
