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
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	FullName  string `json:"full_name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	AvatarURL string `json:"avatar_url"`
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
			ID:        user.ID,
			Username:  user.Username,
			FullName:  user.FullName,
			Email:     user.Email,
			Role:      user.Role,
			AvatarURL: user.AvatarURL,
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
		ID:        user.ID,
		Username:  user.Username,
		FullName:  user.FullName,
		Email:     user.Email,
		Role:      user.Role,
		AvatarURL: user.AvatarURL,
	})
}

// SeedUsers creates default users if none exist
func SeedUsers(db *database.DB) {
	exists, _ := db.UserExists("admin")
	if exists {
		return
	}

	type seedUser struct {
		username  string
		fullName  string
		email     string
		password  string
		role      string
		avatarURL string
	}

	users := []seedUser{
		{"admin", "System Admin", "admin@vopak.local", "Password@876", "admin", "/avatars/admin.png"},
		{"an.nguyen", "An Nguyen Thanh", "an.nguyen@atomiton.com", "Atomiton@123", "viewer", "/avatars/an.nguyen.png"},
		{"binh.nhan", "Binh Nhan", "binh.nhan@atomiton.com", "Atomiton@123", "viewer", "/avatars/binh.nhan.png"},
		{"hai.nguyen", "Hai Nguyen", "hai.nguyen@atomiton.com", "Atomiton@123", "viewer", "/avatars/hai.nguyen.png"},
		{"henry.truong", "Henry Truong", "henry.truong@atomiton.com", "Atomiton@123", "viewer", "/avatars/henry.truong.png"},
		{"karl.trinh", "Karl Trinh", "karl.trinh@atomiton.com", "Atomiton@123", "viewer", "/avatars/karl.trinh.png"},
		{"kenvin.nguyen", "Kenvin Nguyen", "kenvin.nguyen@atomiton.com", "Atomiton@123", "viewer", "/avatars/kenvin.nguyen.png"},
		{"khoa.tran", "Khoa Tran", "khoa.tran@atomiton.com", "Atomiton@123", "viewer", "/avatars/khoa.tran.png"},
		{"long.tran", "Long Tran", "long.tran@atomiton.com", "Atomiton@123", "admin", "/avatars/long.tran.png"},
		{"luan.tran", "Luan Tran", "luan.tran@atomiton.com", "Atomiton@123", "viewer", "/avatars/luan.tran.png"},
		{"nancy.tran", "Nancy Tran", "nancy.tran@atomiton.com", "Atomiton@123", "viewer", "/avatars/nancy.tran.png"},
		{"quy.tran", "Quy Tran", "quy.tran@atomiton.com", "Atomiton@123", "viewer", "/avatars/quy.tran.png"},
		{"quyen.dang", "Quyen Dang", "quyen.dang@atomiton.com", "Atomiton@123", "viewer", "/avatars/quyen.dang.png"},
		{"scott.nguyen", "Scott Nguyen", "scott.nguyen@atomiton.com", "Atomiton@123", "viewer", "/avatars/scott.nguyen.png"},
		{"sue.nguyen", "Sue Nguyen", "sue.nguyen@atomiton.com", "Atomiton@123", "viewer", "/avatars/sue.nguyen.png"},
		{"tara.ly", "Tara Ly", "tara.ly@atomiton.com", "Atomiton@123", "viewer", "/avatars/tara.ly.png"},
		{"tracy.nguyen", "Tracy Nguyen", "tracy.nguyen@atomiton.com", "Atomiton@123", "viewer", "/avatars/tracy.nguyen.png"},
		{"vuong.ngo", "Vuong Ngo", "vuong.ngo@atomiton.com", "Atomiton@123", "viewer", "/avatars/vuong.ngo.png"},
		{"alok.batra", "Alok Batra", "alok.batra@atomiton.com", "Atomiton@123", "admin", "/avatars/alok.batra.png"},
		{"kartik.shah", "Kartik Shah", "kartik.shah@atomiton.com", "Atomiton@123", "admin", "/avatars/kartik.shah.png"},
		{"khoa.tran", "Khoa Tran", "khoa.tran@atomiton.com", "Atomiton@123", "viewer", "/avatars/khoa.tran.png"},
	}

	created := 0
	for _, u := range users {
		hash, err := bcrypt.GenerateFromPassword([]byte(u.password), 12)
		if err != nil {
			log.Printf("[AUTH] Failed to hash password for %s: %v", u.username, err)
			continue
		}
		err = db.CreateUser(u.username, u.fullName, u.email, string(hash), u.role, u.avatarURL)
		if err != nil {
			log.Printf("[AUTH] Failed to create user %s: %v", u.username, err)
			continue
		}
		created++
	}
	fmt.Printf("[AUTH] ✓ Seeded %d users (admin + 16 team members)\n", created)
}
