// @ts-nocheck — @xyflow/react types pending for React 19
'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
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
import { Zap, Activity, Flame, Droplets, Gauge, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import '@xyflow/react/dist/style.css';

// --- Types ---
interface DomainNodeData {
  label: string;
  icon: string;
  kpiValue: string;
  unit: string;
  kpiLabel: string;
  kpi2Label: string;
  kpi2Value: string;
  kpi3Label: string;
  kpi3Value: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
  href: string;
}

// --- Icons ---
const ICONS: Record<string, React.ReactNode> = {
  electricity: <Zap size={20} className="text-[#F6AD55]" />,
  substation: <Activity size={20} className="text-[#4D65FF]" />,
  boiler: <Flame size={20} className="text-[#E53E3E]" />,
  steam: <Droplets size={20} className="text-[#56CDE7]" />,
  tank: <Gauge size={20} className="text-[#5CE5A0]" />,
};

const STATUS_BORDER = {
  normal: 'border-[var(--color-accent,#5CE5A0)]/40 hover:border-[var(--color-accent,#5CE5A0)]/80',
  warning: 'border-[var(--color-warning,#F6AD55)]/50 hover:border-[var(--color-warning,#F6AD55)]/90',
  critical: 'border-[var(--color-danger,#E53E3E)]/50 hover:border-[var(--color-danger,#E53E3E)]/90',
};

const STATUS_DOT = {
  normal: 'bg-[var(--color-accent,#5CE5A0)] shadow-[0_0_6px_var(--color-accent,#5CE5A0)]',
  warning: 'bg-[var(--color-warning,#F6AD55)] shadow-[0_0_6px_var(--color-warning,#F6AD55)]',
  critical: 'bg-[var(--color-danger,#E53E3E)] shadow-[0_0_6px_var(--color-danger,#E53E3E)] animate-pulse',
};

const TREND_ICON = {
  up: <TrendingUp size={10} className="text-[#5CE5A0]" />,
  down: <TrendingDown size={10} className="text-[#E53E3E]" />,
  flat: <Minus size={10} className="text-muted-foreground" />,
};

// --- Custom Node with hover popup ---
function DomainNode({ data }: { data: DomainNodeData }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`theme-card rounded-xl border-2 ${STATUS_BORDER[data.status]} px-4 py-3 min-w-[190px] transition-all duration-200 hover:scale-[1.04] hover:shadow-xl cursor-pointer`}
        onClick={() => { window.location.href = data.href; }}
      >
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background" />

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${STATUS_DOT[data.status]}`} />
          {ICONS[data.icon]}
          <span className="font-bold text-sm text-foreground">{data.label}</span>
        </div>

        {/* Main KPI */}
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-xl font-bold text-foreground">{data.kpiValue}</span>
          <span className="text-[10px] text-muted-foreground">{data.unit}</span>
          <div className="flex items-center gap-0.5 ml-auto">
            {TREND_ICON[data.trend]}
            <span className={`text-[9px] font-medium ${data.trend === 'up' ? 'text-[#5CE5A0]' : data.trend === 'down' ? 'text-[#E53E3E]' : 'text-muted-foreground'}`}>
              {data.trendValue}
            </span>
          </div>
        </div>

        <p className="text-[9px] text-muted-foreground">{data.kpiLabel}</p>

        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-[var(--color-accent,#5CE5A0)] !border-2 !border-background" />
      </div>

      {/* Hover popup — detailed KPIs */}
      {hovered && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 pointer-events-none animate-[fadeIn_0.15s_ease-out]">
          <div className="theme-card rounded-lg px-3 py-2.5 min-w-[200px] shadow-xl border border-border/50">
            <p className="text-[10px] font-bold text-foreground mb-1.5">{data.label} Details</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">{data.kpi2Label}</span>
                <span className="text-[9px] font-mono text-foreground">{data.kpi2Value}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">{data.kpi3Label}</span>
                <span className="text-[9px] font-mono text-foreground">{data.kpi3Value}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">{data.kpiLabel.split(':')[0]}</span>
                <span className="text-[9px] font-mono text-foreground">{data.kpiLabel.split(':')[1]?.trim() ?? data.kpiValue}</span>
              </div>
            </div>
            <p className="text-[8px] text-[var(--color-accent,#5CE5A0)] mt-1.5 font-medium">Click to view dashboard →</p>
          </div>
          <div className="w-0 h-0 mx-auto border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-border/50" />
        </div>
      )}
    </div>
  );
}

// --- Custom thick animated edge with flow label ---
function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style, markerEnd }) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 16 });

  return (
    <>
      {/* Glow background */}
      <BaseEdge id={`${id}-glow`} path={edgePath} style={{ ...style, strokeWidth: 8, opacity: 0.1, filter: 'blur(4px)' }} />
      {/* Main edge */}
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {/* Label */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            className="text-[8px] font-medium text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border border-border/30 pointer-events-none"
          >
            {data.label}
            {data.flowValue && <span className="ml-1 text-foreground font-bold">{data.flowValue}</span>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// --- Dagre Layout (Left to Right) ---
function layoutDAG(nodes, edges) {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120, marginx: 40, marginy: 40 });
  nodes.forEach((n) => g.setNode(n.id, { width: 210, height: 100 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  Dagre.layout(g);
  return {
    nodes: nodes.map((n) => ({ ...n, position: { x: g.node(n.id).x - 105, y: g.node(n.id).y - 50 } })),
    edges,
  };
}

// --- Build nodes from KPI data ---
function buildNodes(kpis: Record<string, any>) {
  const e = kpis.electricity ?? {};
  const ss = kpis.substation ?? {};
  const b = kpis.boiler ?? {};
  const s = kpis.steam ?? {};
  const t = kpis.tank ?? {};

  return [
    {
      id: 'electricity', type: 'domain', position: { x: 0, y: 0 },
      data: {
        label: 'Electricity', icon: 'electricity', href: '/electricity',
        kpiValue: e.realTimeDemand?.toLocaleString() ?? '—', unit: 'kW',
        kpiLabel: `Peak: ${e.peakDemand?.toLocaleString() ?? '—'} kW`,
        kpi2Label: 'Total Consumption', kpi2Value: `${e.totalConsumption?.toLocaleString() ?? '—'} kWh`,
        kpi3Label: 'Power Factor', kpi3Value: `${e.powerFactor ?? '—'}`,
        status: (e.transformerLoad ?? 0) > 85 ? 'warning' : 'normal',
        trend: 'up', trendValue: '+2.4%',
      },
    },
    {
      id: 'substation', type: 'domain', position: { x: 0, y: 0 },
      data: {
        label: 'Sub Station', icon: 'substation', href: '/sub-station',
        kpiValue: ss.incomingVoltage?.toFixed(2) ?? '—', unit: 'kV',
        kpiLabel: `Load: ${ss.totalLoad?.toFixed(1) ?? '—'} MW`,
        kpi2Label: 'Frequency', kpi2Value: `${ss.frequency?.toFixed(2) ?? '—'} Hz`,
        kpi3Label: 'THD', kpi3Value: `${ss.thd?.toFixed(1) ?? '—'}%`,
        status: (ss.thd ?? 0) > 5 ? 'warning' : 'normal',
        trend: 'flat', trendValue: '0.0%',
      },
    },
    {
      id: 'boiler', type: 'domain', position: { x: 0, y: 0 },
      data: {
        label: 'Boiler', icon: 'boiler', href: '/boiler',
        kpiValue: `${b.boilersOnline ?? 0}/${b.boilersTotal ?? 0}`, unit: 'online',
        kpiLabel: `Efficiency: ${b.fleetEfficiency?.toFixed(1) ?? '—'}%`,
        kpi2Label: 'Steam Output', kpi2Value: `${b.totalSteamOutput?.toFixed(1) ?? '—'} T/h`,
        kpi3Label: 'Stack Temp', kpi3Value: `${b.avgStackTemp ?? '—'}°C`,
        status: (b.boilersOnline ?? 0) < (b.boilersTotal ?? 0) ? 'warning' : 'normal',
        trend: 'down', trendValue: '-0.5%',
      },
    },
    {
      id: 'steam', type: 'domain', position: { x: 0, y: 0 },
      data: {
        label: 'Steam', icon: 'steam', href: '/steam',
        kpiValue: s.totalProduction?.toFixed(1) ?? '—', unit: 'T/h',
        kpiLabel: `Pressure: ${s.headerPressure?.toFixed(1) ?? '—'} bar`,
        kpi2Label: 'Demand', kpi2Value: `${s.totalDemand?.toFixed(1) ?? '—'} T/h`,
        kpi3Label: 'Condensate Recovery', kpi3Value: `${s.condensateRecovery ?? '—'}%`,
        status: (s.headerPressure ?? 40) < 38 ? 'critical' : 'normal',
        trend: 'up', trendValue: '+1.2%',
      },
    },
    {
      id: 'tank', type: 'domain', position: { x: 0, y: 0 },
      data: {
        label: 'Tank Farm', icon: 'tank', href: '/tank',
        kpiValue: t.tanksInOperation?.toString() ?? '—', unit: `/ ${t.tanksTotal ?? 59}`,
        kpiLabel: `Capacity: ${t.availableCapacity ?? '—'}% available`,
        kpi2Label: 'Total Inventory', kpi2Value: `${t.totalInventory?.toLocaleString() ?? '—'} bbl`,
        kpi3Label: 'Throughput', kpi3Value: `${t.currentThroughput?.toLocaleString() ?? '—'} bbl/d`,
        status: (t.activeAlarms ?? 0) > 0 ? 'warning' : 'normal',
        trend: 'up', trendValue: '+5.1%',
      },
    },
  ];
}

// --- Edges with flow data ---
const edgeStyle = { stroke: 'var(--color-accent, #5CE5A0)', strokeWidth: 3 };
const markerEnd = { type: MarkerType.ArrowClosed, color: 'var(--color-accent, #5CE5A0)', width: 20, height: 20 };

function buildEdges(kpis: Record<string, any>) {
  const e = kpis.electricity ?? {};
  const b = kpis.boiler ?? {};
  const s = kpis.steam ?? {};

  return [
    { id: 'e1', source: 'electricity', target: 'substation', type: 'flow', animated: true, style: edgeStyle, markerEnd, data: { label: 'Power Grid', flowValue: `${e.realTimeDemand?.toLocaleString() ?? ''} kW` } },
    { id: 'e2', source: 'substation', target: 'boiler', type: 'flow', animated: true, style: edgeStyle, markerEnd, data: { label: 'Distribution', flowValue: '' } },
    { id: 'e3', source: 'boiler', target: 'steam', type: 'flow', animated: true, style: edgeStyle, markerEnd, data: { label: 'Generation', flowValue: `${b.totalSteamOutput?.toFixed(1) ?? ''} T/h` } },
    { id: 'e4', source: 'steam', target: 'tank', type: 'flow', animated: true, style: edgeStyle, markerEnd, data: { label: 'Heating', flowValue: `${s.totalProduction?.toFixed(1) ?? ''} T/h` } },
    { id: 'e5', source: 'electricity', target: 'tank', type: 'flow', animated: false, style: { ...edgeStyle, opacity: 0.25, strokeDasharray: '8 4', strokeWidth: 2 }, markerEnd: { ...markerEnd, color: 'var(--color-secondary, #56CDE7)' }, data: { label: 'Pumps' } },
  ];
}

// --- Main ---
export default function PipelineDAG() {
  const [kpis, setKpis] = useState<Record<string, any>>({});
  const nodeTypes = useMemo(() => ({ domain: DomainNode }), []);
  const edgeTypes = useMemo(() => ({ flow: FlowEdge }), []);

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

  const rawNodes = useMemo(() => buildNodes(kpis), [kpis]);
  const rawEdges = useMemo(() => buildEdges(kpis), [kpis]);
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => layoutDAG(rawNodes, rawEdges), [rawNodes, rawEdges]);

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);

  return (
    <div className="w-full h-[400px] sm:h-[500px] rounded-xl border border-border overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background gap={20} size={1} color="hsl(var(--border) / 0.3)" />
        <Controls
          showInteractive={false}
          className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!fill-foreground"
        />
      </ReactFlow>
    </div>
  );
}
