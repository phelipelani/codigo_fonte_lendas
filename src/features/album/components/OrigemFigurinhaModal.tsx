// Arquivo: src/features/album/components/OrigemFigurinhaModal.tsx
//
// Modal aberto ao clicar numa figurinha do álbum.
// Layout otimizado para mobile e para print/screenshot:
//   - Topo: Logo FutLendas + figurinha grande centralizada + nome + raridade
//   - Abaixo (scrollável): infos técnicas e origem
// O usuário pode tirar screenshot e o visual do card será bonito para redes sociais.

import * as React from 'react';
import { motion } from 'framer-motion';
import { X, Package, ArrowLeftRight, Loader2, Lock } from 'lucide-react';
import { Figurinha } from './Figurinha';
import {
  useOrigemFigurinha,
  type Figurinha as FigurinhaType,
} from '../api/albumApi';
import logoLendas from '@/assets/Logo.webp';

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

const RARIDADE_BADGE: Record<string, string> = {
  lendaria: 'bg-amber-500/20 text-amber-200 border border-amber-400/30',
  rara: 'bg-violet-500/20 text-violet-200 border border-violet-400/30',
  comum: 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/20',
};

const RARIDADE_LABEL: Record<string, string> = {
  lendaria: '★ Lendária',
  rara: '◆ Rara',
  comum: 'Comum',
};

export const OrigemFigurinhaModal: React.FC<Props> = ({
  figurinha,
  onClose,
}) => {
  const { data, isLoading } = useOrigemFigurinha(figurinha?.id ?? null);

  if (!figurinha) return null;

  const obtida = data?.obtida ?? figurinha.obtida ?? false;
  const eventos = data?.eventos ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      // No mobile: sobe da base. No sm+: centralizado.
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 48 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-t-2xl sm:rounded-2xl border-2 border-cyan-400/30 bg-[#0d1f35] shadow-2xl overflow-hidden"
      >
        {/* Botão fechar flutuante */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-10 rounded-lg p-1.5 text-cyan-100/50 hover:bg-white/5 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Todo o conteúdo rola */}
        <div className="max-h-[92vh] overflow-y-auto">

          {/* ====================================================
              TOPO — área "print-friendly" para screenshot / redes sociais
              Logo + figurinha grande + nome + raridade
          ==================================================== */}
          <div className="flex flex-col items-center pt-7 pb-6 px-6
            bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,#1e3a5f_0%,#0a1628_100%)]">

            {/* Logo + label "Álbum Oficial" */}
            <div className="flex items-center gap-2 mb-5">
              <img
                src={logoLendas}
                alt="FutLendas"
                className="h-7 w-7 object-contain"
                style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.4))' }}
              />
              <span className="text-[9px] tracking-[0.35em] text-amber-300/70 font-bold uppercase">
                Álbum Oficial
              </span>
            </div>

            {/* Figurinha GRANDE centralizada */}
            <div className="w-48 sm:w-52 mx-auto">
              <Figurinha
                figurinha={figurinha}
                forcarObtida={obtida}
                tamanho="fluid"
              />
            </div>

            {/* Nome */}
            <p className="mt-4 text-xl font-black text-white text-center leading-tight px-2">
              {figurinha.nome}
            </p>

            {/* Time (se houver) */}
            {figurinha.time && (
              <p className="mt-0.5 text-sm text-cyan-100/50 text-center">
                {figurinha.time}
              </p>
            )}

            {/* Badge de raridade */}
            <span
              className={
                'mt-3 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ' +
                (RARIDADE_BADGE[figurinha.raridade] ?? RARIDADE_BADGE.comum)
              }
            >
              {RARIDADE_LABEL[figurinha.raridade] ?? 'Comum'}
            </span>
          </div>

          {/* ====================================================
              INFOS TÉCNICAS + ORIGEM — abaixo, com scroll se necessário
          ==================================================== */}
          <div className="px-5 pb-7">

            {/* Número + cópias */}
            {data && obtida ? (
              <div className="flex items-center justify-center gap-3 py-3 border-b border-white/10 text-xs text-cyan-100/60">
                <span>
                  Figurinha{' '}
                  <strong className="text-white font-bold">#{figurinha.numero}</strong>
                </span>
                <span className="h-3 w-px bg-white/20" />
                <span>
                  Você tem{' '}
                  <strong className="text-emerald-300">{data.quantidade}</strong>{' '}
                  {data.quantidade === 1 ? 'cópia' : 'cópias'}
                </span>
              </div>
            ) : (
              <div className="py-3 border-b border-white/10 text-center text-xs text-cyan-100/40">
                Figurinha #{figurinha.numero}
              </div>
            )}

            {/* Origem */}
            <div className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-5">
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                </div>
              ) : !obtida ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-cyan-100/50">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>Você ainda não tem esta figurinha.</span>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-cyan-100/40">
                    Como você conseguiu
                  </p>
                  {eventos.length === 0 ? (
                    <p className="text-center text-sm text-cyan-100/60">
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
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
