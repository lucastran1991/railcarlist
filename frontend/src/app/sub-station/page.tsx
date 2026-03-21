'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
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

const tooltipStyle = {
  contentStyle: { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' },
  itemStyle: { color: 'hsl(var(--foreground))' },
  labelStyle: { color: 'hsl(var(--muted-foreground))' },
};

const GRID_STROKE = 'hsl(var(--border))';
const AXIS_STYLE = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

interface SubstationData {
  kpis: {
    incomingVoltage: number;
    totalLoad: number;
    transformerTemp: number;
    frequency: number;
    thd: number;
    breakersClosed: number;
    breakersTotal: number;
    faultEvents24h: number;
    busbarBalance: number;
  };
  voltageProfile: { time: string; vRY: number; vYB: number; vBR: number }[];
  transformerLoading: { name: string; loading: number; capacity: number; unit: string }[];
  harmonicSpectrum: { order: string; magnitude: number }[];
  transformerTemperature: { time: string; oilTemp: number; windingTemp: number }[];
  feederDistribution: { time: string; feeder1: number; feeder2: number; feeder3: number; feeder4: number; feeder5: number }[];
  faultEvents: { day: string; h08: number; h09: number; h10: number; h11: number; h12: number; h13: number; h14: number; h15: number }[];
}

function getLoadingColor(loading: number) {
  if (loading > 90) return '#E53E3E';
  if (loading >= 70) return '#F6AD55';
  return '#5CE5A0';
}

export default function SubStationPage() {
  const ready = useAuth();
  const [data, setData] = useState<SubstationData | null>(null);

  useEffect(() => {
    fetch('/data/mock/substation.json')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!ready || !data) return null;

  const { kpis } = data;

  const faultChartData = data.faultEvents.map((fe) => ({
    day: fe.day,
    total: fe.h08 + fe.h09 + fe.h10 + fe.h11 + fe.h12 + fe.h13 + fe.h14 + fe.h15,
  }));

  return (
    <div className="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">Sub-Station Overview</h1>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Incoming Voltage" value={kpis.incomingVoltage.toFixed(2)} unit="kV" icon={<Zap className="w-5 h-5 text-[#5CE5A0]" />} />
          <KpiCard label="Total Load" value={kpis.totalLoad.toFixed(1)} unit="MW" icon={<Activity className="w-5 h-5 text-[#56CDE7]" />} />
          <KpiCard label="Transformer Temp" value={kpis.transformerTemp.toString()} unit="°C" icon={<Thermometer className={`w-5 h-5 ${kpis.transformerTemp > 65 ? 'text-[#F6AD55]' : 'text-[#5CE5A0]'}`} />} />
          <KpiCard label="Frequency" value={kpis.frequency.toFixed(2)} unit="Hz" icon={<Radio className="w-5 h-5 text-[#5CE5A0]" />} />
          <KpiCard label="THD" value={kpis.thd.toFixed(1)} unit="%" icon={<BarChart3 className={`w-5 h-5 ${kpis.thd > 5 ? 'text-[#F6AD55]' : 'text-[#5CE5A0]'}`} />} />
          <KpiCard label="Breakers" value={`${kpis.breakersClosed}/${kpis.breakersTotal}`} icon={<Shield className="w-5 h-5 text-[#5CE5A0]" />} />
          <KpiCard label="Fault Events (24h)" value={kpis.faultEvents24h.toString()} icon={<AlertTriangle className={`w-5 h-5 ${kpis.faultEvents24h > 0 ? 'text-[#E53E3E]' : 'text-[#5CE5A0]'}`} />} />
          <KpiCard label="Busbar Balance" value={kpis.busbarBalance.toFixed(1)} unit="%" icon={<Gauge className={`w-5 h-5 ${kpis.busbarBalance < 10 ? 'text-[#5CE5A0]' : 'text-[#F6AD55]'}`} />} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* 1. Voltage Profile (3-Phase) */}
          <ChartCard title="Voltage Profile (3-Phase)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.voltageProfile}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="time" tick={AXIS_STYLE} />
                <YAxis domain={[10.7, 11.1]} tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <ReferenceLine y={11.0} stroke="#5CE5A0" strokeDasharray="6 3" label={{ value: 'Nominal 11kV', fill: '#5CE5A0', fontSize: 10 }} />
                <Line type="monotone" dataKey="vRY" stroke="#E53E3E" strokeWidth={2} dot={{ r: 2 }} name="V(RY)" />
                <Line type="monotone" dataKey="vYB" stroke="#F6AD55" strokeWidth={2} dot={{ r: 2 }} name="V(YB)" />
                <Line type="monotone" dataKey="vBR" stroke="#4D65FF" strokeWidth={2} dot={{ r: 2 }} name="V(BR)" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Transformer Loading (Horizontal) */}
          <ChartCard title="Transformer Loading">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.transformerLoading} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis type="number" domain={[0, 100]} tick={AXIS_STYLE} unit="%" />
                <YAxis type="category" dataKey="name" tick={AXIS_STYLE} width={100} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => [`${value}%`, 'Loading']} />
                <Bar dataKey="loading" name="Loading %" radius={[0, 4, 4, 0]}>
                  {data.transformerLoading.map((entry, i) => (
                    <Cell key={i} fill={getLoadingColor(entry.loading)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Harmonic Spectrum */}
          <ChartCard title="Harmonic Spectrum">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.harmonicSpectrum}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="order" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} />
                <ReferenceLine y={5.0} stroke="#E53E3E" strokeDasharray="6 3" label={{ value: 'IEEE 519 Limit', fill: '#E53E3E', fontSize: 10 }} />
                <Bar dataKey="magnitude" name="THD %" fill="#56CDE7" radius={[4, 4, 0, 0]}>
                  {data.harmonicSpectrum.map((entry, i) => (
                    <Cell key={i} fill={entry.magnitude > 5 ? '#E53E3E' : '#56CDE7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Transformer Temperature */}
          <ChartCard title="Transformer Temperature">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.transformerTemperature}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="time" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <ReferenceLine y={75} stroke="#F6AD55" strokeDasharray="6 3" label={{ value: 'Warning', fill: '#F6AD55', fontSize: 10 }} />
                <ReferenceLine y={85} stroke="#E53E3E" strokeDasharray="6 3" label={{ value: 'Alarm', fill: '#E53E3E', fontSize: 10 }} />
                <Line type="monotone" dataKey="oilTemp" stroke="#F6AD55" strokeWidth={2} dot={{ r: 2 }} name="Oil Temp" />
                <Line type="monotone" dataKey="windingTemp" stroke="#E53E3E" strokeWidth={2} dot={{ r: 2 }} name="Winding Temp" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 5. Feeder Load Distribution (Stacked) */}
          <ChartCard title="Feeder Load Distribution">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.feederDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="time" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Bar dataKey="feeder1" stackId="a" fill="#4D65FF" name="Feeder 1" />
                <Bar dataKey="feeder2" stackId="a" fill="#56CDE7" name="Feeder 2" />
                <Bar dataKey="feeder3" stackId="a" fill="#5CE5A0" name="Feeder 3" />
                <Bar dataKey="feeder4" stackId="a" fill="#F6AD55" name="Feeder 4" />
                <Bar dataKey="feeder5" stackId="a" fill="#E53E3E" name="Feeder 5" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 6. Fault Events by Day */}
          <ChartCard title="Fault Events by Day">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faultChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="day" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="total" fill="#E53E3E" name="Fault Events" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
