import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import Layout from '../components/Layout'

interface Evento {
  id: number
  titulo: string
  categoria: string
  dataInicio: string
  dataFim: string | null
  local: string | null
  descricao: string | null
}

type CatInfo = { label: string; dot: string; chip: string; texto: string; icon: string }
const CATS: Record<string, CatInfo> = {
  treino_tecnico: { label: 'Treino Técnico', dot: 'bg-emerald-400', chip: 'bg-emerald-500/15 border-emerald-500/30', texto: 'text-emerald-300', icon: '⚽' },
  treino_tatico:  { label: 'Treino Tático',  dot: 'bg-orange-400',  chip: 'bg-orange-500/15 border-orange-500/30',  texto: 'text-orange-300',  icon: '📋' },
  treino_fisico:  { label: 'Treino Físico',  dot: 'bg-fuchsia-400', chip: 'bg-fuchsia-500/15 border-fuchsia-500/30', texto: 'text-fuchsia-300', icon: '🏃' },
  analise:        { label: 'Análise / Reunião', dot: 'bg-night-cyan', chip: 'bg-night-cyan/15 border-night-cyan/30', texto: 'text-night-cyan', icon: '🎥' },
  amistoso:       { label: 'Amistoso', dot: 'bg-blue-400', chip: 'bg-blue-500/15 border-blue-500/30', texto: 'text-blue-300', icon: '🛡️' },
  jogo_oficial:   { label: 'Jogo Oficial', dot: 'bg-red-400', chip: 'bg-red-500/15 border-red-500/30', texto: 'text-red-300', icon: '🏆' },
}
const CAT_KEYS = Object.keys(CATS)
const cat = (k: string): CatInfo => CATS[k] ?? CATS.analise
const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function parse(dt: string | null): Date | null {
  if (!dt) return null
  const d = new Date(dt.replace(' ', 'T'))
  return isNaN(d.getTime()) ? null : d
}
const horaFmt = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const chaveDia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const ehHoje = (d: Date) => chaveDia(d) === chaveDia(new Date())

type Form = { titulo: string; categoria: string; data: string; hora: string; local: string; descricao: string }
const FORM0 = (): Form => ({ titulo: '', categoria: 'treino_tecnico', data: '', hora: '19:00', local: '', descricao: '' })

