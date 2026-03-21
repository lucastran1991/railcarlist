'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Activity, Gauge, Droplets, Hash } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface SteamRecord {
  datetimestamp: number;
  demandValue: number;
  tankId: string;
  unit: string;
}

export default function SteamPage() {
  const ready = useAuth();
  const [records, setRecords] = useState<SteamRecord[]>([]);

  useEffect(() => {
    fetch('/data/steam_response.json')
      .then((r) => r.json())
      .then((json) => {
        setRecords(json.Message?.Value?.SteamDemandHourly ?? []);
      });
  }, []);

  if (!ready) return null;

  const demandValues = records.map((r) => r.demandValue);
  const totalRecords = records.length.toString();
  const peakDemand = demandValues.length ? Math.max(...demandValues).toFixed(2) : '0';
  const avgDemand = demandValues.length
    ? (demandValues.reduce((a, b) => a + b, 0) / demandValues.length).toFixed(2)
    : '0';
  const uniqueTanks = new Set(records.map((r) => r.tankId)).size.toString();

  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const lineData = records
    .slice()
    .sort((a, b) => a.datetimestamp - b.datetimestamp)
    .map((r) => ({
      time: fmtTime(r.datetimestamp),
      demand: r.demandValue,
    }));

  // Group by tankId for bar chart
  const tankMap = new Map<string, number>();
  records.forEach((r) => {
    tankMap.set(r.tankId, (tankMap.get(r.tankId) ?? 0) + r.demandValue);
  });
  const tankBarData = Array.from(tankMap.entries()).map(([tankId, total]) => ({
    tank: `Tank ${tankId}`,
    demand: parseFloat(total.toFixed(2)),
  }));

  const tooltipStyle = {
    contentStyle: { backgroundColor: '#1B1E27', border: '1px solid #2C2E39', borderRadius: '8px', color: '#F5F5F7' },
    itemStyle: { color: '#F5F5F7' },
    labelStyle: { color: '#454A5F' },
  };

  return (
    <div className="bg-[#080A11] min-h-[calc(100vh-64px)] p-6 space-y-6">
      <h1 className="text-2xl font-bold gradient-text">Steam Demand</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Records" value={totalRecords} icon={<Hash className="w-5 h-5 text-[#5CE5A0]" />} accent />
        <KpiCard label="Peak Demand" value={peakDemand} icon={<Gauge className="w-5 h-5 text-[#E53E3E]" />} />
        <KpiCard label="Avg Demand" value={avgDemand} icon={<Activity className="w-5 h-5 text-[#F6AD55]" />} />
        <KpiCard label="Tanks Monitored" value={uniqueTanks} icon={<Droplets className="w-5 h-5 text-[#56CDE7]" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Steam Demand Over Time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#454A5F' }} />
              <YAxis tick={{ fontSize: 11, fill: '#454A5F' }} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="demand" stroke="#5CE5A0" strokeWidth={2} dot={false} name="Demand" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Demand by Tank">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tankBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
              <XAxis dataKey="tank" tick={{ fontSize: 11, fill: '#454A5F' }} />
              <YAxis tick={{ fontSize: 11, fill: '#454A5F' }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="demand" fill="#56CDE7" name="Total Demand" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
