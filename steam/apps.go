package steam

import (
	"encoding/json"
	"log/slog"
	"fmt"
	"net/http"
	"os"
	"steam/database"

	"github.com/gin-gonic/gin"
)

type AppListResponse struct {
	Response AppListApps `json:"response"`
}

type AppListApps struct {
	GameCount int       `json:"game_count"`
	Apps      []AppItem `json:"games"`
}

type AppItem struct {
	Appid                  int    `json:"appid"`
	Name                   string `json:"name"`
	PlaytimeForever        int    `json:"playtime_forever"`
	ImgIconUrl             string `json:"img_icon_url"`
	PlaytimeWindowsForever int    `json:"playtime_windows_forever"`
	PlaytimeMacForever     int    `json:"playtime_mac_forever"`
	PlaytimeLinuxForever   int    `json:"playtime_linux_forever"`
	PlaytimeDeckForever    int    `json:"playtime_deck_forever"`
	RtimeLastPlayed        int    `json:"rtime_last_played"`
	PlaytimeDisconnected   int    `json:"playtime_disconnected"`
}

type RecentListResponse struct {
	Response RecentListApps `json:"response"`
}

type Response struct {
	GameCount     int
	TotalPlayTime int
}

type RecentListApps struct {
	GameCount int       `json:"total_count"`
	Apps      []RecentItem `json:"games"`
}

type RecentItem struct {
	Appid                  int    `json:"appid"`
	Name                   string `json:"name"`
	PlaytimeTwoWeeks       int    `json:"playtime_2weeks"`
	PlaytimeForever        int    `json:"playtime_forever"`
	ImgIconUrl             string `json:"img_icon_url"`
	PlaytimeWindowsForever int    `json:"playtime_windows_forever"`
	PlaytimeMacForever     int    `json:"playtime_mac_forever"`
	PlaytimeLinuxForever   int    `json:"playtime_linux_forever"`
	PlaytimeDeckForever    int    `json:"playtime_deck_forever"`
}

func GetAppsList(c *gin.Context) {

	apiKey := os.Getenv("STEAM_API_KEY")
	steamId := os.Getenv("STEAM_ID")

	if apiKey == "" || steamId == "" {
		c.JSON(http.StatusInternalServerError, "STEAM_API_KEY and STEAM_ID must be set")
		return
	}

	client := &http.Client{}

	fullUrl := fmt.Sprintf(
		"https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=%s&steamid=%s&include_appinfo=true",
		apiKey, steamId,
	)

	req, err := http.NewRequestWithContext(
		c,
		http.MethodGet,
		fullUrl,
		nil,
	)
	if err != nil {
		panic(err)
	}

	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		panic(fmt.Sprintf("bad status: %d", resp.StatusCode))
	}

	var MyResponse AppListResponse

	err = json.NewDecoder(resp.Body).Decode(&MyResponse)
	if err != nil {
		panic(fmt.Sprintf("Error: %s", err))
	}

	totalPlayTime := PlaytimeCalculator(MyResponse.Response)
	totalEntries := MyResponse.Response.GameCount

	allApps := make([]database.App, 0, totalEntries)
	allPlaytimes := make([]database.Playtime, 0, totalEntries)

	for _, steamApp := range MyResponse.Response.Apps {
		app := database.App{
			Appid:                  steamApp.Appid,
			Name:                   steamApp.Name,
			PlaytimeForever:        steamApp.PlaytimeForever,
			ImgIconUrl:             steamApp.ImgIconUrl,
			PlaytimeWindowsForever: steamApp.PlaytimeWindowsForever,
			PlaytimeMacForever:     steamApp.PlaytimeMacForever,
			PlaytimeLinuxForever:   steamApp.PlaytimeLinuxForever,
			PlaytimeDeckForever:    steamApp.PlaytimeDeckForever,
			RtimeLastPlayed:        steamApp.RtimeLastPlayed,
			PlaytimeDisconnected:   steamApp.PlaytimeDisconnected,
		}
		playtime := database.Playtime{
			Appid:                  steamApp.Appid,
			Name:                   steamApp.Name,
			PlaytimeForever:        steamApp.PlaytimeForever,
			PlaytimeWindowsForever: steamApp.PlaytimeWindowsForever,
			PlaytimeMacForever:     steamApp.PlaytimeMacForever,
			PlaytimeLinuxForever:   steamApp.PlaytimeLinuxForever,
			PlaytimeDeckForever:    steamApp.PlaytimeDeckForever,
			PlaytimeDisconnected:   steamApp.PlaytimeDisconnected,
		}
		allApps = append(allApps, app)
		allPlaytimes = append(allPlaytimes, playtime)
	}
	appErrChan := make(chan error, 1)
	playtimeErrChan := make(chan error, 1)


	go func() {
		err := database.CreateApp(allApps)
		appErrChan <- err
	}()

	go func() {
		err := database.CreatePlaytime(allPlaytimes)
		playtimeErrChan <- err
	}()

	if appErr := <-appErrChan; appErr != nil {
		slog.Error("Error inserting app records", "count", totalEntries, "error", appErr)
	}	
	
	if playtimeErr := <-playtimeErrChan; playtimeErr != nil {
		slog.Error("Error inserting playtime records", "count", totalEntries, "error", playtimeErr)
	}

	slog.Info("Successfully updated apps", "GameCount", totalEntries, "TotalPlaytime", totalPlayTime)
	r := Response{GameCount: totalEntries, TotalPlayTime: totalPlayTime}

	c.JSON(http.StatusOK, r)

}

func GetRecentsList(c *gin.Context) {

	apiKey := os.Getenv("STEAM_API_KEY")
	steamId := os.Getenv("STEAM_ID")

	if apiKey == "" || steamId == "" {
		c.JSON(http.StatusInternalServerError, "STEAM_API_KEY and STEAM_ID must be set")
		return
	}

	client := &http.Client{}

	fullUrl := fmt.Sprintf(
		"http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=%s&steamid=%s&format=json",
		apiKey, steamId,
	)

	req, err := http.NewRequestWithContext(
		c,
		http.MethodGet,
		fullUrl,
		nil,
	)
	if err != nil {
		panic(err)
	}

	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		panic(fmt.Sprintf("bad status: %d", resp.StatusCode))
	}

	var MyResponse RecentListResponse

	err = json.NewDecoder(resp.Body).Decode(&MyResponse)
	if err != nil {
		panic(fmt.Sprintf("Error: %s", err))
	}

	c.JSON(http.StatusOK, MyResponse.Response)

}
