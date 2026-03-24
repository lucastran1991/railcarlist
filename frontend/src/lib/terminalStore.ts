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
  setActiveTerminal: (id: string, reload?: boolean) => void;
}

const STORAGE_KEY = 'vopak_active_terminal';

function getInitialTerminal(): { id: string; terminal: Terminal } {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const found = TERMINALS.find(t => t.id === saved);
      if (found) return { id: saved, terminal: found };
    }
  }
  return { id: TERMINALS[0].id, terminal: TERMINALS[0] };
}

export const useTerminalStore = create<TerminalState>((set) => {
  const initial = getInitialTerminal();
  return {
    terminals: TERMINALS,
    activeTerminalId: initial.id,
    activeTerminal: initial.terminal,
    setActiveTerminal: (id: string, reload = true) => {
      const terminal = TERMINALS.find(t => t.id === id);
      if (terminal) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, id);
        }
        set({ activeTerminalId: id, activeTerminal: terminal });
        if (reload && typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    },
  };
});
