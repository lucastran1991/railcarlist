package handlers

import (
	"fmt"
	"net/http"

	"railcarlist/internal/httputil"
	"railcarlist/internal/services"
)

// LoadHandler handles POST /api/load requests
type LoadHandler struct {
	loader        *services.Loader
	rawDataFolder string
}

// NewLoadHandler creates a new LoadHandler instance
func NewLoadHandler(loader *services.Loader, rawDataFolder string) *LoadHandler {
	return &LoadHandler{
		loader:        loader,
		rawDataFolder: rawDataFolder,
	}
}

// LoadRequest represents the request body for load endpoint
type LoadRequest struct {
	FilePath string `json:"file_path"`
}

// LoadResponse represents the response from load endpoint
type LoadResponse struct {
	Success    bool   `json:"success"`
	Message    string `json:"message"`
	Count      int    `json:"count,omitempty"`
	FilesCount int    `json:"files_count,omitempty"`
}

// Handle handles the load request
func (h *LoadHandler) Handle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	fmt.Printf("[API] POST /api/load - Loading data from folder: %s\n", h.rawDataFolder)

	// Load all JSON files from configured folder
	count, filesCount, err := h.loader.LoadFromFolder(h.rawDataFolder)
	if err != nil {
		httputil.WriteJSON(w, http.StatusInternalServerError, LoadResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	httputil.WriteJSON(w, http.StatusOK, LoadResponse{
		Success:    true,
		Message:    "Data loaded successfully",
		Count:      count,
		FilesCount: filesCount,
	})
}
