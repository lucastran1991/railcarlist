'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatTs, formatTsTooltip, detectGranularity } from '@/lib/formatTimestamp';
import type { SteamKPIs, QueryParams } from '@/lib/api-dashboard';
import FilterBar from '@/components/dashboard/FilterBar';
import { useChartColors } from '@/lib/chartColors';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Flame, Activity, Gauge, Thermometer, TrendingUp, Droplets, Waves, Fuel } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

const tooltipStyle = {
  contentStyle: { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' },
  itemStyle: { color: 'hsl(var(--foreground))' },
  labelStyle: { color: 'hsl(var(--muted-foreground))' },
  cursor: { fill: 'hsl(var(--muted) / 0.3)' },
};
const GRID = 'hsl(var(--border))';
const AXIS = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export default function SteamPage() {
  const ready = useAuth();
  const [filterParams, setFilterParams] = useState<QueryParams>({});
  const { colors: chartColors } = useChartColors();
  const handleFilterChange = useCallback((p: QueryParams) => setFilterParams(p), []);
  const { kpis, charts, chartLoading, loading, error } = useDashboardData<SteamKPIs>('steam', filterParams);

  // Chart data extraction
  const steamBalance = (charts['balance'] ?? []) as { timestamp: number; boiler1: number; boiler2: number; boiler3: number; demand: number }[];
  const headerPressureTrend = (charts['header-pressure'] ?? []) as { timestamp: number; hp: number; mp: number; lp: number }[];
  const steamDistribution = (charts['distribution'] ?? []) as { consumer: string; value: number; color: string }[];
  const condensateRecoveryTrend = (charts['condensate'] ?? []) as { timestamp: number; recovery: number }[];
  const fuelVsSteam = (charts['fuel-ratio'] ?? []) as { timestamp: number; fuel: number; steam: number }[];
  const steamLoss = (charts['loss'] ?? []) as { location: string; loss: number; trapsTotal: number; trapsFailed: number }[];

  // useMemo hooks
  const balanceGranularity = useMemo(() => detectGranularity(steamBalance.map((d) => d.timestamp)), [steamBalance]);
  const pressureGranularity = useMemo(() => detectGranularity(headerPressureTrend.map((d) => d.timestamp)), [headerPressureTrend]);
  const condensateGranularity = useMemo(() => detectGranularity(condensateRecoveryTrend.map((d) => d.timestamp)), [condensateRecoveryTrend]);
  const fuelGranularity = useMemo(() => detectGranularity(fuelVsSteam.map((d) => d.timestamp)), [fuelVsSteam]);

  // Early returns
  if (!ready) return null;

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-destructive">Failed to load steam data: {error}</p>
      </div>
    );
  }

  const supplyGtDemand = kpis ? kpis.totalProduction > kpis.totalDemand : false;
  const distributionTotal = steamDistribution.reduce((s, d) => s + d.value, 0);

  const lossMax = Math.max(...steamLoss.map((l) => l.loss), 0);
  const getLossColor = (loss: number) => {
    if (lossMax === 0) return chartColors[0];
    const ratio = loss / lossMax;
    if (ratio > 0.7) return chartColors[3];
    if (ratio > 0.4) return chartColors[2];
    return chartColors[0];
  };

  return (
    <div className="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Steam Dashboard</h1>
          <FilterBar onChange={handleFilterChange} />
        </div>

        {/* KPI Cards */}
        {kpis ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard label="Total Production" value={kpis.totalProduction.toFixed(1)} unit="tonnes/h" icon={<Flame className="w-5 h-5" style={{ color: chartColors[1] }} />} />
            <KpiCard label="Total Demand" value={kpis.totalDemand.toFixed(1)} unit="tonnes/h" icon={<Activity className="w-5 h-5" style={{ color: supplyGtDemand ? chartColors[0] : chartColors[3] }} />} />
            <KpiCard label="Header Pressure" value={kpis.headerPressure.toFixed(1)} unit="bar" icon={<Gauge className="w-5 h-5" style={{ color: chartColors[0] }} />} />
            <KpiCard label="Steam Temperature" value={kpis.steamTemperature.toString()} unit="°C" icon={<Thermometer className="w-5 h-5" style={{ color: chartColors[2] }} />} />
            <KpiCard label="System Efficiency" value={kpis.systemEfficiency.toFixed(1)} unit="%" icon={<TrendingUp className="w-5 h-5" style={{ color: kpis.systemEfficiency > 85 ? chartColors[0] : chartColors[2] }} />} />
            <KpiCard label="Condensate Recovery" value={kpis.condensateRecovery.toString()} unit="%" icon={<Droplets className="w-5 h-5" style={{ color: kpis.condensateRecovery > 80 ? chartColors[0] : chartColors[2] }} />} />
            <KpiCard label="Makeup Water" value={kpis.makeupWaterFlow.toFixed(1)} unit="m³/h" icon={<Waves className="w-5 h-5" style={{ color: chartColors[1] }} />} />
            <KpiCard label="Fuel Consumption" value={kpis.fuelConsumption.toLocaleString()} unit="m³/h" icon={<Fuel className="w-5 h-5" style={{ color: chartColors[2] }} />} />
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
          {/* 1. Steam Balance — Supply vs Demand */}
          <ChartCard title="Steam Balance — Supply vs Demand" loading={chartLoading['balance']}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={steamBalance}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="timestamp" tick={AXIS} tickFormatter={(ts) => formatTs(ts, balanceGranularity)} />
                <YAxis tick={AXIS} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <Legend />
                <Area type="monotone" dataKey="boiler1" stackId="supply" stroke={chartColors[4]} fill={chartColors[4]} fillOpacity={0.6} name="Boiler 1" />
                <Area type="monotone" dataKey="boiler2" stackId="supply" stroke={chartColors[1]} fill={chartColors[1]} fillOpacity={0.6} name="Boiler 2" />
                <Area type="monotone" dataKey="boiler3" stackId="supply" stroke={chartColors[0]} fill={chartColors[0]} fillOpacity={0.6} name="Boiler 3" />
                <Line type="monotone" dataKey="demand" stroke={chartColors[3]} strokeWidth={2} dot={false} name="Demand" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Header Pressure Trend */}
          <ChartCard title="Header Pressure Trend" loading={chartLoading['header-pressure']}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={headerPressureTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="timestamp" tick={AXIS} tickFormatter={(ts) => formatTs(ts, pressureGranularity)} />
                <YAxis tick={AXIS} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <Legend />
                <Line type="monotone" dataKey="hp" stroke={chartColors[3]} strokeWidth={2} dot={false} name="HP" />
                <Line type="monotone" dataKey="mp" stroke={chartColors[2]} strokeWidth={2} dot={false} name="MP" />
                <Line type="monotone" dataKey="lp" stroke={chartColors[1]} strokeWidth={2} dot={false} name="LP" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Steam Distribution by Consumer */}
          <ChartCard title="Steam Distribution by Consumer" loading={chartLoading['distribution']}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={steamDistribution}
                  dataKey="value"
                  nameKey="consumer"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ consumer, percent }) => `${consumer} ${(percent * 100).toFixed(0)}%`}
                >
                  {steamDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-lg font-bold">
                  {distributionTotal.toFixed(1)}
                </text>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Condensate Recovery Rate */}
          <ChartCard title="Condensate Recovery Rate" loading={chartLoading['condensate']}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={condensateRecoveryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="timestamp" tick={AXIS} tickFormatter={(ts) => formatTs(ts, condensateGranularity)} />
                <YAxis tick={AXIS} domain={[70, 95]} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <ReferenceLine y={85} stroke={chartColors[0]} strokeDasharray="6 4" label={{ value: 'Target 85%', fill: chartColors[0], fontSize: 11 }} />
                <Area type="monotone" dataKey="recovery" stroke={chartColors[1]} fill={chartColors[1]} fillOpacity={0.3} name="Recovery %" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 5. Fuel Input vs Steam Output */}
          <ChartCard title="Fuel Input vs Steam Output" loading={chartLoading['fuel-ratio']}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis type="number" dataKey="fuel" name="Fuel (m³/h)" tick={AXIS} label={{ value: 'Fuel (m³/h)', position: 'insideBottom', offset: -5, style: AXIS }} />
                <YAxis type="number" dataKey="steam" name="Steam (t/h)" tick={AXIS} label={{ value: 'Steam (t/h)', angle: -90, position: 'insideLeft', style: AXIS }} />
                <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: '3 3' }} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <Scatter data={fuelVsSteam} fill={chartColors[4]} name="Fuel vs Steam" />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 6. Steam Loss by Location */}
          <ChartCard title="Steam Loss by Location" loading={chartLoading['loss']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={steamLoss} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis type="number" tick={AXIS} />
                <YAxis type="category" dataKey="location" tick={AXIS} width={110} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="loss" name="Loss (t/h)">
                  {steamLoss.map((entry, i) => (
                    <Cell key={i} fill={getLossColor(entry.loss)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
