'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  color: string
  life: number
  decay: number
}

export function MouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const animationFrameRef = useRef<number>()
  const isOverUIRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      canvas.style.display = 'none'
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Particle class
    class ParticleImpl implements Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string
      life: number
      decay: number

      constructor(x: number, y: number) {
        this.x = x
        this.y = y
        this.size = Math.random() * 3 + 1
        this.speedX = Math.random() * 3 - 1.5
        this.speedY = Math.random() * 3 - 1.5
        this.color = `hsl(${166 + Math.random() * 20}, 70%, 60%)`
        this.life = 1
        this.decay = Math.random() * 0.02 + 0.01
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY
        this.life -= this.decay
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save()
        ctx.globalAlpha = this.life
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    // Check if mouse is over UI elements
    const checkIsOverUI = (x: number, y: number): boolean => {
      const elements = document.elementsFromPoint(x, y)
      return elements.some(el => {
        const computedStyle = window.getComputedStyle(el)
        return (
          el.tagName !== 'BODY' && 
          el.tagName !== 'HTML' &&
          el.id !== 'mouse-trail-canvas' &&
          (computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
           computedStyle.background !== 'none' ||
           el.closest('button, a, input, textarea, select, [role="button"]'))
        )
      })
    }

    // Mouse move event
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
      isOverUIRef.current = checkIsOverUI(e.clientX, e.clientY)

      // Only add particles when not over UI elements
      if (!isOverUIRef.current) {
        for (let i = 0; i < 2; i++) {
          particlesRef.current.push(new ParticleImpl(mouseRef.current.x, mouseRef.current.y))
        }
      }
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.update()
        particle.draw(ctx)
        return particle.life > 0
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    document.addEventListener('mousemove', handleMouseMove)
    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      document.removeEventListener('mousemove', handleMouseMove)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      id="mouse-trail-canvas"
      className="fixed top-0 left-0 pointer-events-none z-[1] motion-reduce:hidden"
    />
  )
}
