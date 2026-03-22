package handlers

import (
	"net/http"

	"railcarlist/internal/httputil"
	"railcarlist/internal/services"
)

type BoilerHandler struct {
	svc *services.BoilerService
}

func NewBoilerHandler(svc *services.BoilerService) *BoilerHandler {
	return &BoilerHandler{svc: svc}
}

func (h *BoilerHandler) HandleGetKPIs(w http.ResponseWriter, r *http.Request) {
	kpis, err := h.svc.GetKPIs()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to get boiler KPIs: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, kpis)
}

func (h *BoilerHandler) HandleGetReadings(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListReadings()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list boiler readings: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *BoilerHandler) HandleGetEfficiencyTrend(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListEfficiencyTrend()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list efficiency trend: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *BoilerHandler) HandleGetCombustion(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListCombustion()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list combustion: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *BoilerHandler) HandleGetSteamFuel(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListSteamFuel()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list steam fuel: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *BoilerHandler) HandleGetEmissions(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListEmissions()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list emissions: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *BoilerHandler) HandleGetStackTemp(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListStackTemp()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list stack temperature: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *BoilerHandler) HandleIngest(w http.ResponseWriter, r *http.Request) {
	count, err := h.svc.IngestFromJSON(r.Body)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to ingest boiler data: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Boiler data ingested successfully",
		"records": count,
	})
}
