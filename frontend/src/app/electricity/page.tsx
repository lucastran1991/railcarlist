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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Electricity Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Peak Planned" value={peakPlanned} unit="kW" icon={<Zap className="w-5 h-5 text-blue-600" />} accent />
        <KpiCard label="Peak Actual" value={peakActual} unit="kW" icon={<Activity className="w-5 h-5 text-orange-600" />} />
        <KpiCard label="Current Load" value={currentLoad} unit="kW" icon={<Gauge className="w-5 h-5 text-green-600" />} />
        <KpiCard label="Total Data Points" value={totalPoints} icon={<Hash className="w-5 h-5 text-gray-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Planned vs Actual Load (kW)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="planned" stroke="#3b82f6" strokeWidth={2} dot={false} name="Planned" />
              <Line type="monotone" dataKey="actual" stroke="#f97316" strokeWidth={2} dot={false} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hourly Load Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" name="Actual Load (kW)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
