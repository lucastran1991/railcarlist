'use client';

import { useAuth } from '@/lib/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { ElectricityKPIs } from '@/lib/api-dashboard';
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
};

const GRID_STROKE = 'hsl(var(--border))';
const AXIS_STYLE = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export default function ElectricityPage() {
  const ready = useAuth();
  const { kpis, charts, loading, error } = useDashboardData<ElectricityKPIs>('electricity');

  if (!ready) return null;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#56CDE7]" />
      </div>
    );
  }

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

  if (!kpis) return null;

  const loadProfile = (charts['load-profiles'] ?? []) as { hour: string; actual: number; planned: number; threshold: number }[];
  const weeklyConsumption = (charts['weekly-consumption'] ?? []) as { day: string; thisWeek: number; lastWeek: number }[];
  const powerFactorTrend = (charts['power-factor'] ?? []) as { time: string; value: number }[];
  const costBreakdown = (charts['cost-breakdown'] ?? []) as { source: string; cost: number; color: string }[];
  const peakDemandHistory = (charts['peak-demand'] ?? []) as { date: string; peak: number }[];
  const phaseBalance = (charts['phase-balance'] ?? []) as { time: string; phaseA: number; phaseB: number; phaseC: number }[];

  const totalCost = costBreakdown.reduce((s, c) => s + c.cost, 0);

  return (
    <div className="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">Electricity Overview</h1>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Total Consumption" value={kpis.totalConsumption.toLocaleString()} unit="kWh" icon={<Zap className="w-5 h-5 text-[#56CDE7]" />} />
          <KpiCard label="Real-time Demand" value={kpis.realTimeDemand.toLocaleString()} unit="kW" icon={<Activity className="w-5 h-5 text-[#5CE5A0]" />} />
          <KpiCard label="Peak Demand" value={kpis.peakDemand.toLocaleString()} unit="kW" icon={<TrendingUp className="w-5 h-5 text-[#F6AD55]" />} />
          <KpiCard label="Power Factor" value={kpis.powerFactor.toFixed(2)} icon={<Gauge className={`w-5 h-5 ${kpis.powerFactor > 0.93 ? 'text-[#5CE5A0]' : 'text-[#F6AD55]'}`} />} />
          <KpiCard label="Energy Cost" value={`$${kpis.energyCost.toLocaleString()}`} icon={<DollarSign className="w-5 h-5 text-[#56CDE7]" />} />
          <KpiCard label="Carbon Emissions" value={kpis.carbonEmissions.toFixed(2)} unit="tonnes" icon={<Cloud className="w-5 h-5 text-[#5CE5A0]" />} />
          <KpiCard label="Grid Availability" value={kpis.gridAvailability.toFixed(1)} unit="%" icon={<Shield className="w-5 h-5 text-[#5CE5A0]" />} />
          <KpiCard label="Transformer Load" value={kpis.transformerLoad.toString()} unit="%" icon={<Thermometer className={`w-5 h-5 ${kpis.transformerLoad > 80 ? 'text-[#F6AD55]' : 'text-[#56CDE7]'}`} />} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* 1. 24h Load Profile */}
          <ChartCard title="24h Load Profile">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={loadProfile}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="hour" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <ReferenceLine y={4000} stroke="#E53E3E" strokeDasharray="6 3" label={{ value: 'Threshold', fill: '#E53E3E', fontSize: 10 }} />
                <Area type="monotone" dataKey="actual" stroke="#4D65FF" fill="#4D65FF" fillOpacity={0.3} strokeWidth={2} name="Actual" />
                <Line type="monotone" dataKey="planned" stroke="#5CE5A0" strokeWidth={2} dot={false} name="Planned" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Weekly Consumption */}
          <ChartCard title="Weekly Consumption">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyConsumption}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="day" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Bar dataKey="thisWeek" fill="#56CDE7" name="This Week" />
                <Bar dataKey="lastWeek" fill="#4D65FF" name="Last Week" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Power Factor Trend */}
          <ChartCard title="Power Factor Trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={powerFactorTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="time" tick={AXIS_STYLE} />
                <YAxis domain={[0.88, 1.0]} tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} />
                <ReferenceLine y={0.95} stroke="#5CE5A0" strokeDasharray="6 3" label={{ value: 'Target 0.95', fill: '#5CE5A0', fontSize: 10 }} />
                <Line type="monotone" dataKey="value" stroke="#F6AD55" strokeWidth={2} dot={{ r: 3 }} name="Power Factor" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Cost Breakdown */}
          <ChartCard title="Cost Breakdown">
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
          <ChartCard title="Peak Demand History (30d)">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={peakDemandHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="date" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} />
                <ReferenceLine y={4200} stroke="#E53E3E" strokeDasharray="6 3" label={{ value: 'Contract 4200 kW', fill: '#E53E3E', fontSize: 10 }} />
                <Area type="monotone" dataKey="peak" stroke="#F6AD55" fill="#F6AD55" fillOpacity={0.25} strokeWidth={2} name="Peak Demand" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 6. Phase Balance */}
          <ChartCard title="Phase Balance (A)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseBalance}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="time" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Bar dataKey="phaseA" fill="#E53E3E" name="Phase A" />
                <Bar dataKey="phaseB" fill="#F6AD55" name="Phase B" />
                <Bar dataKey="phaseC" fill="#4D65FF" name="Phase C" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
