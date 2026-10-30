import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Procedural miniatures: no model downloads. Static parts share a draw call per material.
export function createContextActivity(city, buildings, materials) {
  const box = new THREE.BoxGeometry(1, 1, 1)
  const sphere = new THREE.SphereGeometry(1, 12, 8)
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10)
  const enamel = new THREE.MeshStandardMaterial({ color: 0xcbd1bb, metalness: 0.35, roughness: 0.4 })
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111715, roughness: 0.85 })
  const glass = new THREE.MeshStandardMaterial({ color: 0x8baea0, transparent: true, opacity: 0.45, metalness: 0.2, roughness: 0.16, depthWrite: false })
  const up = new THREE.Vector3(0, 1, 0)

  const part = (parent, geometry, material, size, position) => {
    const object = new THREE.Mesh(geometry, material)
    object.scale.set(...size)
    object.position.set(...position)
    parent.add(object)
    return object
  }
  const beam = (parent, from, to, width, material = materials.gold) => {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to)
    const direction = end.clone().sub(start)
    const object = part(parent, box, material, [width, direction.length(), width], start.add(end).multiplyScalar(0.5).toArray())
    object.quaternion.setFromUnitVectors(up, direction.normalize())
    return object
  }
  const bake = (group) => {
    group.updateMatrixWorld(true)
    const inverse = group.matrixWorld.clone().invert()
    const batches = new Map()
    group.traverse((object) => {
      if (!object.isMesh) return
      const geometry = object.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld))
      if (!batches.has(object.material)) batches.set(object.material, [])
      batches.get(object.material).push(geometry)
    })
    group.clear()
    batches.forEach((geometries, material) => {
      group.add(new THREE.Mesh(mergeGeometries(geometries), material))
      geometries.forEach((geometry) => geometry.dispose())
    })
    return group
  }

  const agent = (pose) => {
    const body = new THREE.Group()
    body.name = `ai-${pose}`
    part(body, box, enamel, [0.065, 0.075, 0.045], [0, 0.085, 0])
    part(body, box, enamel, [0.07, 0.055, 0.055], [0, 0.155, 0.008])
    part(body, box, materials.light, [0.052, 0.016, 0.005], [0, 0.16, 0.038])
    part(body, box, materials.gold, [0.022, 0.025, 0.006], [0, 0.09, 0.026])
    for (const side of [-1, 1]) {
      const x = side * 0.022
      const seated = pose !== 'cleaner'
      beam(body, [x, 0.05, 0], [x, 0.025, seated ? 0.045 : 0], 0.02, rubber)
      beam(body, [x, 0.025, seated ? 0.045 : 0], [x, -0.012, seated ? 0.06 : 0.012], 0.019, enamel)
      if (pose === 'cleaner' && side === 1) continue
      beam(body, [side * 0.043, 0.112, 0], [side * 0.05, 0.075, 0.05], 0.017, enamel)
      beam(body, [side * 0.05, 0.075, 0.05], [side * 0.043, 0.085, 0.09], 0.015, materials.gold)
    }
    return bake(body)
  }

  const wheelAxle = (vehicle, z, radius, track) => {
    const axle = new THREE.Group()
    axle.position.set(0, radius, z)
    for (const x of track ? [-track / 2, track / 2] : [0]) {
      part(axle, cylinder, rubber, [radius, 0.025, radius], [x, 0, 0]).rotation.z = Math.PI / 2
      // Solid hubs and spokes keep wheels readable at miniature scale.
      for (const side of [-1, 1]) {
        part(axle, box, materials.gold, [0.003, radius * 1.45, 0.012], [x + side * 0.014, 0, 0])
        part(axle, box, materials.gold, [0.003, 0.012, radius * 1.45], [x + side * 0.014, 0, 0])
      }
    }
    bake(axle)
    vehicle.add(axle)
    return axle
  }

  const car = () => {
    const vehicle = new THREE.Group()
    const shell = new THREE.Group()
    part(shell, box, materials.gold, [0.16, 0.055, 0.32], [0, 0.084, 0])
    part(shell, box, enamel, [0.15, 0.025, 0.09], [0, 0.12, 0.112])
    part(shell, box, enamel, [0.15, 0.025, 0.06], [0, 0.12, -0.126])
    part(shell, box, rubber, [0.1, 0.055, 0.08], [0, 0.118, -0.04])
    // Open cabin leaves the AI driver's head, arms, and controls visible.
    for (const side of [-1, 1]) {
      part(shell, box, enamel, [0.016, 0.055, 0.15], [side * 0.074, 0.13, -0.005])
      part(shell, box, materials.light, [0.035, 0.02, 0.006], [side * 0.047, 0.09, 0.163])
    }
    part(shell, box, glass, [0.13, 0.06, 0.008], [0, 0.16, 0.073]).rotation.x = -0.2
    beam(shell, [-0.04, 0.16, 0.043], [0.04, 0.16, 0.043], 0.012, rubber)
    vehicle.add(bake(shell))
    const driver = agent('driver')
    driver.position.set(0, 0.095, -0.045)
    vehicle.add(driver)
    const wheels = [-0.105, 0.105].map((z) => wheelAxle(vehicle, z, 0.045, 0.16))
    return { vehicle, wheels, radius: 0.045 }
  }

  const bike = () => {
    const vehicle = new THREE.Group()
    const frame = new THREE.Group()
    beam(frame, [0, 0.055, -0.11], [0, 0.135, -0.025], 0.02)
    beam(frame, [0, 0.135, -0.025], [0, 0.07, 0.025], 0.02)
    beam(frame, [0, 0.07, 0.025], [0, 0.055, -0.11], 0.02)
    beam(frame, [0, 0.135, -0.025], [0, 0.15, 0.085], 0.02)
    beam(frame, [0, 0.15, 0.085], [0, 0.055, 0.11], 0.02)
    beam(frame, [0, 0.07, 0.025], [0, 0.15, 0.085], 0.02)
    beam(frame, [0, 0.15, 0.085], [0, 0.19, 0.07], 0.016, enamel)
    beam(frame, [-0.06, 0.19, 0.07], [0.06, 0.19, 0.07], 0.014, rubber)
    part(frame, box, rubber, [0.065, 0.018, 0.06], [0, 0.142, -0.03])
    part(frame, sphere, materials.light, [0.018, 0.018, 0.014], [0, 0.17, 0.098])
    vehicle.add(bake(frame))
    const rider = agent('rider')
    rider.position.set(0, 0.12, -0.04)
    rider.rotation.x = 0.17
    vehicle.add(rider)
    const wheels = [-0.11, 0.11].map((z) => wheelAxle(vehicle, z, 0.055, 0))
    return { vehicle, wheels, radius: 0.055 }
  }

  // Rounded closed routes avoid teleporting vehicles at the ends of the streets.
  const route = (extent, corner) => {
    const curve = new THREE.CurvePath()
    for (let side = 0; side < 4; side++) {
      const angle = side * Math.PI / 2
      const turn = (x, z) => new THREE.Vector3(x * Math.cos(angle) - z * Math.sin(angle), 0, x * Math.sin(angle) + z * Math.cos(angle))
      curve.add(new THREE.LineCurve3(turn(-extent + corner, -extent), turn(extent - corner, -extent)))
      curve.add(new THREE.QuadraticBezierCurve3(turn(extent - corner, -extent), turn(extent, -extent), turn(extent, -extent + corner)))
    }
    return curve
  }
  const routes = [route(1.64, 0.25), route(0.76, 0.18)]
  const outerRoad = routes[0].getPoints(96).map((point) => new THREE.Vector3(point.x, -1.338, point.z))
  const road = new THREE.Line(new THREE.BufferGeometry().setFromPoints(outerRoad), new THREE.LineBasicMaterial({ color: 0xc9b58e, transparent: true, opacity: 0.24 }))
  city.add(road)
  const traffic = Array.from({ length: 5 }, (_, i) => {
    const actor = i % 2 ? bike() : car()
    const routeIndex = i < 3 ? 0 : 1
    actor.vehicle.name = `context-${i % 2 ? 'bike' : 'car'}-${i}`
    city.add(actor.vehicle)
    return { ...actor, path: routes[routeIndex], length: routes[routeIndex].getLength(), speed: routeIndex ? 0.22 : 0.3, phase: routeIndex ? (i - 3) / 2 : i / 3 }
  })

  // Facade workers stay unscaled while the buildings rise on scroll.
  const cleaners = buildings.filter(({ group }) => group.position.z > 1).sort((a, b) => b.height - a.height).slice(0, 2).map((building, i) => {
    const platform = new THREE.Group()
    platform.name = `context-window-cleaner-${i}`
    const deck = new THREE.Group()
    part(deck, box, materials.gold, [0.32, 0.025, 0.15], [0, 0, 0])
    beam(deck, [-0.15, 0.02, 0.07], [-0.15, 0.09, 0.07], 0.012)
    beam(deck, [0.15, 0.02, 0.07], [0.15, 0.09, 0.07], 0.012)
    beam(deck, [-0.15, 0.09, 0.07], [0.15, 0.09, 0.07], 0.012)
    platform.add(bake(deck))
    const worker = agent('cleaner')
    worker.rotation.y = Math.PI
    worker.position.set(0, 0.027, 0.03)
    platform.add(worker)
    const arm = new THREE.Group()
    arm.name = 'cleaning-arm'
    arm.position.set(0.043, 0.11, 0)
    beam(arm, [0, 0, 0], [0, -0.03, 0.06], 0.018, enamel)
    beam(arm, [0, -0.03, 0.06], [0, 0, 0.12], 0.014)
    part(arm, box, materials.light, [0.075, 0.013, 0.014], [0, 0, 0.12])
    worker.add(bake(arm))
    city.add(platform)
    const cableGeometry = new THREE.BufferGeometry()
    cableGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3).setUsage(THREE.DynamicDrawUsage))
    const cables = new THREE.LineSegments(cableGeometry, new THREE.LineBasicMaterial({ color: 0xc9b58e, transparent: true, opacity: 0.7 }))
    cables.frustumCulled = false
    city.add(cables)
    const facade = new THREE.Group()
    part(facade, box, glass, [0.34, building.height * 0.76, 0.006], [0, building.height * 0.55, 0.215])
    part(facade, box, materials.gold, [0.34, 0.025, 0.13], [0, building.height + 0.016, 0.2])
    building.group.add(bake(facade))
    return { building, platform, arm, cables }
  })

  const helicopter = new THREE.Group()
  helicopter.name = 'context-helicopter'
  const fuselage = new THREE.Group()
  part(fuselage, sphere, materials.gold, [0.16, 0.13, 0.25], [0, 0, 0])
  part(fuselage, sphere, glass, [0.145, 0.115, 0.15], [0, 0.015, 0.16])
  beam(fuselage, [0, 0.01, -0.15], [0, 0.065, -0.62], 0.045, enamel)
  part(fuselage, box, materials.gold, [0.018, 0.16, 0.1], [0, 0.13, -0.61])
  beam(fuselage, [0, 0.1, 0], [0, 0.23, 0], 0.025, rubber)
  for (const side of [-1, 1]) {
    beam(fuselage, [side * 0.1, -0.07, 0.1], [side * 0.15, -0.19, 0.1], 0.018, enamel)
    beam(fuselage, [side * 0.1, -0.07, -0.12], [side * 0.15, -0.19, -0.12], 0.018, enamel)
    beam(fuselage, [side * 0.15, -0.19, -0.22], [side * 0.15, -0.19, 0.23], 0.02, rubber)
  }
  helicopter.add(bake(fuselage))
  const pilot = agent('pilot')
  pilot.scale.setScalar(0.85)
  pilot.position.set(0, -0.045, 0.17)
  helicopter.add(pilot)
  const rotor = new THREE.Group()
  rotor.name = 'main-rotor'
  rotor.position.y = 0.235
  part(rotor, box, enamel, [1.02, 0.012, 0.036], [0, 0, 0])
  part(rotor, box, enamel, [0.036, 0.012, 1.02], [0, 0, 0])
  helicopter.add(bake(rotor))
  const tailRotor = new THREE.Group()
  tailRotor.name = 'tail-rotor'
  tailRotor.position.set(0.04, 0.08, -0.62)
  part(tailRotor, box, enamel, [0.01, 0.22, 0.025], [0, 0, 0])
  part(tailRotor, box, enamel, [0.01, 0.025, 0.22], [0, 0, 0])
  helicopter.add(bake(tailRotor))
  city.add(helicopter)

  // All primitives have been copied into material batches above.
  box.dispose()
  sphere.dispose()
  cylinder.dispose()
  const position = new THREE.Vector3(), tangent = new THREE.Vector3()

  return (progress, time) => {
    traffic.forEach(({ vehicle, wheels, path, length, speed, phase, radius }) => {
      const distance = time * speed + progress * 0.45
      const travel = (distance / length + phase) % 1
      path.getPointAt(travel, position)
      path.getTangentAt(travel, tangent)
      vehicle.position.set(position.x, -1.33, position.z)
      vehicle.rotation.y = Math.atan2(tangent.x, tangent.z)
      wheels.forEach((wheel) => { wheel.rotation.x = distance / radius })
    })
    cleaners.forEach(({ building, platform, arm, cables }, i) => {
      const height = building.height * building.group.scale.y
      platform.visible = cables.visible = building.group.scale.y > 0.72
      platform.position.set(building.group.position.x, -1.33 + height * (0.42 + Math.sin(time * 0.23 + i * 2) * 0.08), building.group.position.z + 0.31)
      arm.rotation.z = Math.sin(time * 2.6 + i * Math.PI) * 0.5
      const points = cables.geometry.attributes.position
      for (let side = 0; side < 2; side++) {
        const x = platform.position.x + (side ? 0.13 : -0.13)
        points.setXYZ(side * 2, x, -1.33 + height + 0.035, building.group.position.z + 0.23)
        points.setXYZ(side * 2 + 1, x, platform.position.y + 0.02, platform.position.z)
      }
      points.needsUpdate = true
    })
    const angle = time * 0.21 + progress * 0.8
    helicopter.position.set(Math.cos(angle) * 1.1, 0.8 + Math.sin(time * 0.65) * 0.055, Math.sin(angle) * 0.8)
    helicopter.rotation.set(0.04, Math.atan2(-1.1 * Math.sin(angle), 0.8 * Math.cos(angle)), -0.08)
    rotor.rotation.y = time * 34
    tailRotor.rotation.x = time * 48
  }
}
