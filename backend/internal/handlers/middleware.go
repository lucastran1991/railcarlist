package handlers

import (
	"context"
	"net/http"

	"railcarlist/internal/database"
)

type contextKey string

const dbContextKey contextKey = "terminal_db"

// TerminalDBMiddleware reads X-Terminal-Id header and injects the correct DB into context
func TerminalDBMiddleware(mgr *database.DBManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tid := database.ParseTerminalID(r.Header.Get("X-Terminal-Id"))
			db := mgr.Get(tid)
			ctx := context.WithValue(r.Context(), dbContextKey, db)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// DBFromContext extracts the terminal-specific DB from request context.
// Falls back to the provided default if not found.
func DBFromContext(ctx context.Context, fallback *database.DB) *database.DB {
	if db, ok := ctx.Value(dbContextKey).(*database.DB); ok {
		return db
	}
	return fallback
}
