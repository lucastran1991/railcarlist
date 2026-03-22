package models

type BoilerUnit struct {
	ID       int64  `json:"id"`
	BoilerID string `json:"boilerId"`
	Name     string `json:"name"`
	Capacity float64 `json:"capacity"`
	Status   string `json:"status"`
}

type BoilerReading struct {
	ID          int64   `json:"id"`
	BoilerID    string  `json:"boiler"`
	Efficiency  float64 `json:"efficiency"`
	Load        float64 `json:"load"`
	SteamOutput float64 `json:"steamOutput"`
}

type BoilerEfficiencyTrend struct {
	ID    int64   `json:"id"`
	Date  string  `json:"date"`
	Blr01 float64 `json:"blr01"`
	Blr02 float64 `json:"blr02"`
	Blr03 float64 `json:"blr03"`
	Blr04 float64 `json:"blr04"`
}

type BoilerCombustion struct {
	ID       int64   `json:"id"`
	BoilerID string  `json:"boiler"`
	O2       float64 `json:"o2"`
	CO2      float64 `json:"co2"`
	CO       float64 `json:"co"`
	NOx      float64 `json:"nox"`
}

type BoilerSteamFuel struct {
	ID    int64   `json:"id"`
	Hour  string  `json:"hour"`
	Steam float64 `json:"steam"`
	Fuel  float64 `json:"fuel"`
}

type BoilerEmission struct {
	ID        int64   `json:"id"`
	Pollutant string  `json:"pollutant"`
	Current   float64 `json:"current"`
	Limit     float64 `json:"limit"`
	Unit      string  `json:"unit"`
}

type BoilerStackTemp struct {
	ID    int64   `json:"id"`
	Hour  string  `json:"hour"`
	Blr01 float64 `json:"blr01"`
	Blr02 float64 `json:"blr02"`
	Blr03 float64 `json:"blr03"`
}

type BoilerKPIs struct {
	BoilersOnline    int     `json:"boilersOnline"`
	BoilersTotal     int     `json:"boilersTotal"`
	TotalSteamOutput float64 `json:"totalSteamOutput"`
	FleetEfficiency  float64 `json:"fleetEfficiency"`
	AvgStackTemp     float64 `json:"avgStackTemp"`
	TotalFuelRate    float64 `json:"totalFuelRate"`
	AvgO2            float64 `json:"avgO2"`
	CoEmissions      float64 `json:"coEmissions"`
	NoxEmissions     float64 `json:"noxEmissions"`
}
