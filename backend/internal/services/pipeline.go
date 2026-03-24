package services

import (
	"fmt"
	"math"

	"railcarlist/internal/database"
	"railcarlist/internal/models"
)

type PipelineService struct {
	db *database.DB
}

func NewPipelineService(db *database.DB) *PipelineService {
	return &PipelineService{db: db}
}

// helper formatters
func fmtN(v float64, d int) string {
	if d == 0 {
		return fmt.Sprintf("%s", addCommas(int64(math.Round(v))))
	}
	return fmt.Sprintf("%.*f", d, v)
}

func addCommas(n int64) string {
	if n < 0 {
		return "-" + addCommas(-n)
	}
	s := fmt.Sprintf("%d", n)
	if len(s) <= 3 {
		return s
	}
	result := ""
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result += ","
		}
		result += string(c)
	}
	return result
}

func calcStatus(rules []statusRule) string {
	for _, r := range rules {
		if r.condition {
			return r.status
		}
	}
	return "normal"
}

type statusRule struct {
	condition bool
	status    string
}

func calcTrend(current, reference float64) (string, string) {
	if reference == 0 {
		return "flat", "0.0%"
	}
	pct := ((current - reference) / math.Abs(reference)) * 100
	if math.Abs(pct) < 0.5 {
		return "flat", "0.0%"
	}
	sign := ""
	trend := "down"
	if pct > 0 {
		sign = "+"
		trend = "up"
	}
	return trend, fmt.Sprintf("%s%.1f%%", sign, pct)
}

func (svc *PipelineService) GetDAG(view string) (*models.PipelineDAGResponse, error) {
	// Fetch all 5 domain KPIs
	ep := models.HistoryParams{}
	elec, _ := svc.db.ComputeElectricityKPIs(ep)
	sub, _ := svc.db.ComputeSubStationKPIs(ep)
	boil, _ := svc.db.ComputeBoilerKPIs(ep)
	stm, _ := svc.db.ComputeSteamKPIs(ep)
	tank, _ := svc.db.ComputeTankKPIs(ep)

	// Nil guards
	if elec == nil {
		elec = &models.ElectricityKPIs{}
	}
	if sub == nil {
		sub = &models.SubStationKPIs{}
	}
	if boil == nil {
		boil = &models.BoilerKPIs{}
	}
	if stm == nil {
		stm = &models.SteamKPIs{}
	}
	if tank == nil {
		tank = &models.TankKPIs{}
	}

	resp := &models.PipelineDAGResponse{View: view}

	if view == "detailed" {
		resp.Nodes = svc.buildDetailedNodes(elec, sub, boil, stm, tank)
		resp.Edges = svc.buildDetailedEdges(elec, sub, boil, stm, tank)
	} else {
		resp.Nodes = svc.buildOverviewNodes(elec, sub, boil, stm, tank)
		resp.Edges = svc.buildOverviewEdges(elec, sub, boil, stm, tank)
	}

	return resp, nil
}

// ============================================================
// Overview nodes (5 domain nodes)
// ============================================================

