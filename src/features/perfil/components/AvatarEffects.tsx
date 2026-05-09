import React, { useEffect, useRef } from 'react';

/**
 * Componente de efeitos visuais premium para o avatar
 * Inclui: glow animado, partículas, overlays de luz e efeitos de brilho
 */
export default function AvatarEffects() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Criar canvas para efeitos
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resizeCanvas();

    container.appendChild(canvas);

    let animationFrameId: number;
    let time = 0;

    // Array de partículas
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;
    }> = [];

    const createParticles = () => {
      // Criar partículas ao redor do avatar (centro)
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const count = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1 + 0.5;
        const distance = 150 + Math.random() * 100;

        particles.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 2 + 1,
          color: ['rgba(6, 182, 212, 0.6)', 'rgba(59, 130, 246, 0.6)', 'rgba(34, 197, 94, 0.4)'][
            Math.floor(Math.random() * 3)
          ],
        });
      }
    };

    const animate = () => {
      time += 0.016;

      // Limpar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ===== GLOW CENTRAL PULSANTE =====
      const glowRadius = 180 + Math.sin(time * 1.5) * 30;
      const glowGradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, glowRadius
      );

      glowGradient.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
      glowGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
      glowGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ===== ANÉIS DE ENERGIA =====
      const rings = [
        { radius: 120, speed: 0.5, opacity: 0.4 },
        { radius: 180, speed: -0.3, opacity: 0.25 },
        { radius: 240, speed: 0.7, opacity: 0.15 },
      ];

      rings.forEach((ring) => {
        const currentRadius = ring.radius + Math.sin(time * ring.speed) * 20;
        ctx.strokeStyle = `rgba(6, 182, 212, ${ring.opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
      });

      // ===== PARTÍCULAS FLUTUANTES =====
      // Criar novas partículas periodicamente
      if (Math.floor(time * 60) % 8 === 0) {
        createParticles();
      }

      // Atualizar e desenhar partículas
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Atualizar posição
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Desenhar partícula com fade
        ctx.fillStyle = p.color.replace('0.', `${p.life * 0.6}.`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }

      // ===== RAIOS DE LUZ DINÂMICOS =====
      const rayCount = 8;
      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2 + time * 0.3;
        const length = 200 + Math.sin(time * 0.8 + i) * 50;

        const startX = canvas.width / 2;
        const startY = canvas.height / 2;
        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;

        // Gradiente do raio
        const rayGradient = ctx.createLinearGradient(startX, startY, endX, endY);
        rayGradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
        rayGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.1)');
        rayGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

        ctx.strokeStyle = rayGradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }

      // ===== OVERLAY DE LUZ SUPERIOR =====
      const topLightGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.4);
      topLightGradient.addColorStop(0, 'rgba(251, 191, 36, 0.1)');
      topLightGradient.addColorStop(1, 'rgba(251, 191, 36, 0)');

      ctx.fillStyle = topLightGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.4);

      // ===== FLARES DE LUZ =====
      const flares = [
        { x: 0.3, y: 0.2, size: 40, opacity: 0.15 },
        { x: 0.7, y: 0.3, size: 50, opacity: 0.1 },
        { x: 0.5, y: 0.1, size: 60, opacity: 0.08 },
      ];

      flares.forEach((flare) => {
        const x = canvas.width * flare.x;
        const y = canvas.height * flare.y;
        const pulse = Math.sin(time * 0.5) * 0.5 + 0.5;

        ctx.fillStyle = `rgba(251, 191, 36, ${flare.opacity * pulse})`;
        ctx.beginPath();
        ctx.arc(x, y, flare.size, 0, Math.PI * 2);
        ctx.fill();

        // Anel do flare - CORRIGIDO: usar Math.abs para garantir raio positivo
        const ringRadius = flare.size + 20;
        ctx.strokeStyle = `rgba(251, 191, 36, ${flare.opacity * pulse * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, Math.abs(ringRadius), 0, Math.PI * 2);
        ctx.stroke();
      });

      // ===== ONDAS DE ENERGIA =====
      const waveCount = 3;
      for (let i = 0; i < waveCount; i++) {
        const waveTime = time - i * 0.3;
        const waveRadius = (waveTime % 2) * 200;
        const waveOpacity = Math.max(0, 1 - (waveTime % 2) / 2);

        // CORRIGIDO: garantir que waveRadius é sempre positivo
        if (waveRadius > 0) {
          ctx.strokeStyle = `rgba(168, 85, 247, ${waveOpacity * 0.3})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        mixBlendMode: 'screen',
      }}
    />
  );
}