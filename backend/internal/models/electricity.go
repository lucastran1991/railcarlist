package models

type ElectricityLoadProfile struct {
	ID        int64   `json:"id"`
	Timestamp int64   `json:"timestamp"` // epoch ms
	Actual    float64 `json:"actual"`    // kW
	Planned   float64 `json:"planned"`   // kW
	Threshold float64 `json:"threshold"` // kW
}

type ElectricityWeeklyConsumption struct {
	ID        int64   `json:"id"`
	Timestamp int64   `json:"timestamp"` // epoch ms
	ThisWeek  float64 `json:"thisWeek"`  // kWh
	LastWeek  float64 `json:"lastWeek"`  // kWh
}

type ElectricityPowerFactor struct {
	ID        int64   `json:"id"`
	Timestamp int64   `json:"timestamp"` // epoch ms
	Value     float64 `json:"value"`     // 0-1
}

type ElectricityCostBreakdown struct {
	ID     int64   `json:"id"`
	Source string  `json:"source"` // "Grid", "Generator", "Solar"
	Cost   float64 `json:"cost"`   // USD
	Color  string  `json:"color"`  // hex color
}

type ElectricityPeakDemand struct {
	ID        int64   `json:"id"`
	Timestamp int64   `json:"timestamp"` // epoch ms
	Peak      float64 `json:"peak"`      // kW
}

type ElectricityPhaseBalance struct {
	ID        int64   `json:"id"`
	Timestamp int64   `json:"timestamp"` // epoch ms
	PhaseA    float64 `json:"phaseA"`    // volts
	PhaseB    float64 `json:"phaseB"`
	PhaseC    float64 `json:"phaseC"`
}

type ElectricityKPIs struct {
	TotalConsumption float64 `json:"totalConsumption"` // kWh
	RealTimeDemand   float64 `json:"realTimeDemand"`   // kW
	PeakDemand       float64 `json:"peakDemand"`       // kW
	PowerFactor      float64 `json:"powerFactor"`
	EnergyCost       float64 `json:"energyCost"`       // USD
	CarbonEmissions  float64 `json:"carbonEmissions"`  // tonnes
	GridAvailability float64 `json:"gridAvailability"`  // %
	TransformerLoad  float64 `json:"transformerLoad"`   // %
}
