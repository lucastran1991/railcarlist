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
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 100, marginx: 30, marginy: 30 });
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

  const n = (id: string, label: string, icon: string, kpiValue: string, unit: string, kpis: NodeKPI[], status: Status, trend: Trend = 'flat', trendValue = '0.0%', href?: string) =>
    ({ id, type: 'domain', position: { x: 0, y: 0 }, data: { label, icon, kpiValue, unit, kpis, status, trend, trendValue, href, isSubNode: true } as DomainNodeData });

  return [
    // --- Electricity ---
    n('elec-grid', 'Power Grid', 'electricity',
      fmt(e.realTimeDemand), 'kW',
      [{ label: 'Peak Demand', value: `${fmt(e.peakDemand)} kW` }, { label: 'Availability', value: `${fmtF(e.gridAvailability)}%` }],
      calcStatus([[e.transformerLoad > 95, 'critical'], [e.transformerLoad > 85, 'warning']]),
      ...Object.values(calcTrend(e.realTimeDemand, e.peakDemand ? e.peakDemand * 0.48 : undefined)),
      '/electricity',
    ),
    n('elec-cost', 'Energy & Carbon', 'alert',
      `$${fmt(e.energyCost)}`, '/month',
      [{ label: 'Carbon Emissions', value: `${fmtF(e.carbonEmissions)} t CO₂` }, { label: 'Power Factor', value: `${fmtF(e.powerFactor, 2)}` }],
      calcStatus([[(e.powerFactor ?? 1) < 0.9, 'warning'], [(e.powerFactor ?? 1) < 0.85, 'critical']]),
    ),

    // --- Substation ---
    n('sub-xfmr', 'Transformer', 'transformer',
      fmtF(ss.incomingVoltage, 2), 'kV',
      [{ label: 'Temperature', value: `${fmt(ss.transformerTemp)}°C` }, { label: 'Load', value: `${fmtF(ss.totalLoad)} MW` }],
      calcStatus([[(ss.transformerTemp ?? 0) > 90, 'critical'], [(ss.transformerTemp ?? 0) > 75, 'warning']]),
      'flat', '0.0%', '/sub-station',
    ),
    n('sub-swgr', 'Switchgear', 'switchgear',
      `${ss.breakersClosed ?? 0}/${ss.breakersTotal ?? 0}`, 'breakers',
      [{ label: 'Faults (24h)', value: `${ss.faultEvents24h ?? 0}` }, { label: 'Bus Balance', value: `${fmtF(ss.busbarBalance)}%` }],
      calcStatus([[(ss.faultEvents24h ?? 0) > 3, 'critical'], [(ss.faultEvents24h ?? 0) > 0, 'warning'], [(ss.breakersClosed ?? 0) < (ss.breakersTotal ?? 0) - 2, 'critical']]),
    ),
    n('sub-pq', 'Power Quality', 'powerquality',
      `${fmtF(ss.thd)}%`, 'THD',
      [{ label: 'Frequency', value: `${fmtF(ss.frequency, 2)} Hz` }, { label: 'Bus Balance', value: `${fmtF(ss.busbarBalance)}%` }],
      calcStatus([[(ss.thd ?? 0) > 8, 'critical'], [(ss.thd ?? 0) > 5, 'warning']]),
    ),

    // --- Boiler ---
    n('boil-fuel', 'Fuel System', 'fuel',
      fmt(b.totalFuelRate), 'L/h',
      [{ label: 'Consumption Rate', value: `${fmt(b.totalFuelRate)} L/h` }],
      'normal',
    ),
    n('boil-comb', 'Combustion', 'combustion',
      `${b.boilersOnline ?? 0}/${b.boilersTotal ?? 0}`, 'online',
      [{ label: 'Efficiency', value: `${fmtF(b.fleetEfficiency)}%` }, { label: 'Stack Temp', value: `${fmt(b.avgStackTemp)}°C` }, { label: 'O₂ Level', value: `${fmtF(b.avgO2)}%` }],
      calcStatus([[(b.boilersOnline ?? 0) < (b.boilersTotal ?? 0) - 1, 'critical'], [(b.fleetEfficiency ?? 100) < 85, 'warning']]),
      'flat', '0.0%', '/boiler',
    ),
    n('boil-emit', 'Emissions', 'emissions',
      fmt(b.coEmissions), 'ppm CO',
      [{ label: 'NOx', value: `${fmt(b.noxEmissions)} ppm` }, { label: 'O₂', value: `${fmtF(b.avgO2)}%` }],
      calcStatus([[(b.coEmissions ?? 0) > 150, 'critical'], [(b.coEmissions ?? 0) > 100, 'warning']]),
    ),

    // --- Steam ---
    n('stm-header', 'Steam Header', 'header',
      fmtF(s.totalProduction), 'T/h',
      [{ label: 'Pressure', value: `${fmtF(s.headerPressure)} bar` }, { label: 'Temperature', value: `${fmt(s.steamTemperature)}°C` }],
      calcStatus([[(s.headerPressure ?? 40) < 36, 'critical'], [(s.headerPressure ?? 40) < 38, 'warning']]),
      ...Object.values(calcTrend(s.totalProduction, s.totalDemand)),
      '/steam',
    ),
    n('stm-dist', 'Distribution', 'distribution',
      fmtF(s.totalDemand), 'T/h',
      [{ label: 'Condensate Recovery', value: `${s.condensateRecovery ?? '—'}%` }, { label: 'Makeup Water', value: `${fmtF(s.makeupWaterFlow)} m³/h` }, { label: 'Surplus', value: `${fmtF(surplusSteam)} T/h` }],
      calcStatus([[(s.condensateRecovery ?? 100) < 70, 'critical'], [(s.condensateRecovery ?? 100) < 80, 'warning']]),
    ),

    // --- Tank Farm ---
    n('tank-heat', 'Tank Heating', 'heating',
      fmt(t.avgTemperature), '°C',
      [{ label: 'Steam Input', value: `${fmtF(surplusSteam)} T/h` }],
      calcStatus([[(t.avgTemperature ?? 0) > 55, 'critical'], [(t.avgTemperature ?? 0) > 45, 'warning']]),
    ),
    n('tank-recv', 'Receipts', 'receipts',
      fmt(t.dailyReceipts), 'bbl/d',
      [{ label: 'Daily Inflow', value: `${fmt(t.dailyReceipts)} bbl` }],
      'normal',
    ),
    n('tank-disp', 'Dispatches', 'dispatches',
      fmt(t.dailyDispatches), 'bbl/d',
      [{ label: 'Daily Outflow', value: `${fmt(t.dailyDispatches)} bbl` }],
      'normal',
    ),
    n('tank-inv', 'Inventory', 'inventory',
      `${t.tanksInOperation ?? '—'}/${t.tanksTotal ?? 59}`, 'tanks',
      [
        { label: 'Total Volume', value: `${fmt(t.totalInventory)} bbl` },
        { label: 'Available', value: `${t.availableCapacity ?? '—'}%` },
        { label: 'Net Flow', value: `${netFlow >= 0 ? '+' : ''}${fmt(netFlow)} bbl/d` },
        { label: 'Active Alarms', value: `${t.activeAlarms ?? 0}` },
      ],
      calcStatus([[(t.activeAlarms ?? 0) > 5, 'critical'], [(t.activeAlarms ?? 0) > 0, 'warning']]),
      ...Object.values(calcTrend(netFlow + 10000, 10000)),
      '/tank',
    ),
  ];
}

