'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { type BoilerKPIs, type QueryParams } from '@/lib/api-dashboard';
import FilterBar from '@/components/dashboard/FilterBar';
import { getChartColors } from '@/lib/chartColors';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import {
  Flame, Cloud, TrendingUp, Thermometer, Droplets, Wind, AlertCircle, AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { formatTs, formatTsTooltip, detectGranularity } from '@/lib/formatTimestamp';

const tooltipStyle = {
  contentStyle: { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' },
  itemStyle: { color: 'hsl(var(--foreground))' },
  labelStyle: { color: 'hsl(var(--muted-foreground))' },
};
const GRID = 'hsl(var(--border))';
const AXIS = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export default function BoilerPage() {
  const ready = useAuth();
  const [filterParams, setFilterParams] = useState<QueryParams>({});
  const [chartColors, setChartColors] = useState(['#5CE5A0','#56CDE7','#F6AD55','#E53E3E','#4D65FF']);
  useEffect(() => { setChartColors(getChartColors()); }, []);
  const handleFilterChange = useCallback((p: QueryParams) => setFilterParams(p), []);
  const { kpis, charts, chartLoading, loading, error } = useDashboardData<BoilerKPIs>('boiler', filterParams);

  const boilerComparison = (charts['readings'] ?? []) as { boiler: string; efficiency: number; load: number; steamOutput: number }[];
  const efficiencyTrend = (charts['efficiency-trend'] ?? []) as { timestamp: number; blr01: number; blr02: number; blr03: number; blr04: number }[];
  const combustionAnalysis = (charts['combustion'] ?? []) as { boiler: string; o2: number; co2: number; co: number; nox: number }[];
  const steamVsFuel = (charts['steam-fuel'] ?? []) as { timestamp: number; steam: number; fuel: number }[];
  const emissionsGauges = (charts['emissions'] ?? []) as { pollutant: string; current: number; limit: number; unit: string }[];
  const stackTemperature = (charts['stack-temp'] ?? []) as { timestamp: number; blr01: number; blr02: number; blr03: number }[];

  const efficiencyGranularity = useMemo(() => detectGranularity(efficiencyTrend.map((d) => d.timestamp)), [efficiencyTrend]);
  const steamFuelGranularity = useMemo(() => detectGranularity(steamVsFuel.map((d) => d.timestamp)), [steamVsFuel]);
  const stackTempGranularity = useMemo(() => detectGranularity(stackTemperature.map((d) => d.timestamp)), [stackTemperature]);

  if (!ready) return null;
  if (error) return <div className="flex items-center justify-center min-h-[calc(100vh-64px)]"><p className="text-destructive">Error: {error}</p></div>;

  return (
    <div className="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold gradient-text">Boilers Overview</h1>
          <FilterBar onChange={handleFilterChange} />
        </div>

        {/* KPI Cards */}
        {kpis ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              label="Boilers Online"
              value={`${kpis.boilersOnline}/${kpis.boilersTotal}`}
              icon={<Flame className="w-5 h-5" style={{ color: chartColors[0] }} />}
              accent
            />
            <KpiCard
              label="Steam Output"
              value={String(kpis.totalSteamOutput)}
              unit="tonnes/h"
              icon={<Cloud className="w-5 h-5" style={{ color: chartColors[1] }} />}
            />
            <KpiCard
              label="Fleet Efficiency"
              value={String(kpis.fleetEfficiency)}
              unit="%"
              icon={<TrendingUp className="w-5 h-5" style={{ color: kpis.fleetEfficiency > 85 ? chartColors[0] : chartColors[2] }} />}
            />
            <KpiCard
              label="Avg Stack Temp"
              value={String(kpis.avgStackTemp)}
              unit="°C"
              icon={<Thermometer className="w-5 h-5" style={{ color: kpis.avgStackTemp > 200 ? chartColors[2] : chartColors[0] }} />}
            />
            <KpiCard
              label="Fuel Rate"
              value={String(kpis.totalFuelRate)}
              unit="m³/h"
              icon={<Droplets className="w-5 h-5" style={{ color: chartColors[1] }} />}
            />
            <KpiCard
              label="Avg O₂"
              value={String(kpis.avgO2)}
              unit="%"
              icon={<Wind className="w-5 h-5" style={{ color: kpis.avgO2 >= 2 && kpis.avgO2 <= 4 ? chartColors[0] : chartColors[2] }} />}
            />
            <KpiCard
              label="CO Emissions"
              value={String(kpis.coEmissions)}
              unit="ppm"
              icon={<AlertCircle className="w-5 h-5" style={{ color: kpis.coEmissions < 100 ? chartColors[0] : chartColors[3] }} />}
            />
            <KpiCard
              label="NOx Emissions"
              value={String(kpis.noxEmissions)}
              unit="mg/Nm³"
              icon={<AlertTriangle className="w-5 h-5" style={{ color: kpis.noxEmissions > 100 ? chartColors[2] : chartColors[0] }} />}
            />
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
          {/* 1. Boiler Fleet Comparison — Grouped Bar */}
          <ChartCard title="Boiler Fleet Comparison" loading={chartLoading['readings']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={boilerComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="boiler" tick={AXIS} />
                <YAxis tick={AXIS} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Bar dataKey="efficiency" fill={chartColors[0]} name="Efficiency" />
                <Bar dataKey="load" fill={chartColors[1]} name="Load" />
                <Bar dataKey="steamOutput" fill={chartColors[4]} name="Steam Output" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Efficiency Trend (7 days) — Multi Line */}
          <ChartCard title="Efficiency Trend (7 days)" loading={chartLoading['efficiency-trend']}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={efficiencyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="timestamp" tick={AXIS} tickFormatter={(ts) => formatTs(ts, efficiencyGranularity)} />
                <YAxis tick={AXIS} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <Legend />
                <Line type="monotone" dataKey="blr01" stroke={chartColors[4]} strokeWidth={2} dot={false} name="BLR-01" />
                <Line type="monotone" dataKey="blr02" stroke={chartColors[1]} strokeWidth={2} dot={false} name="BLR-02" />
                <Line type="monotone" dataKey="blr03" stroke={chartColors[0]} strokeWidth={2} dot={false} name="BLR-03" />
                <Line type="monotone" dataKey="blr04" stroke={chartColors[2]} strokeWidth={2} dot={false} name="BLR-04" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Combustion Analysis — Stacked Bar */}
          <ChartCard title="Combustion Analysis" loading={chartLoading['combustion']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combustionAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="boiler" tick={AXIS} />
                <YAxis tick={AXIS} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Bar dataKey="o2" stackId="a" fill={chartColors[1]} name="O₂" />
                <Bar dataKey="co2" stackId="a" fill={chartColors[4]} name="CO₂" />
                <Bar dataKey="co" stackId="a" fill={chartColors[2]} name="CO" />
                <Bar dataKey="nox" stackId="a" fill={chartColors[3]} name="NOx" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Steam Output vs Fuel Input (24h) — Dual Axis Area + Line */}
          <ChartCard title="Steam Output vs Fuel Input (24h)" loading={chartLoading['steam-fuel']}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={steamVsFuel}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="timestamp" tick={AXIS} tickFormatter={(ts) => formatTs(ts, steamFuelGranularity)} />
                <YAxis yAxisId="left" tick={AXIS} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="steam" stroke={chartColors[1]} fill={chartColors[1]} fillOpacity={0.3} name="Steam (tonnes/h)" />
                <Line yAxisId="right" type="monotone" dataKey="fuel" stroke={chartColors[2]} strokeWidth={2} dot={false} name="Fuel (m³/h)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 5. Emissions Status — Custom Progress Bars */}
          <ChartCard title="Emissions Status" loading={chartLoading['emissions']}>
            <div className="space-y-4 flex flex-col justify-center h-full">
              {emissionsGauges.map((e) => {
                const ratio = e.current / e.limit;
                return (
                  <div key={e.pollutant}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{e.pollutant}</span>
                      <span className="text-muted-foreground">{e.current}/{e.limit} {e.unit}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ratio * 100)}%`,
                          backgroundColor: ratio < 0.8 ? chartColors[0] : ratio < 1 ? chartColors[2] : chartColors[3],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          {/* 6. Stack Temperature (24h) — Multi Line with ReferenceLine */}
          <ChartCard title="Stack Temperature (24h)" loading={chartLoading['stack-temp']}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stackTemperature}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="timestamp" tick={AXIS} tickFormatter={(ts) => formatTs(ts, stackTempGranularity)} />
                <YAxis tick={AXIS} domain={[150, 230]} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <Legend />
                <ReferenceLine y={220} stroke={chartColors[3]} strokeDasharray="5 5" label={{ value: 'Alarm 220°C', fill: chartColors[3], fontSize: 10 }} />
                <Line type="monotone" dataKey="blr01" stroke={chartColors[4]} strokeWidth={2} dot={false} name="BLR-01" />
                <Line type="monotone" dataKey="blr02" stroke={chartColors[1]} strokeWidth={2} dot={false} name="BLR-02" />
                <Line type="monotone" dataKey="blr03" stroke={chartColors[0]} strokeWidth={2} dot={false} name="BLR-03" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
