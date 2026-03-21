'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Thermometer, Activity, Zap, Wind, Droplets, AlertTriangle,
  ArrowLeft, Clock, Hash, Radio, Gauge, Flame,
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { mockBoilerData, fmtNum, MODES, generateBoilerTimeseries } from '@/lib/boilerData';

function InfoCard({ icon: Icon, label, value, unit, accent }: {
  icon: React.FC<{ size?: number; className?: string }>; label: string; value: string; unit?: string; accent?: boolean;
}) {
  return (
    <div className="bg-[#131620] rounded-xl border border-[#2C2E39] p-4 flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
        'bg-[#1B1E27]'
      )}>
        <Icon size={20} className={accent ? 'text-[#5CE5A0]' : 'text-[#454A5F]'} />
      </div>
      <div>
        <p className="text-xs text-[#454A5F]">{label}</p>
        <p className="text-lg font-bold text-[#F5F5F7]">
          {value}
          {unit && <span className="text-sm font-normal text-[#454A5F] ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#131620] rounded-xl border border-[#2C2E39] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2C2E39]/50">
        <h3 className="text-sm font-semibold text-[#F5F5F7]/80">{title}</h3>
      </div>
      <div className="px-4 py-3 h-[200px]">
        {children}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1B1E27] border border-[#2C2E39] rounded-md shadow-md px-3 py-2 text-xs">
      <p className="text-[#454A5F] mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono font-medium">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function BoilerDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const boiler = useMemo(() => mockBoilerData(id), [id]);
  const timeseries = useMemo(() => generateBoilerTimeseries(id, 24), [id]);
  const modeInfo = MODES[boiler.boilerMode] ?? MODES[0];
  const isActive = boiler.boilerMode === 1;

  return (
    <div className="bg-[#080A11] min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Back + Header */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#454A5F] hover:text-[#F5F5F7] mb-3">
            <ArrowLeft size={14} /> Back to terminal
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-3 h-3 rounded-full', isActive ? 'bg-[#5CE5A0] shadow-[0_0_8px_rgba(92,229,160,0.6)]' : 'bg-[#454A5F]')} />
              <div>
                <h1 className="text-2xl font-bold gradient-text">{boiler.boilerId}</h1>
                <p className="text-sm text-[#454A5F] font-mono">{id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', modeInfo.cls)}>
                {modeInfo.label}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#1B1E27] text-[#454A5F] font-medium">
                SID: {boiler.sid}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <InfoCard icon={Thermometer} label="Current PSI" value={fmtNum(boiler.currentPSI, 0)} unit="psi" accent={isActive} />
          <InfoCard icon={Gauge} label="Request PSI" value={fmtNum(boiler.requestPSI, 0)} unit="psi" />
          <InfoCard icon={Zap} label="Setpoint" value={fmtNum(boiler.setpointPSI, 0)} unit="psi" />
          <InfoCard icon={Flame} label="Firing Rate" value={fmtNum(boiler.firingRate, 1)} unit="%" accent={isActive && boiler.firingRate > 50} />
          <InfoCard icon={Wind} label="Steam Output" value={fmtNum(boiler.steamProduced, 1)} unit="lb/hr" />
          <InfoCard icon={Droplets} label="Gas Consumed" value={fmtNum(boiler.gasConsumed)} unit="cf" />
        </div>

        {/* Extra info row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#131620] rounded-xl border border-[#2C2E39] p-3 flex items-center gap-2">
            <Radio size={14} className="text-[#454A5F]" />
            <span className="text-xs text-[#454A5F]">Flame Level</span>
            <span className="ml-auto text-sm font-bold text-[#F5F5F7]">{boiler.flameLevel}</span>
          </div>
          <div className="bg-[#131620] rounded-xl border border-[#2C2E39] p-3 flex items-center gap-2">
            <Hash size={14} className="text-[#454A5F]" />
            <span className="text-xs text-[#454A5F]">Error Code</span>
            <span className="ml-auto text-sm font-bold text-[#F5F5F7]">{boiler.errorCode}</span>
          </div>
          <div className="bg-[#131620] rounded-xl border border-[#2C2E39] p-3 flex items-center gap-2">
            <AlertTriangle size={14} className={boiler.diagnosticCode !== '0' ? 'text-yellow-500' : 'text-[#454A5F]'} />
            <span className="text-xs text-[#454A5F]">Diag Code</span>
            <span className={cn('ml-auto text-sm font-bold', boiler.diagnosticCode !== '0' ? 'text-yellow-500' : 'text-[#F5F5F7]')}>
              {boiler.diagnosticCode}
            </span>
          </div>
          <div className="bg-[#131620] rounded-xl border border-[#2C2E39] p-3 flex items-center gap-2">
            <Clock size={14} className="text-[#454A5F]" />
            <span className="text-xs text-[#454A5F]">Last Update</span>
            <span className="ml-auto text-xs font-mono text-[#F5F5F7]/70">
              {new Date(boiler.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Pressure (PSI) — Last 24h">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeseries.psiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#454A5F' }} interval={3} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#454A5F' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="value" stroke="#F6AD55" strokeWidth={2} dot={false} name="PSI" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Steam Production (lb/hr) — Last 24h">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries.steamData}>
                <defs>
                  <linearGradient id="steamGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#56CDE7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#56CDE7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#454A5F' }} interval={3} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#454A5F' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#56CDE7" strokeWidth={2} fill="url(#steamGrad2)" name="Steam" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Firing Rate (%) — Last 24h">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries.firingData}>
                <defs>
                  <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E53E3E" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#E53E3E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#454A5F' }} interval={3} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#454A5F' }} axisLine={false} tickLine={false} width={35} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#E53E3E" strokeWidth={2} fill="url(#fireGrad)" name="Rate" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Cumulative Gas Consumed (cf) — Last 24h">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeseries.gasData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2E39" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#454A5F' }} interval={3} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#454A5F' }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => fmtNum(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" fill="#4D65FF" radius={[2, 2, 0, 0]} name="Gas" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
