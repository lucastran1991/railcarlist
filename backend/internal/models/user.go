package models

type User struct {
	ID           int64  `json:"id"`
	Username     string `json:"username"`
	FullName     string `json:"full_name"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
	Role         string `json:"role"`
	AvatarURL    string `json:"avatar_url"`
	Active       bool   `json:"active"`
}
