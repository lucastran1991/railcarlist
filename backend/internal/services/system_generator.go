package services

import (
	"fmt"
	"math"
	"math/rand"
	"time"

	"railcarlist/internal/database"
	"railcarlist/internal/models"
)

type SystemGeneratorService struct {
	db *database.DB
}

func NewSystemGeneratorService(db *database.DB) *SystemGeneratorService {
	return &SystemGeneratorService{db: db}
}

type GenerateRequest struct {
	StartDate     string `json:"startDate"`     // "2024-01-01", default if empty
	EndDate       string `json:"endDate"`       // "2026-03-22", default now
	ClearExisting bool   `json:"clearExisting"` // wipe tables first
	Seed          int64  `json:"seed"`          // random seed for deterministic generation (0 = use 42)
}

type ProgressEvent struct {
	Event   string `json:"event"`
	Domain  string `json:"domain,omitempty"`
	Table   string `json:"table,omitempty"`
	Records int    `json:"records,omitempty"`
	Message string `json:"message,omitempty"`
}

// seasonFactor returns 0.8-1.2 based on month
// Summer (Jun-Aug): peak for electricity (cooling), low for steam
// Winter (Dec-Feb): peak for steam (heating), moderate for electricity
func seasonFactor(t time.Time, domain string) float64 {
	month := t.Month()
	switch domain {
	case "electricity":
		// Summer peak, winter moderate
		switch {
		case month >= 6 && month <= 8:
			return 1.15
		case month >= 12 || month <= 2:
			return 1.05
		default:
			return 1.0
		}
	case "steam":
		// Winter peak, summer low
		switch {
		case month >= 12 || month <= 2:
			return 1.20
		case month >= 6 && month <= 8:
			return 0.85
		default:
			return 1.0
		}
	default:
		return 1.0
	}
}

// weekdayFactor: weekday=1.0, Saturday=0.6, Sunday=0.4
func weekdayFactor(t time.Time) float64 {
	switch t.Weekday() {
	case time.Saturday:
		return 0.6
	case time.Sunday:
		return 0.4
	default:
		return 1.0
	}
}

// hourFactor: industrial daily curve
func hourFactor(hour int) float64 {
	factors := []float64{0.40, 0.38, 0.35, 0.35, 0.38, 0.42, 0.70, 0.85, 0.95, 0.98, 1.00, 1.00, 0.98, 1.00, 0.95, 0.92, 0.85, 0.75, 0.60, 0.55, 0.50, 0.48, 0.45, 0.42}
	if hour >= 0 && hour < 24 {
		return factors[hour]
	}
	return 0.5
}

// noise adds gaussian noise: value * (1 + normal(0, pct))
func noise(rng *rand.Rand, value, pct float64) float64 {
	return value * (1.0 + rng.NormFloat64()*pct)
}

// clamp value between min and max
func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func (s *SystemGeneratorService) Generate(req GenerateRequest, onProgress func(ProgressEvent)) error {
	// Parse dates
	startDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Now().UTC()
	if req.StartDate != "" {
		t, err := time.Parse("2006-01-02", req.StartDate)
		if err == nil {
			startDate = t
		}
	}
	if req.EndDate != "" {
		t, err := time.Parse("2006-01-02", req.EndDate)
		if err == nil {
			endDate = t
		}
	}

	seed := req.Seed
	if seed == 0 {
		seed = 42
	}
	rng := rand.New(rand.NewSource(seed)) // deterministic for reproducibility

	// Clear existing if requested
	if req.ClearExisting {
		s.clearAllTables()
		onProgress(ProgressEvent{Event: "progress", Message: "Cleared existing data"})
	}

	// Generate each domain
	if err := s.generateElectricity(startDate, endDate, rng, onProgress); err != nil {
		return fmt.Errorf("electricity: %w", err)
	}
	if err := s.generateSteam(startDate, endDate, rng, onProgress); err != nil {
		return fmt.Errorf("steam: %w", err)
	}
	if err := s.generateBoiler(startDate, endDate, rng, onProgress); err != nil {
		return fmt.Errorf("boiler: %w", err)
	}
	if err := s.generateTank(startDate, endDate, rng, onProgress); err != nil {
		return fmt.Errorf("tank: %w", err)
	}
	if err := s.generateSubStation(startDate, endDate, rng, onProgress); err != nil {
		return fmt.Errorf("substation: %w", err)
	}
	if err := s.generateAlerts(startDate, endDate, rng, onProgress); err != nil {
		return fmt.Errorf("alerts: %w", err)
	}

	// Update KPIs with latest values
	s.updateAllKPIs(endDate, rng)
	onProgress(ProgressEvent{Event: "progress", Message: "Updated KPIs"})

	// Update non-history tables (cost breakdown, distributions, etc.)
	s.generateStaticData(rng)
	onProgress(ProgressEvent{Event: "progress", Message: "Generated static reference data"})

	onProgress(ProgressEvent{Event: "done", Message: "All data generated successfully"})
	return nil
}