export default function AgendaPage() {
  const { user } = useAuth()
  const podeGerir = user?.papel === 'tecnico' || user?.papel === 'diretor'

  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [view, setView] = useState<'mes' | 'semana' | 'lista'>('mes')
  const [cursor, setCursor] = useState(() => new Date())

  const [aberto, setAberto] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Form>(FORM0())
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setLoading(true)
    try {
      setEventos(await api.get<Evento[]>('/campo/agenda'))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar a agenda.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    carregar()
  }, [])

  const eventosPorDia = useMemo(() => {
    const m = new Map<string, Evento[]>()
    for (const e of eventos) {
      const d = parse(e.dataInicio)
      if (!d) continue
      const k = chaveDia(d)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(e)
    }
    return m
  }, [eventos])
  const doDia = (d: Date) => eventosPorDia.get(chaveDia(d)) ?? []

  const proximos = useMemo(() => {
    const agora = Date.now()
    return eventos
      .map((e) => ({ e, t: parse(e.dataInicio)?.getTime() ?? 0 }))
      .filter((x) => x.t >= agora - 3600_000)
      .sort((a, b) => a.t - b.t)
      .slice(0, 5)
      .map((x) => x.e)
  }, [eventos])

  function abrirNovo(dia?: Date) {
    if (!podeGerir) return
    const base = dia ?? new Date()
    setEditId(null)
    setForm({ ...FORM0(), data: toDateInput(base) })
    setAberto(true)
  }
  function abrirEdicao(e: Evento) {
    if (!podeGerir) return
    const d = parse(e.dataInicio)
    setEditId(e.id)
    setForm({
      titulo: e.titulo,
      categoria: e.categoria,
      data: d ? toDateInput(d) : '',
      hora: d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '19:00',
      local: e.local ?? '',
      descricao: e.descricao ?? '',
    })
    setAberto(true)
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault()
    setSalvando(true)
    setErro('')
    const payload = {
      titulo: form.titulo,
      categoria: form.categoria,
      data_inicio: `${form.data}T${form.hora || '00:00'}`,
      local: form.local || null,
      descricao: form.descricao || null,
    }
    try {
      if (editId) await api.put(`/campo/agenda/${editId}`, payload)
      else await api.post('/campo/agenda', payload)
      setAberto(false)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }
  async function excluir() {
    if (editId == null || !confirm('Excluir este compromisso?')) return
    try {
      await api.del(`/campo/agenda/${editId}`)
      setAberto(false)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir.')
    }
  }

  function navega(passo: number) {
    const d = new Date(cursor)
    if (view === 'semana') d.setDate(d.getDate() + passo * 7)
    else d.setMonth(d.getMonth() + passo)
    setCursor(d)
  }

  const labelPeriodo =
    view === 'semana'
      ? `Semana de ${gridSemana(cursor)[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
      : cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <Layout
      active="agenda"
      title="Agenda"
      subtitle="Veja os compromissos e atividades do clube."
      hideNotif
      actions={
        podeGerir ? (
          <button onClick={() => abrirNovo()} className="btn-primary h-11 text-sm">＋ Agendar compromisso</button>
        ) : undefined
      }
    >
      {erro && (
        <div className="mb-3 rounded-lg border border-campo-red/40 bg-campo-red/15 px-3 py-2 text-sm text-red-200">{erro}</div>
      )}

      {/* controles */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1 text-sm font-semibold">
          {(['mes', 'semana', 'lista'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 transition ${view === v ? 'bg-night-cyan/15 text-night-cyan' : 'text-white/60 hover:text-white'}`}
            >
              {v === 'mes' ? 'Mês' : v === 'semana' ? 'Semana' : 'Lista'}
            </button>
          ))}
        </div>
        {view !== 'lista' && (
          <div className="flex items-center gap-2">
            <button onClick={() => navega(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 hover:bg-white/10">‹</button>
            <span className="min-w-[150px] text-center font-bold capitalize">{labelPeriodo}</span>
            <button onClick={() => navega(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 hover:bg-white/10">›</button>
            <button onClick={() => setCursor(new Date())} className="ml-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10">Hoje</button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-white/60">Carregando…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
          {/* ===== CALENDÁRIO / LISTA ===== */}
          <div>
            {view === 'lista' ? (
              <ListaView eventos={eventos} onAbrir={abrirEdicao} podeGerir={podeGerir} />
            ) : (
              <Calendario
                dias={view === 'semana' ? gridSemana(cursor) : gridMes(cursor)}
                mesAtual={view === 'mes' ? cursor.getMonth() : null}
                doDia={doDia}
                onDia={abrirNovo}
                onEvento={abrirEdicao}
                semanas={view === 'semana'}
              />
            )}

            {/* legenda */}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60">
              {CAT_KEYS.map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${cat(k).dot}`} />
                  {cat(k).icon} {cat(k).label}
                </span>
              ))}
            </div>
          </div>

          {/* ===== PRÓXIMOS COMPROMISSOS ===== */}
          <div className="rounded-2xl border border-night-cyan/20 bg-night-card/60 p-4">
            <div className="mb-4 text-center text-lg font-extrabold">Próximos Compromissos</div>
            {proximos.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/45">Nenhum compromisso futuro.</p>
            ) : (
              <ul className="space-y-3">
                {proximos.map((e) => {
                  const d = parse(e.dataInicio)
                  const c = cat(e.categoria)
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => abrirEdicao(e)}
                        disabled={!podeGerir}
                        className={`flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left ${podeGerir ? 'hover:bg-white/[0.06]' : 'cursor-default'}`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-xl font-extrabold leading-none">{d ? String(d.getDate()).padStart(2, '0') : '--'}</span>
                          <span className="text-[10px] font-bold uppercase text-white/50">{d ? d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : ''}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`flex items-center gap-1.5 font-bold ${c.texto}`}>
                            <span>{c.icon}</span>
                            <span className="truncate">{e.titulo}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-white/55">{d ? horaFmt(d) : ''}</div>
                          {e.local && <div className="text-xs text-white/45">📍 {e.local}</div>}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL ===== */}
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setAberto(false)}>
          <div className="card w-full max-w-md rounded-b-none p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-extrabold">{editId ? 'Editar compromisso' : 'Novo compromisso'}</h2>
            <form onSubmit={salvar} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-white/70">Título</label>
                <input className="field" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Treino de finalização" autoFocus />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/70">Tipo</label>
                <select className="field" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {CAT_KEYS.map((k) => (<option key={k} value={k}>{cat(k).label}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-white/70">Data</label>
                  <input type="date" className="field" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">Hora</label>
                  <input type="time" className="field" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/70">Local (opcional)</label>
                <input className="field" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} placeholder="Ex: CT Caraguatas" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/70">Descrição (opcional)</label>
                <textarea className="field min-h-[60px]" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                {editId != null && (
                  <button type="button" onClick={excluir} className="btn border border-white/12 px-3 py-2.5 text-sm text-red-300 hover:bg-campo-red/20">Excluir</button>
                )}
                <button type="button" onClick={() => setAberto(false)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

function gridMes(ref: Date): Date[] {
  const primeiro = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const inicio = new Date(primeiro)
  inicio.setDate(1 - primeiro.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    return d
  })
}
function gridSemana(ref: Date): Date[] {
  const inicio = new Date(ref)
  inicio.setDate(ref.getDate() - ref.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    return d
  })
}
function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Calendario({
  dias,
  mesAtual,
  doDia,
  onDia,
  onEvento,
  semanas,
}: {
  dias: Date[]
  mesAtual: number | null
  doDia: (d: Date) => Evento[]
  onDia: (d: Date) => void
  onEvento: (e: Evento) => void
  semanas: boolean
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-night-cyan/20 bg-night-card/40">
      <div className="grid grid-cols-7 border-b border-white/10 text-center text-[11px] font-bold uppercase tracking-wide text-white/45">
        {DOW.map((d) => (<div key={d} className="py-2">{d}</div>))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d, i) => {
          const fora = mesAtual !== null && d.getMonth() !== mesAtual
          const evs = doDia(d)
          return (
            <div
              key={i}
              onClick={() => onDia(d)}
              className={`min-h-[92px] cursor-pointer border-b border-r border-white/5 p-1.5 transition hover:bg-white/[0.03] ${
                semanas ? 'min-h-[160px]' : ''
              } ${fora ? 'opacity-40' : ''}`}
            >
              <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${ehHoje(d) ? 'bg-night-cyan text-[#000407]' : 'text-white/70'}`}>
                {d.getDate()}
              </div>
              <div className="space-y-1">
                {evs.slice(0, semanas ? 8 : 3).map((e) => {
                  const c = cat(e.categoria)
                  const dt = parse(e.dataInicio)
                  return (
                    <button
                      key={e.id}
                      onClick={(ev) => { ev.stopPropagation(); onEvento(e) }}
                      className={`block w-full truncate rounded border px-1.5 py-0.5 text-left text-[10px] leading-tight ${c.chip}`}
                    >
                      <span className="font-bold">{dt ? horaFmt(dt) : ''}</span>{' '}
                      <span className={c.texto}>{e.titulo}</span>
                    </button>
                  )
                })}
                {evs.length > (semanas ? 8 : 3) && (
                  <div className="px-1 text-[10px] text-white/45">+{evs.length - (semanas ? 8 : 3)}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ListaView({ eventos, onAbrir, podeGerir }: { eventos: Evento[]; onAbrir: (e: Evento) => void; podeGerir: boolean }) {
  const ordenados = [...eventos].sort((a, b) => (parse(a.dataInicio)?.getTime() ?? 0) - (parse(b.dataInicio)?.getTime() ?? 0))
  if (ordenados.length === 0) {
    return <div className="card p-8 text-center text-white/60">Nenhum compromisso na agenda.</div>
  }
  return (
    <ul className="space-y-2">
      {ordenados.map((e) => {
        const d = parse(e.dataInicio)
        const c = cat(e.categoria)
        return (
          <li key={e.id}>
            <button
              onClick={() => onAbrir(e)}
              disabled={!podeGerir}
              className={`flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left ${podeGerir ? 'hover:bg-white/[0.06]' : 'cursor-default'}`}
            >
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${c.chip} border text-lg`}>{c.icon}</span>
              <div className="min-w-0 flex-1">
                <div className={`truncate font-bold ${c.texto}`}>{e.titulo}</div>
                <div className="text-xs text-white/55">
                  {d ? d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : ''} · {d ? horaFmt(d) : ''}
                  {e.local ? ` · 📍 ${e.local}` : ''}
                </div>
              </div>
              <span className="text-[11px] font-semibold uppercase text-white/40">{c.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
