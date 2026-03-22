package handlers

import (
	"net/http"

	"railcarlist/internal/httputil"
	"railcarlist/internal/services"
)

type TankHandler struct {
	svc *services.TankService
}

func NewTankHandler(svc *services.TankService) *TankHandler {
	return &TankHandler{svc: svc}
}

func (h *TankHandler) HandleGetKPIs(w http.ResponseWriter, r *http.Request) {
	kpis, err := h.svc.GetKPIs()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to get tank KPIs: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, kpis)
}

func (h *TankHandler) HandleGetLevels(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListLevels()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list tank levels: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *TankHandler) HandleGetInventoryTrend(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListInventoryTrend()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list inventory trend: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *TankHandler) HandleGetThroughput(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListThroughput()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list throughput: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *TankHandler) HandleGetProductDistribution(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListProductDistribution()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list product distribution: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *TankHandler) HandleGetLevelChanges(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListLevelChanges()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list level changes: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *TankHandler) HandleGetTemperatures(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListTemperatures()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list temperatures: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *TankHandler) HandleIngest(w http.ResponseWriter, r *http.Request) {
	count, err := h.svc.IngestFromJSON(r.Body)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to ingest tank data: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Tank data ingested successfully",
		"records": count,
	})
}