func (s *SystemGeneratorService) generateElectricity(start, end time.Time, rng *rand.Rand, onProgress func(ProgressEvent)) error {
	s.db.DeleteAllElectricityLoadProfiles()
	s.db.DeleteAllElectricityPeakDemand()
	s.db.DeleteAllElectricityPhaseBalance()
	s.db.DeleteAllElectricityPowerFactor()
	s.db.DeleteAllElectricityWeeklyConsumption()

	count := 0
	baseLoad := 3200.0 // kW base

	// For each day from start to end
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		sf := seasonFactor(d, "electricity")
		wf := weekdayFactor(d)
		dailyPeak := 0.0
		dailyTotal := 0.0
		dayIndex := d.Sub(start).Hours() / 24
		drift := 1.0 + 0.15*math.Sin(dayIndex*2*math.Pi/7) // 7-day cycle

		// Hourly load profiles
		for h := 0; h < 24; h++ {
			t := time.Date(d.Year(), d.Month(), d.Day(), h, 0, 0, 0, time.UTC)
			hf := hourFactor(h)
			actual := noise(rng, baseLoad*sf*wf*hf*drift, 0.08)
			planned := baseLoad * sf * wf * hf * 1.02 // planned slightly higher
			threshold := 4000.0 * sf

			actual = clamp(actual, 200, 5000)
			if actual > dailyPeak {
				dailyPeak = actual
			}
			dailyTotal += actual

			s.db.InsertElectricityLoadProfile(models.ElectricityLoadProfile{
				Actual:    math.Round(actual*10) / 10,
				Planned:   math.Round(planned*10) / 10,
				Threshold: math.Round(threshold*10) / 10,
			}, t.UnixMilli())
			count++
		}

		// Peak demand (one per day)
		s.db.InsertElectricityPeakDemand(models.ElectricityPeakDemand{
			Peak: math.Round(dailyPeak*10) / 10,
		}, d.UnixMilli())
		count++

		// Phase balance (hourly = 24 per day)
		for h := 0; h < 24; h += 1 {
			t := time.Date(d.Year(), d.Month(), d.Day(), h, 0, 0, 0, time.UTC)
			hf := hourFactor(h)
			baseV := 245.0
			// Voltage sags slightly during peak hours
			sag := (1.0 - hf) * 5.0
			s.db.InsertElectricityPhaseBalance(models.ElectricityPhaseBalance{
				PhaseA: math.Round(noise(rng, baseV-sag, 0.01)*10) / 10,
				PhaseB: math.Round(noise(rng, baseV-sag-2, 0.01)*10) / 10,
				PhaseC: math.Round(noise(rng, baseV-sag+1, 0.01)*10) / 10,
			}, t.UnixMilli())
			count++
		}

		// Power factor (hourly = 24 per day)
		for h := 0; h < 24; h += 1 {
			t := time.Date(d.Year(), d.Month(), d.Day(), h, 0, 0, 0, time.UTC)
			hf := hourFactor(h)
			// PF drops during peak load (more reactive power)
			pf := clamp(0.96-hf*0.04+rng.Float64()*0.01, 0.88, 0.99)
			s.db.InsertElectricityPowerFactor(models.ElectricityPowerFactor{
				Value: math.Round(pf*1000) / 1000,
			}, t.UnixMilli())
			count++
		}

		// Weekly consumption (one per day)
		thisWeek := math.Round(dailyTotal)
		lastWeek := math.Round(dailyTotal * noise(rng, 0.97, 0.02))
		s.db.InsertElectricityWeeklyConsumption(models.ElectricityWeeklyConsumption{
			ThisWeek: thisWeek,
			LastWeek: lastWeek,
		}, d.UnixMilli())
		count++
	}

	onProgress(ProgressEvent{Event: "progress", Domain: "electricity", Table: "all", Records: count})
	return nil
}

func (s *SystemGeneratorService) generateSteam(start, end time.Time, rng *rand.Rand, onProgress func(ProgressEvent)) error {
	s.db.DeleteAllSteamBalance()
	s.db.DeleteAllSteamHeaderPressure()
	s.db.DeleteAllSteamCondensate()
	s.db.DeleteAllSteamFuelRatio()

	count := 0
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		sf := seasonFactor(d, "steam")
		wf := weekdayFactor(d)
		dayIndex := d.Sub(start).Hours() / 24
		drift := 1.0 + 0.12*math.Sin(dayIndex*2*math.Pi/5) // 5-day cycle

		for h := 0; h < 24; h += 1 { // hourly
			t := time.Date(d.Year(), d.Month(), d.Day(), h, 0, 0, 0, time.UTC)
			hf := hourFactor(h)
			totalDemand := noise(rng, 55.0*sf*wf*hf*drift, 0.10)
			totalDemand = clamp(totalDemand, 5, 80)

			// 3 boilers share the load
			b1 := totalDemand * 0.40
			b2 := totalDemand * 0.35
			b3 := 0.0
			if wf > 0.5 && hf > 0.6 { // boiler 3 only on weekdays during production hours
				b3 = totalDemand * 0.25
			}

			s.db.InsertSteamBalance(models.SteamBalance{
				Boiler1: math.Round(b1*10) / 10,
				Boiler2: math.Round(b2*10) / 10,
				Boiler3: math.Round(b3*10) / 10,
				Demand:  math.Round(totalDemand*10) / 10,
			}, t.UnixMilli())

			// Header pressure: inversely correlated with demand spikes
			demandRatio := totalDemand / 55.0
			hp := clamp(noise(rng, 40.5-demandRatio*2.0, 0.02), 37, 43)
			mp := clamp(noise(rng, 14.0-demandRatio*0.5, 0.02), 12, 16)
			lp := clamp(noise(rng, 3.8-demandRatio*0.3, 0.02), 3, 5)

			s.db.InsertSteamHeaderPressure(models.SteamHeaderPressure{
				HP:   math.Round(hp*10) / 10,
				MP:   math.Round(mp*10) / 10,
				LP:   math.Round(lp*10) / 10,
			}, t.UnixMilli())

			// Condensate recovery: drops during high demand
			recovery := clamp(noise(rng, 88.0-demandRatio*8.0, 0.04), 72, 95)
			s.db.InsertSteamCondensate(models.SteamCondensate{
				Recovery: math.Round(recovery*10) / 10,
			}, t.UnixMilli())

			// Fuel vs steam ratio
			efficiency := 0.87 + rng.Float64()*0.04
			fuel := (b1 + b2 + b3) / efficiency
			s.db.InsertSteamFuelRatio(models.SteamFuelRatio{
				Fuel:  math.Round(fuel*10) / 10,
				Steam: math.Round((b1+b2+b3)*10) / 10,
			}, t.UnixMilli())

			count += 4
		}
	}

	onProgress(ProgressEvent{Event: "progress", Domain: "steam", Table: "all", Records: count})
	return nil
}

