package services

import (
	"encoding/json"
	"fmt"
	"io"

	"railcarlist/internal/database"
	"railcarlist/internal/models"
)

type BoilerService struct {
	db *database.DB
}

func NewBoilerService(db *database.DB) *BoilerService {
	return &BoilerService{db: db}
}

// --- KPIs ---

func (s *BoilerService) GetKPIs() (*models.BoilerKPIs, error) {
	return s.db.GetBoilerKPIs()
}

// --- Boiler Readings (comparison) ---

func (s *BoilerService) ListReadings() ([]models.BoilerReading, error) {
	return s.db.ListBoilerReadings()
}

// --- Efficiency Trend ---

func (s *BoilerService) ListEfficiencyTrend() ([]models.BoilerEfficiencyTrend, error) {
	return s.db.ListBoilerEfficiencyTrend()
}

// --- Combustion ---

func (s *BoilerService) ListCombustion() ([]models.BoilerCombustion, error) {
	return s.db.ListBoilerCombustion()
}

// --- Steam vs Fuel ---

func (s *BoilerService) ListSteamFuel() ([]models.BoilerSteamFuel, error) {
	return s.db.ListBoilerSteamFuel()
}

// --- Emissions ---

func (s *BoilerService) ListEmissions() ([]models.BoilerEmission, error) {
	return s.db.ListBoilerEmissions()
}

// --- Stack Temperature ---

func (s *BoilerService) ListStackTemp() ([]models.BoilerStackTemp, error) {
	return s.db.ListBoilerStackTemp()
}

// --- Ingest from JSON feed ---

type boilerFeed struct {
	KPIs               models.BoilerKPIs               `json:"kpis"`
	BoilerComparison   []models.BoilerReading           `json:"boilerComparison"`
	EfficiencyTrend    []models.BoilerEfficiencyTrend   `json:"efficiencyTrend"`
	CombustionAnalysis []models.BoilerCombustion        `json:"combustionAnalysis"`
	SteamVsFuel        []models.BoilerSteamFuel         `json:"steamVsFuel"`
	EmissionsGauges    []models.BoilerEmission           `json:"emissionsGauges"`
	StackTemperature   []models.BoilerStackTemp         `json:"stackTemperature"`
}

func (s *BoilerService) IngestFromJSON(r io.Reader) (int, error) {
	var feed boilerFeed
	if err := json.NewDecoder(r).Decode(&feed); err != nil {
		return 0, fmt.Errorf("decode boiler feed: %w", err)
	}

	total := 0

	// KPIs
	if err := s.db.UpsertBoilerKPIs(feed.KPIs); err != nil {
		return total, fmt.Errorf("upsert kpis: %w", err)
	}
	total++

	// Boiler Readings
	if err := s.db.DeleteAllBoilerReadings(); err != nil {
		return total, fmt.Errorf("clear readings: %w", err)
	}
	for _, item := range feed.BoilerComparison {
		if err := s.db.InsertBoilerReading(item); err != nil {
			return total, fmt.Errorf("insert reading: %w", err)
		}
		total++
	}

	// Efficiency Trend
	if err := s.db.DeleteAllBoilerEfficiencyTrend(); err != nil {
		return total, fmt.Errorf("clear efficiency trend: %w", err)
	}
	for _, item := range feed.EfficiencyTrend {
		if err := s.db.InsertBoilerEfficiencyTrend(item); err != nil {
			return total, fmt.Errorf("insert efficiency trend: %w", err)
		}
		total++
	}

	// Combustion
	if err := s.db.DeleteAllBoilerCombustion(); err != nil {
		return total, fmt.Errorf("clear combustion: %w", err)
	}
	for _, item := range feed.CombustionAnalysis {
		if err := s.db.InsertBoilerCombustion(item); err != nil {
			return total, fmt.Errorf("insert combustion: %w", err)
		}
		total++
	}

	// Steam vs Fuel
	if err := s.db.DeleteAllBoilerSteamFuel(); err != nil {
		return total, fmt.Errorf("clear steam fuel: %w", err)
	}
	for _, item := range feed.SteamVsFuel {
		if err := s.db.InsertBoilerSteamFuel(item); err != nil {
			return total, fmt.Errorf("insert steam fuel: %w", err)
		}
		total++
	}

	// Emissions
	if err := s.db.DeleteAllBoilerEmissions(); err != nil {
		return total, fmt.Errorf("clear emissions: %w", err)
	}
	for _, item := range feed.EmissionsGauges {
		if err := s.db.InsertBoilerEmission(item); err != nil {
			return total, fmt.Errorf("insert emission: %w", err)
		}
		total++
	}

	// Stack Temperature
	if err := s.db.DeleteAllBoilerStackTemp(); err != nil {
		return total, fmt.Errorf("clear stack temp: %w", err)
	}
	for _, item := range feed.StackTemperature {
		if err := s.db.InsertBoilerStackTemp(item); err != nil {
			return total, fmt.Errorf("insert stack temp: %w", err)
		}
		total++
	}

	return total, nil
}
