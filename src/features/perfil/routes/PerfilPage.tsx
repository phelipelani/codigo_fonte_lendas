// Arquivo: src/features/perfil/routes/PerfilPage.tsx
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/api";
import { motion } from "framer-motion";
import { Crown, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  calcOverall, getRarity,
} from "../components/raritySystem";

import { RarityParticles, DiagBg } from "../components/perfilShared";
import EditProfileModal from "../components/EditProfileModal";
import PerfilDesktop from "../components/PerfilDesktop";
import PerfilMobile from "../components/PerfilMobile";

// ─── COMPONENTE PRINCIPAL (coordinator) ─────────────────────────────────────
export default function PerfilPage() {
  const { user } = useAuthStore();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editFoto, setEditFoto] = useState('');

  const { data: jogadorDoUsuario, isLoading: buscandoJogador } = useQuery({
    queryKey: ["jogador-do-usuario", user?.id, user?.username],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const res = await api.get("/jogadores");
        return res.data.find((j: any) =>
          j.nome?.toLowerCase() === user.username?.toLowerCase() ||
          j.nome?.toLowerCase().includes(user.username?.toLowerCase()) ||
          user.username?.toLowerCase().includes(j.nome?.toLowerCase()) ||
          j.usuario_id === user.id
        ) || null;
      } catch { return null; }
    },
    enabled: !!user?.id && !id,
    staleTime: 300000,
  });

  const jogadorIdFromUser = user?.jogador_id || (user as any)?.jogadorId || jogadorDoUsuario?.id;
  const targetId = id ? Number(id) : jogadorIdFromUser;
  const isAdminWithoutPlayer = !id && !jogadorIdFromUser && !buscandoJogador;

  const { data: perfil, isLoading, isError } = useQuery({
    queryKey: ["perfil", targetId],
    queryFn: async () => {
      if (!targetId) return null;
      const res = await api.get(`/jogadores/${targetId}/perfil-completo`);
      return res.data;
    },
    enabled: !!targetId,
    retry: false,
  });

  const avatarMutation = useMutation({
    mutationFn: async (data: string | File) => {
      if (!targetId) return;
      if (typeof data === "string") {
        await api.put(`/jogadores/${targetId}/avatar`, { avatar_url: data });
      } else {
        const formData = new FormData();
        formData.append("avatar", data);
        await api.put(`/jogadores/${targetId}/avatar`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfil", targetId] });
      setIsEditingAvatar(false);
      toast.success("Avatar atualizado!");
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  // Só pode editar o próprio perfil
  const isOwner = !id || Number(id) === jogadorIdFromUser;

  const profileMutation = useMutation({
    mutationFn: async ({ nome, foto_url }: { nome?: string; foto_url?: string }) => {
      if (!targetId) return;
      const payload: any = {};
      if (nome) payload.nome = nome;
      if (foto_url) payload.foto_url = foto_url;
      await api.put(`/jogadores/${targetId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfil', targetId] });
      setIsEditingAvatar(false);
      toast.success('Perfil atualizado!');
    },
    onError: () => toast.error('Erro ao salvar.'),
  });

  const handleOpenEdit = useCallback(() => {
    setEditNome(perfil?.nome || '');
    setEditFoto(perfil?.foto_url || '');
    setIsEditingAvatar(true);
  }, [perfil?.nome, perfil?.foto_url]);

  const handleCloseEdit = useCallback(() => {
    setIsEditingAvatar(false);
  }, []);

  const handleSaveProfile = useCallback(() => {
    const updates: any = {};
    if (editNome && editNome !== perfil?.nome) updates.nome = editNome;
    if (editFoto && editFoto !== perfil?.foto_url) updates.foto_url = editFoto;
    if (Object.keys(updates).length === 0) { setIsEditingAvatar(false); return; }
    profileMutation.mutate(updates);
  }, [editNome, editFoto, perfil?.nome, perfil?.foto_url, profileMutation]);

  const handleShare = useCallback(async () => {
    const rating = calcOverall(perfil?.stats).overall;
    const text = `${perfil?.nome} | Rating ${rating}\n${perfil?.stats?.totais?.jogos || 0} jogos | ${perfil?.stats?.totais?.gols || 0} gols\n\nFUTLENDAS`;
    if (navigator.share) {
      try { await navigator.share({ title: `${perfil?.nome} - FUTLENDAS`, text, url: window.location.href }); }
      catch { navigator.clipboard.writeText(`${text}\n${window.location.href}`); toast.success("Link copiado!"); }
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      toast.success("Link copiado!");
    }
  }, [perfil?.nome, perfil?.stats]);

  const handleEditAvatarMobile = useCallback(() => {
    setIsEditingAvatar(true);
  }, []);

  // ── Loading ──
  if (isLoading || buscandoJogador) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#010A13" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
          <Crown size={40} style={{ color: "#C89B3C" }} />
        </motion.div>
      </div>
    );
  }

  if (isAdminWithoutPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#010A13" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(200,155,60,0.1)", border: "1px solid rgba(200,155,60,0.2)" }}
          >
            <Crown size={36} style={{ color: "#C89B3C60" }} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">
            Olá, {user?.username}!
          </h2>
          <p className="text-sm mb-6" style={{ color: "#A0A0AB" }}>
            Sua conta de administrador não está vinculada a um jogador. Acesse o perfil de um jogador pela lista.
          </p>
          <a
            href="/jogadores"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all"
            style={{
              background: "rgba(200,155,60,0.15)",
              border: "1px solid rgba(200,155,60,0.3)",
              color: "#C89B3C",
            }}
          >
            <Users size={15} /> Ver Jogadores
          </a>
        </motion.div>
      </div>
    );
  }

  if (!perfil || isError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#010A13" }}>
        <div className="text-center">
          <X size={48} className="mx-auto mb-4" style={{ color: "#f8717140" }} />
          <p style={{ color: "#A0A0AB" }}>Perfil não encontrado</p>
        </div>
      </div>
    );
  }

  // ── Dados computados ──
  const { stats } = perfil;
  const totais = stats?.totais || { jogos: 0, gols: 0, assists: 0, clean_sheets: 0 };
  const desempenho = stats?.desempenho || { vitorias: 0, empates: 0, derrotas: 0 };
  const titulos = stats?.titulos || [];
  const premios = stats?.premios || [];
  const mvpsSemanais = stats?.mvpsSemanais || 0;
  const melhorDupla = stats?.melhorDupla;
  const aproveitamento = totais.jogos > 0
    ? Math.round(((desempenho.vitorias * 3 + desempenho.empates) / (totais.jogos * 3)) * 100)
    : 0;
  const qtdMvpGeral = premios.filter((p: any) => p.tipo_premio === "mvp").length;
  const rating = calcOverall(stats).overall;
  const rarity = getRarity(stats);
  const { pilares } = rarity;

  const mvpsPremios = premios.filter((p: any) => p.tipo_premio === "mvp");
  const artilheirosPremios = premios.filter((p: any) => p.tipo_premio === "artilheiro");
  const garconsPremios = premios.filter((p: any) => p.tipo_premio === "garcom");
  const peDeRato = premios.filter((p: any) => p.tipo_premio === "pe_de_rato");

  const acc = rarity.accentColor;
  const accRgb = rarity.accentRgb;

  const computed = {
    totais, desempenho, titulos, premios, mvpsSemanais, melhorDupla,
    aproveitamento, qtdMvpGeral, rating, rarity, pilares,
    mvpsPremios, artilheirosPremios, garconsPremios, peDeRato,
    acc, accRgb,
  };

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden" style={{ background: "#010A13" }}>
      {/* ── Fundo temático ── */}
      <RarityParticles accentRgb={accRgb} />
      <DiagBg accentRgb={accRgb} />

      {isEditingAvatar && (
        <EditProfileModal
          acc={acc}
          editNome={editNome}
          setEditNome={setEditNome}
          editFoto={editFoto}
          setEditFoto={setEditFoto}
          onClose={handleCloseEdit}
          onSave={handleSaveProfile}
          isPending={profileMutation.isPending}
        />
      )}

      <PerfilDesktop
        perfil={perfil}
        computed={computed}
        isOwner={isOwner}
        onEdit={handleOpenEdit}
        onShare={handleShare}
      />

      <PerfilMobile
        perfil={perfil}
        computed={computed}
        onEditAvatar={handleEditAvatarMobile}
        onShare={handleShare}
      />
    </div>
  );
}
