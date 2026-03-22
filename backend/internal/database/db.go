package database

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "github.com/lib/pq"
	_ "github.com/mattn/go-sqlite3"

	"railcarlist/internal/config"
	"railcarlist/internal/models"
)

// DB wraps the database connection
type DB struct {
	conn   *sql.DB
	dbType string // "sqlite" or "postgres"
}

// ph returns ? for sqlite, $n for postgres
func (d *DB) ph(n int) string {
	if d.dbType == "postgres" {
		return fmt.Sprintf("$%d", n)
	}
	return "?"
}

// placeholders returns "?, ?, ?" for sqlite, "$1, $2, $3" for postgres
func (d *DB) placeholders(count int) string {
	parts := make([]string, count)
	for i := range parts {
		parts[i] = d.ph(i + 1)
	}
	return strings.Join(parts, ", ")
}

// placeholdersFrom returns placeholders starting from a given offset (1-based).
// E.g. placeholdersFrom(3, 2) returns "$3, $4" for postgres or "?, ?" for sqlite.
func (d *DB) placeholdersFrom(start, count int) string {
	parts := make([]string, count)
	for i := range parts {
		parts[i] = d.ph(start + i)
	}
	return strings.Join(parts, ", ")
}

// autoIncrement returns the appropriate auto-increment syntax
func (d *DB) autoIncrement() string {
	if d.dbType == "postgres" {
		return "SERIAL PRIMARY KEY"
	}
	return "INTEGER PRIMARY KEY AUTOINCREMENT"
}

// nowExpr returns the SQL expression for current timestamp
func (d *DB) nowExpr() string {
	if d.dbType == "postgres" {
		return "NOW()"
	}
	return "datetime('now')"
}

// upsertSQL builds an INSERT ... ON CONFLICT (for postgres) or INSERT OR REPLACE (for sqlite) statement.
func (d *DB) upsertSQL(table string, cols []string, conflictCol string) string {
	ph := make([]string, len(cols))
	updates := make([]string, 0)
	for i, col := range cols {
		ph[i] = d.ph(i + 1)
		if col != conflictCol {
			updates = append(updates, fmt.Sprintf("%s = EXCLUDED.%s", col, col))
		}
	}
	if d.dbType == "postgres" {
		return fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (%s) DO UPDATE SET %s",
			table, strings.Join(cols, ", "), strings.Join(ph, ", "),
			conflictCol, strings.Join(updates, ", "))
	}
	return fmt.Sprintf("INSERT OR REPLACE INTO %s (%s) VALUES (%s)",
		table, strings.Join(cols, ", "), strings.Join(ph, ", "))
}

// insertIgnoreSQL builds an INSERT ... ON CONFLICT DO NOTHING (postgres) or INSERT OR IGNORE (sqlite) statement.
func (d *DB) insertIgnoreSQL(table string, cols []string) string {
	ph := make([]string, len(cols))
	for i := range cols {
		ph[i] = d.ph(i + 1)
	}
	if d.dbType == "postgres" {
		return fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) ON CONFLICT DO NOTHING",
			table, strings.Join(cols, ", "), strings.Join(ph, ", "))
	}
	return fmt.Sprintf("INSERT OR IGNORE INTO %s (%s) VALUES (%s)",
		table, strings.Join(cols, ", "), strings.Join(ph, ", "))
}

// NewDB creates a new database connection and runs migrations
func NewDB(cfg config.DatabaseConfig) (*DB, error) {
	dbType := cfg.DBType
	if dbType == "" {
		dbType = "sqlite"
	}

	var conn *sql.DB
	var err error

	switch dbType {
	case "postgres":
		conn, err = sql.Open("postgres", cfg.PostgresConnString())
	default:
		dbType = "sqlite"
		path := cfg.Path
		if path == "" {
			path = "railcarlist.db"
		}
		conn, err = sql.Open("sqlite3", path)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db := &DB{conn: conn, dbType: dbType}

	if err := db.migrate(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return db, nil
}

// DBType returns the database type ("sqlite" or "postgres")
func (db *DB) DBType() string {
	return db.dbType
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
	_, err := db.conn.Exec("DELETE FROM railcarlist_raws WHERE tag = "+db.ph(1), tag)
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
	ph := db.placeholders(len(tags))
	query := "SELECT tag, MAX(timestamp) as max_ts FROM railcarlist_raws WHERE tag IN (" + ph + ") GROUP BY tag"
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
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO tags (tag, created_at, updated_at, source) VALUES (%s, %s, %s, %s)",
		db.ph(1), db.ph(2), db.ph(3), db.ph(4)),
		tag, createdAt, updatedAt, source)
	if err != nil {
		return fmt.Errorf("insert tag: %w", err)
	}
	return nil
}

// InsertTagIfNotExists inserts a tag into the tags table if it does not already exist (for upload/load)
func (db *DB) InsertTagIfNotExists(tag, createdAt, updatedAt, source string) error {
	q := db.insertIgnoreSQL("tags", []string{"tag", "created_at", "updated_at", "source"})
	_, err := db.conn.Exec(q, tag, createdAt, updatedAt, source)
	if err != nil {
		return fmt.Errorf("insert tag if not exists: %w", err)
	}
	return nil
}

