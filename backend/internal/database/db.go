package database

import (
	"database/sql"
	"fmt"
	"strings"

	_ "github.com/mattn/go-sqlite3"
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
