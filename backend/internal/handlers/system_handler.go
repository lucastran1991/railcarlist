package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"railcarlist/internal/services"
)

type SystemHandler struct {
	svc *services.SystemGeneratorService
}

func NewSystemHandler(svc *services.SystemGeneratorService) *SystemHandler {
	return &SystemHandler{svc: svc}
}

func (h *SystemHandler) HandleGenerate(w http.ResponseWriter, r *http.Request) {
	var req services.GenerateRequest
	if r.Body != nil {
		json.NewDecoder(r.Body).Decode(&req)
	}
	if req.ClearExisting == false && req.StartDate == "" {
		req.ClearExisting = true // default: clear and regenerate
	}

	w.Header().Set("Content-Type", "application/x-ndjson")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	flusher, _ := w.(http.Flusher)

	writeEvent := func(evt services.ProgressEvent) {
		data, _ := json.Marshal(evt)
		fmt.Fprintf(w, "%s\n", data)
		if flusher != nil {
			flusher.Flush()
		}
	}

	if err := h.svc.Generate(req, writeEvent); err != nil {
		writeEvent(services.ProgressEvent{Event: "error", Message: err.Error()})
	}
}
