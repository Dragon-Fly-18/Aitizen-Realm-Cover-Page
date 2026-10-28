import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const clamp = (x) => Math.max(0, Math.min(1, x))
const phase = (p, a, b) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t) }
const mix = THREE.MathUtils.lerp

export default function RealmScene({ progressRef, motionRef, burstRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
    } catch {
      canvas.style.display = 'none'
      return
    }
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x080909, 0.045)
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 90)
    renderer.setClearColor(0x080909, 1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2

    let seed = 36
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
    scene.add(new THREE.HemisphereLight(0xc8d9d1, 0x12140f, 1.8))
    const key = new THREE.DirectionalLight(0xf7e6c5, 4)
    key.position.set(3, 6, 4)
    scene.add(key)
    const rim = new THREE.PointLight(0xd0b282, 30, 18)
    rim.position.set(1.5, 1, -2)
    scene.add(rim)
    const fill = new THREE.PointLight(0x9fbbb9, 12, 15)
    fill.position.set(-3, 2, 4)
    scene.add(fill)

    const world = new THREE.Group()
    world.position.x = 1.6
    scene.add(world)
    const coreMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vec4 p=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=-p.xyz; vP=position; gl_Position=projectionMatrix*p; }`,
      fragmentShader: `uniform float time; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        float hash(vec3 p){return fract(sin(dot(p,vec3(12.98,78.23,45.16)))*43758.54);}
        void main(){
          vec3 n=normalize(vN); float edge=pow(1.-max(dot(n,normalize(vV)),0.),3.2);
          float grain=hash(floor(vP*180.));
          float speck=step(.987,grain)*.38;
          float light=max(dot(n,normalize(vec3(.8,.6,1.))),0.);
          float sweep=pow(max(0.,1.-abs(vP.y-sin(time*.24)*.7)*24.),3.);
          vec3 color=vec3(.018,.025,.023)+vec3(.66,.56,.39)*edge*.85+vec3(.2,.24,.22)*speck*light+vec3(.52,.46,.31)*sweep*.1;
          gl_FragColor=vec4(color,1.);
        }`,
    })
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.12, 64, 40), coreMat)
    world.add(core)

    const orbit = new THREE.Group()
    world.add(orbit)
    const orbitMaterials = []
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0x93aaa2 : 0xcdbb98, transparent: true, opacity: 0.18, depthWrite: false })
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.65 + i * 0.42, 0.006, 4, 128), mat)
      ring.rotation.set(0.6 + i * 0.35, i * 0.68, 0.25)
      orbit.add(ring)
      orbitMaterials.push(mat)
    }

    // One draw call for the floating blocks and the emerging settlement.
    const count = 72
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1)
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x37403a, metalness: 0.68, roughness: 0.38 })
    const blocks = new THREE.InstancedMesh(blockGeometry, blockMat, count)
    blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    blocks.frustumCulled = false
    scene.add(blocks)
    const dummy = new THREE.Object3D()
    const layout = Array.from({ length: count }, (_, i) => {
      const angle = random() * Math.PI * 2
      const radius = 2.1 + random() * 3.5
      const size = 0.1 + random() * 0.28
      const height = 0.25 + random() * 1.25
      return {
        angle, radius, size, height, speed: 0.03 + random() * 0.04,
        y: (random() - 0.5) * 5.8,
        x: (i % 9 - 4) * 0.53 + 1.7,
        z: (Math.floor(i / 9) - 3.5) * 0.53,
        spin: random() * Math.PI,
      }
    })
    const tint = new THREE.Color()
    layout.forEach((_, i) => blocks.setColorAt(i, tint.setHSL(0.12, 0.08 + random() * 0.12, 0.22 + random() * 0.2)))

    const paths = []
    layout.forEach((b, i) => {
      if (i % 9 < 8) paths.push(b.x, -1.64, b.z, b.x + .53, -1.64, b.z)
      if (i < 63) paths.push(b.x, -1.64, b.z, b.x, -1.64, b.z + .53)
    })
    const pathGeometry = new THREE.BufferGeometry()
    pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(paths, 3))
    const pathMat = new THREE.LineBasicMaterial({ color: 0xcbb68a, transparent: true, opacity: 0 })
    scene.add(new THREE.LineSegments(pathGeometry, pathMat))

    const particleCount = window.innerWidth < 700 ? 800 : 2200
    const particles = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      particles[i * 3] = (random() - .5) * 35
      particles[i * 3 + 1] = (random() - .35) * 14
      particles[i * 3 + 2] = (random() - .5) * 28
    }
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute('position', new THREE.BufferAttribute(particles, 3))
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xc8c7ae, size: 0.018, transparent: true, opacity: .45, depthWrite: false }))
    scene.add(dust)

    // A procedural floor needs no texture requests or reflection render pass.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, pulse: { value: 0 } },
      vertexShader: `varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec2 vP; uniform float time; uniform float pulse;
        void main(){
          float d=length(vP-vec2(1.6,0.));
          vec2 g=abs(fract(vP*.75-.5)-.5)/max(fwidth(vP*.75),vec2(.001));
          float grid=1.-min(min(g.x,g.y),1.);
          float wave=pow(.5+.5*sin(d*9.-time*.8),12.);
          float glow=exp(-d*.38);
          float reflection=exp(-pow((vP.x-1.6)*1.8,2.))*exp(-abs(vP.y)*.21);
          vec3 c=vec3(.018,.024,.022)+vec3(.21,.18,.12)*glow*(grid*.25+wave*.07+reflection*.4);
          c+=vec3(.25,.21,.14)*pulse*exp(-abs(d-3.)*2.);
          gl_FragColor=vec4(c,1.);
        }`,
    }))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -1.7
    scene.add(floor)

    let width = 1, height = 1, visible = true, dirty = true
    let frame = 0, lastTime = performance.now(), time = 0, progress = progressRef.current, burst = 0
    let pointerDown = false, previousMotion = motionRef.current
    const pointer = new THREE.Vector2()
    const smoothedPointer = new THREE.Vector2()
    const resize = () => {
      width = canvas.clientWidth || 1
      height = canvas.clientHeight || 1
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1 : 1.5))
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      dirty = true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; dirty = true })
    visibility.observe(canvas)
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      pointer.set((e.clientX - rect.left) / width - .5, (e.clientY - rect.top) / height - .5)
    }
    const onDown = (e) => { if (e.pointerType === 'mouse' && e.button === 0) pointerDown = true }
    const onUp = () => { pointerDown = false }
    const onLeave = () => { pointer.set(0, 0); pointerDown = false }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointerleave', onLeave)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    const onContextLost = (event) => { event.preventDefault(); visible = false }
    const onContextRestored = () => { visible = true; dirty = true }
    canvas.addEventListener('webglcontextlost', onContextLost)
    canvas.addEventListener('webglcontextrestored', onContextRestored)

    const animate = (now) => {
      frame = requestAnimationFrame(animate)
      const dt = Math.min((now - lastTime) / 1000, .05)
      lastTime = now
      if (!visible || document.hidden) return
      const motion = motionRef.current
      const burstTarget = burstRef.current || pointerDown ? 1 : 0
      if (!motion && !dirty && previousMotion === motion && progress === progressRef.current && burst === burstTarget) return
      previousMotion = motion
      dirty = false
      if (motion) time += dt
      const easing = motion ? 1 - Math.exp(-13 * dt) : 1
      progress = mix(progress, progressRef.current, easing)
      burst = mix(burst, burstTarget, motion ? 1 - Math.exp(-6 * dt) : 1)
      smoothedPointer.lerp(motion ? pointer : new THREE.Vector2(), easing)
      const mind = phase(progress, .12, .45)
      const city = phase(progress, .55, .9)
      const mobile = width < 700

      coreMat.uniforms.time.value = time
      core.scale.setScalar(mix(1, .38, city) + burst * .05)
      core.position.y = mix(0, .55, city)
      core.rotation.y = time * .04
      world.position.x = mobile ? .8 : 1.6
      orbit.rotation.set(.25 + mind * .7, time * .05 + mind, .25 + city * .5)
      orbit.scale.setScalar(1 + mind * .45 - city * .55 + burst * .25)
      orbitMaterials.forEach((mat) => { mat.opacity = .15 + mind * .16 - city * .08 })

      layout.forEach((b, i) => {
        const angle = b.angle + time * b.speed
        const spread = 1 + burst * 1.3
        const x = Math.cos(angle) * b.radius * spread + world.position.x
        const y = b.y + Math.sin(time * .25 + b.spin) * .1
        const z = Math.sin(angle) * b.radius * .65 * spread
        const settled = city * (1 - burst)
        dummy.position.set(mix(x, b.x, settled), mix(y, -1.7 + b.height / 2, settled), mix(z, b.z, settled))
        dummy.rotation.set((b.spin + time * .06) * (1 - settled), (b.spin + time * .04) * (1 - settled), b.spin * (1 - settled))
        dummy.scale.set(mix(b.size, .28, settled), mix(b.size, b.height, settled), mix(b.size, .28, settled))
        dummy.updateMatrix()
        blocks.setMatrixAt(i, dummy.matrix)
      })
      blocks.instanceMatrix.needsUpdate = true
      pathMat.opacity = city * .4 * (1 - burst)
      dust.rotation.y = time * .006
      floor.material.uniforms.time.value = time
      floor.material.uniforms.pulse.value = burst
      camera.position.set(smoothedPointer.x * .35 + city * .4, mix(.5, 2.9, city) - smoothedPointer.y * .22, mobile ? 11.5 : mix(8.7, 9.3, city))
      camera.lookAt(mobile ? .15 : .1, mix(.15, -.35, city), 0)
      renderer.render(scene, camera)
    }
    resize()
    frame = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      visibility.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      const geometries = new Set(), materials = new Set()
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry)
        if (object.material) materials.add(object.material)
      })
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      renderer.dispose()
    }
  }, [progressRef, motionRef, burstRef])

  return <canvas className="realm-film__canvas" ref={canvasRef} aria-hidden="true" />
}
