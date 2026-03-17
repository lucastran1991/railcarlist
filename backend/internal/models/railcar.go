package models

// Railcar represents a single railcar entity (PRD + Savana: id, name, startTime, endTime, optional spot/product/tank)
type Railcar struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	StartTime string  `json:"startTime"` // ISO 8601
	EndTime   string  `json:"endTime"`   // ISO 8601
	Spot      string  `json:"spot,omitempty"`   // STA# / SpotId (e.g. SPOT8)
	Product   string  `json:"product,omitempty"` // Terminal product name
	Tank      string  `json:"tank,omitempty"`   // Tank number
}

// CreateRailcarRequest is the body for POST /api/railcars
type CreateRailcarRequest struct {
	Name      string `json:"name"`
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
	Spot      string `json:"spot,omitempty"`
	Product   string `json:"product,omitempty"`
	Tank      string `json:"tank,omitempty"`
}

// UpdateRailcarRequest is the body for PUT /api/railcars/:id (partial updates allowed)
type UpdateRailcarRequest struct {
	Name      *string `json:"name,omitempty"`
	StartTime *string `json:"startTime,omitempty"`
	EndTime   *string `json:"endTime,omitempty"`
	Spot      *string `json:"spot,omitempty"`
	Product   *string `json:"product,omitempty"`
	Tank      *string `json:"tank,omitempty"`
}
