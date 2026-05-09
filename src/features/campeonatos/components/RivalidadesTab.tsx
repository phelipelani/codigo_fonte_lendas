// Arquivo: src/features/Campeonatos/components/RivalidadesTab.tsx
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/api';
import { Swords, Crown, User, Loader2 } from 'lucide-react';

interface RivalidadeSQL {
  // Campos retornados pelo backend (formato time-based)
  capitaoA_nome: string;
  capitaoA_foto: string | null;
  capitaoB_nome: string;
  capitaoB_foto: string | null;
  vitoriasA: number;
  vitoriasB: number;
  empates?: number;
  golsA?: number;
  golsB?: number;
}

export function RivalidadesTab({ campeonatoId }: { campeonatoId: number }) {
  const { data: rivalidades, isLoading } = useQuery<RivalidadeSQL[]>({
    queryKey: ['campeonatos', campeonatoId, 'rivalidades'],
    queryFn: async () => {
      const { data } = await api.get(`/campeonatos/${campeonatoId}/rivalidades`);
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!rivalidades || rivalidades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed border-cyan-500/20 bg-[#0a1628]/30">
        <Swords className="h-12 w-12 mb-4 text-cyan-400/30" />
        <p className="text-cyan-100/50">Sem confrontos registrados ainda. Finalize partidas para ver as rivalidades.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rivalidades.map((r, idx) => {
        const vA = Number(r.vitoriasA) || 0;
        const vB = Number(r.vitoriasB) || 0;
        const empates = Number(r.empates) || 0;
        const total = vA + vB + empates;
        const p1 = total > 0 ? (vA / total) * 100 : 0;
        const p2 = total > 0 ? (vB / total) * 100 : 0;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 backdrop-blur-md p-5 relative overflow-hidden"
          >
            {/* Badge de Confrontos */}
            <div className="flex justify-center mb-5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0d1f35] border border-cyan-500/20">
                <Swords size={14} className="text-cyan-400" />
                <span className="text-xs font-bold text-cyan-300">{total} Confrontos</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {/* Capitão A */}
              <div className="flex flex-col items-center w-1/3">
                <div className="w-16 h-16 rounded-full border-2 border-cyan-500/50 p-0.5 bg-[#0d1f35] overflow-hidden shadow-lg shadow-cyan-500/10">
                  {r.capitaoA_foto ? (
                    <img src={r.capitaoA_foto} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
                      <User className="text-cyan-400" size={24} />
                    </div>
                  )}
                </div>
                <span className="font-bold text-sm mt-3 text-white text-center leading-tight truncate w-full">
                  {r.capitaoA_nome}
                </span>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-2xl font-black text-cyan-400">{vA}</span>
                  <Crown size={16} className="text-amber-400" fill="currentColor" />
                </div>
              </div>

              {/* Gráfico Central */}
              <div className="flex flex-col items-center w-1/3 px-2">
                <span className="text-xs text-cyan-100/40 mb-2">Empates: {empates}</span>
                
                {/* Barra de progresso */}
                <div className="w-full h-2 bg-[#0d1f35] rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${p1}%` }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-500"
                  />
                  <div
                    style={{ width: `${p2}%` }}
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                  />
                </div>

                {/* VS */}
                <div className="mt-3 w-10 h-10 rounded-full bg-[#0d1f35] border border-cyan-500/20 flex items-center justify-center">
                  <span className="text-xs font-black text-cyan-400">VS</span>
                </div>
              </div>

              {/* Capitão B */}
              <div className="flex flex-col items-center w-1/3">
                <div className="w-16 h-16 rounded-full border-2 border-amber-500/50 p-0.5 bg-[#0d1f35] overflow-hidden shadow-lg shadow-amber-500/10">
                  {r.capitaoB_foto ? (
                    <img src={r.capitaoB_foto} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                      <User className="text-amber-400" size={24} />
                    </div>
                  )}
                </div>
                <span className="font-bold text-sm mt-3 text-white text-center leading-tight truncate w-full">
                  {r.capitaoB_nome}
                </span>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-2xl font-black text-amber-400">{vB}</span>
                  <Crown size={16} className="text-amber-400" fill="currentColor" />
                </div>
              </div>
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-amber-500/5 pointer-events-none" />
          </motion.div>
        );
      })}
    </div>
  );
}