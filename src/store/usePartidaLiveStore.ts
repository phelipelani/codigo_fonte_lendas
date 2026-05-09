// Arquivo: src/store/usePartidaLiveStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TimeEmPartida } from '@/@types/partida';

// Tipo para os eventos locais
export type EventoLocal = {
  id: string;
  tipo: 'gol' | 'gol_contra' | 'assistencia';
  jogador_id: number;
  nome_jogador: string;
  time_id: number;
  tempo: string;
  tempo_segundos: number;
  assist_por?: number;
};

interface PartidaLiveState {
  // Dados de Identificação
  isActive: boolean; // Se tem um jogo "vivo" na memória
  rodadaId: number | null;
  
  // Dados dos Times
  timeA: TimeEmPartida | null;
  timeB: TimeEmPartida | null;
  goleiroA: number | null;
  goleiroB: number | null;

  // Dados do Jogo
  eventos: EventoLocal[];
  
  // Lógica do Cronômetro
  isRunning: boolean;
  startTime: number | null; // Timestamp (Date.now()) de quando iniciou/retomou
  accumulatedTime: number;  // Segundos acumulados antes da última pausa

  // Ações
  iniciarPartida: (rodadaId: number, tA: TimeEmPartida, tB: TimeEmPartida) => void;
  play: () => void;
  pause: () => void;
  finalizarPartida: () => void; // Limpa a store
  
  // Setters
  setGoleiros: (ga: number | null, gb: number | null) => void;
  addEvento: (evento: EventoLocal) => void;
  removeEvento: (eventoId: string) => void;
  
  // Helper para recuperar tempo atual
  getSegundosAtuais: () => number;
}

export const usePartidaLiveStore = create<PartidaLiveState>()(
  persist(
    (set, get) => ({
      isActive: false,
      rodadaId: null,
      timeA: null,
      timeB: null,
      goleiroA: null,
      goleiroB: null,
      eventos: [],
      
      isRunning: false,
      startTime: null,
      accumulatedTime: 0,

      iniciarPartida: (rodadaId, tA, tB) => {
        // Só inicia se não tiver uma ativa ou se for sobrescrever
        set({
          isActive: true,
          rodadaId,
          timeA: tA,
          timeB: tB,
          eventos: [],
          goleiroA: null,
          goleiroB: null,
          isRunning: false, // Começa pausado esperando o apito
          startTime: null,
          accumulatedTime: 0
        });
      },

      play: () => {
        if (get().isRunning) return;
        set({ 
          isRunning: true, 
          startTime: Date.now() 
        });
      },

      pause: () => {
        if (!get().isRunning) return;
        const now = Date.now();
        const start = get().startTime || now;
        const delta = Math.floor((now - start) / 1000);
        
        set((state) => ({
          isRunning: false,
          startTime: null,
          accumulatedTime: state.accumulatedTime + delta
        }));
      },

      finalizarPartida: () => {
        // Zera tudo
        set({
          isActive: false,
          rodadaId: null,
          timeA: null,
          timeB: null,
          eventos: [],
          isRunning: false,
          startTime: null,
          accumulatedTime: 0,
          goleiroA: null,
          goleiroB: null
        });
      },

      setGoleiros: (ga, gb) => set({ goleiroA: ga, goleiroB: gb }),

      addEvento: (evento) => set((state) => ({ eventos: [...state.eventos, evento] })),
      
      removeEvento: (id) => set((state) => ({ eventos: state.eventos.filter(e => e.id !== id) })),

      getSegundosAtuais: () => {
        const state = get();
        if (!state.isRunning) return state.accumulatedTime;
        
        const now = Date.now();
        const start = state.startTime || now;
        const currentDelta = Math.floor((now - start) / 1000);
        return state.accumulatedTime + currentDelta;
      }
    }),
    {
      name: 'partida-live-storage', // Nome no localStorage (persiste se der F5)
      storage: createJSONStorage(() => localStorage),
    }
  )
);