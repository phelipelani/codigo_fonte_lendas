import React from 'react';
import ReactPlayer from 'react-player';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp } from './dashboardConstants';

interface VideoLobbyCardProps {
  videoId?: string;
}

export default function VideoLobbyCard({ videoId }: VideoLobbyCardProps) {
  if (!videoId) return null;

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <motion.div 
      {...fadeUp(0.1)} 
      className="relative w-full overflow-hidden rounded-2xl border border-white/[0.05] bg-black group shadow-lg"
      style={{ aspectRatio: '16/9' }}
    >
      <div className="absolute inset-0 z-0 opacity-70 group-hover:opacity-90 transition-opacity duration-500">
        <ReactPlayer
          url={url}
          playing={true}
          loop={true}
          muted={true}
          width="100%"
          height="100%"
          config={{
            youtube: {
              playerVars: { 
                showinfo: 0, 
                controls: 0, 
                modestbranding: 1, 
                rel: 0,
                disablekb: 1,
                fs: 0
              }
            }
          }}
          style={{ pointerEvents: 'none', transform: 'scale(1.3)' }} // Scale up 1.3 to crop youtube title/bars
        />
      </div>

      {/* Camada de vidro por cima do vídeo com texto e botão para expandir */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/30 to-transparent p-4 sm:p-6 pointer-events-none">
        <h2 className="text-xl sm:text-2xl font-black uppercase text-white mb-1 shadow-black drop-shadow-lg">
          Resenha da Semana
        </h2>
        <p className="text-xs sm:text-sm text-white/70 mb-4 shadow-black drop-shadow-md">
          Assista aos melhores lances, gols perdidos e polêmicas do Futlendas.
        </p>
        
        {/* Botão que permite clicar (pointer-events-auto) para abrir o vídeo com som no YT */}
        <div className="pointer-events-auto">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-bold text-cyan-400 backdrop-blur-md transition-all hover:bg-cyan-500/40 hover:text-cyan-300"
          >
            <Play size={16} /> Assistir com Áudio
          </a>
        </div>
      </div>
    </motion.div>
  );
}
