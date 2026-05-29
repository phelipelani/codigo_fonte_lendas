// Arquivo: src/features/album/components/AbrirPacoteModal.tsx
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Package, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Figurinha } from './Figurinha';
import { useAbrirPacote, type Figurinha as FigurinhaType } from '../api/albumApi';

type AbrirPacoteModalProps = {
  pacoteId: number | null;
  onClose: () => void;
};

type Fase = 'fechado' | 'abrindo' | 'revelando';

export const AbrirPacoteModal: React.FC<AbrirPacoteModalProps> = ({
  pacoteId,
  onClose,
}) => {
  const abrirMut = useAbrirPacote();
  const [fase, setFase] = React.useState<Fase>('fechado');
  const [figurinhas, setFigurinhas] = React.useState<FigurinhaType[]>([]);
  const [reveladas, setReveladas] = React.useState(0);

  // Reseta ao abrir/fechar
  React.useEffect(() => {
    if (pacoteId == null) {
      setFase('fechado');
      setFigurinhas([]);
      setReveladas(0);
    }
  }, [pacoteId]);

  const handleAbrir = () => {
    if (pacoteId == null) return;
    setFase('abrindo');
    abrirMut.mutate(pacoteId, {
      onSuccess: (data) => {
        setFigurinhas(data.figurinhas ?? []);
        setFase('revelando');
        // Revela uma a uma
        let i = 0;
        const timer = setInterval(() => {
          i++;
          setReveladas(i);
          if (i >= (data.figurinhas?.length ?? 0)) clearInterval(timer);
        }, 450);
      },
      onError: () => setFase('fechado'),
    });
  };

  const tudoRevelado = fase === 'revelando' && reveladas >= figurinhas.length;

  return (
    <AnimatePresence>
      {pacoteId != null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
        >
          {/* Botao fechar — so quando tudo revelado ou ainda fechado */}
          {(fase === 'fechado' || tudoRevelado) && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 text-white/50 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-7 w-7" />
            </button>
          )}

          <div className="w-full max-w-2xl flex flex-col items-center">
            {/* FASE: pacote fechado */}
            {fase === 'fechado' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center text-center"
              >
                <motion.div
                  animate={{ rotate: [-3, 3, -3], y: [0, -6, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative h-44 w-36 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 border-4 border-amber-300 flex items-center justify-center shadow-[0_0_50px_-8px_rgba(251,191,36,0.6)]"
                >
                  <Package className="h-20 w-20 text-amber-100" />
                  <Sparkles className="absolute top-2 right-2 h-6 w-6 text-amber-100 animate-pulse" />
                </motion.div>
                <h3 className="mt-6 text-2xl font-black text-white">
                  Pacote de figurinhas
                </h3>
                <p className="mt-1 text-sm text-cyan-100/60">
                  5 figurinhas esperando por você
                </p>
                <Button
                  onClick={handleAbrir}
                  size="lg"
                  className="mt-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#0a1628] font-black shadow-lg"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  ABRIR PACOTE
                </Button>
              </motion.div>
            )}

            {/* FASE: abrindo (loading) */}
            {fase === 'abrindo' && (
              <div className="flex flex-col items-center text-center">
                <motion.div
                  animate={{ scale: [1, 1.3, 0.9, 1.4], rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="h-44 w-36 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 border-4 border-amber-200 flex items-center justify-center"
                >
                  <Loader2 className="h-16 w-16 text-amber-100 animate-spin" />
                </motion.div>
                <p className="mt-6 text-lg font-bold text-amber-200">Abrindo...</p>
              </div>
            )}

            {/* FASE: revelando figurinhas */}
            {fase === 'revelando' && (
              <div className="flex flex-col items-center w-full">
                <h3 className="text-xl font-black text-white mb-5">
                  {tudoRevelado ? 'Suas figurinhas!' : 'Revelando...'}
                </h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {figurinhas.map((fig, idx) => (
                    <motion.div
                      key={fig.id + '-' + idx}
                      initial={{ rotateY: 180, opacity: 0, scale: 0.6 }}
                      animate={
                        idx < reveladas
                          ? { rotateY: 0, opacity: 1, scale: 1 }
                          : { rotateY: 180, opacity: 0.2, scale: 0.6 }
                      }
                      transition={{ duration: 0.45, type: 'spring' }}
                      className="relative"
                    >
                      <Figurinha figurinha={fig} forcarObtida tamanho="lg" />
                      {idx < reveladas && fig.era_repetida && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black whitespace-nowrap">
                          REPETIDA
                        </span>
                      )}
                      {idx < reveladas && !fig.era_repetida && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-cyan-400 text-[#0a1628] text-[10px] font-black whitespace-nowrap">
                          NOVA!
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>

                {tudoRevelado && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Button
                      onClick={onClose}
                      size="lg"
                      className="mt-7 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold"
                    >
                      Continuar
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