func (svc *PipelineService) buildOverviewNodes(e *models.ElectricityKPIs, ss *models.SubStationKPIs, b *models.BoilerKPIs, s *models.SteamKPIs, t *models.TankKPIs) []models.PipelineNode {
	elecTrend, elecTrendVal := calcTrend(e.RealTimeDemand, e.PeakDemand*0.48)
	steamTrend, steamTrendVal := calcTrend(s.TotalProduction, s.TotalDemand)
	netFlow := t.DailyReceipts - t.DailyDispatches
	tankTrend, tankTrendVal := calcTrend(netFlow+1000, 1000)

	return []models.PipelineNode{
		{
			ID: "electricity", Label: "Electricity", Domain: "electricity", Icon: "electricity",
			KPIValue: fmtN(e.RealTimeDemand, 0), KPIUnit: "kW", Href: "/electricity",
			Status: calcStatus([]statusRule{{e.TransformerLoad > 95, "critical"}, {e.TransformerLoad > 85, "warning"}}),
			Trend: elecTrend, TrendValue: elecTrendVal,
			KPIs: []models.PipelineKPI{
				{Label: "Consumption", Value: fmt.Sprintf("%s kWh", fmtN(e.TotalConsumption, 0))},
				{Label: "Peak Demand", Value: fmt.Sprintf("%s kW", fmtN(e.PeakDemand, 0))},
				{Label: "Power Factor", Value: fmtN(e.PowerFactor, 2)},
				{Label: "Grid Availability", Value: fmt.Sprintf("%s%%", fmtN(e.GridAvailability, 1))},
				{Label: "Energy Cost", Value: fmt.Sprintf("$%s", fmtN(e.EnergyCost, 0))},
				{Label: "Carbon", Value: fmt.Sprintf("%s t", fmtN(e.CarbonEmissions, 1))},
			},
		},
		{
			ID: "substation", Label: "Sub Station", Domain: "substation", Icon: "substation",
			KPIValue: fmtN(ss.IncomingVoltage, 2), KPIUnit: "kV", Href: "/sub-station",
			Status: calcStatus([]statusRule{{ss.THD > 8, "critical"}, {ss.THD > 5, "warning"}, {ss.FaultEvents24h > 3, "warning"}}),
			Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{
				{Label: "Total Load", Value: fmt.Sprintf("%s MW", fmtN(ss.TotalLoad, 1))},
				{Label: "Frequency", Value: fmt.Sprintf("%s Hz", fmtN(ss.Frequency, 2))},
				{Label: "THD", Value: fmt.Sprintf("%s%%", fmtN(ss.THD, 1))},
				{Label: "Transformer Temp", Value: fmt.Sprintf("%s°C", fmtN(ss.TransformerTemp, 0))},
				{Label: "Breakers", Value: fmt.Sprintf("%d/%d", ss.BreakersClosed, ss.BreakersTotal)},
				{Label: "Faults (24h)", Value: fmt.Sprintf("%d", ss.FaultEvents24h)},
			},
		},
		{
			ID: "boiler", Label: "Boiler", Domain: "boiler", Icon: "boiler",
			KPIValue: fmt.Sprintf("%d/%d", b.BoilersOnline, b.BoilersTotal), KPIUnit: "online", Href: "/boiler",
			Status: calcStatus([]statusRule{{b.BoilersOnline < b.BoilersTotal-1, "critical"}, {b.BoilersOnline < b.BoilersTotal, "warning"}}),
			Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{
				{Label: "Steam Output", Value: fmt.Sprintf("%s T/h", fmtN(b.TotalSteamOutput, 1))},
				{Label: "Efficiency", Value: fmt.Sprintf("%s%%", fmtN(b.FleetEfficiency, 1))},
				{Label: "Stack Temp", Value: fmt.Sprintf("%s°C", fmtN(b.AvgStackTemp, 0))},
				{Label: "Fuel Rate", Value: fmt.Sprintf("%s L/h", fmtN(b.TotalFuelRate, 0))},
				{Label: "CO", Value: fmt.Sprintf("%s ppm", fmtN(b.CoEmissions, 0))},
				{Label: "NOx", Value: fmt.Sprintf("%s ppm", fmtN(b.NoxEmissions, 0))},
			},
		},
		{
			ID: "steam", Label: "Steam", Domain: "steam", Icon: "steam",
			KPIValue: fmtN(s.TotalProduction, 1), KPIUnit: "T/h", Href: "/steam",
			Status: calcStatus([]statusRule{{s.HeaderPressure < 36, "critical"}, {s.HeaderPressure < 38, "warning"}}),
			Trend: steamTrend, TrendValue: steamTrendVal,
			KPIs: []models.PipelineKPI{
				{Label: "Demand", Value: fmt.Sprintf("%s T/h", fmtN(s.TotalDemand, 1))},
				{Label: "Header Pressure", Value: fmt.Sprintf("%s bar", fmtN(s.HeaderPressure, 1))},
				{Label: "Temperature", Value: fmt.Sprintf("%s°C", fmtN(s.SteamTemperature, 0))},
				{Label: "System Efficiency", Value: fmt.Sprintf("%s%%", fmtN(s.SystemEfficiency, 1))},
				{Label: "Condensate Recovery", Value: fmt.Sprintf("%.0f%%", s.CondensateRecovery)},
				{Label: "Makeup Water", Value: fmt.Sprintf("%s m³/h", fmtN(s.MakeupWaterFlow, 1))},
			},
		},
		{
			ID: "tank", Label: "Tank Farm", Domain: "tank", Icon: "tank",
			KPIValue: fmt.Sprintf("%d", t.TanksInOperation), KPIUnit: fmt.Sprintf("/ %d", t.TanksTotal), Href: "/tank",
			Status: calcStatus([]statusRule{{t.ActiveAlarms > 5, "critical"}, {t.ActiveAlarms > 0, "warning"}}),
			Trend: tankTrend, TrendValue: tankTrendVal,
			KPIs: []models.PipelineKPI{
				{Label: "Inventory", Value: fmt.Sprintf("%s bbl", fmtN(t.TotalInventory, 0))},
				{Label: "Available Capacity", Value: fmt.Sprintf("%.0f%%", t.AvailableCapacity)},
				{Label: "Throughput", Value: fmt.Sprintf("%s bbl/d", fmtN(t.CurrentThroughput, 0))},
				{Label: "Daily Receipts", Value: fmt.Sprintf("%s bbl", fmtN(t.DailyReceipts, 0))},
				{Label: "Daily Dispatches", Value: fmt.Sprintf("%s bbl", fmtN(t.DailyDispatches, 0))},
				{Label: "Active Alarms", Value: fmt.Sprintf("%d", t.ActiveAlarms)},
			},
		},
	}
}

