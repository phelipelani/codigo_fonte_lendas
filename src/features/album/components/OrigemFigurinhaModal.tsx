// Arquivo: src/features/album/components/OrigemFigurinhaModal.tsx
//
// Modal aberto ao clicar numa figurinha do álbum.
// Mostra os dados da figurinha e COMO o usuário a obteve (pacote/troca).

import * as React from 'react';
import { motion } from 'framer-motion';
import { X, Package, ArrowLeftRight, Loader2, Lock } from 'lucide-react';
import { Figurinha } from './Figurinha';
import {
  useOrigemFigurinha,
  type Figurinha as FigurinhaType,
} from '../api/albumApi';

const formatarData = (d: string | null): string => {
  if (!d) return '';
  const dt = new Date(d.replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

type Props = {
  figurinha: FigurinhaType | null;
  onClose: () => void;
};

export const OrigemFigurinhaModal: React.FC<Props> = ({
  figurinha,
  onClose,
}) => {
  const { data, isLoading } = useOrigemFigurinha(figurinha?.id ?? null);

  if (!figurinha) return null;

  const obtida = data?.obtida ?? false;
  const eventos = data?.eventos ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border-2 border-cyan-400/30 bg-[#0d1f35] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">
            Figurinha #{figurinha.numero}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-cyan-100/50 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-4">
          <div className="w-28 shrink-0">
            <Figurinha figurinha={figurinha} forcarObtida={obtida} tamanho="fluid" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-white">{figurinha.nome}</p>
            {figurinha.time && (
              <p className="text-sm text-cyan-100/50">{figurinha.time}</p>
            )}
            <span
              className={
                'mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                (figurinha.raridade === 'lendaria'
                  ? 'bg-amber-500/20 text-amber-200'
                  : 'bg-cyan-500/20 text-cyan-200')
              }
            >
              {figurinha.raridade === 'lendaria' ? '★ Lendária' : 'Comum'}
            </span>

            {data && obtida && (
              <p className="mt-2 text-xs text-cyan-100/60">
                Você tem{' '}
                <strong className="text-emerald-300">{data.quantidade}</strong>{' '}
                {data.quantidade === 1 ? 'cópia' : 'cópias'}
              </p>
            )}
          </div>
        </div>

        {/* Origem */}
        <div className="mt-4 border-t border-white/10 pt-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            </div>
          ) : !obtida ? (
            <div className="flex items-center gap-2 text-sm text-cyan-100/50">
              <Lock className="h-4 w-4" />
              Você ainda não tem esta figurinha.
            </div>
          ) : (
            <>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-cyan-100/40">
                Como você conseguiu
              </p>
              {eventos.length === 0 ? (
                <p className="text-sm text-cyan-100/60">
                  {data?.obtida_em
                    ? `Obtida em ${formatarData(data.obtida_em)}.`
                    : 'Figurinha já no seu álbum.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {eventos.map((ev, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-cyan-500/15 bg-[#0a1628]/60 p-2.5"
                    >
                      <span
                        className={
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ' +
                          (ev.tipo === 'troca'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-cyan-500/15 text-cyan-300')
                        }
                      >
                        {ev.tipo === 'troca' ? (
                          <ArrowLeftRight className="h-4 w-4" />
                        ) : (
                          <Package className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {ev.texto}
                        </p>
                        {ev.data && (
                          <p className="text-[11px] text-cyan-100/45">
                            {formatarData(ev.data)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
