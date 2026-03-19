package handlers

import (
	"encoding/json"
	"net/http"
)

// ConfigHandler handles GET /api/config to expose server config (e.g. value_range, backend_port for frontend).
type ConfigHandler struct {
	minValue    float64
	maxValue    float64
	backendPort string
	apiBaseURL  string
}

// NewConfigHandler creates a new ConfigHandler with value range and optional backend/api URL from config.
func NewConfigHandler(minValue, maxValue float64, backendPort, apiBaseURL string) *ConfigHandler {
	return &ConfigHandler{
		minValue:    minValue,
		maxValue:    maxValue,
		backendPort: backendPort,
		apiBaseURL:  apiBaseURL,
	}
}

// ValueRangeResponse is the JSON shape for value_range.
type ValueRangeResponse struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

// ConfigResponse is the JSON response for GET /api/config.
type ConfigResponse struct {
	ValueRange   ValueRangeResponse `json:"value_range"`
	BackendPort  string             `json:"backend_port,omitempty"`
	ApiBaseURL   string             `json:"api_base_url,omitempty"`
}

// Handle responds with config suitable for frontend (e.g. value_range defaults).
func (h *ConfigHandler) Handle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	resp := ConfigResponse{
		ValueRange:  ValueRangeResponse{Min: h.minValue, Max: h.maxValue},
		BackendPort: h.backendPort,
		ApiBaseURL:  h.apiBaseURL,
	}
	_ = json.NewEncoder(w).Encode(resp)
}