// ============================================================
// Overview edges (5)
// ============================================================

func (svc *PipelineService) buildOverviewEdges(e *models.ElectricityKPIs, _ *models.SubStationKPIs, b *models.BoilerKPIs, s *models.SteamKPIs, _ *models.TankKPIs) []models.PipelineEdge {
	surplus := s.TotalProduction - s.TotalDemand
	return []models.PipelineEdge{
		{ID: "ov-e1", Source: "electricity", Target: "substation", Label: "HV Feed", FlowValue: fmt.Sprintf("%s kW", fmtN(e.RealTimeDemand, 0)), Color: "primary", Animated: true},
		{ID: "ov-e2", Source: "substation", Target: "boiler", Label: "MV Distribution", Color: "primary", Animated: true},
		{ID: "ov-e3", Source: "boiler", Target: "steam", Label: "Steam Generation", FlowValue: fmt.Sprintf("%s T/h", fmtN(b.TotalSteamOutput, 1)), Color: "warning", Animated: true},
		{ID: "ov-e4", Source: "steam", Target: "tank", Label: "Tank Heating", FlowValue: fmt.Sprintf("%s T/h", fmtN(surplus, 1)), Color: "secondary", Animated: true},
		{ID: "ov-e5", Source: "electricity", Target: "tank", Label: "Pump Power", Color: "secondary", Dashed: true},
	}
}

// ============================================================
// Detailed nodes (25+ sub-nodes)
// ============================================================

