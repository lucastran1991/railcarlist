package database

import (
	"database/sql"
	"fmt"
	"strings"

	_ "github.com/mattn/go-sqlite3"

	"railcarlist/internal/models"
)

// DB wraps the database connection
type DB struct {
	conn *sql.DB
}

// NewDB creates a new database connection and runs migrations
func NewDB(dbPath string) (*DB, error) {
	conn, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db := &DB{conn: conn}

	if err := db.migrate(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return db, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.conn.Close()
}

// GetConn returns the underlying database connection
func (db *DB) GetConn() *sql.DB {
	return db.conn
}

// DeleteAllRecords deletes all records from railcarlist_raws table
func (db *DB) DeleteAllRecords() error {
	_, err := db.conn.Exec("DELETE FROM railcarlist_raws")
	if err != nil {
		return fmt.Errorf("failed to delete all records: %w", err)
	}
	return nil
}

// DeleteTagRecords deletes all records for a specific tag
func (db *DB) DeleteTagRecords(tag string) error {
	_, err := db.conn.Exec("DELETE FROM railcarlist_raws WHERE tag = ?", tag)
	if err != nil {
		return fmt.Errorf("failed to delete records for tag %s: %w", tag, err)
	}
	return nil
}

// TagStats holds per-tag aggregate stats from the database
type TagStats struct {
	Tag   string
	Count int
	MinTs int64
	MaxTs int64
}

// ListTagsWithStats returns all tags with record count and min/max timestamp
func (db *DB) ListTagsWithStats() ([]TagStats, error) {
	rows, err := db.conn.Query("SELECT tag, COUNT(*) as count, MIN(timestamp) as min_ts, MAX(timestamp) as max_ts FROM railcarlist_raws GROUP BY tag")
	if err != nil {
		return nil, fmt.Errorf("failed to list tags: %w", err)
	}
	defer rows.Close()
	var result []TagStats
	for rows.Next() {
		var s TagStats
		if err := rows.Scan(&s.Tag, &s.Count, &s.MinTs, &s.MaxTs); err != nil {
			return nil, fmt.Errorf("scan tag stats: %w", err)
		}
		result = append(result, s)
	}
	return result, rows.Err()
}

// ListTagNames returns distinct tag names that have at least one record (fast; no aggregation)
func (db *DB) ListTagNames() ([]string, error) {
	rows, err := db.conn.Query("SELECT DISTINCT tag FROM railcarlist_raws ORDER BY tag")
	if err != nil {
		return nil, fmt.Errorf("failed to list tag names: %w", err)
	}
	defer rows.Close()
	var result []string
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, fmt.Errorf("scan tag name: %w", err)
		}
		result = append(result, tag)
	}
	return result, rows.Err()
}

// TagLastRecord holds tag and its latest timestamp
type TagLastRecord struct {
	Tag   string
	MaxTs int64
}

