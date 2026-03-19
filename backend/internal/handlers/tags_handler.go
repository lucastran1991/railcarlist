package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"railcarlist/internal/httputil"
	"railcarlist/internal/services"
)

// TagsHandler handles GET /api/tags, GET /api/tags/names, DELETE /api/tags?tag=..., POST /api/tags
type TagsHandler struct {
	tagsService *services.TagsService
}

// NewTagsHandler creates a new TagsHandler
func NewTagsHandler(tagsService *services.TagsService) *TagsHandler {
	return &TagsHandler{tagsService: tagsService}
}

// CreateTagRequest is the body for POST /api/tags
type CreateTagRequest struct {
	Tag    string `json:"tag"`
	Source string `json:"source"`
}

// TagsListResponse is the paginated response for GET /api/tags
type TagsListResponse struct {
	Items []services.TagInfo `json:"items"`
	Total int                `json:"total"`
}

// TagsNamesResponse is the response for GET /api/tags/names
type TagsNamesResponse struct {
	Tags []string `json:"tags"`
}

// HandleGet returns a page of tags (GET /api/tags?page=1&limit=9&q=keyword)
func (h *TagsHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	search := strings.TrimSpace(r.URL.Query().Get("q"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 9
	}
	if limit > 100 {
		limit = 100
	}
	items, total, err := h.tagsService.ListTagsPaginated(page, limit, search)
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, TagsListResponse{Items: items, Total: total})
}

// HandleListNames returns all tag names (GET /api/tags/names)
func (h *TagsHandler) HandleListNames(w http.ResponseWriter, r *http.Request) {
	names, err := h.tagsService.ListTagNames()
	if err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, TagsNamesResponse{Tags: names})
}

// HandleDelete deletes a tag (DELETE /api/tags?tag=...)
func (h *TagsHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	tag := strings.TrimSpace(r.URL.Query().Get("tag"))
	if tag == "" {
		httputil.WriteJSONError(w, http.StatusBadRequest, "missing query param: tag")
		return
	}
	if err := h.tagsService.DeleteTagData(tag); err != nil {
		httputil.WriteJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusOK)
}

// HandlePost creates a tag (POST /api/tags)
func (h *TagsHandler) HandlePost(w http.ResponseWriter, r *http.Request) {
	var req CreateTagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteJSONError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	tag := strings.TrimSpace(req.Tag)
	if tag == "" {
		httputil.WriteJSONError(w, http.StatusBadRequest, "tag is required and cannot be empty")
		return
	}
	source := strings.TrimSpace(req.Source)
	if err := h.tagsService.CreateTag(tag, source); err != nil {
		if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "constraint") {
			httputil.WriteJSONError(w, http.StatusConflict, "tag already exists")
			return
		}
		httputil.WriteJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusCreated)
}
