import { useRef, type PointerEvent as RPointerEvent } from 'react'

export interface JogadorLite {
  id: number
  nome: string
  numero: number | null
  posicao: string
  tipo: 'atk' | 'mid' | 'def' | 'gk'
  fotoUrl?: string | null
}

// posicao de um jogador no campo — x/y em porcentagem (0-100). y=0 ataque (topo), y=100 nosso gol.
export interface PosicaoTatica {
  jogadorId: number | null
  x: number
  y: number
}

// presets: lista ordenada de slots (GOL primeiro, depois defesa->meio->ataque)
type Slot = { x: number; y: number }
export const ESQUEMAS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2', '4-5-1'] as const

const PRESETS: Record<string, Slot[]> = {
  '4-3-3': [
    { x: 50, y: 90 },
    { x: 16, y: 70 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 84, y: 70 },
    { x: 28, y: 48 }, { x: 50, y: 50 }, { x: 72, y: 48 },
    { x: 22, y: 24 }, { x: 50, y: 20 }, { x: 78, y: 24 },
  ],
  '4-4-2': [
    { x: 50, y: 90 },
    { x: 16, y: 70 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 84, y: 70 },
    { x: 16, y: 48 }, { x: 38, y: 50 }, { x: 62, y: 50 }, { x: 84, y: 48 },
    { x: 36, y: 22 }, { x: 64, y: 22 },
  ],
  '4-2-3-1': [
    { x: 50, y: 90 },
    { x: 16, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 84, y: 72 },
    { x: 36, y: 56 }, { x: 64, y: 56 },
    { x: 24, y: 38 }, { x: 50, y: 36 }, { x: 76, y: 38 },
    { x: 50, y: 18 },
  ],
  '3-5-2': [
    { x: 50, y: 90 },
    { x: 28, y: 72 }, { x: 50, y: 74 }, { x: 72, y: 72 },
    { x: 12, y: 52 }, { x: 32, y: 50 }, { x: 50, y: 52 }, { x: 68, y: 50 }, { x: 88, y: 52 },
    { x: 38, y: 22 }, { x: 62, y: 22 },
  ],
  '3-4-3': [
    { x: 50, y: 90 },
    { x: 28, y: 72 }, { x: 50, y: 74 }, { x: 72, y: 72 },
    { x: 16, y: 50 }, { x: 38, y: 52 }, { x: 62, y: 52 }, { x: 84, y: 50 },
    { x: 22, y: 24 }, { x: 50, y: 20 }, { x: 78, y: 24 },
  ],
  '5-3-2': [
    { x: 50, y: 90 },
    { x: 12, y: 70 }, { x: 31, y: 72 }, { x: 50, y: 73 }, { x: 69, y: 72 }, { x: 88, y: 70 },
    { x: 28, y: 50 }, { x: 50, y: 50 }, { x: 72, y: 50 },
    { x: 38, y: 24 }, { x: 62, y: 24 },
  ],
  '4-5-1': [
    { x: 50, y: 90 },
    { x: 16, y: 70 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 84, y: 70 },
    { x: 12, y: 50 }, { x: 32, y: 48 }, { x: 50, y: 50 }, { x: 68, y: 48 }, { x: 88, y: 50 },
    { x: 50, y: 22 },
  ],
}

const ORDEM_TIPO: Record<JogadorLite['tipo'], number> = { gk: 0, def: 1, mid: 2, atk: 3 }

/**
 * Distribui os jogadores nos slots do esquema (GOL → defesa → meio → ataque).
 * Slots sem jogador ficam com jogadorId null; jogadores que sobram vão pro banco.
 */
export function montarFormacao(esquema: string, jogadores: JogadorLite[]): PosicaoTatica[] {
  const slots = PRESETS[esquema] ?? PRESETS['4-3-3']
  const ordenados = [...jogadores].sort(
    (a, b) => ORDEM_TIPO[a.tipo] - ORDEM_TIPO[b.tipo] || (a.numero ?? 99) - (b.numero ?? 99),
  )
  return slots.map((s, i) => ({ jogadorId: ordenados[i]?.id ?? null, x: s.x, y: s.y }))
}

