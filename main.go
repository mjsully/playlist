package main

import (
	"fmt"
	"steam/database"
	"steam/steam"
	"steam/web"
	"log/slog"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	slog.SetDefault(slog.New(handler))

	if err := godotenv.Load(); err != nil {
		slog.Warn("No .env file found, relying on existing environment variables")
	}

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "9090"
	}

	slog.Info("Starting DB init")
	database.InitDB()
	slog.Info("Starting gin")
	router := gin.Default()
	router.SetFuncMap(web.FuncMap())
	router.LoadHTMLGlob("web/templates/*.html")
	router.GET("/steam/apps", steam.GetAppsList)
	router.GET("/steam/user/summary", steam.GetUserSummary)
	router.GET("/steam/user/recent", steam.GetRecentsList)
	router.GET("/apps", web.GetAppsPage)
	router.POST("/apps/:id/flag/:field", web.ToggleAppFlag)
	router.Run(fmt.Sprintf(":%s", port))

}
