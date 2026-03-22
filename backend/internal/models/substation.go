package models

type SubStationVoltageProfile struct {
	ID        int64   `json:"id"`
	Timestamp int64   `json:"timestamp"` // epoch ms
	VRY       float64 `json:"vRY"`
	VYB       float64 `json:"vYB"`
	VBR       float64 `json:"vBR"`
}

type SubStationTransformer struct {
	ID       int64   `json:"id"`
	Name     string  `json:"name"`
	Loading  float64 `json:"loading"`
	Capacity float64 `json:"capacity"`
	Unit     string  `json:"unit"`
}

type SubStationHarmonic struct {
	ID        int64   `json:"id"`
	Order     string  `json:"order"`
	Magnitude float64 `json:"magnitude"`
}

type SubStationTransformerTemp struct {
	ID        int64   `json:"id"`
	Timestamp int64   `json:"timestamp"` // epoch ms
	OilTemp   float64 `json:"oilTemp"`
	WindTemp  float64 `json:"windingTemp"`
}

type SubStationFeederDistribution struct {
	ID        int64   `json:"id"`
	Timestamp int64   `json:"timestamp"` // epoch ms
	Feeder1   float64 `json:"feeder1"`
	Feeder2   float64 `json:"feeder2"`
	Feeder3   float64 `json:"feeder3"`
	Feeder4   float64 `json:"feeder4"`
	Feeder5   float64 `json:"feeder5"`
}

type SubStationFaultEvent struct {
	ID  int64  `json:"id"`
	Day string `json:"day"`
	H08 int    `json:"h08"`
	H09 int    `json:"h09"`
	H10 int    `json:"h10"`
	H11 int    `json:"h11"`
	H12 int    `json:"h12"`
	H13 int    `json:"h13"`
	H14 int    `json:"h14"`
	H15 int    `json:"h15"`
}

type SubStationKPIs struct {
	IncomingVoltage float64 `json:"incomingVoltage"`
	TotalLoad       float64 `json:"totalLoad"`
	TransformerTemp float64 `json:"transformerTemp"`
	Frequency       float64 `json:"frequency"`
	THD             float64 `json:"thd"`
	BreakersClosed  int     `json:"breakersClosed"`
	BreakersTotal   int     `json:"breakersTotal"`
	FaultEvents24h  int     `json:"faultEvents24h"`
	BusbarBalance   float64 `json:"busbarBalance"`
}
