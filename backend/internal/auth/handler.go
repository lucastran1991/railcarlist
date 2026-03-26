package auth

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"golang.org/x/crypto/bcrypt"

	"railcarlist/internal/database"
)

type Handler struct {
	db       *database.DB
	tokenCfg TokenConfig
}

func NewHandler(db *database.DB, tokenCfg TokenConfig) *Handler {
	return &Handler{db: db, tokenCfg: tokenCfg}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	User         userInfo `json:"user"`
}

type userInfo struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid request body"})
		return
	}

	if req.Username == "" || req.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "username and password required"})
		return
	}

	user, err := h.db.GetUserByUsername(req.Username)
	if err != nil {
		// Timing-safe: still hash to prevent timing attack
		bcrypt.CompareHashAndPassword([]byte("$2a$12$dummy.hash.for.timing.safety."), []byte(req.Password))
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid credentials"})
		return
	}

	if !user.Active {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "account disabled"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid credentials"})
		return
	}

	accessToken, refreshToken, err := GenerateTokenPair(user.ID, user.Username, user.Role, h.tokenCfg)
	if err != nil {
		log.Printf("[AUTH] Token generation failed: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "internal error"})
		return
	}

	json.NewEncoder(w).Encode(loginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: userInfo{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
			Role:     user.Role,
		},
	})
}

func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "refresh_token required"})
		return
	}

	claims, err := ValidateToken(req.RefreshToken, h.tokenCfg.Secret)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid refresh token"})
		return
	}

	userID, _ := strconv.ParseInt(claims.Subject, 10, 64)
	user, err := h.db.GetUserByID(userID)
	if err != nil || !user.Active {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "user not found or inactive"})
		return
	}

	accessToken, refreshToken, err := GenerateTokenPair(user.ID, user.Username, user.Role, h.tokenCfg)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "internal error"})
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	claims := GetUser(r)
	if claims == nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	user, err := h.db.GetUserByID(claims.UserID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "user not found"})
		return
	}

	json.NewEncoder(w).Encode(userInfo{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
		Role:     user.Role,
	})
}

// SeedAdmin creates a default admin user if none exists
func SeedAdmin(db *database.DB) {
	exists, _ := db.UserExists("admin")
	if exists {
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("Password@876"), 12)
	if err != nil {
		log.Printf("[AUTH] Failed to hash admin password: %v", err)
		return
	}

	err = db.CreateUser("admin", "admin@vopak.local", string(hash), "admin")
	if err != nil {
		log.Printf("[AUTH] Failed to seed admin user: %v", err)
		return
	}
	fmt.Println("[AUTH] ✓ Seeded default admin user (admin / Password@876)")
}
