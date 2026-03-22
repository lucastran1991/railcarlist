package handlers

import (
	"net/http"

	"railcarlist/internal/httputil"
	"railcarlist/internal/services"
)

type ElectricityHandler struct {
	svc *services.ElectricityService
}

func NewElectricityHandler(svc *services.ElectricityService) *ElectricityHandler {
	return &ElectricityHandler{svc: svc}
}

func (h *ElectricityHandler) HandleGetKPIs(w http.ResponseWriter, r *http.Request) {
	kpis, err := h.svc.GetKPIs()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to get electricity KPIs: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, kpis)
}

func (h *ElectricityHandler) HandleGetLoadProfiles(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListLoadProfiles()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list load profiles: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *ElectricityHandler) HandleGetWeeklyConsumption(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListWeeklyConsumption()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list weekly consumption: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *ElectricityHandler) HandleGetPowerFactor(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListPowerFactor()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list power factor: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *ElectricityHandler) HandleGetCostBreakdown(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListCostBreakdown()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list cost breakdown: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *ElectricityHandler) HandleGetPeakDemand(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListPeakDemand()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list peak demand: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *ElectricityHandler) HandleGetPhaseBalance(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListPhaseBalance()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list phase balance: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *ElectricityHandler) HandleIngest(w http.ResponseWriter, r *http.Request) {
	count, err := h.svc.IngestFromJSON(r.Body)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to ingest electricity data: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Electricity data ingested successfully",
		"records": count,
	})
}
