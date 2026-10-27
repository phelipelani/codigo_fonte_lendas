// Arquivo: src/components/ui/AnimatedBackground.tsx
import React from 'react';
import bgDesktop from '@/assets/app_bg_desktop.png';
import bgMobile from '@/assets/app_bg_mobile.png';

interface AnimatedBackgroundProps {
  variant?: 'default' | 'auth' | 'dark';
  showWaves?: boolean;
  showCircles?: boolean;
  showTriangles?: boolean;
  showRadar?: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

export function AnimatedBackground({
  intensity = 'medium',
}: AnimatedBackgroundProps) {
  // Ajuste de opacidade da camada de contraste
  const overlayClass =
    intensity === 'low'
      ? 'from-[#060a12]/70 via-[#070d18]/60 to-[#060a12]/75'
      : intensity === 'high'
      ? 'from-[#060a12]/85 via-[#070d18]/80 to-[#060a12]/90'
      : 'from-[#060a12]/78 via-[#070d18]/70 to-[#060a12]/82';

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden select-none pointer-events-none" aria-hidden="true">
      {/* Imagem de Fundo Responsiva (Mobile: background_mobile.png | Desktop >= 768px: background_desktop.png) */}
      <picture className="absolute inset-0 h-full w-full">
        <source media="(min-width: 768px)" srcSet={bgDesktop} />
        <img
          src={bgMobile}
          alt="FutLendas App Background"
          className="h-full w-full object-cover object-center"
        />
      </picture>

      {/* Camada de Contraste e Atmosfera Futurista para Legibilidade do Conteúdo */}
      <div className={`absolute inset-0 bg-gradient-to-b ${overlayClass} backdrop-blur-[1px]`} />
    </div>
  );
}

export default AnimatedBackground;
