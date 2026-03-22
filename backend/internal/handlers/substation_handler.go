package handlers

import (
	"net/http"

	"railcarlist/internal/httputil"
	"railcarlist/internal/models"
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
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.ListVoltageProfile(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list voltage profile: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.SubStationVoltageProfile{}
	}
	resp := models.PaginatedResponse{
		Data: data,
		Meta: models.QueryMeta{
			Total:     total,
			Count:     count,
			Start:     params.Start,
			End:       params.End,
			Aggregate: params.Aggregate,
		},
	}
	if params.Page > 0 {
		resp.Meta.Page = params.Page
		resp.Meta.Limit = params.Limit
		if resp.Meta.Limit <= 0 {
			resp.Meta.Limit = 100
		}
	}
	httputil.WriteJSON(w, http.StatusOK, resp)
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
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.ListTransformerTemp(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list transformer temperature: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.SubStationTransformerTemp{}
	}
	resp := models.PaginatedResponse{
		Data: data,
		Meta: models.QueryMeta{
			Total:     total,
			Count:     count,
			Start:     params.Start,
			End:       params.End,
			Aggregate: params.Aggregate,
		},
	}
	if params.Page > 0 {
		resp.Meta.Page = params.Page
		resp.Meta.Limit = params.Limit
		if resp.Meta.Limit <= 0 {
			resp.Meta.Limit = 100
		}
	}
	httputil.WriteJSON(w, http.StatusOK, resp)
}

func (h *SubStationHandler) HandleGetFeederDistribution(w http.ResponseWriter, r *http.Request) {
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.ListFeederDistribution(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list feeder distribution: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.SubStationFeederDistribution{}
	}
	resp := models.PaginatedResponse{
		Data: data,
		Meta: models.QueryMeta{
			Total:     total,
			Count:     count,
			Start:     params.Start,
			End:       params.End,
			Aggregate: params.Aggregate,
		},
	}
	if params.Page > 0 {
		resp.Meta.Page = params.Page
		resp.Meta.Limit = params.Limit
		if resp.Meta.Limit <= 0 {
			resp.Meta.Limit = 100
		}
	}
	httputil.WriteJSON(w, http.StatusOK, resp)
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
