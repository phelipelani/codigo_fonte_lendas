import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Loader2, Medal } from 'lucide-react';
import { useAlbumRanking, type AlbumRankingUser } from '../api/albumApi';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AlbumRankingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { data: ranking, isLoading, error, isError } = useAlbumRanking();

  // Bloqueia scroll do body
  React.useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0f172a] shadow-2xl ring-1 ring-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Disputa do Álbum</h2>
                <p className="text-xs text-slate-400">Quem está mais perto de completar?</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto p-2 sm:p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
                <p className="mt-4 text-sm text-slate-400">Carregando ranking...</p>
              </div>
            ) : isError ? (
              <div className="py-8 text-center text-red-400">
                <p>Ocorreu um erro ao carregar o ranking.</p>
                <p className="text-xs text-slate-500 mt-2">{String(error)}</p>
              </div>
            ) : ranking?.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                Ninguém obteve figurinhas ainda.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {ranking?.map((user, index) => {
                  const percent = Math.min(
                    100,
                    Math.round((user.total_obtidas / Math.max(1, user.total_figurinhas)) * 100)
                  );

                  let medalColor = 'text-slate-400';
                  let bgMedal = 'bg-slate-500/10';
                  if (index === 0) {
                    medalColor = 'text-yellow-400';
                    bgMedal = 'bg-yellow-400/20';
                  } else if (index === 1) {
                    medalColor = 'text-zinc-300';
                    bgMedal = 'bg-zinc-300/20';
                  } else if (index === 2) {
                    medalColor = 'text-amber-600';
                    bgMedal = 'bg-amber-600/20';
                  }

                  return (
                    <div
                      key={user.id}
                      className="group flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10"
                    >
                      {/* Posição */}
                      <div className="flex w-8 flex-shrink-0 flex-col items-center justify-center">
                        {index < 3 ? (
                          <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', bgMedal, medalColor)}>
                            <Medal className="h-5 w-5" />
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-slate-500">
                            {index + 1}º
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-800 bg-slate-700">
                        {user.avatar && (
                          <img
                            src={user.avatar}
                            alt={user.nome}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        )}
                        <span className={cn("text-lg font-bold text-slate-300", user.avatar ? "hidden flex" : "flex")}>
                          {user.nome?.substring(0, 2).toUpperCase()}
                        </span>
                      </div>

                      {/* Info & Progresso */}
                      <div className="flex flex-1 flex-col justify-center">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-200 line-clamp-1">
                            {user.nome}
                          </span>
                          <span className="text-xs font-bold text-cyan-400">
                            {percent}%
                          </span>
                        </div>
                        
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={cn(
                              'h-full rounded-full',
                              index === 0
                                ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                            )}
                          />
                        </div>
                          <div className="mt-1 text-[10px] text-slate-500">
                            {user.total_obtidas} de {user.total_figurinhas} figurinhas
                          </div>
                          <div className="text-[10px] text-emerald-500/80 mt-0.5">
                            {user.pacotes_abertos || 0} pacotes abertos
                          </div>
                        </div>
                      </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
