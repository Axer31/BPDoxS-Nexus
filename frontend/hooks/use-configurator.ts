import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfiguratorState {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  
  sidebarType: 'default' | 'mini';
  setSidebarType: (t: 'default' | 'mini') => void;

  contrastMode: 'filled' | 'transparent';
  setContrastMode: (m: 'filled' | 'transparent') => void;

  // --- NEW: Dark Style Preference ---
  darkStyle: 'navy' | 'midnight';
  setDarkStyle: (s: 'navy' | 'midnight') => void;

  primaryColor: string;
  setPrimaryColor: (c: string) => void;
  
  resetConfig: () => void;
}

export const useConfigurator = create<ConfiguratorState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      
      sidebarType: 'default',
      setSidebarType: (t) => set({ sidebarType: t }),

      contrastMode: 'filled',
      setContrastMode: (m) => set({ contrastMode: m }),

      // Default to Navy (Horizon style)
      darkStyle: 'navy',
      setDarkStyle: (s) => set({ darkStyle: s }),

      primaryColor: '#4318FF', 
      setPrimaryColor: (c) => set({ primaryColor: c }),

      resetConfig: () => set({
        sidebarType: 'default',
        contrastMode: 'filled',
        darkStyle: 'navy',
        primaryColor: '#4318FF'
      })
    }),
    {
      name: 'invoicecore-config',
    }
  )
);