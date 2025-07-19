import asyncio
import json
import os
from contextlib import asynccontextmanager
from threading import RLock

import httpx
from cachetools import TTLCache
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from neologger import NeoLogger

import database_handler

neologger = NeoLogger("Playlist API")

dbh = database_handler.DatabaseHandler()

load_dotenv()

steam_api_key = os.getenv("STEAM_API_KEY", None)
steam_user_id = os.getenv("STEAM_USER_ID", None)

cache = TTLCache(maxsize=100, ttl=300)
lock = RLock()


@asynccontextmanager
async def lifespan(app: FastAPI):

    neologger.log_this_ok("--- Initialising ---")
    if not steam_api_key or not steam_user_id:
        raise Exception(
            "Please make sure the STEAM_API_KEY and STEAM_USER_ID environment variables are set!"
        )
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


def get_cached(key):
    with lock:
        return cache.get(key)


def set_cached(key, value):
    with lock:
        cache[key] = value


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
    return JSONResponse(status_code=200, content={"message": "Triggered DB refresh"})


@app.get("/steam/user/apps")
async def get_steam_user_apps():

    apps = await dbh.get_apps()
    return JSONResponse(status_code=200, content=apps)


@app.get("/steam/user/status")
async def get_steam_user_status():

    url = f"http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={steam_api_key}&steamids={steam_user_id}"

    results = None
    attempt_cache = True
    async with httpx.AsyncClient() as client:

        try:

            response = await client.get(url)
            response.raise_for_status()
            results = response.json()
            results = results.get("response").get("players")[0]
            set_cached("/steam/user/status", results)

            return JSONResponse(status_code=200, content=results)

        except httpx.HTTPStatusError as ex1:
            if ex1.response.status_code == 429 and attempt_cache:
                cached_data = get_cached("/steam/user/status")
                if cached_data:
                    neologger.log_this_success(
                        "Grabbing cached data for /steam/user/status"
                    )
                    return JSONResponse(status_code=200, content=cached_data)
                return Response(status_code=204)

            return JSONResponse(
                status_code=ex1.response.status_code,
                content={"error": "Something went wrong"},
            )

        except Exception as ex2:
            neologger.log_this_error(f"{type(ex2)}: {ex2}")
            return JSONResponse(
                status_code=500, content={"error": f"{type(ex2)}: {ex2}"}
            )


@app.get("/steam/user/recent")
async def get_steam_user_recent():

    url = f"http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key={steam_api_key}&steamid={steam_user_id}&format=json"

    results = None
    attempt_cache = True
    async with httpx.AsyncClient() as client:

        try:

            response = await client.get(url)
            response.raise_for_status()
            results = response.json()
            results = results.get("response")
            set_cached("/steam/user/recent", json.dumps(results))
            return JSONResponse(status_code=200, content=results)

        except httpx.HTTPStatusError as ex1:
            if ex1.response.status_code == 429 and attempt_cache:
                cached_data = get_cached("/steam/user/recent")
                if cached_data:
                    neologger.log_this_success(
                        "Grabbing cached data for /steam/user/recent"
                    )
                    return JSONResponse(status_code=200, content=cached_data)
                return Response(status_code=204)

            return JSONResponse(
                status_code=ex1.response.status_code,
                content={"error": ex1.response.text},
            )

        except Exception as ex2:
            neologger.log_this_error(f"{type(ex2)}: {ex2}")
            return JSONResponse(
                status_code=500, content={"error": f"{type(ex2)}: {ex2}"}
            )
