package database

import (
	"fmt"
	"path/filepath"
	"strings"
	"sync"

	"railcarlist/internal/config"
)

// Terminals is the list of supported terminal IDs
var Terminals = []string{"savannah", "los-angeles", "tarragona"}

// DBManager holds a DB connection per terminal
type DBManager struct {
	mu        sync.RWMutex
	databases map[string]*DB
	basePath  string // directory where DB files live
	dbCfg     config.DatabaseConfig
}

// NewDBManager creates DB connections for all terminals
func NewDBManager(cfg config.DatabaseConfig) (*DBManager, error) {
	mgr := &DBManager{
		databases: make(map[string]*DB),
		basePath:  filepath.Dir(cfg.Path),
		dbCfg:     cfg,
	}

	for _, tid := range Terminals {
		dbPath := mgr.dbPathFor(tid)
		termCfg := cfg
		termCfg.Path = dbPath

		db, err := NewDB(termCfg)
		if err != nil {
			mgr.CloseAll()
			return nil, fmt.Errorf("failed to open DB for terminal %s: %w", tid, err)
		}
		mgr.databases[tid] = db
	}

	return mgr, nil
}

// dbPathFor returns the DB file path for a given terminal ID
func (m *DBManager) dbPathFor(terminalID string) string {
	dir := m.basePath
	if dir == "" || dir == "." {
		dir = "."
	}
	return filepath.Join(dir, fmt.Sprintf("%s.db", terminalID))
}

// Get returns the DB for a terminal ID. Falls back to first terminal if not found.
func (m *DBManager) Get(terminalID string) *DB {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if db, ok := m.databases[terminalID]; ok {
		return db
	}
	// Fallback to first terminal
	return m.databases[Terminals[0]]
}

// Default returns the default (first) terminal DB
func (m *DBManager) Default() *DB {
	return m.Get(Terminals[0])
}

// All returns all terminal DBs as a map
func (m *DBManager) All() map[string]*DB {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make(map[string]*DB, len(m.databases))
	for k, v := range m.databases {
		result[k] = v
	}
	return result
}

// CloseAll closes all DB connections
func (m *DBManager) CloseAll() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, db := range m.databases {
		db.Close()
	}
}

// ParseTerminalID extracts terminal ID from header, normalizing it
func ParseTerminalID(header string) string {
	tid := strings.TrimSpace(strings.ToLower(header))
	if tid == "" {
		return Terminals[0]
	}
	// Validate
	for _, t := range Terminals {
		if t == tid {
			return t
		}
	}
	return Terminals[0]
}
