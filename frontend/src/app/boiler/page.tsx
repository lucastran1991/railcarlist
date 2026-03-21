'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Flame, Hash, Gauge, Activity } from 'lucide-react';
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

interface BoilerReading {
  boilerId: string;
  boilerMode: number;
  currentPSI: number;
  firingRate: number;
  steamProduced: number;
  gasConsumed: number;
  lastUpdatedTimestamp: number;
}

const BOILER_COLORS: Record<string, string> = {
  Boiler1: '#5CE5A0',
  Boiler2: '#F6AD55',
  Boiler3: '#56CDE7',
  Boiler4: '#4D65FF',
  Boiler5: '#E53E3E',
};

export default function BoilerPage() {
  const ready = useAuth();
  const [readings, setReadings] = useState<BoilerReading[]>([]);

  useEffect(() => {
    fetch('/data/boiler_response.json')
      .then((r) => r.json())
      .then((json) => {
        setReadings(json.Message?.Value?.readingHistory ?? []);
      });
  }, []);

  if (!ready) return null;

  const totalReadings = readings.length.toString();
  const uniqueBoilers = new Set(readings.map((r) => r.boilerId)).size.toString();
  const avgPSI = readings.length
    ? (readings.reduce((s, r) => s + r.currentPSI, 0) / readings.length).toFixed(2)
    : '0';
  const totalGas = readings.reduce((s, r) => s + r.gasConsumed, 0);
  const totalGasStr = totalGas > 1e6 ? `${(totalGas / 1e6).toFixed(1)}M` : totalGas.toLocaleString();

  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // PSI over time — one line per boilerId
  const boilerIds = Array.from(new Set(readings.map((r) => r.boilerId)));
  const sorted = readings.slice().sort((a, b) => a.lastUpdatedTimestamp - b.lastUpdatedTimestamp);

  // Build time-series data: each point has time + one key per boiler
  const timeMap = new Map<number, Record<string, number | string>>();
  sorted.forEach((r) => {
    let entry = timeMap.get(r.lastUpdatedTimestamp);
    if (!entry) {
      entry = { time: fmtTime(r.lastUpdatedTimestamp) };
      timeMap.set(r.lastUpdatedTimestamp, entry);
    }
    entry[r.boilerId] = r.currentPSI;
  });
  const psiData = Array.from(timeMap.values());

  // Firing rate bar chart
  const firingData = sorted.map((r, i) => ({
    idx: i,
    firingRate: r.firingRate,
    boilerId: r.boilerId,
  }));

  const tooltipStyle = {
    contentStyle: { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' },
    itemStyle: { color: 'hsl(var(--foreground))' },
    labelStyle: { color: 'hsl(var(--muted-foreground))' },
  };

  return (
    <div className="bg-background min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6"><div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold gradient-text">Boilers Overview</h1>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Total Readings" value={totalReadings} icon={<Hash className="w-5 h-5 text-[#5CE5A0]" />} accent />
        <KpiCard label="Unique Boilers" value={uniqueBoilers} icon={<Flame className="w-5 h-5 text-[#F6AD55]" />} />
        <KpiCard label="Avg PSI" value={avgPSI} unit="PSI" icon={<Gauge className="w-5 h-5 text-[#56CDE7]" />} />
        <KpiCard label="Total Gas" value={totalGasStr} icon={<Activity className="w-5 h-5 text-[#4D65FF]" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="PSI Over Time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={psiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#454A5F' }} />
              <YAxis tick={{ fontSize: 11, fill: '#454A5F' }} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              {boilerIds.map((id) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  stroke={BOILER_COLORS[id] ?? '#454A5F'}
                  strokeWidth={2}
                  dot={false}
                  name={id}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Firing Rate Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={firingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
              <XAxis dataKey="idx" tick={{ fontSize: 11, fill: '#454A5F' }} />
              <YAxis tick={{ fontSize: 11, fill: '#454A5F' }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="firingRate" fill="#F6AD55" name="Firing Rate" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div></div>
  );
}