func (s *SystemGeneratorService) generateBoiler(start, end time.Time, rng *rand.Rand, onProgress func(ProgressEvent)) error {
	s.db.DeleteAllBoilerEfficiencyTrend()
	s.db.DeleteAllBoilerSteamFuel()
	s.db.DeleteAllBoilerStackTemp()

	count := 0
	maintenanceCycle := 90 // days between maintenance

	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		daysSinceStart := int(d.Sub(start).Hours() / 24)
		daysSinceMaintenance := daysSinceStart % maintenanceCycle

		// Efficiency degrades over maintenance cycle, then jumps back
		degradation := float64(daysSinceMaintenance) * 0.015
		baseEff := []float64{91.0, 87.0, 93.0, 86.0} // per boiler base

		s.db.InsertBoilerEfficiencyTrend(models.BoilerEfficiencyTrend{
			Blr01: math.Round(clamp(noise(rng, baseEff[0]-degradation, 0.01), 80, 95)*10) / 10,
			Blr02: math.Round(clamp(noise(rng, baseEff[1]-degradation, 0.01), 78, 93)*10) / 10,
			Blr03: math.Round(clamp(noise(rng, baseEff[2]-degradation, 0.01), 82, 96)*10) / 10,
			Blr04: math.Round(clamp(noise(rng, baseEff[3]-degradation, 0.01), 76, 92)*10) / 10,
		}, d.UnixMilli())
		count++

		// Hourly steam-fuel and stack temp
		sf := seasonFactor(d, "steam")
		wf := weekdayFactor(d)
		dayIndex := d.Sub(start).Hours() / 24
		drift := 1.0 + 0.10*math.Sin(dayIndex*2*math.Pi/6) // 6-day cycle
		for h := 0; h < 24; h += 1 {
			t := time.Date(d.Year(), d.Month(), d.Day(), h, 0, 0, 0, time.UTC)
			hf := hourFactor(h)
			steamOut := noise(rng, 55.0*sf*wf*hf*drift, 0.08)
			steamOut = clamp(steamOut, 5, 80)
			fuelIn := steamOut / (0.87 + rng.Float64()*0.04)

			s.db.InsertBoilerSteamFuel(models.BoilerSteamFuel{
				Steam: math.Round(steamOut*10) / 10,
				Fuel:  math.Round(fuelIn*10) / 10,
			}, t.UnixMilli())

			// Stack temp rises with load
			loadFactor := hf * wf
			s.db.InsertBoilerStackTemp(models.BoilerStackTemp{
				Blr01: math.Round(noise(rng, 170+loadFactor*20, 0.04)),
				Blr02: math.Round(noise(rng, 185+loadFactor*25, 0.04)),
				Blr03: math.Round(noise(rng, 165+loadFactor*18, 0.04)),
			}, t.UnixMilli())
			count += 2
		}
	}

	onProgress(ProgressEvent{Event: "progress", Domain: "boiler", Table: "all", Records: count})
	return nil
}

// assignTankStatus picks a realistic status based on tank level, product, and randomness.
// Distribution: ~40% in_service, ~15% receiving, ~15% discharging, ~10% idle,
// ~5% heating (only Crude/Diesel), ~5% warning, ~5% critical, ~5% maintenance
func assignTankStatus(level float64, product string, rng *rand.Rand) string {
	// High level tanks are more likely to be warning/critical
	if level >= 90 {
		r := rng.Float64()
		if r < 0.35 {
			return models.TankStatusWarning
		}
		if r < 0.55 {
			return models.TankStatusCritical
		}
		if r < 0.75 {
			return models.TankStatusDischarging
		}
		return models.TankStatusInService
	}
	// Very low level tanks tend to be receiving or idle
	if level <= 20 {
		r := rng.Float64()
		if r < 0.40 {
			return models.TankStatusReceiving
		}
		if r < 0.60 {
			return models.TankStatusIdle
		}
		if r < 0.75 {
			return models.TankStatusMaintenance
		}
		return models.TankStatusInService
	}
	// Normal range — weighted random
	r := rng.Float64()
	switch {
	case r < 0.35:
		return models.TankStatusInService
	case r < 0.50:
		return models.TankStatusReceiving
	case r < 0.65:
		return models.TankStatusDischarging
	case r < 0.75:
		return models.TankStatusIdle
	case r < 0.85:
		// Heating only for heavy products
		if product == "Crude" || product == "Diesel" {
			return models.TankStatusHeating
		}
		return models.TankStatusInService
	case r < 0.90:
		return models.TankStatusWarning
	case r < 0.95:
		return models.TankStatusMaintenance
	default:
		return models.TankStatusCritical
	}
}

