'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { type TankKPIs, type QueryParams } from '@/lib/api-dashboard';
import FilterBar from '@/components/dashboard/FilterBar';
import { useChartColors } from '@/lib/chartColors';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Database, BarChart3, CheckCircle, Activity, Thermometer, AlertTriangle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatTs, formatTsTooltip, detectGranularity } from '@/lib/formatTimestamp';

const tooltipStyle = {
  contentStyle: { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' },
  itemStyle: { color: 'hsl(var(--foreground))' },
  labelStyle: { color: 'hsl(var(--muted-foreground))' },
};
const GRID = 'hsl(var(--border))';
const AXIS = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export default function TankPage() {
  const ready = useAuth();
  const [filterParams, setFilterParams] = useState<QueryParams>({});
  const { colors: chartColors } = useChartColors();
  const handleFilterChange = useCallback((p: QueryParams) => setFilterParams(p), []);
  const { kpis, charts, chartLoading, loading, error } = useDashboardData<TankKPIs>('tank', filterParams);

  // Chart data extraction
  const tankLevels = (charts['levels'] ?? []) as { tank: string; product: string; level: number; capacity: number; volume: number; color: string }[];
  const inventoryTrend = (charts['inventory-trend'] ?? []) as { timestamp: number; gasoline: number; diesel: number; crude: number; ethanol: number; lpg: number }[];
  const throughput = (charts['throughput'] ?? []) as { timestamp: number; receipts: number; dispatches: number }[];
  const productDistribution = (charts['product-distribution'] ?? []) as { product: string; volume: number; color: string }[];
  const tankLevelChanges = (charts['level-changes'] ?? []) as { tank: string; change: number }[];
  const tankTemperatures = (charts['temperatures'] ?? []) as { tank: string; t00: number; t06: number; t12: number; t18: number }[];

  // useMemo hooks
  const inventoryGranularity = useMemo(() => detectGranularity(inventoryTrend.map((d) => d.timestamp)), [inventoryTrend]);
  const throughputGranularity = useMemo(() => detectGranularity(throughput.map((d) => d.timestamp)), [throughput]);

  const distributionTotal = productDistribution.reduce((s, d) => s + d.volume, 0);

  // Early returns
  if (!ready) return null;
  if (error) return <div className="flex items-center justify-center min-h-[calc(100vh-64px)]"><p className="text-destructive">Error: {error}</p></div>;

  return (
    <div className="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tank Dashboard</h1>
          <FilterBar onChange={handleFilterChange} />
        </div>

        {/* KPI Cards */}
        {kpis ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard label="Total Inventory" value={kpis.totalInventory.toLocaleString()} unit="bbl" icon={<Database className="w-5 h-5" style={{ color: chartColors[1] }} />} />
            <KpiCard label="Available Capacity" value={kpis.availableCapacity.toString()} unit="%" icon={<BarChart3 className="w-5 h-5" style={{ color: kpis.availableCapacity > 30 ? chartColors[0] : chartColors[3] }} />} />
            <KpiCard label="Tanks Online" value={`${kpis.tanksInOperation}/${kpis.tanksTotal}`} icon={<CheckCircle className="w-5 h-5" style={{ color: chartColors[0] }} />} />
            <KpiCard label="Throughput" value={kpis.currentThroughput.toLocaleString()} unit="bbl/h" icon={<Activity className="w-5 h-5" style={{ color: chartColors[1] }} />} />
            <KpiCard label="Avg Temperature" value={kpis.avgTemperature.toString()} unit="°C" icon={<Thermometer className="w-5 h-5" style={{ color: chartColors[0] }} />} />
            <KpiCard label="Active Alarms" value={kpis.activeAlarms.toString()} icon={<AlertTriangle className="w-5 h-5" style={{ color: kpis.activeAlarms > 0 ? chartColors[3] : chartColors[0] }} />} />
            <KpiCard label="Daily Receipts" value={kpis.dailyReceipts.toLocaleString()} unit="bbl" icon={<ArrowDownCircle className="w-5 h-5" style={{ color: chartColors[0] }} />} />
            <KpiCard label="Daily Dispatches" value={kpis.dailyDispatches.toLocaleString()} unit="bbl" icon={<ArrowUpCircle className="w-5 h-5" style={{ color: chartColors[2] }} />} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-3 sm:p-4 h-[72px] animate-pulse" />
            ))}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* 1. Tank Levels */}
          <ChartCard title="Tank Levels" loading={chartLoading['levels']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tankLevels} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis type="number" tick={AXIS} domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="tank" tick={AXIS} width={60} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => `${value}%`} />
                <Bar dataKey="level" name="Level %">
                  {tankLevels.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Inventory Trend (7 days) */}
          <ChartCard title="Inventory Trend (7 days)" loading={chartLoading['inventory-trend']}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={inventoryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="timestamp" tick={AXIS} tickFormatter={(ts) => formatTs(ts, inventoryGranularity)} />
                <YAxis tick={AXIS} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="gasoline" stroke={chartColors[2]} strokeWidth={2} dot={false} name="Gasoline" />
                <Line type="monotone" dataKey="diesel" stroke={chartColors[4]} strokeWidth={2} dot={false} name="Diesel" />
                <Line type="monotone" dataKey="crude" stroke={chartColors[1]} strokeWidth={2} dot={false} name="Crude" />
                <Line type="monotone" dataKey="ethanol" stroke={chartColors[0]} strokeWidth={2} dot={false} name="Ethanol" />
                <Line type="monotone" dataKey="lpg" stroke={chartColors[5] ?? '#9F7AEA'} strokeWidth={2} dot={false} name="LPG" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Throughput — Receipts vs Dispatches */}
          <ChartCard title="Throughput — Receipts vs Dispatches" loading={chartLoading['throughput']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughput}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="timestamp" tick={AXIS} tickFormatter={(ts) => formatTs(ts, throughputGranularity)} />
                <YAxis tick={AXIS} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Bar dataKey="receipts" fill={chartColors[0]} name="Receipts" />
                <Bar dataKey="dispatches" fill={chartColors[2]} name="Dispatches" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Product Distribution */}
          <ChartCard title="Product Distribution" loading={chartLoading['product-distribution']}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productDistribution}
                  dataKey="volume"
                  nameKey="product"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ product, percent }) => `${product} ${(percent * 100).toFixed(0)}%`}
                >
                  {productDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(value: number) => value.toLocaleString()} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-lg font-bold">
                  {(distributionTotal / 1000).toFixed(0)}k
                </text>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 5. Tank Level Changes (24h) */}
          <ChartCard title="Tank Level Changes (24h)" loading={chartLoading['level-changes']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tankLevelChanges}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="tank" tick={AXIS} />
                <YAxis tick={AXIS} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => value.toLocaleString()} />
                <Bar dataKey="change" name="Change (bbl)">
                  {tankLevelChanges.map((entry, i) => (
                    <Cell key={i} fill={entry.change >= 0 ? chartColors[0] : chartColors[3]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 6. Tank Temperatures */}
          <ChartCard title="Tank Temperatures" loading={chartLoading['temperatures']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tankTemperatures}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="tank" tick={AXIS} />
                <YAxis tick={AXIS} unit="°C" />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Bar dataKey="t00" fill={chartColors[4]} name="00:00" />
                <Bar dataKey="t06" fill={chartColors[1]} name="06:00" />
                <Bar dataKey="t12" fill={chartColors[2]} name="12:00" />
                <Bar dataKey="t18" fill={chartColors[0]} name="18:00" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
