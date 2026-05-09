import React, { useEffect, useRef } from 'react';

/**
 * Componente de background moderno e abstrato com tema geométrico de futebol
 * Usa Canvas para renderizar padrões dinâmicos e animados
 */
export default function SoccerFieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      time += 0.005;

      // Limpar canvas com gradiente de fundo
      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGradient.addColorStop(0, '#0a0e27');
      bgGradient.addColorStop(0.5, '#0f1a3a');
      bgGradient.addColorStop(1, '#050a1a');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ===== PADRÃO DE CAMPO DE FUTEBOL =====
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.08)';
      ctx.lineWidth = 1;

      // Linhas horizontais do campo
      const fieldLineSpacing = 40;
      for (let i = 0; i < canvas.height; i += fieldLineSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Linhas verticais do campo
      for (let i = 0; i < canvas.width; i += fieldLineSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      // Linha do meio do campo
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      // Círculo central do campo
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
      ctx.stroke();

      // ===== ELEMENTOS GEOMÉTRICOS DINÂMICOS =====
      
      // Triângulos rotativos
      const triangles = [
        { x: canvas.width * 0.2, y: canvas.height * 0.3, size: 60, color: 'rgba(6, 182, 212, 0.1)', speed: 0.5 },
        { x: canvas.width * 0.8, y: canvas.height * 0.4, size: 80, color: 'rgba(59, 130, 246, 0.08)', speed: -0.3 },
        { x: canvas.width * 0.3, y: canvas.height * 0.7, size: 50, color: 'rgba(34, 197, 94, 0.08)', speed: 0.7 },
        { x: canvas.width * 0.75, y: canvas.height * 0.75, size: 70, color: 'rgba(168, 85, 247, 0.07)', speed: -0.4 },
      ];

      triangles.forEach((tri) => {
        ctx.save();
        ctx.translate(tri.x, tri.y);
        ctx.rotate(time * tri.speed);
        ctx.fillStyle = tri.color;
        ctx.strokeStyle = tri.color.replace('0.', '0.2');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -tri.size);
        ctx.lineTo(tri.size * 0.866, tri.size * 0.5);
        ctx.lineTo(-tri.size * 0.866, tri.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // Círculos pulsantes
      const circles = [
        { x: canvas.width * 0.15, y: canvas.height * 0.2, baseRadius: 30, color: 'rgba(6, 182, 212, 0.15)' },
        { x: canvas.width * 0.85, y: canvas.height * 0.8, baseRadius: 40, color: 'rgba(59, 130, 246, 0.12)' },
        { x: canvas.width * 0.5, y: canvas.height * 0.1, baseRadius: 25, color: 'rgba(34, 197, 94, 0.1)' },
      ];

      circles.forEach((circle) => {
        const radius = circle.baseRadius + Math.sin(time * 2) * 10;
        ctx.fillStyle = circle.color;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Anel externo
        ctx.strokeStyle = circle.color.replace('0.1', '0.25');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, radius + 15, 0, Math.PI * 2);
        ctx.stroke();
      });

      // ===== LINHAS DINÂMICAS FLUINDO =====
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 2;

      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.3 + i * 100 + Math.sin(time + i) * 30);
        
        for (let x = 0; x < canvas.width; x += 20) {
          const y = canvas.height * 0.3 + i * 100 + Math.sin((x * 0.01 + time) * 2) * 30;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // ===== PARTÍCULAS FLUTUANTES =====
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      for (let i = 0; i < 15; i++) {
        const x = (canvas.width * 0.5 + Math.sin(time * 0.3 + i) * 300) % canvas.width;
        const y = (canvas.height * 0.5 + Math.cos(time * 0.2 + i * 0.5) * 250) % canvas.height;
        const size = 2 + Math.sin(time + i) * 1.5;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // ===== GLOW CENTRAL =====
      const glowGradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, 400
      );
      glowGradient.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
      glowGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ background: 'transparent' }}
    />
  );
}