'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import PipelineDAG from '@/components/PipelineDAG';
import PageBanner from '@/components/PageBanner';
import { Zap, Flame, Droplets, Gauge, Activity, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { API_BASE_URL, apiFetch } from '@/lib/config';

const fmt = (v: number | undefined, d = 0) => v != null ? v.toLocaleString(undefined, { maximumFractionDigits: d }) : '—';
const fmtF = (v: number | undefined, d = 1) => v != null ? v.toFixed(d) : '—';

interface CrossDomainMetric {
  label: string;
  value: string;
  subLabel?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
}

function MetricCard({ m }: { m: CrossDomainMetric }) {
  const trendIcon = m.trend === 'up' ? <TrendingUp size={10} /> : m.trend === 'down' ? <TrendingDown size={10} /> : <Minus size={10} />;
  const trendColor = m.trend === 'up' ? 'text-[#5CE5A0]' : m.trend === 'down' ? 'text-[#E53E3E]' : 'text-muted-foreground';

  return (
    <div className="theme-card rounded-xl p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.color}`}>
          {m.icon}
        </div>
        <span className="text-xs font-semibold text-foreground">{m.label}</span>
        {m.trend && (
          <div className={`flex items-center gap-0.5 ml-auto ${trendColor}`}>
            {trendIcon}
            <span className="text-[9px] font-medium">{m.trendValue}</span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold text-foreground">{m.value}</span>
      </div>
      {m.subLabel && <p className="text-[10px] text-muted-foreground">{m.subLabel}</p>}
    </div>
  );
}

export default function PipelinePage() {
  const ready = useAuth();
  const [kpis, setKpis] = useState<Record<string, any>>({});

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_BASE_URL}/api/electricity/kpis`).then(r => r.json()).catch(() => ({})),
      apiFetch(`${API_BASE_URL}/api/substation/kpis`).then(r => r.json()).catch(() => ({})),
      apiFetch(`${API_BASE_URL}/api/boiler/kpis`).then(r => r.json()).catch(() => ({})),
      apiFetch(`${API_BASE_URL}/api/steam/kpis`).then(r => r.json()).catch(() => ({})),
      apiFetch(`${API_BASE_URL}/api/tank/kpis`).then(r => r.json()).catch(() => ({})),
    ]).then(([elec, sub, boil, steam, tank]) => {
      setKpis({ electricity: elec, substation: sub, boiler: boil, steam: steam, tank: tank });
    });
  }, []);

  if (!ready) return null;

  const e = kpis.electricity ?? {};
  const ss = kpis.substation ?? {};
  const b = kpis.boiler ?? {};
  const s = kpis.steam ?? {};
  const t = kpis.tank ?? {};

  // --- Cross-domain calculations ---
  const steamSurplus = (s.totalProduction ?? 0) - (s.totalDemand ?? 0);
  const tankNetFlow = (t.dailyReceipts ?? 0) - (t.dailyDispatches ?? 0);
  const energyPerBarrel = (e.totalConsumption ?? 0) > 0 && (t.currentThroughput ?? 0) > 0
    ? (e.totalConsumption / t.currentThroughput) : 0;
  const fuelToSteamRatio = (b.totalFuelRate ?? 0) > 0 && (b.totalSteamOutput ?? 0) > 0
    ? (b.totalSteamOutput / b.totalFuelRate * 1000) : 0; // kg steam per L fuel
  const overallEfficiency = (b.fleetEfficiency ?? 0) > 0 && (s.systemEfficiency ?? 0) > 0
    ? ((b.fleetEfficiency / 100) * (s.systemEfficiency / 100) * (s.condensateRecovery ?? 0) / 100 * 100) : 0;

  const crossMetrics: CrossDomainMetric[] = [
    {
      label: 'Energy per Throughput',
      value: `${fmtF(energyPerBarrel)} kWh/bbl`,
      subLabel: `${fmt(e.totalConsumption)} kWh ÷ ${fmt(t.currentThroughput)} bbl/d`,
      icon: <Zap size={16} className="text-[#F6AD55]" />,
      color: 'bg-[#F6AD55]/10',
      trend: energyPerBarrel > 5.5 ? 'up' : energyPerBarrel < 4.5 ? 'down' : 'flat',
      trendValue: energyPerBarrel > 5.5 ? 'High' : energyPerBarrel < 4.5 ? 'Low' : 'Normal',
    },
    {
      label: 'Fuel → Steam Efficiency',
      value: `${fmtF(fuelToSteamRatio)} kg/L`,
      subLabel: `${fmtF(b.totalSteamOutput)} T/h from ${fmt(b.totalFuelRate)} L/h fuel`,
      icon: <Flame size={16} className="text-[#E53E3E]" />,
      color: 'bg-[#E53E3E]/10',
      trend: fuelToSteamRatio > 80 ? 'up' : 'flat',
      trendValue: `${fmtF(b.fleetEfficiency)}% eff`,
    },
    {
      label: 'Steam Surplus → Heating',
      value: `${fmtF(steamSurplus)} T/h`,
      subLabel: `${fmtF(s.totalProduction)} T/h produced − ${fmtF(s.totalDemand)} T/h consumed`,
      icon: <Droplets size={16} className="text-[#56CDE7]" />,
      color: 'bg-[#56CDE7]/10',
      trend: steamSurplus > 3 ? 'up' : steamSurplus < 1 ? 'down' : 'flat',
      trendValue: steamSurplus > 3 ? 'Excess' : steamSurplus < 1 ? 'Tight' : 'Balanced',
    },
    {
      label: 'Tank Net Flow',
      value: `${tankNetFlow >= 0 ? '+' : ''}${fmt(tankNetFlow)} bbl/d`,
      subLabel: `Receipts ${fmt(t.dailyReceipts)} − Dispatches ${fmt(t.dailyDispatches)}`,
      icon: <Gauge size={16} className="text-[#5CE5A0]" />,
      color: 'bg-[#5CE5A0]/10',
      trend: tankNetFlow > 0 ? 'up' : tankNetFlow < 0 ? 'down' : 'flat',
      trendValue: `${t.tanksInOperation ?? '—'}/${t.tanksTotal ?? 59} active`,
    },
    {
      label: 'Grid → Terminal Load',
      value: `${fmtF(ss.totalLoad)} MW`,
      subLabel: `${fmtF(ss.incomingVoltage, 1)} kV @ ${fmtF(ss.frequency, 2)} Hz • THD ${fmtF(ss.thd)}%`,
      icon: <Activity size={16} className="text-[#4D65FF]" />,
      color: 'bg-[#4D65FF]/10',
      trend: (ss.transformerTemp ?? 0) > 75 ? 'up' : 'flat',
      trendValue: `${fmt(ss.transformerTemp)}°C xfmr`,
    },
    {
      label: 'Overall System Efficiency',
      value: `${fmtF(overallEfficiency)}%`,
      subLabel: `Boiler ${fmtF(b.fleetEfficiency)}% × Steam ${fmtF(s.systemEfficiency)}% × Recovery ${s.condensateRecovery ?? '—'}%`,
      icon: <TrendingUp size={16} className="text-[#5CE5A0]" />,
      color: 'bg-[#5CE5A0]/10',
      trend: overallEfficiency > 60 ? 'up' : overallEfficiency < 50 ? 'down' : 'flat',
      trendValue: overallEfficiency > 60 ? 'Good' : overallEfficiency < 50 ? 'Low' : 'Fair',
    },
  ];

  // --- Flow summary ---
  const flowSteps = [
    { label: 'Grid', value: `${fmt(e.realTimeDemand)} kW`, color: 'text-[#F6AD55]' },
    { label: 'Substation', value: `${fmtF(ss.totalLoad)} MW`, color: 'text-[#4D65FF]' },
    { label: 'Boiler', value: `${fmt(b.totalFuelRate)} L/h`, color: 'text-[#E53E3E]' },
    { label: 'Steam', value: `${fmtF(s.totalProduction)} T/h`, color: 'text-[#56CDE7]' },
    { label: 'Tank Farm', value: `${fmt(t.currentThroughput)} bbl/d`, color: 'text-[#5CE5A0]' },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <PageBanner variant="pipeline" />

        {/* Flow summary bar */}
        <div className="theme-card rounded-xl p-3 flex items-center justify-between gap-2 overflow-x-auto">
          {flowSteps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 shrink-0">
              <div className="text-center">
                <p className={`text-xs font-bold ${step.color}`}>{step.value}</p>
                <p className="text-[9px] text-muted-foreground">{step.label}</p>
              </div>
              {i < flowSteps.length - 1 && <ArrowRight size={14} className="text-muted-foreground/30 shrink-0" />}
            </div>
          ))}
        </div>

        {/* DAG */}
        <PipelineDAG />

        {/* Cross-domain calculated metrics */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3">Cross-Domain Analytics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {crossMetrics.map((m) => (
              <MetricCard key={m.label} m={m} />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="theme-card rounded-xl p-3">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full bg-[var(--color-accent,#5CE5A0)]" />
              <span className="text-xs font-semibold text-foreground">Normal</span>
            </div>
            <p className="text-[10px] text-muted-foreground">All parameters within operating limits</p>
          </div>
          <div className="theme-card rounded-xl p-3">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full bg-[var(--color-warning,#F6AD55)]" />
              <span className="text-xs font-semibold text-foreground">Warning</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Approaching threshold — attention needed</p>
          </div>
          <div className="theme-card rounded-xl p-3">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full bg-[var(--color-danger,#E53E3E)]" />
              <span className="text-xs font-semibold text-foreground">Critical</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Exceeded limits — immediate action required</p>
          </div>
        </div>
      </div>
    </div>
  );
}
