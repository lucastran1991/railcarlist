'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// Generate deterministic mock data
function generateHourlyData(hours: number, baseLine: number, variance: number) {
  const data = [];
  let val = baseLine;
  for (let i = 0; i < hours; i++) {
    val += (Math.sin(i * 0.5) * variance * 0.3) + (Math.cos(i * 0.3) * variance * 0.2);
    val = Math.max(baseLine * 0.5, Math.min(baseLine * 1.5, val));
    data.push({
      time: `${String(i % 24).padStart(2, '0')}:00`,
      value: Math.round(val * 10) / 10,
    });
  }
  return data;
}

function generateDailyData(days: number) {
  const data = [];
  for (let i = 0; i < days; i++) {
    data.push({
      day: `Mar ${i + 1}`,
      throughput: 800 + Math.round(Math.sin(i * 0.8) * 200 + Math.cos(i * 0.4) * 150),
      target: 900,
    });
  }
  return data;
}

function generateTankLevels() {
  const tanks = ['T-1', 'T-2', 'T-3', 'T-5', 'T-8', 'T-12', 'T-20', 'T-22'];
  return tanks.map((name, i) => ({
    name,
    level: 40 + Math.round(Math.sin(i * 1.2) * 30 + 20),
    capacity: 100,
  }));
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[rgba(12,15,24,0.85)] backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className="px-4 py-2.5 border-b border-white/5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-3 py-3 h-[140px]">
        {children}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded px-2 py-1.5 text-xs shadow-lg">
      <p className="text-gray-400 mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

export default function HomeBottomCharts() {
  const steamData = useMemo(() => generateHourlyData(24, 120, 30), []);
  const psiData = useMemo(() => generateHourlyData(24, 95, 15), []);
  const throughputData = useMemo(() => generateDailyData(14), []);
  const tankLevels = useMemo(() => generateTankLevels(), []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-auto">
      <div className="bg-gradient-to-t from-black/60 to-transparent pt-8 pb-4 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-4 gap-3">
          {/* Steam Production */}
          <ChartCard title="Steam Production (lb/hr)">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={steamData}>
                <defs>
                  <linearGradient id="steamGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38b2ac" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#38b2ac" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#666' }} interval={5} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#38b2ac" strokeWidth={2} fill="url(#steamGrad)" name="Steam" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* PSI Readings */}
          <ChartCard title="Avg. Pressure (PSI)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={psiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#666' }} interval={5} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="value" stroke="#f6ad55" strokeWidth={2} dot={false} name="PSI" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Throughput */}
          <ChartCard title="Daily Throughput (bbl)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#666' }} interval={2} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="throughput" fill="#4299e1" radius={[2, 2, 0, 0]} name="Throughput" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Tank Levels */}
          <ChartCard title="Tank Levels (%)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tankLevels} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#999' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="level" fill="#48bb78" radius={[0, 2, 2, 0]} name="Level" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
