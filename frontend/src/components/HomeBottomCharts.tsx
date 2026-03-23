'use client';

import { useState, useEffect } from 'react';
import { Flame, Gauge, BarChart3, Droplets, Zap, Thermometer, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchAllKPIs, type AllKPIs } from '@/lib/api-dashboard';

interface HomeKpi {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
  color: string;
}

// KPIs now fetched from backend via fetchAllKPIs()

function TrendBadge({ trend, value }: { trend: 'up' | 'down' | 'flat'; value: string }) {
  const color = trend === 'up' ? 'text-[#5CE5A0]' : trend === 'down' ? 'text-[#E53E3E]' : 'text-muted-foreground';
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : TrendingUp;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${color}`}>
      <Icon size={10} />
      {value}
    </span>
  );
}

function buildKpis(data: AllKPIs | null): HomeKpi[] {
  if (!data) return [];
  return [
    { label: 'Steam Production', value: String(data.steam.totalProduction), unit: 'tonnes/h', icon: <Flame size={16} />, trend: 'up' as const, trendValue: '+3.2%', color: '#5CE5A0' },
    { label: 'Header Pressure', value: String(data.steam.headerPressure), unit: 'bar', icon: <Gauge size={16} />, trend: 'down' as const, trendValue: '-1.8%', color: '#56CDE7' },
    { label: 'Throughput', value: data.tank.currentThroughput.toLocaleString(), unit: 'bbl/d', icon: <BarChart3 size={16} />, trend: 'up' as const, trendValue: '+5.1%', color: '#4D65FF' },
    { label: 'Tank Capacity', value: String(data.tank.availableCapacity), unit: '%', icon: <Droplets size={16} />, trend: 'flat' as const, trendValue: '0.0%', color: '#5CE5A0' },
    { label: 'Power Load', value: data.electricity.realTimeDemand.toLocaleString(), unit: 'kW', icon: <Zap size={16} />, trend: 'up' as const, trendValue: '+2.4%', color: '#F6AD55' },
    { label: 'Boiler Efficiency', value: String(data.boiler.fleetEfficiency), unit: '%', icon: <Thermometer size={16} />, trend: 'down' as const, trendValue: '-0.5%', color: '#56CDE7' },
  ];
}

export default function HomeBottomCharts() {
  const [allKpis, setAllKpis] = useState<AllKPIs | null>(null);

  useEffect(() => {
    fetchAllKPIs().then(setAllKpis).catch(() => {});
  }, []);

  const kpiItems = buildKpis(allKpis);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-auto">
      <div className="bg-gradient-to-t from-background/80 to-transparent pt-6 pb-3 px-2 sm:px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {kpiItems.map((kpi) => (
            <div
              key={kpi.label}
              className="theme-card rounded-xl px-3 py-2.5 flex items-center gap-2.5 min-w-0 shadow-sm"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}
              >
                {kpi.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-foreground">{kpi.value}</span>
                  <span className="text-[9px] text-muted-foreground">{kpi.unit}</span>
                </div>
                <TrendBadge trend={kpi.trend} value={kpi.trendValue} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
