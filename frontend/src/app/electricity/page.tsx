'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Zap, Activity, Gauge, Hash } from 'lucide-react';
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
  Legend,
} from 'recharts';

interface LoadProfile {
  loadProfileData: { data: string; unit: string };
  Timestamp: string;
}

export default function ElectricityPage() {
  const ready = useAuth();
  const [planned, setPlanned] = useState<LoadProfile[]>([]);
  const [actual, setActual] = useState<LoadProfile[]>([]);

  useEffect(() => {
    fetch('/data/electricity_response.json')
      .then((r) => r.json())
      .then((json) => {
        setPlanned(json.TerminalPlannedUsage?.LoadUsageProfiles?.LoadProfile ?? []);
        setActual(json.TerminalActualUsage?.LoadUsageProfiles?.LoadProfile ?? []);
      });
  }, []);

  if (!ready) return null;

  const plannedValues = planned.map((p) => parseFloat(p.loadProfileData.data));
  const actualValues = actual.map((p) => parseFloat(p.loadProfileData.data));

  const peakPlanned = plannedValues.length ? Math.max(...plannedValues).toFixed(2) : '0';
  const peakActual = actualValues.length ? Math.max(...actualValues).toFixed(2) : '0';
  const currentLoad = actualValues.length ? actualValues[actualValues.length - 1].toFixed(2) : '0';
  const totalPoints = actual.length.toString();

  const fmtTime = (ts: string) =>
    new Date(Number(ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Merge planned & actual by timestamp for overlay chart
  const tsSet = new Set([...planned.map((p) => p.Timestamp), ...actual.map((a) => a.Timestamp)]);
  const sortedTs = Array.from(tsSet).sort((a, b) => Number(a) - Number(b));

  const plannedMap = new Map(planned.map((p) => [p.Timestamp, parseFloat(p.loadProfileData.data)]));
  const actualMap = new Map(actual.map((a) => [a.Timestamp, parseFloat(a.loadProfileData.data)]));

  const mergedData = sortedTs.map((ts) => ({
    time: fmtTime(ts),
    planned: plannedMap.get(ts) ?? null,
    actual: actualMap.get(ts) ?? null,
  }));

  const barData = actual.map((a) => ({
    time: fmtTime(a.Timestamp),
    value: parseFloat(a.loadProfileData.data),
  }));

  const tooltipStyle = {
    contentStyle: { backgroundColor: '#1B1E27', border: '1px solid #2C2E39', borderRadius: '8px', color: '#F5F5F7' },
    itemStyle: { color: '#F5F5F7' },
    labelStyle: { color: '#454A5F' },
  };

  return (
    <div className="bg-[#080A11] min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6"><div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold gradient-text">Electricity Overview</h1>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Peak Planned" value={peakPlanned} unit="kW" icon={<Zap className="w-5 h-5 text-[#5CE5A0]" />} accent />
        <KpiCard label="Peak Actual" value={peakActual} unit="kW" icon={<Activity className="w-5 h-5 text-[#F6AD55]" />} />
        <KpiCard label="Current Load" value={currentLoad} unit="kW" icon={<Gauge className="w-5 h-5 text-[#56CDE7]" />} />
        <KpiCard label="Total Data Points" value={totalPoints} icon={<Hash className="w-5 h-5 text-[#454A5F]" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="Planned vs Actual Load (kW)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#454A5F' }} />
              <YAxis tick={{ fontSize: 11, fill: '#454A5F' }} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="planned" stroke="#5CE5A0" strokeWidth={2} dot={false} name="Planned" />
              <Line type="monotone" dataKey="actual" stroke="#F6AD55" strokeWidth={2} dot={false} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hourly Load Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#454A5F' }} />
              <YAxis tick={{ fontSize: 11, fill: '#454A5F' }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" fill="#56CDE7" name="Actual Load (kW)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div></div>
  );
}
