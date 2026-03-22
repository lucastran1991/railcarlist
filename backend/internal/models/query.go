package models

// HistoryParams holds query parameters for aggregate + pagination on history endpoints.
type HistoryParams struct {
	Start     string // ISO 8601 start time (optional)
	End       string // ISO 8601 end time (optional)
	Aggregate string // raw, hourly, daily, weekly, monthly (default: raw)
	Page      int    // 1-based page number (0 or omitted = no pagination, return all)
	Limit     int    // records per page (default: 100 when paginated)
}

// PaginatedResponse wraps any list response with pagination + aggregate metadata.
type PaginatedResponse struct {
	Data  interface{} `json:"data"`
	Meta  QueryMeta   `json:"meta"`
}

// QueryMeta holds metadata about the query results.
type QueryMeta struct {
	Total     int    `json:"total"`
	Page      int    `json:"page,omitempty"`
	Limit     int    `json:"limit,omitempty"`
	Count     int    `json:"count"`
	Start     string `json:"start,omitempty"`
	End       string `json:"end,omitempty"`
	Aggregate string `json:"aggregate,omitempty"`
}
