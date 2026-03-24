package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"railcarlist/internal/database"
	"railcarlist/internal/services"
)

// MultiTenantHandler wraps all domain handlers, resolving the correct DB per request
type MultiTenantHandler struct {
	mgr *database.DBManager
}

func NewMultiTenantHandler(mgr *database.DBManager) *MultiTenantHandler {
	return &MultiTenantHandler{mgr: mgr}
}

func (h *MultiTenantHandler) resolveDB(r *http.Request) *database.DB {
	tid := database.ParseTerminalID(r.Header.Get("X-Terminal-Id"))
	return h.mgr.Get(tid)
}

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, err error, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
}

// Electricity KPIs
func (h *MultiTenantHandler) ElectricityKPIs(w http.ResponseWriter, r *http.Request) {
	db := h.resolveDB(r)
	svc := services.NewElectricityService(db)
	handler := NewElectricityHandler(svc)
	handler.HandleGetKPIs(w, r)
}

// SubStation KPIs
func (h *MultiTenantHandler) SubStationKPIs(w http.ResponseWriter, r *http.Request) {
	db := h.resolveDB(r)
	svc := services.NewSubStationService(db)
	handler := NewSubStationHandler(svc)
	handler.HandleGetKPIs(w, r)
}

// Boiler KPIs
func (h *MultiTenantHandler) BoilerKPIs(w http.ResponseWriter, r *http.Request) {
	db := h.resolveDB(r)
	svc := services.NewBoilerService(db)
	handler := NewBoilerHandler(svc)
	handler.HandleGetKPIs(w, r)
}

// Steam KPIs
func (h *MultiTenantHandler) SteamKPIs(w http.ResponseWriter, r *http.Request) {
	db := h.resolveDB(r)
	svc := services.NewSteamService(db)
	handler := NewSteamHandler(svc)
	handler.HandleGetKPIs(w, r)
}

// Tank KPIs
func (h *MultiTenantHandler) TankKPIs(w http.ResponseWriter, r *http.Request) {
	db := h.resolveDB(r)
	svc := services.NewTankService(db)
	handler := NewTankHandler(svc)
	handler.HandleGetKPIs(w, r)
}

// Tank Levels
func (h *MultiTenantHandler) TankLevels(w http.ResponseWriter, r *http.Request) {
	db := h.resolveDB(r)
	svc := services.NewTankService(db)
	handler := NewTankHandler(svc)
	handler.HandleGetLevels(w, r)
}

// Alerts
func (h *MultiTenantHandler) Alerts(w http.ResponseWriter, r *http.Request) {
	db := h.resolveDB(r)
	svc := services.NewAlertService(db)
	handler := NewAlertHandler(svc)
	handler.HandleList(w, r)
}

// Alert KPIs
func (h *MultiTenantHandler) AlertKPIs(w http.ResponseWriter, r *http.Request) {
	db := h.resolveDB(r)
	svc := services.NewAlertService(db)
	handler := NewAlertHandler(svc)
	handler.HandleGetKPIs(w, r)
}

// Pipeline DAG
func (h *MultiTenantHandler) PipelineDAG(w http.ResponseWriter, r *http.Request) {
	db := h.resolveDB(r)
	svc := services.NewPipelineService(db)
	handler := NewPipelineHandler(svc)
	handler.HandleGetDAG(w, r)
}

// GenerateAll generates data for all terminals
func (h *MultiTenantHandler) GenerateAll(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/x-ndjson")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	flusher, _ := w.(http.Flusher)

	writeEvent := func(evt services.ProgressEvent) {
		data, _ := json.Marshal(evt)
		fmt.Fprintf(w, "%s\n", data)
		if flusher != nil {
			flusher.Flush()
		}
	}

	seeds := map[string]int64{
		"savannah":    42,
		"los-angeles": 137,
		"tarragona":   256,
	}

	for _, tid := range database.Terminals {
		db := h.mgr.Get(tid)
		svc := services.NewSystemGeneratorService(db)

		writeEvent(services.ProgressEvent{Event: "progress", Message: fmt.Sprintf("=== Generating data for terminal: %s ===", tid)})

		var req services.GenerateRequest
		if r.Body != nil {
			json.NewDecoder(r.Body).Decode(&req)
		}
		if req.StartDate == "" {
			req.ClearExisting = true
		}
		req.Seed = seeds[tid]

		if err := svc.Generate(req, writeEvent); err != nil {
			writeEvent(services.ProgressEvent{Event: "error", Message: fmt.Sprintf("terminal %s: %s", tid, err.Error())})
		}
	}

	writeEvent(services.ProgressEvent{Event: "done", Message: "All terminals generated successfully"})
}
