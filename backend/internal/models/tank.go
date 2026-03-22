package models

type TankUnit struct {
	ID       int64   `json:"id"`
	TankID   string  `json:"tank"`
	Product  string  `json:"product"`
	Capacity float64 `json:"capacity"`
	Color    string  `json:"color"`
}

type TankLevel struct {
	ID       int64   `json:"id"`
	TankID   string  `json:"tank"`
	Product  string  `json:"product"`
	Level    float64 `json:"level"`
	Volume   float64 `json:"volume"`
	Capacity float64 `json:"capacity"`
	Color    string  `json:"color"`
}

type TankInventoryTrend struct {
	ID       int64   `json:"id"`
	Date     string  `json:"date"`
	Gasoline float64 `json:"gasoline"`
	Diesel   float64 `json:"diesel"`
	Crude    float64 `json:"crude"`
	Ethanol  float64 `json:"ethanol"`
}

type TankThroughput struct {
	ID         int64   `json:"id"`
	Date       string  `json:"date"`
	Receipts   float64 `json:"receipts"`
	Dispatches float64 `json:"dispatches"`
}

type TankProductDistribution struct {
	ID      int64   `json:"id"`
	Product string  `json:"product"`
	Volume  float64 `json:"volume"`
	Color   string  `json:"color"`
}

type TankLevelChange struct {
	ID     int64   `json:"id"`
	TankID string  `json:"tank"`
	Change float64 `json:"change"`
}

type TankTemperature struct {
	ID     int64   `json:"id"`
	TankID string  `json:"tank"`
	T00    float64 `json:"t00"`
	T06    float64 `json:"t06"`
	T12    float64 `json:"t12"`
	T18    float64 `json:"t18"`
}

type TankKPIs struct {
	TotalInventory    float64 `json:"totalInventory"`
	AvailableCapacity float64 `json:"availableCapacity"`
	TanksInOperation  int     `json:"tanksInOperation"`
	TanksTotal        int     `json:"tanksTotal"`
	CurrentThroughput float64 `json:"currentThroughput"`
	AvgTemperature    float64 `json:"avgTemperature"`
	ActiveAlarms      int     `json:"activeAlarms"`
	DailyReceipts     float64 `json:"dailyReceipts"`
	DailyDispatches   float64 `json:"dailyDispatches"`
}
