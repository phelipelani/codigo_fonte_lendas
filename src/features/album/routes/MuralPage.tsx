// Arquivo: src/features/album/routes/MuralPage.tsx
//
// Mural de Trocas do Album de Figurinhas.
//   - Lista publica de figurinhas repetidas disponiveis para troca
//   - Usuario disponibiliza uma repetida sua
//   - Ao clicar numa oferta, escolhe uma repetida que o dono nao tem
//   - Troca automatica (sem aprovacao) + notificacao in-app

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight,
  Loader2,
  Plus,
  X,
  ChevronLeft,
  CheckCircle2,
  Repeat,
  PartyPopper,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Figurinha } from '../components/Figurinha';
import {
  useMural,
  useMeuAlbum,
  useDisponibilizarTroca,
  useRetirarTroca,
  useOpcoesTroca,
  useExecutarTroca,
  useNovidadesTrocas,
  useMarcarTrocasVistas,
  type TrocaMural,
  type OpcaoTroca,
  type NovidadeTroca,
  type Figurinha as FigurinhaType,
} from '../api/albumApi';

// Adapta um objeto qualquer (TrocaMural / OpcaoTroca) para o shape que o
// componente Figurinha espera renderizar.
const comoFigurinha = (x: Partial<FigurinhaType>): FigurinhaType =>
  ({
    descricao: null,
    pagina_id: null,
    slot: null,
    ...x,
  } as FigurinhaType);

