'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/useAuth';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Droplets, Activity, Thermometer, Gauge } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface Tank {
  id: number;
  name: string;
  temperature: number;
  level: number;
  pressure: number;
  status: 'active' | 'idle' | 'maintenance';
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateTanks(): Tank[] {
  const statuses: ('active' | 'idle' | 'maintenance')[] = ['active', 'idle', 'maintenance'];
  return Array.from({ length: 20 }, (_, i) => {
    const id = i + 1;
    const r1 = seededRandom(id * 7);
    const r2 = seededRandom(id * 13);
    const r3 = seededRandom(id * 19);
    const r4 = seededRandom(id * 31);
    return {
      id,
      name: `Tank ${id}`,
      temperature: Math.round(150 + r1 * 200),
      level: Math.round(20 + r2 * 75),
      pressure: Math.round(50 + r3 * 150),
      status: statuses[Math.floor(r4 * 3)],
    };
  });
}

export default function TankPage() {
  const ready = useAuth();
  const tanks = useMemo(() => generateTanks(), []);

  if (!ready) return null;

  const activeCount = tanks.filter((t) => t.status === 'active').length;
  const avgTemp = (tanks.reduce((s, t) => s + t.temperature, 0) / tanks.length).toFixed(1);
  const avgLevel = (tanks.reduce((s, t) => s + t.level, 0) / tanks.length).toFixed(1);

  const levelData = tanks.map((t) => ({ name: t.name, level: t.level }));
  const tempData = tanks.map((t) => ({ name: t.name, temperature: t.temperature }));

  const tooltipStyle = {
    contentStyle: { backgroundColor: '#1B1E27', border: '1px solid #2C2E39', borderRadius: '8px', color: '#F5F5F7' },
    itemStyle: { color: '#F5F5F7' },
    labelStyle: { color: '#454A5F' },
  };

  return (
    <div className="bg-[#080A11] min-h-[calc(100vh-64px)] p-6 space-y-6">
      <h1 className="text-2xl font-bold gradient-text">Tank Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Tanks" value="20" icon={<Droplets className="w-5 h-5 text-[#5CE5A0]" />} accent />
        <KpiCard label="Active" value={activeCount.toString()} icon={<Activity className="w-5 h-5 text-[#56CDE7]" />} />
        <KpiCard label="Avg Temperature" value={avgTemp} unit="°F" icon={<Thermometer className="w-5 h-5 text-[#E53E3E]" />} />
        <KpiCard label="Avg Level" value={avgLevel} unit="%" icon={<Gauge className="w-5 h-5 text-[#4D65FF]" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tank Levels (%)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={levelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#454A5F' }} />
              <YAxis tick={{ fontSize: 11, fill: '#454A5F' }} domain={[0, 100]} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="level" fill="#56CDE7" name="Level (%)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tank Temperatures (°F)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tempData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#454A5F' }} />
              <YAxis tick={{ fontSize: 11, fill: '#454A5F' }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="temperature" fill="#E53E3E" name="Temperature (°F)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
