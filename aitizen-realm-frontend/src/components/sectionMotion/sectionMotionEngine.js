import * as THREE from 'three'
import { createChapterScene } from './chapterScenes'

let sharedEngine
let unavailable = false
const clamp = (value) => Math.max(0, Math.min(1, value))

// All views share a context. Only visible views are drawn; scroll stays native.
function createEngine() {
  const canvas = document.createElement('canvas')
  canvas.className = 'chapter-motion-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  } catch {
    unavailable = true
    return null
  }
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.35
  renderer.autoClear = false
  document.body.appendChild(canvas)

  const views = new Map()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const hero = document.getElementById('realm')
  let frame = 0, time = 0, lastTime = 0, width = 0, height = 0, lost = false
  const motionAllowed = () => !reducedMotion.matches && !hero?.classList.contains('realm-film--still')
  const requestFrame = () => {
    if (!frame && !document.hidden && !lost) frame = requestAnimationFrame(draw)
  }

  function draw(now) {
    frame = 0
    if (document.hidden || lost) return
    const nextWidth = document.documentElement.clientWidth
    const nextHeight = window.innerHeight
    const pixelRatio = Math.min(window.devicePixelRatio || 1, nextWidth < 700 ? 1 : 1.5)
    if (width !== nextWidth || height !== nextHeight || renderer.getPixelRatio() !== pixelRatio) {
      width = nextWidth
      height = nextHeight
      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(width, height, false)
    }

    // Read all layouts together before updating any view's rendered state.
    const visible = []
    views.forEach((view, element) => {
      const rect = element.getBoundingClientRect()
      if (rect.bottom > 0 && rect.top < height && rect.right > 0 && rect.left < width && rect.width > 0 && rect.height > 0) {
        visible.push({ view, element, rect })
      }
    })
    const motion = motionAllowed()
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0
    lastTime = now
    if (motion && visible.length) time += dt

    renderer.setScissorTest(false)
    renderer.clear()
    renderer.setScissorTest(true)
    for (const { view, element, rect } of visible) {
      view.world ??= createChapterScene(view.variant)
      const { scene, camera, update } = view.world
      // Full travel occurs during a normal viewport pass, with no scrub delay.
      const progress = motion ? clamp((height * 0.9 - rect.top) / (height * 0.6 + rect.height * 0.4)) : 0.72
      camera.aspect = rect.width / rect.height
      update(progress, motion ? time : 0, camera.aspect)
      camera.updateProjectionMatrix()

      // Keep the full view projection even when only part of it is on screen.
      renderer.setViewport(rect.left, height - rect.bottom, rect.width, rect.height)
      const left = Math.max(0, rect.left), bottom = Math.max(0, height - rect.bottom)
      const right = Math.min(width, rect.right), top = Math.min(height, height - rect.top)
      renderer.setScissor(left, bottom, right - left, top - bottom)
      renderer.render(scene, camera)
      element.dataset.rendered = ''
    }
    if (visible.length && motion) requestFrame()
  }

  const intersection = new IntersectionObserver(requestFrame, { rootMargin: '80px' })
  const resize = new ResizeObserver(requestFrame)
  const heroMotion = new MutationObserver(requestFrame)
  if (hero) heroMotion.observe(hero, { attributes: true, attributeFilter: ['class'] })
  const visibility = () => {
    cancelAnimationFrame(frame)
    frame = 0
    lastTime = 0
    requestFrame()
  }
  const contextLost = (event) => {
    event.preventDefault()
    lost = true
    cancelAnimationFrame(frame)
    frame = 0
    canvas.style.visibility = 'hidden'
    views.forEach((_, element) => { delete element.dataset.rendered })
  }
  const contextRestored = () => {
    lost = false
    canvas.style.visibility = ''
    requestFrame()
  }
  window.addEventListener('scroll', requestFrame, { passive: true })
  window.addEventListener('resize', requestFrame)
  document.addEventListener('visibilitychange', visibility)
  reducedMotion.addEventListener('change', requestFrame)
  canvas.addEventListener('webglcontextlost', contextLost)
  canvas.addEventListener('webglcontextrestored', contextRestored)

  return {
    register(element, variant) {
      views.set(element, { variant, world: null })
      intersection.observe(element)
      resize.observe(element)
      requestFrame()
      return () => {
        views.get(element)?.world?.dispose()
        views.delete(element)
        delete element.dataset.rendered
        intersection.unobserve(element)
        resize.unobserve(element)
        if (views.size) {
          requestFrame()
          return
        }
        cancelAnimationFrame(frame)
        intersection.disconnect()
        resize.disconnect()
        heroMotion.disconnect()
        window.removeEventListener('scroll', requestFrame)
        window.removeEventListener('resize', requestFrame)
        document.removeEventListener('visibilitychange', visibility)
        reducedMotion.removeEventListener('change', requestFrame)
        canvas.removeEventListener('webglcontextlost', contextLost)
        canvas.removeEventListener('webglcontextrestored', contextRestored)
        renderer.dispose()
        renderer.forceContextLoss()
        canvas.remove()
        sharedEngine = null
      }
    },
  }
}

export function registerSectionView(element, variant) {
  if (unavailable) return undefined
  sharedEngine ??= createEngine()
  return sharedEngine?.register(element, variant)
}
