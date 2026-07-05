package steam

func PlaytimeCalculator(apps AppListApps) int {

	playtime := 0

	for _, app := range apps.Apps {
		playtime += app.PlaytimeForever
	}

	return playtime

}