export const MuralPage: React.FC = () => {
  const { data: muralData, isLoading } = useMural();
  const { data: novidadesData } = useNovidadesTrocas();
  const marcarVistasMut = useMarcarTrocasVistas();
  const [soNaoTenho, setSoNaoTenho] = React.useState(false);
  const [disponibilizarOpen, setDisponibilizarOpen] = React.useState(false);
  const [novidadesFechadas, setNovidadesFechadas] = React.useState(false);
  const [trocaSelecionada, setTrocaSelecionada] =
    React.useState<TrocaMural | null>(null);

  const novidades = novidadesData?.trocas ?? [];
  const mostrarNovidades = novidades.length > 0 && !novidadesFechadas;

  const fecharNovidades = () => {
    setNovidadesFechadas(true);
    marcarVistasMut.mutate();
  };

  const trocas = muralData?.trocas ?? [];
  const visiveis = React.useMemo(
    () => (soNaoTenho ? trocas.filter((t) => !t.ja_obtida) : trocas),
    [trocas, soNaoTenho]
  );

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-6xl mx-auto">
      {/* ===== Header ===== */}
      <header className="mb-4">
        <Link
          to="/album"
          className="mb-2 inline-flex items-center gap-1 text-xs text-cyan-100/50 hover:text-cyan-100"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar ao álbum
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <ArrowLeftRight className="h-7 w-7 text-amber-400" />
              <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text text-transparent">
                Mural de Trocas
              </span>
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-cyan-100/50">
              Troque suas figurinhas repetidas com a galera
            </p>
          </div>

          <Button
            onClick={() => setDisponibilizarOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#0a1628] font-bold"
          >
            <Plus className="mr-2 h-4 w-4" />
            Disponibilizar figurinha
          </Button>
        </div>
      </header>

      {/* ===== Filtro ===== */}
      <div className="mb-5 flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-cyan-100/70">
          <input
            type="checkbox"
            checked={soNaoTenho}
            onChange={(e) => setSoNaoTenho(e.target.checked)}
            className="h-4 w-4 accent-amber-500"
          />
          Mostrar só as que eu não tenho
        </label>
        <span className="text-xs text-cyan-100/40 tabular-nums">
          {visiveis.length} oferta(s)
        </span>
      </div>

      {/* ===== Grid de ofertas ===== */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : visiveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cyan-500/20 p-12 text-center">
          <ArrowLeftRight className="mx-auto h-10 w-10 text-cyan-100/20" />
          <p className="mt-3 text-sm text-cyan-100/50">
            Nenhuma figurinha no mural ainda. Seja o primeiro a disponibilizar!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visiveis.map((t) => (
            <OfertaCard key={t.id} troca={t} onTrocar={setTrocaSelecionada} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {mostrarNovidades && (
          <NovidadesModal novidades={novidades} onClose={fecharNovidades} />
        )}
        {disponibilizarOpen && (
          <DisponibilizarModal onClose={() => setDisponibilizarOpen(false)} />
        )}
        {trocaSelecionada && (
          <TrocaModal
            troca={trocaSelecionada}
            onClose={() => setTrocaSelecionada(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================
// Card de uma oferta no mural
// =============================================================
const OfertaCard: React.FC<{
  troca: TrocaMural;
  onTrocar: (t: TrocaMural) => void;
}> = ({ troca, onTrocar }) => {
  const retirarMut = useRetirarTroca();

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/60 p-2.5">
      <div className="relative">
        <Figurinha
          figurinha={comoFigurinha(troca)}
          forcarObtida
          tamanho="fluid"
        />
        {troca.ja_obtida && (
          <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-black text-white">
            <CheckCircle2 className="h-3 w-3" />
            JÁ TENHO
          </span>
        )}
      </div>

      <p className="mt-2 truncate text-[11px] text-cyan-100/60">
        por <strong className="text-cyan-100">{troca.ofertante_nome}</strong>
      </p>

      {troca.minha ? (
        <button
          type="button"
          onClick={() => retirarMut.mutate(troca.id)}
          disabled={retirarMut.isPending}
          className="mt-1.5 w-full rounded-lg border border-red-500/30 bg-red-500/10 py-1.5 text-[11px] font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-40"
        >
          {retirarMut.isPending ? 'Retirando...' : 'Retirar oferta'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onTrocar(troca)}
          className="mt-1.5 w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-1.5 text-[11px] font-black text-[#0a1628] hover:from-amber-400 hover:to-amber-500"
        >
          Trocar
        </button>
      )}
    </div>
  );
};

// =============================================================
// Modal: disponibilizar uma figurinha repetida
// =============================================================
const DisponibilizarModal: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const { data: album, isLoading } = useMeuAlbum();
  const disponibilizarMut = useDisponibilizarTroca();

  const repetidas = React.useMemo(
    () => (album?.figurinhas ?? []).filter((f) => (f.quantidade ?? 0) >= 2),
    [album?.figurinhas]
  );

  const disponibilizar = (figId: number) => {
    if (disponibilizarMut.isPending) return;
    disponibilizarMut.mutate(figId, { onSuccess: onClose });
  };

  return (
    <ModalShell titulo="Disponibilizar figurinha" onClose={onClose}>
      <p className="mb-3 text-xs text-cyan-100/50">
        Escolha uma repetida sua para colocar no mural. Você sempre mantém uma
        cópia para o seu álbum.
      </p>
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : repetidas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-cyan-500/20 p-8 text-center text-sm text-cyan-100/50">
          Você ainda não tem figurinhas repetidas.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {repetidas.map((f) => (
            <div
              key={f.id}
              onClick={() => disponibilizar(f.id)}
              className={cn(
                'group cursor-pointer rounded-xl border border-cyan-500/20 bg-[#0a1628]/60 p-2 transition-all hover:border-amber-400/50',
                disponibilizarMut.isPending && 'pointer-events-none opacity-50'
              )}
            >
              <Figurinha
                figurinha={f}
                forcarObtida
                tamanho="fluid"
                onClick={() => disponibilizar(f.id)}
              />
              <span className="mt-1 block text-[10px] font-bold text-emerald-300">
                x{f.quantidade} — tem {(f.quantidade ?? 0) - 1} sobrando
              </span>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
};

// =============================================================
// Modal: executar troca (escolher o que oferecer)
// =============================================================
const TrocaModal: React.FC<{ troca: TrocaMural; onClose: () => void }> = ({
  troca,
  onClose,
}) => {
  const { data, isLoading, error } = useOpcoesTroca(troca.id);
  const executarMut = useExecutarTroca();
  const [escolhida, setEscolhida] = React.useState<number | null>(null);

  const opcoes: OpcaoTroca[] = data?.opcoes ?? [];

  const confirmar = () => {
    if (escolhida == null) return;
    executarMut.mutate(
      { trocaId: troca.id, figurinha_oferecida_id: escolhida },
      { onSuccess: onClose }
    );
  };

  return (
    <ModalShell titulo="Fazer uma troca" onClose={onClose}>
      {/* O que voce recebe */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/5 p-3">
        <div className="w-20 shrink-0">
          <Figurinha figurinha={comoFigurinha(troca)} forcarObtida tamanho="fluid" />
        </div>
        <div className="text-sm">
          <p className="text-cyan-100/50 text-xs">Você recebe</p>
          <p className="font-black text-white">{troca.nome}</p>
          {troca.time && (
            <p className="text-xs text-cyan-100/50">{troca.time}</p>
          )}
          <p className="mt-0.5 text-[11px] text-cyan-100/40">
            de {troca.ofertante_nome}
          </p>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-cyan-100">
        <Repeat className="h-4 w-4 text-amber-400" />
        Escolha o que oferecer em troca
      </div>
      <p className="mb-3 text-xs text-cyan-100/50">
        Só aparecem suas repetidas que {troca.ofertante_nome} ainda não tem.
      </p>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-200">
          Essa oferta não está mais disponível.
        </div>
      ) : opcoes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-cyan-500/20 p-8 text-center text-sm text-cyan-100/50">
          Você não tem nenhuma repetida que {troca.ofertante_nome} precise.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {opcoes.map((o) => (
              <div
                key={o.id}
                onClick={() => setEscolhida(o.id)}
                className={cn(
                  'cursor-pointer rounded-xl border-2 p-2 transition-all',
                  escolhida === o.id
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-cyan-500/20 bg-[#0a1628]/60 hover:border-cyan-400/40'
                )}
              >
                <Figurinha
                  figurinha={comoFigurinha(o)}
                  forcarObtida
                  tamanho="fluid"
                  onClick={() => setEscolhida(o.id)}
                />
                <span className="mt-1 block text-[10px] font-bold text-emerald-300">
                  x{o.quantidade}
                </span>
              </div>
            ))}
          </div>

          <Button
            onClick={confirmar}
            disabled={escolhida == null || executarMut.isPending}
            className="mt-4 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#0a1628] font-black"
          >
            {executarMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowLeftRight className="mr-2 h-4 w-4" />
            )}
            Confirmar troca
          </Button>
        </>
      )}
    </ModalShell>
  );
};

// =============================================================
// Modal: novidades — avisa o dono que sua figurinha foi trocada
// =============================================================
const NovidadesModal: React.FC<{
  novidades: NovidadeTroca[];
  onClose: () => void;
}> = ({ novidades, onClose }) => (
  <ModalShell titulo="Suas figurinhas foram trocadas!" onClose={onClose}>
    <div className="mb-3 flex items-center gap-2 text-sm text-cyan-100/70">
      <PartyPopper className="h-5 w-5 shrink-0 text-amber-400" />
      {novidades.length === 1
        ? 'Aconteceu 1 troca com a sua figurinha do mural.'
        : `Aconteceram ${novidades.length} trocas com suas figurinhas do mural.`}
    </div>
    <div className="space-y-3">
      {novidades.map((n) => (
        <div
          key={n.id}
          className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/60 p-3"
        >
          <p className="mb-2 text-xs text-cyan-100/60">
            <strong className="text-cyan-100">{n.recebedor_nome}</strong> trocou
            com você
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-20 text-center">
              <Figurinha
                figurinha={comoFigurinha({
                  numero: n.cedida_numero,
                  nome: n.cedida_nome,
                  raridade: n.cedida_raridade,
                  imagem_url: n.cedida_imagem,
                })}
                forcarObtida
                tamanho="fluid"
              />
              <span className="mt-1 block text-[10px] font-bold text-red-300">
                você cedeu
              </span>
            </div>
            <ArrowLeftRight className="h-5 w-5 shrink-0 text-amber-400" />
            <div className="w-20 text-center">
              {n.recebida_numero != null ? (
                <Figurinha
                  figurinha={comoFigurinha({
                    numero: n.recebida_numero,
                    nome: n.recebida_nome ?? '',
                    raridade: n.recebida_raridade ?? 'comum',
                    imagem_url: n.recebida_imagem,
                  })}
                  forcarObtida
                  tamanho="fluid"
                />
              ) : (
                <div className="aspect-[114/155] w-full rounded-lg border border-white/10" />
              )}
              <span className="mt-1 block text-[10px] font-bold text-emerald-300">
                você recebeu
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
    <Button
      onClick={onClose}
      className="mt-4 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#0a1628] font-black"
    >
      Entendi
    </Button>
  </ModalShell>
);

// =============================================================
// Shell de modal reutilizavel
// =============================================================
const ModalShell: React.FC<{
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ titulo, onClose, children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-cyan-400/30 bg-[#0d1f35] p-5 shadow-2xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-black text-white">{titulo}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-cyan-100/50 hover:bg-white/5 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);
