import { useState, useEffect, useRef } from 'react';
import { fetchAllDomainData, type QueryParams } from '@/lib/api-dashboard';

type Domain = 'electricity' | 'steam' | 'boiler' | 'tank' | 'substation';

interface DashboardState<K> {
  kpis: K | null;
  charts: Record<string, unknown[]>;
  loading: boolean;
  error: string | null;
}

function paramsKey(p?: QueryParams): string {
  if (!p) return '';
  return `${p.start || ''}_${p.end || ''}_${p.aggregate || ''}_${p.page || ''}_${p.limit || ''}`;
}

export function useDashboardData<K>(domain: Domain, params?: QueryParams) {
  const [state, setState] = useState<DashboardState<K>>({
    kpis: null,
    charts: {},
    loading: true,
    error: null,
  });

  const lastKey = useRef('');
  const key = paramsKey(params);

  useEffect(() => {
    // Skip if params haven't actually changed
    if (key === lastKey.current && state.kpis !== null) return;
    lastKey.current = key;

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetchAllDomainData<K>(domain, params)
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
  }, [domain, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
