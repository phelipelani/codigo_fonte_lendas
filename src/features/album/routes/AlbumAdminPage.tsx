// Arquivo: src/features/album/routes/AlbumAdminPage.tsx
//
// Tela administrativa do Album. Duas abas:
//   1. Figurinhas  — cadastrar/listar figurinhas (com upload de imagem)
//   2. Distribuir  — dar pacotes aos usuarios

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon,
  Package,
  Plus,
  Loader2,
  Upload,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
  useFigurinhas,
  usePaginas,
  useCriarFigurinha,
  useUploadImagem,
  useUsuariosAlbum,
  useDistribuirPacotes,
  type CategoriaFigurinha,
  type Raridade,
  type DistribuicaoItem,
} from '../api/albumApi';
import { Figurinha } from '../components/Figurinha';

type TabId = 'figurinhas' | 'distribuir';

export const AlbumAdminPage: React.FC = () => {
  const [tab, setTab] = React.useState<TabId>('figurinhas');

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-black">
          <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
            Álbum — Administração
          </span>
        </h1>
        <p className="mt-0.5 text-sm text-cyan-100/50">
          Cadastre figurinhas e distribua pacotes aos jogadores
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 p-1 w-fit">
        {([
          { id: 'figurinhas', label: 'Figurinhas', icon: ImageIcon },
          { id: 'distribuir', label: 'Distribuir pacotes', icon: Package },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                tab === t.id
                  ? 'bg-gradient-to-r from-amber-500/30 to-amber-600/30 text-amber-100 border border-amber-400/30'
                  : 'text-cyan-100/50 hover:text-cyan-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'figurinhas' ? <FigurinhasTab /> : <DistribuirTab />}
    </div>
  );
};

// =============================================================
// ABA: Figurinhas
// =============================================================
const CATEGORIAS: CategoriaFigurinha[] = [
  'jogador',
  'etiqueta',
  'escudo',
  'estatistica',
  'foto',
];

const FigurinhasTab: React.FC = () => {
  const { data, isLoading } = useFigurinhas();
  const { data: paginasData } = usePaginas();
  const criarMut = useCriarFigurinha();
  const uploadMut = useUploadImagem();

  const [form, setForm] = React.useState({
    numero: '',
    nome: '',
    categoria: 'jogador' as CategoriaFigurinha,
    raridade: 'comum' as Raridade,
    pagina_id: '',
    slot: '',
  });
  const [imagemUrl, setImagemUrl] = React.useState<string | null>(null);

  const figurinhas = data?.figurinhas ?? [];
  const paginas = paginasData?.paginas ?? [];

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMut.mutate(file, { onSuccess: (url) => setImagemUrl(url) });
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero || !form.nome) return;
    criarMut.mutate(
      {
        numero: parseInt(form.numero, 10),
        nome: form.nome.trim(),
        categoria: form.categoria,
        raridade: form.raridade,
        imagem_url: imagemUrl,
        pagina_id: form.pagina_id ? parseInt(form.pagina_id, 10) : null,
        slot: form.slot ? parseInt(form.slot, 10) : null,
      },
      {
        onSuccess: () => {
          setForm({
            numero: '',
            nome: '',
            categoria: 'jogador',
            raridade: 'comum',
            pagina_id: form.pagina_id, // mantem pagina pra cadastro em lote
            slot: '',
          });
          setImagemUrl(null);
        },
      }
    );
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      {/* Form de cadastro */}
      <form
        onSubmit={submit}
        className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 p-4 space-y-3 h-fit"
      >
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-amber-400" />
          Nova figurinha
        </h3>

        {/* Upload */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70 mb-1">
            Imagem
          </label>
          <div className="flex items-center gap-3">
            <div className="h-20 w-16 rounded-lg border border-cyan-500/20 bg-black/30 overflow-hidden flex items-center justify-center flex-shrink-0">
              {imagemUrl ? (
                <img src={imagemUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-white/20" />
              )}
            </div>
            <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-cyan-500/30 px-3 py-2 text-center text-xs text-cyan-200/70 hover:bg-cyan-500/5">
              {uploadMut.isPending ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Upload className="mx-auto h-4 w-4 mb-1" />
                  Enviar imagem
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70 mb-1">
              Número
            </label>
            <Input
              type="number"
              value={form.numero}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70 mb-1">
              Slot (página)
            </label>
            <Input
              type="number"
              value={form.slot}
              onChange={(e) => setForm({ ...form, slot: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70 mb-1">
            Nome
          </label>
          <Input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70 mb-1">
              Categoria
            </label>
            <select
              value={form.categoria}
              onChange={(e) =>
                setForm({ ...form, categoria: e.target.value as CategoriaFigurinha })
              }
              className="w-full h-11 rounded-xl border-2 border-cyan-500/20 bg-[#0d1f35] px-3 text-sm text-white"
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70 mb-1">
              Raridade
            </label>
            <select
              value={form.raridade}
              onChange={(e) =>
                setForm({ ...form, raridade: e.target.value as Raridade })
              }
              className="w-full h-11 rounded-xl border-2 border-cyan-500/20 bg-[#0d1f35] px-3 text-sm text-white"
            >
              <option value="comum">Comum</option>
              <option value="lendaria">Lendária</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70 mb-1">
            Página do álbum
          </label>
          <select
            value={form.pagina_id}
            onChange={(e) => setForm({ ...form, pagina_id: e.target.value })}
            className="w-full h-11 rounded-xl border-2 border-cyan-500/20 bg-[#0d1f35] px-3 text-sm text-white"
          >
            <option value="">— sem página —</option>
            {paginas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.numero}. {p.titulo}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="submit"
          disabled={criarMut.isPending || !form.numero || !form.nome}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#0a1628] font-bold"
        >
          {criarMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Cadastrar
        </Button>
      </form>

      {/* Lista de figurinhas */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-widest text-cyan-100/50">
          {figurinhas.length} figurinhas cadastradas
        </p>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 justify-items-center">
            {figurinhas.map((f) => (
              <Figurinha key={f.id} figurinha={f} forcarObtida tamanho="md" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================
// ABA: Distribuir pacotes
// =============================================================
const DistribuirTab: React.FC = () => {
  const { data, isLoading } = useUsuariosAlbum();
  const distribuirMut = useDistribuirPacotes();

  const [busca, setBusca] = React.useState('');
  const [qtds, setQtds] = React.useState<Record<number, number>>({});
  const [motivo, setMotivo] = React.useState('');

  const usuarios = data?.usuarios ?? [];
  const filtrados = React.useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return usuarios;
    return usuarios.filter((u) => u.username.toLowerCase().includes(t));
  }, [usuarios, busca]);

  const totalPacotes = Object.values(qtds).reduce((s, n) => s + (n || 0), 0);

  const setQtd = (id: number, delta: number) => {
    setQtds((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) + delta),
    }));
  };

  const distribuir = () => {
    const distribuicao: DistribuicaoItem[] = Object.entries(qtds)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ usuario_id: Number(id), quantidade: q }));
    if (distribuicao.length === 0) return;
    distribuirMut.mutate(
      { distribuicao, motivo: motivo.trim() || 'Distribuição de pacotes' },
      { onSuccess: () => setQtds({}) }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-100/40" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar jogador..."
            className="pl-9"
          />
        </div>
        <Input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (ex: Racha 20/05 + bônus artilheiro)"
          className="sm:max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtrados.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-[#0a1628]/60 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white text-sm truncate">
                  {u.username}
                  {u.role === 'admin' && (
                    <span className="ml-1.5 text-[9px] text-amber-300/70 uppercase">
                      admin
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-cyan-100/40">
                  {u.whatsapp ?? 'sem WhatsApp'} • {u.pacotes_fechados} fechados
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQtd(u.id, -1)}
                  disabled={(qtds[u.id] ?? 0) === 0}
                  className="h-8 w-8 rounded-lg border border-cyan-500/30 bg-[#0d1f35] text-cyan-200 disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-8 text-center font-black text-white tabular-nums">
                  {qtds[u.id] ?? 0}
                </span>
                <button
                  type="button"
                  onClick={() => setQtd(u.id, 1)}
                  className="h-8 w-8 rounded-lg border border-cyan-500/30 bg-[#0d1f35] text-cyan-200"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barra fixa de envio */}
      <div className="sticky bottom-2 flex items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-[#0a1628]/95 backdrop-blur p-3">
        <span className="text-sm text-cyan-100/70">
          Total:{' '}
          <strong className="text-amber-300 tabular-nums">
            {totalPacotes} pacote(s)
          </strong>
        </span>
        <Button
          onClick={distribuir}
          disabled={totalPacotes === 0 || distribuirMut.isPending}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#0a1628] font-bold"
        >
          {distribuirMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Package className="mr-2 h-4 w-4" />
          )}
          Distribuir
        </Button>
      </div>
    </div>
  );
};
