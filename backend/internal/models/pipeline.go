package models

// PipelineDAGResponse is the full DAG config + live data returned by GET /api/pipeline/dag
type PipelineDAGResponse struct {
	View  string         `json:"view"`  // "overview" or "detailed"
	Nodes []PipelineNode `json:"nodes"`
	Edges []PipelineEdge `json:"edges"`
}

// PipelineNode represents a single node in the DAG
type PipelineNode struct {
	ID         string        `json:"id"`
	Label      string        `json:"label"`
	Domain     string        `json:"domain"`               // electricity, substation, boiler, steam, tank
	Icon       string        `json:"icon"`                  // lucide icon name
	KPIValue   string        `json:"kpiValue"`              // formatted main value
	KPIUnit    string        `json:"kpiUnit"`               // unit label
	Status     string        `json:"status"`                // normal, warning, critical
	Trend      string        `json:"trend"`                 // up, down, flat
	TrendValue string        `json:"trendValue"`            // e.g. "+2.3%"
	KPIs       []PipelineKPI `json:"kpis"`                  // secondary KPI details
	Href       string        `json:"href,omitempty"`        // navigation link
	Group      string        `json:"group,omitempty"`       // group for detailed view layout
}

// PipelineKPI is a single key-value pair displayed in node tooltip/popup
type PipelineKPI struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

// PipelineEdge represents a connection between two nodes
type PipelineEdge struct {
	ID        string `json:"id"`
	Source    string `json:"source"`
	Target   string `json:"target"`
	Label     string `json:"label"`
	FlowValue string `json:"flowValue,omitempty"` // e.g. "10.95 kV"
	Color     string `json:"color"`               // primary, secondary, warning, danger
	Animated  bool   `json:"animated"`
	Dashed    bool   `json:"dashed"`
}