// UpdateTagUpdatedAt sets updated_at for a tag
func (db *DB) UpdateTagUpdatedAt(tag, updatedAt string) error {
	_, err := db.conn.Exec(fmt.Sprintf("UPDATE tags SET updated_at = %s WHERE tag = %s", db.ph(1), db.ph(2)), updatedAt, tag)
	if err != nil {
		return fmt.Errorf("update tag: %w", err)
	}
	return nil
}

// DeleteTag removes a tag from the tags table
func (db *DB) DeleteTag(tag string) error {
	_, err := db.conn.Exec("DELETE FROM tags WHERE tag = "+db.ph(1), tag)
	if err != nil {
		return fmt.Errorf("delete tag: %w", err)
	}
	return nil
}

// ListTagsPaginated returns a page of rows from the tags table
func (db *DB) ListTagsPaginated(offset, limit int) ([]TagRow, error) {
	rows, err := db.conn.Query(fmt.Sprintf("SELECT tag, created_at, updated_at, source FROM tags ORDER BY tag LIMIT %s OFFSET %s", db.ph(1), db.ph(2)), limit, offset)
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
	err := db.conn.QueryRow("SELECT COUNT(*) FROM tags WHERE LOWER(tag) LIKE LOWER("+db.ph(1)+")", pattern).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("count tags with search: %w", err)
	}
	return n, nil
}

// ListTagsPaginatedWithSearch returns a page of tag rows filtered by search term (case-insensitive)
func (db *DB) ListTagsPaginatedWithSearch(offset, limit int, search string) ([]TagRow, error) {
	pattern := "%" + search + "%"
	rows, err := db.conn.Query(fmt.Sprintf("SELECT tag, created_at, updated_at, source FROM tags WHERE LOWER(tag) LIKE LOWER(%s) ORDER BY tag LIMIT %s OFFSET %s",
		db.ph(1), db.ph(2), db.ph(3)), pattern, limit, offset)
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
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO railcars (id, name, start_time, end_time, spot, product, tank) VALUES (%s)",
		db.placeholders(7)),
		id, name, startTime, endTime, spot, product, tank)
	if err != nil {
		return fmt.Errorf("insert railcar: %w", err)
	}
	return nil
}

