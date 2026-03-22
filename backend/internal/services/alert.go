package services

import (
	"railcarlist/internal/database"
	"railcarlist/internal/models"
)

type AlertService struct {
	db *database.DB
}

func NewAlertService(db *database.DB) *AlertService {
	return &AlertService{db: db}
}

func (s *AlertService) List(params models.HistoryParams) ([]models.Alert, int, error) {
	return s.db.ListAlerts(params)
}

func (s *AlertService) GetKPIs() (*models.AlertKPIs, error) {
	return s.db.GetAlertKPIs()
}
