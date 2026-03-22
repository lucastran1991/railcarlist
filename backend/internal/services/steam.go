package services

import (
	"encoding/json"
	"fmt"
	"io"
	"time"

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

func (s *SteamService) GetKPIs(params models.HistoryParams) (*models.SteamKPIs, error) {
	return s.db.ComputeSteamKPIs(params)
}

// --- Steam Balance ---

func (s *SteamService) ListBalance(params models.HistoryParams) ([]models.SteamBalance, int, error) {
	return s.db.ListSteamBalance(params)
}

// --- Header Pressure ---

func (s *SteamService) ListHeaderPressure(params models.HistoryParams) ([]models.SteamHeaderPressure, int, error) {
	return s.db.ListSteamHeaderPressure(params)
}

// --- Distribution ---

func (s *SteamService) ListDistribution() ([]models.SteamDistribution, error) {
	return s.db.ListSteamDistribution()
}

// --- Condensate ---

func (s *SteamService) ListCondensate(params models.HistoryParams) ([]models.SteamCondensate, int, error) {
	return s.db.ListSteamCondensate(params)
}

// --- Fuel Ratio ---

func (s *SteamService) ListFuelRatio(params models.HistoryParams) ([]models.SteamFuelRatio, int, error) {
	return s.db.ListSteamFuelRatio(params)
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
	now := time.Now().UnixMilli()

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
		if err := s.db.InsertSteamBalance(item, now); err != nil {
			return total, fmt.Errorf("insert steam balance: %w", err)
		}
		total++
	}

	// Header Pressure
	if err := s.db.DeleteAllSteamHeaderPressure(); err != nil {
		return total, fmt.Errorf("clear header pressure: %w", err)
	}
	for _, item := range feed.HeaderPressureTrend {
		if err := s.db.InsertSteamHeaderPressure(item, now); err != nil {
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
		if err := s.db.InsertSteamCondensate(item, now); err != nil {
			return total, fmt.Errorf("insert condensate: %w", err)
		}
		total++
	}

	// Fuel Ratio
	if err := s.db.DeleteAllSteamFuelRatio(); err != nil {
		return total, fmt.Errorf("clear fuel ratio: %w", err)
	}
	for _, item := range feed.FuelVsSteam {
		if err := s.db.InsertSteamFuelRatio(item, now); err != nil {
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
