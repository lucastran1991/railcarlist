package services

import (
	"encoding/json"
	"fmt"
	"io"
	"time"

	"railcarlist/internal/database"
	"railcarlist/internal/models"
)

type SubStationService struct {
	db *database.DB
}

func NewSubStationService(db *database.DB) *SubStationService {
	return &SubStationService{db: db}
}

// --- KPIs ---

func (s *SubStationService) GetKPIs() (*models.SubStationKPIs, error) {
	return s.db.GetSubStationKPIs()
}

// --- Voltage Profile ---

func (s *SubStationService) ListVoltageProfile(params models.HistoryParams) ([]models.SubStationVoltageProfile, int, error) {
	return s.db.ListSubStationVoltageProfile(params)
}

// --- Transformers ---

func (s *SubStationService) ListTransformers() ([]models.SubStationTransformer, error) {
	return s.db.ListSubStationTransformers()
}

// --- Harmonics ---

func (s *SubStationService) ListHarmonics() ([]models.SubStationHarmonic, error) {
	return s.db.ListSubStationHarmonics()
}

// --- Transformer Temp ---

func (s *SubStationService) ListTransformerTemp(params models.HistoryParams) ([]models.SubStationTransformerTemp, int, error) {
	return s.db.ListSubStationTransformerTemp(params)
}

// --- Feeder Distribution ---

func (s *SubStationService) ListFeederDistribution(params models.HistoryParams) ([]models.SubStationFeederDistribution, int, error) {
	return s.db.ListSubStationFeederDistribution(params)
}

// --- Fault Events ---

func (s *SubStationService) ListFaultEvents() ([]models.SubStationFaultEvent, error) {
	return s.db.ListSubStationFaultEvents()
}

// --- Ingest from JSON feed ---

type subStationFeed struct {
	KPIs                   models.SubStationKPIs                `json:"kpis"`
	VoltageProfile         []models.SubStationVoltageProfile    `json:"voltageProfile"`
	TransformerLoading     []models.SubStationTransformer       `json:"transformerLoading"`
	HarmonicSpectrum       []models.SubStationHarmonic          `json:"harmonicSpectrum"`
	TransformerTemperature []models.SubStationTransformerTemp   `json:"transformerTemperature"`
	FeederDistribution     []models.SubStationFeederDistribution `json:"feederDistribution"`
	FaultEvents            []models.SubStationFaultEvent        `json:"faultEvents"`
}

func (s *SubStationService) IngestFromJSON(r io.Reader) (int, error) {
	var feed subStationFeed
	if err := json.NewDecoder(r).Decode(&feed); err != nil {
		return 0, fmt.Errorf("decode substation feed: %w", err)
	}

	total := 0
	now := time.Now().UnixMilli()

	// KPIs
	if err := s.db.UpsertSubStationKPIs(feed.KPIs); err != nil {
		return total, fmt.Errorf("upsert kpis: %w", err)
	}
	total++

	// Voltage Profile
	if err := s.db.DeleteAllSubStationVoltageProfile(); err != nil {
		return total, fmt.Errorf("clear voltage profile: %w", err)
	}
	for _, item := range feed.VoltageProfile {
		if err := s.db.InsertSubStationVoltageProfile(item, now); err != nil {
			return total, fmt.Errorf("insert voltage profile: %w", err)
		}
		total++
	}

	// Transformers
	if err := s.db.DeleteAllSubStationTransformers(); err != nil {
		return total, fmt.Errorf("clear transformers: %w", err)
	}
	for _, item := range feed.TransformerLoading {
		if err := s.db.InsertSubStationTransformer(item); err != nil {
			return total, fmt.Errorf("insert transformer: %w", err)
		}
		total++
	}

	// Harmonics
	if err := s.db.DeleteAllSubStationHarmonics(); err != nil {
		return total, fmt.Errorf("clear harmonics: %w", err)
	}
	for _, item := range feed.HarmonicSpectrum {
		if err := s.db.InsertSubStationHarmonic(item); err != nil {
			return total, fmt.Errorf("insert harmonic: %w", err)
		}
		total++
	}

	// Transformer Temp
	if err := s.db.DeleteAllSubStationTransformerTemp(); err != nil {
		return total, fmt.Errorf("clear transformer temp: %w", err)
	}
	for _, item := range feed.TransformerTemperature {
		if err := s.db.InsertSubStationTransformerTemp(item, now); err != nil {
			return total, fmt.Errorf("insert transformer temp: %w", err)
		}
		total++
	}

	// Feeder Distribution
	if err := s.db.DeleteAllSubStationFeederDistribution(); err != nil {
		return total, fmt.Errorf("clear feeder distribution: %w", err)
	}
	for _, item := range feed.FeederDistribution {
		if err := s.db.InsertSubStationFeederDistribution(item, now); err != nil {
			return total, fmt.Errorf("insert feeder distribution: %w", err)
		}
		total++
	}

	// Fault Events
	if err := s.db.DeleteAllSubStationFaultEvents(); err != nil {
		return total, fmt.Errorf("clear fault events: %w", err)
	}
	for _, item := range feed.FaultEvents {
		if err := s.db.InsertSubStationFaultEvent(item); err != nil {
			return total, fmt.Errorf("insert fault event: %w", err)
		}
		total++
	}

	return total, nil
}
