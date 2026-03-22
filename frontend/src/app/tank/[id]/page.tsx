'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config';
import { formatTs, formatTsTooltip, detectGranularity } from '@/lib/formatTimestamp';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import {
  Droplets, Package, Gauge, Thermometer, TrendingUp, TrendingDown,
  ArrowLeft, Loader2, BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import Link from 'next/link';
import { PRODUCT_COLORS, levelColor, fmtPercent, fmtVolume } from '@/lib/tankData';

interface TankLevel {
  tank: string; product: string; level: number; volume: number; capacity: number; color: string;
}
interface TrendPoint { timestamp: number; gasoline: number; diesel: number; crude: number; ethanol: number; }
interface ThroughputPoint { timestamp: number; receipts: number; dispatches: number; }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{typeof label === 'number' ? formatTsTooltip(label) : label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono">{p.name}: {p.value.toLocaleString()}</p>
      ))}
    </div>
  );
}

export default function TankDetailPage() {
  const ready = useAuth();
  const params = useParams();
  const tankId = params.id as string;

  const [tank, setTank] = useState<TankLevel | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [throughput, setThroughput] = useState<ThroughputPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = `${API_BASE_URL}${API_ENDPOINTS.tank}`;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const start = thirtyDaysAgo.toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];

    Promise.all([
      fetch(`${base}/levels`).then(r => r.json()),
      fetch(`${base}/inventory-trend?start=${start}&end=${end}`).then(r => r.json()),
      fetch(`${base}/throughput?start=${start}&end=${end}`).then(r => r.json()),
    ]).then(([levels, trendResp, throughputResp]) => {
      const allLevels: TankLevel[] = Array.isArray(levels) ? levels : levels.data ?? [];
      setTank(allLevels.find(t => t.tank === tankId) ?? null);
      setTrend(Array.isArray(trendResp) ? trendResp : trendResp.data ?? []);
      setThroughput(Array.isArray(throughputResp) ? throughputResp : throughputResp.data ?? []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [tankId]);

  const trendGranularity = useMemo(() => detectGranularity(trend.map(d => d.timestamp)), [trend]);
  const throughputGranularity = useMemo(() => detectGranularity(throughput.map(d => d.timestamp)), [throughput]);

  if (!ready) return null;
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tank) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Link href="/tank" className="text-sm text-[#5CE5A0] hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to Tanks
        </Link>
        <p className="text-muted-foreground">Tank {tankId} not found.</p>
      </div>
    );
  }

  const prodColor = PRODUCT_COLORS[tank.product] ?? '#888';
  const lvlColor = levelColor(tank.level);
  const available = tank.capacity - tank.volume;

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <Link href="/tank" className="text-xs sm:text-sm text-[#5CE5A0] hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Back to Tanks
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${prodColor}20` }}>
          <Package size={20} style={{ color: prodColor }} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{tank.tank}</h1>
          <p className="text-sm text-muted-foreground">{tank.product} Storage Tank</p>
        </div>
        <span className="ml-auto text-xs px-2 py-1 rounded-lg font-medium" style={{ backgroundColor: `${prodColor}20`, color: prodColor }}>
          {tank.product}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <KpiCard icon={<Gauge size={18} style={{ color: lvlColor }} />} label="Level" value={fmtPercent(tank.level)} />
        <KpiCard icon={<Droplets size={18} style={{ color: prodColor }} />} label="Volume" value={fmtVolume(tank.volume)} unit="bbl" />
        <KpiCard icon={<Package size={18} className="text-muted-foreground" />} label="Capacity" value={fmtVolume(tank.capacity)} unit="bbl" />
        <KpiCard icon={<BarChart3 size={18} className="text-[#5CE5A0]" />} label="Available" value={fmtVolume(available)} unit="bbl" />
        <KpiCard icon={<TrendingUp size={18} style={{ color: lvlColor }} />} label="Utilization" value={fmtPercent(tank.level)} />
        <KpiCard icon={<Thermometer size={18} className={tank.level > 10 ? 'text-[#5CE5A0]' : 'text-[#E53E3E]'} />} label="Status" value={tank.level > 10 ? 'Active' : 'Low'} />
      </div>

      {/* Level bar */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Tank Fill Level</span>
          <span className="text-lg font-bold" style={{ color: lvlColor }}>{fmtPercent(tank.level)}</span>
        </div>
        <div className="w-full h-4 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, tank.level)}%`, backgroundColor: lvlColor }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>0%</span>
          <span>{fmtVolume(tank.volume)} / {fmtVolume(tank.capacity)} bbl</span>
          <span>100%</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="Inventory Trend (30 days)">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id={`grad-${tank.product}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={prodColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={prodColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="timestamp" tickFormatter={(ts) => formatTs(ts, trendGranularity)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey={tank.product.toLowerCase()} stroke={prodColor} strokeWidth={2} fill={`url(#grad-${tank.product})`} name={tank.product} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Receipts vs Dispatches (30 days)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={throughput}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="timestamp" tickFormatter={(ts) => formatTs(ts, throughputGranularity)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="receipts" fill="#5CE5A0" radius={[2, 2, 0, 0]} name="Receipts" />
              <Bar dataKey="dispatches" fill="#56CDE7" radius={[2, 2, 0, 0]} name="Dispatches" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
