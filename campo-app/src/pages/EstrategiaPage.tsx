import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import CampoTatico, {
  ESQUEMAS,
  montarFormacao,
  detectarEsquema,
  type JogadorLite,
  type PosicaoTatica,
} from '../components/CampoTatico'

interface Formacao {
  id: number
  nome: string
  esquema: string | null
  mentalidade: string | null
  estilo: string | null
  instrucoes: Instrucoes | null
  posicoes: PosicaoTatica[]
  favorita: boolean
  atualizadoEm: string | null
}
type Instrucoes = { amplitude: number; linhas: number; ritmo: number; pressao: number; marcacao: number }

const MENTALIDADES = ['Defensiva', 'Equilibrada', 'Ofensiva']
const ESTILOS = ['Posse de Bola', 'Contra-ataque', 'Equilibrado', 'Jogo Direto']
const INSTR_LABEL = ['Muito baixa', 'Baixa', 'Média', 'Alta', 'Muito alta']
const INSTRUCOES_DEF: Instrucoes = { amplitude: 4, linhas: 4, ritmo: 4, pressao: 4, marcacao: 5 }
const INSTR_CAMPOS: { key: keyof Instrucoes; label: string }[] = [
  { key: 'amplitude', label: 'Amplitude' },
  { key: 'linhas', label: 'Linhas Defensivas' },
  { key: 'ritmo', label: 'Ritmo' },
  { key: 'pressao', label: 'Pressão' },
  { key: 'marcacao', label: 'Marcação' },
]

