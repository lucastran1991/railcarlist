'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { API_BASE_URL, apiFetch } from '@/lib/config';
import { AlertTriangle, Info, CheckCircle, Bell, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface Alert {
  id: number;
  type: 'critical' | 'warning' | 'info' | 'resolved';
  title: string;
  description: string;
  source: string;
  sourceId: string;
  severity: number;
  isRead: boolean;
  createdAt: number;
  resolvedAt: number;
}

interface AlertKPIs {
  total: number;
  critical: number;
  warning: number;
  info: number;
  resolved: number;
  unread: number;
}

interface PaginatedResponse {
  data: Alert[];
  meta: { total: number; page: number; limit: number; count: number };
}

const LIMIT = 10;

function timeAgo(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function alertIcon(type: Alert['type']) {
  switch (type) {
    case 'critical':
      return <AlertTriangle size={18} className="text-[var(--color-danger,#E53E3E)] shrink-0" />;
    case 'warning':
      return <AlertTriangle size={18} className="text-[var(--color-warning,#F6AD55)] shrink-0" />;
    case 'info':
      return <Info size={18} className="text-[var(--color-secondary,#56CDE7)] shrink-0" />;
    case 'resolved':
      return <CheckCircle size={18} className="text-[var(--color-accent,#5CE5A0)] shrink-0" />;
  }
}

function sourceBadgeColor(source: string): string {
  switch (source) {
    case 'boiler': return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    case 'electricity': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'steam': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    case 'tank': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'substation': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

export default function AlertsPage() {
  const ready = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [kpis, setKpis] = useState<AlertKPIs | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async (p: number) => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE_URL}/api/alerts?page=${p}&limit=${LIMIT}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PaginatedResponse = await res.json();
      setAlerts(data.data ?? []);
      setTotal(data.meta.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKPIs = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/alerts/kpis`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AlertKPIs = await res.json();
      setKpis(data);
    } catch {
      // KPI fetch failure is non-critical
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    fetchKPIs();
  }, [ready, fetchKPIs]);

  useEffect(() => {
    if (!ready) return;
    fetchAlerts(page);
  }, [ready, page, fetchAlerts]);

  if (!ready) return null;

  const totalPages = Math.ceil(total / LIMIT);

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Failed to load alerts</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">Alerts</h1>

        {/* KPI Cards */}
        {kpis ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard label="Total" value={kpis.total} color="text-foreground" />
            <KpiCard label="Critical" value={kpis.critical} color="text-[var(--color-danger,#E53E3E)]" />
            <KpiCard label="Warning" value={kpis.warning} color="text-[var(--color-warning,#F6AD55)]" />
            <KpiCard label="Info" value={kpis.info} color="text-[var(--color-secondary,#56CDE7)]" />
            <KpiCard label="Unread" value={kpis.unread} color="text-[var(--color-accent,#5CE5A0)]" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 h-[72px] animate-pulse" />
            ))}
          </div>
        )}

        {/* Alert List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No alerts found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`px-4 py-3.5 hover:bg-muted/50 transition ${
                    alert.type === 'resolved' ? 'opacity-60' : ''
                  } ${!alert.isRead ? 'border-l-2 border-l-[var(--color-accent,#5CE5A0)]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{alertIcon(alert.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground leading-tight">{alert.title}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${sourceBadgeColor(alert.source)}`}>
                          {alert.source}
                          {alert.sourceId ? ` / ${alert.sourceId}` : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.description}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                      {timeAgo(alert.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} ({total} alerts)
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
