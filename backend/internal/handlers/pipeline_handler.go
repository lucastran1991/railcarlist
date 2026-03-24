package handlers

import (
	"encoding/json"
	"net/http"

	"railcarlist/internal/services"
)

type PipelineHandler struct {
	svc *services.PipelineService
}

func NewPipelineHandler(svc *services.PipelineService) *PipelineHandler {
	return &PipelineHandler{svc: svc}
}

// HandleGetDAG handles GET /api/pipeline/dag?view=overview|detailed
func (h *PipelineHandler) HandleGetDAG(w http.ResponseWriter, r *http.Request) {
	view := r.URL.Query().Get("view")
	if view != "detailed" {
		view = "overview"
	}

	dag, err := h.svc.GetDAG(view)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dag)
}
