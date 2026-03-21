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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sub Stations</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Stations" value={totalStations} icon={<Hash className="w-5 h-5 text-blue-600" />} accent />
        <KpiCard label="Total Capacity" value={totalCapacity.toLocaleString()} icon={<Gauge className="w-5 h-5 text-green-600" />} />
        <KpiCard label="Active Demand" value={activeDemand.toLocaleString()} icon={<Zap className="w-5 h-5 text-orange-600" />} />
        <KpiCard label="Active Actual" value={activeActual.toLocaleString()} icon={<Activity className="w-5 h-5 text-purple-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Station Capacity vs Actual">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="capacity" fill="#3b82f6" name="Capacity" />
              <Bar dataKey="actual" fill="#f97316" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Demand Overview">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="demand" fill="#8b5cf6" name="Demand" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
