package httputil

import (
	"encoding/json"
	"net/http"
)

// WriteJSON sets Content-Type to application/json, writes statusCode, and encodes v as JSON.
func WriteJSON(w http.ResponseWriter, statusCode int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(v)
}

// WriteJSONError writes a JSON error response with shape {"error": message}.
func WriteJSONError(w http.ResponseWriter, statusCode int, message string) {
	WriteJSON(w, statusCode, map[string]string{"error": message})
}
