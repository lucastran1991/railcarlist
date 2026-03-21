'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Activity, Gauge, Zap, Hash } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface SubStation {
  subStationName: string;
  demandValue: number;
  actualValue: number;
  capacity: number;
  Tanks: string;
}

export default function SubStationPage() {
  const ready = useAuth();
  const [stations, setStations] = useState<SubStation[]>([]);

  useEffect(() => {
    fetch('/data/sub_station_response.json')
      .then((r) => r.json())
      .then((json) => {
        setStations(json.Message?.Value?.SubStationDemand ?? []);
      });
  }, []);

  if (!ready) return null;

  const totalStations = stations.length.toString();
  const totalCapacity = stations.reduce((s, st) => s + (st.capacity ?? 0), 0);
  const activeDemand = stations.reduce((s, st) => s + (st.demandValue ?? 0), 0);
  const activeActual = stations.reduce((s, st) => s + (st.actualValue ?? 0), 0);

  const chartData = stations.map((st) => ({
    name: `Station ${st.subStationName}`,
    capacity: st.capacity,
    actual: st.actualValue,
    demand: st.demandValue,
  }));

  const tooltipStyle = {
    contentStyle: { backgroundColor: '#1B1E27', border: '1px solid #2C2E39', borderRadius: '8px', color: '#F5F5F7' },
    itemStyle: { color: '#F5F5F7' },
    labelStyle: { color: '#454A5F' },
  };

  return (
    <div className="bg-[#080A11] min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6"><div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold gradient-text">Sub Stations</h1>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Total Stations" value={totalStations} icon={<Hash className="w-5 h-5 text-[#5CE5A0]" />} accent />
        <KpiCard label="Total Capacity" value={totalCapacity.toLocaleString()} icon={<Gauge className="w-5 h-5 text-[#56CDE7]" />} />
        <KpiCard label="Active Demand" value={activeDemand.toLocaleString()} icon={<Zap className="w-5 h-5 text-[#F6AD55]" />} />
        <KpiCard label="Active Actual" value={activeActual.toLocaleString()} icon={<Activity className="w-5 h-5 text-[#4D65FF]" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="Station Capacity vs Actual">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#454A5F' }} />
              <YAxis tick={{ fontSize: 11, fill: '#454A5F' }} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              <Bar dataKey="capacity" fill="#56CDE7" name="Capacity" />
              <Bar dataKey="actual" fill="#F6AD55" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Demand Overview">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#454A5F' }} />
              <YAxis tick={{ fontSize: 11, fill: '#454A5F' }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="demand" fill="#4D65FF" name="Demand" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div></div>
  );
}
