// Arquivo: src/features/album/components/AbrirPacoteModal.tsx
//
// Abertura de pacote do Album FutLendas.
//  - Pacote "Edicao Colecionador" com identidade visual da liga.
//  - Interacao: arrastar a tira lacrada para rasgar.
//  - Revelacao carta a carta: comuns rapidas; LENDARIAS com
//    feixe de luz, raios e brilho (estilo FIFA), de forma sobria.

import * as React from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion';
import { X, Loader2, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Figurinha } from './Figurinha';
import { useAbrirPacote, type Figurinha as FigurinhaType } from '../api/albumApi';
import logoLendas from '@/assets/Logo.webp';

type AbrirPacoteModalProps = {
  pacoteId: number | null;
  onClose: () => void;
};

type Fase = 'fechado' | 'abrindo' | 'revelando';

const LARGURA = 280;
const ALTURA = 408;
const TIRA_H = 52;
const MAX_DRAG = LARGURA - 30;
const LIMIAR = MAX_DRAG * 0.6;

const DUR_COMUM = 1700;
const DUR_RARA = 2400;
const DUR_LENDARIA = 3600;
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const AbrirPacoteModal: React.FC<AbrirPacoteModalProps> = ({
  pacoteId,
  onClose,
}) => {
  const abrirMut = useAbrirPacote();
  const [fase, setFase] = React.useState<Fase>('fechado');
  const [figurinhas, setFigurinhas] = React.useState<FigurinhaType[]>([]);
  const [rasgado, setRasgado] = React.useState(false);
  const [xTear, setXTear] = React.useState(0);
  const [idx, setIdx] = React.useState(0);
  const [prontoContinuar, setProntoContinuar] = React.useState(false);

  const x = useMotionValue(0);
  const progresso = useTransform(x, [0, MAX_DRAG], [0, 1]);
  const tiraY = useTransform(x, [0, MAX_DRAG], [0, -22]);
  const tiraRot = useTransform(x, [0, MAX_DRAG], [0, 12]);
  const dicaOpacidade = useTransform(x, [0, 60], [1, 0]);
  const luzAbertura = useTransform(progresso, [0.15, 1], [0, 1]);

  // Reseta ao abrir/fechar
  React.useEffect(() => {
    setFase('fechado');
    setFigurinhas([]);
    setRasgado(false);
    setXTear(0);
    setIdx(0);
    setProntoContinuar(false);
    x.set(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacoteId]);

  // Avanco automatico da revelacao
  React.useEffect(() => {
    if (fase !== 'revelando') return;
    if (idx >= figurinhas.length) {
      const t = window.setTimeout(() => setProntoContinuar(true), 500);
      return () => window.clearTimeout(t);
    }
    const rar = figurinhas[idx]?.raridade;
    const dur = rar === 'lendaria' ? DUR_LENDARIA : rar === 'rara' ? DUR_RARA : DUR_COMUM;
    const t = window.setTimeout(() => setIdx((i) => i + 1), dur);
    return () => window.clearTimeout(t);
  }, [fase, idx, figurinhas]);

  const rasgar = () => {
    if (pacoteId == null) return;
    setXTear(x.get());
    setRasgado(true);
    setFase('abrindo');
    abrirMut.mutate(pacoteId, {
      onSuccess: (data) => {
        setFigurinhas(data.figurinhas ?? []);
        window.setTimeout(() => {
          setIdx(0);
          setFase('revelando');
        }, 700);
      },
      onError: () => {
        setRasgado(false);
        setFase('fechado');
        animate(x, 0, { duration: 0.3 });
      },
    });
  };

  const handleDragEnd = () => {
    if (x.get() >= LIMIAR) rasgar();
    else animate(x, 0, { type: 'spring', stiffness: 320, damping: 32 });
  };

  const podeFechar = fase === 'fechado' || prontoContinuar;
  const cartaAtual = fase === 'revelando' ? figurinhas[idx] : undefined;
  const revelandoLendaria = cartaAtual?.raridade === 'lendaria';
  const acabou = fase === 'revelando' && idx >= figurinhas.length;

  // Renderizacao condicional direta: quando nao ha pacote, nada e montado.
  // (evita que o overlay fique "preso" no DOM apos fechar)
  if (pacoteId == null) return null;

  return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4"
        >
          {/* fundo — estadio a noite */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_42%,#1a2c49_0%,#0c1626_55%,#05080f_100%)]" />

          {/* flash de tela ao revelar lendaria */}
          <AnimatePresence>
            {revelandoLendaria && (
              <motion.div
                key={'flash-' + idx}
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.55, 0] }}
                transition={{ duration: 0.8, times: [0, 0.25, 1] }}
                className="pointer-events-none absolute inset-0 z-40 bg-amber-100"
              />
            )}
          </AnimatePresence>

          {podeFechar && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 z-50 text-white/50 transition-colors hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-7 w-7" />
            </button>
          )}

          <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
            {/* ============ FECHADO / ABRINDO ============ */}
            {(fase === 'fechado' || fase === 'abrindo') && (
              <div className="flex flex-col items-center">
                <div
                  className="relative"
                  style={{ width: LARGURA, height: ALTURA }}
                >
                  {/* halo atras do pacote */}
                  <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.18),transparent_70%)]" />

                  {/* ---------- CORPO DO PACOTE ---------- */}
                  <motion.div
                    animate={
                      fase === 'abrindo'
                        ? { y: 0, rotate: 0 }
                        : { y: [0, -7, 0], rotate: [-1, 1, -1] }
                    }
                    transition={{
                      duration: 4,
                      repeat: fase === 'abrindo' ? 0 : Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0"
                  >
                    <PacoteArte />

                    {/* luz vazando do topo conforme arrasta */}
                    <motion.div
                      aria-hidden
                      style={{ opacity: luzAbertura }}
                      className="absolute inset-x-3 top-0 h-32 rounded-b-[40px] bg-gradient-to-b from-white via-amber-200/70 to-transparent blur-xl"
                    />

                    {fase === 'abrindo' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55 }}
                        className="absolute inset-x-0 top-1/2 flex justify-center"
                      >
                        <Loader2 className="h-9 w-9 animate-spin text-amber-300" />
                      </motion.div>
                    )}
                  </motion.div>

                  {/* ---------- TIRA LACRADA (arrastavel) ---------- */}
                  {!rasgado && (
                    <motion.div
                      drag="x"
                      dragConstraints={{ left: 0, right: MAX_DRAG }}
                      dragElastic={0.04}
                      onDragEnd={handleDragEnd}
                      style={{
                        x,
                        y: tiraY,
                        rotate: tiraRot,
                        height: TIRA_H,
                        transformOrigin: 'left center',
                      }}
                      whileTap={{ cursor: 'grabbing' }}
                      className="absolute left-0 right-0 top-0 z-20 cursor-grab"
                    >
                      <TiraLacre />
                    </motion.div>
                  )}

                  {/* tira voando apos rasgar */}
                  {rasgado && (
                    <motion.div
                      initial={{ x: xTear, y: -22, rotate: 12, opacity: 1 }}
                      animate={{
                        x: xTear + 200,
                        y: -460,
                        rotate: 150,
                        opacity: 0,
                      }}
                      transition={{ duration: 0.65, ease: 'easeIn' }}
                      style={{ height: TIRA_H }}
                      className="absolute left-0 right-0 top-0 z-20"
                    >
                      <TiraLacre />
                    </motion.div>
                  )}

                  {/* faiscas do rasgo */}
                  {rasgado &&
                    Array.from({ length: 14 }).map((_, i) => {
                      const ang = (i / 14) * Math.PI * 2;
                      return (
                        <motion.span
                          key={i}
                          aria-hidden
                          initial={{ x: LARGURA / 2, y: TIRA_H, opacity: 1 }}
                          animate={{
                            x: LARGURA / 2 + Math.cos(ang) * 160,
                            y: TIRA_H + Math.sin(ang) * 160,
                            opacity: 0,
                          }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="absolute h-1.5 w-1.5 rounded-full bg-amber-300"
                        />
                      );
                    })}
                </div>

                {fase === 'fechado' && (
                  <motion.div
                    style={{ opacity: dicaOpacidade }}
                    className="mt-7 flex items-center gap-2 text-sm font-semibold text-amber-200/80"
                  >
                    <motion.span
                      animate={{ x: [0, 7, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      <ChevronsRight className="h-5 w-5" />
                    </motion.span>
                    Arraste a tira para rasgar o pacote
                  </motion.div>
                )}
              </div>
            )}

            {/* ============ REVELANDO ============ */}
            {fase === 'revelando' && (
              <div className="flex w-full flex-col items-center">
                {/* progresso */}
                <div className="mb-5 flex items-center gap-1.5">
                  {figurinhas.map((f, i) => (
                    <span
                      key={i}
                      className={
                        'h-1.5 rounded-full transition-all duration-300 ' +
                        (i < idx
                          ? f.raridade === 'lendaria'
                            ? 'w-7 bg-amber-400'
                            : f.raridade === 'rara'
                              ? 'w-7 bg-violet-400'
                              : 'w-7 bg-cyan-400'
                          : i === idx
                            ? 'w-7 bg-white'
                            : 'w-1.5 bg-white/20')
                      }
                    />
                  ))}
                </div>

                <div
                  className="flex items-center justify-center"
                  style={{ minHeight: 360 }}
                >
                  {cartaAtual && (
                    <RevelacaoCarta key={idx} fig={cartaAtual} />
                  )}

                  {acabou && (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: EASE_OUT }}
                      className="flex flex-col items-center"
                    >
                      <h3 className="mb-5 text-2xl font-black text-white">
                        Seu pacote
                      </h3>
                      <div className="flex flex-wrap justify-center gap-3">
                        {figurinhas.map((fig, i) => (
                          <motion.div
                            key={fig.id + '-' + i}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: i * 0.09,
                              duration: 0.4,
                              ease: EASE_OUT,
                            }}
                          >
                            <Figurinha figurinha={fig} forcarObtida tamanho="md" />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="h-16">
                  <AnimatePresence>
                    {prontoContinuar && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Button
                          onClick={onClose}
                          size="lg"
                          className="mt-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold"
                        >
                          Continuar
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </motion.div>
  );
};

// =============================================================
// Arte do pacote — "Edicao Colecionador" FutLendas
// =============================================================
const PacoteArte: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden rounded-[26px] border border-amber-400/60 bg-gradient-to-b from-[#13284a] via-[#0b1a30] to-[#060d18] shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9),0_0_50px_-12px_rgba(251,191,36,0.4)]">
    {/* spotlight superior */}
    <div className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(56,189,248,0.18),transparent_70%)]" />
    {/* gramado / linhas do campo no rodape */}
    <div
      aria-hidden
      className="absolute inset-x-0 bottom-0 h-28 opacity-[0.12]"
      style={{
        background:
          'repeating-linear-gradient(90deg,transparent 0 22px,rgba(255,255,255,0.6) 22px 24px)',
      }}
    />
    <div className="absolute -bottom-12 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full border-2 border-white/15" />

    {/* moldura dupla */}
    <div className="absolute inset-2 rounded-[20px] border border-amber-300/30" />
    <div className="absolute inset-[7px] rounded-[22px] border border-amber-300/10" />

    {/* cantos ornamentais */}
    {[
      'left-3 top-3 border-l-2 border-t-2',
      'right-3 top-3 border-r-2 border-t-2',
      'left-3 bottom-3 border-l-2 border-b-2',
      'right-3 bottom-3 border-r-2 border-b-2',
    ].map((c) => (
      <span
        key={c}
        className={`absolute h-5 w-5 rounded-[3px] border-amber-300/70 ${c}`}
      />
    ))}

    {/* brilho foil deslizante */}
    <motion.div
      aria-hidden
      animate={{ x: [-LARGURA, LARGURA * 1.5] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
      className="absolute inset-y-0 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent"
    />

    {/* conteudo */}
    <div className="absolute inset-0 flex flex-col items-center px-6 pt-16 pb-7 text-center">
      <span className="text-[8px] font-bold uppercase tracking-[0.42em] text-amber-200/70">
        Edição Colecionador
      </span>

      <motion.img
        src={logoLendas}
        alt="FutLendas"
        animate={{
          filter: [
            'drop-shadow(0 0 8px rgba(251,191,36,0.45))',
            'drop-shadow(0 0 22px rgba(251,191,36,0.8))',
            'drop-shadow(0 0 8px rgba(251,191,36,0.45))',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="mt-4 h-28 w-28 object-contain"
      />

      <h3 className="mt-3 font-black italic leading-[0.8] tracking-tight">
        <span className="block text-[2.6rem] text-white drop-shadow">FUT</span>
        <span className="block text-[2.6rem] text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.5)]">
          LENDAS
        </span>
      </h3>

      {/* divisor com losango */}
      <div className="mt-3 flex items-center gap-2">
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-400/70" />
        <span className="h-1.5 w-1.5 rotate-45 bg-amber-400" />
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-amber-400/70" />
      </div>

      <div className="mt-auto flex flex-col items-center gap-1">
        <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.3em] text-amber-200">
          Pacote de Figurinhas
        </span>
        <span className="text-2xl font-black italic text-white">
          5<span className="ml-1 text-sm not-italic text-cyan-100/60">CARTAS</span>
        </span>
      </div>
    </div>
  </div>
);

// =============================================================
// Tira de lacre (parte arrastavel)
// =============================================================
const TiraLacre: React.FC = () => (
  <div className="relative flex h-full items-center justify-center rounded-t-[26px] border-x border-t border-amber-200 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-500 shadow-[inset_0_-6px_10px_-6px_rgba(0,0,0,0.5)]">
    <div className="flex items-center gap-2 rounded-md bg-[#0b1a30]/85 px-3 py-1">
      <ChevronsRight className="h-3.5 w-3.5 text-amber-300" />
      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-100">
        Puxe para abrir
      </span>
    </div>
    {/* perfuracao */}
    <div className="absolute inset-x-0 -bottom-[3px] flex justify-around px-1">
      {Array.from({ length: 16 }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#060d18]" />
      ))}
    </div>
  </div>
);

// =============================================================
// Revelacao de UMA carta
// =============================================================
const RevelacaoCarta: React.FC<{ fig: FigurinhaType }> = ({ fig }) => {
  const lendaria = fig.raridade === 'lendaria';
  const rara = fig.raridade === 'rara';

  return (
    <div className="relative flex flex-col items-center">
      {/* ===== efeitos de RARA — discreto: glow + faiscas roxas ===== */}
      {rara && (
        <>
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.75, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
            style={{ x: '-50%', y: '-50%' }}
            className="absolute top-1/2 left-1/2 h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.45),transparent_70%)]"
          />
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                aria-hidden
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: Math.cos(a) * 130,
                  y: Math.sin(a) * 130,
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full bg-violet-300"
              />
            );
          })}
        </>
      )}

      {/* ===== efeitos de lendaria ===== */}
      {lendaria && (
        <>
          {/* raios girando */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 0.7, scale: 1, rotate: 360 }}
            transition={{
              opacity: { duration: 0.8 },
              scale: { duration: 0.8, ease: EASE_OUT },
              rotate: { duration: 16, repeat: Infinity, ease: 'linear' },
            }}
            className="absolute top-1/2 left-1/2 h-[440px] w-[440px] rounded-full"
            style={{
              x: '-50%',
              y: '-50%',
              background:
                'repeating-conic-gradient(from 0deg, rgba(251,191,36,0) 0deg 14deg, rgba(251,191,36,0.22) 14deg 28deg)',
              WebkitMaskImage:
                'radial-gradient(circle, #000 16%, transparent 66%)',
              maskImage: 'radial-gradient(circle, #000 16%, transparent 66%)',
            }}
          />
          {/* feixe vertical */}
          <motion.div
            aria-hidden
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: [0, 0.7, 0.35] }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
            style={{ x: '-50%', y: '-50%' }}
            className="absolute top-1/2 left-1/2 h-[440px] w-[150px] bg-gradient-to-t from-transparent via-amber-200/45 to-transparent blur-2xl"
          />
          {/* glow radial */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.85, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
            style={{ x: '-50%', y: '-50%' }}
            className="absolute top-1/2 left-1/2 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.42),transparent_70%)]"
          />
          {/* faiscas sobrias */}
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                aria-hidden
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: Math.cos(a) * 190,
                  y: Math.sin(a) * 190,
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full bg-amber-200"
              />
            );
          })}
        </>
      )}

      {/* ===== a carta ===== */}
      <motion.div
        initial={{
          opacity: 0,
          scale: lendaria ? 0.55 : rara ? 0.7 : 0.86,
          y: lendaria ? 26 : rara ? 36 : 48,
        }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: lendaria ? 0.85 : rara ? 0.65 : 0.5,
          ease: EASE_OUT,
          delay: lendaria ? 0.35 : rara ? 0.18 : 0,
        }}
        className="relative z-10"
      >
        {lendaria && (
          <div className="absolute -inset-3 rounded-2xl bg-[radial-gradient(circle,rgba(251,191,36,0.55),transparent_72%)] blur-md" />
        )}
        {rara && (
          <div className="absolute -inset-2 rounded-2xl bg-[radial-gradient(circle,rgba(167,139,250,0.45),transparent_72%)] blur-md" />
        )}
        <div className="relative">
          <Figurinha figurinha={fig} forcarObtida tamanho="lg" />
        </div>
      </motion.div>

      {/* ===== selo ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          ease: EASE_OUT,
          delay: lendaria ? 0.8 : rara ? 0.5 : 0.25,
        }}
        className="relative z-10 mt-5 flex flex-col items-center"
      >
        {lendaria ? (
          <div className="relative overflow-hidden rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 px-7 py-1.5 text-base font-black uppercase tracking-[0.22em] text-[#0b1a30] shadow-[0_0_26px_-2px_rgba(251,191,36,0.85)]">
            ★ Lendária ★
            <motion.div
              aria-hidden
              animate={{ x: ['-140%', '280%'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-y-0 w-1/3 -skew-x-12 bg-white/55"
            />
          </div>
        ) : rara ? (
          <div className="relative overflow-hidden rounded-full bg-gradient-to-r from-violet-600 via-violet-400 to-violet-600 px-6 py-1.5 text-sm font-black uppercase tracking-[0.22em] text-white shadow-[0_0_18px_-2px_rgba(167,139,250,0.75)]">
            ◆ Rara ◆
            <motion.div
              aria-hidden
              animate={{ x: ['-140%', '280%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-y-0 w-1/3 -skew-x-12 bg-white/40"
            />
          </div>
        ) : (
          <span
            className={
              'rounded-full px-4 py-1 text-xs font-black uppercase tracking-[0.18em] ' +
              (fig.era_repetida
                ? 'bg-emerald-500 text-white'
                : 'bg-cyan-400 text-[#0b1a30]')
            }
          >
            {fig.era_repetida ? 'Repetida' : 'Nova'}
          </span>
        )}
        <p className="mt-2.5 text-lg font-black text-white">{fig.nome}</p>
        {fig.time && (
          <p className="-mt-0.5 text-xs font-medium text-cyan-100/50">
            {fig.time}
          </p>
        )}
      </motion.div>
    </div>
  );
};
