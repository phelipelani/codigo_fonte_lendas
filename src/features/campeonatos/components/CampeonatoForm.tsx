// ============================================================================
// Arquivo: src/features/Campeonatos/components/CampeonatoForm.tsx
// Formulário dinâmico com suporte a múltiplos formatos e quantidades de times
// ============================================================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { cn } from '@/lib/utils';
import { Loader2, Trophy, Calendar, Target, ArrowRight, Users, Shuffle, UserCheck, Swords, Crown, GitBranch } from 'lucide-react';
import { useState, useEffect } from 'react';

// ============================================================================
// SCHEMAS
// ============================================================================

const campeonatoFormSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres.'),
  data: z.string().min(1, 'Data obrigatória.'),
});

// ============================================================================
// CONFIGURAÇÕES DINÂMICAS POR QUANTIDADE DE TIMES
// ============================================================================

interface FormatoConfig {
  value: string;
  label: string;
  description: string;
  icon: any;
  disponivel: (numTimes: number) => boolean;
}

const FORMATOS_MATA_MATA: FormatoConfig[] = [
  { value: 'direto_final', label: 'Direto para Final', description: '1º vs 2º na Final (3º e 4º eliminados)', icon: Crown, disponivel: (n) => n === 4 },
  { value: 'semi_final', label: 'Com Semifinal', description: '4º eliminado → 1º direto Final, 2º vs 3º na Semi', icon: Swords, disponivel: (n) => n === 4 },
  { value: 'semi_classica', label: 'Semifinal Clássica', description: '5º eliminado → 1º vs 4º e 2º vs 3º nas Semis', icon: Swords, disponivel: (n) => n === 5 },
  { value: 'quartas', label: 'Quartas de Final', description: 'Fase de grupos → Quartas → Semi → Final', icon: GitBranch, disponivel: (n) => n >= 6 && n <= 8 },
];

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

const TipoCard = ({ tipo, selected, onClick }: { tipo: 'liga' | 'copa'; selected: boolean; onClick: () => void }) => {
  const isLiga = tipo === 'liga';
  return (
    <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className={cn("relative p-5 rounded-xl border-2 transition-all text-left w-full",
        selected ? (isLiga ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20" : "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20")
        : "border-cyan-500/20 bg-[#0d1f35]/30 hover:border-cyan-500/40")}>
      {selected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center", isLiga ? "bg-cyan-500" : "bg-purple-500")}><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></motion.div>}
      <div className="flex items-start gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", selected ? (isLiga ? "bg-cyan-500/20" : "bg-purple-500/20") : "bg-cyan-500/10")}>
          {isLiga ? <Trophy className={cn("w-6 h-6", selected ? "text-cyan-400" : "text-cyan-500/50")} /> : <Swords className={cn("w-6 h-6", selected ? "text-purple-400" : "text-cyan-500/50")} />}
        </div>
        <div className="flex-1">
          <h3 className={cn("font-bold text-lg", selected ? "text-white" : "text-cyan-100/70")}>{isLiga ? 'Futlendão (Pontos Corridos)' : 'Copa (Grupos + Mata-Mata)'}</h3>
          <p className="text-sm text-cyan-100/50 mt-1">{isLiga ? 'Rei da quadra — quem vence fica, quem perde sai. Campeão pela tabela.' : 'Fase de grupos + mata-mata eliminatório.'}</p>
        </div>
      </div>
    </motion.button>
  );
};

