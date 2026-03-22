package handlers

import (
	"net/http"

	"railcarlist/internal/httputil"
	"railcarlist/internal/models"
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
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.ListLoadProfiles(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list load profiles: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.ElectricityLoadProfile{}
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

func (h *ElectricityHandler) HandleGetWeeklyConsumption(w http.ResponseWriter, r *http.Request) {
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.ListWeeklyConsumption(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list weekly consumption: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.ElectricityWeeklyConsumption{}
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

func (h *ElectricityHandler) HandleGetPowerFactor(w http.ResponseWriter, r *http.Request) {
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.ListPowerFactor(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list power factor: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.ElectricityPowerFactor{}
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

func (h *ElectricityHandler) HandleGetCostBreakdown(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListCostBreakdown()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list cost breakdown: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *ElectricityHandler) HandleGetPeakDemand(w http.ResponseWriter, r *http.Request) {
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.ListPeakDemand(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list peak demand: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.ElectricityPeakDemand{}
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

func (h *ElectricityHandler) HandleGetPhaseBalance(w http.ResponseWriter, r *http.Request) {
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.ListPhaseBalance(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list phase balance: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.ElectricityPhaseBalance{}
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
