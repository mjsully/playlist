import httpx
import os
from contextlib import asynccontextmanager
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI
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
    yield
    neologger.log_this_warning("App is closing down, goodbye!")


app = FastAPI(lifespan=lifespan)

@app.get("/")
async def healthcheck():

    return JSONResponse(status_code=200, content={"message": "API is alive"})

@app.get("/steam/user/apps")
async def get_steam_user_apps():

    url = f"http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key={steam_api_key}&steamid={steam_user_id}"

    async with httpx.AsyncClient() as client:

        while True:

            results = None
            response = await client.get(url)
            if response.status_code == 200:

                results = response.json().get("response")
                insert_results = await asyncio.create_task(dbh.insert_apps(results))

                neologger.log_this_success(insert_results)
                
                return JSONResponse(
                    status_code=200,
                    content=insert_results
                )

            await asyncio.sleep(5)

@app.get("/test")
async def test():

    return JSONResponse(
        status_code=200,
        content=await dbh.get_apps()
    )

