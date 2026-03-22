'use client';

import { Flame, Gauge, BarChart3, Droplets, Zap, Thermometer, TrendingUp, TrendingDown } from 'lucide-react';

interface HomeKpi {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
  color: string;
}

const kpis: HomeKpi[] = [
  {
    label: 'Steam Production',
    value: '55.5',
    unit: 'tonnes/h',
    icon: <Flame size={16} />,
    trend: 'up',
    trendValue: '+3.2%',
    color: '#5CE5A0',
  },
  {
    label: 'Avg. Pressure',
    value: '94.2',
    unit: 'PSI',
    icon: <Gauge size={16} />,
    trend: 'down',
    trendValue: '-1.8%',
    color: '#56CDE7',
  },
  {
    label: 'Daily Throughput',
    value: '32,000',
    unit: 'bbl',
    icon: <BarChart3 size={16} />,
    trend: 'up',
    trendValue: '+5.1%',
    color: '#4D65FF',
  },
  {
    label: 'Tank Avg Level',
    value: '62',
    unit: '%',
    icon: <Droplets size={16} />,
    trend: 'flat',
    trendValue: '0.0%',
    color: '#5CE5A0',
  },
  {
    label: 'Power Load',
    value: '3,420',
    unit: 'kW',
    icon: <Zap size={16} />,
    trend: 'up',
    trendValue: '+2.4%',
    color: '#F6AD55',
  },
  {
    label: 'Boiler Efficiency',
    value: '87.5',
    unit: '%',
    icon: <Thermometer size={16} />,
    trend: 'down',
    trendValue: '-0.5%',
    color: '#56CDE7',
  },
];

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

export default function HomeBottomCharts() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-auto">
      <div className="bg-gradient-to-t from-background/80 to-transparent pt-6 pb-3 px-2 sm:px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="bg-card/90 backdrop-blur-sm rounded-xl border border-border/50 px-3 py-2.5 flex items-center gap-2.5 min-w-0 shadow-sm"
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
