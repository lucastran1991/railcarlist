import { useState, useEffect, useMemo, useCallback } from 'react';
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

function buildKey(domain: string, p: QueryParams): string {
  return `${domain}_${p.start || ''}_${p.end || ''}_${p.aggregate || ''}_${p.page || ''}_${p.limit || ''}`;
}

function getDefaults(): { start: string; end: string } {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  return {
    start: thirtyDaysAgo.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  };
}

export function useDashboardData<K>(domain: Domain, params?: QueryParams) {
  const [state, setState] = useState<DashboardState<K>>({
    kpis: null,
    charts: {},
    chartLoading: {},
    kpisLoading: true,
    error: null,
  });

  const effectiveParams = useMemo<QueryParams>(() => {
    if (params?.start || params?.end || params?.page || params?.limit) {
      return params ?? {};
    }
    const defaults = getDefaults();
    return { ...params, start: defaults.start, end: defaults.end, limit: 500 };
  }, [params]);

  const key = useMemo(() => buildKey(domain, effectiveParams), [domain, effectiveParams]);

  useEffect(() => {
    let cancelled = false;
    const chartSlugs = CHART_ENDPOINTS[domain];

    // Initialize all charts as loading
    const initialLoading: Record<string, boolean> = {};
    chartSlugs.forEach((slug) => { initialLoading[slug] = true; });

    setState({
      kpis: null,
      charts: {},
      chartLoading: initialLoading,
      kpisLoading: true,
      error: null,
    });

    // 1. Fetch KPIs first (fast, small payload)
    fetchDomainKPIs<K>(domain)
      .then((kpis) => {
        if (!cancelled) {
          setState((s) => ({ ...s, kpis, kpisLoading: false }));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState((s) => ({ ...s, kpisLoading: false, error: err.message }));
        }
      });

    // 2. Fetch each chart independently (lazy loading)
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
  }, [domain, key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived: overall loading = KPIs still loading
  const loading = state.kpisLoading;

  return {
    kpis: state.kpis,
    charts: state.charts,
    chartLoading: state.chartLoading,
    loading,
    error: state.error,
  };
}
