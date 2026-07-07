import { useEffect, useRef } from 'react'

/**
 * Fundo animado de ondas (canvas, sem dependencias).
 * - TS-safe + cancela o requestAnimationFrame no unmount (o original vazava).
 * - `scale`: 2 = mais detalhe (login), 3+ = mais leve (fundo de tela em uso).
 */
export default function HeroWave({
  className = 'absolute inset-0 h-full w-full',
  scale = 2,
}: {
  className?: string
  scale?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const SCALE = Math.max(1, scale)
    let width = 0
    let height = 0
    let imageData: ImageData
    let data: Uint8ClampedArray

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      width = Math.max(1, Math.floor(canvas.width / SCALE))
      height = Math.max(1, Math.floor(canvas.height / SCALE))
      imageData = ctx.createImageData(width, height)
      data = imageData.data
    }
    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()

    const startTime = Date.now()
    const TWO_PI = Math.PI * 2
    const SIN_TABLE = new Float32Array(1024)
    const COS_TABLE = new Float32Array(1024)
    for (let i = 0; i < 1024; i++) {
      const angle = (i / 1024) * TWO_PI
      SIN_TABLE[i] = Math.sin(angle)
      COS_TABLE[i] = Math.cos(angle)
    }
    const fastSin = (x: number) => SIN_TABLE[Math.floor(((x % TWO_PI) / TWO_PI) * 1024) & 1023]
    const fastCos = (x: number) => COS_TABLE[Math.floor(((x % TWO_PI) / TWO_PI) * 1024) & 1023]

    let raf = 0
    const render = () => {
      const time = (Date.now() - startTime) * 0.001

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const u_x = (2 * x - width) / height
          const u_y = (2 * y - height) / height

          let a = 0
          let d = 0
          for (let i = 0; i < 4; i++) {
            a += fastCos(i - d + time * 0.5 - a * u_x)
            d += fastSin(i * u_y + a)
          }

          const wave = (fastSin(a) + fastCos(d)) * 0.5
          const intensity = 0.3 + 0.4 * wave
          const baseVal = 0.1 + 0.15 * fastCos(u_x + u_y + time * 0.3)
          const blueAccent = 0.2 * fastSin(a * 1.5 + time * 0.2)
          const purpleAccent = 0.15 * fastCos(d * 2 + time * 0.1)

          const r = Math.max(0, Math.min(1, baseVal + purpleAccent * 0.8)) * intensity
          const g = Math.max(0, Math.min(1, baseVal + blueAccent * 0.6)) * intensity
          const b = Math.max(0, Math.min(1, baseVal + blueAccent * 1.2 + purpleAccent * 0.4)) * intensity

          const index = (y * width + x) * 4
          data[index] = r * 255
          data[index + 1] = g * 255
          data[index + 2] = b * 255
          data[index + 3] = 255
        }
      }

      ctx.putImageData(imageData, 0, 0)
      if (SCALE > 1) {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(canvas, 0, 0, width, height, 0, 0, canvas.width, canvas.height)
      }

      raf = requestAnimationFrame(render)
    }
    render()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(raf)
    }
  }, [scale])

  return <canvas ref={canvasRef} className={className} />
}
