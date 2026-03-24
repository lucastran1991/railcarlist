// @ts-nocheck — @xyflow/react types pending for React 19
'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionLineType,
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
} from '@xyflow/react';
import Dagre from '@dagrejs/dagre';
import {
  Zap, Activity, Flame, Droplets, Gauge,
  TrendingUp, TrendingDown, Minus,
  Thermometer, Shield, Wind, Fuel, AlertTriangle,
  ArrowDownToLine, ArrowUpFromLine, Database, ToggleLeft, ToggleRight,
  Power, Lightbulb, Cog, Radio, BarChart3,
  Anvil, Waves, Filter, CircleDot, Truck, CloudOff,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import '@xyflow/react/dist/style.css';

// ============================================================
// Types
// ============================================================

type Status = 'normal' | 'warning' | 'critical';
type Trend = 'up' | 'down' | 'flat';

interface NodeKPI {
  label: string;
  value: string;
}

interface DomainNodeData {
  label: string;
  icon: string;
  kpiValue: string;
  unit: string;
  kpis: NodeKPI[];
  status: Status;
  trend: Trend;
  trendValue: string;
  href?: string;
  isSubNode?: boolean;
  onNodeClick?: (data: DomainNodeData) => void;
}

// ============================================================
// Visual constants
// ============================================================

const ICONS: Record<string, React.ReactNode> = {
  electricity: <Zap size={18} className="text-[#F6AD55]" />,
  substation: <Activity size={18} className="text-[#4D65FF]" />,
  boiler: <Flame size={18} className="text-[#E53E3E]" />,
  steam: <Droplets size={18} className="text-[#56CDE7]" />,
  tank: <Gauge size={18} className="text-[#5CE5A0]" />,
  transformer: <Thermometer size={16} className="text-[#4D65FF]" />,
  switchgear: <Shield size={16} className="text-[#4D65FF]" />,
  powerquality: <Activity size={16} className="text-[#4D65FF]" />,
  fuel: <Fuel size={16} className="text-[#E53E3E]" />,
  combustion: <Flame size={16} className="text-[#E53E3E]" />,
  emissions: <Wind size={16} className="text-[#94A3B8]" />,
  header: <Droplets size={16} className="text-[#56CDE7]" />,
  distribution: <Activity size={16} className="text-[#56CDE7]" />,
  heating: <Thermometer size={16} className="text-[#F6AD55]" />,
  receipts: <ArrowDownToLine size={16} className="text-[#5CE5A0]" />,
  dispatches: <ArrowUpFromLine size={16} className="text-[#4D65FF]" />,
  inventory: <Database size={16} className="text-[#5CE5A0]" />,
  alert: <AlertTriangle size={16} className="text-[#ECC94B]" />,
  generator: <Power size={16} className="text-[#F6AD55]" />,
  mcc: <Cog size={16} className="text-[#F6AD55]" />,
  lighting: <Lightbulb size={16} className="text-[#F6AD55]" />,
  pumpmotors: <Cog size={16} className="text-[#F6AD55]" />,
  busbar: <Activity size={16} className="text-[#4D65FF]" />,
  capacitor: <CircleDot size={16} className="text-[#4D65FF]" />,
  relay: <Shield size={16} className="text-[#4D65FF]" />,
  metering: <BarChart3 size={16} className="text-[#4D65FF]" />,
  fuelstorage: <Fuel size={16} className="text-[#E53E3E]" />,
  fueltreat: <Filter size={16} className="text-[#E53E3E]" />,
  economizer: <Thermometer size={16} className="text-[#E53E3E]" />,
  feedwater: <Waves size={16} className="text-[#56CDE7]" />,
  hpsteam: <Droplets size={16} className="text-[#E53E3E]" />,
  lpsteam: <Droplets size={16} className="text-[#56CDE7]" />,
  prs: <Gauge size={16} className="text-[#56CDE7]" />,
  condensate: <Waves size={16} className="text-[#56CDE7]" />,
  deaerator: <Radio size={16} className="text-[#56CDE7]" />,
  steamtrace: <Thermometer size={16} className="text-[#F6AD55]" />,
  manifold: <Anvil size={16} className="text-[#5CE5A0]" />,
  gauging: <Gauge size={16} className="text-[#5CE5A0]" />,
  heatingcoils: <Thermometer size={16} className="text-[#F6AD55]" />,
  pumpstation: <Cog size={16} className="text-[#5CE5A0]" />,
  loadingbay: <Truck size={16} className="text-[#4D65FF]" />,
  vru: <CloudOff size={16} className="text-[#94A3B8]" />,
  stack: <Wind size={16} className="text-[#94A3B8]" />,
};

const STATUS_BORDER: Record<Status, string> = {
  normal: 'border-[var(--color-accent,#5CE5A0)]/40 hover:border-[var(--color-accent,#5CE5A0)]/80',
  warning: 'border-[var(--color-warning,#F6AD55)]/50 hover:border-[var(--color-warning,#F6AD55)]/90',
  critical: 'border-[var(--color-danger,#E53E3E)]/50 hover:border-[var(--color-danger,#E53E3E)]/90',
};

const STATUS_DOT: Record<Status, string> = {
  normal: 'bg-[var(--color-accent,#5CE5A0)] shadow-[0_0_6px_var(--color-accent,#5CE5A0)]',
  warning: 'bg-[var(--color-warning,#F6AD55)] shadow-[0_0_6px_var(--color-warning,#F6AD55)]',
  critical: 'bg-[var(--color-danger,#E53E3E)] shadow-[0_0_6px_var(--color-danger,#E53E3E)] animate-pulse',
};

const TREND_ICON: Record<Trend, React.ReactNode> = {
  up: <TrendingUp size={10} className="text-[#5CE5A0]" />,
  down: <TrendingDown size={10} className="text-[#E53E3E]" />,
  flat: <Minus size={10} className="text-muted-foreground" />,
};

// ============================================================
// Helpers
// ============================================================

const fmt = (v: number | undefined, d = 0) => v != null ? v.toLocaleString(undefined, { maximumFractionDigits: d }) : '—';
const fmtF = (v: number | undefined, d = 1) => v != null ? v.toFixed(d) : '—';

function calcTrend(current: number | undefined, reference: number | undefined): { trend: Trend; trendValue: string } {
  if (current == null || reference == null || reference === 0) return { trend: 'flat', trendValue: '0.0%' };
  const pct = ((current - reference) / Math.abs(reference)) * 100;
  if (Math.abs(pct) < 0.5) return { trend: 'flat', trendValue: '0.0%' };
  return {
    trend: pct > 0 ? 'up' : 'down',
    trendValue: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
  };
}

function calcStatus(rules: [boolean, Status][]): Status {
  for (const [condition, status] of rules) {
    if (condition) return status;
  }
  return 'normal';
}

// ============================================================
// Custom Node
// ============================================================

function DomainNode({ data }: { data: DomainNodeData }) {
  const [hovered, setHovered] = useState(false);
  const isSubNode = data.isSubNode;
  const minW = isSubNode ? 'min-w-[170px]' : 'min-w-[200px]';
  const textSize = isSubNode ? 'text-xs' : 'text-sm';
  const kpiSize = isSubNode ? 'text-lg' : 'text-xl';

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div
        className={`theme-card rounded-xl border-2 ${STATUS_BORDER[data.status]} px-3 py-2.5 ${minW} transition-all duration-200 hover:scale-[1.03] hover:shadow-xl cursor-pointer`}
        onClick={() => data.onNodeClick?.(data)}
      >
        <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-muted-foreground/40 !border-2 !border-background" />

        <div className="flex items-center gap-1.5 mb-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[data.status]}`} />
          {ICONS[data.icon]}
          <span className={`font-bold ${textSize} text-foreground`}>{data.label}</span>
        </div>

        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className={`${kpiSize} font-bold text-foreground`}>{data.kpiValue}</span>
          <span className="text-[9px] text-muted-foreground">{data.unit}</span>
          <div className="flex items-center gap-0.5 ml-auto">
            {TREND_ICON[data.trend]}
            <span className={`text-[9px] font-medium ${data.trend === 'up' ? 'text-[#5CE5A0]' : data.trend === 'down' ? 'text-[#E53E3E]' : 'text-muted-foreground'}`}>
              {data.trendValue}
            </span>
          </div>
        </div>

        {data.kpis.length > 0 && (
          <div className="mt-1 pt-1 border-t border-border/30 space-y-0.5">
            {data.kpis.slice(0, 2).map((kpi, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="text-[8px] text-muted-foreground truncate">{kpi.label}</span>
                <span className="text-[8px] font-mono text-foreground shrink-0">{kpi.value}</span>
              </div>
            ))}
          </div>
        )}

        <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-[var(--color-accent,#5CE5A0)] !border-2 !border-background" />
      </div>

      {hovered && data.kpis.length > 2 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 pointer-events-none animate-[fadeIn_0.15s_ease-out]">
          <div className="theme-card rounded-lg px-3 py-2.5 min-w-[200px] shadow-xl border border-border/50">
            <p className="text-[10px] font-bold text-foreground mb-1.5">{data.label} Details</p>
            <div className="space-y-1">
              {data.kpis.map((kpi, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-[9px] text-muted-foreground">{kpi.label}</span>
                  <span className="text-[9px] font-mono text-foreground">{kpi.value}</span>
                </div>
              ))}
            </div>
            {data.href && <p className="text-[8px] text-[var(--color-accent,#5CE5A0)] mt-1.5 font-medium">Click to view dashboard →</p>}
          </div>
          <div className="w-0 h-0 mx-auto border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-border/50" />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Custom Edge
// ============================================================

function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style, markerEnd }) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 16 });

  return (
    <>
      <BaseEdge id={`${id}-glow`} path={edgePath} style={{ ...style, strokeWidth: (style?.strokeWidth ?? 3) + 4, opacity: 0.08, filter: 'blur(4px)' }} />
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            className="text-[7px] font-medium text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border border-border/30 pointer-events-none whitespace-nowrap"
          >
            {data.label}
            {data.flowValue && <span className="ml-1 text-foreground font-bold">{data.flowValue}</span>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// ============================================================
// Dagre Layout
// ============================================================

function layoutDAG(nodes, edges, nodeWidth = 210, nodeHeight = 110) {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 35, ranksep: 90, marginx: 30, marginy: 30 });
  nodes.forEach((n) => g.setNode(n.id, { width: nodeWidth, height: nodeHeight }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  Dagre.layout(g);
  return {
    nodes: nodes.map((n) => ({ ...n, position: { x: g.node(n.id).x - nodeWidth / 2, y: g.node(n.id).y - nodeHeight / 2 } })),
    edges,
  };
}

// ============================================================
// Edge styling helpers
// ============================================================

const primaryEdge = { stroke: 'var(--color-accent, #5CE5A0)', strokeWidth: 2.5 };
const secondaryEdge = { stroke: 'var(--color-secondary, #56CDE7)', strokeWidth: 2 };
const warningEdge = { stroke: 'var(--color-warning, #F6AD55)', strokeWidth: 2 };
const dangerEdge = { stroke: 'var(--color-danger, #E53E3E)', strokeWidth: 1.5 };
const dashedEdge = (base: object) => ({ ...base, strokeDasharray: '6 3', opacity: 0.5 });
const primaryMarker = { type: MarkerType.ArrowClosed, color: 'var(--color-accent, #5CE5A0)', width: 16, height: 16 };
const secondaryMarker = { type: MarkerType.ArrowClosed, color: 'var(--color-secondary, #56CDE7)', width: 16, height: 16 };
const warningMarker = { type: MarkerType.ArrowClosed, color: 'var(--color-warning, #F6AD55)', width: 16, height: 16 };
const dangerMarker = { type: MarkerType.ArrowClosed, color: 'var(--color-danger, #E53E3E)', width: 14, height: 14 };

// ============================================================
// Overview nodes + edges (5 domain nodes)
// ============================================================

function buildOverviewNodes(k: Record<string, any>) {
  const e = k.electricity ?? {}, ss = k.substation ?? {}, b = k.boiler ?? {}, s = k.steam ?? {}, t = k.tank ?? {};

  const elecTrend = calcTrend(e.realTimeDemand, e.peakDemand ? e.peakDemand * 0.48 : undefined);
  const steamTrend = calcTrend(s.totalProduction, s.totalDemand);
  const tankNetFlow = (t.dailyReceipts ?? 0) - (t.dailyDispatches ?? 0);
  const tankTrend = calcTrend(tankNetFlow + 1000, 1000); // net flow relative

  return [
    { id: 'electricity', type: 'domain', position: { x: 0, y: 0 }, data: {
      label: 'Electricity', icon: 'electricity', href: '/electricity',
      kpiValue: fmt(e.realTimeDemand), unit: 'kW',
      kpis: [
        { label: 'Consumption', value: `${fmt(e.totalConsumption)} kWh` },
        { label: 'Peak Demand', value: `${fmt(e.peakDemand)} kW` },
        { label: 'Power Factor', value: `${fmtF(e.powerFactor, 2)}` },
        { label: 'Grid Availability', value: `${fmtF(e.gridAvailability)}%` },
        { label: 'Energy Cost', value: `$${fmt(e.energyCost)}` },
        { label: 'Carbon', value: `${fmtF(e.carbonEmissions)} t` },
      ],
      status: calcStatus([[e.transformerLoad > 95, 'critical'], [e.transformerLoad > 85, 'warning']]),
      ...elecTrend,
    }},
    { id: 'substation', type: 'domain', position: { x: 0, y: 0 }, data: {
      label: 'Sub Station', icon: 'substation', href: '/sub-station',
      kpiValue: fmtF(ss.incomingVoltage, 2), unit: 'kV',
      kpis: [
        { label: 'Total Load', value: `${fmtF(ss.totalLoad)} MW` },
        { label: 'Frequency', value: `${fmtF(ss.frequency, 2)} Hz` },
        { label: 'THD', value: `${fmtF(ss.thd)}%` },
        { label: 'Transformer Temp', value: `${fmt(ss.transformerTemp)}°C` },
        { label: 'Breakers', value: `${ss.breakersClosed ?? '—'}/${ss.breakersTotal ?? '—'}` },
        { label: 'Faults (24h)', value: `${ss.faultEvents24h ?? 0}` },
      ],
      status: calcStatus([[(ss.thd ?? 0) > 8, 'critical'], [(ss.thd ?? 0) > 5, 'warning'], [(ss.faultEvents24h ?? 0) > 3, 'warning']]),
      trend: 'flat', trendValue: '0.0%',
    }},
    { id: 'boiler', type: 'domain', position: { x: 0, y: 0 }, data: {
      label: 'Boiler', icon: 'boiler', href: '/boiler',
      kpiValue: `${b.boilersOnline ?? 0}/${b.boilersTotal ?? 0}`, unit: 'online',
      kpis: [
        { label: 'Steam Output', value: `${fmtF(b.totalSteamOutput)} T/h` },
        { label: 'Efficiency', value: `${fmtF(b.fleetEfficiency)}%` },
        { label: 'Stack Temp', value: `${fmt(b.avgStackTemp)}°C` },
        { label: 'Fuel Rate', value: `${fmt(b.totalFuelRate)} L/h` },
        { label: 'CO', value: `${fmt(b.coEmissions)} ppm` },
        { label: 'NOx', value: `${fmt(b.noxEmissions)} ppm` },
      ],
      status: calcStatus([[(b.boilersOnline ?? 0) < (b.boilersTotal ?? 0) - 1, 'critical'], [(b.boilersOnline ?? 0) < (b.boilersTotal ?? 0), 'warning']]),
      trend: 'flat', trendValue: '0.0%',
    }},
    { id: 'steam', type: 'domain', position: { x: 0, y: 0 }, data: {
      label: 'Steam', icon: 'steam', href: '/steam',
      kpiValue: fmtF(s.totalProduction), unit: 'T/h',
      kpis: [
        { label: 'Demand', value: `${fmtF(s.totalDemand)} T/h` },
        { label: 'Header Pressure', value: `${fmtF(s.headerPressure)} bar` },
        { label: 'Temperature', value: `${fmt(s.steamTemperature)}°C` },
        { label: 'System Efficiency', value: `${fmtF(s.systemEfficiency)}%` },
        { label: 'Condensate Recovery', value: `${s.condensateRecovery ?? '—'}%` },
        { label: 'Makeup Water', value: `${fmtF(s.makeupWaterFlow)} m³/h` },
      ],
      status: calcStatus([[(s.headerPressure ?? 40) < 36, 'critical'], [(s.headerPressure ?? 40) < 38, 'warning']]),
      ...steamTrend,
    }},
    { id: 'tank', type: 'domain', position: { x: 0, y: 0 }, data: {
      label: 'Tank Farm', icon: 'tank', href: '/tank',
      kpiValue: t.tanksInOperation?.toString() ?? '—', unit: `/ ${t.tanksTotal ?? 59}`,
      kpis: [
        { label: 'Inventory', value: `${fmt(t.totalInventory)} bbl` },
        { label: 'Available Capacity', value: `${t.availableCapacity ?? '—'}%` },
        { label: 'Throughput', value: `${fmt(t.currentThroughput)} bbl/d` },
        { label: 'Daily Receipts', value: `${fmt(t.dailyReceipts)} bbl` },
        { label: 'Daily Dispatches', value: `${fmt(t.dailyDispatches)} bbl` },
        { label: 'Active Alarms', value: `${t.activeAlarms ?? 0}` },
      ],
      status: calcStatus([[(t.activeAlarms ?? 0) > 5, 'critical'], [(t.activeAlarms ?? 0) > 0, 'warning']]),
      ...tankTrend,
    }},
  ];
}

function buildOverviewEdges(k: Record<string, any>) {
  const e = k.electricity ?? {}, b = k.boiler ?? {}, s = k.steam ?? {};
  return [
    { id: 'ov-e1', source: 'electricity', target: 'substation', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'HV Feed', flowValue: `${fmt(e.realTimeDemand)} kW` } },
    { id: 'ov-e2', source: 'substation', target: 'boiler', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'MV Distribution' } },
    { id: 'ov-e3', source: 'boiler', target: 'steam', type: 'flow', animated: true, style: warningEdge, markerEnd: warningMarker, data: { label: 'Steam Generation', flowValue: `${fmtF(b.totalSteamOutput)} T/h` } },
    { id: 'ov-e4', source: 'steam', target: 'tank', type: 'flow', animated: true, style: secondaryEdge, markerEnd: secondaryMarker, data: { label: 'Tank Heating', flowValue: `${fmtF((s.totalProduction ?? 0) - (s.totalDemand ?? 0))} T/h` } },
    { id: 'ov-e5', source: 'electricity', target: 'tank', type: 'flow', animated: false, style: dashedEdge(secondaryEdge), markerEnd: secondaryMarker, data: { label: 'Pump Power' } },
  ];
}

// ============================================================
// Detailed nodes + edges (sub-nodes per domain)
// ============================================================

function buildDetailedNodes(k: Record<string, any>) {
  const e = k.electricity ?? {}, ss = k.substation ?? {}, b = k.boiler ?? {}, s = k.steam ?? {}, t = k.tank ?? {};

  const surplusSteam = (s.totalProduction ?? 0) - (s.totalDemand ?? 0);
  const netFlow = (t.dailyReceipts ?? 0) - (t.dailyDispatches ?? 0);
  const hpPressure = s.headerPressure ?? 42;
  const lpPressure = hpPressure * 0.28;
  const condensateRate = (s.totalProduction ?? 18) * ((s.condensateRecovery ?? 82) / 100);
  const makeupWater = s.makeupWaterFlow ?? 3.2;
  const fuelStorageLevel = 78; // plausible %
  const stackTempVal = b.avgStackTemp ?? 185;
  const economizerRecovery = stackTempVal > 160 ? 12.5 : 8.2; // % heat recovery

  const n = (id: string, label: string, icon: string, kpiValue: string, unit: string, kpis: NodeKPI[], status: Status, trend: Trend = 'flat', trendValue = '0.0%', href?: string) =>
    ({ id, type: 'domain', position: { x: 0, y: 0 }, data: { label, icon, kpiValue, unit, kpis, status, trend, trendValue, href, isSubNode: true } as DomainNodeData });

  return [
    // ===================== Electricity =====================
    n('elec-grid', 'Power Grid', 'electricity',
      fmt(e.realTimeDemand), 'kW',
      [{ label: 'Peak Demand', value: `${fmt(e.peakDemand)} kW` }, { label: 'Availability', value: `${fmtF(e.gridAvailability)}%` }, { label: 'Voltage', value: '33 kV' }],
      calcStatus([[e.transformerLoad > 95, 'critical'], [e.transformerLoad > 85, 'warning']]),
      ...Object.values(calcTrend(e.realTimeDemand, e.peakDemand ? e.peakDemand * 0.48 : undefined)),
      '/electricity',
    ),
    n('elec-gen', 'Emergency Generator', 'generator',
      'Standby', '',
      [{ label: 'Capacity', value: '2,500 kVA' }, { label: 'Fuel Level', value: '92%' }, { label: 'Last Test', value: '3d ago' }],
      'normal',
    ),
    n('elec-mcc', 'Power Distribution', 'mcc',
      fmt(Math.round((e.realTimeDemand ?? 2400) * 0.85)), 'kW',
      [{ label: 'MCC Load', value: `${fmtF((e.realTimeDemand ?? 2400) * 0.85 / (e.peakDemand ?? 3200) * 100)}%` }, { label: 'Active Feeders', value: '24/28' }, { label: 'Trip Events', value: '0' }],
      calcStatus([[(e.realTimeDemand ?? 0) > (e.peakDemand ?? 9999) * 0.9, 'warning']]),
    ),
    n('elec-hvac', 'Lighting & HVAC', 'lighting',
      fmt(Math.round((e.realTimeDemand ?? 2400) * 0.12)), 'kW',
      [{ label: 'HVAC Load', value: `${fmt(Math.round((e.realTimeDemand ?? 2400) * 0.08))} kW` }, { label: 'Lighting', value: `${fmt(Math.round((e.realTimeDemand ?? 2400) * 0.04))} kW` }],
      'normal',
    ),
    n('elec-pumps', 'Pump Motors', 'pumpmotors',
      fmt(Math.round((e.realTimeDemand ?? 2400) * 0.35)), 'kW',
      [{ label: 'Running', value: '8/12 motors' }, { label: 'Avg Load', value: '76%' }, { label: 'VFD Active', value: '6/8' }],
      calcStatus([[(e.realTimeDemand ?? 0) > (e.peakDemand ?? 9999) * 0.95, 'warning']]),
    ),
    n('elec-cost', 'Energy & Carbon', 'alert',
      `$${fmt(e.energyCost)}`, '/month',
      [{ label: 'Carbon Emissions', value: `${fmtF(e.carbonEmissions)} t CO₂` }, { label: 'Power Factor', value: `${fmtF(e.powerFactor, 2)}` }, { label: 'Tariff Rate', value: '$0.087/kWh' }],
      calcStatus([[(e.powerFactor ?? 1) < 0.9, 'warning'], [(e.powerFactor ?? 1) < 0.85, 'critical']]),
    ),

    // ===================== Substation =====================
    n('sub-xfmr', 'Main Transformer', 'transformer',
      fmtF(ss.incomingVoltage, 2), 'kV',
      [{ label: 'Temperature', value: `${fmt(ss.transformerTemp)}°C` }, { label: 'Load', value: `${fmtF(ss.totalLoad)} MW` }, { label: 'Tap Position', value: '7/21' }],
      calcStatus([[(ss.transformerTemp ?? 0) > 90, 'critical'], [(ss.transformerTemp ?? 0) > 75, 'warning']]),
      'flat', '0.0%', '/sub-station',
    ),
    n('sub-busA', 'Bus Section A', 'busbar',
      fmtF((ss.totalLoad ?? 4.2) * 0.55), 'MW',
      [{ label: 'Feeders', value: '14/16 closed' }, { label: 'Current', value: `${fmt(Math.round((ss.totalLoad ?? 4.2) * 0.55 * 1000 / 11))} A` }],
      calcStatus([[(ss.faultEvents24h ?? 0) > 2, 'warning']]),
    ),
    n('sub-busB', 'Bus Section B', 'busbar',
      fmtF((ss.totalLoad ?? 4.2) * 0.45), 'MW',
      [{ label: 'Feeders', value: '12/14 closed' }, { label: 'Current', value: `${fmt(Math.round((ss.totalLoad ?? 4.2) * 0.45 * 1000 / 11))} A` }],
      calcStatus([[(ss.faultEvents24h ?? 0) > 2, 'warning']]),
    ),
    n('sub-cap', 'Capacitor Bank', 'capacitor',
      fmtF(e.powerFactor ?? 0.94, 2), 'PF',
      [{ label: 'Reactive Power', value: `${fmt(Math.round((ss.totalLoad ?? 4.2) * 300))} kVAR` }, { label: 'Steps Active', value: '4/6' }, { label: 'Target PF', value: '0.95' }],
      calcStatus([[(e.powerFactor ?? 1) < 0.9, 'warning'], [(e.powerFactor ?? 1) < 0.85, 'critical']]),
    ),
    n('sub-relay', 'Protection Relays', 'relay',
      `${ss.breakersClosed ?? 0}/${ss.breakersTotal ?? 0}`, 'active',
      [{ label: 'Faults (24h)', value: `${ss.faultEvents24h ?? 0}` }, { label: 'Last Trip', value: '14d ago' }, { label: 'Auto-reclose', value: 'Armed' }],
      calcStatus([[(ss.faultEvents24h ?? 0) > 3, 'critical'], [(ss.faultEvents24h ?? 0) > 0, 'warning']]),
    ),
    n('sub-meter', 'Metering & Monitor', 'metering',
      `${fmtF(ss.thd)}%`, 'THD',
      [{ label: 'Frequency', value: `${fmtF(ss.frequency, 2)} Hz` }, { label: 'Bus Balance', value: `${fmtF(ss.busbarBalance)}%` }, { label: 'Data Points', value: '1,284/s' }],
      calcStatus([[(ss.thd ?? 0) > 8, 'critical'], [(ss.thd ?? 0) > 5, 'warning']]),
    ),

    // ===================== Boiler =====================
    n('boil-store', 'Fuel Storage', 'fuelstorage',
      `${fuelStorageLevel}%`, 'level',
      [{ label: 'Volume', value: '156,000 L' }, { label: 'Days Remaining', value: '12.4 d' }, { label: 'Last Delivery', value: '3d ago' }],
      calcStatus([[fuelStorageLevel < 20, 'critical'], [fuelStorageLevel < 35, 'warning']]),
    ),
    n('boil-treat', 'Fuel Treatment', 'fueltreat',
      fmt(b.totalFuelRate), 'L/h',
      [{ label: 'Filter ΔP', value: '0.8 bar' }, { label: 'Viscosity', value: '12.4 cSt' }, { label: 'Temp Out', value: '98°C' }],
      calcStatus([[(b.totalFuelRate ?? 0) > 600, 'warning']]),
    ),
    n('boil-comb', 'Combustion Chamber', 'combustion',
      `${b.boilersOnline ?? 0}/${b.boilersTotal ?? 0}`, 'online',
      [{ label: 'Efficiency', value: `${fmtF(b.fleetEfficiency)}%` }, { label: 'Stack Temp', value: `${fmt(b.avgStackTemp)}°C` }, { label: 'O₂ Level', value: `${fmtF(b.avgO2)}%` }, { label: 'Firebox Press', value: '-2.1 mmH₂O' }],
      calcStatus([[(b.boilersOnline ?? 0) < (b.boilersTotal ?? 0) - 1, 'critical'], [(b.fleetEfficiency ?? 100) < 85, 'warning']]),
      'flat', '0.0%', '/boiler',
    ),
    n('boil-econ', 'Economizer', 'economizer',
      `${fmtF(economizerRecovery)}%`, 'recovery',
      [{ label: 'Inlet Temp', value: `${fmt(stackTempVal)}°C` }, { label: 'Outlet Temp', value: `${fmt(Math.round(stackTempVal * 0.72))}°C` }, { label: 'Energy Saved', value: `${fmtF(economizerRecovery * 8.5)} kW` }],
      'normal',
    ),
    n('boil-stack', 'Stack & Emissions', 'stack',
      fmt(b.coEmissions), 'ppm CO',
      [{ label: 'NOx', value: `${fmt(b.noxEmissions)} ppm` }, { label: 'O₂', value: `${fmtF(b.avgO2)}%` }, { label: 'Opacity', value: '4.2%' }, { label: 'Stack Height', value: '45 m' }],
      calcStatus([[(b.coEmissions ?? 0) > 150, 'critical'], [(b.coEmissions ?? 0) > 100, 'warning']]),
    ),
    n('boil-fw', 'Feedwater System', 'feedwater',
      fmtF(makeupWater), 'm³/h',
      [{ label: 'Feed Temp', value: '105°C' }, { label: 'Conductivity', value: '12 µS/cm' }, { label: 'pH', value: '9.2' }, { label: 'Deaerator Press', value: '0.2 bar' }],
      calcStatus([[makeupWater > 5, 'warning']]),
    ),

    // ===================== Steam =====================
    n('stm-hp', 'HP Steam Header', 'hpsteam',
      fmtF(hpPressure), 'bar',
      [{ label: 'Temperature', value: `${fmt(s.steamTemperature ?? 260)}°C` }, { label: 'Flow', value: `${fmtF(s.totalProduction)} T/h` }, { label: 'Quality', value: '99.5%' }],
      calcStatus([[hpPressure < 36, 'critical'], [hpPressure < 38, 'warning']]),
      ...Object.values(calcTrend(s.totalProduction, s.totalDemand)),
      '/steam',
    ),
    n('stm-prs', 'Pressure Reducing Stn', 'prs',
      `${fmtF(hpPressure)}→${fmtF(lpPressure)}`, 'bar',
      [{ label: 'ΔP', value: `${fmtF(hpPressure - lpPressure)} bar` }, { label: 'Valve Position', value: '62%' }, { label: 'Desuperheat', value: 'Active' }],
      'normal',
    ),
    n('stm-lp', 'LP Steam Header', 'lpsteam',
      fmtF(lpPressure), 'bar',
      [{ label: 'Temperature', value: `${fmt(Math.round((s.steamTemperature ?? 260) * 0.65))}°C` }, { label: 'Flow', value: `${fmtF((s.totalDemand ?? 14) * 0.6)} T/h` }],
      calcStatus([[lpPressure < 8, 'warning']]),
    ),
    n('stm-cond', 'Condensate Collection', 'condensate',
      fmtF(condensateRate), 'T/h',
      [{ label: 'Recovery Rate', value: `${s.condensateRecovery ?? 82}%` }, { label: 'Temperature', value: '85°C' }, { label: 'Flash Steam', value: `${fmtF(condensateRate * 0.08)} T/h` }],
      calcStatus([[(s.condensateRecovery ?? 100) < 70, 'critical'], [(s.condensateRecovery ?? 100) < 80, 'warning']]),
    ),
    n('stm-deaer', 'Deaerator', 'deaerator',
      '0.2', 'bar',
      [{ label: 'Temperature', value: '105°C' }, { label: 'O₂ Content', value: '< 7 ppb' }, { label: 'Level', value: '68%' }, { label: 'Vent Rate', value: '0.3 kg/h' }],
      'normal',
    ),
    n('stm-trace', 'Steam Tracing', 'steamtrace',
      fmtF(surplusSteam > 0 ? surplusSteam * 0.7 : 2.1), 'T/h',
      [{ label: 'Circuits Active', value: '34/38' }, { label: 'Avg Pipe Temp', value: '68°C' }, { label: 'Trap Failures', value: '2' }],
      calcStatus([[surplusSteam < 1, 'warning']]),
    ),

    // ===================== Tank Farm =====================
    n('tank-manif', 'Receiving Manifold', 'manifold',
      fmt(t.dailyReceipts), 'bbl/d',
      [{ label: 'Active Lines', value: '3/4' }, { label: 'Pressure', value: '4.2 bar' }, { label: 'Pipeline Temp', value: '52°C' }],
      'normal',
    ),
    n('tank-gauge', 'Tank Gauging System', 'gauging',
      `${t.tanksInOperation ?? '—'}/${t.tanksTotal ?? 59}`, 'tanks',
      [
        { label: 'Total Volume', value: `${fmt(t.totalInventory)} bbl` },
        { label: 'Available', value: `${t.availableCapacity ?? '—'}%` },
        { label: 'Radar Gauges', value: '59/59 online' },
        { label: 'Active Alarms', value: `${t.activeAlarms ?? 0}` },
      ],
      calcStatus([[(t.activeAlarms ?? 0) > 5, 'critical'], [(t.activeAlarms ?? 0) > 0, 'warning']]),
      ...Object.values(calcTrend(netFlow + 10000, 10000)),
      '/tank',
    ),
    n('tank-coils', 'Heating Coils', 'heatingcoils',
      fmt(t.avgTemperature), '°C',
      [{ label: 'Steam Input', value: `${fmtF(surplusSteam > 0 ? surplusSteam * 0.7 : 2.1)} T/h` }, { label: 'Tanks Heated', value: '22/59' }, { label: 'ΔT Avg', value: '+8.3°C' }],
      calcStatus([[(t.avgTemperature ?? 0) > 55, 'critical'], [(t.avgTemperature ?? 0) > 45, 'warning']]),
    ),
    n('tank-pump', 'Pumping Station', 'pumpstation',
      '8/12', 'running',
      [{ label: 'Total Flow', value: `${fmt(t.currentThroughput)} bbl/d` }, { label: 'Discharge Press', value: '6.8 bar' }, { label: 'Power Draw', value: `${fmt(Math.round((e.realTimeDemand ?? 2400) * 0.35))} kW` }],
      calcStatus([[(t.currentThroughput ?? 0) > 50000, 'warning']]),
    ),
    n('tank-load', 'Loading / Dispatch', 'loadingbay',
      fmt(t.dailyDispatches), 'bbl/d',
      [{ label: 'Active Bays', value: '4/6' }, { label: 'Trucks Today', value: '38' }, { label: 'Avg Load Time', value: '42 min' }],
      'normal',
    ),
    n('tank-vru', 'Vapor Recovery Unit', 'vru',
      '98.2%', 'efficiency',
      [{ label: 'VOC Capture', value: '2.4 T/d' }, { label: 'Vent Rate', value: '0.04 T/d' }, { label: 'Compressor', value: 'Running' }],
      calcStatus([[false, 'warning']]),  // normally fine
    ),
  ];
}

function buildDetailedEdges(k: Record<string, any>) {
  const e = k.electricity ?? {}, ss = k.substation ?? {}, b = k.boiler ?? {}, s = k.steam ?? {}, t = k.tank ?? {};
  const surplusSteam = (s.totalProduction ?? 0) - (s.totalDemand ?? 0);
  const hpPressure = s.headerPressure ?? 42;
  const lpPressure = hpPressure * 0.28;
  const condensateRate = (s.totalProduction ?? 18) * ((s.condensateRecovery ?? 82) / 100);

  return [
    // ========== Electricity internal ==========
    { id: 'd-e1', source: 'elec-grid', target: 'sub-xfmr', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'HV Feed', flowValue: `${fmtF(ss.incomingVoltage, 1)} kV` } },
    { id: 'd-e1b', source: 'elec-grid', target: 'elec-cost', type: 'flow', animated: false, style: dashedEdge(dangerEdge), markerEnd: dangerMarker, data: { label: 'Metering' } },
    { id: 'd-e-gen-mcc', source: 'elec-gen', target: 'elec-mcc', type: 'flow', animated: false, style: dashedEdge(warningEdge), markerEnd: warningMarker, data: { label: 'Backup Path' } },
    { id: 'd-e-grid-mcc', source: 'elec-grid', target: 'elec-mcc', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'Main Feed', flowValue: `${fmt(Math.round((e.realTimeDemand ?? 2400) * 0.85))} kW` } },
    { id: 'd-e-mcc-hvac', source: 'elec-mcc', target: 'elec-hvac', type: 'flow', animated: false, style: dashedEdge(secondaryEdge), markerEnd: secondaryMarker, data: { label: 'Aux Load' } },
    { id: 'd-e-mcc-pumps', source: 'elec-mcc', target: 'elec-pumps', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'Motor Feed', flowValue: `${fmt(Math.round((e.realTimeDemand ?? 2400) * 0.35))} kW` } },

    // ========== Substation internal ==========
    { id: 'd-e2', source: 'sub-xfmr', target: 'sub-busA', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'Bus A', flowValue: `${fmtF((ss.totalLoad ?? 4.2) * 0.55)} MW` } },
    { id: 'd-e2c', source: 'sub-xfmr', target: 'sub-busB', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'Bus B', flowValue: `${fmtF((ss.totalLoad ?? 4.2) * 0.45)} MW` } },
    { id: 'd-e-busA-cap', source: 'sub-busA', target: 'sub-cap', type: 'flow', animated: false, style: dashedEdge(secondaryEdge), markerEnd: secondaryMarker, data: { label: 'PF Correction' } },
    { id: 'd-e-busA-relay', source: 'sub-busA', target: 'sub-relay', type: 'flow', animated: false, style: dashedEdge(dangerEdge), markerEnd: dangerMarker, data: { label: 'Protection' } },
    { id: 'd-e-busB-relay', source: 'sub-busB', target: 'sub-relay', type: 'flow', animated: false, style: dashedEdge(dangerEdge), markerEnd: dangerMarker, data: { label: 'Protection' } },
    { id: 'd-e-xfmr-meter', source: 'sub-xfmr', target: 'sub-meter', type: 'flow', animated: false, style: dashedEdge(secondaryEdge), markerEnd: secondaryMarker, data: { label: 'Monitoring' } },

    // ========== Substation → Boiler power ==========
    { id: 'd-e3', source: 'sub-busA', target: 'boil-treat', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'Power Supply' } },

    // ========== Boiler internal ==========
    { id: 'd-e-store-treat', source: 'boil-store', target: 'boil-treat', type: 'flow', animated: true, style: warningEdge, markerEnd: warningMarker, data: { label: 'Fuel Supply' } },
    { id: 'd-e4', source: 'boil-treat', target: 'boil-comb', type: 'flow', animated: true, style: warningEdge, markerEnd: warningMarker, data: { label: 'Treated Fuel', flowValue: `${fmt(b.totalFuelRate)} L/h` } },
    { id: 'd-e-comb-econ', source: 'boil-comb', target: 'boil-econ', type: 'flow', animated: true, style: warningEdge, markerEnd: warningMarker, data: { label: 'Flue Gas' } },
    { id: 'd-e-econ-stack', source: 'boil-econ', target: 'boil-stack', type: 'flow', animated: false, style: dashedEdge(dangerEdge), markerEnd: dangerMarker, data: { label: 'Exhaust', flowValue: `${fmt(b.coEmissions)} ppm` } },
    { id: 'd-e-econ-fw', source: 'boil-econ', target: 'boil-fw', type: 'flow', animated: true, style: secondaryEdge, markerEnd: secondaryMarker, data: { label: 'Heat Recovery', flowValue: `${fmtF(12.5)}%` } },
    { id: 'd-e-fw-comb', source: 'boil-fw', target: 'boil-comb', type: 'flow', animated: true, style: secondaryEdge, markerEnd: secondaryMarker, data: { label: 'Feedwater', flowValue: `${fmtF(s.makeupWaterFlow ?? 3.2)} m³/h` } },

    // ========== Boiler → Steam ==========
    { id: 'd-e5', source: 'boil-comb', target: 'stm-hp', type: 'flow', animated: true, style: warningEdge, markerEnd: warningMarker, data: { label: 'Steam Output', flowValue: `${fmtF(b.totalSteamOutput)} T/h` } },

    // ========== Steam internal ==========
    { id: 'd-e-hp-prs', source: 'stm-hp', target: 'stm-prs', type: 'flow', animated: true, style: secondaryEdge, markerEnd: secondaryMarker, data: { label: 'HP→LP', flowValue: `${fmtF(hpPressure)} bar` } },
    { id: 'd-e-prs-lp', source: 'stm-prs', target: 'stm-lp', type: 'flow', animated: true, style: secondaryEdge, markerEnd: secondaryMarker, data: { label: 'Reduced', flowValue: `${fmtF(lpPressure)} bar` } },
    { id: 'd-e-lp-trace', source: 'stm-lp', target: 'stm-trace', type: 'flow', animated: true, style: secondaryEdge, markerEnd: secondaryMarker, data: { label: 'Tracing Steam' } },
    { id: 'd-e-lp-cond', source: 'stm-lp', target: 'stm-cond', type: 'flow', animated: false, style: dashedEdge(secondaryEdge), markerEnd: secondaryMarker, data: { label: 'Return', flowValue: `${fmtF(condensateRate)} T/h` } },
    { id: 'd-e-cond-deaer', source: 'stm-cond', target: 'stm-deaer', type: 'flow', animated: true, style: secondaryEdge, markerEnd: secondaryMarker, data: { label: 'Condensate', flowValue: `${fmtF(condensateRate)} T/h` } },
    { id: 'd-e-deaer-fw', source: 'stm-deaer', target: 'boil-fw', type: 'flow', animated: true, style: secondaryEdge, markerEnd: secondaryMarker, data: { label: 'Deaerated Water' } },

    // ========== Steam → Tank (cross-domain) ==========
    { id: 'd-e-trace-coils', source: 'stm-trace', target: 'tank-coils', type: 'flow', animated: true, style: warningEdge, markerEnd: warningMarker, data: { label: 'Heating Steam', flowValue: `${fmtF(surplusSteam > 0 ? surplusSteam * 0.7 : 2.1)} T/h` } },

    // ========== Tank Farm internal ==========
    { id: 'd-e-manif-gauge', source: 'tank-manif', target: 'tank-gauge', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'Inflow', flowValue: `+${fmt(t.dailyReceipts)} bbl` } },
    { id: 'd-e-gauge-coils', source: 'tank-gauge', target: 'tank-coils', type: 'flow', animated: false, style: dashedEdge(warningEdge), markerEnd: warningMarker, data: { label: 'Temp Control' } },
    { id: 'd-e-coils-pump', source: 'tank-coils', target: 'tank-pump', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'Heated Product' } },
    { id: 'd-e-pump-load', source: 'tank-pump', target: 'tank-load', type: 'flow', animated: true, style: secondaryEdge, markerEnd: secondaryMarker, data: { label: 'Dispatch', flowValue: `${fmt(t.dailyDispatches)} bbl/d` } },
    { id: 'd-e-load-vru', source: 'tank-load', target: 'tank-vru', type: 'flow', animated: false, style: dashedEdge(dangerEdge), markerEnd: dangerMarker, data: { label: 'Vapor Recovery' } },

    // ========== Cross-domain connections ==========
    // Electricity → Tank Farm (pump power)
    { id: 'd-e-pumps-station', source: 'elec-pumps', target: 'tank-pump', type: 'flow', animated: true, style: dashedEdge(primaryEdge), markerEnd: primaryMarker, data: { label: 'Pump Power', flowValue: `${fmt(Math.round((e.realTimeDemand ?? 2400) * 0.35))} kW` } },
    // Substation Bus B → Boiler (secondary power)
    { id: 'd-e-busB-boil', source: 'sub-busB', target: 'boil-comb', type: 'flow', animated: false, style: dashedEdge(primaryEdge), markerEnd: primaryMarker, data: { label: 'Aux Power' } },
    // HP Steam direct to process (some HP consumers)
    { id: 'd-e-hp-direct', source: 'stm-hp', target: 'stm-cond', type: 'flow', animated: false, style: dashedEdge(secondaryEdge), markerEnd: secondaryMarker, data: { label: 'HP Consumers' } },
  ];
}