func (s *SystemGeneratorService) generateTank(start, end time.Time, rng *rand.Rand, onProgress func(ProgressEvent)) error {
	s.db.DeleteAllTankInventoryTrend()
	s.db.DeleteAllTankThroughput()

	count := 0
	// Track inventory levels (evolving state)
	gasoline := 60000.0
	diesel := 95000.0
	crude := 70000.0
	ethanol := 18000.0
	lpg := 12000.0

	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		wf := weekdayFactor(d)

		// Receipts happen more on weekdays, dispatches are more steady
		receipts := noise(rng, 28000*wf, 0.15)
		dispatches := noise(rng, 26000*(0.7+wf*0.3), 0.10)
		receipts = clamp(receipts, 5000, 50000)
		dispatches = clamp(dispatches, 8000, 45000)

		s.db.InsertTankThroughput(models.TankThroughput{
			Receipts:   math.Round(receipts),
			Dispatches: math.Round(dispatches),
		}, d.UnixMilli())

		// Update inventory based on net flow, distributed across products
		netFlow := receipts - dispatches
		gasoline = clamp(gasoline+netFlow*0.22+rng.NormFloat64()*2000, 20000, 140000)
		diesel = clamp(diesel+netFlow*0.30+rng.NormFloat64()*3000, 30000, 220000)
		crude = clamp(crude+netFlow*0.25+rng.NormFloat64()*4000, 20000, 280000)
		ethanol = clamp(ethanol+netFlow*0.10+rng.NormFloat64()*1000, 5000, 55000)
		lpg = clamp(lpg+netFlow*0.13+rng.NormFloat64()*800, 3000, 40000)

		s.db.InsertTankInventoryTrend(models.TankInventoryTrend{
			Gasoline: math.Round(gasoline),
			Diesel:   math.Round(diesel),
			Crude:    math.Round(crude),
			Ethanol:  math.Round(ethanol),
			LPG:      math.Round(lpg),
		}, d.UnixMilli())
		count += 2
	}

	onProgress(ProgressEvent{Event: "progress", Domain: "tank", Table: "all", Records: count})
	return nil
}

func (s *SystemGeneratorService) generateSubStation(start, end time.Time, rng *rand.Rand, onProgress func(ProgressEvent)) error {
	s.db.DeleteAllSubStationVoltageProfile()
	s.db.DeleteAllSubStationTransformerTemp()
	s.db.DeleteAllSubStationFeederDistribution()

	count := 0
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		sf := seasonFactor(d, "electricity")
		wf := weekdayFactor(d)
		dayIndex := d.Sub(start).Hours() / 24
		drift := 1.0 + 0.12*math.Sin(dayIndex*2*math.Pi/8) // 8-day cycle

		for h := 0; h < 24; h += 1 { // hourly
			t := time.Date(d.Year(), d.Month(), d.Day(), h, 0, 0, 0, time.UTC)
			hf := hourFactor(h)
			loadFactor := sf * wf * hf * drift

			// Voltage: sags under load
			baseV := 11.0
			sag := loadFactor * 0.2
			s.db.InsertSubStationVoltageProfile(models.SubStationVoltageProfile{
				VRY:  math.Round(noise(rng, baseV-sag, 0.006)*100) / 100,
				VYB:  math.Round(noise(rng, baseV-sag+0.05, 0.006)*100) / 100,
				VBR:  math.Round(noise(rng, baseV-sag-0.03, 0.006)*100) / 100,
			}, t.UnixMilli())

			// Transformer temp: follows load with thermal lag (simplified)
			baseOilTemp := 50.0 + loadFactor*20.0
			s.db.InsertSubStationTransformerTemp(models.SubStationTransformerTemp{
				OilTemp:  math.Round(noise(rng, baseOilTemp, 0.04)*10) / 10,
				WindTemp: math.Round(noise(rng, baseOilTemp+8, 0.04)*10) / 10,
			}, t.UnixMilli())

			// Feeder distribution: 5 feeders with different base loads
			totalLoad := 3200.0 * loadFactor
			shares := []float64{0.25, 0.20, 0.28, 0.15, 0.12}
			s.db.InsertSubStationFeederDistribution(models.SubStationFeederDistribution{
				Feeder1: math.Round(noise(rng, totalLoad*shares[0], 0.10)),
				Feeder2: math.Round(noise(rng, totalLoad*shares[1], 0.10)),
				Feeder3: math.Round(noise(rng, totalLoad*shares[2], 0.10)),
				Feeder4: math.Round(noise(rng, totalLoad*shares[3], 0.10)),
				Feeder5: math.Round(noise(rng, totalLoad*shares[4], 0.10)),
			}, t.UnixMilli())

			count += 3
		}
	}

	onProgress(ProgressEvent{Event: "progress", Domain: "substation", Table: "all", Records: count})
	return nil
}

