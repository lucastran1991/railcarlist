package handlers

import (
	"net/http"

	"railcarlist/internal/httputil"
	"railcarlist/internal/models"
	"railcarlist/internal/services"
)

type SteamHandler struct {
	svc *services.SteamService
}

func NewSteamHandler(svc *services.SteamService) *SteamHandler {
	return &SteamHandler{svc: svc}
}

func (h *SteamHandler) HandleGetKPIs(w http.ResponseWriter, r *http.Request) {
	params := httputil.ParseHistoryParams(r)
	kpis, err := h.svc.GetKPIs(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to get steam KPIs: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, kpis)
}

func (h *SteamHandler) HandleGetBalance(w http.ResponseWriter, r *http.Request) {
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.ListBalance(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list steam balance: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.SteamBalance{}
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

func (h *SteamHandler) HandleGetHeaderPressure(w http.ResponseWriter, r *http.Request) {
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.ListHeaderPressure(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list header pressure: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.SteamHeaderPressure{}
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

func (h *SteamHandler) HandleGetDistribution(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListDistribution()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list steam distribution: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, data)
}

func (h *SteamHandler) HandleGetCondensate(w http.ResponseWriter, r *http.Request) {
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.ListCondensate(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list condensate: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.SteamCondensate{}
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

func (h *SteamHandler) HandleGetFuelRatio(w http.ResponseWriter, r *http.Request) {
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.ListFuelRatio(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list fuel ratio: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.SteamFuelRatio{}
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
