'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { type SubStationKPIs, type QueryParams } from '@/lib/api-dashboard';
import FilterBar from '@/components/dashboard/FilterBar';
import PageBanner from '@/components/PageBanner';
import { useChartColors } from '@/lib/chartColors';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Zap, Activity, Thermometer, Radio, BarChart3, Shield, AlertTriangle, Gauge } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatTs, formatTsTooltip, detectGranularity } from '@/lib/formatTimestamp';

const tooltipStyle = {
  contentStyle: { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' },
  itemStyle: { color: 'hsl(var(--foreground))' },
  labelStyle: { color: 'hsl(var(--muted-foreground))' },
  cursor: { fill: 'hsl(var(--muted) / 0.3)' },
};

const GRID_STROKE = 'hsl(var(--border))';
const AXIS_STYLE = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export default function SubStationPage() {
  const ready = useAuth();
  const [filterParams, setFilterParams] = useState<QueryParams>({});
  const { colors: chartColors } = useChartColors();
  const handleFilterChange = useCallback((p: QueryParams) => setFilterParams(p), []);

  const getLoadingColor = (loading: number) => {
    if (loading > 90) return chartColors[3];
    if (loading >= 70) return chartColors[2];
    return chartColors[0];
  };
  const { kpis, charts, chartLoading, loading, error } = useDashboardData<SubStationKPIs>('substation', filterParams);

  // Chart data extraction
  const voltageProfile = (charts['voltage-profile'] ?? []) as { timestamp: number; vRY: number; vYB: number; vBR: number }[];
  const transformerLoading = (charts['transformers'] ?? []) as { name: string; loading: number; capacity: number; unit: string }[];
  const harmonicSpectrum = (charts['harmonics'] ?? []) as { order: string; magnitude: number }[];
  const transformerTemperature = (charts['transformer-temp'] ?? []) as { timestamp: number; oilTemp: number; windingTemp: number }[];
  const feederDistribution = (charts['feeder-distribution'] ?? []) as { timestamp: number; feeder1: number; feeder2: number; feeder3: number; feeder4: number; feeder5: number }[];
  const faultEvents = (charts['fault-events'] ?? []) as { day: string; h08: number; h09: number; h10: number; h11: number; h12: number; h13: number; h14: number; h15: number }[];

  // useMemo hooks
  const voltageGranularity = useMemo(() => detectGranularity(voltageProfile.map((d) => d.timestamp)), [voltageProfile]);
  const txTempGranularity = useMemo(() => detectGranularity(transformerTemperature.map((d) => d.timestamp)), [transformerTemperature]);
  const feederGranularity = useMemo(() => detectGranularity(feederDistribution.map((d) => d.timestamp)), [feederDistribution]);

  const faultChartData = faultEvents.map((fe) => ({
    day: fe.day,
    total: fe.h08 + fe.h09 + fe.h10 + fe.h11 + fe.h12 + fe.h13 + fe.h14 + fe.h15,
  }));

  // Early returns
  if (!ready) return null;
  if (error) return <div className="flex items-center justify-center min-h-[calc(100vh-64px)]"><p className="text-destructive">Error: {error}</p></div>;

  return (
    <div className="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <PageBanner variant="substation" />
        <div className="flex justify-end mb-4"><FilterBar onChange={handleFilterChange} /></div>

        {/* KPI Grid */}
        {kpis ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard label="Incoming Voltage" value={kpis.incomingVoltage.toFixed(2)} unit="kV" icon={<Zap className="w-5 h-5" style={{ color: chartColors[0] }} />} />
            <KpiCard label="Total Load" value={kpis.totalLoad.toFixed(1)} unit="MW" icon={<Activity className="w-5 h-5" style={{ color: chartColors[1] }} />} />
            <KpiCard label="Transformer Temp" value={kpis.transformerTemp.toString()} unit="°C" icon={<Thermometer className="w-5 h-5" style={{ color: kpis.transformerTemp > 65 ? chartColors[2] : chartColors[0] }} />} />
            <KpiCard label="Frequency" value={kpis.frequency.toFixed(2)} unit="Hz" icon={<Radio className="w-5 h-5" style={{ color: chartColors[0] }} />} />
            <KpiCard label="THD" value={kpis.thd.toFixed(1)} unit="%" icon={<BarChart3 className="w-5 h-5" style={{ color: kpis.thd > 5 ? chartColors[2] : chartColors[0] }} />} />
            <KpiCard label="Breakers" value={`${kpis.breakersClosed}/${kpis.breakersTotal}`} icon={<Shield className="w-5 h-5" style={{ color: chartColors[0] }} />} />
            <KpiCard label="Fault Events (24h)" value={kpis.faultEvents24h.toString()} icon={<AlertTriangle className="w-5 h-5" style={{ color: kpis.faultEvents24h > 0 ? chartColors[3] : chartColors[0] }} />} />
            <KpiCard label="Busbar Balance" value={kpis.busbarBalance.toFixed(1)} unit="%" icon={<Gauge className="w-5 h-5" style={{ color: kpis.busbarBalance < 10 ? chartColors[0] : chartColors[2] }} />} />
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
          {/* 1. Voltage Profile (3-Phase) */}
          <ChartCard title="Voltage Profile (3-Phase)" loading={chartLoading['voltage-profile']}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={voltageProfile}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="timestamp" tick={AXIS_STYLE} tickFormatter={(ts) => formatTs(ts, voltageGranularity)} />
                <YAxis domain={[10.7, 11.1]} tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <Legend />
                <ReferenceLine y={11.0} stroke={chartColors[0]} strokeDasharray="6 3" label={{ value: 'Nominal 11kV', fill: chartColors[0], fontSize: 10 }} />
                <Line type="monotone" dataKey="vRY" stroke={chartColors[3]} strokeWidth={2} dot={{ r: 2 }} name="V(RY)" />
                <Line type="monotone" dataKey="vYB" stroke={chartColors[2]} strokeWidth={2} dot={{ r: 2 }} name="V(YB)" />
                <Line type="monotone" dataKey="vBR" stroke={chartColors[4]} strokeWidth={2} dot={{ r: 2 }} name="V(BR)" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Transformer Loading (Horizontal) */}
          <ChartCard title="Transformer Loading" loading={chartLoading['transformers']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transformerLoading} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis type="number" domain={[0, 100]} tick={AXIS_STYLE} unit="%" />
                <YAxis type="category" dataKey="name" tick={AXIS_STYLE} width={100} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => [`${value}%`, 'Loading']} />
                <Bar dataKey="loading" name="Loading %" radius={[0, 4, 4, 0]}>
                  {transformerLoading.map((entry, i) => (
                    <Cell key={i} fill={getLoadingColor(entry.loading)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Harmonic Spectrum */}
          <ChartCard title="Harmonic Spectrum" loading={chartLoading['harmonics']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={harmonicSpectrum}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="order" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} />
                <ReferenceLine y={5.0} stroke={chartColors[3]} strokeDasharray="6 3" label={{ value: 'IEEE 519 Limit', fill: chartColors[3], fontSize: 10 }} />
                <Bar dataKey="magnitude" name="THD %" fill={chartColors[1]} radius={[4, 4, 0, 0]}>
                  {harmonicSpectrum.map((entry, i) => (
                    <Cell key={i} fill={entry.magnitude > 5 ? chartColors[3] : chartColors[1]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Transformer Temperature */}
          <ChartCard title="Transformer Temperature" loading={chartLoading['transformer-temp']}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={transformerTemperature}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="timestamp" tick={AXIS_STYLE} tickFormatter={(ts) => formatTs(ts, txTempGranularity)} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <Legend />
                <ReferenceLine y={75} stroke={chartColors[2]} strokeDasharray="6 3" label={{ value: 'Warning', fill: chartColors[2], fontSize: 10 }} />
                <ReferenceLine y={85} stroke={chartColors[3]} strokeDasharray="6 3" label={{ value: 'Alarm', fill: chartColors[3], fontSize: 10 }} />
                <Line type="monotone" dataKey="oilTemp" stroke={chartColors[2]} strokeWidth={2} dot={{ r: 2 }} name="Oil Temp" />
                <Line type="monotone" dataKey="windingTemp" stroke={chartColors[3]} strokeWidth={2} dot={{ r: 2 }} name="Winding Temp" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 5. Feeder Load Distribution (Stacked) */}
          <ChartCard title="Feeder Load Distribution" loading={chartLoading['feeder-distribution']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feederDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="timestamp" tick={AXIS_STYLE} tickFormatter={(ts) => formatTs(ts, feederGranularity)} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} labelFormatter={(ts) => formatTsTooltip(ts as number)} />
                <Legend />
                <Bar dataKey="feeder1" stackId="a" fill={chartColors[4]} name="Feeder 1" />
                <Bar dataKey="feeder2" stackId="a" fill={chartColors[1]} name="Feeder 2" />
                <Bar dataKey="feeder3" stackId="a" fill={chartColors[0]} name="Feeder 3" />
                <Bar dataKey="feeder4" stackId="a" fill={chartColors[2]} name="Feeder 4" />
                <Bar dataKey="feeder5" stackId="a" fill={chartColors[3]} name="Feeder 5" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 6. Fault Events by Day */}
          <ChartCard title="Fault Events by Day" loading={chartLoading['fault-events']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faultChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="day" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="total" fill={chartColors[3]} name="Fault Events" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
