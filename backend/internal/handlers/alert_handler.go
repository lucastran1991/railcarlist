package handlers

import (
	"net/http"

	"railcarlist/internal/httputil"
	"railcarlist/internal/models"
	"railcarlist/internal/services"
)

type AlertHandler struct {
	svc *services.AlertService
}

func NewAlertHandler(svc *services.AlertService) *AlertHandler {
	return &AlertHandler{svc: svc}
}

func (h *AlertHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	params := httputil.ParseHistoryParams(r)
	data, total, err := h.svc.List(params)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to list alerts: "+err.Error())
		return
	}
	count := len(data)
	if data == nil {
		data = []models.Alert{}
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

func (h *AlertHandler) HandleGetKPIs(w http.ResponseWriter, r *http.Request) {
	kpis, err := h.svc.GetKPIs()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, "Failed to get alert KPIs: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, kpis)
}
