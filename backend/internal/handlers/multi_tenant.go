package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"railcarlist/internal/database"
	"railcarlist/internal/services"
)

// MultiTenantHandler resolves the correct DB per request via X-Terminal-Id header
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

// Electricity — wrap any ElectricityHandler method
func (h *MultiTenantHandler) Electricity(method func(*ElectricityHandler, http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		method(NewElectricityHandler(services.NewElectricityService(h.resolveDB(r))), w, r)
	}
}

// SubStation — wrap any SubStationHandler method
func (h *MultiTenantHandler) SubStation(method func(*SubStationHandler, http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		method(NewSubStationHandler(services.NewSubStationService(h.resolveDB(r))), w, r)
	}
}

// Boiler — wrap any BoilerHandler method
func (h *MultiTenantHandler) Boiler(method func(*BoilerHandler, http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		method(NewBoilerHandler(services.NewBoilerService(h.resolveDB(r))), w, r)
	}
}

// Steam — wrap any SteamHandler method
func (h *MultiTenantHandler) Steam(method func(*SteamHandler, http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		method(NewSteamHandler(services.NewSteamService(h.resolveDB(r))), w, r)
	}
}

// Tank — wrap any TankHandler method
func (h *MultiTenantHandler) Tank(method func(*TankHandler, http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		method(NewTankHandler(services.NewTankService(h.resolveDB(r))), w, r)
	}
}

// Alert — wrap any AlertHandler method
func (h *MultiTenantHandler) Alert(method func(*AlertHandler, http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		method(NewAlertHandler(services.NewAlertService(h.resolveDB(r))), w, r)
	}
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

		req := services.GenerateRequest{ClearExisting: true, Seed: seeds[tid]}

		if err := svc.Generate(req, writeEvent); err != nil {
			writeEvent(services.ProgressEvent{Event: "error", Message: fmt.Sprintf("terminal %s: %s", tid, err.Error())})
		}
	}

	writeEvent(services.ProgressEvent{Event: "done", Message: "All terminals generated successfully"})
}
