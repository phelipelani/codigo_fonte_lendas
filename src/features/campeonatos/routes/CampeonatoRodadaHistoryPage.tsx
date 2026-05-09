// Arquivo: src/features/Campeonatos/routes/CampeonatoRodadaHistoryPage.tsx
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, History, CheckCircle } from 'lucide-react';
import { CampeonatoRodadaFinalizadaView } from '../components/CampeonatoRodadaFinalizadaView';

export function CampeonatoRodadaHistoryPage() {
  const { id, rodadaId } = useParams<{ id: string; rodadaId: string }>();
  const navigate = useNavigate();
  const rId = Number(rodadaId);
  const cId = Number(id);

  return (
    <div className="min-h-full">
      <div className="max-w-5xl mx-auto px-4 py-6">
        
        {/* Header */}
        <header className="mb-8">
          <Link
            to={`/campeonatos/${cId}`}
            className="inline-flex items-center gap-2 text-cyan-100/50 hover:text-cyan-400 transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Voltar para Campeonato</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <History className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black">
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">
                  Histórico da Rodada
                </span>
              </h1>
              <p className="text-cyan-100/50 text-sm">
                Resultados e estatísticas dos jogos realizados
              </p>
            </div>
          </motion.div>
        </header>

        {/* Badge de Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-300 font-bold text-sm">Rodada Finalizada</span>
          </div>
        </motion.div>

        {/* Conteúdo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <CampeonatoRodadaFinalizadaView rodadaId={rId} campeonatoId={cId} />
        </motion.div>
      </div>
    </div>
  );
}