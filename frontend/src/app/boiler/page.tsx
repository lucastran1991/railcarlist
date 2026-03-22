'use client';

import { useAuth } from '@/lib/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { type BoilerKPIs } from '@/lib/api-dashboard';
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

const tooltipStyle = {
  contentStyle: { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' },
  itemStyle: { color: 'hsl(var(--foreground))' },
  labelStyle: { color: 'hsl(var(--muted-foreground))' },
};
const GRID = 'hsl(var(--border))';
const AXIS = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export default function BoilerPage() {
  const ready = useAuth();
  const { kpis, charts, loading, error } = useDashboardData<BoilerKPIs>('boiler');

  if (!ready) return null;
  if (loading) return <div className="flex items-center justify-center min-h-[calc(100vh-64px)]"><p className="text-muted-foreground">Loading...</p></div>;
  if (error) return <div className="flex items-center justify-center min-h-[calc(100vh-64px)]"><p className="text-destructive">Error: {error}</p></div>;
  if (!kpis) return null;

  const boilerComparison = (charts['readings'] ?? []) as { boiler: string; efficiency: number; load: number; steamOutput: number }[];
  const efficiencyTrend = (charts['efficiency-trend'] ?? []) as { date: string; blr01: number; blr02: number; blr03: number; blr04: number }[];
  const combustionAnalysis = (charts['combustion'] ?? []) as { boiler: string; o2: number; co2: number; co: number; nox: number }[];
  const steamVsFuel = (charts['steam-fuel'] ?? []) as { hour: string; steam: number; fuel: number }[];
  const emissionsGauges = (charts['emissions'] ?? []) as { pollutant: string; current: number; limit: number; unit: string }[];
  const stackTemperature = (charts['stack-temp'] ?? []) as { hour: string; blr01: number; blr02: number; blr03: number }[];

  return (
    <div className="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">Boilers Overview</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            label="Boilers Online"
            value={`${kpis.boilersOnline}/${kpis.boilersTotal}`}
            icon={<Flame className="w-5 h-5 text-[#5CE5A0]" />}
            accent
          />
          <KpiCard
            label="Steam Output"
            value={String(kpis.totalSteamOutput)}
            unit="tonnes/h"
            icon={<Cloud className="w-5 h-5 text-[#56CDE7]" />}
          />
          <KpiCard
            label="Fleet Efficiency"
            value={String(kpis.fleetEfficiency)}
            unit="%"
            icon={<TrendingUp className={`w-5 h-5 ${kpis.fleetEfficiency > 85 ? 'text-[#5CE5A0]' : 'text-[#F6AD55]'}`} />}
          />
          <KpiCard
            label="Avg Stack Temp"
            value={String(kpis.avgStackTemp)}
            unit="°C"
            icon={<Thermometer className={`w-5 h-5 ${kpis.avgStackTemp > 200 ? 'text-[#F6AD55]' : 'text-[#5CE5A0]'}`} />}
          />
          <KpiCard
            label="Fuel Rate"
            value={String(kpis.totalFuelRate)}
            unit="m³/h"
            icon={<Droplets className="w-5 h-5 text-[#56CDE7]" />}
          />
          <KpiCard
            label="Avg O₂"
            value={String(kpis.avgO2)}
            unit="%"
            icon={<Wind className={`w-5 h-5 ${kpis.avgO2 >= 2 && kpis.avgO2 <= 4 ? 'text-[#5CE5A0]' : 'text-[#F6AD55]'}`} />}
          />
          <KpiCard
            label="CO Emissions"
            value={String(kpis.coEmissions)}
            unit="ppm"
            icon={<AlertCircle className={`w-5 h-5 ${kpis.coEmissions < 100 ? 'text-[#5CE5A0]' : 'text-[#E53E3E]'}`} />}
          />
          <KpiCard
            label="NOx Emissions"
            value={String(kpis.noxEmissions)}
            unit="mg/Nm³"
            icon={<AlertTriangle className={`w-5 h-5 ${kpis.noxEmissions > 100 ? 'text-[#F6AD55]' : 'text-[#5CE5A0]'}`} />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* 1. Boiler Fleet Comparison — Grouped Bar */}
          <ChartCard title="Boiler Fleet Comparison">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={boilerComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="boiler" tick={AXIS} />
                <YAxis tick={AXIS} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Bar dataKey="efficiency" fill="#5CE5A0" name="Efficiency" />
                <Bar dataKey="load" fill="#56CDE7" name="Load" />
                <Bar dataKey="steamOutput" fill="#4D65FF" name="Steam Output" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Efficiency Trend (7 days) — Multi Line */}
          <ChartCard title="Efficiency Trend (7 days)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={efficiencyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="date" tick={AXIS} />
                <YAxis tick={AXIS} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="blr01" stroke="#4D65FF" strokeWidth={2} dot={false} name="BLR-01" />
                <Line type="monotone" dataKey="blr02" stroke="#56CDE7" strokeWidth={2} dot={false} name="BLR-02" />
                <Line type="monotone" dataKey="blr03" stroke="#5CE5A0" strokeWidth={2} dot={false} name="BLR-03" />
                <Line type="monotone" dataKey="blr04" stroke="#F6AD55" strokeWidth={2} dot={false} name="BLR-04" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Combustion Analysis — Stacked Bar */}
          <ChartCard title="Combustion Analysis">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combustionAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="boiler" tick={AXIS} />
                <YAxis tick={AXIS} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Bar dataKey="o2" stackId="a" fill="#56CDE7" name="O₂" />
                <Bar dataKey="co2" stackId="a" fill="#4D65FF" name="CO₂" />
                <Bar dataKey="co" stackId="a" fill="#F6AD55" name="CO" />
                <Bar dataKey="nox" stackId="a" fill="#E53E3E" name="NOx" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Steam Output vs Fuel Input (24h) — Dual Axis Area + Line */}
          <ChartCard title="Steam Output vs Fuel Input (24h)">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={steamVsFuel}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="hour" tick={AXIS} />
                <YAxis yAxisId="left" tick={AXIS} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="steam" stroke="#56CDE7" fill="#56CDE7" fillOpacity={0.3} name="Steam (tonnes/h)" />
                <Line yAxisId="right" type="monotone" dataKey="fuel" stroke="#F6AD55" strokeWidth={2} dot={false} name="Fuel (m³/h)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 5. Emissions Status — Custom Progress Bars */}
          <ChartCard title="Emissions Status">
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
                          backgroundColor: ratio < 0.8 ? '#5CE5A0' : ratio < 1 ? '#F6AD55' : '#E53E3E',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          {/* 6. Stack Temperature (24h) — Multi Line with ReferenceLine */}
          <ChartCard title="Stack Temperature (24h)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stackTemperature}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="hour" tick={AXIS} />
                <YAxis tick={AXIS} domain={[150, 230]} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <ReferenceLine y={220} stroke="#E53E3E" strokeDasharray="5 5" label={{ value: 'Alarm 220°C', fill: '#E53E3E', fontSize: 10 }} />
                <Line type="monotone" dataKey="blr01" stroke="#4D65FF" strokeWidth={2} dot={false} name="BLR-01" />
                <Line type="monotone" dataKey="blr02" stroke="#56CDE7" strokeWidth={2} dot={false} name="BLR-02" />
                <Line type="monotone" dataKey="blr03" stroke="#5CE5A0" strokeWidth={2} dot={false} name="BLR-03" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
