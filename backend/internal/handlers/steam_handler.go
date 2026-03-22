package handlers

import (
	"net/http"

	"railcarlist/internal/httputil"
	"railcarlist/internal/services"
)

type SteamHandler struct {
	svc *services.SteamService
}

func NewSteamHandler(svc *services.SteamService) *SteamHandler {
	return &SteamHandler{svc: svc}
}

func (h *SteamHandler) HandleGetKPIs(w http.ResponseWriter, r *http.Request) {
	kpis, err := h.svc.GetKPIs()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to get steam KPIs: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, kpis)
}

func (h *SteamHandler) HandleGetBalance(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListBalance()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list steam balance: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SteamHandler) HandleGetHeaderPressure(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListHeaderPressure()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list header pressure: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SteamHandler) HandleGetDistribution(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListDistribution()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list steam distribution: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SteamHandler) HandleGetCondensate(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListCondensate()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list condensate: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SteamHandler) HandleGetFuelRatio(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListFuelRatio()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list fuel ratio: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SteamHandler) HandleGetLoss(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListLoss()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list steam loss: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SteamHandler) HandleIngest(w http.ResponseWriter, r *http.Request) {
	count, err := h.svc.IngestFromJSON(r.Body)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to ingest steam data: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Steam data ingested successfully",
		"records": count,
	})
}
