package services

import (
	"bytes"
	"database/sql"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"

	"railcarlist/internal/database"
	"railcarlist/internal/models"
)

// RailcarService handles railcar CRUD and XLSX import
type RailcarService struct {
	db *database.DB
}

// NewRailcarService creates a new RailcarService
func NewRailcarService(db *database.DB) *RailcarService {
	return &RailcarService{db: db}
}

// List returns all railcars
func (s *RailcarService) List() ([]models.Railcar, error) {
	rows, err := s.db.ListRailcars()
	if err != nil {
		return nil, err
	}
	out := make([]models.Railcar, len(rows))
	for i, r := range rows {
		out[i] = models.Railcar{ID: r.ID, Name: r.Name, StartTime: r.StartTime, EndTime: r.EndTime, Spot: r.Spot, Product: r.Product, Tank: r.Tank}
	}
	return out, nil
}

// ListPaginated returns a page of railcars and total count. sortBy: "startTime" (default), "name", "endTime" (maps to DB column start_time, name, end_time)
func (s *RailcarService) ListPaginated(page, limit int, sortBy string) ([]models.Railcar, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 5
	}
	total, err := s.db.CountRailcars()
	if err != nil {
		return nil, 0, err
	}
	orderBy := "start_time"
	switch sortBy {
	case "name", "endTime":
		if sortBy == "name" {
			orderBy = "name"
		} else {
			orderBy = "end_time"
		}
	default:
		orderBy = "start_time"
	}
	offset := (page - 1) * limit
	rows, err := s.db.ListRailcarsPaginated(offset, limit, orderBy)
	if err != nil {
		return nil, 0, err
	}
	out := make([]models.Railcar, len(rows))
	for i, r := range rows {
		out[i] = models.Railcar{ID: r.ID, Name: r.Name, StartTime: r.StartTime, EndTime: r.EndTime, Spot: r.Spot, Product: r.Product, Tank: r.Tank}
	}
	return out, total, nil
}

// GetByID returns one railcar or nil if not found
func (s *RailcarService) GetByID(id string) (*models.Railcar, error) {
	row, err := s.db.GetRailcarByID(id)
	if err != nil || row == nil {
		return nil, err
	}
	return &models.Railcar{ID: row.ID, Name: row.Name, StartTime: row.StartTime, EndTime: row.EndTime, Spot: row.Spot, Product: row.Product, Tank: row.Tank}, nil
}

// Create creates a new railcar; id is assigned (UUID)
func (s *RailcarService) Create(req models.CreateRailcarRequest) (*models.Railcar, error) {
	id := uuid.New().String()
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	startTime := normalizeTime(req.StartTime)
	endTime := normalizeTime(req.EndTime)
	spot := strings.TrimSpace(req.Spot)
	product := strings.TrimSpace(req.Product)
	tank := strings.TrimSpace(req.Tank)
	if err := s.db.InsertRailcar(id, name, startTime, endTime, spot, product, tank); err != nil {
		return nil, err
	}
	return &models.Railcar{ID: id, Name: name, StartTime: startTime, EndTime: endTime, Spot: spot, Product: product, Tank: tank}, nil
}

// Update updates an existing railcar; returns nil if not found
func (s *RailcarService) Update(id string, req models.UpdateRailcarRequest) (*models.Railcar, error) {
	row, err := s.db.GetRailcarByID(id)
	if err != nil || row == nil {
		return nil, err
	}
	name := row.Name
	startTime := row.StartTime
	endTime := row.EndTime
	spot := row.Spot
	product := row.Product
	tank := row.Tank
	if req.Name != nil {
		name = strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, fmt.Errorf("name cannot be empty")
		}
	}
	if req.StartTime != nil {
		startTime = normalizeTime(*req.StartTime)
	}
	if req.EndTime != nil {
		endTime = normalizeTime(*req.EndTime)
	}
	if req.Spot != nil {
		spot = strings.TrimSpace(*req.Spot)
	}
	if req.Product != nil {
		product = strings.TrimSpace(*req.Product)
	}
	if req.Tank != nil {
		tank = strings.TrimSpace(*req.Tank)
	}
	if err := s.db.UpdateRailcar(id, name, startTime, endTime, spot, product, tank); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &models.Railcar{ID: id, Name: name, StartTime: startTime, EndTime: endTime, Spot: spot, Product: product, Tank: tank}, nil
}