func (s *SystemGeneratorService) clearAllTables() {
	// Electricity
	s.db.DeleteAllElectricityLoadProfiles()
	s.db.DeleteAllElectricityWeeklyConsumption()
	s.db.DeleteAllElectricityPowerFactor()
	s.db.DeleteAllElectricityPeakDemand()
	s.db.DeleteAllElectricityPhaseBalance()
	// Steam
	s.db.DeleteAllSteamBalance()
	s.db.DeleteAllSteamHeaderPressure()
	s.db.DeleteAllSteamCondensate()
	s.db.DeleteAllSteamFuelRatio()
	// Boiler
	s.db.DeleteAllBoilerEfficiencyTrend()
	s.db.DeleteAllBoilerSteamFuel()
	s.db.DeleteAllBoilerStackTemp()
	// Tank
	s.db.DeleteAllTankInventoryTrend()
	s.db.DeleteAllTankThroughput()
	// SubStation
	s.db.DeleteAllSubStationVoltageProfile()
	s.db.DeleteAllSubStationTransformerTemp()
	s.db.DeleteAllSubStationFeederDistribution()
	// Alerts
	s.db.DeleteAllAlerts()
	// Also clear static tables
	s.db.DeleteAllElectricityCostBreakdown()
	s.db.DeleteAllSteamDistribution()
	s.db.DeleteAllSteamLoss()
	s.db.DeleteAllBoilerReadings()
	s.db.DeleteAllBoilerCombustion()
	s.db.DeleteAllBoilerEmissions()
	s.db.DeleteAllTankLevels()
	s.db.DeleteAllTankProductDistribution()
	s.db.DeleteAllTankLevelChanges()
	s.db.DeleteAllTankTemperatures()
	s.db.DeleteAllSubStationTransformers()
	s.db.DeleteAllSubStationHarmonics()
	s.db.DeleteAllSubStationFaultEvents()
}

func (s *SystemGeneratorService) updateAllKPIs(now time.Time, rng *rand.Rand) {
	sf := seasonFactor(now, "electricity")
	hf := hourFactor(now.Hour())
	// Per-terminal variation: rng seeded differently per terminal
	v := func(base, pct float64) float64 { return noise(rng, base, pct) }

	s.db.UpsertElectricityKPIs(models.ElectricityKPIs{
		TotalConsumption: math.Round(v(42850, 0.15) * sf),
		RealTimeDemand:   math.Round(v(3200, 0.12) * sf * hf),
		PeakDemand:       math.Round(v(3950, 0.10) * sf),
		PowerFactor:      math.Round(clamp(v(0.94, 0.03), 0.85, 0.99)*100) / 100,
		EnergyCost:       math.Round(v(12450, 0.15) * sf),
		CarbonEmissions:  math.Round(v(18.6, 0.12)*sf*10) / 10,
		GridAvailability: math.Round(clamp(v(99.7, 0.003), 98.5, 99.99)*10) / 10,
		TransformerLoad:  math.Round(clamp(v(72, 0.15)*hf, 20, 98)),
	})

	ssf := seasonFactor(now, "steam")
	steamProd := math.Round(v(55.5, 0.12)*ssf*10) / 10
	s.db.UpsertSteamKPIs(models.SteamKPIs{
		TotalProduction:    steamProd,
		TotalDemand:        math.Round(v(52.8, 0.10)*ssf*10) / 10,
		HeaderPressure:     math.Round(clamp(v(40.2, 0.05), 36, 44)*10) / 10,
		SteamTemperature:   math.Round(v(285, 0.04)),
		SystemEfficiency:   math.Round(clamp(v(87.5, 0.04), 82, 95)*10) / 10,
		CondensateRecovery: math.Round(clamp(v(83, 0.06), 70, 95)),
		MakeupWaterFlow:    math.Round(v(4.2, 0.15)*10) / 10,
		FuelConsumption:    math.Round(v(680, 0.12) * ssf),
	})

	s.db.UpsertBoilerKPIs(models.BoilerKPIs{
		BoilersOnline:    2 + rng.Intn(3), // 2-4
		BoilersTotal:     4,
		TotalSteamOutput: steamProd,
		FleetEfficiency:  math.Round(clamp(v(87.5, 0.04), 80, 95)*10) / 10,
		AvgStackTemp:     math.Round(v(185, 0.08)),
		TotalFuelRate:    math.Round(v(680, 0.12) * ssf),
		AvgO2:            math.Round(clamp(v(3.4, 0.10), 2.0, 5.0)*10) / 10,
		CoEmissions:      math.Round(v(85, 0.20)),
		NoxEmissions:     math.Round(v(120, 0.15)),
	})

	tankTotal := 59
	tankOp := tankTotal - 2 - rng.Intn(4) // 53-57 operating
	s.db.UpsertTankKPIs(models.TankKPIs{
		TotalInventory:    math.Round(v(1450000, 0.15)),
		AvailableCapacity: math.Round(clamp(v(35, 0.20), 15, 55)),
		TanksInOperation:  tankOp,
		TanksTotal:        tankTotal,
		CurrentThroughput: math.Round(v(8500, 0.18)),
		AvgTemperature:    math.Round(v(38, 0.10)),
		ActiveAlarms:      rng.Intn(6),
		DailyReceipts:     math.Round(v(52000, 0.15)),
		DailyDispatches:   math.Round(v(46000, 0.12)),
	})

	s.db.UpsertSubStationKPIs(models.SubStationKPIs{
		IncomingVoltage: math.Round(clamp(v(10.95, 0.02), 10.5, 11.4)*100) / 100,
		TotalLoad:       math.Round(v(8.2, 0.12)*10) / 10,
		TransformerTemp: math.Round(v(62, 0.10)),
		Frequency:       math.Round(clamp(v(50.02, 0.002), 49.9, 50.1)*100) / 100,
		THD:             math.Round(clamp(v(4.8, 0.15), 2.0, 8.0)*10) / 10,
		BreakersClosed:  12 + rng.Intn(3) - 1, // 11-14
		BreakersTotal:   14,
		FaultEvents24h:  rng.Intn(5),
		BusbarBalance:   math.Round(clamp(v(5.2, 0.20), 2.0, 8.0)*10) / 10,
	})
}