// ============================================================
// Main Component
// ============================================================

// ============================================================
// Node Detail Popup
// ============================================================

function NodeDetailPopup({ data, onClose }: { data: DomainNodeData; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="theme-card rounded-2xl border border-border shadow-2xl w-[340px] max-h-[80%] overflow-y-auto animate-[scaleIn_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b border-border flex items-center gap-3`}>
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[data.status]}`} />
          {ICONS[data.icon]}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground">{data.label}</h3>
            <p className="text-[10px] text-muted-foreground capitalize">{data.status} status</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground text-lg">×</button>
        </div>

        {/* Main KPI */}
        <div className="px-5 py-3 border-b border-border/50">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{data.kpiValue}</span>
            <span className="text-xs text-muted-foreground">{data.unit}</span>
            <div className="flex items-center gap-0.5 ml-auto">
              {TREND_ICON[data.trend]}
              <span className={`text-xs font-medium ${data.trend === 'up' ? 'text-[#5CE5A0]' : data.trend === 'down' ? 'text-[#E53E3E]' : 'text-muted-foreground'}`}>
                {data.trendValue}
              </span>
            </div>
          </div>
        </div>

        {/* All KPIs */}
        <div className="px-5 py-3 space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Detailed Metrics</p>
          {data.kpis.map((kpi, i) => (
            <div key={i} className="flex justify-between items-center py-1 border-b border-border/20 last:border-0">
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
              <span className="text-xs font-mono font-medium text-foreground">{kpi.value}</span>
            </div>
          ))}
        </div>

        {/* Navigate button */}
        {data.href && (
          <div className="px-5 py-3 border-t border-border">
            <button
              onClick={() => window.location.href = data.href!}
              className="w-full py-2 rounded-lg text-xs font-medium text-background gradient-primary"
            >
              Open {data.label} Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineDAGInner() {
  const [kpis, setKpis] = useState<Record<string, any>>({});
  const [detailed, setDetailed] = useState(false);
  const [popupData, setPopupData] = useState<DomainNodeData | null>(null);
  const nodeTypes = useMemo(() => ({ domain: DomainNode }), []);
  const edgeTypes = useMemo(() => ({ flow: FlowEdge }), []);
  const { fitView } = useReactFlow();

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/api/electricity/kpis`).then(r => r.json()).catch(() => ({})),
      fetch(`${API_BASE_URL}/api/substation/kpis`).then(r => r.json()).catch(() => ({})),
      fetch(`${API_BASE_URL}/api/boiler/kpis`).then(r => r.json()).catch(() => ({})),
      fetch(`${API_BASE_URL}/api/steam/kpis`).then(r => r.json()).catch(() => ({})),
      fetch(`${API_BASE_URL}/api/tank/kpis`).then(r => r.json()).catch(() => ({})),
    ]).then(([elec, sub, boil, steam, tank]) => {
      setKpis({ electricity: elec, substation: sub, boiler: boil, steam: steam, tank: tank });
    });
  }, []);

  const onNodeClick = useMemo(() => (data: DomainNodeData) => setPopupData(data), []);

  const rawNodes = useMemo(() => {
    const nodes = detailed ? buildDetailedNodes(kpis) : buildOverviewNodes(kpis);
    return nodes.map(n => ({ ...n, data: { ...n.data, onNodeClick } }));
  }, [kpis, detailed, onNodeClick]);

  const rawEdges = useMemo(() => detailed ? buildDetailedEdges(kpis) : buildOverviewEdges(kpis), [kpis, detailed]);
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => layoutDAG(rawNodes, rawEdges, detailed ? 190 : 210, detailed ? 105 : 115),
    [rawNodes, rawEdges, detailed],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Sync layout + re-center when view mode or data changes
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    // fitView after React commits the new nodes
    requestAnimationFrame(() => fitView({ padding: 0.25, duration: 300 }));
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges, fitView]);

  const handleToggle = useCallback(() => {
    setDetailed((d) => !d);
  }, []);

  return (
    <div className={`relative w-full ${detailed ? 'h-[550px] sm:h-[700px]' : 'h-[450px] sm:h-[550px]'} rounded-xl border border-border overflow-hidden transition-all duration-300`}>
      {/* View toggle */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={handleToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors bg-background/80 backdrop-blur-sm border border-border hover:bg-muted"
        >
          {detailed ? <ToggleRight size={14} className="text-[var(--color-accent,#5CE5A0)]" /> : <ToggleLeft size={14} className="text-muted-foreground" />}
          {detailed ? 'Detailed View' : 'Overview'}
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.3}
        maxZoom={1.8}
      >
        <Background gap={20} size={1} color="hsl(var(--border) / 0.3)" />
        <Controls
          showInteractive={false}
          className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!fill-foreground"
        />
      </ReactFlow>

      {popupData && <NodeDetailPopup data={popupData} onClose={() => setPopupData(null)} />}
    </div>
  );
}

export default function PipelineDAG() {
  return (
    <ReactFlowProvider>
      <PipelineDAGInner />
    </ReactFlowProvider>
  );
}
