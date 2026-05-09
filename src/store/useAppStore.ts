// Arquivo: src/store/useAppStore.ts
import { create } from 'zustand';

type AppState = {
  isSidebarOpen: boolean; // Para o menu mobile
  isSidebarCollapsed: boolean; // Para o menu desktop
  toggleSidebarCollapse: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
};

/**
 * Hook do Zustand para gerenciamento do estado global da UI
 * (ex: menu lateral aberto/fechado).
 */
export const useAppStore = create<AppState>()((set) => ({
  isSidebarOpen: false,
  isSidebarCollapsed: false,
  toggleSidebarCollapse: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
}));