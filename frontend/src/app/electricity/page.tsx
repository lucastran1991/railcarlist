'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { ElectricityKPIs, QueryParams } from '@/lib/api-dashboard';
import FilterBar from '@/components/dashboard/FilterBar';
import { useChartColors } from '@/lib/chartColors';
import { formatTs, formatTsTooltip, detectGranularity } from '@/lib/formatTimestamp';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Zap, Activity, TrendingUp, Gauge, DollarSign, Cloud, Shield, Thermometer, Loader2 } from 'lucide-react';
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

const GRID_STROKE = 'hsl(var(--border))';
const AXIS_STYLE = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export default function ElectricityPage() {
  const ready = useAuth();
  const [filterParams, setFilterParams] = useState<QueryParams>({});
  const { colors: chartColors } = useChartColors();
  const handleFilterChange = useCallback((p: QueryParams) => setFilterParams(p), []);
  const { kpis, charts, chartLoading, loading, error } = useDashboardData<ElectricityKPIs>('electricity', filterParams);

  // Chart data extraction
  const loadProfile = (charts['load-profiles'] ?? []) as { timestamp: number; actual: number; planned: number; threshold: number }[];
  const weeklyConsumption = (charts['weekly-consumption'] ?? []) as { timestamp: number; thisWeek: number; lastWeek: number }[];
  const powerFactorTrend = (charts['power-factor'] ?? []) as { timestamp: number; value: number }[];
  const costBreakdown = (charts['cost-breakdown'] ?? []) as { source: string; cost: number; color: string }[];
  const peakDemandHistory = (charts['peak-demand'] ?? []) as { timestamp: number; peak: number }[];
  const phaseBalance = (charts['phase-balance'] ?? []) as { timestamp: number; phaseA: number; phaseB: number; phaseC: number }[];

  // useMemo hooks
  const loadProfileGranularity = useMemo(() => detectGranularity(loadProfile.map(d => d.timestamp)), [loadProfile]);
  const weeklyGranularity = useMemo(() => detectGranularity(weeklyConsumption.map(d => d.timestamp)), [weeklyConsumption]);
  const powerFactorGranularity = useMemo(() => detectGranularity(powerFactorTrend.map(d => d.timestamp)), [powerFactorTrend]);
  const peakDemandGranularity = useMemo(() => detectGranularity(peakDemandHistory.map(d => d.timestamp)), [peakDemandHistory]);
  const phaseBalanceGranularity = useMemo(() => detectGranularity(phaseBalance.map(d => d.timestamp)), [phaseBalance]);

  const totalCost = costBreakdown.reduce((s, c) => s + c.cost, 0);

  // Early returns
  if (!ready) return null;

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Failed to load data</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold gradient-text">Electricity Overview</h1>
          <FilterBar onChange={handleFilterChange} />
        </div>

        {/* KPI Grid */}
        {kpis ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard label="Total Consumption" value={kpis.totalConsumption.toLocaleString()} unit="kWh" icon={<Zap className="w-5 h-5" style={{ color: chartColors[1] }} />} />
            <KpiCard label="Real-time Demand" value={kpis.realTimeDemand.toLocaleString()} unit="kW" icon={<Activity className="w-5 h-5" style={{ color: chartColors[0] }} />} />
            <KpiCard label="Peak Demand" value={kpis.peakDemand.toLocaleString()} unit="kW" icon={<TrendingUp className="w-5 h-5" style={{ color: chartColors[2] }} />} />
            <KpiCard label="Power Factor" value={kpis.powerFactor.toFixed(2)} icon={<Gauge className="w-5 h-5" style={{ color: kpis.powerFactor > 0.93 ? chartColors[0] : chartColors[2] }} />} />
            <KpiCard label="Energy Cost" value={`$${kpis.energyCost.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" style={{ color: chartColors[1] }} />} />
            <KpiCard label="Carbon Emissions" value={kpis.carbonEmissions.toFixed(2)} unit="tonnes" icon={<Cloud className="w-5 h-5" style={{ color: chartColors[0] }} />} />
            <KpiCard label="Grid Availability" value={kpis.gridAvailability.toFixed(1)} unit="%" icon={<Shield className="w-5 h-5" style={{ color: chartColors[0] }} />} />
            <KpiCard label="Transformer Load" value={kpis.transformerLoad.toString()} unit="%" icon={<Thermometer className="w-5 h-5" style={{ color: kpis.transformerLoad > 80 ? chartColors[2] : chartColors[1] }} />} />
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
          {/* 1. 24h Load Profile */}
          <ChartCard title="24h Load Profile" loading={chartLoading['load-profiles']}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={loadProfile}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="timestamp" tickFormatter={(ts) => formatTs(ts, loadProfileGranularity)} tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <Legend />
                <ReferenceLine y={4000} stroke={chartColors[3]} strokeDasharray="6 3" label={{ value: 'Threshold', fill: chartColors[3], fontSize: 10 }} />
                <Area type="monotone" dataKey="actual" stroke={chartColors[4]} fill={chartColors[4]} fillOpacity={0.3} strokeWidth={2} name="Actual" />
                <Line type="monotone" dataKey="planned" stroke={chartColors[0]} strokeWidth={2} dot={false} name="Planned" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Weekly Consumption */}
          <ChartCard title="Weekly Consumption" loading={chartLoading['weekly-consumption']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyConsumption}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="timestamp" tickFormatter={(ts) => formatTs(ts, weeklyGranularity)} tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <Legend />
                <Bar dataKey="thisWeek" fill={chartColors[1]} name="This Week" />
                <Bar dataKey="lastWeek" fill={chartColors[4]} name="Last Week" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Power Factor Trend */}
          <ChartCard title="Power Factor Trend" loading={chartLoading['power-factor']}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={powerFactorTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="timestamp" tickFormatter={(ts) => formatTs(ts, powerFactorGranularity)} tick={AXIS_STYLE} />
                <YAxis domain={[0.88, 1.0]} tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <ReferenceLine y={0.95} stroke={chartColors[0]} strokeDasharray="6 3" label={{ value: 'Target 0.95', fill: chartColors[0], fontSize: 10 }} />
                <Line type="monotone" dataKey="value" stroke={chartColors[2]} strokeWidth={2} dot={{ r: 3 }} name="Power Factor" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Cost Breakdown */}
          <ChartCard title="Cost Breakdown" loading={chartLoading['cost-breakdown']}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costBreakdown}
                  dataKey="cost"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}
                >
                  {costBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-sm font-bold">
                  ${totalCost.toLocaleString()}
                </text>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 5. Peak Demand History */}
          <ChartCard title="Peak Demand History (30d)" loading={chartLoading['peak-demand']}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={peakDemandHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="timestamp" tickFormatter={(ts) => formatTs(ts, peakDemandGranularity)} tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <ReferenceLine y={4200} stroke={chartColors[3]} strokeDasharray="6 3" label={{ value: 'Contract 4200 kW', fill: chartColors[3], fontSize: 10 }} />
                <Area type="monotone" dataKey="peak" stroke={chartColors[2]} fill={chartColors[2]} fillOpacity={0.25} strokeWidth={2} name="Peak Demand" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 6. Phase Balance */}
          <ChartCard title="Phase Balance (A)" loading={chartLoading['phase-balance']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseBalance}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="timestamp" tickFormatter={(ts) => formatTs(ts, phaseBalanceGranularity)} tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <Legend />
                <Bar dataKey="phaseA" fill={chartColors[3]} name="Phase A" />
                <Bar dataKey="phaseB" fill={chartColors[2]} name="Phase B" />
                <Bar dataKey="phaseC" fill={chartColors[4]} name="Phase C" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
