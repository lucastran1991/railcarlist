import { useState, useEffect, useRef } from 'react';
import {
  fetchDomainKPIs,
  fetchDomainChartByName,
  type QueryParams,
  type PaginatedResponse,
} from '@/lib/api-dashboard';

type Domain = 'electricity' | 'steam' | 'boiler' | 'tank' | 'substation';

const CHART_ENDPOINTS: Record<Domain, string[]> = {
  electricity: ['load-profiles', 'weekly-consumption', 'power-factor', 'cost-breakdown', 'peak-demand', 'phase-balance'],
  steam: ['balance', 'header-pressure', 'distribution', 'condensate', 'fuel-ratio', 'loss'],
  boiler: ['readings', 'efficiency-trend', 'combustion', 'steam-fuel', 'emissions', 'stack-temp'],
  tank: ['levels', 'inventory-trend', 'throughput', 'product-distribution', 'level-changes', 'temperatures'],
  substation: ['voltage-profile', 'transformers', 'harmonics', 'transformer-temp', 'feeder-distribution', 'fault-events'],
};

interface DashboardState<K> {
  kpis: K | null;
  charts: Record<string, unknown[]>;
  chartLoading: Record<string, boolean>;
  kpisLoading: boolean;
  error: string | null;
}

export function useDashboardData<K>(domain: Domain, params?: QueryParams) {
  const [state, setState] = useState<DashboardState<K>>({
    kpis: null,
    charts: {},
    chartLoading: {},
    kpisLoading: true,
    error: null,
  });

  // Serialize params to a stable string — always include aggregate default
  const p = params ?? {};
  const paramsJson = JSON.stringify({
    aggregate: p.aggregate || 'daily',
    start: p.start || '',
    end: p.end || '',
    page: p.page || 0,
    limit: p.limit || 0,
  });

  // Keep latest params in ref so effect always reads fresh values
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    let cancelled = false;
    const chartSlugs = CHART_ENDPOINTS[domain];

    // Build effective params — always include aggregate (default: daily)
    const p = paramsRef.current ?? {};
    const now = new Date();
    const ago = new Date(now.getTime() - 30 * 86400000);
    const effectiveParams: QueryParams = {
      aggregate: p.aggregate || 'daily',
      start: p.start || ago.toISOString().split('T')[0],
      end: p.end || now.toISOString().split('T')[0],
      ...(p.page ? { page: p.page } : {}),
      ...(p.limit ? { limit: p.limit } : {}),
    };

    // Show chart spinners but keep existing KPIs visible during refetch
    const initialLoading: Record<string, boolean> = {};
    chartSlugs.forEach((slug) => { initialLoading[slug] = true; });
    setState((s) => ({
      ...s,
      chartLoading: initialLoading,
      kpisLoading: s.kpis === null,
      error: null,
    }));

    // Fetch KPIs with same date range (KPIs are computed dynamically within range)
    const kpiParams: QueryParams = {};
    if (effectiveParams.start) kpiParams.start = effectiveParams.start;
    if (effectiveParams.end) kpiParams.end = effectiveParams.end;
    fetchDomainKPIs<K>(domain, kpiParams)
      .then((kpis) => { if (!cancelled) setState((s) => ({ ...s, kpis, kpisLoading: false })); })
      .catch((err) => { if (!cancelled) setState((s) => ({ ...s, kpisLoading: false, error: err.message })); });

    // Fetch each chart
    chartSlugs.forEach((slug) => {
      fetchDomainChartByName<PaginatedResponse<unknown> | unknown[]>(domain, slug, effectiveParams)
        .then((result) => {
          if (cancelled) return;
          const data = Array.isArray(result) ? result : (result as PaginatedResponse<unknown>).data ?? [];
          setState((s) => ({
            ...s,
            charts: { ...s.charts, [slug]: data },
            chartLoading: { ...s.chartLoading, [slug]: false },
          }));
        })
        .catch(() => {
          if (cancelled) return;
          setState((s) => ({
            ...s,
            charts: { ...s.charts, [slug]: [] },
            chartLoading: { ...s.chartLoading, [slug]: false },
          }));
        });
    });

    return () => { cancelled = true; };
  }, [domain, paramsJson]); // re-run when domain or serialized params change

  return {
    kpis: state.kpis,
    charts: state.charts,
    chartLoading: state.chartLoading,
    loading: state.kpisLoading,
    error: state.error,
  };
}
