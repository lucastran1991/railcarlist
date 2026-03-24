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
    modelPath: '/models/terminal.glb',
    tankCount: 59,
    capacity: '2.1M bbl',
    status: 'online',
  },
  {
    id: 'rotterdam',
    name: 'Europoort',
    location: 'Rotterdam, Netherlands',
    country: 'NL',
    flag: '🇳🇱',
    modelPath: '/models/terminal.glb',
    tankCount: 84,
    capacity: '3.8M bbl',
    status: 'online',
  },
  {
    id: 'singapore',
    name: 'Banyan',
    location: 'Jurong Island, Singapore',
    country: 'SG',
    flag: '🇸🇬',
    modelPath: '/models/terminal.glb',
    tankCount: 72,
    capacity: '2.9M bbl',
    status: 'online',
  },
  {
    id: 'fujairah',
    name: 'Horizon',
    location: 'Fujairah, UAE',
    country: 'AE',
    flag: '🇦🇪',
    modelPath: '/models/terminal.glb',
    tankCount: 46,
    capacity: '1.6M bbl',
    status: 'maintenance',
  },
  {
    id: 'houston',
    name: 'Deer Park',
    location: 'Houston, TX, USA',
    country: 'US',
    flag: '🇺🇸',
    modelPath: '/models/terminal.glb',
    tankCount: 63,
    capacity: '2.4M bbl',
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

function getInitialTerminal(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) || 'savannah';
  }
  return 'savannah';
}

export const useTerminalStore = create<TerminalState>((set) => {
  const initialId = getInitialTerminal();
  return {
    terminals: TERMINALS,
    activeTerminalId: initialId,
    activeTerminal: TERMINALS.find(t => t.id === initialId) || TERMINALS[0],
    setActiveTerminal: (id: string) => {
      const terminal = TERMINALS.find(t => t.id === id);
      if (terminal) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, id);
        }
        set({ activeTerminalId: id, activeTerminal: terminal });
      }
    },
  };
});
