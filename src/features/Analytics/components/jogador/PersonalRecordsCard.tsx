import { motion } from 'framer-motion';
import { Award, Goal, Target } from 'lucide-react';

interface PersonalRecordsCardProps {
  recordes: any;
}

export function PersonalRecordsCard({ recordes }: PersonalRecordsCardProps) {
  if (!recordes || (recordes.mais_gols_partida === 0 && recordes.mais_assists_partida === 0)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 md:p-6 flex flex-col h-full"
    >
      <div className="flex items-center gap-2 mb-6">
        <Award size={18} className="text-amber-400" />
        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Recordes Pessoais</h3>
      </div>

      <div className="flex flex-col gap-4 flex-1 justify-center">
        {recordes.mais_gols_partida > 0 && (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <Goal size={24} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{recordes.mais_gols_partida}</span>
              </div>
              <span className="text-[10px] text-amber-200/70 uppercase tracking-wider font-bold block">Gols em 1 jogo</span>
            </div>
          </div>
        )}

        {recordes.mais_assists_partida > 0 && (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
              <Target size={24} className="text-cyan-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{recordes.mais_assists_partida}</span>
              </div>
              <span className="text-[10px] text-cyan-200/70 uppercase tracking-wider font-bold block">Assistência em 1 jogo</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
