package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gorilla/mux"

	"railcarlist/internal/models"
	"railcarlist/internal/services"
)

// RailcarHandler handles /api/railcars CRUD and /api/railcars/import
type RailcarHandler struct {
	svc *services.RailcarService
}

// NewRailcarHandler creates a new RailcarHandler
func NewRailcarHandler(svc *services.RailcarService) *RailcarHandler {
	return &RailcarHandler{svc: svc}
}

// HandleList returns railcars (GET /api/railcars). Supports ?page=1&limit=5&sort=startTime for pagination (default limit 5, sort startTime).
func (h *RailcarHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	pageStr := q.Get("page")
	limitStr := q.Get("limit")
	sortStr := q.Get("sort")
	if pageStr != "" || limitStr != "" {
		// Paginated response
		page, limit := 1, 5
		if pageStr != "" {
			if p, err := parseIntParam(pageStr, 1); err == nil && p >= 1 {
				page = p
			}
		}
		if limitStr != "" {
			if l, err := parseIntParam(limitStr, 5); err == nil && l >= 1 && l <= 100 {
				limit = l
			}
		}
		if sortStr == "" {
			sortStr = "startTime"
		}
		list, total, err := h.svc.ListPaginated(page, limit, sortStr)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		if list == nil {
			list = []models.Railcar{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"items": list, "total": total})
		return
	}
	// Legacy: no query params — return all
	list, err := h.svc.List()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	if list == nil {
		list = []models.Railcar{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func parseIntParam(s string, defaultVal int) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	if err != nil {
		return defaultVal, err
	}
	return n, nil
}

// HandleGet returns one railcar (GET /api/railcars/:id)
func (h *RailcarHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	rc, err := h.svc.GetByID(id)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	if rc == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rc)
}

// HandleCreate creates a railcar (POST /api/railcars)
func (h *RailcarHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	var req models.CreateRailcarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid JSON"})
		return
	}
	rc, err := h.svc.Create(req)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(rc)
}

// HandleUpdate updates a railcar (PUT /api/railcars/:id)
func (h *RailcarHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	var req models.UpdateRailcarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid JSON"})
		return
	}
	rc, err := h.svc.Update(id, req)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	if rc == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rc)
}

// HandleDelete deletes a railcar (DELETE /api/railcars/:id)
func (h *RailcarHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	ok, err := h.svc.Delete(id)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	if !ok {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandleDeleteAll deletes all railcars (DELETE /api/railcars/all). Returns JSON { "deleted": n }.
func (h *RailcarHandler) HandleDeleteAll(w http.ResponseWriter, r *http.Request) {
	n, err := h.svc.DeleteAll()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]int64{"deleted": n})
}

// HandleImport parses multipart form file and imports XLSX (POST /api/railcars/import).
// Auto-detects format: Savana (row 0 = "DAILY WORK SCHEDULE...") vs standard (row 0 = name, startTime, endTime).
func (h *RailcarHandler) HandleImport(w http.ResponseWriter, r *http.Request) {
	const maxMem = 10 << 20 // 10 MB
	if err := r.ParseMultipartForm(maxMem); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "failed to parse multipart form"})
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "missing or invalid file (use form field 'file')"})
		return
	}
	defer file.Close()
	filename := ""
	if header != nil {
		filename = header.Filename
	}
	if filename == "" {
		filename = "unknown.xlsx"
	}

	buf, err := io.ReadAll(file)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "failed to read file"})
		return
	}

	result, err := h.svc.ImportFromXLSXAuto(buf, filename)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// HandleImportSavana parses Savana monthly XLSX (per docs). Expects multipart "file" and optional "filename" (e.g. APRIL 2026.xlsx).
func (h *RailcarHandler) HandleImportSavana(w http.ResponseWriter, r *http.Request) {
	const maxMem = 10 << 20
	if err := r.ParseMultipartForm(maxMem); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "failed to parse multipart form"})
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "missing or invalid file (use form field 'file')"})
		return
	}
	defer file.Close()
	filename := r.FormValue("filename")
	if filename == "" && header != nil {
		filename = header.Filename
	}
	if filename == "" {
		filename = "unknown.xlsx"
	}
	result, err := h.svc.ImportFromSavanaXLSX(file, filename)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}