export default function EstrategiaPage() {
  const [jogadores, setJogadores] = useState<JogadorLite[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState<'editor' | 'salvas'>('editor')

  // estado do esquema atual
  const [editId, setEditId] = useState<number | null>(null)
  const [nome, setNome] = useState('Nova formação')
  const [esquema, setEsquema] = useState<string>('4-3-3')
  const [mentalidade, setMentalidade] = useState(MENTALIDADES[2])
  const [estilo, setEstilo] = useState(ESTILOS[0])
  const [instrucoes, setInstrucoes] = useState<Instrucoes>(INSTRUCOES_DEF)
  const [posicoes, setPosicoes] = useState<PosicaoTatica[]>([])

  const [salvas, setSalvas] = useState<Formacao[]>([])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<JogadorLite[]>('/campo/jogadores'),
      api.get<Formacao[]>('/campo/formacoes').catch(() => [] as Formacao[]),
    ])
      .then(([js, fs]) => {
        const ativos = js.filter((j) => (j as { ativo?: boolean }).ativo !== false)
        setJogadores(ativos)
        setSalvas(fs)
        setPosicoes(montarFormacao('4-3-3', ativos))
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  function aplicarEsquema(esq: string) {
    setEsquema(esq)
    setPosicoes(montarFormacao(esq, jogadores))
  }

  // arrastar: atualiza posicoes e re-detecta o esquema (sem re-encaixar os jogadores)
  function aoMover(next: PosicaoTatica[]) {
    setPosicoes(next)
    const det = detectarEsquema(next, jogadores)
    if (det) setEsquema(det)
  }

  function novoEsquema() {
    setEditId(null)
    setNome('Nova formação')
    setEsquema('4-3-3')
    setMentalidade(MENTALIDADES[2])
    setEstilo(ESTILOS[0])
    setInstrucoes(INSTRUCOES_DEF)
    setPosicoes(montarFormacao('4-3-3', jogadores))
    setAba('editor')
  }

  function carregar(f: Formacao) {
    setEditId(f.id)
    setNome(f.nome)
    setEsquema(f.esquema ?? '4-3-3')
    setMentalidade(f.mentalidade ?? MENTALIDADES[1])
    setEstilo(f.estilo ?? ESTILOS[0])
    setInstrucoes({ ...INSTRUCOES_DEF, ...(f.instrucoes ?? {}) })
    setPosicoes(
      f.posicoes?.length ? f.posicoes : montarFormacao(f.esquema ?? '4-3-3', jogadores),
    )
    setAba('editor')
  }

  async function salvar() {
    const payload = { nome: nome.trim() || esquema, esquema, mentalidade, estilo, instrucoes, posicoes }
    setSalvando(true)
    setErro('')
    try {
      const saved = editId
        ? await api.put<Formacao>(`/campo/formacoes/${editId}`, payload)
        : await api.post<Formacao>('/campo/formacoes', payload)
      setEditId(saved.id)
      const fs = await api.get<Formacao[]>('/campo/formacoes')
      setSalvas(fs)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar formação.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(f: Formacao) {
    if (!confirm(`Excluir a formação "${f.nome}"?`)) return
    try {
      await api.del(`/campo/formacoes/${f.id}`)
      setSalvas((s) => s.filter((x) => x.id !== f.id))
      if (editId === f.id) novoEsquema()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir.')
    }
  }

  const placedIds = useMemo(
    () => new Set(posicoes.map((p) => p.jogadorId).filter(Boolean) as number[]),
    [posicoes],
  )
  const reservas = useMemo(() => jogadores.filter((j) => !placedIds.has(j.id)), [jogadores, placedIds])

  // clicar num reserva: ocupa o primeiro slot vazio
  function entrar(jid: number) {
    const i = posicoes.findIndex((p) => p.jogadorId == null)
    if (i < 0) return
    setPosicoes(posicoes.map((p, k) => (k === i ? { ...p, jogadorId: jid } : p)))
  }

  return (
    <Layout
      active="estrategia"
      title="Estratégia"
      subtitle="Crie, simule e salve formações e estratégias de jogo."
      hideNotif
      actions={
        <div className="flex items-center gap-2">
          <button onClick={novoEsquema} className="btn-ghost h-11 text-sm">＋ Novo esquema</button>
          <button onClick={salvar} disabled={salvando} className="btn-primary h-11 text-sm">
            {salvando ? 'Salvando…' : '💾 Salvar formação'}
          </button>
        </div>
      }
    >
      {erro && (
        <div className="mb-3 rounded-lg border border-campo-red/40 bg-campo-red/15 px-3 py-2 text-sm text-red-200">{erro}</div>
      )}

      {/* abas */}
      <div className="mb-5 flex gap-5 border-b border-white/10 text-sm font-semibold">
        <Aba ativo={aba === 'editor'} onClick={() => setAba('editor')}>Editor</Aba>
        <Aba ativo={aba === 'salvas'} onClick={() => setAba('salvas')}>Formações Salvas</Aba>
        <span className="cursor-not-allowed pb-2 text-white/30">Simulações</span>
      </div>

      {loading ? (
        <p className="text-white/60">Carregando…</p>
      ) : aba === 'salvas' ? (
        <ListaSalvas salvas={salvas} onCarregar={carregar} onExcluir={excluir} />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_1fr_300px]">
          {/* ===== PAINEL ESQUERDO ===== */}
          <div className="space-y-4">
            <Bloco titulo="Esquema atual">
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="field mb-2" placeholder="Nome da formação" />
              <select value={esquema} onChange={(e) => aplicarEsquema(e.target.value)} className="field">
                {!(ESQUEMAS as readonly string[]).includes(esquema) && (
                  <option value={esquema} disabled>{esquema} (livre)</option>
                )}
                {ESQUEMAS.map((f) => (<option key={f} value={f}>{f}</option>))}
              </select>
            </Bloco>

            <Bloco titulo="Mentalidade">
              <select value={mentalidade} onChange={(e) => setMentalidade(e.target.value)} className="field">
                {MENTALIDADES.map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>
            </Bloco>

            <Bloco titulo="Estilo de jogo">
              <select value={estilo} onChange={(e) => setEstilo(e.target.value)} className="field">
                {ESTILOS.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </Bloco>

            <Bloco titulo="Instruções">
              <div className="space-y-3">
                {INSTR_CAMPOS.map(({ key, label }) => (
                  <Barra
                    key={key}
                    label={label}
                    valor={instrucoes[key]}
                    onChange={(v) => setInstrucoes((i) => ({ ...i, [key]: v }))}
                  />
                ))}
              </div>
            </Bloco>
          </div>

          {/* ===== CAMPO ===== */}
          <div className="rounded-2xl border border-night-cyan/20 bg-night-card/40 p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-bold text-night-cyan">{esquema} · {mentalidade}</span>
              <span className="text-xs text-white/45">✋ Arraste os jogadores</span>
            </div>
            <div className="mx-auto max-w-lg">
              <CampoTatico posicoes={posicoes} jogadores={jogadores} onChange={aoMover} />
            </div>
          </div>

          {/* ===== PAINEL DIREITO ===== */}
          <div className="space-y-4">
            <Bloco titulo="Formações rápidas">
              <div className="grid grid-cols-3 gap-2">
                {ESQUEMAS.slice(0, 6).map((f) => (
                  <button
                    key={f}
                    onClick={() => aplicarEsquema(f)}
                    className={`rounded-xl border p-2 transition ${
                      esquema === f ? 'border-night-cyan bg-night-cyan/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <MiniCampo esquema={f} />
                    <div className="mt-1 text-center text-[11px] font-bold text-white/80">{f}</div>
                  </button>
                ))}
              </div>
            </Bloco>

            <Bloco titulo="Formações salvas">
              {salvas.length === 0 ? (
                <p className="py-2 text-center text-xs text-white/40">Nenhuma salva ainda</p>
              ) : (
                <ul className="space-y-1.5">
                  {salvas.slice(0, 6).map((f) => (
                    <li
                      key={f.id}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                        editId === f.id ? 'border-night-cyan/50 bg-night-cyan/[0.08]' : 'border-white/10'
                      }`}
                    >
                      <button onClick={() => carregar(f)} className="min-w-0 flex-1 text-left">
                        <div className="truncate text-sm font-bold">{f.nome}</div>
                        <div className="truncate text-xs text-white/50">{f.estilo ?? f.esquema}</div>
                      </button>
                      {f.favorita && <span className="text-night-cyan">★</span>}
                      <button onClick={() => excluir(f)} className="text-white/40 hover:text-red-300">✕</button>
                    </li>
                  ))}
                </ul>
              )}
              {salvas.length > 6 && (
                <button onClick={() => setAba('salvas')} className="mt-2 w-full text-center text-xs font-semibold text-night-cyan hover:underline">
                  Ver todas as formações
                </button>
              )}
            </Bloco>
          </div>

          {/* ===== BANCO DE RESERVAS ===== */}
          <div className="xl:col-span-3">
            <Bloco titulo="Banco de reservas">
              {reservas.length === 0 ? (
                <p className="py-2 text-center text-xs text-white/40">Todos os jogadores estão em campo</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {reservas.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => entrar(r.id)}
                      title="Colocar no primeiro slot livre"
                      className="flex w-20 flex-shrink-0 flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-2 hover:bg-white/[0.06]"
                    >
                      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-night-cyan/25 bg-white/10 text-xs font-bold text-white/70">
                        {r.fotoUrl ? <img src={r.fotoUrl} alt="" className="h-full w-full object-cover" /> : sigla(r.nome)}
                      </span>
                      <span className="w-full truncate text-center text-[11px] font-semibold">{r.nome}</span>
                      <span className="text-[10px] font-bold uppercase text-night-cyan">{r.posicao}</span>
                    </button>
                  ))}
                </div>
              )}
            </Bloco>
          </div>
        </div>
      )}
    </Layout>
  )
}

