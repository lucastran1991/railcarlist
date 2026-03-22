package httputil

import (
	"net/http"
	"strconv"

	"railcarlist/internal/models"
)

// ParseHistoryParams extracts aggregate + pagination params from the request.
func ParseHistoryParams(r *http.Request) models.HistoryParams {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	return models.HistoryParams{
		Start:     q.Get("start"),
		End:       q.Get("end"),
		Aggregate: q.Get("aggregate"),
		Page:      page,
		Limit:     limit,
	}
}
