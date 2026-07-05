package web

import (
	"fmt"
	"html/template"
	"net/http"
	"strings"
	"time"

	"steam/database"

	"github.com/gin-gonic/gin"
)

type ColumnHeader struct {
	Key     string
	Label   string
	NextDir string
	Arrow   string
}

type AppsPageData struct {
	Apps           []database.App
	Headers        []ColumnHeader
	Sort           string
	Dir            string
	Query          string
	QueueOnly      bool
	NowPlayingOnly bool
	FavouriteOnly  bool
}

var sortColumns = []struct{ Key, Label string }{
	{"name", "Name"},
	{"playtime_forever", "Total Playtime"},
	{"rtime_last_played", "Last Played"},
	{"queue", "Queue"},
	{"now_playing", "Now Playing"},
	{"favourite", "Favourite"},
}

var sortColumnSet = func() map[string]bool {
	set := make(map[string]bool, len(sortColumns))
	for _, c := range sortColumns {
		set[c.Key] = true
	}
	return set
}()

// toggleableFields whitelists the boolean columns that ToggleAppFlag is
// allowed to write to, since the column name arrives as a URL param.
var toggleableFields = map[string]bool{
	"queue":       true,
	"now_playing": true,
	"favourite":   true,
}

// FuncMap returns the template helpers used by the apps templates. It must be
// registered on the gin engine before templates are loaded.
func FuncMap() template.FuncMap {
	return template.FuncMap{
		"hours": func(minutes int) string {
			return fmt.Sprintf("%.1f", float64(minutes)/60.0)
		},
		"lastPlayed": func(ts int) string {
			if ts == 0 {
				return "Never"
			}
			return time.Unix(int64(ts), 0).UTC().Format("Jan 2, 2006")
		},
	}
}

func normalizeSort(sort, dir string) (string, string) {
	if !sortColumnSet[sort] {
		sort = "name"
	}
	if dir != "asc" && dir != "desc" {
		dir = "asc"
	}
	return sort, dir
}

func buildHeaders(sort, dir string) []ColumnHeader {
	headers := make([]ColumnHeader, 0, len(sortColumns))
	for _, col := range sortColumns {
		h := ColumnHeader{Key: col.Key, Label: col.Label, NextDir: "asc"}
		if col.Key == sort {
			if dir == "asc" {
				h.Arrow = "▲"
				h.NextDir = "desc"
			} else {
				h.Arrow = "▼"
				h.NextDir = "asc"
			}
		}
		headers = append(headers, h)
	}
	return headers
}

// fetchApps orders by a column/direction pair that has already been checked
// against the sortColumnSet whitelist, so it is safe to interpolate directly.
func fetchApps(sort, dir, query string, queueOnly, nowPlayingOnly, favouriteOnly bool) ([]database.App, error) {
	db := database.DB.Model(&database.App{})

	if query != "" {
		db = db.Where("LOWER(name) LIKE ?", "%"+strings.ToLower(query)+"%")
	}
	if queueOnly {
		db = db.Where("queue = ?", true)
	}
	if nowPlayingOnly {
		db = db.Where("now_playing = ?", true)
	}
	if favouriteOnly {
		db = db.Where("favourite = ?", true)
	}

	var apps []database.App
	err := db.Order(fmt.Sprintf("%s %s", sort, dir)).Find(&apps).Error
	return apps, err
}

func loadAppsData(c *gin.Context) (AppsPageData, error) {
	sort, dir := normalizeSort(c.Query("sort"), c.Query("dir"))
	query := strings.TrimSpace(c.Query("q"))
	queueOnly := c.Query("queue_only") != ""
	nowPlayingOnly := c.Query("now_playing_only") != ""
	favouriteOnly := c.Query("favourite_only") != ""

	apps, err := fetchApps(sort, dir, query, queueOnly, nowPlayingOnly, favouriteOnly)

	return AppsPageData{
		Apps:           apps,
		Headers:        buildHeaders(sort, dir),
		Sort:           sort,
		Dir:            dir,
		Query:          query,
		QueueOnly:      queueOnly,
		NowPlayingOnly: nowPlayingOnly,
		FavouriteOnly:  favouriteOnly,
	}, err
}

// GetAppsPage serves the apps list. htmx requests (identified by the
// HX-Request header that htmx sets on every request it makes) get just the
// table partial for swapping; a normal browser navigation gets the full page.
func GetAppsPage(c *gin.Context) {
	data, err := loadAppsData(c)
	if err != nil {
		c.String(http.StatusInternalServerError, "failed to load apps: %v", err)
		return
	}
	if c.GetHeader("HX-Request") == "true" {
		c.HTML(http.StatusOK, "apps_table", data)
		return
	}
	c.HTML(http.StatusOK, "apps", data)
}

// ToggleAppFlag sets a boolean tag (now_playing or favourite) on a single
// app. field is checked against toggleableFields so only known boolean
// columns can ever be targeted.
func ToggleAppFlag(c *gin.Context) {
	id := c.Param("id")
	field := c.Param("field")

	if !toggleableFields[field] {
		c.Status(http.StatusBadRequest)
		return
	}

	value := c.PostForm("value") == "true"

	if err := database.DB.Model(&database.App{}).Where("id = ?", id).Update(field, value).Error; err != nil {
		c.String(http.StatusInternalServerError, "failed to update: %v", err)
		return
	}

	c.Status(http.StatusNoContent)
}
