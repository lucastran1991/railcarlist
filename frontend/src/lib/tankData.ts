import { API_BASE_URL, API_ENDPOINTS } from './config';

// --- OSM ID → Tank ID mapping ---
// Maps 3D scene object names (OSM building IDs) to our tank database IDs.
// Based on cylinder radius matching: largest GLB objects → largest capacity tanks.

const OSM_TO_TANK: Record<string, string> = {
  '963060345': 'TK-301',
  '295318118': 'TK-302',
  '295318124': 'TK-201',
  '295318123': 'TK-202',
  '295318125': 'TK-203',
  '295318127': 'TK-101',
  '295318128': 'TK-102',
  '295318129': 'TK-103',
  '295318117': 'TK-401',
  '295318119': 'TK-402',
};

export function osmToTankId(osmId: string): string | null {
  return OSM_TO_TANK[osmId] ?? null;
}

export function isMappedTank(osmId: string): boolean {
  return osmId in OSM_TO_TANK;
}

// --- Tank data types ---

export interface TankLevelData {
  id: number;
  tank: string;
  product: string;
  level: number;
  volume: number;
  capacity: number;
  color: string;
}

// --- Fetch tank level by tank ID ---

let tankLevelsCache: TankLevelData[] | null = null;

export async function fetchTankLevels(): Promise<TankLevelData[]> {
  if (tankLevelsCache) return tankLevelsCache;
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.tank}/levels`);
  if (!res.ok) throw new Error(`Failed to fetch tank levels: ${res.status}`);
  const data = await res.json();
  tankLevelsCache = (Array.isArray(data) ? data : data.data ?? []) as TankLevelData[];
  return tankLevelsCache;
}

export async function fetchTankByOsmId(osmId: string): Promise<TankLevelData | null> {
  const tankId = osmToTankId(osmId);
  if (!tankId) return null;
  const levels = await fetchTankLevels();
  return levels.find((t) => t.tank === tankId) ?? null;
}

export function invalidateTankCache(): void {
  tankLevelsCache = null;
}

// --- Product color map ---
export const PRODUCT_COLORS: Record<string, string> = {
  Gasoline: '#F6AD55',
  Diesel: '#4D65FF',
  'Crude Oil': '#56CDE7',
  Crude: '#56CDE7',
  Ethanol: '#5CE5A0',
};

// --- Formatting helpers ---

export function fmtVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(Math.round(v));
}

export function fmtPercent(v: number): string {
  return `${Math.round(v)}%`;
}

export function levelColor(level: number): string {
  if (level >= 80) return '#E53E3E'; // near full — warning
  if (level >= 60) return '#5CE5A0'; // healthy
  if (level >= 30) return '#F6AD55'; // medium
  return '#56CDE7'; // low
}
