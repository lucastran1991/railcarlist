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
  '295318120': 'TK-503',
  '295318121': 'TK-501',
  '295318122': 'TK-504',
  '295318126': 'TK-502',
  '295318477': 'TK-511',
  '295318478': 'TK-519',
  '295318479': 'TK-505',
  '295318480': 'TK-520',
  '295318481': 'TK-521',
  '295318482': 'TK-522',
  '295318483': 'TK-523',
  '295318484': 'TK-512',
  '963018304': 'TK-526',
  '963018305': 'TK-527',
  '963018306': 'TK-528',
  '963018307': 'TK-529',
  '963018308': 'TK-530',
  '963018309': 'TK-531',
  '963018310': 'TK-532',
  '963018311': 'TK-533',
  '963018312': 'TK-534',
  '963018313': 'TK-506',
  '963018314': 'TK-507',
  '963018315': 'TK-508',
  '963018316': 'TK-509',
  '963060349': 'TK-524',
  '963060350': 'TK-525',
  '963060351': 'TK-536',
  '963060352': 'TK-537',
  '963060353': 'TK-538',
  '963060354': 'TK-539',
  '963060355': 'TK-540',
  '963060356': 'TK-541',
  '963060357': 'TK-542',
  '963060358': 'TK-543',
  '963060359': 'TK-544',
  '963060360': 'TK-545',
  '963060361': 'TK-546',
  '963060362': 'TK-547',
  '963060363': 'TK-548',
  '963060364': 'TK-513',
  '963060365': 'TK-514',
  '963060366': 'TK-515',
  '963060367': 'TK-516',
  '963060368': 'TK-517',
  '963060369': 'TK-510',
  '1286707729': 'TK-518',
  '1286707730': 'TK-535',
  '1286707731': 'TK-549',
};

export function osmToTankId(osmId: string): string | null {
  return OSM_TO_TANK[osmId] ?? null;
}

export function isMappedTank(osmId: string): boolean {
  return osmId in OSM_TO_TANK;
}

// --- Tank data types ---

export type TankStatus =
  | 'in_service'
  | 'receiving'
  | 'discharging'
  | 'idle'
  | 'heating'
  | 'warning'
  | 'critical'
  | 'maintenance';

export interface TankLevelData {
  id: number;
  tank: string;
  product: string;
  level: number;
  volume: number;
  capacity: number;
  color: string;
  status: TankStatus;
}

// Status display config for UI and 3D visualization
export const TANK_STATUS_CONFIG: Record<TankStatus, { label: string; color: string; icon: string }> = {
  in_service:  { label: 'In Service',  color: '#5CE5A0', icon: 'check-circle' },
  receiving:   { label: 'Receiving',   color: '#56CDE7', icon: 'arrow-down' },
  discharging: { label: 'Discharging', color: '#4D65FF', icon: 'arrow-up' },
  idle:        { label: 'Idle',        color: '#94A3B8', icon: 'pause-circle' },
  heating:     { label: 'Heating',     color: '#F6AD55', icon: 'flame' },
  warning:     { label: 'Warning',     color: '#ECC94B', icon: 'alert-triangle' },
  critical:    { label: 'Critical',    color: '#E53E3E', icon: 'alert-octagon' },
  maintenance: { label: 'Maintenance', color: '#A78BFA', icon: 'wrench' },
};

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
  LPG: '#5CE5A0',
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