func (s *SystemGeneratorService) generateStaticData(rng *rand.Rand) {
	// Electricity cost breakdown
	s.db.InsertElectricityCostBreakdown(models.ElectricityCostBreakdown{Source: "Grid", Cost: 8700, Color: "#4D65FF"})
	s.db.InsertElectricityCostBreakdown(models.ElectricityCostBreakdown{Source: "Generator", Cost: 2500, Color: "#F6AD55"})
	s.db.InsertElectricityCostBreakdown(models.ElectricityCostBreakdown{Source: "Solar", Cost: 1250, Color: "#5CE5A0"})

	// Steam distribution
	s.db.InsertSteamDistribution(models.SteamDistribution{Consumer: "Process Unit A", Value: 18.5, Color: "#4D65FF"})
	s.db.InsertSteamDistribution(models.SteamDistribution{Consumer: "Process Unit B", Value: 14.2, Color: "#56CDE7"})
	s.db.InsertSteamDistribution(models.SteamDistribution{Consumer: "Heating", Value: 10.8, Color: "#5CE5A0"})
	s.db.InsertSteamDistribution(models.SteamDistribution{Consumer: "Tank Farm", Value: 7.5, Color: "#F6AD55"})
	s.db.InsertSteamDistribution(models.SteamDistribution{Consumer: "Utilities", Value: 4.5, Color: "#E53E3E"})

	// Steam loss
	s.db.InsertSteamLoss(models.SteamLoss{Location: "Header North", Loss: 3.2, TrapsTotal: 24, TrapsFailed: 5})
	s.db.InsertSteamLoss(models.SteamLoss{Location: "Process Unit A", Loss: 2.8, TrapsTotal: 18, TrapsFailed: 4})
	s.db.InsertSteamLoss(models.SteamLoss{Location: "Tank Farm", Loss: 1.9, TrapsTotal: 12, TrapsFailed: 2})
	s.db.InsertSteamLoss(models.SteamLoss{Location: "Building HVAC", Loss: 1.2, TrapsTotal: 15, TrapsFailed: 1})
	s.db.InsertSteamLoss(models.SteamLoss{Location: "Process Unit B", Loss: 0.8, TrapsTotal: 20, TrapsFailed: 1})

	// Boiler readings (current snapshot)
	s.db.InsertBoilerReading(models.BoilerReading{BoilerID: "BLR-01", Efficiency: 88, Load: 85, SteamOutput: 25})
	s.db.InsertBoilerReading(models.BoilerReading{BoilerID: "BLR-02", Efficiency: 84, Load: 72, SteamOutput: 20})
	s.db.InsertBoilerReading(models.BoilerReading{BoilerID: "BLR-03", Efficiency: 91, Load: 90, SteamOutput: 28})
	s.db.InsertBoilerReading(models.BoilerReading{BoilerID: "BLR-04", Efficiency: 0, Load: 0, SteamOutput: 0})

	// Boiler combustion
	s.db.InsertBoilerCombustion(models.BoilerCombustion{BoilerID: "BLR-01", O2: 3.2, CO2: 12.5, CO: 85, NOx: 45})
	s.db.InsertBoilerCombustion(models.BoilerCombustion{BoilerID: "BLR-02", O2: 4.1, CO2: 11.8, CO: 120, NOx: 65})
	s.db.InsertBoilerCombustion(models.BoilerCombustion{BoilerID: "BLR-03", O2: 2.8, CO2: 13.1, CO: 52, NOx: 38})

	// Boiler emissions
	s.db.InsertBoilerEmission(models.BoilerEmission{Pollutant: "CO", Current: 85, Limit: 200, Unit: "ppm"})
	s.db.InsertBoilerEmission(models.BoilerEmission{Pollutant: "NOx", Current: 120, Limit: 150, Unit: "mg/Nm3"})
	s.db.InsertBoilerEmission(models.BoilerEmission{Pollutant: "SOx", Current: 35, Limit: 100, Unit: "mg/Nm3"})

	// Tank levels — all 59 tanks with randomized levels
	type tankDef struct {
		id   string
		prod string
		color string
		cap  float64
	}
	allTanks := []tankDef{
		// Crude Oil — capacity 100000
		{"TK-301", "Crude", "#56CDE7", 100000},
		{"TK-302", "Crude", "#56CDE7", 100000},
		{"TK-501", "Crude", "#56CDE7", 100000},
		{"TK-502", "Crude", "#56CDE7", 100000},
		{"TK-503", "Crude", "#56CDE7", 100000},
		{"TK-504", "Crude", "#56CDE7", 100000},
		// Diesel — existing TK-2xx keep 80000, new TK-5xx series 60000
		{"TK-201", "Diesel", "#4D65FF", 80000},
		{"TK-202", "Diesel", "#4D65FF", 80000},
		{"TK-203", "Diesel", "#4D65FF", 80000},
		{"TK-505", "Diesel", "#4D65FF", 60000},
		{"TK-506", "Diesel", "#4D65FF", 60000},
		{"TK-507", "Diesel", "#4D65FF", 60000},
		{"TK-508", "Diesel", "#4D65FF", 60000},
		{"TK-509", "Diesel", "#4D65FF", 60000},
		{"TK-510", "Diesel", "#4D65FF", 60000},
		{"TK-511", "Diesel", "#4D65FF", 60000},
		{"TK-512", "Diesel", "#4D65FF", 60000},
		{"TK-513", "Diesel", "#4D65FF", 60000},
		{"TK-514", "Diesel", "#4D65FF", 60000},
		{"TK-515", "Diesel", "#4D65FF", 60000},
		{"TK-516", "Diesel", "#4D65FF", 60000},
		{"TK-517", "Diesel", "#4D65FF", 60000},
		{"TK-518", "Diesel", "#4D65FF", 60000},
		{"TK-519", "Diesel", "#4D65FF", 60000},
		{"TK-520", "Diesel", "#4D65FF", 60000},
		{"TK-521", "Diesel", "#4D65FF", 60000},
		{"TK-522", "Diesel", "#4D65FF", 60000},
		{"TK-523", "Diesel", "#4D65FF", 60000},
		// Gasoline — existing TK-1xx keep 50000, new TK-524+ series 40000
		{"TK-101", "Gasoline", "#F6AD55", 50000},
		{"TK-102", "Gasoline", "#F6AD55", 50000},
		{"TK-103", "Gasoline", "#F6AD55", 50000},
		{"TK-524", "Gasoline", "#F6AD55", 40000},
		{"TK-525", "Gasoline", "#F6AD55", 40000},
		{"TK-526", "Gasoline", "#F6AD55", 40000},
		{"TK-527", "Gasoline", "#F6AD55", 40000},
		{"TK-528", "Gasoline", "#F6AD55", 40000},
		{"TK-529", "Gasoline", "#F6AD55", 40000},
		{"TK-530", "Gasoline", "#F6AD55", 40000},
		{"TK-531", "Gasoline", "#F6AD55", 40000},
		{"TK-532", "Gasoline", "#F6AD55", 40000},
		{"TK-533", "Gasoline", "#F6AD55", 40000},
		{"TK-534", "Gasoline", "#F6AD55", 40000},
		{"TK-535", "Gasoline", "#F6AD55", 40000},
		// Ethanol — capacity 30000
		{"TK-401", "Ethanol", "#5CE5A0", 30000},
		{"TK-402", "Ethanol", "#5CE5A0", 30000},
		// LPG — capacity 20000
		{"TK-536", "LPG", "#5CE5A0", 20000},
		{"TK-537", "LPG", "#5CE5A0", 20000},
		{"TK-538", "LPG", "#5CE5A0", 20000},
		{"TK-539", "LPG", "#5CE5A0", 20000},
		{"TK-540", "LPG", "#5CE5A0", 20000},
		{"TK-541", "LPG", "#5CE5A0", 20000},
		{"TK-542", "LPG", "#5CE5A0", 20000},
		{"TK-543", "LPG", "#5CE5A0", 20000},
		{"TK-544", "LPG", "#5CE5A0", 20000},
		{"TK-545", "LPG", "#5CE5A0", 20000},
		{"TK-546", "LPG", "#5CE5A0", 20000},
		{"TK-547", "LPG", "#5CE5A0", 20000},
		{"TK-548", "LPG", "#5CE5A0", 20000},
		{"TK-549", "LPG", "#5CE5A0", 20000},
	}
	productVolumes := map[string]float64{}
	for _, tk := range allTanks {
		level := 15.0 + rng.Float64()*80.0 // 15-95%
		level = math.Round(level*10) / 10
		vol := math.Round(level * tk.cap / 100)

		// Assign realistic status based on level and randomness
		status := assignTankStatus(level, tk.prod, rng)

		s.db.InsertTankLevel(models.TankLevel{TankID: tk.id, Product: tk.prod, Level: level, Volume: vol, Capacity: tk.cap, Color: tk.color, Status: status})
		productVolumes[tk.prod] += vol
	}

	// Tank product distribution — computed from actual volumes
	distColors := map[string]string{"Diesel": "#4D65FF", "Crude": "#56CDE7", "Gasoline": "#F6AD55", "Ethanol": "#5CE5A0", "LPG": "#5CE5A0"}
	distNames := map[string]string{"Crude": "Crude Oil"}
	for prod, vol := range productVolumes {
		displayName := prod
		if n, ok := distNames[prod]; ok {
			displayName = n
		}
		s.db.InsertTankProductDistribution(models.TankProductDistribution{Product: displayName, Volume: math.Round(vol), Color: distColors[prod]})
	}

	// Tank level changes — all 59 tanks with random changes
	for _, tk := range allTanks {
		maxChange := tk.cap * 0.20
		change := (rng.Float64()*2 - 1) * maxChange // -20% to +20% of capacity
		s.db.InsertTankLevelChange(models.TankLevelChange{TankID: tk.id, Change: math.Round(change)})
	}

	// Tank temperatures — all 59 tanks
	baseTemps := map[string]float64{"Crude": 60, "Diesel": 45, "Gasoline": 25, "Ethanol": 22, "LPG": 18}
	for _, tk := range allTanks {
		bt := baseTemps[tk.prod]
		t00 := math.Round(noise(rng, bt, 0.05)*10) / 10
		t06 := math.Round(noise(rng, bt*0.97, 0.05)*10) / 10
		t12 := math.Round(noise(rng, bt*1.12, 0.05)*10) / 10
		t18 := math.Round(noise(rng, bt*1.05, 0.05)*10) / 10
		s.db.InsertTankTemperature(models.TankTemperature{TankID: tk.id, T00: t00, T06: t06, T12: t12, T18: t18})
	}

	// SubStation transformers
	s.db.InsertSubStationTransformer(models.SubStationTransformer{Name: "TR-01 (Main)", Loading: 72, Capacity: 25, Unit: "MVA"})
	s.db.InsertSubStationTransformer(models.SubStationTransformer{Name: "TR-02 (Aux)", Loading: 58, Capacity: 15, Unit: "MVA"})
	s.db.InsertSubStationTransformer(models.SubStationTransformer{Name: "TR-03 (Process)", Loading: 85, Capacity: 20, Unit: "MVA"})
	s.db.InsertSubStationTransformer(models.SubStationTransformer{Name: "TR-04 (Emergency)", Loading: 12, Capacity: 10, Unit: "MVA"})

	// SubStation harmonics
	harmonics := []struct {
		order string
		mag   float64
	}{
		{"3rd", 3.2}, {"5th", 6.8}, {"7th", 4.1}, {"9th", 1.5}, {"11th", 3.8}, {"13th", 2.1},
	}
	for _, h := range harmonics {
		s.db.InsertSubStationHarmonic(models.SubStationHarmonic{Order: h.order, Magnitude: h.mag})
	}

	// SubStation fault events
	s.db.InsertSubStationFaultEvent(models.SubStationFaultEvent{Day: "Mon", H08: 0, H09: 1, H10: 0, H11: 0, H12: 0, H13: 0, H14: 2, H15: 0})
	s.db.InsertSubStationFaultEvent(models.SubStationFaultEvent{Day: "Tue", H08: 0, H09: 0, H10: 3, H11: 0, H12: 0, H13: 1, H14: 0, H15: 0})
	s.db.InsertSubStationFaultEvent(models.SubStationFaultEvent{Day: "Wed", H08: 1, H09: 0, H10: 0, H11: 0, H12: 0, H13: 0, H14: 0, H15: 1})
	s.db.InsertSubStationFaultEvent(models.SubStationFaultEvent{Day: "Thu", H08: 0, H09: 0, H10: 0, H11: 1, H12: 0, H13: 0, H14: 0, H15: 0})
	s.db.InsertSubStationFaultEvent(models.SubStationFaultEvent{Day: "Fri", H08: 0, H09: 0, H10: 0, H11: 1, H12: 0, H13: 0, H14: 2, H15: 0})
}