// ListTagsLastRecord returns each tag and its max timestamp (lightweight, no COUNT/MIN)
func (db *DB) ListTagsLastRecord() ([]TagLastRecord, error) {
	rows, err := db.conn.Query("SELECT tag, MAX(timestamp) as max_ts FROM railcarlist_raws GROUP BY tag")
	if err != nil {
		return nil, fmt.Errorf("failed to list tags last record: %w", err)
	}
	defer rows.Close()
	var result []TagLastRecord
	for rows.Next() {
		var r TagLastRecord
		if err := rows.Scan(&r.Tag, &r.MaxTs); err != nil {
			return nil, fmt.Errorf("scan tag last record: %w", err)
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// ListTagsLastRecordForTags returns max timestamp only for the given tags (fast: uses WHERE tag IN (...))
func (db *DB) ListTagsLastRecordForTags(tags []string) ([]TagLastRecord, error) {
	if len(tags) == 0 {
		return nil, nil
	}
	// Build placeholder list for IN clause
	args := make([]interface{}, len(tags))
	for i, t := range tags {
		args[i] = t
	}
	placeholders := ""
	for i := range tags {
		if i > 0 {
			placeholders += ",?"
		} else {
			placeholders = "?"
		}
	}
	query := "SELECT tag, MAX(timestamp) as max_ts FROM railcarlist_raws WHERE tag IN (" + placeholders + ") GROUP BY tag"
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list tags last record for tags: %w", err)
	}
	defer rows.Close()
	var result []TagLastRecord
	for rows.Next() {
		var r TagLastRecord
		if err := rows.Scan(&r.Tag, &r.MaxTs); err != nil {
			return nil, fmt.Errorf("scan tag last record: %w", err)
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// TagRow is a row from the tags table
type TagRow struct {
	Tag       string
	CreatedAt string
	UpdatedAt string
	Source    string
}

// InsertTag inserts a tag into the tags table
func (db *DB) InsertTag(tag, createdAt, updatedAt, source string) error {
	_, err := db.conn.Exec("INSERT INTO tags (tag, created_at, updated_at, source) VALUES (?, ?, ?, ?)",
		tag, createdAt, updatedAt, source)
	if err != nil {
		return fmt.Errorf("insert tag: %w", err)
	}
	return nil
}

// InsertTagIfNotExists inserts a tag into the tags table if it does not already exist (for upload/load)
func (db *DB) InsertTagIfNotExists(tag, createdAt, updatedAt, source string) error {
	_, err := db.conn.Exec("INSERT OR IGNORE INTO tags (tag, created_at, updated_at, source) VALUES (?, ?, ?, ?)",
		tag, createdAt, updatedAt, source)
	if err != nil {
		return fmt.Errorf("insert tag if not exists: %w", err)
	}
	return nil
}

// UpdateTagUpdatedAt sets updated_at for a tag
func (db *DB) UpdateTagUpdatedAt(tag, updatedAt string) error {
	_, err := db.conn.Exec("UPDATE tags SET updated_at = ? WHERE tag = ?", updatedAt, tag)
	if err != nil {
		return fmt.Errorf("update tag: %w", err)
	}
	return nil
}

// DeleteTag removes a tag from the tags table
func (db *DB) DeleteTag(tag string) error {
	_, err := db.conn.Exec("DELETE FROM tags WHERE tag = ?", tag)
	if err != nil {
		return fmt.Errorf("delete tag: %w", err)
	}
	return nil
}

// ListTagsPaginated returns a page of rows from the tags table
func (db *DB) ListTagsPaginated(offset, limit int) ([]TagRow, error) {
	rows, err := db.conn.Query("SELECT tag, created_at, updated_at, source FROM tags ORDER BY tag LIMIT ? OFFSET ?", limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list tags: %w", err)
	}
	defer rows.Close()
	var result []TagRow
	for rows.Next() {
		var r TagRow
		if err := rows.Scan(&r.Tag, &r.CreatedAt, &r.UpdatedAt, &r.Source); err != nil {
			return nil, fmt.Errorf("scan tag row: %w", err)
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// CountTags returns the total number of tags
func (db *DB) CountTags() (int, error) {
	var n int
	err := db.conn.QueryRow("SELECT COUNT(*) FROM tags").Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("count tags: %w", err)
	}
	return n, nil
}

// CountTagsWithSearch returns the number of tags whose name contains the search term (case-insensitive)
func (db *DB) CountTagsWithSearch(search string) (int, error) {
	pattern := "%" + search + "%"
	var n int
	err := db.conn.QueryRow("SELECT COUNT(*) FROM tags WHERE LOWER(tag) LIKE LOWER(?)", pattern).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("count tags with search: %w", err)
	}
	return n, nil
}

// ListTagsPaginatedWithSearch returns a page of tag rows filtered by search term (case-insensitive)
func (db *DB) ListTagsPaginatedWithSearch(offset, limit int, search string) ([]TagRow, error) {
	pattern := "%" + search + "%"
	rows, err := db.conn.Query("SELECT tag, created_at, updated_at, source FROM tags WHERE LOWER(tag) LIKE LOWER(?) ORDER BY tag LIMIT ? OFFSET ?", pattern, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list tags with search: %w", err)
	}
	defer rows.Close()
	var result []TagRow
	for rows.Next() {
		var r TagRow
		if err := rows.Scan(&r.Tag, &r.CreatedAt, &r.UpdatedAt, &r.Source); err != nil {
			return nil, fmt.Errorf("scan tag row: %w", err)
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// ListTagNamesFromTagsTable returns tag names from the tags table (for generator and API)
func (db *DB) ListTagNamesFromTagsTable() ([]string, error) {
	rows, err := db.conn.Query("SELECT tag FROM tags ORDER BY tag")
	if err != nil {
		return nil, fmt.Errorf("list tag names: %w", err)
	}
	defer rows.Close()
	var result []string
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, fmt.Errorf("scan tag name: %w", err)
		}
		result = append(result, tag)
	}
	return result, rows.Err()
}

// RailcarRow is a row from the railcars table
type RailcarRow struct {
	ID        string
	Name      string
	StartTime string
	EndTime   string
	Spot      string
	Product   string
	Tank      string
}

// InsertRailcar inserts a railcar into the railcars table
func (db *DB) InsertRailcar(id, name, startTime, endTime, spot, product, tank string) error {
	_, err := db.conn.Exec("INSERT INTO railcars (id, name, start_time, end_time, spot, product, tank) VALUES (?, ?, ?, ?, ?, ?, ?)",
		id, name, startTime, endTime, spot, product, tank)
	if err != nil {
		return fmt.Errorf("insert railcar: %w", err)
	}
	return nil
}

// GetRailcarByID returns a single railcar by id or nil if not found
func (db *DB) GetRailcarByID(id string) (*RailcarRow, error) {
	var r RailcarRow
	err := db.conn.QueryRow("SELECT id, name, start_time, end_time, COALESCE(spot,''), COALESCE(product,''), COALESCE(tank,'') FROM railcars WHERE id = ?", id).
		Scan(&r.ID, &r.Name, &r.StartTime, &r.EndTime, &r.Spot, &r.Product, &r.Tank)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get railcar: %w", err)
	}
	return &r, nil
}

// ListRailcars returns all railcars ordered by name
func (db *DB) ListRailcars() ([]RailcarRow, error) {
	rows, err := db.conn.Query("SELECT id, name, start_time, end_time, COALESCE(spot,''), COALESCE(product,''), COALESCE(tank,'') FROM railcars ORDER BY name")
	if err != nil {
		return nil, fmt.Errorf("list railcars: %w", err)
	}
	defer rows.Close()
	var result []RailcarRow
	for rows.Next() {
		var r RailcarRow
		if err := rows.Scan(&r.ID, &r.Name, &r.StartTime, &r.EndTime, &r.Spot, &r.Product, &r.Tank); err != nil {
			return nil, fmt.Errorf("scan railcar: %w", err)
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// CountRailcars returns total number of railcars
func (db *DB) CountRailcars() (int, error) {
	var n int
	err := db.conn.QueryRow("SELECT COUNT(*) FROM railcars").Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("count railcars: %w", err)
	}
	return n, nil
}

// ListRailcarsPaginated returns a page of railcars. orderBy is whitelisted (start_time, name, end_time) to avoid SQL injection.
func (db *DB) ListRailcarsPaginated(offset, limit int, orderBy string) ([]RailcarRow, error) {
	col := "start_time"
	switch orderBy {
	case "name", "end_time":
		col = orderBy
	default:
		col = "start_time"
	}
	query := "SELECT id, name, start_time, end_time, COALESCE(spot,''), COALESCE(product,''), COALESCE(tank,'') FROM railcars ORDER BY " + col + " LIMIT ? OFFSET ?"
	rows, err := db.conn.Query(query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list railcars paginated: %w", err)
	}
	defer rows.Close()
	var result []RailcarRow
	for rows.Next() {
		var r RailcarRow
		if err := rows.Scan(&r.ID, &r.Name, &r.StartTime, &r.EndTime, &r.Spot, &r.Product, &r.Tank); err != nil {
			return nil, fmt.Errorf("scan railcar: %w", err)
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// UpdateRailcar updates a railcar by id; returns false if not found
func (db *DB) UpdateRailcar(id, name, startTime, endTime, spot, product, tank string) error {
	res, err := db.conn.Exec("UPDATE railcars SET name = ?, start_time = ?, end_time = ?, spot = ?, product = ?, tank = ? WHERE id = ?",
		name, startTime, endTime, spot, product, tank, id)
	if err != nil {
		return fmt.Errorf("update railcar: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// DeleteRailcar deletes a railcar by id; returns false if not found
func (db *DB) DeleteRailcar(id string) error {
	res, err := db.conn.Exec("DELETE FROM railcars WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("delete railcar: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// DeleteAllRailcars deletes all railcars from the table (for test data cleanup).
func (db *DB) DeleteAllRailcars() (int64, error) {
	res, err := db.conn.Exec("DELETE FROM railcars")
	if err != nil {
		return 0, fmt.Errorf("delete all railcars: %w", err)
	}
	n, _ := res.RowsAffected()
	return n, nil
}

// --- Electricity DB Methods ---

func (db *DB) InsertElectricityLoadProfile(lp models.ElectricityLoadProfile) error {
	_, err := db.conn.Exec("INSERT INTO electricity_load_profiles (hour, actual, planned, threshold) VALUES (?, ?, ?, ?)",
		lp.Hour, lp.Actual, lp.Planned, lp.Threshold)
	return err
}

func (db *DB) ListElectricityLoadProfiles() ([]models.ElectricityLoadProfile, error) {
	rows, err := db.conn.Query("SELECT id, hour, actual, planned, threshold FROM electricity_load_profiles ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.ElectricityLoadProfile
	for rows.Next() {
		var r models.ElectricityLoadProfile
		if err := rows.Scan(&r.ID, &r.Hour, &r.Actual, &r.Planned, &r.Threshold); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllElectricityLoadProfiles() error {
	_, err := db.conn.Exec("DELETE FROM electricity_load_profiles")
	return err
}

func (db *DB) InsertElectricityWeeklyConsumption(wc models.ElectricityWeeklyConsumption) error {
	_, err := db.conn.Exec("INSERT INTO electricity_weekly_consumption (day, this_week, last_week) VALUES (?, ?, ?)",
		wc.Day, wc.ThisWeek, wc.LastWeek)
	return err
}

func (db *DB) ListElectricityWeeklyConsumption() ([]models.ElectricityWeeklyConsumption, error) {
	rows, err := db.conn.Query("SELECT id, day, this_week, last_week FROM electricity_weekly_consumption ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.ElectricityWeeklyConsumption
	for rows.Next() {
		var r models.ElectricityWeeklyConsumption
		if err := rows.Scan(&r.ID, &r.Day, &r.ThisWeek, &r.LastWeek); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllElectricityWeeklyConsumption() error {
	_, err := db.conn.Exec("DELETE FROM electricity_weekly_consumption")
	return err
}

func (db *DB) InsertElectricityPowerFactor(pf models.ElectricityPowerFactor) error {
	_, err := db.conn.Exec("INSERT INTO electricity_power_factor (time, value) VALUES (?, ?)", pf.Time, pf.Value)
	return err
}

func (db *DB) ListElectricityPowerFactor() ([]models.ElectricityPowerFactor, error) {
	rows, err := db.conn.Query("SELECT id, time, value FROM electricity_power_factor ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.ElectricityPowerFactor
	for rows.Next() {
		var r models.ElectricityPowerFactor
		if err := rows.Scan(&r.ID, &r.Time, &r.Value); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllElectricityPowerFactor() error {
	_, err := db.conn.Exec("DELETE FROM electricity_power_factor")
	return err
}

func (db *DB) InsertElectricityCostBreakdown(cb models.ElectricityCostBreakdown) error {
	_, err := db.conn.Exec("INSERT INTO electricity_cost_breakdown (source, cost, color) VALUES (?, ?, ?)",
		cb.Source, cb.Cost, cb.Color)
	return err
}

func (db *DB) ListElectricityCostBreakdown() ([]models.ElectricityCostBreakdown, error) {
	rows, err := db.conn.Query("SELECT id, source, cost, color FROM electricity_cost_breakdown ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.ElectricityCostBreakdown
	for rows.Next() {
		var r models.ElectricityCostBreakdown
		if err := rows.Scan(&r.ID, &r.Source, &r.Cost, &r.Color); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllElectricityCostBreakdown() error {
	_, err := db.conn.Exec("DELETE FROM electricity_cost_breakdown")
	return err
}

func (db *DB) InsertElectricityPeakDemand(pd models.ElectricityPeakDemand) error {
	_, err := db.conn.Exec("INSERT INTO electricity_peak_demand (date, peak) VALUES (?, ?)", pd.Date, pd.Peak)
	return err
}

func (db *DB) ListElectricityPeakDemand() ([]models.ElectricityPeakDemand, error) {
	rows, err := db.conn.Query("SELECT id, date, peak FROM electricity_peak_demand ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.ElectricityPeakDemand
	for rows.Next() {
		var r models.ElectricityPeakDemand
		if err := rows.Scan(&r.ID, &r.Date, &r.Peak); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllElectricityPeakDemand() error {
	_, err := db.conn.Exec("DELETE FROM electricity_peak_demand")
	return err
}

func (db *DB) InsertElectricityPhaseBalance(pb models.ElectricityPhaseBalance) error {
	_, err := db.conn.Exec("INSERT INTO electricity_phase_balance (time, phase_a, phase_b, phase_c) VALUES (?, ?, ?, ?)",
		pb.Time, pb.PhaseA, pb.PhaseB, pb.PhaseC)
	return err
}

func (db *DB) ListElectricityPhaseBalance() ([]models.ElectricityPhaseBalance, error) {
	rows, err := db.conn.Query("SELECT id, time, phase_a, phase_b, phase_c FROM electricity_phase_balance ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.ElectricityPhaseBalance
	for rows.Next() {
		var r models.ElectricityPhaseBalance
		if err := rows.Scan(&r.ID, &r.Time, &r.PhaseA, &r.PhaseB, &r.PhaseC); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllElectricityPhaseBalance() error {
	_, err := db.conn.Exec("DELETE FROM electricity_phase_balance")
	return err
}

func (db *DB) UpsertElectricityKPIs(kpis models.ElectricityKPIs) error {
	_, err := db.conn.Exec(`INSERT OR REPLACE INTO electricity_kpis
		(id, total_consumption, real_time_demand, peak_demand, power_factor, energy_cost, carbon_emissions, grid_availability, transformer_load, updated_at)
		VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
		kpis.TotalConsumption, kpis.RealTimeDemand, kpis.PeakDemand, kpis.PowerFactor,
		kpis.EnergyCost, kpis.CarbonEmissions, kpis.GridAvailability, kpis.TransformerLoad)
	return err
}

func (db *DB) GetElectricityKPIs() (*models.ElectricityKPIs, error) {
	row := db.conn.QueryRow("SELECT total_consumption, real_time_demand, peak_demand, power_factor, energy_cost, carbon_emissions, grid_availability, transformer_load FROM electricity_kpis WHERE id = 1")
	var k models.ElectricityKPIs
	err := row.Scan(&k.TotalConsumption, &k.RealTimeDemand, &k.PeakDemand, &k.PowerFactor,
		&k.EnergyCost, &k.CarbonEmissions, &k.GridAvailability, &k.TransformerLoad)
	if err != nil {
		return nil, err
	}
	return &k, nil
}

// --- Steam DB Methods ---

func (db *DB) InsertSteamBalance(item models.SteamBalance) error {
	_, err := db.conn.Exec("INSERT INTO steam_balance (hour, boiler1, boiler2, boiler3, demand) VALUES (?, ?, ?, ?, ?)",
		item.Hour, item.Boiler1, item.Boiler2, item.Boiler3, item.Demand)
	return err
}

func (db *DB) ListSteamBalance() ([]models.SteamBalance, error) {
	rows, err := db.conn.Query("SELECT id, hour, boiler1, boiler2, boiler3, demand FROM steam_balance ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SteamBalance
	for rows.Next() {
		var r models.SteamBalance
		if err := rows.Scan(&r.ID, &r.Hour, &r.Boiler1, &r.Boiler2, &r.Boiler3, &r.Demand); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllSteamBalance() error {
	_, err := db.conn.Exec("DELETE FROM steam_balance")
	return err
}

func (db *DB) InsertSteamHeaderPressure(item models.SteamHeaderPressure) error {
	_, err := db.conn.Exec("INSERT INTO steam_header_pressure (time, hp, mp, lp) VALUES (?, ?, ?, ?)",
		item.Time, item.HP, item.MP, item.LP)
	return err
}

func (db *DB) ListSteamHeaderPressure() ([]models.SteamHeaderPressure, error) {
	rows, err := db.conn.Query("SELECT id, time, hp, mp, lp FROM steam_header_pressure ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SteamHeaderPressure
	for rows.Next() {
		var r models.SteamHeaderPressure
		if err := rows.Scan(&r.ID, &r.Time, &r.HP, &r.MP, &r.LP); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllSteamHeaderPressure() error {
	_, err := db.conn.Exec("DELETE FROM steam_header_pressure")
	return err
}

func (db *DB) InsertSteamDistribution(item models.SteamDistribution) error {
	_, err := db.conn.Exec("INSERT INTO steam_distribution (consumer, value, color) VALUES (?, ?, ?)",
		item.Consumer, item.Value, item.Color)
	return err
}

func (db *DB) ListSteamDistribution() ([]models.SteamDistribution, error) {
	rows, err := db.conn.Query("SELECT id, consumer, value, color FROM steam_distribution ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SteamDistribution
	for rows.Next() {
		var r models.SteamDistribution
		if err := rows.Scan(&r.ID, &r.Consumer, &r.Value, &r.Color); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllSteamDistribution() error {
	_, err := db.conn.Exec("DELETE FROM steam_distribution")
	return err
}

func (db *DB) InsertSteamCondensate(item models.SteamCondensate) error {
	_, err := db.conn.Exec("INSERT INTO steam_condensate (hour, recovery) VALUES (?, ?)",
		item.Hour, item.Recovery)
	return err
}

func (db *DB) ListSteamCondensate() ([]models.SteamCondensate, error) {
	rows, err := db.conn.Query("SELECT id, hour, recovery FROM steam_condensate ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SteamCondensate
	for rows.Next() {
		var r models.SteamCondensate
		if err := rows.Scan(&r.ID, &r.Hour, &r.Recovery); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllSteamCondensate() error {
	_, err := db.conn.Exec("DELETE FROM steam_condensate")
	return err
}

func (db *DB) InsertSteamFuelRatio(item models.SteamFuelRatio) error {
	_, err := db.conn.Exec("INSERT INTO steam_fuel_ratio (hour, fuel, steam) VALUES (?, ?, ?)",
		item.Hour, item.Fuel, item.Steam)
	return err
}

func (db *DB) ListSteamFuelRatio() ([]models.SteamFuelRatio, error) {
	rows, err := db.conn.Query("SELECT id, hour, fuel, steam FROM steam_fuel_ratio ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SteamFuelRatio
	for rows.Next() {
		var r models.SteamFuelRatio
		if err := rows.Scan(&r.ID, &r.Hour, &r.Fuel, &r.Steam); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllSteamFuelRatio() error {
	_, err := db.conn.Exec("DELETE FROM steam_fuel_ratio")
	return err
}

func (db *DB) InsertSteamLoss(item models.SteamLoss) error {
	_, err := db.conn.Exec("INSERT INTO steam_loss (location, loss, traps_total, traps_failed) VALUES (?, ?, ?, ?)",
		item.Location, item.Loss, item.TrapsTotal, item.TrapsFailed)
	return err
}

func (db *DB) ListSteamLoss() ([]models.SteamLoss, error) {
	rows, err := db.conn.Query("SELECT id, location, loss, traps_total, traps_failed FROM steam_loss ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SteamLoss
	for rows.Next() {
		var r models.SteamLoss
		if err := rows.Scan(&r.ID, &r.Location, &r.Loss, &r.TrapsTotal, &r.TrapsFailed); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllSteamLoss() error {
	_, err := db.conn.Exec("DELETE FROM steam_loss")
	return err
}

func (db *DB) UpsertSteamKPIs(kpis models.SteamKPIs) error {
	_, err := db.conn.Exec(`INSERT OR REPLACE INTO steam_kpis
		(id, total_production, total_demand, header_pressure, steam_temperature, system_efficiency, condensate_recovery, makeup_water_flow, fuel_consumption, updated_at)
		VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
		kpis.TotalProduction, kpis.TotalDemand, kpis.HeaderPressure, kpis.SteamTemperature,
		kpis.SystemEfficiency, kpis.CondensateRecovery, kpis.MakeupWaterFlow, kpis.FuelConsumption)
	return err
}

func (db *DB) GetSteamKPIs() (*models.SteamKPIs, error) {
	row := db.conn.QueryRow("SELECT total_production, total_demand, header_pressure, steam_temperature, system_efficiency, condensate_recovery, makeup_water_flow, fuel_consumption FROM steam_kpis WHERE id = 1")
	var k models.SteamKPIs
	err := row.Scan(&k.TotalProduction, &k.TotalDemand, &k.HeaderPressure, &k.SteamTemperature,
		&k.SystemEfficiency, &k.CondensateRecovery, &k.MakeupWaterFlow, &k.FuelConsumption)
	if err != nil {
		return nil, err
	}
	return &k, nil
}

// --- Boiler DB Methods ---

func (db *DB) InsertBoilerReading(item models.BoilerReading) error {
	_, err := db.conn.Exec("INSERT INTO boiler_readings (boiler_id, efficiency, load, steam_output) VALUES (?, ?, ?, ?)",
		item.BoilerID, item.Efficiency, item.Load, item.SteamOutput)
	return err
}

func (db *DB) ListBoilerReadings() ([]models.BoilerReading, error) {
	rows, err := db.conn.Query("SELECT id, boiler_id, efficiency, load, steam_output FROM boiler_readings ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.BoilerReading
	for rows.Next() {
		var r models.BoilerReading
		if err := rows.Scan(&r.ID, &r.BoilerID, &r.Efficiency, &r.Load, &r.SteamOutput); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllBoilerReadings() error {
	_, err := db.conn.Exec("DELETE FROM boiler_readings")
	return err
}

func (db *DB) InsertBoilerEfficiencyTrend(item models.BoilerEfficiencyTrend) error {
	_, err := db.conn.Exec("INSERT INTO boiler_efficiency_trend (date, blr01, blr02, blr03, blr04) VALUES (?, ?, ?, ?, ?)",
		item.Date, item.Blr01, item.Blr02, item.Blr03, item.Blr04)
	return err
}

func (db *DB) ListBoilerEfficiencyTrend() ([]models.BoilerEfficiencyTrend, error) {
	rows, err := db.conn.Query("SELECT id, date, blr01, blr02, blr03, blr04 FROM boiler_efficiency_trend ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.BoilerEfficiencyTrend
	for rows.Next() {
		var r models.BoilerEfficiencyTrend
		if err := rows.Scan(&r.ID, &r.Date, &r.Blr01, &r.Blr02, &r.Blr03, &r.Blr04); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllBoilerEfficiencyTrend() error {
	_, err := db.conn.Exec("DELETE FROM boiler_efficiency_trend")
	return err
}

func (db *DB) InsertBoilerCombustion(item models.BoilerCombustion) error {
	_, err := db.conn.Exec("INSERT INTO boiler_combustion (boiler_id, o2, co2, co, nox) VALUES (?, ?, ?, ?, ?)",
		item.BoilerID, item.O2, item.CO2, item.CO, item.NOx)
	return err
}

func (db *DB) ListBoilerCombustion() ([]models.BoilerCombustion, error) {
	rows, err := db.conn.Query("SELECT id, boiler_id, o2, co2, co, nox FROM boiler_combustion ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.BoilerCombustion
	for rows.Next() {
		var r models.BoilerCombustion
		if err := rows.Scan(&r.ID, &r.BoilerID, &r.O2, &r.CO2, &r.CO, &r.NOx); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllBoilerCombustion() error {
	_, err := db.conn.Exec("DELETE FROM boiler_combustion")
	return err
}

func (db *DB) InsertBoilerSteamFuel(item models.BoilerSteamFuel) error {
	_, err := db.conn.Exec("INSERT INTO boiler_steam_fuel (hour, steam, fuel) VALUES (?, ?, ?)",
		item.Hour, item.Steam, item.Fuel)
	return err
}

func (db *DB) ListBoilerSteamFuel() ([]models.BoilerSteamFuel, error) {
	rows, err := db.conn.Query("SELECT id, hour, steam, fuel FROM boiler_steam_fuel ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.BoilerSteamFuel
	for rows.Next() {
		var r models.BoilerSteamFuel
		if err := rows.Scan(&r.ID, &r.Hour, &r.Steam, &r.Fuel); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllBoilerSteamFuel() error {
	_, err := db.conn.Exec("DELETE FROM boiler_steam_fuel")
	return err
}

func (db *DB) InsertBoilerEmission(item models.BoilerEmission) error {
	_, err := db.conn.Exec("INSERT INTO boiler_emissions (pollutant, current_val, limit_val, unit) VALUES (?, ?, ?, ?)",
		item.Pollutant, item.Current, item.Limit, item.Unit)
	return err
}

func (db *DB) ListBoilerEmissions() ([]models.BoilerEmission, error) {
	rows, err := db.conn.Query("SELECT id, pollutant, current_val, limit_val, unit FROM boiler_emissions ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.BoilerEmission
	for rows.Next() {
		var r models.BoilerEmission
		if err := rows.Scan(&r.ID, &r.Pollutant, &r.Current, &r.Limit, &r.Unit); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllBoilerEmissions() error {
	_, err := db.conn.Exec("DELETE FROM boiler_emissions")
	return err
}

func (db *DB) InsertBoilerStackTemp(item models.BoilerStackTemp) error {
	_, err := db.conn.Exec("INSERT INTO boiler_stack_temp (hour, blr01, blr02, blr03) VALUES (?, ?, ?, ?)",
		item.Hour, item.Blr01, item.Blr02, item.Blr03)
	return err
}

func (db *DB) ListBoilerStackTemp() ([]models.BoilerStackTemp, error) {
	rows, err := db.conn.Query("SELECT id, hour, blr01, blr02, blr03 FROM boiler_stack_temp ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.BoilerStackTemp
	for rows.Next() {
		var r models.BoilerStackTemp
		if err := rows.Scan(&r.ID, &r.Hour, &r.Blr01, &r.Blr02, &r.Blr03); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllBoilerStackTemp() error {
	_, err := db.conn.Exec("DELETE FROM boiler_stack_temp")
	return err
}

func (db *DB) UpsertBoilerKPIs(kpis models.BoilerKPIs) error {
	_, err := db.conn.Exec(`INSERT OR REPLACE INTO boiler_kpis
		(id, boilers_online, boilers_total, total_steam_output, fleet_efficiency, avg_stack_temp, total_fuel_rate, avg_o2, co_emissions, nox_emissions, updated_at)
		VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
		kpis.BoilersOnline, kpis.BoilersTotal, kpis.TotalSteamOutput, kpis.FleetEfficiency,
		kpis.AvgStackTemp, kpis.TotalFuelRate, kpis.AvgO2, kpis.CoEmissions, kpis.NoxEmissions)
	return err
}

func (db *DB) GetBoilerKPIs() (*models.BoilerKPIs, error) {
	row := db.conn.QueryRow("SELECT boilers_online, boilers_total, total_steam_output, fleet_efficiency, avg_stack_temp, total_fuel_rate, avg_o2, co_emissions, nox_emissions FROM boiler_kpis WHERE id = 1")
	var k models.BoilerKPIs
	err := row.Scan(&k.BoilersOnline, &k.BoilersTotal, &k.TotalSteamOutput, &k.FleetEfficiency,
		&k.AvgStackTemp, &k.TotalFuelRate, &k.AvgO2, &k.CoEmissions, &k.NoxEmissions)
	if err != nil {
		return nil, err
	}
	return &k, nil
}

// --- Tank DB Methods ---

func (db *DB) InsertTankLevel(item models.TankLevel) error {
	_, err := db.conn.Exec("INSERT INTO tank_levels (tank_id, product, level, volume, capacity, color) VALUES (?, ?, ?, ?, ?, ?)",
		item.TankID, item.Product, item.Level, item.Volume, item.Capacity, item.Color)
	return err
}

func (db *DB) ListTankLevels() ([]models.TankLevel, error) {
	rows, err := db.conn.Query("SELECT id, tank_id, product, level, volume, capacity, color FROM tank_levels ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.TankLevel
	for rows.Next() {
		var r models.TankLevel
		if err := rows.Scan(&r.ID, &r.TankID, &r.Product, &r.Level, &r.Volume, &r.Capacity, &r.Color); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllTankLevels() error {
	_, err := db.conn.Exec("DELETE FROM tank_levels")
	return err
}

func (db *DB) InsertTankInventoryTrend(item models.TankInventoryTrend) error {
	_, err := db.conn.Exec("INSERT INTO tank_inventory_trend (date, gasoline, diesel, crude, ethanol) VALUES (?, ?, ?, ?, ?)",
		item.Date, item.Gasoline, item.Diesel, item.Crude, item.Ethanol)
	return err
}

func (db *DB) ListTankInventoryTrend() ([]models.TankInventoryTrend, error) {
	rows, err := db.conn.Query("SELECT id, date, gasoline, diesel, crude, ethanol FROM tank_inventory_trend ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.TankInventoryTrend
	for rows.Next() {
		var r models.TankInventoryTrend
		if err := rows.Scan(&r.ID, &r.Date, &r.Gasoline, &r.Diesel, &r.Crude, &r.Ethanol); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllTankInventoryTrend() error {
	_, err := db.conn.Exec("DELETE FROM tank_inventory_trend")
	return err
}

func (db *DB) InsertTankThroughput(item models.TankThroughput) error {
	_, err := db.conn.Exec("INSERT INTO tank_throughput (date, receipts, dispatches) VALUES (?, ?, ?)",
		item.Date, item.Receipts, item.Dispatches)
	return err
}

func (db *DB) ListTankThroughput() ([]models.TankThroughput, error) {
	rows, err := db.conn.Query("SELECT id, date, receipts, dispatches FROM tank_throughput ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.TankThroughput
	for rows.Next() {
		var r models.TankThroughput
		if err := rows.Scan(&r.ID, &r.Date, &r.Receipts, &r.Dispatches); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllTankThroughput() error {
	_, err := db.conn.Exec("DELETE FROM tank_throughput")
	return err
}

func (db *DB) InsertTankProductDistribution(item models.TankProductDistribution) error {
	_, err := db.conn.Exec("INSERT INTO tank_product_distribution (product, volume, color) VALUES (?, ?, ?)",
		item.Product, item.Volume, item.Color)
	return err
}

func (db *DB) ListTankProductDistribution() ([]models.TankProductDistribution, error) {
	rows, err := db.conn.Query("SELECT id, product, volume, color FROM tank_product_distribution ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.TankProductDistribution
	for rows.Next() {
		var r models.TankProductDistribution
		if err := rows.Scan(&r.ID, &r.Product, &r.Volume, &r.Color); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllTankProductDistribution() error {
	_, err := db.conn.Exec("DELETE FROM tank_product_distribution")
	return err
}

func (db *DB) InsertTankLevelChange(item models.TankLevelChange) error {
	_, err := db.conn.Exec("INSERT INTO tank_level_changes (tank_id, change_val) VALUES (?, ?)",
		item.TankID, item.Change)
	return err
}

func (db *DB) ListTankLevelChanges() ([]models.TankLevelChange, error) {
	rows, err := db.conn.Query("SELECT id, tank_id, change_val FROM tank_level_changes ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.TankLevelChange
	for rows.Next() {
		var r models.TankLevelChange
		if err := rows.Scan(&r.ID, &r.TankID, &r.Change); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllTankLevelChanges() error {
	_, err := db.conn.Exec("DELETE FROM tank_level_changes")
	return err
}

func (db *DB) InsertTankTemperature(item models.TankTemperature) error {
	_, err := db.conn.Exec("INSERT INTO tank_temperatures (tank_id, t00, t06, t12, t18) VALUES (?, ?, ?, ?, ?)",
		item.TankID, item.T00, item.T06, item.T12, item.T18)
	return err
}

func (db *DB) ListTankTemperatures() ([]models.TankTemperature, error) {
	rows, err := db.conn.Query("SELECT id, tank_id, t00, t06, t12, t18 FROM tank_temperatures ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.TankTemperature
	for rows.Next() {
		var r models.TankTemperature
		if err := rows.Scan(&r.ID, &r.TankID, &r.T00, &r.T06, &r.T12, &r.T18); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllTankTemperatures() error {
	_, err := db.conn.Exec("DELETE FROM tank_temperatures")
	return err
}

func (db *DB) UpsertTankKPIs(kpis models.TankKPIs) error {
	_, err := db.conn.Exec(`INSERT OR REPLACE INTO tank_kpis
		(id, total_inventory, available_capacity, tanks_in_operation, tanks_total, current_throughput, avg_temperature, active_alarms, daily_receipts, daily_dispatches, updated_at)
		VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
		kpis.TotalInventory, kpis.AvailableCapacity, kpis.TanksInOperation, kpis.TanksTotal,
		kpis.CurrentThroughput, kpis.AvgTemperature, kpis.ActiveAlarms, kpis.DailyReceipts, kpis.DailyDispatches)
	return err
}

func (db *DB) GetTankKPIs() (*models.TankKPIs, error) {
	row := db.conn.QueryRow("SELECT total_inventory, available_capacity, tanks_in_operation, tanks_total, current_throughput, avg_temperature, active_alarms, daily_receipts, daily_dispatches FROM tank_kpis WHERE id = 1")
	var k models.TankKPIs
	err := row.Scan(&k.TotalInventory, &k.AvailableCapacity, &k.TanksInOperation, &k.TanksTotal,
		&k.CurrentThroughput, &k.AvgTemperature, &k.ActiveAlarms, &k.DailyReceipts, &k.DailyDispatches)
	if err != nil {
		return nil, err
	}
	return &k, nil
}

// --- SubStation DB Methods ---

func (db *DB) InsertSubStationVoltageProfile(item models.SubStationVoltageProfile) error {
	_, err := db.conn.Exec("INSERT INTO substation_voltage_profile (time, v_ry, v_yb, v_br) VALUES (?, ?, ?, ?)",
		item.Time, item.VRY, item.VYB, item.VBR)
	return err
}

func (db *DB) ListSubStationVoltageProfile() ([]models.SubStationVoltageProfile, error) {
	rows, err := db.conn.Query("SELECT id, time, v_ry, v_yb, v_br FROM substation_voltage_profile ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SubStationVoltageProfile
	for rows.Next() {
		var r models.SubStationVoltageProfile
		if err := rows.Scan(&r.ID, &r.Time, &r.VRY, &r.VYB, &r.VBR); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllSubStationVoltageProfile() error {
	_, err := db.conn.Exec("DELETE FROM substation_voltage_profile")
	return err
}

func (db *DB) InsertSubStationTransformer(item models.SubStationTransformer) error {
	_, err := db.conn.Exec("INSERT INTO substation_transformers (name, loading, capacity, unit) VALUES (?, ?, ?, ?)",
		item.Name, item.Loading, item.Capacity, item.Unit)
	return err
}

func (db *DB) ListSubStationTransformers() ([]models.SubStationTransformer, error) {
	rows, err := db.conn.Query("SELECT id, name, loading, capacity, unit FROM substation_transformers ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SubStationTransformer
	for rows.Next() {
		var r models.SubStationTransformer
		if err := rows.Scan(&r.ID, &r.Name, &r.Loading, &r.Capacity, &r.Unit); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllSubStationTransformers() error {
	_, err := db.conn.Exec("DELETE FROM substation_transformers")
	return err
}

func (db *DB) InsertSubStationHarmonic(item models.SubStationHarmonic) error {
	_, err := db.conn.Exec("INSERT INTO substation_harmonics (harmonic_order, magnitude) VALUES (?, ?)",
		item.Order, item.Magnitude)
	return err
}

func (db *DB) ListSubStationHarmonics() ([]models.SubStationHarmonic, error) {
	rows, err := db.conn.Query("SELECT id, harmonic_order, magnitude FROM substation_harmonics ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SubStationHarmonic
	for rows.Next() {
		var r models.SubStationHarmonic
		if err := rows.Scan(&r.ID, &r.Order, &r.Magnitude); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllSubStationHarmonics() error {
	_, err := db.conn.Exec("DELETE FROM substation_harmonics")
	return err
}

func (db *DB) InsertSubStationTransformerTemp(item models.SubStationTransformerTemp) error {
	_, err := db.conn.Exec("INSERT INTO substation_transformer_temp (time, oil_temp, winding_temp) VALUES (?, ?, ?)",
		item.Time, item.OilTemp, item.WindTemp)
	return err
}

func (db *DB) ListSubStationTransformerTemp() ([]models.SubStationTransformerTemp, error) {
	rows, err := db.conn.Query("SELECT id, time, oil_temp, winding_temp FROM substation_transformer_temp ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SubStationTransformerTemp
	for rows.Next() {
		var r models.SubStationTransformerTemp
		if err := rows.Scan(&r.ID, &r.Time, &r.OilTemp, &r.WindTemp); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllSubStationTransformerTemp() error {
	_, err := db.conn.Exec("DELETE FROM substation_transformer_temp")
	return err
}

func (db *DB) InsertSubStationFeederDistribution(item models.SubStationFeederDistribution) error {
	_, err := db.conn.Exec("INSERT INTO substation_feeder_distribution (time, feeder1, feeder2, feeder3, feeder4, feeder5) VALUES (?, ?, ?, ?, ?, ?)",
		item.Time, item.Feeder1, item.Feeder2, item.Feeder3, item.Feeder4, item.Feeder5)
	return err
}

func (db *DB) ListSubStationFeederDistribution() ([]models.SubStationFeederDistribution, error) {
	rows, err := db.conn.Query("SELECT id, time, feeder1, feeder2, feeder3, feeder4, feeder5 FROM substation_feeder_distribution ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SubStationFeederDistribution
	for rows.Next() {
		var r models.SubStationFeederDistribution
		if err := rows.Scan(&r.ID, &r.Time, &r.Feeder1, &r.Feeder2, &r.Feeder3, &r.Feeder4, &r.Feeder5); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllSubStationFeederDistribution() error {
	_, err := db.conn.Exec("DELETE FROM substation_feeder_distribution")
	return err
}

func (db *DB) InsertSubStationFaultEvent(item models.SubStationFaultEvent) error {
	_, err := db.conn.Exec("INSERT INTO substation_fault_events (day, h08, h09, h10, h11, h12, h13, h14, h15) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		item.Day, item.H08, item.H09, item.H10, item.H11, item.H12, item.H13, item.H14, item.H15)
	return err
}

func (db *DB) ListSubStationFaultEvents() ([]models.SubStationFaultEvent, error) {
	rows, err := db.conn.Query("SELECT id, day, h08, h09, h10, h11, h12, h13, h14, h15 FROM substation_fault_events ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SubStationFaultEvent
	for rows.Next() {
		var r models.SubStationFaultEvent
		if err := rows.Scan(&r.ID, &r.Day, &r.H08, &r.H09, &r.H10, &r.H11, &r.H12, &r.H13, &r.H14, &r.H15); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) DeleteAllSubStationFaultEvents() error {
	_, err := db.conn.Exec("DELETE FROM substation_fault_events")
	return err
}

func (db *DB) UpsertSubStationKPIs(kpis models.SubStationKPIs) error {
	_, err := db.conn.Exec(`INSERT OR REPLACE INTO substation_kpis
		(id, incoming_voltage, total_load, transformer_temp, frequency, thd, breakers_closed, breakers_total, fault_events_24h, busbar_balance, updated_at)
		VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
		kpis.IncomingVoltage, kpis.TotalLoad, kpis.TransformerTemp, kpis.Frequency,
		kpis.THD, kpis.BreakersClosed, kpis.BreakersTotal, kpis.FaultEvents24h, kpis.BusbarBalance)
	return err
}

func (db *DB) GetSubStationKPIs() (*models.SubStationKPIs, error) {
	row := db.conn.QueryRow("SELECT incoming_voltage, total_load, transformer_temp, frequency, thd, breakers_closed, breakers_total, fault_events_24h, busbar_balance FROM substation_kpis WHERE id = 1")
	var k models.SubStationKPIs
	err := row.Scan(&k.IncomingVoltage, &k.TotalLoad, &k.TransformerTemp, &k.Frequency,
		&k.THD, &k.BreakersClosed, &k.BreakersTotal, &k.FaultEvents24h, &k.BusbarBalance)
	if err != nil {
		return nil, err
	}
	return &k, nil
}

// migrate creates the necessary tables if they don't exist
func (db *DB) migrate() error {
	query := `
	CREATE TABLE IF NOT EXISTS railcarlist_raws (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		tag TEXT NOT NULL,
		timestamp INTEGER NOT NULL,
		value REAL NOT NULL,
		quality INTEGER NOT NULL,
		UNIQUE(tag, timestamp)
	);

	CREATE INDEX IF NOT EXISTS idx_tag_timestamp ON railcarlist_raws(tag, timestamp);

	CREATE TABLE IF NOT EXISTS tags (
		tag TEXT PRIMARY KEY,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		source TEXT NOT NULL DEFAULT 'custom'
	);

	CREATE TABLE IF NOT EXISTS railcars (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		start_time TEXT NOT NULL,
		end_time TEXT NOT NULL,
		spot TEXT,
		product TEXT,
		tank TEXT
	);

	CREATE TABLE IF NOT EXISTS electricity_load_profiles (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		hour TEXT NOT NULL,
		actual REAL NOT NULL DEFAULT 0,
		planned REAL NOT NULL DEFAULT 0,
		threshold REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS electricity_weekly_consumption (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		day TEXT NOT NULL,
		this_week REAL NOT NULL DEFAULT 0,
		last_week REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS electricity_power_factor (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		time TEXT NOT NULL,
		value REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS electricity_cost_breakdown (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		source TEXT NOT NULL,
		cost REAL NOT NULL DEFAULT 0,
		color TEXT NOT NULL DEFAULT '#FFFFFF'
	);

	CREATE TABLE IF NOT EXISTS electricity_peak_demand (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		date TEXT NOT NULL,
		peak REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS electricity_phase_balance (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		time TEXT NOT NULL,
		phase_a REAL NOT NULL DEFAULT 0,
		phase_b REAL NOT NULL DEFAULT 0,
		phase_c REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS electricity_kpis (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		total_consumption REAL NOT NULL DEFAULT 0,
		real_time_demand REAL NOT NULL DEFAULT 0,
		peak_demand REAL NOT NULL DEFAULT 0,
		power_factor REAL NOT NULL DEFAULT 0,
		energy_cost REAL NOT NULL DEFAULT 0,
		carbon_emissions REAL NOT NULL DEFAULT 0,
		grid_availability REAL NOT NULL DEFAULT 0,
		transformer_load REAL NOT NULL DEFAULT 0,
		updated_at TEXT
	);

	-- Steam tables
	CREATE TABLE IF NOT EXISTS steam_balance (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		hour TEXT NOT NULL,
		boiler1 REAL NOT NULL DEFAULT 0,
		boiler2 REAL NOT NULL DEFAULT 0,
		boiler3 REAL NOT NULL DEFAULT 0,
		demand REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS steam_header_pressure (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		time TEXT NOT NULL,
		hp REAL NOT NULL DEFAULT 0,
		mp REAL NOT NULL DEFAULT 0,
		lp REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS steam_distribution (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		consumer TEXT NOT NULL,
		value REAL NOT NULL DEFAULT 0,
		color TEXT NOT NULL DEFAULT '#FFFFFF'
	);

	CREATE TABLE IF NOT EXISTS steam_condensate (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		hour TEXT NOT NULL,
		recovery REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS steam_fuel_ratio (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		hour TEXT NOT NULL,
		fuel REAL NOT NULL DEFAULT 0,
		steam REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS steam_loss (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		location TEXT NOT NULL,
		loss REAL NOT NULL DEFAULT 0,
		traps_total INTEGER NOT NULL DEFAULT 0,
		traps_failed INTEGER NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS steam_kpis (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		total_production REAL NOT NULL DEFAULT 0,
		total_demand REAL NOT NULL DEFAULT 0,
		header_pressure REAL NOT NULL DEFAULT 0,
		steam_temperature REAL NOT NULL DEFAULT 0,
		system_efficiency REAL NOT NULL DEFAULT 0,
		condensate_recovery REAL NOT NULL DEFAULT 0,
		makeup_water_flow REAL NOT NULL DEFAULT 0,
		fuel_consumption REAL NOT NULL DEFAULT 0,
		updated_at TEXT
	);

	-- Boiler tables
	CREATE TABLE IF NOT EXISTS boiler_readings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		boiler_id TEXT NOT NULL,
		efficiency REAL NOT NULL DEFAULT 0,
		load REAL NOT NULL DEFAULT 0,
		steam_output REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS boiler_efficiency_trend (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		date TEXT NOT NULL,
		blr01 REAL NOT NULL DEFAULT 0,
		blr02 REAL NOT NULL DEFAULT 0,
		blr03 REAL NOT NULL DEFAULT 0,
		blr04 REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS boiler_combustion (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		boiler_id TEXT NOT NULL,
		o2 REAL NOT NULL DEFAULT 0,
		co2 REAL NOT NULL DEFAULT 0,
		co REAL NOT NULL DEFAULT 0,
		nox REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS boiler_steam_fuel (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		hour TEXT NOT NULL,
		steam REAL NOT NULL DEFAULT 0,
		fuel REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS boiler_emissions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		pollutant TEXT NOT NULL,
		current_val REAL NOT NULL DEFAULT 0,
		limit_val REAL NOT NULL DEFAULT 0,
		unit TEXT NOT NULL DEFAULT ''
	);

	CREATE TABLE IF NOT EXISTS boiler_stack_temp (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		hour TEXT NOT NULL,
		blr01 REAL NOT NULL DEFAULT 0,
		blr02 REAL NOT NULL DEFAULT 0,
		blr03 REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS boiler_kpis (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		boilers_online INTEGER NOT NULL DEFAULT 0,
		boilers_total INTEGER NOT NULL DEFAULT 0,
		total_steam_output REAL NOT NULL DEFAULT 0,
		fleet_efficiency REAL NOT NULL DEFAULT 0,
		avg_stack_temp REAL NOT NULL DEFAULT 0,
		total_fuel_rate REAL NOT NULL DEFAULT 0,
		avg_o2 REAL NOT NULL DEFAULT 0,
		co_emissions REAL NOT NULL DEFAULT 0,
		nox_emissions REAL NOT NULL DEFAULT 0,
		updated_at TEXT
	);

	-- Tank tables
	CREATE TABLE IF NOT EXISTS tank_levels (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		tank_id TEXT NOT NULL,
		product TEXT NOT NULL,
		level REAL NOT NULL DEFAULT 0,
		volume REAL NOT NULL DEFAULT 0,
		capacity REAL NOT NULL DEFAULT 0,
		color TEXT NOT NULL DEFAULT '#FFFFFF'
	);

	CREATE TABLE IF NOT EXISTS tank_inventory_trend (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		date TEXT NOT NULL,
		gasoline REAL NOT NULL DEFAULT 0,
		diesel REAL NOT NULL DEFAULT 0,
		crude REAL NOT NULL DEFAULT 0,
		ethanol REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS tank_throughput (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		date TEXT NOT NULL,
		receipts REAL NOT NULL DEFAULT 0,
		dispatches REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS tank_product_distribution (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		product TEXT NOT NULL,
		volume REAL NOT NULL DEFAULT 0,
		color TEXT NOT NULL DEFAULT '#FFFFFF'
	);

	CREATE TABLE IF NOT EXISTS tank_level_changes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		tank_id TEXT NOT NULL,
		change_val REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS tank_temperatures (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		tank_id TEXT NOT NULL,
		t00 REAL NOT NULL DEFAULT 0,
		t06 REAL NOT NULL DEFAULT 0,
		t12 REAL NOT NULL DEFAULT 0,
		t18 REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS tank_kpis (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		total_inventory REAL NOT NULL DEFAULT 0,
		available_capacity REAL NOT NULL DEFAULT 0,
		tanks_in_operation INTEGER NOT NULL DEFAULT 0,
		tanks_total INTEGER NOT NULL DEFAULT 0,
		current_throughput REAL NOT NULL DEFAULT 0,
		avg_temperature REAL NOT NULL DEFAULT 0,
		active_alarms INTEGER NOT NULL DEFAULT 0,
		daily_receipts REAL NOT NULL DEFAULT 0,
		daily_dispatches REAL NOT NULL DEFAULT 0,
		updated_at TEXT
	);

	-- SubStation tables
	CREATE TABLE IF NOT EXISTS substation_voltage_profile (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		time TEXT NOT NULL,
		v_ry REAL NOT NULL DEFAULT 0,
		v_yb REAL NOT NULL DEFAULT 0,
		v_br REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS substation_transformers (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		loading REAL NOT NULL DEFAULT 0,
		capacity REAL NOT NULL DEFAULT 0,
		unit TEXT NOT NULL DEFAULT ''
	);

	CREATE TABLE IF NOT EXISTS substation_harmonics (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		harmonic_order TEXT NOT NULL,
		magnitude REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS substation_transformer_temp (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		time TEXT NOT NULL,
		oil_temp REAL NOT NULL DEFAULT 0,
		winding_temp REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS substation_feeder_distribution (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		time TEXT NOT NULL,
		feeder1 REAL NOT NULL DEFAULT 0,
		feeder2 REAL NOT NULL DEFAULT 0,
		feeder3 REAL NOT NULL DEFAULT 0,
		feeder4 REAL NOT NULL DEFAULT 0,
		feeder5 REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS substation_fault_events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		day TEXT NOT NULL,
		h08 INTEGER NOT NULL DEFAULT 0,
		h09 INTEGER NOT NULL DEFAULT 0,
		h10 INTEGER NOT NULL DEFAULT 0,
		h11 INTEGER NOT NULL DEFAULT 0,
		h12 INTEGER NOT NULL DEFAULT 0,
		h13 INTEGER NOT NULL DEFAULT 0,
		h14 INTEGER NOT NULL DEFAULT 0,
		h15 INTEGER NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS substation_kpis (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		incoming_voltage REAL NOT NULL DEFAULT 0,
		total_load REAL NOT NULL DEFAULT 0,
		transformer_temp REAL NOT NULL DEFAULT 0,
		frequency REAL NOT NULL DEFAULT 0,
		thd REAL NOT NULL DEFAULT 0,
		breakers_closed INTEGER NOT NULL DEFAULT 0,
		breakers_total INTEGER NOT NULL DEFAULT 0,
		fault_events_24h INTEGER NOT NULL DEFAULT 0,
		busbar_balance REAL NOT NULL DEFAULT 0,
		updated_at TEXT
	);
	`

	_, err := db.conn.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create table: %w", err)
	}

	// Migrate existing railcars table: add Savana columns if missing
	for _, col := range []string{"spot", "product", "tank"} {
		_, err := db.conn.Exec("ALTER TABLE railcars ADD COLUMN " + col + " TEXT")
		if err != nil && !strings.Contains(err.Error(), "duplicate column name") {
			return fmt.Errorf("add column %s: %w", col, err)
		}
	}

	return nil
}
