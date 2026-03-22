package services

import (
	"encoding/json"
	"fmt"
	"io"

	"railcarlist/internal/database"
	"railcarlist/internal/models"
)

type ElectricityService struct {
	db *database.DB
}

func NewElectricityService(db *database.DB) *ElectricityService {
	return &ElectricityService{db: db}
}

// --- KPIs ---

func (s *ElectricityService) GetKPIs() (*models.ElectricityKPIs, error) {
	return s.db.GetElectricityKPIs()
}

// --- Load Profiles ---

func (s *ElectricityService) ListLoadProfiles() ([]models.ElectricityLoadProfile, error) {
	return s.db.ListElectricityLoadProfiles()
}

// --- Weekly Consumption ---

func (s *ElectricityService) ListWeeklyConsumption() ([]models.ElectricityWeeklyConsumption, error) {
	return s.db.ListElectricityWeeklyConsumption()
}

// --- Power Factor ---

func (s *ElectricityService) ListPowerFactor() ([]models.ElectricityPowerFactor, error) {
	return s.db.ListElectricityPowerFactor()
}

// --- Cost Breakdown ---

func (s *ElectricityService) ListCostBreakdown() ([]models.ElectricityCostBreakdown, error) {
	return s.db.ListElectricityCostBreakdown()
}

// --- Peak Demand ---

func (s *ElectricityService) ListPeakDemand() ([]models.ElectricityPeakDemand, error) {
	return s.db.ListElectricityPeakDemand()
}

// --- Phase Balance ---

func (s *ElectricityService) ListPhaseBalance() ([]models.ElectricityPhaseBalance, error) {
	return s.db.ListElectricityPhaseBalance()
}

// --- Ingest from JSON feed ---

type electricityFeed struct {
	KPIs              models.ElectricityKPIs                `json:"kpis"`
	LoadProfile       []models.ElectricityLoadProfile       `json:"loadProfile"`
	WeeklyConsumption []models.ElectricityWeeklyConsumption `json:"weeklyConsumption"`
	PowerFactorTrend  []models.ElectricityPowerFactor       `json:"powerFactorTrend"`
	CostBreakdown     []models.ElectricityCostBreakdown     `json:"costBreakdown"`
	PeakDemandHistory []models.ElectricityPeakDemand        `json:"peakDemandHistory"`
	PhaseBalance      []models.ElectricityPhaseBalance      `json:"phaseBalance"`
}

func (s *ElectricityService) IngestFromJSON(r io.Reader) (int, error) {
	var feed electricityFeed
	if err := json.NewDecoder(r).Decode(&feed); err != nil {
		return 0, fmt.Errorf("decode electricity feed: %w", err)
	}

	total := 0

	// KPIs
	if err := s.db.UpsertElectricityKPIs(feed.KPIs); err != nil {
		return total, fmt.Errorf("upsert kpis: %w", err)
	}
	total++

	// Load profiles
	if err := s.db.DeleteAllElectricityLoadProfiles(); err != nil {
		return total, fmt.Errorf("clear load profiles: %w", err)
	}
	for _, lp := range feed.LoadProfile {
		if err := s.db.InsertElectricityLoadProfile(lp); err != nil {
			return total, fmt.Errorf("insert load profile: %w", err)
		}
		total++
	}

	// Weekly consumption
	if err := s.db.DeleteAllElectricityWeeklyConsumption(); err != nil {
		return total, fmt.Errorf("clear weekly: %w", err)
	}
	for _, wc := range feed.WeeklyConsumption {
		if err := s.db.InsertElectricityWeeklyConsumption(wc); err != nil {
			return total, fmt.Errorf("insert weekly: %w", err)
		}
		total++
	}

	// Power factor
	if err := s.db.DeleteAllElectricityPowerFactor(); err != nil {
		return total, fmt.Errorf("clear power factor: %w", err)
	}
	for _, pf := range feed.PowerFactorTrend {
		if err := s.db.InsertElectricityPowerFactor(pf); err != nil {
			return total, fmt.Errorf("insert power factor: %w", err)
		}
		total++
	}

	// Cost breakdown
	if err := s.db.DeleteAllElectricityCostBreakdown(); err != nil {
		return total, fmt.Errorf("clear cost: %w", err)
	}
	for _, cb := range feed.CostBreakdown {
		if err := s.db.InsertElectricityCostBreakdown(cb); err != nil {
			return total, fmt.Errorf("insert cost: %w", err)
		}
		total++
	}

	// Peak demand
	if err := s.db.DeleteAllElectricityPeakDemand(); err != nil {
		return total, fmt.Errorf("clear peak: %w", err)
	}
	for _, pd := range feed.PeakDemandHistory {
		if err := s.db.InsertElectricityPeakDemand(pd); err != nil {
			return total, fmt.Errorf("insert peak: %w", err)
		}
		total++
	}

	// Phase balance
	if err := s.db.DeleteAllElectricityPhaseBalance(); err != nil {
		return total, fmt.Errorf("clear phase: %w", err)
	}
	for _, pb := range feed.PhaseBalance {
		if err := s.db.InsertElectricityPhaseBalance(pb); err != nil {
			return total, fmt.Errorf("insert phase: %w", err)
		}
		total++
	}

	return total, nil
}