// GetRailcarByID returns a single railcar by id or nil if not found
func (db *DB) GetRailcarByID(id string) (*RailcarRow, error) {
	var r RailcarRow
	err := db.conn.QueryRow("SELECT id, name, start_time, end_time, COALESCE(spot,''), COALESCE(product,''), COALESCE(tank,'') FROM railcars WHERE id = "+db.ph(1), id).
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
	query := fmt.Sprintf("SELECT id, name, start_time, end_time, COALESCE(spot,''), COALESCE(product,''), COALESCE(tank,'') FROM railcars ORDER BY %s LIMIT %s OFFSET %s", col, db.ph(1), db.ph(2))
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
	res, err := db.conn.Exec(fmt.Sprintf("UPDATE railcars SET name = %s, start_time = %s, end_time = %s, spot = %s, product = %s, tank = %s WHERE id = %s",
		db.ph(1), db.ph(2), db.ph(3), db.ph(4), db.ph(5), db.ph(6), db.ph(7)),
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
	res, err := db.conn.Exec("DELETE FROM railcars WHERE id = "+db.ph(1), id)
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

// buildHistoryWhere builds a WHERE clause for recorded_at range filtering.
func parseTime(s string) (int64, error) {
	for _, layout := range []string{
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05",
		"2006-01-02",
	} {
		if t, err := time.Parse(layout, s); err == nil {
			return t.UnixMilli(), nil
		}
	}
	return 0, fmt.Errorf("cannot parse time: %s", s)
}

func (db *DB) buildHistoryWhere(params models.HistoryParams) (string, []interface{}) {
	var args []interface{}
	if params.Start == "" && params.End == "" {
		return "", args
	}
	conditions := []string{}
	if params.Start != "" {
		ms, err := parseTime(params.Start)
		if err == nil {
			args = append(args, ms)
			conditions = append(conditions, "recorded_at >= "+db.ph(len(args)))
		}
	}
	if params.End != "" {
		ms, err := parseTime(params.End)
		if err == nil {
			// End date: add 24h-1ms to include the full day
			if !strings.Contains(params.End, "T") {
				ms += 86400000 - 1
			}
			args = append(args, ms)
			conditions = append(conditions, "recorded_at <= "+db.ph(len(args)))
		}
	}
	if len(conditions) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(conditions, " AND "), args
}

// applyPagination appends LIMIT/OFFSET to a query if pagination is requested.
func applyPagination(query string, params models.HistoryParams) string {
	if params.Page > 0 {
		limit := params.Limit
		if limit <= 0 {
			limit = 100
		}
		offset := (params.Page - 1) * limit
		query += fmt.Sprintf(" LIMIT %d OFFSET %d", limit, offset)
	}
	return query
}

// --- Electricity DB Methods ---

func (db *DB) InsertElectricityLoadProfile(lp models.ElectricityLoadProfile, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO electricity_load_profiles (actual, planned, threshold, recorded_at) VALUES (%s)", db.placeholders(4)),
		lp.Actual, lp.Planned, lp.Threshold, recordedAt)
	return err
}

func (db *DB) ListElectricityLoadProfiles(params models.HistoryParams) ([]models.ElectricityLoadProfile, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM electricity_load_profiles"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, actual, planned, threshold FROM electricity_load_profiles" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.ElectricityLoadProfile
	for rows.Next() {
		var r models.ElectricityLoadProfile
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.Actual, &r.Planned, &r.Threshold); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllElectricityLoadProfiles() error {
	_, err := db.conn.Exec("DELETE FROM electricity_load_profiles")
	return err
}

func (db *DB) InsertElectricityWeeklyConsumption(wc models.ElectricityWeeklyConsumption, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO electricity_weekly_consumption (this_week, last_week, recorded_at) VALUES (%s)", db.placeholders(3)),
		wc.ThisWeek, wc.LastWeek, recordedAt)
	return err
}

func (db *DB) ListElectricityWeeklyConsumption(params models.HistoryParams) ([]models.ElectricityWeeklyConsumption, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM electricity_weekly_consumption"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, this_week, last_week FROM electricity_weekly_consumption" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.ElectricityWeeklyConsumption
	for rows.Next() {
		var r models.ElectricityWeeklyConsumption
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.ThisWeek, &r.LastWeek); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllElectricityWeeklyConsumption() error {
	_, err := db.conn.Exec("DELETE FROM electricity_weekly_consumption")
	return err
}

func (db *DB) InsertElectricityPowerFactor(pf models.ElectricityPowerFactor, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO electricity_power_factor (value, recorded_at) VALUES (%s)", db.placeholders(2)), pf.Value, recordedAt)
	return err
}

func (db *DB) ListElectricityPowerFactor(params models.HistoryParams) ([]models.ElectricityPowerFactor, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM electricity_power_factor"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, value FROM electricity_power_factor" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.ElectricityPowerFactor
	for rows.Next() {
		var r models.ElectricityPowerFactor
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.Value); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllElectricityPowerFactor() error {
	_, err := db.conn.Exec("DELETE FROM electricity_power_factor")
	return err
}

func (db *DB) InsertElectricityCostBreakdown(cb models.ElectricityCostBreakdown) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO electricity_cost_breakdown (source, cost, color) VALUES (%s)", db.placeholders(3)),
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

func (db *DB) InsertElectricityPeakDemand(pd models.ElectricityPeakDemand, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO electricity_peak_demand (peak, recorded_at) VALUES (%s)", db.placeholders(2)), pd.Peak, recordedAt)
	return err
}

func (db *DB) ListElectricityPeakDemand(params models.HistoryParams) ([]models.ElectricityPeakDemand, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM electricity_peak_demand"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, peak FROM electricity_peak_demand" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.ElectricityPeakDemand
	for rows.Next() {
		var r models.ElectricityPeakDemand
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.Peak); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllElectricityPeakDemand() error {
	_, err := db.conn.Exec("DELETE FROM electricity_peak_demand")
	return err
}

func (db *DB) InsertElectricityPhaseBalance(pb models.ElectricityPhaseBalance, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO electricity_phase_balance (phase_a, phase_b, phase_c, recorded_at) VALUES (%s)", db.placeholders(4)),
		pb.PhaseA, pb.PhaseB, pb.PhaseC, recordedAt)
	return err
}

func (db *DB) ListElectricityPhaseBalance(params models.HistoryParams) ([]models.ElectricityPhaseBalance, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM electricity_phase_balance"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, phase_a, phase_b, phase_c FROM electricity_phase_balance" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.ElectricityPhaseBalance
	for rows.Next() {
		var r models.ElectricityPhaseBalance
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.PhaseA, &r.PhaseB, &r.PhaseC); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllElectricityPhaseBalance() error {
	_, err := db.conn.Exec("DELETE FROM electricity_phase_balance")
	return err
}

func (db *DB) UpsertElectricityKPIs(kpis models.ElectricityKPIs) error {
	q := db.upsertSQL("electricity_kpis",
		[]string{"id", "total_consumption", "real_time_demand", "peak_demand", "power_factor", "energy_cost", "carbon_emissions", "grid_availability", "transformer_load", "updated_at"},
		"id")
	_, err := db.conn.Exec(q,
		1, kpis.TotalConsumption, kpis.RealTimeDemand, kpis.PeakDemand, kpis.PowerFactor,
		kpis.EnergyCost, kpis.CarbonEmissions, kpis.GridAvailability, kpis.TransformerLoad, time.Now().UTC().Format("2006-01-02T15:04:05"))
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

func (db *DB) InsertSteamBalance(item models.SteamBalance, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO steam_balance (boiler1, boiler2, boiler3, demand, recorded_at) VALUES (%s)", db.placeholders(5)),
		item.Boiler1, item.Boiler2, item.Boiler3, item.Demand, recordedAt)
	return err
}

func (db *DB) ListSteamBalance(params models.HistoryParams) ([]models.SteamBalance, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM steam_balance"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, boiler1, boiler2, boiler3, demand FROM steam_balance" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.SteamBalance
	for rows.Next() {
		var r models.SteamBalance
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.Boiler1, &r.Boiler2, &r.Boiler3, &r.Demand); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllSteamBalance() error {
	_, err := db.conn.Exec("DELETE FROM steam_balance")
	return err
}

func (db *DB) InsertSteamHeaderPressure(item models.SteamHeaderPressure, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO steam_header_pressure (hp, mp, lp, recorded_at) VALUES (%s)", db.placeholders(4)),
		item.HP, item.MP, item.LP, recordedAt)
	return err
}

func (db *DB) ListSteamHeaderPressure(params models.HistoryParams) ([]models.SteamHeaderPressure, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM steam_header_pressure"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, hp, mp, lp FROM steam_header_pressure" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.SteamHeaderPressure
	for rows.Next() {
		var r models.SteamHeaderPressure
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.HP, &r.MP, &r.LP); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllSteamHeaderPressure() error {
	_, err := db.conn.Exec("DELETE FROM steam_header_pressure")
	return err
}

func (db *DB) InsertSteamDistribution(item models.SteamDistribution) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO steam_distribution (consumer, value, color) VALUES (%s)", db.placeholders(3)),
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

func (db *DB) InsertSteamCondensate(item models.SteamCondensate, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO steam_condensate (recovery, recorded_at) VALUES (%s)", db.placeholders(2)),
		item.Recovery, recordedAt)
	return err
}

func (db *DB) ListSteamCondensate(params models.HistoryParams) ([]models.SteamCondensate, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM steam_condensate"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, recovery FROM steam_condensate" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.SteamCondensate
	for rows.Next() {
		var r models.SteamCondensate
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.Recovery); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllSteamCondensate() error {
	_, err := db.conn.Exec("DELETE FROM steam_condensate")
	return err
}

func (db *DB) InsertSteamFuelRatio(item models.SteamFuelRatio, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO steam_fuel_ratio (fuel, steam, recorded_at) VALUES (%s)", db.placeholders(3)),
		item.Fuel, item.Steam, recordedAt)
	return err
}

func (db *DB) ListSteamFuelRatio(params models.HistoryParams) ([]models.SteamFuelRatio, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM steam_fuel_ratio"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, fuel, steam FROM steam_fuel_ratio" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.SteamFuelRatio
	for rows.Next() {
		var r models.SteamFuelRatio
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.Fuel, &r.Steam); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllSteamFuelRatio() error {
	_, err := db.conn.Exec("DELETE FROM steam_fuel_ratio")
	return err
}

func (db *DB) InsertSteamLoss(item models.SteamLoss) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO steam_loss (location, loss, traps_total, traps_failed) VALUES (%s)", db.placeholders(4)),
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
	q := db.upsertSQL("steam_kpis",
		[]string{"id", "total_production", "total_demand", "header_pressure", "steam_temperature", "system_efficiency", "condensate_recovery", "makeup_water_flow", "fuel_consumption", "updated_at"},
		"id")
	_, err := db.conn.Exec(q,
		1, kpis.TotalProduction, kpis.TotalDemand, kpis.HeaderPressure, kpis.SteamTemperature,
		kpis.SystemEfficiency, kpis.CondensateRecovery, kpis.MakeupWaterFlow, kpis.FuelConsumption, time.Now().UTC().Format("2006-01-02T15:04:05"))
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
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO boiler_readings (boiler_id, efficiency, load, steam_output) VALUES (%s)", db.placeholders(4)),
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

func (db *DB) InsertBoilerEfficiencyTrend(item models.BoilerEfficiencyTrend, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO boiler_efficiency_trend (blr01, blr02, blr03, blr04, recorded_at) VALUES (%s)", db.placeholders(5)),
		item.Blr01, item.Blr02, item.Blr03, item.Blr04, recordedAt)
	return err
}

func (db *DB) ListBoilerEfficiencyTrend(params models.HistoryParams) ([]models.BoilerEfficiencyTrend, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM boiler_efficiency_trend"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, blr01, blr02, blr03, blr04 FROM boiler_efficiency_trend" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.BoilerEfficiencyTrend
	for rows.Next() {
		var r models.BoilerEfficiencyTrend
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.Blr01, &r.Blr02, &r.Blr03, &r.Blr04); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllBoilerEfficiencyTrend() error {
	_, err := db.conn.Exec("DELETE FROM boiler_efficiency_trend")
	return err
}

func (db *DB) InsertBoilerCombustion(item models.BoilerCombustion) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO boiler_combustion (boiler_id, o2, co2, co, nox) VALUES (%s)", db.placeholders(5)),
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

func (db *DB) InsertBoilerSteamFuel(item models.BoilerSteamFuel, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO boiler_steam_fuel (steam, fuel, recorded_at) VALUES (%s)", db.placeholders(3)),
		item.Steam, item.Fuel, recordedAt)
	return err
}

func (db *DB) ListBoilerSteamFuel(params models.HistoryParams) ([]models.BoilerSteamFuel, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM boiler_steam_fuel"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, steam, fuel FROM boiler_steam_fuel" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.BoilerSteamFuel
	for rows.Next() {
		var r models.BoilerSteamFuel
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.Steam, &r.Fuel); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllBoilerSteamFuel() error {
	_, err := db.conn.Exec("DELETE FROM boiler_steam_fuel")
	return err
}

func (db *DB) InsertBoilerEmission(item models.BoilerEmission) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO boiler_emissions (pollutant, current_val, limit_val, unit) VALUES (%s)", db.placeholders(4)),
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

func (db *DB) InsertBoilerStackTemp(item models.BoilerStackTemp, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO boiler_stack_temp (blr01, blr02, blr03, recorded_at) VALUES (%s)", db.placeholders(4)),
		item.Blr01, item.Blr02, item.Blr03, recordedAt)
	return err
}

func (db *DB) ListBoilerStackTemp(params models.HistoryParams) ([]models.BoilerStackTemp, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM boiler_stack_temp"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, blr01, blr02, blr03 FROM boiler_stack_temp" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.BoilerStackTemp
	for rows.Next() {
		var r models.BoilerStackTemp
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.Blr01, &r.Blr02, &r.Blr03); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllBoilerStackTemp() error {
	_, err := db.conn.Exec("DELETE FROM boiler_stack_temp")
	return err
}

func (db *DB) UpsertBoilerKPIs(kpis models.BoilerKPIs) error {
	q := db.upsertSQL("boiler_kpis",
		[]string{"id", "boilers_online", "boilers_total", "total_steam_output", "fleet_efficiency", "avg_stack_temp", "total_fuel_rate", "avg_o2", "co_emissions", "nox_emissions", "updated_at"},
		"id")
	_, err := db.conn.Exec(q,
		1, kpis.BoilersOnline, kpis.BoilersTotal, kpis.TotalSteamOutput, kpis.FleetEfficiency,
		kpis.AvgStackTemp, kpis.TotalFuelRate, kpis.AvgO2, kpis.CoEmissions, kpis.NoxEmissions, time.Now().UTC().Format("2006-01-02T15:04:05"))
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
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO tank_levels (tank_id, product, level, volume, capacity, color) VALUES (%s)", db.placeholders(6)),
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

func (db *DB) InsertTankInventoryTrend(item models.TankInventoryTrend, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO tank_inventory_trend (gasoline, diesel, crude, ethanol, recorded_at) VALUES (%s)", db.placeholders(5)),
		item.Gasoline, item.Diesel, item.Crude, item.Ethanol, recordedAt)
	return err
}

func (db *DB) ListTankInventoryTrend(params models.HistoryParams) ([]models.TankInventoryTrend, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM tank_inventory_trend"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, gasoline, diesel, crude, ethanol FROM tank_inventory_trend" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.TankInventoryTrend
	for rows.Next() {
		var r models.TankInventoryTrend
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.Gasoline, &r.Diesel, &r.Crude, &r.Ethanol); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllTankInventoryTrend() error {
	_, err := db.conn.Exec("DELETE FROM tank_inventory_trend")
	return err
}

func (db *DB) InsertTankThroughput(item models.TankThroughput, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO tank_throughput (receipts, dispatches, recorded_at) VALUES (%s)", db.placeholders(3)),
		item.Receipts, item.Dispatches, recordedAt)
	return err
}

func (db *DB) ListTankThroughput(params models.HistoryParams) ([]models.TankThroughput, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM tank_throughput"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, receipts, dispatches FROM tank_throughput" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.TankThroughput
	for rows.Next() {
		var r models.TankThroughput
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.Receipts, &r.Dispatches); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllTankThroughput() error {
	_, err := db.conn.Exec("DELETE FROM tank_throughput")
	return err
}

func (db *DB) InsertTankProductDistribution(item models.TankProductDistribution) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO tank_product_distribution (product, volume, color) VALUES (%s)", db.placeholders(3)),
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
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO tank_level_changes (tank_id, change_val) VALUES (%s)", db.placeholders(2)),
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
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO tank_temperatures (tank_id, t00, t06, t12, t18) VALUES (%s)", db.placeholders(5)),
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
	q := db.upsertSQL("tank_kpis",
		[]string{"id", "total_inventory", "available_capacity", "tanks_in_operation", "tanks_total", "current_throughput", "avg_temperature", "active_alarms", "daily_receipts", "daily_dispatches", "updated_at"},
		"id")
	_, err := db.conn.Exec(q,
		1, kpis.TotalInventory, kpis.AvailableCapacity, kpis.TanksInOperation, kpis.TanksTotal,
		kpis.CurrentThroughput, kpis.AvgTemperature, kpis.ActiveAlarms, kpis.DailyReceipts, kpis.DailyDispatches, time.Now().UTC().Format("2006-01-02T15:04:05"))
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

func (db *DB) InsertSubStationVoltageProfile(item models.SubStationVoltageProfile, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO substation_voltage_profile (v_ry, v_yb, v_br, recorded_at) VALUES (%s)", db.placeholders(4)),
		item.VRY, item.VYB, item.VBR, recordedAt)
	return err
}

func (db *DB) ListSubStationVoltageProfile(params models.HistoryParams) ([]models.SubStationVoltageProfile, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM substation_voltage_profile"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, v_ry, v_yb, v_br FROM substation_voltage_profile" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.SubStationVoltageProfile
	for rows.Next() {
		var r models.SubStationVoltageProfile
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.VRY, &r.VYB, &r.VBR); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllSubStationVoltageProfile() error {
	_, err := db.conn.Exec("DELETE FROM substation_voltage_profile")
	return err
}

func (db *DB) InsertSubStationTransformer(item models.SubStationTransformer) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO substation_transformers (name, loading, capacity, unit) VALUES (%s)", db.placeholders(4)),
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
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO substation_harmonics (harmonic_order, magnitude) VALUES (%s)", db.placeholders(2)),
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

func (db *DB) InsertSubStationTransformerTemp(item models.SubStationTransformerTemp, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO substation_transformer_temp (oil_temp, winding_temp, recorded_at) VALUES (%s)", db.placeholders(3)),
		item.OilTemp, item.WindTemp, recordedAt)
	return err
}

func (db *DB) ListSubStationTransformerTemp(params models.HistoryParams) ([]models.SubStationTransformerTemp, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM substation_transformer_temp"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, oil_temp, winding_temp FROM substation_transformer_temp" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.SubStationTransformerTemp
	for rows.Next() {
		var r models.SubStationTransformerTemp
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.OilTemp, &r.WindTemp); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllSubStationTransformerTemp() error {
	_, err := db.conn.Exec("DELETE FROM substation_transformer_temp")
	return err
}

func (db *DB) InsertSubStationFeederDistribution(item models.SubStationFeederDistribution, recordedAt int64) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO substation_feeder_distribution (feeder1, feeder2, feeder3, feeder4, feeder5, recorded_at) VALUES (%s)", db.placeholders(6)),
		item.Feeder1, item.Feeder2, item.Feeder3, item.Feeder4, item.Feeder5, recordedAt)
	return err
}

func (db *DB) ListSubStationFeederDistribution(params models.HistoryParams) ([]models.SubStationFeederDistribution, int, error) {
	where, args := db.buildHistoryWhere(params)
	var total int
	db.conn.QueryRow("SELECT COUNT(*) FROM substation_feeder_distribution"+where, args...).Scan(&total)
	query := "SELECT id, recorded_at, feeder1, feeder2, feeder3, feeder4, feeder5 FROM substation_feeder_distribution" + where + " ORDER BY recorded_at"
	query = applyPagination(query, params)
	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var results []models.SubStationFeederDistribution
	for rows.Next() {
		var r models.SubStationFeederDistribution
		if err := rows.Scan(&r.ID, &r.Timestamp, &r.Feeder1, &r.Feeder2, &r.Feeder3, &r.Feeder4, &r.Feeder5); err != nil {
			return nil, 0, err
		}
		results = append(results, r)
	}
	return results, total, nil
}

func (db *DB) DeleteAllSubStationFeederDistribution() error {
	_, err := db.conn.Exec("DELETE FROM substation_feeder_distribution")
	return err
}

func (db *DB) InsertSubStationFaultEvent(item models.SubStationFaultEvent) error {
	_, err := db.conn.Exec(fmt.Sprintf("INSERT INTO substation_fault_events (day, h08, h09, h10, h11, h12, h13, h14, h15) VALUES (%s)", db.placeholders(9)),
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
	q := db.upsertSQL("substation_kpis",
		[]string{"id", "incoming_voltage", "total_load", "transformer_temp", "frequency", "thd", "breakers_closed", "breakers_total", "fault_events_24h", "busbar_balance", "updated_at"},
		"id")
	_, err := db.conn.Exec(q,
		1, kpis.IncomingVoltage, kpis.TotalLoad, kpis.TransformerTemp, kpis.Frequency,
		kpis.THD, kpis.BreakersClosed, kpis.BreakersTotal, kpis.FaultEvents24h, kpis.BusbarBalance, time.Now().UTC().Format("2006-01-02T15:04:05"))
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
	autoInc := db.autoIncrement()

	// For PostgreSQL, REAL maps to DOUBLE PRECISION but both accept REAL in DDL.
	// We use separate Exec calls so PostgreSQL doesn't choke on multi-statement strings.
	ddlStatements := []string{
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS railcarlist_raws (
		id %s,
		tag TEXT NOT NULL,
		timestamp BIGINT NOT NULL,
		value REAL NOT NULL,
		quality INTEGER NOT NULL,
		UNIQUE(tag, timestamp)
	)`, autoInc),

		`CREATE INDEX IF NOT EXISTS idx_tag_timestamp ON railcarlist_raws(tag, timestamp)`,

		`CREATE TABLE IF NOT EXISTS tags (
		tag TEXT PRIMARY KEY,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		source TEXT NOT NULL DEFAULT 'custom'
	)`,

		`CREATE TABLE IF NOT EXISTS railcars (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		start_time TEXT NOT NULL,
		end_time TEXT NOT NULL,
		spot TEXT,
		product TEXT,
		tank TEXT
	)`,

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS electricity_load_profiles (
		id %s,
		hour TEXT NOT NULL,
		actual REAL NOT NULL DEFAULT 0,
		planned REAL NOT NULL DEFAULT 0,
		threshold REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS electricity_weekly_consumption (
		id %s,
		day TEXT NOT NULL,
		this_week REAL NOT NULL DEFAULT 0,
		last_week REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS electricity_power_factor (
		id %s,
		time TEXT NOT NULL,
		value REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS electricity_cost_breakdown (
		id %s,
		source TEXT NOT NULL,
		cost REAL NOT NULL DEFAULT 0,
		color TEXT NOT NULL DEFAULT '#FFFFFF'
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS electricity_peak_demand (
		id %s,
		date TEXT NOT NULL,
		peak REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS electricity_phase_balance (
		id %s,
		time TEXT NOT NULL,
		phase_a REAL NOT NULL DEFAULT 0,
		phase_b REAL NOT NULL DEFAULT 0,
		phase_c REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS electricity_kpis (
		id %s,
		total_consumption REAL NOT NULL DEFAULT 0,
		real_time_demand REAL NOT NULL DEFAULT 0,
		peak_demand REAL NOT NULL DEFAULT 0,
		power_factor REAL NOT NULL DEFAULT 0,
		energy_cost REAL NOT NULL DEFAULT 0,
		carbon_emissions REAL NOT NULL DEFAULT 0,
		grid_availability REAL NOT NULL DEFAULT 0,
		transformer_load REAL NOT NULL DEFAULT 0,
		updated_at TEXT
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS steam_balance (
		id %s,
		hour TEXT NOT NULL,
		boiler1 REAL NOT NULL DEFAULT 0,
		boiler2 REAL NOT NULL DEFAULT 0,
		boiler3 REAL NOT NULL DEFAULT 0,
		demand REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS steam_header_pressure (
		id %s,
		time TEXT NOT NULL,
		hp REAL NOT NULL DEFAULT 0,
		mp REAL NOT NULL DEFAULT 0,
		lp REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS steam_distribution (
		id %s,
		consumer TEXT NOT NULL,
		value REAL NOT NULL DEFAULT 0,
		color TEXT NOT NULL DEFAULT '#FFFFFF'
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS steam_condensate (
		id %s,
		hour TEXT NOT NULL,
		recovery REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS steam_fuel_ratio (
		id %s,
		hour TEXT NOT NULL,
		fuel REAL NOT NULL DEFAULT 0,
		steam REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS steam_loss (
		id %s,
		location TEXT NOT NULL,
		loss REAL NOT NULL DEFAULT 0,
		traps_total INTEGER NOT NULL DEFAULT 0,
		traps_failed INTEGER NOT NULL DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS steam_kpis (
		id %s,
		total_production REAL NOT NULL DEFAULT 0,
		total_demand REAL NOT NULL DEFAULT 0,
		header_pressure REAL NOT NULL DEFAULT 0,
		steam_temperature REAL NOT NULL DEFAULT 0,
		system_efficiency REAL NOT NULL DEFAULT 0,
		condensate_recovery REAL NOT NULL DEFAULT 0,
		makeup_water_flow REAL NOT NULL DEFAULT 0,
		fuel_consumption REAL NOT NULL DEFAULT 0,
		updated_at TEXT
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS boiler_readings (
		id %s,
		boiler_id TEXT NOT NULL,
		efficiency REAL NOT NULL DEFAULT 0,
		load REAL NOT NULL DEFAULT 0,
		steam_output REAL NOT NULL DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS boiler_efficiency_trend (
		id %s,
		date TEXT NOT NULL,
		blr01 REAL NOT NULL DEFAULT 0,
		blr02 REAL NOT NULL DEFAULT 0,
		blr03 REAL NOT NULL DEFAULT 0,
		blr04 REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS boiler_combustion (
		id %s,
		boiler_id TEXT NOT NULL,
		o2 REAL NOT NULL DEFAULT 0,
		co2 REAL NOT NULL DEFAULT 0,
		co REAL NOT NULL DEFAULT 0,
		nox REAL NOT NULL DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS boiler_steam_fuel (
		id %s,
		hour TEXT NOT NULL,
		steam REAL NOT NULL DEFAULT 0,
		fuel REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS boiler_emissions (
		id %s,
		pollutant TEXT NOT NULL,
		current_val REAL NOT NULL DEFAULT 0,
		limit_val REAL NOT NULL DEFAULT 0,
		unit TEXT NOT NULL DEFAULT ''
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS boiler_stack_temp (
		id %s,
		hour TEXT NOT NULL,
		blr01 REAL NOT NULL DEFAULT 0,
		blr02 REAL NOT NULL DEFAULT 0,
		blr03 REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS boiler_kpis (
		id %s,
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
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS tank_levels (
		id %s,
		tank_id TEXT NOT NULL,
		product TEXT NOT NULL,
		level REAL NOT NULL DEFAULT 0,
		volume REAL NOT NULL DEFAULT 0,
		capacity REAL NOT NULL DEFAULT 0,
		color TEXT NOT NULL DEFAULT '#FFFFFF'
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS tank_inventory_trend (
		id %s,
		date TEXT NOT NULL,
		gasoline REAL NOT NULL DEFAULT 0,
		diesel REAL NOT NULL DEFAULT 0,
		crude REAL NOT NULL DEFAULT 0,
		ethanol REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS tank_throughput (
		id %s,
		date TEXT NOT NULL,
		receipts REAL NOT NULL DEFAULT 0,
		dispatches REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS tank_product_distribution (
		id %s,
		product TEXT NOT NULL,
		volume REAL NOT NULL DEFAULT 0,
		color TEXT NOT NULL DEFAULT '#FFFFFF'
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS tank_level_changes (
		id %s,
		tank_id TEXT NOT NULL,
		change_val REAL NOT NULL DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS tank_temperatures (
		id %s,
		tank_id TEXT NOT NULL,
		t00 REAL NOT NULL DEFAULT 0,
		t06 REAL NOT NULL DEFAULT 0,
		t12 REAL NOT NULL DEFAULT 0,
		t18 REAL NOT NULL DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS tank_kpis (
		id %s,
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
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS substation_voltage_profile (
		id %s,
		time TEXT NOT NULL,
		v_ry REAL NOT NULL DEFAULT 0,
		v_yb REAL NOT NULL DEFAULT 0,
		v_br REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS substation_transformers (
		id %s,
		name TEXT NOT NULL,
		loading REAL NOT NULL DEFAULT 0,
		capacity REAL NOT NULL DEFAULT 0,
		unit TEXT NOT NULL DEFAULT ''
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS substation_harmonics (
		id %s,
		harmonic_order TEXT NOT NULL,
		magnitude REAL NOT NULL DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS substation_transformer_temp (
		id %s,
		time TEXT NOT NULL,
		oil_temp REAL NOT NULL DEFAULT 0,
		winding_temp REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS substation_feeder_distribution (
		id %s,
		time TEXT NOT NULL,
		feeder1 REAL NOT NULL DEFAULT 0,
		feeder2 REAL NOT NULL DEFAULT 0,
		feeder3 REAL NOT NULL DEFAULT 0,
		feeder4 REAL NOT NULL DEFAULT 0,
		feeder5 REAL NOT NULL DEFAULT 0,
		recorded_at BIGINT DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS substation_fault_events (
		id %s,
		day TEXT NOT NULL,
		h08 INTEGER NOT NULL DEFAULT 0,
		h09 INTEGER NOT NULL DEFAULT 0,
		h10 INTEGER NOT NULL DEFAULT 0,
		h11 INTEGER NOT NULL DEFAULT 0,
		h12 INTEGER NOT NULL DEFAULT 0,
		h13 INTEGER NOT NULL DEFAULT 0,
		h14 INTEGER NOT NULL DEFAULT 0,
		h15 INTEGER NOT NULL DEFAULT 0
	)`, autoInc),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS substation_kpis (
		id %s,
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
	)`, autoInc),
	}

	for _, stmt := range ddlStatements {
		if _, err := db.conn.Exec(stmt); err != nil {
			return fmt.Errorf("failed to create table: %w", err)
		}
	}

	// Migrate existing railcars table: add Savana columns if missing
	for _, col := range []string{"spot", "product", "tank"} {
		_, err := db.conn.Exec("ALTER TABLE railcars ADD COLUMN " + col + " TEXT")
		if err != nil {
			errMsg := err.Error()
			// SQLite: "duplicate column name", PostgreSQL: "already exists"
			if !strings.Contains(errMsg, "duplicate column name") && !strings.Contains(errMsg, "already exists") {
				return fmt.Errorf("add column %s: %w", col, err)
			}
		}
	}

	// Add recorded_at columns to all 17 history tables (ignore errors if already exists)
	alterStmts := []string{
		"ALTER TABLE electricity_load_profiles ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE electricity_weekly_consumption ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE electricity_power_factor ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE electricity_peak_demand ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE electricity_phase_balance ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE steam_balance ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE steam_header_pressure ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE steam_condensate ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE steam_fuel_ratio ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE boiler_efficiency_trend ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE boiler_steam_fuel ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE boiler_stack_temp ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE tank_inventory_trend ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE tank_throughput ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE substation_voltage_profile ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE substation_transformer_temp ADD COLUMN recorded_at BIGINT DEFAULT 0",
		"ALTER TABLE substation_feeder_distribution ADD COLUMN recorded_at BIGINT DEFAULT 0",
	}
	for _, stmt := range alterStmts {
		db.conn.Exec(stmt) // ignore error — column may already exist
	}

	return nil
}
