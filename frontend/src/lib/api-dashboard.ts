import { API_BASE_URL, API_ENDPOINTS } from './config';

// --- Shared types ---

export interface QueryParams {
  start?: string;
  end?: string;
  aggregate?: 'raw' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    count: number;
    page?: number;
    limit?: number;
    start?: string;
    end?: string;
    aggregate?: string;
  };
}

// --- Fetch helper ---

async function fetchJSON<T>(path: string, params?: QueryParams): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    if (params.start) url.searchParams.set('start', params.start);
    if (params.end) url.searchParams.set('end', params.end);
    if (params.aggregate) url.searchParams.set('aggregate', params.aggregate);
    if (params.page) url.searchParams.set('page', String(params.page));
    if (params.limit) url.searchParams.set('limit', String(params.limit));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// --- Domain types ---

type Domain = 'electricity' | 'steam' | 'boiler' | 'tank' | 'substation';

// Chart endpoint slugs per domain
const CHART_ENDPOINTS: Record<Domain, string[]> = {
  electricity: ['load-profiles', 'weekly-consumption', 'power-factor', 'cost-breakdown', 'peak-demand', 'phase-balance'],
  steam: ['balance', 'header-pressure', 'distribution', 'condensate', 'fuel-ratio', 'loss'],
  boiler: ['readings', 'efficiency-trend', 'combustion', 'steam-fuel', 'emissions', 'stack-temp'],
  tank: ['levels', 'inventory-trend', 'throughput', 'product-distribution', 'level-changes', 'temperatures'],
  substation: ['voltage-profile', 'transformers', 'harmonics', 'transformer-temp', 'feeder-distribution', 'fault-events'],
};

// --- Generic domain fetchers ---

export async function fetchDomainKPIs<T>(domain: Domain): Promise<T> {
  return fetchJSON<T>(`${API_ENDPOINTS[domain]}/kpis`);
}

export async function fetchDomainChart<T>(domain: Domain, chartIndex: number, params?: QueryParams): Promise<T> {
  const slug = CHART_ENDPOINTS[domain][chartIndex];
  if (!slug) throw new Error(`Invalid chart index ${chartIndex} for ${domain}`);
  return fetchJSON<T>(`${API_ENDPOINTS[domain]}/${slug}`, params);
}

export async function fetchDomainChartByName<T>(domain: Domain, chartName: string, params?: QueryParams): Promise<T> {
  return fetchJSON<T>(`${API_ENDPOINTS[domain]}/${chartName}`, params);
}

// --- Fetch all data for a domain (KPIs + all charts in parallel) ---

export interface DomainData<K, C extends Record<string, unknown[]>> {
  kpis: K;
  charts: C;
}

export async function fetchAllDomainData<K>(
  domain: Domain,
  params?: QueryParams,
): Promise<{ kpis: K; charts: Record<string, unknown[]> }> {
  const chartSlugs = CHART_ENDPOINTS[domain];

  const [kpis, ...chartResults] = await Promise.all([
    fetchDomainKPIs<K>(domain),
    ...chartSlugs.map((slug) =>
      fetchJSON<PaginatedResponse<unknown> | unknown[]>(
        `${API_ENDPOINTS[domain]}/${slug}`,
        params,
      ),
    ),
  ]);

  const charts: Record<string, unknown[]> = {};
  chartSlugs.forEach((slug, i) => {
    const result = chartResults[i];
    // Handle both paginated {data, meta} and plain array responses
    charts[slug] = Array.isArray(result) ? result : (result as PaginatedResponse<unknown>).data;
  });

  return { kpis, charts };
}

// --- Convenience: fetch all 5 domain KPIs (for home page) ---

export interface AllKPIs {
  electricity: ElectricityKPIs;
  steam: SteamKPIs;
  boiler: BoilerKPIs;
  tank: TankKPIs;
  substation: SubStationKPIs;
}

export async function fetchAllKPIs(): Promise<AllKPIs> {
  const [electricity, steam, boiler, tank, substation] = await Promise.all([
    fetchDomainKPIs<ElectricityKPIs>('electricity'),
    fetchDomainKPIs<SteamKPIs>('steam'),
    fetchDomainKPIs<BoilerKPIs>('boiler'),
    fetchDomainKPIs<TankKPIs>('tank'),
    fetchDomainKPIs<SubStationKPIs>('substation'),
  ]);
  return { electricity, steam, boiler, tank, substation };
}

// --- KPI types ---

export interface ElectricityKPIs {
  totalConsumption: number;
  realTimeDemand: number;
  peakDemand: number;
  powerFactor: number;
  energyCost: number;
  carbonEmissions: number;
  gridAvailability: number;
  transformerLoad: number;
}

export interface SteamKPIs {
  totalProduction: number;
  totalDemand: number;
  headerPressure: number;
  steamTemperature: number;
  systemEfficiency: number;
  condensateRecovery: number;
  makeupWaterFlow: number;
  fuelConsumption: number;
}

export interface BoilerKPIs {
  boilersOnline: number;
  boilersTotal: number;
  totalSteamOutput: number;
  fleetEfficiency: number;
  avgStackTemp: number;
  totalFuelRate: number;
  avgO2: number;
  coEmissions: number;
  noxEmissions: number;
}

export interface TankKPIs {
  totalInventory: number;
  availableCapacity: number;
  tanksInOperation: number;
  tanksTotal: number;
  currentThroughput: number;
  avgTemperature: number;
  activeAlarms: number;
  dailyReceipts: number;
  dailyDispatches: number;
}

export interface SubStationKPIs {
  incomingVoltage: number;
  totalLoad: number;
  transformerTemp: number;
  frequency: number;
  thd: number;
  breakersClosed: number;
  breakersTotal: number;
  faultEvents24h: number;
  busbarBalance: number;
}
