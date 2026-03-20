export interface BoilerData {
  boilerId: string;
  boilerMode: number;
  currentPSI: number;
  requestPSI: number;
  setpointPSI: number;
  firingRate: number;
  flameLevel: number;
  gasConsumed: number;
  steamProduced: number;
  diagnosticCode: string;
  errorCode: string;
  lastUpdated: string;
  sid: string;
}

export const MODES: Record<number, { label: string; cls: string }> = {
  0: { label: 'OFF', cls: 'bg-gray-500/20 text-gray-400' },
  1: { label: 'ACTIVE', cls: 'bg-green-500/20 text-green-400' },
  2: { label: 'STANDBY', cls: 'bg-yellow-500/20 text-yellow-400' },
  3: { label: 'ERROR', cls: 'bg-red-500/20 text-red-400' },
};

export function mockBoilerData(name: string): BoilerData {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  const h = Math.abs(hash);
  const mode = h % 3 === 0 ? 1 : 2;
  const isActive = mode === 1;
  return {
    boilerId: `Boiler-${name.slice(-4)}`,
    boilerMode: mode,
    currentPSI: isActive ? 80 + (h % 50) : 0,
    requestPSI: 85 + (h % 10),
    setpointPSI: isActive ? 120 + (h % 15) : 0,
    firingRate: isActive ? 40 + (h % 55) : 0,
    flameLevel: isActive ? 1 + (h % 3) : 0,
    gasConsumed: 1e6 + (h % 9) * 2.3e7,
    steamProduced: isActive ? 100 + (h % 200) : 0,
    diagnosticCode: isActive ? '0' : String(h % 64),
    errorCode: '0',
    lastUpdated: new Date(Date.now() - (h % 300) * 1000).toISOString(),
    sid: `STU${name.slice(-6).toUpperCase()}${h.toString(36).toUpperCase().slice(0, 8)}`,
  };
}

export function fmtNum(n: number, d = 1): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return n.toFixed(d);
}

/** Generate mock time-series for charts */
export function generateBoilerTimeseries(name: string, hours: number) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  const h = Math.abs(hash);
  const isActive = h % 3 === 0;
  const now = Date.now();

  const psiData = [];
  const steamData = [];
  const firingData = [];
  const gasData = [];

  let psi = isActive ? 80 + (h % 40) : 5;
  let steam = isActive ? 100 + (h % 150) : 0;
  let firing = isActive ? 40 + (h % 50) : 0;
  let gas = 0;

  for (let i = 0; i < hours; i++) {
    const t = new Date(now - (hours - i) * 3600000);
    const label = `${String(t.getHours()).padStart(2, '0')}:00`;

    psi += Math.sin(i * 0.4 + h) * 5;
    psi = Math.max(0, Math.min(150, psi));
    steam += Math.cos(i * 0.3 + h) * 20;
    steam = Math.max(0, Math.min(400, steam));
    firing += Math.sin(i * 0.6 + h) * 8;
    firing = Math.max(0, Math.min(100, firing));
    gas += isActive ? 500 + Math.random() * 200 : 0;

    psiData.push({ time: label, value: Math.round(psi * 10) / 10 });
    steamData.push({ time: label, value: Math.round(steam * 10) / 10 });
    firingData.push({ time: label, value: Math.round(firing * 10) / 10 });
    gasData.push({ time: label, value: Math.round(gas) });
  }

  return { psiData, steamData, firingData, gasData };
}
