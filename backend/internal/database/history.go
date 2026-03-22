package database

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"railcarlist/internal/models"
)

// ColumnDef defines a column for aggregate queries.
type ColumnDef struct {
	Name    string // SQL column name
	AggFunc string // AVG, SUM, MAX, MIN, COUNT (empty = use AVG)
}

// HistoryQueryResult holds raw query results before scanning into domain types.
type HistoryQueryResult struct {
	Rows  *sql.Rows
	Total int
}

// timeBucketExpr returns a SQL expression that groups recorded_at into time buckets,
// appropriate for the current database dialect (sqlite or postgres).
func (d *DB) timeBucketExpr(mode string) (string, error) {
	if d.dbType == "postgres" {
		switch mode {
		case "hourly":
			return "to_char(to_timestamp(recorded_at/1000.0), 'YYYY-MM-DD HH24:00')", nil
		case "daily":
			return "to_char(to_timestamp(recorded_at/1000.0), 'YYYY-MM-DD')", nil
		case "weekly":
			return "to_char(to_timestamp(recorded_at/1000.0), 'IYYY-\"W\"IW')", nil
		case "monthly":
			return "to_char(to_timestamp(recorded_at/1000.0), 'YYYY-MM')", nil
		case "quarterly":
			return "'Q' || EXTRACT(QUARTER FROM to_timestamp(recorded_at/1000.0))::text || '-' || EXTRACT(YEAR FROM to_timestamp(recorded_at/1000.0))::text", nil
		case "yearly":
			return "to_char(to_timestamp(recorded_at/1000.0), 'YYYY')", nil
		}
	} else {
		switch mode {
		case "hourly":
			return "strftime('%Y-%m-%d %H:00', datetime(recorded_at/1000, 'unixepoch'))", nil
		case "daily":
			return "strftime('%Y-%m-%d', datetime(recorded_at/1000, 'unixepoch'))", nil
		case "weekly":
			return "strftime('%Y-W%W', datetime(recorded_at/1000, 'unixepoch'))", nil
		case "monthly":
			return "strftime('%Y-%m', datetime(recorded_at/1000, 'unixepoch'))", nil
		case "quarterly":
			return "strftime('%Y', datetime(recorded_at/1000, 'unixepoch')) || '-Q' || CASE WHEN CAST(strftime('%m', datetime(recorded_at/1000, 'unixepoch')) AS INTEGER) <= 3 THEN '1' WHEN CAST(strftime('%m', datetime(recorded_at/1000, 'unixepoch')) AS INTEGER) <= 6 THEN '2' WHEN CAST(strftime('%m', datetime(recorded_at/1000, 'unixepoch')) AS INTEGER) <= 9 THEN '3' ELSE '4' END", nil
		case "yearly":
			return "strftime('%Y', datetime(recorded_at/1000, 'unixepoch'))", nil
		}
	}
	return "", fmt.Errorf("unknown aggregate mode: %s", mode)
}

// QueryHistory executes a paginated + aggregated query on a history table.
// timeCol is the column containing the time label (hour, time, date, etc.).
// recordedAtCol is the timestamp column for range filtering (recorded_at).
// valueCols defines the numeric columns to aggregate.
//
// When aggregate is "raw" or empty, returns rows as-is with optional pagination.
// When aggregate is hourly/daily/weekly/monthly, groups by time bucket and applies agg functions.
func (d *DB) QueryHistory(table string, timeCol string, valueCols []ColumnDef, params models.HistoryParams) (*HistoryQueryResult, error) {
	var args []interface{}
	whereClause := ""

	// Date range filter on recorded_at
	if params.Start != "" || params.End != "" {
		conditions := []string{}
		if params.Start != "" {
			t, err := parseISO(params.Start)
			if err != nil {
				return nil, fmt.Errorf("invalid start time: %w", err)
			}
			args = append(args, t)
			conditions = append(conditions, "recorded_at >= "+d.ph(len(args)))
		}
		if params.End != "" {
			t, err := parseISO(params.End)
			if err != nil {
				return nil, fmt.Errorf("invalid end time: %w", err)
			}
			args = append(args, t)
			conditions = append(conditions, "recorded_at <= "+d.ph(len(args)))
		}
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	agg := strings.ToLower(params.Aggregate)
	if agg == "" {
		agg = "raw"
	}

	if agg == "raw" {
		return d.queryRaw(table, whereClause, args, params)
	}
	return d.queryAggregated(table, timeCol, valueCols, agg, whereClause, args, params)
}

func (d *DB) queryRaw(table, whereClause string, args []interface{}, params models.HistoryParams) (*HistoryQueryResult, error) {
	// Count total
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM %s%s", table, whereClause)
	var total int
	if err := d.conn.QueryRow(countSQL, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count %s: %w", table, err)
	}

	// Build select
	selectSQL := fmt.Sprintf("SELECT * FROM %s%s ORDER BY id", table, whereClause)

	// Pagination
	if params.Page > 0 {
		limit := params.Limit
		if limit <= 0 {
			limit = 100
		}
		offset := (params.Page - 1) * limit
		selectSQL += fmt.Sprintf(" LIMIT %d OFFSET %d", limit, offset)
	}

	rows, err := d.conn.Query(selectSQL, args...)
	if err != nil {
		return nil, fmt.Errorf("query %s: %w", table, err)
	}

	return &HistoryQueryResult{Rows: rows, Total: total}, nil
}

func (d *DB) queryAggregated(table, timeCol string, valueCols []ColumnDef, agg, whereClause string, args []interface{}, params models.HistoryParams) (*HistoryQueryResult, error) {
	// Build time bucket expression using dialect-aware helper
	timeBucket, err := d.timeBucketExpr(agg)
	if err != nil {
		return nil, err
	}

	// Build column expressions
	colExprs := []string{timeBucket + " AS time_bucket"}
	for _, col := range valueCols {
		aggFunc := col.AggFunc
		if aggFunc == "" {
			aggFunc = "AVG"
		}
		colExprs = append(colExprs, fmt.Sprintf("%s(%s) AS %s", aggFunc, col.Name, col.Name))
	}

	// Count total groups
	countSQL := fmt.Sprintf("SELECT COUNT(DISTINCT %s) FROM %s%s", timeBucket, table, whereClause)
	var total int
	if err := d.conn.QueryRow(countSQL, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count aggregated %s: %w", table, err)
	}

	// Build query
	selectSQL := fmt.Sprintf("SELECT %s FROM %s%s GROUP BY %s ORDER BY %s",
		strings.Join(colExprs, ", "), table, whereClause, timeBucket, timeBucket)

	// Pagination
	if params.Page > 0 {
		limit := params.Limit
		if limit <= 0 {
			limit = 100
		}
		offset := (params.Page - 1) * limit
		selectSQL += fmt.Sprintf(" LIMIT %d OFFSET %d", limit, offset)
	}

	rows, err := d.conn.Query(selectSQL, args...)
	if err != nil {
		return nil, fmt.Errorf("query aggregated %s: %w", table, err)
	}

	return &HistoryQueryResult{Rows: rows, Total: total}, nil
}

func parseISO(s string) (int64, error) {
	layouts := []string{
		"2006-01-02T15:04:05",
		"2006-01-02T15:04:05Z",
		"2006-01-02",
	}
	for _, layout := range layouts {
		t, err := time.Parse(layout, s)
		if err == nil {
			return t.UnixMilli(), nil
		}
	}
	return 0, fmt.Errorf("cannot parse time: %s", s)
}