const sigla = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

function Aba({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 pb-2 transition ${
        ativo ? 'border-night-cyan text-night-cyan' : 'border-transparent text-white/60 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-night-cyan/20 bg-night-card/60 p-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">{titulo}</div>
      {children}
    </div>
  )
}

function Barra({ label, valor, onChange }: { label: string; valor: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <span className="text-xs font-bold text-night-cyan">{INSTR_LABEL[valor - 1]}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`h-2.5 flex-1 rounded-full transition ${n <= valor ? 'bg-night-cyan' : 'bg-white/10 hover:bg-white/20'}`}
            aria-label={`${label} ${n}`}
          />
        ))}
      </div>
    </div>
  )
}

function MiniCampo({ esquema }: { esquema: string }) {
  const slots = montarFormacao(esquema, [])
  return (
    <div className="relative mx-auto aspect-[3/4] w-full rounded-md border border-white/10 bg-night-cyan/[0.04]">
      {slots.map((p, i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-night-cyan"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        />
      ))}
    </div>
  )
}

function ListaSalvas({
  salvas,
  onCarregar,
  onExcluir,
}: {
  salvas: Formacao[]
  onCarregar: (f: Formacao) => void
  onExcluir: (f: Formacao) => void
}) {
  if (salvas.length === 0) {
    return <div className="card p-8 text-center text-white/60">Nenhuma formação salva ainda. Monte uma no Editor e clique em Salvar.</div>
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {salvas.map((f) => (
        <div key={f.id} className="rounded-2xl border border-night-cyan/20 bg-night-card/60 p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="truncate">{f.nome}</span>
                {f.favorita && <span className="text-night-cyan">★</span>}
              </div>
              <div className="text-xs text-white/50">{f.esquema} · {f.mentalidade ?? '—'} · {f.estilo ?? '—'}</div>
            </div>
            <div className="w-12 flex-shrink-0">
              <MiniCampo esquema={f.esquema ?? '4-3-3'} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onCarregar(f)} className="btn-primary flex-1 px-3 py-1.5 text-sm">Abrir</button>
            <button onClick={() => onExcluir(f)} className="btn border border-white/12 px-3 py-1.5 text-sm text-red-300 hover:bg-campo-red/20">✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}
