import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Trophy, Star, Shield, Swords, Target, ArrowLeft, Crown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CampeaoData {
  campeonato: { id: number; nome: string };
  time_campeao: { id: number; nome: string; logo_url: string | null };
  stats: {
    total_partidas: number;
    vitorias: number;
    empates: number;
    derrotas: number;
    gols_pro: number;
    gols_contra: number;
  };
  elenco: Jogador[];
  mvp: Jogador & { total_gols: number; total_assists: number; pontos: number } | null;
  goleiro_campeao: Jogador & { jogos_defendidos: number } | null;
}

interface Jogador {
  id: number;
  nome: string;
  foto_url: string | null;
  posicao: string;
  joga_recuado: boolean;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
const fetchCampeao = async (campId: string): Promise<CampeaoData> => {
  const token = localStorage.getItem("token");
  const res = await fetch(`/api/campeonatos/${campId}/campeao`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Falha ao carregar campeão");
  return res.json();
};

// ─── Confetti ─────────────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotation: number;
  shape: "rect" | "circle" | "diamond";
}

const CONFETTI_COLORS = [
  "#FFD700", "#FFA500", "#00D4FF", "#0099CC",
  "#FFFFFF", "#C0A030", "#FFE066", "#80EEFF",
];

function useConfetti(active: boolean) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) return;
    const ps: Particle[] = Array.from({ length: 120 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 4,
      size: 6 + Math.random() * 10,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 720 - 360,
      shape: (["rect", "circle", "diamond"] as const)[Math.floor(Math.random() * 3)],
    }));
    setParticles(ps);
    const t = setTimeout(() => setParticles([]), 9000);
    return () => clearTimeout(t);
  }, [active]);

  return particles;
}

function ConfettiParticle({ p }: { p: Particle }) {
  const shapeStyle =
    p.shape === "circle"
      ? { borderRadius: "50%" }
      : p.shape === "diamond"
      ? { transform: `rotate(45deg)` }
      : {};

  return (
    <motion.div
      key={p.id}
      style={{
        position: "fixed",
        left: `${p.x}vw`,
        top: -20,
        width: p.size,
        height: p.size,
        backgroundColor: p.color,
        zIndex: 9999,
        pointerEvents: "none",
        ...shapeStyle,
      }}
      initial={{ y: -20, opacity: 1, rotate: 0, x: 0 }}
      animate={{
        y: "110vh",
        opacity: [1, 1, 0],
        rotate: p.rotation,
        x: [0, (Math.random() - 0.5) * 200],
      }}
      transition={{
        duration: p.duration,
        delay: p.delay,
        ease: "easeIn",
      }}
    />
  );
}

