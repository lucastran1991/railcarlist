package services

import (
	"encoding/json"
	"fmt"
	"io"
	"time"

	"railcarlist/internal/database"
	"railcarlist/internal/models"
)

type TankService struct {
	db *database.DB
}

func NewTankService(db *database.DB) *TankService {
	return &TankService{db: db}
}

// --- KPIs ---

func (s *TankService) GetKPIs(params models.HistoryParams) (*models.TankKPIs, error) {
	return s.db.ComputeTankKPIs(params)
}

// --- Tank Levels ---

func (s *TankService) ListLevels() ([]models.TankLevel, error) {
	return s.db.ListTankLevels()
}

// --- Inventory Trend ---

func (s *TankService) ListInventoryTrend(params models.HistoryParams) ([]models.TankInventoryTrend, int, error) {
	return s.db.ListTankInventoryTrend(params)
}

// --- Throughput ---

func (s *TankService) ListThroughput(params models.HistoryParams) ([]models.TankThroughput, int, error) {
	return s.db.ListTankThroughput(params)
}

// --- Product Distribution ---

func (s *TankService) ListProductDistribution() ([]models.TankProductDistribution, error) {
	return s.db.ListTankProductDistribution()
}

// --- Level Changes ---

func (s *TankService) ListLevelChanges() ([]models.TankLevelChange, error) {
	return s.db.ListTankLevelChanges()
}

// --- Temperatures ---

func (s *TankService) ListTemperatures() ([]models.TankTemperature, error) {
	return s.db.ListTankTemperatures()
}

// --- Ingest from JSON feed ---

type tankFeed struct {
	KPIs                models.TankKPIs                `json:"kpis"`
	TankLevels          []models.TankLevel             `json:"tankLevels"`
	InventoryTrend      []models.TankInventoryTrend    `json:"inventoryTrend"`
	Throughput          []models.TankThroughput        `json:"throughput"`
	ProductDistribution []models.TankProductDistribution `json:"productDistribution"`
	TankLevelChanges    []models.TankLevelChange       `json:"tankLevelChanges"`
	TankTemperatures    []models.TankTemperature       `json:"tankTemperatures"`
}

func (s *TankService) IngestFromJSON(r io.Reader) (int, error) {
	var feed tankFeed
	if err := json.NewDecoder(r).Decode(&feed); err != nil {
		return 0, fmt.Errorf("decode tank feed: %w", err)
	}

	total := 0
	now := time.Now().UnixMilli()

	// KPIs
	if err := s.db.UpsertTankKPIs(feed.KPIs); err != nil {
		return total, fmt.Errorf("upsert kpis: %w", err)
	}
	total++

	// Tank Levels
	if err := s.db.DeleteAllTankLevels(); err != nil {
		return total, fmt.Errorf("clear tank levels: %w", err)
	}
	for _, item := range feed.TankLevels {
		if err := s.db.InsertTankLevel(item); err != nil {
			return total, fmt.Errorf("insert tank level: %w", err)
		}
		total++
	}

	// Inventory Trend
	if err := s.db.DeleteAllTankInventoryTrend(); err != nil {
		return total, fmt.Errorf("clear inventory trend: %w", err)
	}
	for _, item := range feed.InventoryTrend {
		if err := s.db.InsertTankInventoryTrend(item, now); err != nil {
			return total, fmt.Errorf("insert inventory trend: %w", err)
		}
		total++
	}

	// Throughput
	if err := s.db.DeleteAllTankThroughput(); err != nil {
		return total, fmt.Errorf("clear throughput: %w", err)
	}
	for _, item := range feed.Throughput {
		if err := s.db.InsertTankThroughput(item, now); err != nil {
			return total, fmt.Errorf("insert throughput: %w", err)
		}
		total++
	}

	// Product Distribution
	if err := s.db.DeleteAllTankProductDistribution(); err != nil {
		return total, fmt.Errorf("clear product distribution: %w", err)
	}
	for _, item := range feed.ProductDistribution {
		if err := s.db.InsertTankProductDistribution(item); err != nil {
			return total, fmt.Errorf("insert product distribution: %w", err)
		}
		total++
	}

	// Level Changes
	if err := s.db.DeleteAllTankLevelChanges(); err != nil {
		return total, fmt.Errorf("clear level changes: %w", err)
	}
	for _, item := range feed.TankLevelChanges {
		if err := s.db.InsertTankLevelChange(item); err != nil {
			return total, fmt.Errorf("insert level change: %w", err)
		}
		total++
	}

	// Temperatures
	if err := s.db.DeleteAllTankTemperatures(); err != nil {
		return total, fmt.Errorf("clear temperatures: %w", err)
	}
	for _, item := range feed.TankTemperatures {
		if err := s.db.InsertTankTemperature(item); err != nil {
			return total, fmt.Errorf("insert temperature: %w", err)
		}
		total++
	}

	return total, nil
}