// Delete removes a railcar; returns false if not found
func (s *RailcarService) Delete(id string) (bool, error) {
	err := s.db.DeleteRailcar(id)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// DeleteAll removes all railcars; returns the number deleted.
func (s *RailcarService) DeleteAll() (int64, error) {
	return s.db.DeleteAllRailcars()
}

func normalizeTime(s string) string {
	return strings.TrimSpace(s)
}

// RailcarImportResult is the response for railcar XLSX import
type RailcarImportResult struct {
	Created int      `json:"created"`
	Errors  []string `json:"errors,omitempty"`
}

// ImportFromXLSXAuto detects format from the first sheet: Savana ("DAILY WORK SCHEDULE" in row 0) vs standard (name, startTime, endTime in row 0), then runs the appropriate importer.
func (s *RailcarService) ImportFromXLSXAuto(buf []byte, filename string) (*RailcarImportResult, error) {
	if len(buf) == 0 {
		return nil, fmt.Errorf("empty file")
	}
	f, err := excelize.OpenReader(bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("open xlsx: %w", err)
	}
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		f.Close()
		return nil, fmt.Errorf("no sheets in workbook")
	}
	rows, err := f.GetRows(sheets[0])
	f.Close()
	if err != nil || len(rows) == 0 {
		return nil, fmt.Errorf("sheet has no data")
	}
	row0 := rows[0]
	firstRowText := strings.ToLower(strings.Join(row0, " "))
	if strings.Contains(firstRowText, "daily work schedule") {
		return s.ImportFromSavanaXLSX(bytes.NewReader(buf), filename)
	}
	nameCol, startCol, endCol := findColumnIndices(row0)
	if nameCol >= 0 && startCol >= 0 && endCol >= 0 {
		return s.ImportFromXLSX(bytes.NewReader(buf))
	}
	return nil, fmt.Errorf("expected columns: name, startTime (or start_time), endTime (or end_time); got: %v", row0)
}

// ImportFromXLSX reads an XLSX file and creates railcars. Expected columns: name, startTime, endTime (or name, start_time, end_time). First row is header.
func (s *RailcarService) ImportFromXLSX(r io.Reader) (*RailcarImportResult, error) {
	buf, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("read file: %w", err)
	}
	f, err := excelize.OpenReader(bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("open xlsx: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("no sheets in workbook")
	}
	rows, err := f.GetRows(sheets[0])
	if err != nil || len(rows) < 2 {
		return nil, fmt.Errorf("sheet has no data or only header")
	}

	header := rows[0]
	nameCol, startCol, endCol := findColumnIndices(header)
	if nameCol < 0 || startCol < 0 || endCol < 0 {
		return nil, fmt.Errorf("expected columns: name, startTime (or start_time), endTime (or end_time); got: %v", header)
	}

	result := &RailcarImportResult{}
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		if len(row) <= nameCol || len(row) <= startCol || len(row) <= endCol {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: missing columns", i+1))
			continue
		}
		name := strings.TrimSpace(getCell(row, nameCol))
		startTime := strings.TrimSpace(getCell(row, startCol))
		endTime := strings.TrimSpace(getCell(row, endCol))
		if name == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: name is empty", i+1))
			continue
		}
		id := uuid.New().String()
		if err := s.db.InsertRailcar(id, name, startTime, endTime, "", "", ""); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: %v", i+1, err))
			continue
		}
		result.Created++
	}
	return result, nil
}

func getCell(row []string, col int) string {
	if col < len(row) {
		return row[col]
	}
	return ""
}

func findColumnIndices(header []string) (nameCol, startCol, endCol int) {
	nameCol = -1
	startCol = -1
	endCol = -1
	for i, h := range header {
		lower := strings.ToLower(strings.TrimSpace(h))
		switch lower {
		case "name":
			nameCol = i
		case "starttime", "start_time":
			startCol = i
		case "endtime", "end_time":
			endCol = i
		}
	}
	return nameCol, startCol, endCol
}

// Savana sheet header row is row 8 (0-based). Columns per PDF: STA#, CARRIER/CUSTOMER, T/T'S R/C'S(QTY), LOAD TIME, PRODUCT, TANK#
func findSavanaColumnIndices(header []string) (staCol, carrierCol, qtyCol, loadTimeCol, productCol, tankCol int) {
	staCol, carrierCol, qtyCol, loadTimeCol, productCol, tankCol = -1, -1, -1, -1, -1, -1
	for i, h := range header {
		trim := strings.TrimSpace(h)
		lower := strings.ToLower(trim)
		switch {
		case lower == "sta#" || lower == "sta":
			staCol = i
		case strings.Contains(lower, "carrier") || strings.Contains(lower, "customer"):
			carrierCol = i
		case strings.Contains(lower, "r/c") || strings.Contains(lower, "qty") || strings.Contains(lower, "t/t"):
			qtyCol = i
		case strings.Contains(lower, "load time"):
			loadTimeCol = i
		case lower == "product":
			productCol = i
		case lower == "tank#" || lower == "tank":
			tankCol = i
		}
	}
	return staCol, carrierCol, qtyCol, loadTimeCol, productCol, tankCol
}

var monthNames = []string{"jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"}

// parseMonthYearFromFilename extracts year and month from filename e.g. "APRIL 2026.xlsx" -> (2026, 4)
func parseMonthYearFromFilename(filename string) (year, month int, err error) {
	re := regexp.MustCompile(`(?i)(jan|feb|mar|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug|sep(?:t)?|oct|nov|dec)\s*(\d{4})`)
	matches := re.FindStringSubmatch(filename)
	if len(matches) < 3 {
		return 0, 0, fmt.Errorf("filename must contain month and year (e.g. APRIL 2026.xlsx)")
	}
	monthStr := strings.ToLower(matches[1])
	if len(monthStr) > 3 {
		monthStr = monthStr[:3]
	}
	year, _ = strconv.Atoi(matches[2])
	for i, m := range monthNames {
		if strings.HasPrefix(m, monthStr) || strings.HasPrefix(monthStr, m) {
			month = i + 1
			return year, month, nil
		}
	}
	return 0, 0, fmt.Errorf("invalid month in filename")
}