func (s *SystemGeneratorService) generateAlerts(start, end time.Time, rng *rand.Rand, onProgress func(ProgressEvent)) error {
	s.db.DeleteAllAlerts()

	type alertTemplate struct {
		typ      string
		severity int
		source   string
		sourceID string
		title    string
		desc     string
	}

	templates := []alertTemplate{
		{"critical", 1, "boiler", "BLR-03", "High Stack Temperature", "Stack temp exceeded 220°C alarm threshold"},
		{"critical", 1, "electricity", "GRID", "Power Grid Fault", "Incoming voltage dropped below 10.5kV"},
		{"warning", 2, "tank", "TK-201", "Tank Level Above 90%", "Diesel tank at 92% capacity"},
		{"warning", 2, "substation", "TR-03", "High Transformer Load", "Loading at 85%, above 80% warning"},
		{"warning", 2, "steam", "HEADER", "Header Pressure Low", "HP header dropped below 38 bar"},
		{"info", 3, "boiler", "BLR-04", "Scheduled Maintenance", "Boiler offline for planned maintenance"},
		{"info", 3, "tank", "TK-302", "Tank Inspection Due", "Annual inspection scheduled"},
		{"resolved", 4, "electricity", "PF", "Power Factor Restored", "PF returned to 0.94 after capacitor switch"},
		{"resolved", 4, "steam", "TRAP-N", "Steam Trap Repaired", "Failed trap in Header North replaced"},
		{"resolved", 4, "boiler", "BLR-01", "Boiler Back Online", "Returned to service after maintenance"},
	}

	totalRange := end.Sub(start)
	count := 0
	now := time.Now().UTC()
	sevenDaysAgo := now.AddDate(0, 0, -7)

	for i := 0; i < 50; i++ {
		tmpl := templates[i%len(templates)]
		// Random timestamp in the date range
		offset := time.Duration(rng.Int63n(int64(totalRange)))
		ts := start.Add(offset)
		createdAt := ts.UnixMilli()

		resolvedAt := int64(0)
		if tmpl.typ == "resolved" {
			// Resolved 1-12 hours after creation
			resolvedAt = createdAt + int64(rng.Intn(12*3600))*1000
		}

		// Mark as read if resolved or older than 7 days
		isRead := tmpl.typ == "resolved" || ts.Before(sevenDaysAgo)

		err := s.db.InsertAlert(models.Alert{
			Type:        tmpl.typ,
			Title:       tmpl.title,
			Description: tmpl.desc,
			Source:      tmpl.source,
			SourceID:    tmpl.sourceID,
			Severity:    tmpl.severity,
			IsRead:      isRead,
			CreatedAt:   createdAt,
			ResolvedAt:  resolvedAt,
		})
		if err != nil {
			return fmt.Errorf("insert alert: %w", err)
		}
		count++
	}

	onProgress(ProgressEvent{Event: "progress", Domain: "alerts", Table: "alerts", Records: count})
	return nil
}
