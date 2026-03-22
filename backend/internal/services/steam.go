package services

import (
	"encoding/json"
	"fmt"
	"io"

	"railcarlist/internal/database"
	"railcarlist/internal/models"
)

type SteamService struct {
	db *database.DB
}

func NewSteamService(db *database.DB) *SteamService {
	return &SteamService{db: db}
}

// --- KPIs ---

func (s *SteamService) GetKPIs() (*models.SteamKPIs, error) {
	return s.db.GetSteamKPIs()
}

// --- Steam Balance ---

func (s *SteamService) ListBalance() ([]models.SteamBalance, error) {
	return s.db.ListSteamBalance()
}

// --- Header Pressure ---

func (s *SteamService) ListHeaderPressure() ([]models.SteamHeaderPressure, error) {
	return s.db.ListSteamHeaderPressure()
}

// --- Distribution ---

func (s *SteamService) ListDistribution() ([]models.SteamDistribution, error) {
	return s.db.ListSteamDistribution()
}

// --- Condensate ---

func (s *SteamService) ListCondensate() ([]models.SteamCondensate, error) {
	return s.db.ListSteamCondensate()
}

// --- Fuel Ratio ---

func (s *SteamService) ListFuelRatio() ([]models.SteamFuelRatio, error) {
	return s.db.ListSteamFuelRatio()
}

// --- Loss ---

func (s *SteamService) ListLoss() ([]models.SteamLoss, error) {
	return s.db.ListSteamLoss()
}

// --- Ingest from JSON feed ---

type steamFeed struct {
	KPIs                  models.SteamKPIs              `json:"kpis"`
	SteamBalance          []models.SteamBalance         `json:"steamBalance"`
	HeaderPressureTrend   []models.SteamHeaderPressure  `json:"headerPressureTrend"`
	SteamDistribution     []models.SteamDistribution    `json:"steamDistribution"`
	CondensateRecoveryTrend []models.SteamCondensate    `json:"condensateRecoveryTrend"`
	FuelVsSteam           []models.SteamFuelRatio       `json:"fuelVsSteam"`
	SteamLoss             []models.SteamLoss            `json:"steamLoss"`
}

func (s *SteamService) IngestFromJSON(r io.Reader) (int, error) {
	var feed steamFeed
	if err := json.NewDecoder(r).Decode(&feed); err != nil {
		return 0, fmt.Errorf("decode steam feed: %w", err)
	}

	total := 0

	// KPIs
	if err := s.db.UpsertSteamKPIs(feed.KPIs); err != nil {
		return total, fmt.Errorf("upsert kpis: %w", err)
	}
	total++

	// Steam Balance
	if err := s.db.DeleteAllSteamBalance(); err != nil {
		return total, fmt.Errorf("clear steam balance: %w", err)
	}
	for _, item := range feed.SteamBalance {
		if err := s.db.InsertSteamBalance(item); err != nil {
			return total, fmt.Errorf("insert steam balance: %w", err)
		}
		total++
	}

	// Header Pressure
	if err := s.db.DeleteAllSteamHeaderPressure(); err != nil {
		return total, fmt.Errorf("clear header pressure: %w", err)
	}
	for _, item := range feed.HeaderPressureTrend {
		if err := s.db.InsertSteamHeaderPressure(item); err != nil {
			return total, fmt.Errorf("insert header pressure: %w", err)
		}
		total++
	}

	// Distribution
	if err := s.db.DeleteAllSteamDistribution(); err != nil {
		return total, fmt.Errorf("clear distribution: %w", err)
	}
	for _, item := range feed.SteamDistribution {
		if err := s.db.InsertSteamDistribution(item); err != nil {
			return total, fmt.Errorf("insert distribution: %w", err)
		}
		total++
	}

	// Condensate
	if err := s.db.DeleteAllSteamCondensate(); err != nil {
		return total, fmt.Errorf("clear condensate: %w", err)
	}
	for _, item := range feed.CondensateRecoveryTrend {
		if err := s.db.InsertSteamCondensate(item); err != nil {
			return total, fmt.Errorf("insert condensate: %w", err)
		}
		total++
	}

	// Fuel Ratio
	if err := s.db.DeleteAllSteamFuelRatio(); err != nil {
		return total, fmt.Errorf("clear fuel ratio: %w", err)
	}
	for _, item := range feed.FuelVsSteam {
		if err := s.db.InsertSteamFuelRatio(item); err != nil {
			return total, fmt.Errorf("insert fuel ratio: %w", err)
		}
		total++
	}

	// Loss
	if err := s.db.DeleteAllSteamLoss(); err != nil {
		return total, fmt.Errorf("clear loss: %w", err)
	}
	for _, item := range feed.SteamLoss {
		if err := s.db.InsertSteamLoss(item); err != nil {
			return total, fmt.Errorf("insert loss: %w", err)
		}
		total++
	}

	return total, nil
}