const NumTimesSelector = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
  <div className="flex gap-3">
    {[4, 5, 6, 8].map((num) => (
      <motion.button key={num} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onChange(num)}
        className={cn("flex-1 py-3 px-4 rounded-xl border-2 font-bold text-lg transition-all",
          value === num ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/20" : "border-cyan-500/20 bg-[#0d1f35]/30 text-cyan-100/50 hover:border-cyan-500/40")}>
        {num}
      </motion.button>
    ))}
  </div>
);

const FormatoCard = ({ formato, selected, onClick, disabled }: { formato: FormatoConfig; selected: boolean; onClick: () => void; disabled: boolean }) => {
  const Icon = formato.icon;
  return (
    <motion.button type="button" whileHover={!disabled ? { scale: 1.02 } : {}} whileTap={!disabled ? { scale: 0.98 } : {}} onClick={!disabled ? onClick : undefined} disabled={disabled}
      className={cn("relative p-4 rounded-xl border-2 transition-all text-left w-full", disabled && "opacity-40 cursor-not-allowed",
        selected ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20" : "border-purple-500/20 bg-[#0d1f35]/30 hover:border-purple-500/40")}>
      {selected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></motion.div>}
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", selected ? "bg-purple-500/20" : "bg-purple-500/10")}><Icon className={cn("w-5 h-5", selected ? "text-purple-400" : "text-purple-500/50")} /></div>
        <div className="flex-1 min-w-0"><h4 className={cn("font-bold", selected ? "text-white" : "text-cyan-100/70")}>{formato.label}</h4><p className="text-xs text-cyan-100/50 mt-0.5">{formato.description}</p></div>
      </div>
    </motion.button>
  );
};

const LowerBracketToggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center"><GitBranch className="w-5 h-5 text-amber-400" /></div>
        <div><h4 className="font-bold text-white">Lower Bracket (Repescagem)</h4><p className="text-xs text-cyan-100/50">Perdedores disputam vaga na final</p></div>
      </div>
      <button type="button" onClick={() => onChange(!value)} className={cn("relative w-14 h-7 rounded-full transition-colors", value ? "bg-amber-500" : "bg-cyan-500/20")}>
        <motion.div animate={{ x: value ? 24 : 2 }} className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md" />
      </button>
    </div>
    <AnimatePresence>
      {value && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 pt-4 border-t border-amber-500/20">
          <p className="text-xs text-amber-300/80"><strong>Com Lower:</strong> Semi1: 1ºx2º • Semi2: 3ºx4º • Lower: Perdedor S1 vs Vencedor S2 • Final: Vencedor S1 vs Vencedor Lower</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const ModoSelecaoCard = ({ modo, selected, onClick }: { modo: 'fixo' | 'sorteio'; selected: boolean; onClick: () => void }) => {
  const isSorteio = modo === 'sorteio';
  return (
    <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className={cn("p-4 rounded-xl border-2 transition-all text-left flex-1", selected ? "border-emerald-500 bg-emerald-500/10" : "border-cyan-500/20 bg-[#0d1f35]/30 hover:border-cyan-500/40")}>
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", selected ? "bg-emerald-500/20" : "bg-cyan-500/10")}>
          {isSorteio ? <Shuffle className={cn("w-5 h-5", selected ? "text-emerald-400" : "text-cyan-500/50")} /> : <UserCheck className={cn("w-5 h-5", selected ? "text-emerald-400" : "text-cyan-500/50")} />}
        </div>
        <div><h4 className={cn("font-bold", selected ? "text-white" : "text-cyan-100/70")}>{isSorteio ? 'Sorteio' : 'Times Fixos'}</h4><p className="text-xs text-cyan-100/50">{isSorteio ? 'Digita jogadores e sorteia' : 'Seleciona times cadastrados'}</p></div>
      </div>
    </motion.button>
  );
};

const FormatoExplicacao = ({ numTimes, formato, temLower }: { numTimes: number; formato: string; temLower: boolean }) => {
  const getExplicacao = () => {
    if (numTimes === 4) {
      if (formato === 'direto_final') return <>1️⃣ Fase de Grupos: Todos x todos (6 partidas)<br/>2️⃣ Eliminação: 3º e 4º eliminados<br/>3️⃣ Final: 1º vs 2º</>;
      if (formato === 'semi_final') return <>1️⃣ Fase de Grupos: Todos x todos (6 partidas)<br/>2️⃣ Eliminação: 4º eliminado<br/>3️⃣ Semifinal: 2º vs 3º<br/>4️⃣ Final: 1º vs Vencedor Semi</>;
    }
    if (numTimes === 5) {
      if (temLower) return <>1️⃣ Fase de Grupos: Todos x todos (10 partidas)<br/>2️⃣ Eliminação: 5º eliminado<br/>3️⃣ Semi Upper: 1º vs 2º<br/>4️⃣ Semi Lower: 3º vs 4º<br/>5️⃣ Lower Final: Perdedor Upper vs Vencedor Lower<br/>6️⃣ Grand Final: Vencedor Upper vs Vencedor Lower Final</>;
      return <>1️⃣ Fase de Grupos: Todos x todos (10 partidas)<br/>2️⃣ Eliminação: 5º eliminado<br/>3️⃣ Semi 1: 1º vs 4º<br/>4️⃣ Semi 2: 2º vs 3º<br/>5️⃣ Final: Vencedores das semis</>;
    }
    if (numTimes >= 6) return <>1️⃣ Fase de Grupos: Todos x todos<br/>2️⃣ Quartas de Final<br/>3️⃣ Semifinais<br/>4️⃣ Final</>;
    return null;
  };
  return (
    <motion.div key={`${numTimes}-${formato}-${temLower}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
      <h5 className="text-sm font-bold text-purple-300 mb-2">Como funciona:</h5>
      <p className="text-xs text-cyan-100/70">{getExplicacao()}</p>
    </motion.div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function CampeonatoForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [tipo, setTipo] = useState<'liga' | 'copa'>('liga');
  const [numTimes, setNumTimes] = useState(4);
  const [formatoMataMata, setFormatoMataMata] = useState('semi_final');
  const [temLowerBracket, setTemLowerBracket] = useState(false);
  const [modoSelecao, setModoSelecao] = useState<'fixo' | 'sorteio'>('sorteio');

  const form = useForm({ resolver: zodResolver(campeonatoFormSchema), defaultValues: { nome: '', data: new Date().toISOString().split('T')[0] } });

  useEffect(() => {
    const formatosDisponiveis = FORMATOS_MATA_MATA.filter(f => f.disponivel(numTimes));
    if (formatosDisponiveis.length > 0 && !formatosDisponiveis.find(f => f.value === formatoMataMata)) setFormatoMataMata(formatosDisponiveis[0].value);
    if (numTimes < 5) setTemLowerBracket(false);
  }, [numTimes]);

  const handleSubmit = (data: any) => {
    onSubmit({
      nome: data.nome,
      data: data.data,
      formato: tipo === 'liga' ? 'liga' : `copa_${numTimes}_${formatoMataMata}`,
      num_times: numTimes,
      modo_selecao_times: modoSelecao,
      tem_fase_grupos: tipo === 'copa',
      tem_lower_bracket: tipo === 'copa' && numTimes >= 5 && temLowerBracket,
      formato_mata_mata: formatoMataMata,
    });
  };

  const formatosDisponiveis = FORMATOS_MATA_MATA.filter(f => f.disponivel(numTimes));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 backdrop-blur-md p-6 md:p-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* NOME E DATA */}
          <div className="grid md:grid-cols-2 gap-6">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-cyan-100/50 uppercase font-bold flex items-center gap-2"><Trophy size={12} className="text-cyan-400" />Nome</FormLabel>
                <FormControl><Input placeholder="Ex: Copa FutLendas 2026" {...field} disabled={isLoading} className="h-11 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30" /></FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )} />
            <FormField control={form.control} name="data" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-cyan-100/50 uppercase font-bold flex items-center gap-2"><Calendar size={12} className="text-cyan-400" />Data</FormLabel>
                <FormControl><Input type="date" {...field} disabled={isLoading} className="h-11 bg-[#0d1f35]/50 border-cyan-500/20 text-white [&::-webkit-calendar-picker-indicator]:invert" /></FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )} />
          </div>

          {/* TIPO */}
          <div>
            <label className="text-xs text-cyan-100/50 uppercase font-bold flex items-center gap-2 mb-3"><Target size={12} className="text-cyan-400" />Tipo</label>
            <div className="grid md:grid-cols-2 gap-4">
              <TipoCard tipo="liga" selected={tipo === 'liga'} onClick={() => setTipo('liga')} />
              <TipoCard tipo="copa" selected={tipo === 'copa'} onClick={() => setTipo('copa')} />
            </div>
          </div>

          {/* CONFIGURAÇÕES DA COPA */}
          <AnimatePresence>
            {tipo === 'copa' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-6">
                <div>
                  <label className="text-xs text-purple-300/70 uppercase font-bold flex items-center gap-2 mb-3"><Users size={12} className="text-purple-400" />Quantidade de Times</label>
                  <NumTimesSelector value={numTimes} onChange={setNumTimes} />
                </div>
                <div>
                  <label className="text-xs text-purple-300/70 uppercase font-bold flex items-center gap-2 mb-3"><Swords size={12} className="text-purple-400" />Formato do Mata-Mata</label>
                  <div className="grid md:grid-cols-2 gap-4">
                    {FORMATOS_MATA_MATA.map((formato) => (
                      <FormatoCard key={formato.value} formato={formato} selected={formatoMataMata === formato.value} onClick={() => setFormatoMataMata(formato.value)} disabled={!formato.disponivel(numTimes)} />
                    ))}
                  </div>
                </div>
                {numTimes >= 5 && <LowerBracketToggle value={temLowerBracket} onChange={setTemLowerBracket} />}
                <FormatoExplicacao numTimes={numTimes} formato={formatoMataMata} temLower={temLowerBracket} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* MODO DE SELEÇÃO */}
          <div>
            <label className="text-xs text-cyan-100/50 uppercase font-bold flex items-center gap-2 mb-3"><Users size={12} className="text-cyan-400" />Como montar os times?</label>
            <div className="flex gap-4">
              <ModoSelecaoCard modo="sorteio" selected={modoSelecao === 'sorteio'} onClick={() => setModoSelecao('sorteio')} />
              <ModoSelecaoCard modo="fixo" selected={modoSelecao === 'fixo'} onClick={() => setModoSelecao('fixo')} />
            </div>
          </div>

          {/* RESUMO */}
          <div className="p-4 rounded-lg bg-[#0d1f35]/50 border border-cyan-500/10">
            <h5 className="text-xs text-cyan-100/50 uppercase font-bold mb-2">Resumo</h5>
            <div className="flex flex-wrap gap-2">
              <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", tipo === 'liga' ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400")}>{tipo === 'liga' ? '🏟️ Futlendão' : '🏆 Copa'}</span>
              {tipo === 'copa' && <><span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400">{numTimes} Times</span><span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300">{FORMATOS_MATA_MATA.find(f => f.value === formatoMataMata)?.label}</span>{temLowerBracket && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400">Lower Bracket</span>}</>}
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300">{modoSelecao === 'sorteio' ? '🎲 Sorteio' : '👥 Times Fixos'}</span>
            </div>
          </div>

          {/* BOTÃO */}
          <Button type="submit" disabled={isLoading} className={cn("w-full h-12 font-bold text-white", tipo === 'liga' ? "bg-gradient-to-r from-cyan-600 to-teal-600" : "bg-gradient-to-r from-purple-600 to-pink-600")}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : <>Criar Campeonato<ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>
      </Form>
    </motion.div>
  );
}

export default CampeonatoForm;