function buildDetailedEdges(k: Record<string, any>) {
  const e = k.electricity ?? {}, ss = k.substation ?? {}, b = k.boiler ?? {}, s = k.steam ?? {}, t = k.tank ?? {};
  const surplusSteam = (s.totalProduction ?? 0) - (s.totalDemand ?? 0);

  return [
    // Electricity → Substation
    { id: 'd-e1', source: 'elec-grid', target: 'sub-xfmr', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'HV Feed', flowValue: `${fmtF(ss.incomingVoltage, 1)} kV` } },
    { id: 'd-e1b', source: 'elec-grid', target: 'elec-cost', type: 'flow', animated: false, style: dashedEdge(dangerEdge), markerEnd: dangerMarker, data: { label: 'Metering' } },

    // Substation internal
    { id: 'd-e2', source: 'sub-xfmr', target: 'sub-swgr', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'MV Bus', flowValue: `${fmtF(ss.totalLoad)} MW` } },
    { id: 'd-e2b', source: 'sub-xfmr', target: 'sub-pq', type: 'flow', animated: false, style: dashedEdge(secondaryEdge), markerEnd: secondaryMarker, data: { label: 'Monitoring' } },

    // Substation → Boiler
    { id: 'd-e3', source: 'sub-swgr', target: 'boil-fuel', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'Power Supply' } },

    // Boiler internal
    { id: 'd-e4', source: 'boil-fuel', target: 'boil-comb', type: 'flow', animated: true, style: warningEdge, markerEnd: warningMarker, data: { label: 'Fuel Feed', flowValue: `${fmt(b.totalFuelRate)} L/h` } },
    { id: 'd-e4b', source: 'boil-comb', target: 'boil-emit', type: 'flow', animated: false, style: dashedEdge(dangerEdge), markerEnd: dangerMarker, data: { label: 'Exhaust' } },

    // Boiler → Steam
    { id: 'd-e5', source: 'boil-comb', target: 'stm-header', type: 'flow', animated: true, style: warningEdge, markerEnd: warningMarker, data: { label: 'Steam Output', flowValue: `${fmtF(b.totalSteamOutput)} T/h` } },

    // Steam internal
    { id: 'd-e6', source: 'stm-header', target: 'stm-dist', type: 'flow', animated: true, style: secondaryEdge, markerEnd: secondaryMarker, data: { label: 'Demand', flowValue: `${fmtF(s.totalDemand)} T/h` } },

    // Steam → Tank
    { id: 'd-e7', source: 'stm-dist', target: 'tank-heat', type: 'flow', animated: true, style: secondaryEdge, markerEnd: secondaryMarker, data: { label: 'Heating Steam', flowValue: `${fmtF(surplusSteam)} T/h` } },

    // Tank internal
    { id: 'd-e8', source: 'tank-heat', target: 'tank-inv', type: 'flow', animated: false, style: dashedEdge(warningEdge), markerEnd: warningMarker, data: { label: 'Temperature Control' } },
    { id: 'd-e9', source: 'tank-recv', target: 'tank-inv', type: 'flow', animated: true, style: primaryEdge, markerEnd: primaryMarker, data: { label: 'Inflow', flowValue: `+${fmt(t.dailyReceipts)}` } },
    { id: 'd-e10', source: 'tank-inv', target: 'tank-disp', type: 'flow', animated: true, style: secondaryEdge, markerEnd: secondaryMarker, data: { label: 'Outflow', flowValue: `-${fmt(t.dailyDispatches)}` } },

    // Cross-domain: Electricity → Tank pumps
    { id: 'd-e11', source: 'sub-swgr', target: 'tank-recv', type: 'flow', animated: false, style: dashedEdge(secondaryEdge), markerEnd: secondaryMarker, data: { label: 'Pump Power' } },
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
    <div className="relative w-full h-[450px] sm:h-[550px] rounded-xl border border-border overflow-hidden">
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
