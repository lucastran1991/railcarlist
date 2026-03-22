package models

type Alert struct {
	ID          int64  `json:"id"`
	Type        string `json:"type"`        // "critical", "warning", "info", "resolved"
	Title       string `json:"title"`
	Description string `json:"description"`
	Source      string `json:"source"`      // "boiler", "tank", "electricity", "steam", "substation"
	SourceID    string `json:"sourceId"`    // "BLR-03", "TK-201", etc.
	Severity    int    `json:"severity"`    // 1=critical, 2=warning, 3=info, 4=resolved
	IsRead      bool   `json:"isRead"`
	CreatedAt   int64  `json:"createdAt"`   // epoch ms
	ResolvedAt  int64  `json:"resolvedAt"`  // epoch ms, 0 if unresolved
}

type AlertKPIs struct {
	Total    int `json:"total"`
	Critical int `json:"critical"`
	Warning  int `json:"warning"`
	Info     int `json:"info"`
	Resolved int `json:"resolved"`
	Unread   int `json:"unread"`
}
