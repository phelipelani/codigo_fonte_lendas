// Arquivo: src/components/ui/BeamsBackground.tsx
// Feixes de luz animados em <canvas> — camada de fundo atmosférica.
// Adaptado de "beams-background" para o FutLendas:
//   - vira camada de fundo (absolute inset-0), não renderiza texto próprio
//   - cor configurável (cyan p/ login, gold p/ Hall da Fama)
//   - menos feixes + sem blur pesado no mobile (economia de bateria)
//   - respeita prefers-reduced-motion

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface BeamsBackgroundProps {
  className?: string
  intensity?: 'subtle' | 'medium' | 'strong'
  colorMode?: 'cyan' | 'gold'
}

interface Beam {
  x: number
  y: number
  width: number
  length: number
  angle: number
  speed: number
  opacity: number
  hue: number
  pulse: number
  pulseSpeed: number
}

// Faixa de matiz/saturação/luz por tema
const PALETTE = {
  cyan: { hueStart: 190, hueRange: 70, sat: 85, light: 65 },
  gold: { hueStart: 38, hueRange: 20, sat: 72, light: 58 },
} as const

const OPACITY_MAP = { subtle: 0.6, medium: 0.82, strong: 1 } as const

function createBeam(width: number, height: number, hueStart: number, hueRange: number): Beam {
  const angle = -35 + Math.random() * 10
  return {
    x: Math.random() * width * 1.5 - width * 0.25,
    y: Math.random() * height * 1.5 - height * 0.25,
    width: 30 + Math.random() * 60,
    length: height * 2.5,
    angle,
    speed: 0.6 + Math.random() * 1.2,
    opacity: 0.12 + Math.random() * 0.16,
    hue: hueStart + Math.random() * hueRange,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.03,
  }
}

export function BeamsBackground({
  className,
  intensity = 'medium',
  colorMode = 'cyan',
}: BeamsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const beamsRef = useRef<Beam[]>([])
  const animationFrameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const { hueStart, hueRange, sat, light } = PALETTE[colorMode]

    // Menos feixes e blur mais leve no mobile (desempenho/bateria)
    const isMobile = window.innerWidth < 768
    const totalBeams = isMobile ? 14 : 30
    const blurStrong = isMobile ? 18 : 35

    const updateCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      beamsRef.current = Array.from({ length: totalBeams }, () =>
        createBeam(window.innerWidth, window.innerHeight, hueStart, hueRange)
      )
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    function resetBeam(beam: Beam, index: number) {
      const w = window.innerWidth
      const h = window.innerHeight
      const column = index % 3
      const spacing = w / 3

      beam.y = h + 100
      beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5
      beam.width = 100 + Math.random() * 100
      beam.speed = 0.5 + Math.random() * 0.4
      beam.hue = hueStart + (index * hueRange) / totalBeams
      beam.opacity = 0.2 + Math.random() * 0.1
      return beam
    }

    function drawBeam(c: CanvasRenderingContext2D, beam: Beam) {
      c.save()
      c.translate(beam.x, beam.y)
      c.rotate((beam.angle * Math.PI) / 180)

      const pulsingOpacity =
        beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * OPACITY_MAP[intensity]

      const g = c.createLinearGradient(0, 0, 0, beam.length)
      const col = (a: number) => `hsla(${beam.hue}, ${sat}%, ${light}%, ${a})`
      g.addColorStop(0, col(0))
      g.addColorStop(0.1, col(pulsingOpacity * 0.5))
      g.addColorStop(0.4, col(pulsingOpacity))
      g.addColorStop(0.6, col(pulsingOpacity))
      g.addColorStop(0.9, col(pulsingOpacity * 0.5))
      g.addColorStop(1, col(0))

      c.fillStyle = g
      c.fillRect(-beam.width / 2, 0, beam.width, beam.length)
      c.restore()
    }

    function render() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.filter = `blur(${blurStrong}px)`

      beamsRef.current.forEach((beam, index) => {
        beam.y -= beam.speed
        beam.pulse += beam.pulseSpeed
        if (beam.y + beam.length < -100) resetBeam(beam, index)
        drawBeam(ctx, beam)
      })

      animationFrameRef.current = requestAnimationFrame(render)
    }

    // Reduced motion: desenha um quadro estático e não anima
    if (reduceMotion) {
      ctx.filter = `blur(${blurStrong}px)`
      beamsRef.current.forEach((beam) => drawBeam(ctx, beam))
    } else {
      render()
    }

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [intensity, colorMode])

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <canvas ref={canvasRef} className="absolute inset-0" style={{ filter: 'blur(15px)' }} />
    </div>
  )
}

export default BeamsBackground
