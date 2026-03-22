import { useState, useEffect } from 'react';
import { fetchAllDomainData, type QueryParams } from '@/lib/api-dashboard';

type Domain = 'electricity' | 'steam' | 'boiler' | 'tank' | 'substation';

interface DashboardState<K> {
  kpis: K | null;
  charts: Record<string, unknown[]>;
  loading: boolean;
  error: string | null;
}

export function useDashboardData<K>(domain: Domain, params?: QueryParams) {
  const [state, setState] = useState<DashboardState<K>>({
    kpis: null,
    charts: {},
    loading: true,
    error: null,
  });

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, params?.start, params?.end, params?.aggregate, params?.page, params?.limit]);

  return state;
}
