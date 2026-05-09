// Arquivo: src/components/shared/PageTitle.tsx
// Componente reutilizável para títulos de página com efeito dourado 3D
import React from 'react';

interface PageTitleProps {
  icon?: string; // path para ícone webp
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // ações à direita (botões, etc.)
}

const PageTitle = React.memo(function PageTitle({ icon, title, subtitle, children }: PageTitleProps) {
  return (
    <header className="mb-6 sm:mb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 sm:gap-3 mb-1">
            {icon && (
              <img
                src={icon}
                alt=""
                className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-lg flex-shrink-0"
              />
            )}
            <span
              className="relative text-2xl sm:text-3xl md:text-4xl uppercase tracking-wide"
              style={{ fontFamily: "'Montserrat', Arial, sans-serif", fontWeight: 900 }}
            >
              <span
                className="absolute inset-0"
                style={{
                  color: '#2a1b02',
                  textShadow:
                    '0px 1px 0px #4d3509, 0px 2px 0px #3f2a06, 0px 3px 0px #2a1b02, 0px 4px 6px rgba(0,0,0,0.7)',
                }}
                aria-hidden="true"
              >
                {title}
              </span>
              <span
                className="relative"
                style={{
                  background:
                    'linear-gradient(to bottom, #f5d76e 0%, #d4af37 30%, #aa771c 60%, #8b5a10 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {title}
              </span>
            </span>
          </h1>
          {subtitle && (
            <p className="text-cyan-100/50 text-xs sm:text-sm mt-1">{subtitle}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
      </div>
    </header>
  );
});

export default PageTitle;
