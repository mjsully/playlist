package database

import (
	"log/slog"
	"os"
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// --- Models ---

type User struct {
	gorm.Model
	SteamID      string `gorm:"uniqueIndex;not null"`
	PersonaName  string `gorm:"not null"`
	RealName     string `gorm:"not null"`
	AvatarHash   string `gorm:"not null"`
	TimeCreated  int    `gorm:"not null"`
	LastLogoff   int    `gorm:"not null"`
	ProfileState int    `gorm:"not null"`
	PersonaState int    `gorm:"not null"`
}

type App struct {
	gorm.Model
	Appid                  int    `gorm:"uniqueIndex;not null"`
	Name                   string `gorm:"not null"`
	PlaytimeForever        int    `gorm:"not null"`
	ImgIconUrl             string `gorm:"not null"`
	PlaytimeWindowsForever int    `gorm:"not null"`
	PlaytimeMacForever     int    `gorm:"not null"`
	PlaytimeLinuxForever   int    `gorm:"not null"`
	PlaytimeDeckForever    int    `gorm:"not null"`
	RtimeLastPlayed        int    `gorm:"not null"`
	PlaytimeDisconnected   int    `gorm:"not null"`
	Queue                  bool   `gorm:"false"`
	NowPlaying             bool   `gorm:"false"`
	Favourite              bool   `gorm:"false"`
}

type Playtime struct {
	gorm.Model
	Appid                  int    `gorm:"uniqueIndex:idx_appid_playtime;not null"`
	Name                   string `gorm:"not null"`
	PlaytimeForever        int    `gorm:"uniqueIndex:idx_appid_playtime;not null"`
	PlaytimeWindowsForever int    `gorm:"not null"`
	PlaytimeMacForever     int    `gorm:"not null"`
	PlaytimeLinuxForever   int    `gorm:"not null"`
	PlaytimeDeckForever    int    `gorm:"not null"`
	PlaytimeDisconnected   int    `gorm:"not null"`
}

// --- Database ---

var DB *gorm.DB

func InitDB() {

	DB_HOST := os.Getenv("DB_HOST")
	DB_NAME := os.Getenv("DB_NAME")
	DB_USERNAME := os.Getenv("DB_USERNAME")
	DB_PASSWORD := os.Getenv("DB_PASSWORD")
	DB_PORT := os.Getenv("DB_PORT")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC", DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_PORT)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		panic("failed to connect to database")
	}

	// Auto-migrate models
	if err := db.AutoMigrate(&App{}); err != nil {
		slog.Error("failed to migrate", "error", err)
		panic("failed to migrate")
	}
	if err := db.AutoMigrate(&User{}); err != nil {
		slog.Error("failed to migrate", "error", err)
		panic("failed to migrate")
	}
	if err := db.AutoMigrate(&Playtime{}); err != nil {
		slog.Error("failed to migrate", "error", err)
		panic("failed to migrate")
	}

	DB = db
	slog.Info("Database connected and migrated")
}

// --- CRUD helpers ---

func CreateApp(app []App) error {
	err := DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "appid"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"img_icon_url",
			"playtime_forever", 
			"playtime_windows_forever",
			"playtime_mac_forever",
			"playtime_linux_forever",
			"playtime_deck_forever",
			"rtime_last_played",
			"playtime_disconnected",
			"updated_at",
		}),
	}).Create(&app).Error
	return err
}

func CreatePlaytime(playtime []Playtime) error {
	err := DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "appid"}, {Name: "playtime_forever"}},
		DoNothing: true,
	}).Create(&playtime).Error
	return err
}

func CreateUser(user User) (*User, error) {

	result := DB.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "steam_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"persona_name", "real_name", "avatar_hash",
			"last_logoff", "profile_state", "persona_state", "updated_at",
		}),
	}).Create(&user)
	return &user, result.Error

}