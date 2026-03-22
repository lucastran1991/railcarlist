package handlers

import (
	"net/http"

	"railcarlist/internal/httputil"
	"railcarlist/internal/services"
)

type SubStationHandler struct {
	svc *services.SubStationService
}

func NewSubStationHandler(svc *services.SubStationService) *SubStationHandler {
	return &SubStationHandler{svc: svc}
}

func (h *SubStationHandler) HandleGetKPIs(w http.ResponseWriter, r *http.Request) {
	kpis, err := h.svc.GetKPIs()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to get substation KPIs: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, kpis)
}

func (h *SubStationHandler) HandleGetVoltageProfile(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListVoltageProfile()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list voltage profile: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SubStationHandler) HandleGetTransformers(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListTransformers()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list transformers: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SubStationHandler) HandleGetHarmonics(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListHarmonics()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list harmonics: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SubStationHandler) HandleGetTransformerTemp(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListTransformerTemp()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list transformer temperature: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SubStationHandler) HandleGetFeederDistribution(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListFeederDistribution()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list feeder distribution: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SubStationHandler) HandleGetFaultEvents(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListFaultEvents()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list fault events: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SubStationHandler) HandleIngest(w http.ResponseWriter, r *http.Request) {
	count, err := h.svc.IngestFromJSON(r.Body)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to ingest substation data: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"message": "SubStation data ingested successfully",
		"records": count,
	})
}
