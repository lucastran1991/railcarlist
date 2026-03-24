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
import { API_BASE_URL, apiFetch } from '@/lib/config';
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
// Helpers (formatting moved to backend — only UI helpers remain)
// ============================================================

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
// Node/edge building moved to backend: GET /api/pipeline/dag
// ============================================================

// REMOVED: buildOverviewNodes, buildOverviewEdges, buildDetailedNodes, buildDetailedEdges
// All node/edge construction + status/trend calculation now lives in
// backend/internal/services/pipeline.go — frontend only maps API response to ReactFlow format.

/* eslint-disable @typescript-eslint/no-unused-vars */
function _buildFunctionsRemoved() { /* placeholder to mark removal */ }

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

// Map API response to ReactFlow nodes/edges
function apiToReactFlowNodes(apiNodes: any[], onNodeClick: (data: DomainNodeData) => void, isDetailed: boolean) {
  return apiNodes.map((n: any) => ({
    id: n.id,
    type: 'domain',
    position: { x: 0, y: 0 },
    data: {
      label: n.label,
      icon: n.icon,
      kpiValue: n.kpiValue,
      unit: n.kpiUnit,
      kpis: n.kpis ?? [],
      status: n.status ?? 'normal',
      trend: n.trend ?? 'flat',
      trendValue: n.trendValue ?? '0.0%',
      href: n.href,
      isSubNode: isDetailed,
      onNodeClick,
    } as DomainNodeData,
  }));
}

function apiToReactFlowEdges(apiEdges: any[]) {
  const colorMap: Record<string, { style: object; marker: object }> = {
    primary: { style: primaryEdge, marker: primaryMarker },
    secondary: { style: secondaryEdge, marker: secondaryMarker },
    warning: { style: warningEdge, marker: warningMarker },
    danger: { style: dangerEdge, marker: dangerMarker },
  };

  return apiEdges.map((e: any) => {
    const color = colorMap[e.color] ?? colorMap.primary;
    const style = e.dashed ? dashedEdge(color.style) : color.style;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'flow',
      animated: e.animated ?? false,
      style,
      markerEnd: color.marker,
      data: { label: e.label, flowValue: e.flowValue },
    };
  });
}

function PipelineDAGInner() {
  const [dagData, setDagData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [detailed, setDetailed] = useState(false);
  const [popupData, setPopupData] = useState<DomainNodeData | null>(null);
  const nodeTypes = useMemo(() => ({ domain: DomainNode }), []);
  const edgeTypes = useMemo(() => ({ flow: FlowEdge }), []);
  const { fitView } = useReactFlow();

  // Fetch DAG from backend API
  useEffect(() => {
    const view = detailed ? 'detailed' : 'overview';
    apiFetch(`${API_BASE_URL}/api/pipeline/dag?view=${view}`)
      .then(r => r.json())
      .then(data => setDagData({ nodes: data.nodes ?? [], edges: data.edges ?? [] }))
      .catch(() => setDagData({ nodes: [], edges: [] }));
  }, [detailed]);

  const onNodeClick = useMemo(() => (data: DomainNodeData) => setPopupData(data), []);

  const rawNodes = useMemo(() => apiToReactFlowNodes(dagData.nodes, onNodeClick, detailed), [dagData.nodes, onNodeClick, detailed]);
  const rawEdges = useMemo(() => apiToReactFlowEdges(dagData.edges), [dagData.edges]);
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
