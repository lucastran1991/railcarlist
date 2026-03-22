import { useState, useEffect, useRef } from 'react';
import { fetchAllDomainData, type QueryParams } from '@/lib/api-dashboard';

type Domain = 'electricity' | 'steam' | 'boiler' | 'tank' | 'substation';

interface DashboardState<K> {
  kpis: K | null;
  charts: Record<string, unknown[]>;
  loading: boolean;
  error: string | null;
}

function paramsKey(domain: string, p?: QueryParams): string {
  return `${domain}_${p?.start || ''}_${p?.end || ''}_${p?.aggregate || ''}_${p?.page || ''}_${p?.limit || ''}`;
}

function defaultParams(params?: QueryParams): QueryParams {
  if (params?.start || params?.end || params?.page || params?.limit) return params ?? {};
  // Default: last 30 days, limit 500 — prevents 19K raw records from overloading charts
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  return {
    ...params,
    start: thirtyDaysAgo.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
    limit: 500,
  };
}

export function useDashboardData<K>(domain: Domain, params?: QueryParams) {
  const [state, setState] = useState<DashboardState<K>>({
    kpis: null,
    charts: {},
    loading: true,
    error: null,
  });

  const effectiveParams = defaultParams(params);
  const key = paramsKey(domain, effectiveParams);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetchAllDomainData<K>(domain, effectiveParams)
      .then((result) => {
        if (!cancelled) {
          setState({ kpis: result.kpis, charts: result.charts, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: err.message }));
        }
      });

    return () => { cancelled = true; };
  }, [domain, key, params]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
