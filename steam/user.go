package steam

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"steam/database"

	"github.com/gin-gonic/gin"

	"github.com/patrickmn/go-cache"
	"log/slog"
)

var userCache = cache.New(1*time.Minute, 2*time.Minute)

type UserSummaryResponse struct {
	Response UserSummaryPlayers `json:"response"`
}

type UserSummaryPlayers struct {
	Players []UserSummary `json:"players"`
}

type UserSummary struct {
	CommunityVisibilityState int    `json:"communityvisibilitystate"`
	ProfileState             int    `json:"profilestate"`
	PersonaName              string `json:"personaname"`
	ProfileURL               string `json:"profileurl"`
	Avatar                   string `json:"avatar"`
	AvatarMedium             string `json:"avatarmedium"`
	AvatarFull               string `json:"avatarfull"`
	AvatarHash               string `json:"avatarhash"`
	LastLogoff               int    `json:"lastlogoff"`
	PersonaState             int    `json:"personastate"`
	RealName                 string `json:"realname"`
	PrimaryClanId            string `json:"primaryclanid"`
	TimeCreated              int    `json:"timecreated"`
	PersonaStateFlags        int    `json:"personastateflags"`
}

func querySteamApi(c *gin.Context, apiKey string, steamId string) (*UserSummaryResponse, error) {

	client := &http.Client{}

	url := fmt.Sprintf("http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=%s&steamids=%s", apiKey, steamId)

	req, err := http.NewRequestWithContext(
		c,
		http.MethodGet,
		url,
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
		c.JSON(http.StatusBadRequest, nil)
		return nil, nil
	}

	var MyResponse UserSummaryResponse

	err = json.NewDecoder(resp.Body).Decode(&MyResponse)
	if err != nil {
		panic(fmt.Sprintf("Error: %s", err))
	}

	return &MyResponse, nil

}

func GetUserSummary(c *gin.Context) {

	apiKey := c.DefaultQuery("key", os.Getenv("STEAM_API_KEY"))
	steamId := c.DefaultQuery("steamid", os.Getenv("STEAM_ID"))

	if apiKey == "" || steamId == "" {
		c.JSON(http.StatusBadRequest, "Check the API key and Steam ID")
		return
	}

	if cached, found := userCache.Get(steamId); found {
		fmt.Println("/user/ cache hit")
		c.JSON(http.StatusOK, cached.(UserSummaryResponse))
		return
	}

	MyResponse, err := querySteamApi(c, apiKey, steamId)

	if err != nil {

	}

	user := database.User{
		SteamID:      steamId,
		PersonaName:  MyResponse.Response.Players[0].PersonaName,
		RealName:     MyResponse.Response.Players[0].RealName,
		AvatarHash:   MyResponse.Response.Players[0].AvatarHash,
		TimeCreated:  MyResponse.Response.Players[0].TimeCreated,
		LastLogoff:   MyResponse.Response.Players[0].LastLogoff,
		ProfileState: MyResponse.Response.Players[0].ProfileState,
		PersonaState: MyResponse.Response.Players[0].PersonaState,
	}

	userCache.Set(steamId, *MyResponse, cache.DefaultExpiration)
	go database.CreateUser(user)

	slog.Info("Succesfully updated users", "SteamID", steamId, "ProfileState", MyResponse.Response.Players[0].ProfileState)
	c.JSON(http.StatusOK, MyResponse.Response.Players[0])

}