import { create } from 'zustand';

export interface Terminal {
  id: string;
  name: string;
  location: string;
  country: string;
  flag: string;
  modelPath: string;
  tankCount: number;
  capacity: string; // e.g. "2.1M bbl"
  status: 'online' | 'maintenance' | 'offline';
}

const TERMINALS: Terminal[] = [
  {
    id: 'savannah',
    name: 'Savannah',
    location: 'Georgia, USA',
    country: 'US',
    flag: '🇺🇸',
    modelPath: '/models/savannah.glb',
    tankCount: 59,
    capacity: '2.1M bbl',
    status: 'online',
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles',
    location: 'California, USA',
    country: 'US',
    flag: '🇺🇸',
    modelPath: '/models/los-angeles.glb',
    tankCount: 42,
    capacity: '1.8M bbl',
    status: 'online',
  },
  {
    id: 'tarragona',
    name: 'Terquimsa Tarragona',
    location: 'Tarragona, Spain',
    country: 'ES',
    flag: '🇪🇸',
    modelPath: '/models/tarragona.glb',
    tankCount: 36,
    capacity: '1.2M bbl',
    status: 'online',
  },
];

interface TerminalState {
  terminals: Terminal[];
  activeTerminalId: string;
  activeTerminal: Terminal;
  setActiveTerminal: (id: string) => void;
}

const STORAGE_KEY = 'vopak_active_terminal';

export const useTerminalStore = create<TerminalState>((set) => {
  return {
    terminals: TERMINALS,
    activeTerminalId: 'savannah',
    activeTerminal: TERMINALS[0],
    setActiveTerminal: (id: string) => {
      const terminal = TERMINALS.find(t => t.id === id);
      if (terminal && id !== useTerminalStore.getState().activeTerminalId) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, id);
          // Full page reload — resets all components, hooks, caches, 3D scene
          window.location.reload();
        }
      }
    },
  };
});
