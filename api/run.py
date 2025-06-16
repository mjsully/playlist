import httpx
import os
from contextlib import asynccontextmanager
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from neologger import NeoLogger

import database_handler

neologger = NeoLogger("Playlist API")

dbh = database_handler.DatabaseHandler()

load_dotenv()

steam_api_key = os.getenv("STEAM_API_KEY", None)
steam_user_id = os.getenv("STEAM_USER_ID", None)

@asynccontextmanager
async def lifespan(app: FastAPI):

    neologger.log_this_ok("--- Initialising ---")
    if not steam_api_key or not steam_user_id:
        raise Exception("Please make sure the STEAM_API_KEY and STEAM_USER_ID environment variables are set!")
    dbh.create_tables()
    await build_apps_database()
    yield
    neologger.log_this_warning("App is closing down, goodbye!")

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def build_apps_database():

    url = f"http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key={steam_api_key}&steamid={steam_user_id}"

    async with httpx.AsyncClient() as client:

        while True:

            results = None
            response = await client.get(url)
            if response.status_code == 200:
                results = response.json().get("response")
                insert_results = await asyncio.create_task(dbh.insert_apps(results))
                neologger.log_this_success(insert_results)
                break

            await asyncio.sleep(5)
    
    url = "https://api.steampowered.com/ISteamApps/GetAppList/v2/"

    async with httpx.AsyncClient() as client:

        results = None
        response = await client.get(url)
        if response.status_code == 200:

            results = response.json()
            await asyncio.create_task(dbh.name_apps(results))

        else:

            neologger.log_this_error(f"{response.status_code}: {response.text}")

@app.get("/")
async def healthcheck():

    return JSONResponse(status_code=200, content={"message": "API is alive"})

@app.get("/steam/user/apps/refresh")
async def get_steam_user_apps_refresh():

    await asyncio.create_task(build_apps_database())
    neologger.log_this_ok("Triggered DB refresh")
    return JSONResponse(
        status_code=200,
        content={
            "message": "Triggered DB refresh"
        }
    )

@app.get("/steam/user/apps")
async def get_steam_user_apps():

    apps = await dbh.get_apps()
    return JSONResponse(
        status_code=200,
        content=apps
    )

@app.get("/steam/user/status")
async def get_steam_user_status():

    url = f"http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={steam_api_key}&steamids={steam_user_id}"

    results = None
    async with httpx.AsyncClient() as client:

        try:

            response = await client.get(url)
            response.raise_for_status()
            results = response.json()
            results = results.get("response").get("players")[0]
            return JSONResponse(
                status_code=200,
                content=results
            )
        
        except Exception as ex:
            neologger.log_this_error(f"{type(ex)}: {ex}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": f"{type(ex)}: {ex}"
                }
            )
        
@app.get("/steam/user/recent")
async def get_steam_user_recent():

    url = f"http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key={steam_api_key}&steamid={steam_user_id}&format=json"

    results = None
    async with httpx.AsyncClient() as client:

        try:

            response = await client.get(url)
            response.raise_for_status()
            results = response.json()
            results = results.get("response")
            return JSONResponse(
                status_code=200,
                content=results
            )
        
        except Exception as ex:
            neologger.log_this_error(f"{type(ex)}: {ex}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": f"{type(ex)}: {ex}"
                }
            )