// papel (posicao) derivado da REGIAO do campo onde o token esta (estilo FIFA).
// y: 0 = ataque (topo), 100 = nosso gol. x: 0 = esquerda, 100 = direita.
export function papelDaPosicao(x: number, y: number, ehGk = false): string {
  if (ehGk || y >= 80) return 'GOL'
  if (y >= 58) {
    if (x < 26) return 'LE'
    if (x > 74) return 'LD'
    return 'ZAG'
  }
  if (y >= 34) {
    if (x < 22 || x > 78) return 'MEI'
    return y >= 48 ? 'VOL' : 'MEI'
  }
  if (x < 28) return 'PE'
  if (x > 72) return 'PD'
  return 'ATA'
}

// esquema detectado pela contagem de jogadores de linha por faixa: defesa-meio-ataque.
// (3 faixas; formacoes como 4-2-3-1 aparecem como 4-5-1 — limitacao conhecida e ok.)
export function detectarEsquema(posicoes: PosicaoTatica[], jogadores: JogadorLite[]): string {
  const gkId = jogadores.find((j) => j.tipo === 'gk')?.id ?? null
  let def = 0
  let mid = 0
  let atk = 0
  for (const p of posicoes) {
    if (p.jogadorId == null || p.jogadorId === gkId) continue
    if (p.y >= 58) def++
    else if (p.y >= 34) mid++
    else atk++
  }
  return def + mid + atk === 0 ? '' : `${def}-${mid}-${atk}`
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const iniciais = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function CampoTatico({
  posicoes,
  jogadores,
  onChange,
  editable = true,
  className = '',
}: {
  posicoes: PosicaoTatica[]
  jogadores: JogadorLite[]
  onChange?: (next: PosicaoTatica[]) => void
  editable?: boolean
  className?: string
}) {
  const pitchRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<number | null>(null)
  const byId = (id: number | null) => (id == null ? null : jogadores.find((j) => j.id === id) ?? null)

  function startDrag(e: RPointerEvent, idx: number) {
    if (!editable || !onChange) return
    e.preventDefault()
    dragRef.current = idx
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function moveDrag(e: RPointerEvent, idx: number) {
    if (dragRef.current !== idx || !onChange) return
    const rect = pitchRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 4, 96)
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 4, 96)
    onChange(posicoes.map((p, i) => (i === idx ? { ...p, x, y } : p)))
  }
  function endDrag(e: RPointerEvent, idx: number) {
    if (dragRef.current === idx) dragRef.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      ref={pitchRef}
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-night-cyan/25 ${className}`}
      style={{ background: 'linear-gradient(180deg, #0c2b27 0%, #0a211f 55%, #08191a 100%)' }}
    >
      {/* linhas do campo */}
      <svg viewBox="0 0 100 133" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-night-cyan/20">
        <g fill="none" stroke="currentColor" strokeWidth="0.4">
          <rect x="3" y="3" width="94" height="127" rx="1.5" />
          <line x1="3" y1="66.5" x2="97" y2="66.5" />
          <circle cx="50" cy="66.5" r="11" />
          <circle cx="50" cy="66.5" r="0.8" fill="currentColor" />
          {/* area de cima (ataque) */}
          <rect x="28" y="3" width="44" height="16" />
          <rect x="40" y="3" width="20" height="6" />
          {/* area de baixo (nosso gol) */}
          <rect x="28" y="114" width="44" height="16" />
          <rect x="40" y="124" width="20" height="6" />
        </g>
      </svg>

      {/* tokens dos jogadores */}
      {posicoes.map((p, idx) => {
        const j = byId(p.jogadorId)
        return (
          <div
            key={idx}
            onPointerDown={(e) => startDrag(e, idx)}
            onPointerMove={(e) => moveDrag(e, idx)}
            onPointerUp={(e) => endDrag(e, idx)}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 select-none flex-col items-center ${
              editable && onChange ? 'cursor-grab touch-none active:cursor-grabbing' : ''
            }`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div className="relative">
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-night-cyan/70 bg-night-panel text-[10px] font-bold text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                {j?.fotoUrl ? (
                  <img src={j.fotoUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : j ? (
                  iniciais(j.nome)
                ) : (
                  '+'
                )}
              </span>
              {j?.numero != null && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-night-cyan px-0.5 text-[9px] font-extrabold text-[#000407]">
                  {j.numero}
                </span>
              )}
            </div>
            {j && (
              <div className="mt-0.5 max-w-[4.5rem] rounded bg-black/45 px-1 py-0.5 text-center backdrop-blur-sm">
                <div className="truncate text-[10px] font-bold leading-tight text-white">{j.nome}</div>
                <div className="text-[8px] font-semibold uppercase tracking-wide text-night-cyan">
                  {papelDaPosicao(p.x, p.y, j.tipo === 'gk')}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
