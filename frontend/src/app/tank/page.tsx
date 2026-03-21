'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
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

const tooltipStyle = {
  contentStyle: { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' },
  itemStyle: { color: 'hsl(var(--foreground))' },
  labelStyle: { color: 'hsl(var(--muted-foreground))' },
};
const GRID = 'hsl(var(--border))';
const AXIS = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

interface TankData {
  kpis: {
    totalInventory: number;
    availableCapacity: number;
    tanksInOperation: number;
    tanksTotal: number;
    currentThroughput: number;
    avgTemperature: number;
    activeAlarms: number;
    dailyReceipts: number;
    dailyDispatches: number;
  };
  tankLevels: { tank: string; product: string; level: number; capacity: number; volume: number; color: string }[];
  inventoryTrend: { date: string; gasoline: number; diesel: number; crude: number; ethanol: number }[];
  throughput: { date: string; receipts: number; dispatches: number }[];
  productDistribution: { product: string; volume: number; color: string }[];
  tankLevelChanges: { tank: string; change: number }[];
  tankTemperatures: { tank: string; t00: number; t06: number; t12: number; t18: number }[];
}

export default function TankPage() {
  const ready = useAuth();
  const [data, setData] = useState<TankData | null>(null);

  useEffect(() => {
    fetch('/data/mock/tank.json')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!ready || !data) return null;

  const { kpis } = data;
  const distributionTotal = data.productDistribution.reduce((s, d) => s + d.volume, 0);

  return (
    <div className="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tank Dashboard</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Total Inventory" value={kpis.totalInventory.toLocaleString()} unit="bbl" icon={<Database className="w-5 h-5 text-[#56CDE7]" />} />
          <KpiCard label="Available Capacity" value={kpis.availableCapacity.toString()} unit="%" icon={<BarChart3 className={`w-5 h-5 ${kpis.availableCapacity > 30 ? 'text-[#5CE5A0]' : 'text-[#E53E3E]'}`} />} />
          <KpiCard label="Tanks Online" value={`${kpis.tanksInOperation}/${kpis.tanksTotal}`} icon={<CheckCircle className="w-5 h-5 text-[#5CE5A0]" />} />
          <KpiCard label="Throughput" value={kpis.currentThroughput.toLocaleString()} unit="bbl/h" icon={<Activity className="w-5 h-5 text-[#56CDE7]" />} />
          <KpiCard label="Avg Temperature" value={kpis.avgTemperature.toString()} unit="°C" icon={<Thermometer className="w-5 h-5 text-[#5CE5A0]" />} />
          <KpiCard label="Active Alarms" value={kpis.activeAlarms.toString()} icon={<AlertTriangle className={`w-5 h-5 ${kpis.activeAlarms > 0 ? 'text-[#E53E3E]' : 'text-[#5CE5A0]'}`} />} />
          <KpiCard label="Daily Receipts" value={kpis.dailyReceipts.toLocaleString()} unit="bbl" icon={<ArrowDownCircle className="w-5 h-5 text-[#5CE5A0]" />} />
          <KpiCard label="Daily Dispatches" value={kpis.dailyDispatches.toLocaleString()} unit="bbl" icon={<ArrowUpCircle className="w-5 h-5 text-[#F6AD55]" />} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* 1. Tank Levels */}
          <ChartCard title="Tank Levels">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tankLevels} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis type="number" tick={AXIS} domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="tank" tick={AXIS} width={60} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => `${value}%`} />
                <Bar dataKey="level" name="Level %">
                  {data.tankLevels.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Inventory Trend (7 days) */}
          <ChartCard title="Inventory Trend (7 days)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.inventoryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="date" tick={AXIS} />
                <YAxis tick={AXIS} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="gasoline" stroke="#F6AD55" strokeWidth={2} dot={false} name="Gasoline" />
                <Line type="monotone" dataKey="diesel" stroke="#4D65FF" strokeWidth={2} dot={false} name="Diesel" />
                <Line type="monotone" dataKey="crude" stroke="#56CDE7" strokeWidth={2} dot={false} name="Crude" />
                <Line type="monotone" dataKey="ethanol" stroke="#5CE5A0" strokeWidth={2} dot={false} name="Ethanol" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Throughput — Receipts vs Dispatches */}
          <ChartCard title="Throughput — Receipts vs Dispatches">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.throughput}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="date" tick={AXIS} />
                <YAxis tick={AXIS} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Bar dataKey="receipts" fill="#5CE5A0" name="Receipts" />
                <Bar dataKey="dispatches" fill="#F6AD55" name="Dispatches" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Product Distribution */}
          <ChartCard title="Product Distribution">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.productDistribution}
                  dataKey="volume"
                  nameKey="product"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ product, percent }) => `${product} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.productDistribution.map((entry, i) => (
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
          <ChartCard title="Tank Level Changes (24h)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tankLevelChanges}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="tank" tick={AXIS} />
                <YAxis tick={AXIS} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => value.toLocaleString()} />
                <Bar dataKey="change" name="Change (bbl)">
                  {data.tankLevelChanges.map((entry, i) => (
                    <Cell key={i} fill={entry.change >= 0 ? '#5CE5A0' : '#E53E3E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 6. Tank Temperatures */}
          <ChartCard title="Tank Temperatures">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tankTemperatures}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="tank" tick={AXIS} />
                <YAxis tick={AXIS} unit="°C" />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Bar dataKey="t00" fill="#4D65FF" name="00:00" />
                <Bar dataKey="t06" fill="#56CDE7" name="06:00" />
                <Bar dataKey="t12" fill="#F6AD55" name="12:00" />
                <Bar dataKey="t18" fill="#5CE5A0" name="18:00" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
