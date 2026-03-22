package models

type SteamBalance struct {
	ID      int64   `json:"id"`
	Hour    string  `json:"hour"`
	Boiler1 float64 `json:"boiler1"`
	Boiler2 float64 `json:"boiler2"`
	Boiler3 float64 `json:"boiler3"`
	Demand  float64 `json:"demand"`
}

type SteamHeaderPressure struct {
	ID   int64   `json:"id"`
	Time string  `json:"time"`
	HP   float64 `json:"hp"`
	MP   float64 `json:"mp"`
	LP   float64 `json:"lp"`
}

type SteamDistribution struct {
	ID       int64   `json:"id"`
	Consumer string  `json:"consumer"`
	Value    float64 `json:"value"`
	Color    string  `json:"color"`
}

type SteamCondensate struct {
	ID       int64   `json:"id"`
	Hour     string  `json:"hour"`
	Recovery float64 `json:"recovery"`
}

type SteamFuelRatio struct {
	ID    int64   `json:"id"`
	Hour  string  `json:"hour"`
	Fuel  float64 `json:"fuel"`
	Steam float64 `json:"steam"`
}

type SteamLoss struct {
	ID          int64   `json:"id"`
	Location    string  `json:"location"`
	Loss        float64 `json:"loss"`
	TrapsTotal  int     `json:"trapsTotal"`
	TrapsFailed int     `json:"trapsFailed"`
}

type SteamKPIs struct {
	TotalProduction    float64 `json:"totalProduction"`
	TotalDemand        float64 `json:"totalDemand"`
	HeaderPressure     float64 `json:"headerPressure"`
	SteamTemperature   float64 `json:"steamTemperature"`
	SystemEfficiency   float64 `json:"systemEfficiency"`
	CondensateRecovery float64 `json:"condensateRecovery"`
	MakeupWaterFlow    float64 `json:"makeupWaterFlow"`
	FuelConsumption    float64 `json:"fuelConsumption"`
}
