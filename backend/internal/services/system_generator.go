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

	rng := rand.New(rand.NewSource(42)) // deterministic for reproducibility

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

		// Hourly load profiles
		for h := 0; h < 24; h++ {
			t := time.Date(d.Year(), d.Month(), d.Day(), h, 0, 0, 0, time.UTC)
			hf := hourFactor(h)
			actual := noise(rng, baseLoad*sf*wf*hf, 0.03)
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

		// Phase balance (every 4 hours = 6 per day)
		for h := 0; h < 24; h += 4 {
			t := time.Date(d.Year(), d.Month(), d.Day(), h, 0, 0, 0, time.UTC)
			hf := hourFactor(h)
			baseV := 245.0
			// Voltage sags slightly during peak hours
			sag := (1.0 - hf) * 5.0
			s.db.InsertElectricityPhaseBalance(models.ElectricityPhaseBalance{
				PhaseA: math.Round(noise(rng, baseV-sag, 0.005)*10) / 10,
				PhaseB: math.Round(noise(rng, baseV-sag-2, 0.005)*10) / 10,
				PhaseC: math.Round(noise(rng, baseV-sag+1, 0.005)*10) / 10,
			}, t.UnixMilli())
			count++
		}

		// Power factor (every 2 hours = 12 per day)
		for h := 0; h < 24; h += 2 {
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

		for h := 0; h < 24; h += 2 { // every 2 hours
			t := time.Date(d.Year(), d.Month(), d.Day(), h, 0, 0, 0, time.UTC)
			hf := hourFactor(h)
			totalDemand := noise(rng, 55.0*sf*wf*hf, 0.04)
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
			hp := clamp(noise(rng, 40.5-demandRatio*2.0, 0.01), 37, 43)
			mp := clamp(noise(rng, 14.0-demandRatio*0.5, 0.01), 12, 16)
			lp := clamp(noise(rng, 3.8-demandRatio*0.3, 0.01), 3, 5)

			s.db.InsertSteamHeaderPressure(models.SteamHeaderPressure{
				HP:   math.Round(hp*10) / 10,
				MP:   math.Round(mp*10) / 10,
				LP:   math.Round(lp*10) / 10,
			}, t.UnixMilli())

			// Condensate recovery: drops during high demand
			recovery := clamp(noise(rng, 88.0-demandRatio*8.0, 0.02), 72, 95)
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
			Blr01: math.Round(clamp(noise(rng, baseEff[0]-degradation, 0.005), 80, 95)*10) / 10,
			Blr02: math.Round(clamp(noise(rng, baseEff[1]-degradation, 0.005), 78, 93)*10) / 10,
			Blr03: math.Round(clamp(noise(rng, baseEff[2]-degradation, 0.005), 82, 96)*10) / 10,
			Blr04: math.Round(clamp(noise(rng, baseEff[3]-degradation, 0.005), 76, 92)*10) / 10,
		}, d.UnixMilli())
		count++

		// Hourly steam-fuel and stack temp
		sf := seasonFactor(d, "steam")
		wf := weekdayFactor(d)
		for h := 0; h < 24; h += 2 {
			t := time.Date(d.Year(), d.Month(), d.Day(), h, 0, 0, 0, time.UTC)
			hf := hourFactor(h)
			steamOut := noise(rng, 55.0*sf*wf*hf, 0.04)
			steamOut = clamp(steamOut, 5, 80)
			fuelIn := steamOut / (0.87 + rng.Float64()*0.04)

			s.db.InsertBoilerSteamFuel(models.BoilerSteamFuel{
				Steam: math.Round(steamOut*10) / 10,
				Fuel:  math.Round(fuelIn*10) / 10,
			}, t.UnixMilli())

			// Stack temp rises with load
			loadFactor := hf * wf
			s.db.InsertBoilerStackTemp(models.BoilerStackTemp{
				Blr01: math.Round(noise(rng, 170+loadFactor*20, 0.02)),
				Blr02: math.Round(noise(rng, 185+loadFactor*25, 0.02)),
				Blr03: math.Round(noise(rng, 165+loadFactor*18, 0.02)),
			}, t.UnixMilli())
			count += 2
		}
	}

	onProgress(ProgressEvent{Event: "progress", Domain: "boiler", Table: "all", Records: count})
	return nil
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
		gasoline = clamp(gasoline+netFlow*0.25+rng.NormFloat64()*2000, 20000, 140000)
		diesel = clamp(diesel+netFlow*0.35+rng.NormFloat64()*3000, 30000, 220000)
		crude = clamp(crude+netFlow*0.30+rng.NormFloat64()*4000, 20000, 280000)
		ethanol = clamp(ethanol+netFlow*0.10+rng.NormFloat64()*1000, 5000, 55000)

		s.db.InsertTankInventoryTrend(models.TankInventoryTrend{
			Gasoline: math.Round(gasoline),
			Diesel:   math.Round(diesel),
			Crude:    math.Round(crude),
			Ethanol:  math.Round(ethanol),
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

		for h := 0; h < 24; h += 2 {
			t := time.Date(d.Year(), d.Month(), d.Day(), h, 0, 0, 0, time.UTC)
			hf := hourFactor(h)
			loadFactor := sf * wf * hf

			// Voltage: sags under load
			baseV := 11.0
			sag := loadFactor * 0.2
			s.db.InsertSubStationVoltageProfile(models.SubStationVoltageProfile{
				VRY:  math.Round(noise(rng, baseV-sag, 0.003)*100) / 100,
				VYB:  math.Round(noise(rng, baseV-sag+0.05, 0.003)*100) / 100,
				VBR:  math.Round(noise(rng, baseV-sag-0.03, 0.003)*100) / 100,
			}, t.UnixMilli())

			// Transformer temp: follows load with thermal lag (simplified)
			baseOilTemp := 50.0 + loadFactor*20.0
			s.db.InsertSubStationTransformerTemp(models.SubStationTransformerTemp{
				OilTemp:  math.Round(noise(rng, baseOilTemp, 0.02)*10) / 10,
				WindTemp: math.Round(noise(rng, baseOilTemp+8, 0.02)*10) / 10,
			}, t.UnixMilli())

			// Feeder distribution: 5 feeders with different base loads
			totalLoad := 3200.0 * loadFactor
			shares := []float64{0.25, 0.20, 0.28, 0.15, 0.12}
			s.db.InsertSubStationFeederDistribution(models.SubStationFeederDistribution{
				Feeder1: math.Round(noise(rng, totalLoad*shares[0], 0.05)),
				Feeder2: math.Round(noise(rng, totalLoad*shares[1], 0.05)),
				Feeder3: math.Round(noise(rng, totalLoad*shares[2], 0.05)),
				Feeder4: math.Round(noise(rng, totalLoad*shares[3], 0.05)),
				Feeder5: math.Round(noise(rng, totalLoad*shares[4], 0.05)),
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

	s.db.UpsertElectricityKPIs(models.ElectricityKPIs{
		TotalConsumption: math.Round(42850 * sf),
		RealTimeDemand:   math.Round(3200 * sf * hf),
		PeakDemand:       math.Round(3950 * sf),
		PowerFactor:      0.94,
		EnergyCost:       math.Round(12450 * sf),
		CarbonEmissions:  math.Round(18.6*sf*10) / 10,
		GridAvailability: 99.7,
		TransformerLoad:  math.Round(72 * hf),
	})

	ssf := seasonFactor(now, "steam")
	s.db.UpsertSteamKPIs(models.SteamKPIs{
		TotalProduction:    math.Round(55.5*ssf*10) / 10,
		TotalDemand:        math.Round(52.8*ssf*10) / 10,
		HeaderPressure:     40.2,
		SteamTemperature:   285,
		SystemEfficiency:   87.5,
		CondensateRecovery: 83,
		MakeupWaterFlow:    4.2,
		FuelConsumption:    math.Round(680 * ssf),
	})

	s.db.UpsertBoilerKPIs(models.BoilerKPIs{
		BoilersOnline:    3,
		BoilersTotal:     4,
		TotalSteamOutput: math.Round(55.5*ssf*10) / 10,
		FleetEfficiency:  87.5,
		AvgStackTemp:     185,
		TotalFuelRate:    math.Round(680 * ssf),
		AvgO2:            3.4,
		CoEmissions:      85,
		NoxEmissions:     120,
	})

	s.db.UpsertTankKPIs(models.TankKPIs{
		TotalInventory:    245000,
		AvailableCapacity: 32,
		TanksInOperation:  18,
		TanksTotal:        22,
		CurrentThroughput: 1850,
		AvgTemperature:    42,
		ActiveAlarms:      2,
		DailyReceipts:     32000,
		DailyDispatches:   26000,
	})

	s.db.UpsertSubStationKPIs(models.SubStationKPIs{
		IncomingVoltage: 10.95,
		TotalLoad:       8.2,
		TransformerTemp: 62,
		Frequency:       50.02,
		THD:             4.8,
		BreakersClosed:  12,
		BreakersTotal:   14,
		FaultEvents24h:  2,
		BusbarBalance:   5.2,
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

	// Tank levels
	tanks := []struct {
		id, prod, color string
		level, vol, cap float64
	}{
		{"TK-101", "Gasoline", "#F6AD55", 78, 39000, 50000},
		{"TK-102", "Gasoline", "#F6AD55", 45, 22500, 50000},
		{"TK-103", "Gasoline", "#F6AD55", 62, 31000, 50000},
		{"TK-201", "Diesel", "#4D65FF", 92, 73600, 80000},
		{"TK-202", "Diesel", "#4D65FF", 33, 26400, 80000},
		{"TK-203", "Diesel", "#4D65FF", 71, 56800, 80000},
		{"TK-301", "Crude", "#56CDE7", 67, 67000, 100000},
		{"TK-302", "Crude", "#56CDE7", 54, 54000, 100000},
		{"TK-401", "Ethanol", "#5CE5A0", 55, 16500, 30000},
		{"TK-402", "Ethanol", "#5CE5A0", 38, 11400, 30000},
	}
	for _, tk := range tanks {
		s.db.InsertTankLevel(models.TankLevel{TankID: tk.id, Product: tk.prod, Level: tk.level, Volume: tk.vol, Capacity: tk.cap, Color: tk.color})
	}

	// Tank product distribution
	s.db.InsertTankProductDistribution(models.TankProductDistribution{Product: "Diesel", Volume: 156800, Color: "#4D65FF"})
	s.db.InsertTankProductDistribution(models.TankProductDistribution{Product: "Crude Oil", Volume: 121000, Color: "#56CDE7"})
	s.db.InsertTankProductDistribution(models.TankProductDistribution{Product: "Gasoline", Volume: 92500, Color: "#F6AD55"})
	s.db.InsertTankProductDistribution(models.TankProductDistribution{Product: "Ethanol", Volume: 27900, Color: "#5CE5A0"})

	// Tank level changes
	changes := []struct {
		id     string
		change float64
	}{
		{"TK-101", 5200}, {"TK-102", -8500}, {"TK-103", 3200},
		{"TK-201", 12000}, {"TK-202", -3200}, {"TK-203", -6800},
		{"TK-301", -15000}, {"TK-302", 8500}, {"TK-401", 2800}, {"TK-402", -1500},
	}
	for _, c := range changes {
		s.db.InsertTankLevelChange(models.TankLevelChange{TankID: c.id, Change: c.change})
	}

	// Tank temperatures
	temps := []struct {
		id                     string
		t00, t06, t12, t18 float64
	}{
		{"TK-101", 25, 24, 32, 28}, {"TK-201", 45, 44, 52, 48},
		{"TK-301", 60, 58, 68, 63}, {"TK-401", 22, 21, 28, 25},
	}
	for _, t := range temps {
		s.db.InsertTankTemperature(models.TankTemperature{TankID: t.id, T00: t.t00, T06: t.t06, T12: t.t12, T18: t.t18})
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
