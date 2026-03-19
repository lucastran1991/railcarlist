package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gorilla/mux"

	"railcarlist/internal/httputil"
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
			httputil.WriteJSONError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if list == nil {
			list = []models.Railcar{}
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]interface{}{"items": list, "total": total})
		return
	}
	// Legacy: no query params — return all
	list, err := h.svc.List()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if list == nil {
		list = []models.Railcar{}
	}
	httputil.WriteJSON(w, http.StatusOK, list)
}

func parseIntParam(s string, defaultVal int) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	if err != nil {
		return defaultVal, err
	}
	return n, nil
}

// parseMultipartFile parses the multipart form and returns the file and filename.
// If useFormFilename is true, filename is taken from form value "filename" first, then header.
func parseMultipartFile(r *http.Request, maxMem int64, formField string, useFormFilename bool) (file io.ReadCloser, filename string, err error) {
	if err = r.ParseMultipartForm(maxMem); err != nil {
		return nil, "", fmt.Errorf("failed to parse multipart form: %w", err)
	}
	file, header, err := r.FormFile(formField)
	if err != nil {
		return nil, "", fmt.Errorf("missing or invalid file (use form field %q)", formField)
	}
	if useFormFilename {
		filename = r.FormValue("filename")
	}
	if filename == "" && header != nil {
		filename = header.Filename
	}
	if filename == "" {
		filename = "unknown.xlsx"
	}
	return file, filename, nil
}

// HandleGet returns one railcar (GET /api/railcars/:id)
func (h *RailcarHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		httputil.WriteJSONError(w, http.StatusBadRequest, "missing id")
		return
	}
	rc, err := h.svc.GetByID(id)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if rc == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, rc)
}

// HandleCreate creates a railcar (POST /api/railcars)
func (h *RailcarHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	var req models.CreateRailcarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteJSONError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	rc, err := h.svc.Create(req)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusCreated, rc)
}

// HandleUpdate updates a railcar (PUT /api/railcars/:id)
func (h *RailcarHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		httputil.WriteJSONError(w, http.StatusBadRequest, "missing id")
		return
	}
	var req models.UpdateRailcarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteJSONError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	rc, err := h.svc.Update(id, req)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if rc == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, rc)
}

// HandleDelete deletes a railcar (DELETE /api/railcars/:id)
func (h *RailcarHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		httputil.WriteJSONError(w, http.StatusBadRequest, "missing id")
		return
	}
	ok, err := h.svc.Delete(id)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, err.Error())
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
		httputil.WriteJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]int64{"deleted": n})
}

// HandleImport parses multipart form file and imports XLSX (POST /api/railcars/import).
// Auto-detects format: Savana (row 0 = "DAILY WORK SCHEDULE...") vs standard (row 0 = name, startTime, endTime).
func (h *RailcarHandler) HandleImport(w http.ResponseWriter, r *http.Request) {
	const maxMem = 10 << 20 // 10 MB
	file, filename, err := parseMultipartFile(r, maxMem, "file", false)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	defer file.Close()
	buf, err := io.ReadAll(file)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusBadRequest, "failed to read file")
		return
	}
	result, err := h.svc.ImportFromXLSXAuto(buf, filename)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, result)
}

// HandleImportSavana parses Savana monthly XLSX (per docs). Expects multipart "file" and optional "filename" (e.g. APRIL 2026.xlsx).
func (h *RailcarHandler) HandleImportSavana(w http.ResponseWriter, r *http.Request) {
	const maxMem = 10 << 20
	file, filename, err := parseMultipartFile(r, maxMem, "file", true)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	defer file.Close()
	result, err := h.svc.ImportFromSavanaXLSX(file, filename)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, result)
}