// sheetNameToDay converts "1st", "2nd", "3rd", "4th", ... "31st" to day 1..31
func sheetNameToDay(sheetName string) (int, bool) {
	re := regexp.MustCompile(`(?i)^(\d{1,2})(st|nd|rd|th)?$`)
	matches := re.FindStringSubmatch(strings.TrimSpace(sheetName))
	if len(matches) < 2 {
		return 0, false
	}
	day, _ := strconv.Atoi(matches[1])
	if day < 1 || day > 31 {
		return 0, false
	}
	return day, true
}

// ImportFromSavanaXLSX parses a Savana monthly schedule (per docs). filename used for month/year (e.g. APRIL 2026.xlsx).
func (s *RailcarService) ImportFromSavanaXLSX(r io.Reader, filename string) (*RailcarImportResult, error) {
	year, month, err := parseMonthYearFromFilename(filename)
	if err != nil {
		return nil, err
	}
	buf, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("read file: %w", err)
	}
	f, err := excelize.OpenReader(bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("open xlsx: %w", err)
	}
	defer f.Close()

	result := &RailcarImportResult{}
	loc := time.UTC

	for _, sheetName := range f.GetSheetList() {
		day, ok := sheetNameToDay(sheetName)
		if !ok {
			continue
		}
		rows, err := f.GetRows(sheetName)
		if err != nil || len(rows) <= 8 {
			continue
		}
		header := rows[8] // row 8 = schedule table header (per PDF)
		staCol, carrierCol, qtyCol, loadTimeCol, productCol, tankCol := findSavanaColumnIndices(header)
		if carrierCol < 0 {
			result.Errors = append(result.Errors, fmt.Sprintf("sheet %q: missing CARRIER/CUSTOMER column", sheetName))
			continue
		}
		// LOAD TIME optional; if missing use 00:00
		for rowIdx := 9; rowIdx < len(rows); rowIdx++ {
			row := rows[rowIdx]
			carrier := strings.TrimSpace(getCell(row, carrierCol))
			if carrier == "" {
				continue
			}
			sta := strings.TrimSpace(getCell(row, staCol))
			product := strings.TrimSpace(getCell(row, productCol))
			tank := strings.TrimSpace(getCell(row, tankCol))
			loadTimeStr := strings.TrimSpace(getCell(row, loadTimeCol))
			if loadTimeStr == "" {
				loadTimeStr = "00:00"
			}
			qty := 1
			if qtyCol >= 0 {
				if n, err := strconv.Atoi(strings.TrimSpace(getCell(row, qtyCol))); err == nil && n > 0 {
					qty = n
				}
			}
			// Build date for this sheet: year-month-day
			sheetDate := time.Date(year, time.Month(month), day, 0, 0, 0, 0, loc)
			// Parse load time (HH:MM or H:MM). Skip non-data rows (e.g. footer "OPERATORS") without reporting as error.
			startTime, err := parseLocalTime(sheetDate, loadTimeStr)
			if err != nil {
				continue
			}
			endTime := startTime.Add(time.Hour)
			startISO := startTime.Format(time.RFC3339)
			endISO := endTime.Format(time.RFC3339)
			spot := sta
			if spot != "" && !strings.HasPrefix(strings.ToUpper(spot), "SPOT") {
				spot = "SPOT" + spot
			}
			carrierBase := strings.ToUpper(strings.ReplaceAll(carrier, " ", ""))
			if carrierBase == "" {
				carrierBase = "RC"
			}
			for i := 0; i < qty; i++ {
				name := fmt.Sprintf("%s%03d", carrierBase, i+1)
				id := uuid.New().String()
				if err := s.db.InsertRailcar(id, name, startISO, endISO, spot, product, tank); err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("sheet %q row %d: %v", sheetName, rowIdx+1, err))
					continue
				}
				result.Created++
			}
		}
	}
	return result, nil
}

func parseLocalTime(baseDate time.Time, timeStr string) (time.Time, error) {
	parts := strings.SplitN(timeStr, ":", 2)
	if len(parts) < 2 {
		return time.Time{}, fmt.Errorf("expected HH:MM")
	}
	hour, err1 := strconv.Atoi(strings.TrimSpace(parts[0]))
	min, err2 := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err1 != nil || err2 != nil {
		return time.Time{}, fmt.Errorf("invalid time")
	}
	if hour < 0 || hour > 23 || min < 0 || min > 59 {
		return time.Time{}, fmt.Errorf("time out of range")
	}
	return time.Date(baseDate.Year(), baseDate.Month(), baseDate.Day(), hour, min, 0, 0, baseDate.Location()), nil
}