func (svc *PipelineService) buildDetailedNodes(e *models.ElectricityKPIs, ss *models.SubStationKPIs, b *models.BoilerKPIs, s *models.SteamKPIs, t *models.TankKPIs) []models.PipelineNode {
	surplusSteam := s.TotalProduction - s.TotalDemand
	netFlow := t.DailyReceipts - t.DailyDispatches
	hpPressure := s.HeaderPressure
	if hpPressure == 0 {
		hpPressure = 42
	}
	lpPressure := hpPressure * 0.28
	condensateRate := s.TotalProduction * (s.CondensateRecovery / 100)
	if s.TotalProduction == 0 {
		condensateRate = 18 * 0.82
	}
	makeupWater := s.MakeupWaterFlow
	if makeupWater == 0 {
		makeupWater = 3.2
	}
	fuelStorageLevel := 78.0
	stackTemp := b.AvgStackTemp
	if stackTemp == 0 {
		stackTemp = 185
	}
	econRecovery := 12.5
	if stackTemp <= 160 {
		econRecovery = 8.2
	}
	demand := e.RealTimeDemand
	if demand == 0 {
		demand = 2400
	}
	peak := e.PeakDemand
	if peak == 0 {
		peak = 3200
	}
	totalLoad := ss.TotalLoad
	if totalLoad == 0 {
		totalLoad = 4.2
	}

	elecTrend, elecTrendVal := calcTrend(e.RealTimeDemand, peak*0.48)
	steamTrend, steamTrendVal := calcTrend(s.TotalProduction, s.TotalDemand)
	tankTrend, tankTrendVal := calcTrend(netFlow+10000, 10000)

	nodes := []models.PipelineNode{
		// ===================== Electricity =====================
		{ID: "elec-grid", Label: "Power Grid", Domain: "electricity", Icon: "electricity", Group: "electricity",
			KPIValue: fmtN(e.RealTimeDemand, 0), KPIUnit: "kW", Href: "/electricity",
			Status: calcStatus([]statusRule{{e.TransformerLoad > 95, "critical"}, {e.TransformerLoad > 85, "warning"}}),
			Trend: elecTrend, TrendValue: elecTrendVal,
			KPIs: []models.PipelineKPI{{Label: "Peak Demand", Value: fmt.Sprintf("%s kW", fmtN(peak, 0))}, {Label: "Availability", Value: fmt.Sprintf("%s%%", fmtN(e.GridAvailability, 1))}, {Label: "Voltage", Value: "33 kV"}}},
		{ID: "elec-gen", Label: "Emergency Generator", Domain: "electricity", Icon: "generator", Group: "electricity",
			KPIValue: "Standby", KPIUnit: "", Status: "normal", Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Capacity", Value: "2,500 kVA"}, {Label: "Fuel Level", Value: "92%"}, {Label: "Last Test", Value: "3d ago"}}},
		{ID: "elec-mcc", Label: "Power Distribution", Domain: "electricity", Icon: "mcc", Group: "electricity",
			KPIValue: fmtN(math.Round(demand*0.85), 0), KPIUnit: "kW",
			Status: calcStatus([]statusRule{{demand > peak * 0.9, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "MCC Load", Value: fmt.Sprintf("%.1f%%", demand*0.85/peak*100)}, {Label: "Active Feeders", Value: "24/28"}, {Label: "Trip Events", Value: "0"}}},
		{ID: "elec-hvac", Label: "Lighting & HVAC", Domain: "electricity", Icon: "lighting", Group: "electricity",
			KPIValue: fmtN(math.Round(demand*0.12), 0), KPIUnit: "kW", Status: "normal", Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "HVAC Load", Value: fmt.Sprintf("%s kW", fmtN(math.Round(demand*0.08), 0))}, {Label: "Lighting", Value: fmt.Sprintf("%s kW", fmtN(math.Round(demand*0.04), 0))}}},
		{ID: "elec-pumps", Label: "Pump Motors", Domain: "electricity", Icon: "pumpmotors", Group: "electricity",
			KPIValue: fmtN(math.Round(demand*0.35), 0), KPIUnit: "kW",
			Status: calcStatus([]statusRule{{demand > peak * 0.95, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Running", Value: "8/12 motors"}, {Label: "Avg Load", Value: "76%"}, {Label: "VFD Active", Value: "6/8"}}},
		{ID: "elec-cost", Label: "Energy & Carbon", Domain: "electricity", Icon: "alert", Group: "electricity",
			KPIValue: fmt.Sprintf("$%s", fmtN(e.EnergyCost, 0)), KPIUnit: "/month",
			Status: calcStatus([]statusRule{{e.PowerFactor < 0.85, "critical"}, {e.PowerFactor < 0.9, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Carbon Emissions", Value: fmt.Sprintf("%s t CO₂", fmtN(e.CarbonEmissions, 1))}, {Label: "Power Factor", Value: fmtN(e.PowerFactor, 2)}, {Label: "Tariff Rate", Value: "$0.087/kWh"}}},

		// ===================== Substation =====================
		{ID: "sub-xfmr", Label: "Main Transformer", Domain: "substation", Icon: "transformer", Group: "substation",
			KPIValue: fmtN(ss.IncomingVoltage, 2), KPIUnit: "kV", Href: "/sub-station",
			Status: calcStatus([]statusRule{{ss.TransformerTemp > 90, "critical"}, {ss.TransformerTemp > 75, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Temperature", Value: fmt.Sprintf("%s°C", fmtN(ss.TransformerTemp, 0))}, {Label: "Load", Value: fmt.Sprintf("%s MW", fmtN(ss.TotalLoad, 1))}, {Label: "Tap Position", Value: "7/21"}}},
		{ID: "sub-busA", Label: "Bus Section A", Domain: "substation", Icon: "busbar", Group: "substation",
			KPIValue: fmtN(totalLoad*0.55, 1), KPIUnit: "MW",
			Status: calcStatus([]statusRule{{ss.FaultEvents24h > 2, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Feeders", Value: "14/16 closed"}, {Label: "Current", Value: fmt.Sprintf("%s A", fmtN(math.Round(totalLoad*0.55*1000/11), 0))}}},
		{ID: "sub-busB", Label: "Bus Section B", Domain: "substation", Icon: "busbar", Group: "substation",
			KPIValue: fmtN(totalLoad*0.45, 1), KPIUnit: "MW",
			Status: calcStatus([]statusRule{{ss.FaultEvents24h > 2, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Feeders", Value: "12/14 closed"}, {Label: "Current", Value: fmt.Sprintf("%s A", fmtN(math.Round(totalLoad*0.45*1000/11), 0))}}},
		{ID: "sub-cap", Label: "Capacitor Bank", Domain: "substation", Icon: "capacitor", Group: "substation",
			KPIValue: fmtN(e.PowerFactor, 2), KPIUnit: "PF",
			Status: calcStatus([]statusRule{{e.PowerFactor < 0.85, "critical"}, {e.PowerFactor < 0.9, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Reactive Power", Value: fmt.Sprintf("%s kVAR", fmtN(math.Round(totalLoad*300), 0))}, {Label: "Steps Active", Value: "4/6"}, {Label: "Target PF", Value: "0.95"}}},
		{ID: "sub-relay", Label: "Protection Relays", Domain: "substation", Icon: "relay", Group: "substation",
			KPIValue: fmt.Sprintf("%d/%d", ss.BreakersClosed, ss.BreakersTotal), KPIUnit: "active",
			Status: calcStatus([]statusRule{{ss.FaultEvents24h > 3, "critical"}, {ss.FaultEvents24h > 0, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Faults (24h)", Value: fmt.Sprintf("%d", ss.FaultEvents24h)}, {Label: "Last Trip", Value: "14d ago"}, {Label: "Auto-reclose", Value: "Armed"}}},
		{ID: "sub-meter", Label: "Metering & Monitor", Domain: "substation", Icon: "metering", Group: "substation",
			KPIValue: fmt.Sprintf("%s%%", fmtN(ss.THD, 1)), KPIUnit: "THD",
			Status: calcStatus([]statusRule{{ss.THD > 8, "critical"}, {ss.THD > 5, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Frequency", Value: fmt.Sprintf("%s Hz", fmtN(ss.Frequency, 2))}, {Label: "Bus Balance", Value: fmt.Sprintf("%s%%", fmtN(ss.BusbarBalance, 1))}, {Label: "Data Points", Value: "1,284/s"}}},

		// ===================== Boiler =====================
		{ID: "boil-store", Label: "Fuel Storage", Domain: "boiler", Icon: "fuelstorage", Group: "boiler",
			KPIValue: fmt.Sprintf("%.0f%%", fuelStorageLevel), KPIUnit: "level",
			Status: calcStatus([]statusRule{{fuelStorageLevel < 20, "critical"}, {fuelStorageLevel < 35, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Volume", Value: "156,000 L"}, {Label: "Days Remaining", Value: "12.4 d"}, {Label: "Last Delivery", Value: "3d ago"}}},
		{ID: "boil-treat", Label: "Fuel Treatment", Domain: "boiler", Icon: "fueltreat", Group: "boiler",
			KPIValue: fmtN(b.TotalFuelRate, 0), KPIUnit: "L/h",
			Status: calcStatus([]statusRule{{b.TotalFuelRate > 600, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Filter ΔP", Value: "0.8 bar"}, {Label: "Viscosity", Value: "12.4 cSt"}, {Label: "Temp Out", Value: "98°C"}}},
		{ID: "boil-comb", Label: "Combustion Chamber", Domain: "boiler", Icon: "combustion", Group: "boiler",
			KPIValue: fmt.Sprintf("%d/%d", b.BoilersOnline, b.BoilersTotal), KPIUnit: "online", Href: "/boiler",
			Status: calcStatus([]statusRule{{b.BoilersOnline < b.BoilersTotal-1, "critical"}, {b.FleetEfficiency < 85, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Efficiency", Value: fmt.Sprintf("%s%%", fmtN(b.FleetEfficiency, 1))}, {Label: "Stack Temp", Value: fmt.Sprintf("%s°C", fmtN(stackTemp, 0))}, {Label: "O₂ Level", Value: fmt.Sprintf("%s%%", fmtN(b.AvgO2, 1))}, {Label: "Firebox Press", Value: "-2.1 mmH₂O"}}},
		{ID: "boil-econ", Label: "Economizer", Domain: "boiler", Icon: "economizer", Group: "boiler",
			KPIValue: fmt.Sprintf("%.1f%%", econRecovery), KPIUnit: "recovery", Status: "normal", Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Inlet Temp", Value: fmt.Sprintf("%s°C", fmtN(stackTemp, 0))}, {Label: "Outlet Temp", Value: fmt.Sprintf("%s°C", fmtN(math.Round(stackTemp*0.72), 0))}, {Label: "Energy Saved", Value: fmt.Sprintf("%.1f kW", econRecovery*8.5)}}},
		{ID: "boil-stack", Label: "Stack & Emissions", Domain: "boiler", Icon: "stack", Group: "boiler",
			KPIValue: fmtN(b.CoEmissions, 0), KPIUnit: "ppm CO",
			Status: calcStatus([]statusRule{{b.CoEmissions > 150, "critical"}, {b.CoEmissions > 100, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "NOx", Value: fmt.Sprintf("%s ppm", fmtN(b.NoxEmissions, 0))}, {Label: "O₂", Value: fmt.Sprintf("%s%%", fmtN(b.AvgO2, 1))}, {Label: "Opacity", Value: "4.2%"}, {Label: "Stack Height", Value: "45 m"}}},
		{ID: "boil-fw", Label: "Feedwater System", Domain: "boiler", Icon: "feedwater", Group: "boiler",
			KPIValue: fmtN(makeupWater, 1), KPIUnit: "m³/h",
			Status: calcStatus([]statusRule{{makeupWater > 5, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Feed Temp", Value: "105°C"}, {Label: "Conductivity", Value: "12 µS/cm"}, {Label: "pH", Value: "9.2"}, {Label: "Deaerator Press", Value: "0.2 bar"}}},

		// ===================== Steam =====================
		{ID: "stm-hp", Label: "HP Steam Header", Domain: "steam", Icon: "hpsteam", Group: "steam",
			KPIValue: fmtN(hpPressure, 1), KPIUnit: "bar", Href: "/steam",
			Status: calcStatus([]statusRule{{hpPressure < 36, "critical"}, {hpPressure < 38, "warning"}}),
			Trend: steamTrend, TrendValue: steamTrendVal,
			KPIs: []models.PipelineKPI{{Label: "Temperature", Value: fmt.Sprintf("%s°C", fmtN(s.SteamTemperature, 0))}, {Label: "Flow", Value: fmt.Sprintf("%s T/h", fmtN(s.TotalProduction, 1))}, {Label: "Quality", Value: "99.5%"}}},
		{ID: "stm-prs", Label: "Pressure Reducing Stn", Domain: "steam", Icon: "prs", Group: "steam",
			KPIValue: fmt.Sprintf("%s→%s", fmtN(hpPressure, 1), fmtN(lpPressure, 1)), KPIUnit: "bar", Status: "normal", Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "ΔP", Value: fmt.Sprintf("%s bar", fmtN(hpPressure-lpPressure, 1))}, {Label: "Valve Position", Value: "62%"}, {Label: "Desuperheat", Value: "Active"}}},
		{ID: "stm-lp", Label: "LP Steam Header", Domain: "steam", Icon: "lpsteam", Group: "steam",
			KPIValue: fmtN(lpPressure, 1), KPIUnit: "bar",
			Status: calcStatus([]statusRule{{lpPressure < 8, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Temperature", Value: fmt.Sprintf("%s°C", fmtN(math.Round(s.SteamTemperature*0.65), 0))}, {Label: "Flow", Value: fmt.Sprintf("%s T/h", fmtN(s.TotalDemand*0.6, 1))}}},
		{ID: "stm-cond", Label: "Condensate Collection", Domain: "steam", Icon: "condensate", Group: "steam",
			KPIValue: fmtN(condensateRate, 1), KPIUnit: "T/h",
			Status: calcStatus([]statusRule{{s.CondensateRecovery < 70, "critical"}, {s.CondensateRecovery < 80, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Recovery Rate", Value: fmt.Sprintf("%.0f%%", s.CondensateRecovery)}, {Label: "Temperature", Value: "85°C"}, {Label: "Flash Steam", Value: fmt.Sprintf("%s T/h", fmtN(condensateRate*0.08, 1))}}},
		{ID: "stm-deaer", Label: "Deaerator", Domain: "steam", Icon: "deaerator", Group: "steam",
			KPIValue: "0.2", KPIUnit: "bar", Status: "normal", Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Temperature", Value: "105°C"}, {Label: "O₂ Content", Value: "< 7 ppb"}, {Label: "Level", Value: "68%"}, {Label: "Vent Rate", Value: "0.3 kg/h"}}},
		{ID: "stm-trace", Label: "Steam Tracing", Domain: "steam", Icon: "steamtrace", Group: "steam",
			KPIValue: func() string {
				if surplusSteam > 0 {
					return fmtN(surplusSteam*0.7, 1)
				}
				return "2.1"
			}(), KPIUnit: "T/h",
			Status: calcStatus([]statusRule{{surplusSteam < 1, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Circuits Active", Value: "34/38"}, {Label: "Avg Pipe Temp", Value: "68°C"}, {Label: "Trap Failures", Value: "2"}}},

		// ===================== Tank Farm =====================
		{ID: "tank-manif", Label: "Receiving Manifold", Domain: "tank", Icon: "manifold", Group: "tank",
			KPIValue: fmtN(t.DailyReceipts, 0), KPIUnit: "bbl/d", Status: "normal", Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Active Lines", Value: "3/4"}, {Label: "Pressure", Value: "4.2 bar"}, {Label: "Pipeline Temp", Value: "52°C"}}},
		{ID: "tank-gauge", Label: "Tank Gauging System", Domain: "tank", Icon: "gauging", Group: "tank",
			KPIValue: fmt.Sprintf("%d/%d", t.TanksInOperation, t.TanksTotal), KPIUnit: "tanks", Href: "/tank",
			Status: calcStatus([]statusRule{{t.ActiveAlarms > 5, "critical"}, {t.ActiveAlarms > 0, "warning"}}),
			Trend: tankTrend, TrendValue: tankTrendVal,
			KPIs: []models.PipelineKPI{{Label: "Total Volume", Value: fmt.Sprintf("%s bbl", fmtN(t.TotalInventory, 0))}, {Label: "Available", Value: fmt.Sprintf("%.0f%%", t.AvailableCapacity)}, {Label: "Radar Gauges", Value: "59/59 online"}, {Label: "Active Alarms", Value: fmt.Sprintf("%d", t.ActiveAlarms)}}},
		{ID: "tank-coils", Label: "Heating Coils", Domain: "tank", Icon: "heatingcoils", Group: "tank",
			KPIValue: fmtN(t.AvgTemperature, 0), KPIUnit: "°C",
			Status: calcStatus([]statusRule{{t.AvgTemperature > 55, "critical"}, {t.AvgTemperature > 45, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Steam Input", Value: func() string {
				if surplusSteam > 0 {
					return fmt.Sprintf("%s T/h", fmtN(surplusSteam*0.7, 1))
				}
				return "2.1 T/h"
			}()}, {Label: "Tanks Heated", Value: "22/59"}, {Label: "ΔT Avg", Value: "+8.3°C"}}},
		{ID: "tank-pump", Label: "Pumping Station", Domain: "tank", Icon: "pumpstation", Group: "tank",
			KPIValue: "8/12", KPIUnit: "running",
			Status: calcStatus([]statusRule{{t.CurrentThroughput > 50000, "warning"}}), Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Total Flow", Value: fmt.Sprintf("%s bbl/d", fmtN(t.CurrentThroughput, 0))}, {Label: "Discharge Press", Value: "6.8 bar"}, {Label: "Power Draw", Value: fmt.Sprintf("%s kW", fmtN(math.Round(demand*0.35), 0))}}},
		{ID: "tank-load", Label: "Loading / Dispatch", Domain: "tank", Icon: "loadingbay", Group: "tank",
			KPIValue: fmtN(t.DailyDispatches, 0), KPIUnit: "bbl/d", Status: "normal", Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "Active Bays", Value: "4/6"}, {Label: "Trucks Today", Value: "38"}, {Label: "Avg Load Time", Value: "42 min"}}},
		{ID: "tank-vru", Label: "Vapor Recovery Unit", Domain: "tank", Icon: "vru", Group: "tank",
			KPIValue: "98.2%", KPIUnit: "efficiency", Status: "normal", Trend: "flat", TrendValue: "0.0%",
			KPIs: []models.PipelineKPI{{Label: "VOC Capture", Value: "2.4 T/d"}, {Label: "Vent Rate", Value: "0.04 T/d"}, {Label: "Compressor", Value: "Running"}}},
	}
	return nodes
}

// ============================================================
// Detailed edges (25+)
// ============================================================

func (svc *PipelineService) buildDetailedEdges(e *models.ElectricityKPIs, ss *models.SubStationKPIs, b *models.BoilerKPIs, s *models.SteamKPIs, t *models.TankKPIs) []models.PipelineEdge {
	surplusSteam := s.TotalProduction - s.TotalDemand
	hpPressure := s.HeaderPressure
	if hpPressure == 0 {
		hpPressure = 42
	}
	lpPressure := hpPressure * 0.28
	condensateRate := s.TotalProduction * (s.CondensateRecovery / 100)

	return []models.PipelineEdge{
		// ========== Electricity internal ==========
		{ID: "d-e1", Source: "elec-grid", Target: "sub-xfmr", Label: "HV Feed", FlowValue: fmt.Sprintf("%s kV", fmtN(ss.IncomingVoltage, 1)), Color: "primary", Animated: true},
		{ID: "d-e1b", Source: "elec-grid", Target: "elec-cost", Label: "Metering", Color: "danger", Dashed: true},
		{ID: "d-e-gen-mcc", Source: "elec-gen", Target: "elec-mcc", Label: "Backup Path", Color: "warning", Dashed: true},
		{ID: "d-e-grid-mcc", Source: "elec-grid", Target: "elec-mcc", Label: "Main Feed", Color: "primary", Animated: true},
		{ID: "d-e-mcc-hvac", Source: "elec-mcc", Target: "elec-hvac", Label: "Aux Load", Color: "secondary", Dashed: true},
		{ID: "d-e-mcc-pumps", Source: "elec-mcc", Target: "elec-pumps", Label: "Motor Feed", Color: "primary", Animated: true},

		// ========== Substation internal ==========
		{ID: "d-e2", Source: "sub-xfmr", Target: "sub-busA", Label: "Bus A", Color: "primary", Animated: true},
		{ID: "d-e2c", Source: "sub-xfmr", Target: "sub-busB", Label: "Bus B", Color: "primary", Animated: true},
		{ID: "d-e-busA-cap", Source: "sub-busA", Target: "sub-cap", Label: "PF Correction", Color: "secondary", Dashed: true},
		{ID: "d-e-busA-relay", Source: "sub-busA", Target: "sub-relay", Label: "Protection", Color: "danger", Dashed: true},
		{ID: "d-e-busB-relay", Source: "sub-busB", Target: "sub-relay", Label: "Protection", Color: "danger", Dashed: true},
		{ID: "d-e-xfmr-meter", Source: "sub-xfmr", Target: "sub-meter", Label: "Monitoring", Color: "secondary", Dashed: true},

		// ========== Boiler ==========
		{ID: "d-e3", Source: "sub-busA", Target: "boil-treat", Label: "Power Supply", Color: "primary", Animated: true},
		{ID: "d-e-store-treat", Source: "boil-store", Target: "boil-treat", Label: "Fuel Supply", FlowValue: fmt.Sprintf("%s L/h", fmtN(b.TotalFuelRate, 0)), Color: "warning", Animated: true},
		{ID: "d-e4", Source: "boil-treat", Target: "boil-comb", Label: "Treated Fuel", Color: "warning", Animated: true},
		{ID: "d-e-comb-econ", Source: "boil-comb", Target: "boil-econ", Label: "Flue Gas", Color: "warning", Animated: true},
		{ID: "d-e-econ-stack", Source: "boil-econ", Target: "boil-stack", Label: "Exhaust", Color: "danger", Dashed: true},
		{ID: "d-e-econ-fw", Source: "boil-econ", Target: "boil-fw", Label: "Heat Recovery", Color: "secondary", Animated: true},
		{ID: "d-e-fw-comb", Source: "boil-fw", Target: "boil-comb", Label: "Feedwater", Color: "secondary", Animated: true},

		// ========== Steam ==========
		{ID: "d-e5", Source: "boil-comb", Target: "stm-hp", Label: "Steam Output", FlowValue: fmt.Sprintf("%s T/h", fmtN(b.TotalSteamOutput, 1)), Color: "warning", Animated: true},
		{ID: "d-e-hp-prs", Source: "stm-hp", Target: "stm-prs", Label: "HP→LP", Color: "secondary", Animated: true},
		{ID: "d-e-prs-lp", Source: "stm-prs", Target: "stm-lp", Label: "Reduced", FlowValue: fmt.Sprintf("%s bar", fmtN(lpPressure, 1)), Color: "secondary", Animated: true},
		{ID: "d-e-lp-trace", Source: "stm-lp", Target: "stm-trace", Label: "Tracing Steam", Color: "secondary", Animated: true},
		{ID: "d-e-lp-cond", Source: "stm-lp", Target: "stm-cond", Label: "Return", Color: "secondary", Dashed: true},
		{ID: "d-e-cond-deaer", Source: "stm-cond", Target: "stm-deaer", Label: "Condensate", FlowValue: fmt.Sprintf("%s T/h", fmtN(condensateRate, 1)), Color: "secondary", Animated: true},
		{ID: "d-e-deaer-fw", Source: "stm-deaer", Target: "boil-fw", Label: "Deaerated Water", Color: "secondary", Animated: true},

		// ========== Cross-domain ==========
		{ID: "d-e-trace-coils", Source: "stm-trace", Target: "tank-coils", Label: "Heating Steam", FlowValue: func() string {
			if surplusSteam > 0 {
				return fmt.Sprintf("%s T/h", fmtN(surplusSteam*0.7, 1))
			}
			return "2.1 T/h"
		}(), Color: "warning", Animated: true},
		{ID: "d-e-pumps-station", Source: "elec-pumps", Target: "tank-pump", Label: "Pump Power", Color: "primary", Dashed: true},
		{ID: "d-e-busB-boil", Source: "sub-busB", Target: "boil-comb", Label: "Aux Power", Color: "primary", Dashed: true},
		{ID: "d-e-hp-direct", Source: "stm-hp", Target: "stm-cond", Label: "HP Consumers", Color: "secondary", Dashed: true},

		// ========== Tank Farm internal ==========
		{ID: "d-e-manif-gauge", Source: "tank-manif", Target: "tank-gauge", Label: "Inflow", FlowValue: fmt.Sprintf("%s bbl/d", fmtN(t.DailyReceipts, 0)), Color: "primary", Animated: true},
		{ID: "d-e-gauge-coils", Source: "tank-gauge", Target: "tank-coils", Label: "Temp Control", Color: "warning", Dashed: true},
		{ID: "d-e-coils-pump", Source: "tank-coils", Target: "tank-pump", Label: "Heated Product", Color: "primary", Animated: true},
		{ID: "d-e-pump-load", Source: "tank-pump", Target: "tank-load", Label: "Dispatch", FlowValue: fmt.Sprintf("%s bbl/d", fmtN(t.DailyDispatches, 0)), Color: "secondary", Animated: true},
		{ID: "d-e-load-vru", Source: "tank-load", Target: "tank-vru", Label: "Vapor Recovery", Color: "danger", Dashed: true},
	}
}