// ─── Trophy SVG animado ───────────────────────────────────────────────────────
function AnimatedTrophy() {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ scale: 0, rotate: -15 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
    >
      {/* Glow externo */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 220,
          height: 220,
          background: "radial-gradient(circle, rgba(255,215,0,0.35) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Anel dourado */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{
          width: 180,
          height: 180,
          borderColor: "rgba(255,215,0,0.4)",
          boxShadow: "0 0 30px rgba(255,215,0,0.3)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      {/* Ícone troféu */}
      <motion.div
        className="relative z-10 flex items-center justify-center"
        style={{
          width: 130,
          height: 130,
          background: "linear-gradient(135deg, #1a0e00 0%, #2a1800 50%, #1a0e00 100%)",
          borderRadius: "50%",
          border: "2px solid rgba(255,215,0,0.6)",
          boxShadow: "0 0 40px rgba(255,170,0,0.5), inset 0 0 20px rgba(255,215,0,0.1)",
        }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Trophy size={60} style={{ color: "#FFD700", filter: "drop-shadow(0 0 12px #FFD700)" }} />
      </motion.div>

      {/* Estrelas orbitando */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ width: 8, height: 8 }}
          animate={{ rotate: [angle, angle + 360] }}
          transition={{ duration: 8 + i * 0.5, repeat: Infinity, ease: "linear" }}
        >
          <div
            style={{
              position: "absolute",
              top: -110,
              left: -4,
              width: 8,
              height: 8,
              background: "#FFD700",
              borderRadius: "50%",
              boxShadow: "0 0 6px #FFD700",
              opacity: 0.7 + i * 0.05,
            }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Player Card ──────────────────────────────────────────────────────────────
function PlayerCard({ jogador, index, isMvp = false }: { jogador: Jogador; index: number; isMvp?: boolean }) {
  const posicaoLabel = jogador.joga_recuado
    ? "Recuado"
    : jogador.posicao === "goleiro"
    ? "Goleiro"
    : jogador.posicao === "zagueiro"
    ? "Zagueiro"
    : jogador.posicao || "Jogador";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.4 + index * 0.07, duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.03 }}
      className="relative flex flex-col items-center gap-2 cursor-default"
    >
      {/* MVP crown */}
      {isMvp && (
        <motion.div
          className="absolute -top-4 z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 2, type: "spring", stiffness: 300 }}
        >
          <Crown size={20} style={{ color: "#FFD700", filter: "drop-shadow(0 0 6px #FFD700)" }} />
        </motion.div>
      )}

      {/* Foto */}
      <div
        className="relative"
        style={{
          width: isMvp ? 72 : 56,
          height: isMvp ? 72 : 56,
          borderRadius: "50%",
          padding: 2,
          background: isMvp
            ? "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)"
            : "linear-gradient(135deg, #0a3a5c, #00D4FF44)",
          boxShadow: isMvp
            ? "0 0 20px rgba(255,215,0,0.6)"
            : "0 0 10px rgba(0,212,255,0.2)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
            background: "#0d1b2a",
          }}
        >
          {jogador.foto_url ? (
            <img
              src={jogador.foto_url}
              alt={jogador.nome}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-lg font-bold"
              style={{ color: isMvp ? "#FFD700" : "#00D4FF", fontFamily: "monospace" }}
            >
              {jogador.nome.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Nome */}
      <span
        className="text-center font-semibold leading-tight"
        style={{
          fontSize: isMvp ? 12 : 10,
          color: isMvp ? "#FFD700" : "#CBD5E1",
          maxWidth: 70,
          textAlign: "center",
          textShadow: isMvp ? "0 0 8px rgba(255,215,0,0.5)" : "none",
        }}
      >
        {jogador.nome.split(" ")[0]}
      </span>

      {/* Posição */}
      <span
        className="text-center leading-none"
        style={{
          fontSize: 9,
          color: isMvp ? "#FFA500" : "#64748B",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {posicaoLabel}
      </span>
    </motion.div>
  );
}

// ─── Stat Badge ───────────────────────────────────────────────────────────────
function StatBadge({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(8px)",
        minWidth: 80,
      }}
    >
      <Icon size={18} style={{ color }} />
      <span className="font-bold text-xl" style={{ color, fontFamily: "'Rajdhani', monospace" }}>
        {value}
      </span>
      <span className="text-xs uppercase tracking-widest" style={{ color: "#64748B" }}>
        {label}
      </span>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CampeonatoCampeaoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const particles = useConfetti(showConfetti);

  const { data, isLoading, error } = useQuery<CampeaoData>({
    queryKey: ["campeao", id],
    queryFn: () => fetchCampeao(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => setShowConfetti(true), 400);
      return () => clearTimeout(t);
    }
  }, [data]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#060d14" }}
      >
        <motion.div
          className="flex flex-col items-center gap-4"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Trophy size={48} style={{ color: "#FFD700" }} />
          <span style={{ color: "#64748B", letterSpacing: 4, fontSize: 12, textTransform: "uppercase" }}>
            Carregando campeão...
          </span>
        </motion.div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#060d14" }}
      >
        <div className="text-center">
          <p style={{ color: "#EF4444" }}>Erro ao carregar dados do campeão.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 rounded"
            style={{ background: "#0a3a5c", color: "#00D4FF" }}
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const { campeonato, time_campeao, stats, elenco, mvp, goleiro_campeao } = data;
  const saldo = (Number(stats.gols_pro) || 0) - (Number(stats.gols_contra) || 0);
  const vitorias = Number(stats.vitorias) || 0;
  const empates = Number(stats.empates) || 0;
  const totalPartidas = Number(stats.total_partidas) || 0;
  const aproveitamento =
    totalPartidas > 0
      ? Math.round(((vitorias * 3 + empates) / (totalPartidas * 3)) * 100)
      : 0;

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #060d14 0%, #0a1628 40%, #060d14 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Confetti ── */}
      {particles.map((p) => (
        <ConfettiParticle key={p.id} p={p} />
      ))}

      {/* ── Background decorativo ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Luz central dourada */}
        <motion.div
          className="absolute"
          style={{
            top: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 400,
            background:
              "radial-gradient(ellipse at center, rgba(255,180,0,0.08) 0%, transparent 70%)",
          }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        {/* Grade hexagonal sutil */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "repeating-linear-gradient(60deg, rgba(0,212,255,0.3) 0px, transparent 1px, transparent 40px, rgba(0,212,255,0.3) 41px), repeating-linear-gradient(-60deg, rgba(0,212,255,0.3) 0px, transparent 1px, transparent 40px, rgba(0,212,255,0.3) 41px)",
          }}
        />
        {/* Raios de luz vindos do centro */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: "22%",
              left: "50%",
              width: 2,
              height: 300,
              transformOrigin: "top center",
              transform: `translateX(-50%) rotate(${angle}deg)`,
              background:
                "linear-gradient(to bottom, rgba(255,215,0,0.15), transparent)",
            }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{
              duration: 3,
              delay: i * 0.3,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />
        ))}
      </div>

      {/* ── Conteúdo principal ── */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 pb-20">
        {/* Botão voltar */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate(`/campeonatos/${id}`)}
          className="flex items-center gap-2 mt-6 mb-2 px-3 py-2 rounded-lg transition-colors"
          style={{
            color: "#64748B",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
          }}
          whileHover={{ color: "#00D4FF", x: -2 }}
        >
          <ArrowLeft size={16} />
          Voltar ao campeonato
        </motion.button>

        {/* ── Header: título do campeonato ── */}
        <motion.div
          className="text-center mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: "#00D4FF", letterSpacing: 6 }}
          >
            {campeonato.nome}
          </span>
        </motion.div>

        {/* ── Título CAMPEÃO ── */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
        >
          <h1
            className="font-black uppercase"
            style={{
              fontSize: "clamp(2.5rem, 8vw, 5rem)",
              letterSpacing: "0.15em",
              background: "linear-gradient(135deg, #C8960C 0%, #FFD700 40%, #FFA500 60%, #C8960C 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 30px rgba(255,200,0,0.5))",
              lineHeight: 1,
            }}
          >
            CAMPEÃO
          </h1>
        </motion.div>

        {/* ── Troféu ── */}
        <div className="flex justify-center mb-8">
          <AnimatedTrophy />
        </div>

        {/* ── Time campeão ── */}
        <motion.div
          className="flex flex-col items-center gap-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {/* Logo do time */}
          {time_campeao.logo_url ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
              className="relative"
            >
              <div
                className="rounded-full overflow-hidden"
                style={{
                  width: 100,
                  height: 100,
                  border: "3px solid rgba(255,215,0,0.6)",
                  boxShadow: "0 0 30px rgba(255,215,0,0.4)",
                }}
              >
                <img
                  src={time_campeao.logo_url}
                  alt={time_campeao.nome}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
              className="flex items-center justify-center rounded-full font-black text-3xl"
              style={{
                width: 100,
                height: 100,
                background: "linear-gradient(135deg, #0a2a40, #0a3a5c)",
                border: "3px solid rgba(255,215,0,0.6)",
                boxShadow: "0 0 30px rgba(255,215,0,0.4)",
                color: "#FFD700",
              }}
            >
              {time_campeao.nome.charAt(0)}
            </motion.div>
          )}

          <motion.h2
            className="font-black uppercase text-center"
            style={{
              fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
              letterSpacing: "0.08em",
              color: "#FFFFFF",
              textShadow: "0 0 30px rgba(255,215,0,0.3)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
          >
            {time_campeao.nome}
          </motion.h2>

          {/* Linha decorativa */}
          <motion.div
            style={{
              height: 2,
              background: "linear-gradient(90deg, transparent, #FFD700, #FFA500, transparent)",
              borderRadius: 2,
            }}
            initial={{ width: 0 }}
            animate={{ width: "240px" }}
            transition={{ delay: 1.1, duration: 0.6 }}
          />
        </motion.div>

        {/* ── Stats da campanha ── */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          <motion.p
            className="text-center text-xs uppercase tracking-widest mb-5"
            style={{ color: "#00D4FF", letterSpacing: 5 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05 }}
          >
            Campanha
          </motion.p>

          <div className="flex flex-wrap justify-center gap-3">
            <StatBadge
              icon={Shield}
              label="Vitórias"
              value={stats.vitorias || 0}
              color="#22C55E"
              delay={1.1}
            />
            <StatBadge
              icon={Swords}
              label="Gols Pró"
              value={stats.gols_pro || 0}
              color="#FFD700"
              delay={1.15}
            />
            <StatBadge
              icon={Target}
              label="Saldo"
              value={saldo >= 0 ? `+${saldo}` : saldo}
              color={saldo >= 0 ? "#00D4FF" : "#EF4444"}
              delay={1.2}
            />
            <StatBadge
              icon={Star}
              label="Aproveit."
              value={`${aproveitamento}%`}
              color="#FFA500"
              delay={1.25}
            />
          </div>

          {/* Linha V/E/D */}
          <motion.div
            className="flex justify-center gap-2 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
          >
            {[
              { label: `${vitorias}V`, color: "#22C55E" },
              { label: `${empates}E`, color: "#EAB308" },
              { label: `${Number(stats.derrotas) || 0}D`, color: "#EF4444" },
            ].map((item) => (
              <span
                key={item.label}
                className="px-3 py-1 rounded-full text-sm font-bold"
                style={{
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}40`,
                  color: item.color,
                }}
              >
                {item.label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── MVP ── */}
        {mvp && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
          >
            <motion.p
              className="text-center text-xs uppercase tracking-widest mb-5"
              style={{ color: "#FFD700", letterSpacing: 5 }}
            >
              ★ MVP do Campeonato
            </motion.p>

            <motion.div
              className="relative mx-auto flex items-center gap-4 rounded-2xl p-5"
              style={{
                maxWidth: 360,
                background: "linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(255,140,0,0.05) 100%)",
                border: "1px solid rgba(255,215,0,0.3)",
                boxShadow: "0 0 40px rgba(255,215,0,0.15)",
                backdropFilter: "blur(12px)",
              }}
              whileHover={{ scale: 1.02 }}
            >
              {/* Brilho no canto */}
              <div
                className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at top right, rgba(255,215,0,0.2), transparent 70%)",
                  borderRadius: "0 16px 0 0",
                }}
              />

              {/* Foto MVP */}
              <div
                className="relative flex-shrink-0"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  padding: 3,
                  background: "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)",
                  boxShadow: "0 0 20px rgba(255,215,0,0.5)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#0d1b2a",
                  }}
                >
                  {mvp.foto_url ? (
                    <img
                      src={mvp.foto_url}
                      alt={mvp.nome}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-2xl font-black"
                      style={{ color: "#FFD700" }}
                    >
                      {mvp.nome.charAt(0)}
                    </div>
                  )}
                </div>
                {/* Crown */}
                <div
                  className="absolute -top-3 left-1/2"
                  style={{ transform: "translateX(-50%)" }}
                >
                  <Crown
                    size={18}
                    style={{ color: "#FFD700", filter: "drop-shadow(0 0 6px #FFD700)" }}
                  />
                </div>
              </div>

              {/* Info MVP */}
              <div className="flex flex-col gap-1">
                <span
                  className="font-black text-lg"
                  style={{
                    color: "#FFD700",
                    textShadow: "0 0 10px rgba(255,215,0,0.4)",
                    fontFamily: "'Rajdhani', sans-serif",
                    letterSpacing: 1,
                  }}
                >
                  {mvp.nome}
                </span>
                <span
                  className="text-xs uppercase"
                  style={{ color: "#FFA500", letterSpacing: 2 }}
                >
                  {mvp.posicao}
                </span>
                <div className="flex gap-3 mt-1">
                  <span className="text-sm" style={{ color: "#94A3B8" }}>
                    <span style={{ color: "#FFD700", fontWeight: 700 }}>{mvp.total_gols}</span> gols
                  </span>
                  <span className="text-sm" style={{ color: "#94A3B8" }}>
                    <span style={{ color: "#00D4FF", fontWeight: 700 }}>{mvp.total_assists}</span> assists
                  </span>
                  <span className="text-sm" style={{ color: "#94A3B8" }}>
                    <span style={{ color: "#FFA500", fontWeight: 700 }}>{mvp.pontos}</span> pts
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Goleiro Campeão ── */}
        {goleiro_campeao && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
          >
            <motion.p
              className="text-center text-xs uppercase tracking-widest mb-5"
              style={{ color: "#00D4FF", letterSpacing: 5 }}
            >
              🧤 Goleiro do Título
            </motion.p>

            <motion.div
              className="relative mx-auto flex items-center gap-4 rounded-2xl p-5"
              style={{
                maxWidth: 360,
                background: "linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(0,100,180,0.05) 100%)",
                border: "1px solid rgba(0,212,255,0.3)",
                boxShadow: "0 0 30px rgba(0,212,255,0.1)",
                backdropFilter: "blur(12px)",
              }}
              whileHover={{ scale: 1.02 }}
            >
              <div
                className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
                style={{
                  background: "radial-gradient(circle at top right, rgba(0,212,255,0.15), transparent 70%)",
                  borderRadius: "0 16px 0 0",
                }}
              />

              {/* Foto */}
              <div
                className="relative flex-shrink-0"
                style={{
                  width: 72, height: 72, borderRadius: "50%", padding: 3,
                  background: "linear-gradient(135deg, #00D4FF, #0066CC, #00D4FF)",
                  boxShadow: "0 0 20px rgba(0,212,255,0.4)",
                }}
              >
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#0d1b2a" }}>
                  {goleiro_campeao.foto_url ? (
                    <img src={goleiro_campeao.foto_url} alt={goleiro_campeao.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-black" style={{ color: "#00D4FF" }}>
                      {goleiro_campeao.nome.charAt(0)}
                    </div>
                  )}
                </div>
                {/* Luva emoji no canto */}
                <div className="absolute -top-2 -right-1 text-base">🧤</div>
              </div>

              {/* Info */}
              <div className="flex flex-col gap-1">
                <span className="font-black text-lg" style={{ color: "#00D4FF", textShadow: "0 0 10px rgba(0,212,255,0.4)", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1 }}>
                  {goleiro_campeao.nome}
                </span>
                <span className="text-xs uppercase" style={{ color: "#0099AA", letterSpacing: 2 }}>Goleiro</span>
                <div className="flex gap-3 mt-1">
                  <span className="text-sm" style={{ color: "#94A3B8" }}>
                    <span style={{ color: "#00D4FF", fontWeight: 700 }}>{goleiro_campeao.jogos_defendidos}</span> jogos defendidos
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Elenco Campeão ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.35 }}
        >
          <motion.p
            className="text-center text-xs uppercase tracking-widest mb-6"
            style={{ color: "#00D4FF", letterSpacing: 5 }}
          >
            Elenco Campeão
          </motion.p>

          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex flex-wrap justify-center gap-5">
              {elenco.map((jogador, i) => (
                <PlayerCard
                  key={jogador.id}
                  jogador={jogador}
                  index={i}
                  isMvp={mvp?.id === jogador.id}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Footer decoration ── */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <div
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full"
            style={{
              background: "rgba(255,215,0,0.06)",
              border: "1px solid rgba(255,215,0,0.2)",
            }}
          >
            <Trophy size={14} style={{ color: "#FFD700" }} />
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: "#64748B", letterSpacing: 4 }}
            >
              FutLendas
            </span>
            <Trophy size={14} style={{ color: "#FFD700" }} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}