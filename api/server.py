import os
import json
from dataclasses import dataclass
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
import sqlite3
import httpx
import asyncio
import requests
import constants
from datetime import datetime
import models
from sqlalchemy import create_engine, update
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from tqdm import tqdm

@asynccontextmanager
async def lifespan(app: FastAPI):

    initialise()
    yield
    logging.debug("Exiting!")

app = FastAPI(lifespan=lifespan)
logging.basicConfig(level=logging.DEBUG)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

DB_FILEPATH = "data/database.db"

# Create dataclass for Steam account
@dataclass
class SteamUser:

    api_key: str
    user_id: str

def get_user():

    api_key = os.getenv('API_KEY')
    user_id = os.getenv('USER_ID')
    logging.debug(f'API_KEY: {api_key}')
    logging.debug(f'USER_ID: {user_id}')

    if api_key == None:
        raise Exception('Please set Steam API key.')
    if user_id == None:
        raise Exception('Please set Steam User ID.')
    
    user = SteamUser(api_key = api_key, user_id = user_id)

    return user

# Check necessary env variables exist and create user
def initialise():

    user = get_user()

    if not os.path.exists('data'):
        os.mkdir('data')
    if not os.path.exists(DB_FILEPATH):
        logging.debug('DB does not exist!')
        create_database()
        build_steam_database()
    else:
        logging.debug('DB exists, refreshing!')    
    build_user_database()
    # build_steam_database()

# Use ORM to create database from models
def create_database():

    engine = create_engine(f"sqlite:///{DB_FILEPATH}")
    models.Base.metadata.create_all(engine)

def get_session():

    engine = create_engine(f"sqlite:///{DB_FILEPATH}")
    Session = sessionmaker(bind=engine)
    session = Session()
    return session 

# Build database containing all Steam games
def build_steam_database():

    session = get_session()

    # url = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/'
    # results = requests.get(url)
    # results = results.json()['applist']['apps']

    os.system("rm ./data/steam-database.json")
    os.system("curl https://api.steampowered.com/ISteamApps/GetAppList/v2/ >> ./data/steam-database.json")

    with open("./data/steam-database.json") as input_json:

        results = json.load(input_json)["applist"]["apps"]
        nonames = []

        for result in tqdm(results):
            appid = result['appid']
            name = result['name'].replace("'", "’")

            if name != '':
                try:        
                    session.execute(
                        insert(models.SteamApps).values(
                            appid = appid,
                            name = name
                        )
                    )
                except SQLAlchemyError as e:
                    error = e
        
            else:
                nonames.append(appid)

        logging.debug(f"Size of nonames: {len(nonames)}")

    session.commit()
    results = session.query(
        models.SteamApps
    ).all()
    session.execute(
        insert(models.SteamAppsMetadata).values(
            size = len(results),
            timestamp = datetime.now()
        )
    )
    session.commit()
    session.close()

# Build database of user's owned games
def build_user_database():

    user = get_user()
    session = get_session()

    url = f'http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key={user.api_key}&steamid={user.user_id}'

    results = requests.get(url)
    results = results.json()['response']['games']
    for result in results:
        try:
            appid = result['appid']
            session.execute(
                insert(models.SteamUserApps).values(
                    appid = appid,
                    now_playing = 0,
                    favourite = 0
                )
            )
        except SQLAlchemyError as e:
            # logging.error(e)
            error = e

    session.commit()
    for result in results:
        try:
            session.execute(
                insert(models.SteamUserAppsPlaytime).values(
                    appid = result['appid'],
                    playtime_forever = result['playtime_forever'],
                    playtime_windows = result['playtime_windows_forever'],
                    playtime_mac = result['playtime_mac_forever'],
                    playtime_linux = result['playtime_linux_forever'],
                    playtime_deck = result['playtime_deck_forever'],
                    playtime_disconnected = result['playtime_disconnected'],
                    last_played = result['rtime_last_played'],
                    timestamp = datetime.now()
                )
            )
        except SQLAlchemyError as e:
            # logging.error(e)
            error = e
    session.commit()
    session.close()

def convert_timestamp(timestamp):
    return datetime.fromtimestamp(timestamp).strftime("%d/%m/%Y")

def convert_datetime(datetime):
    return datetime.strftime("%H:%M (%d/%m/%Y)")

# def get_achievements(session, user, id):

#     # sqlite_filepath = 'data/steam.db'
#     # engine = create_engine(f"sqlite:///{sqlite_filepath}")
#     # Session = sessionmaker(bind=engine)
#     # session = Session()

#     achievements = 0
#     total_achievements = 0

#     # get achievements data
#     achievements_url = f'http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid={id}&key={user.api_key}&steamid={user.user_id}'
#     results = requests.get(achievements_url)
#     if results.status_code == 200:
#         results = results.json()
#         if 'achievements' in results['playerstats'].keys():
#             for result in results['playerstats']['achievements']:
#                 achievements += result["achieved"]
#                 total_achievements += 1
            
#     session.execute(
#         insert(models.SteamAppAchievements).values(
#             appid = id,
#             achievements = achievements,
#             total_achievements = total_achievements,
#             timestamp = datetime.now()
#         )
#     )
#     session.commit()
#     # session.close()

@app.get('/steam/games')
async def steam_games(
    sort="playtime", 
    order="desc", 
    playedOnly=None,
    unplayedOnly=None,
    favouritesOnly=None,
  ):

    """Retrieve data for all games owned by the user."""

    sort_by = None
    order_by = None

     # Sort games either alphabetically, by date last played, or total playtime (default)
    if sort == "alphabetical":
        sort_by = models.SteamApps.name
    elif sort == "lastPlayed":
        sort_by = models.SteamUserAppsPlaytime.last_played
    else: 
        sort_by = models.SteamUserAppsPlaytime.playtime_forever 

    session = get_session()
    
    # Order games either in ascending or descending sort order
    if order == "desc":
        order_by = sort_by.desc() 
    else:
        order_by = sort_by.asc()

    if playedOnly is not None and unplayedOnly is None:
        results = session.query(
            models.SteamUserApps,
            models.SteamApps,
            models.SteamUserAppsPlaytime
        ).filter(
            models.SteamUserAppsPlaytime.playtime_forever > 0
        )
    elif unplayedOnly is not None and playedOnly is None:
        results = session.query(
            models.SteamUserApps,
            models.SteamApps,
            models.SteamUserAppsPlaytime
        ).filter(
            models.SteamUserAppsPlaytime.playtime_forever == 0
        )
    else:
        results = session.query(
            models.SteamUserApps,
            models.SteamApps,
            models.SteamUserAppsPlaytime
        )
    if favouritesOnly is not None:
        results = results.filter(
            models.SteamUserApps.favourite == 1
        )

    results = results.join(
        models.SteamUserApps, models.SteamUserApps.appid == models.SteamApps.appid
    ).join(
        models.SteamUserAppsPlaytime, models.SteamUserAppsPlaytime.appid == models.SteamApps.appid
    ).group_by(
        models.SteamUserAppsPlaytime.appid
    ).order_by(
        order_by
    )

    logging.debug(results)

    results = results.all()

    if results:
        results_list = []
        for result in results:
            SteamUserApps = result[0]
            SteamApps = result[1]
            SteamUserAppsPlaytime = result[2]
            results_list.append({
                "id": SteamUserApps.id,
                "name": SteamApps.name,
                "playtime_forever": SteamUserAppsPlaytime.playtime_forever,
                "last_played": convert_timestamp(SteamUserAppsPlaytime.last_played),
                "unplayed": (SteamUserAppsPlaytime.playtime_forever==0),
                "now_playing": SteamUserApps.now_playing,
                "favourite": SteamUserApps.favourite,
                "img": f"https://cdn.cloudflare.steamstatic.com/steam/apps/{SteamUserApps.appid}/header.jpg",
            })

        return JSONResponse(status_code=200, content=results_list)
    else:
        return JSONResponse(status_code=400, content="No data available.")

@app.get('/steam/game/{id}')
async def steam_game_id(id: str):


    """Retrieve data for a given game. The ID in the URL corresponds to the database ID of the game in the SteamUserApps table."""

    session = get_session()

    results = session.query(
        models.SteamUserApps,
        models.SteamApps,
        models.SteamUserAppsPlaytime
    ).join(
        models.SteamUserApps, models.SteamUserApps.appid == models.SteamApps.appid
    ).join(
        models.SteamUserAppsPlaytime, models.SteamUserAppsPlaytime.appid == models.SteamApps.appid
    ).filter(
        models.SteamUserApps.id == id
    ).order_by(
        models.SteamUserAppsPlaytime.timestamp.desc()
    ).first()
    session.close()
    if not results:
        return JSONResponse(status_code=404, content="No data found for the requested ID.")
    else:
        SteamUserApps = results[0]
        SteamApps = results[1]
        SteamUserAppsPlaytime = results[2]
        results_dict = {
            "id": SteamUserApps.appid,
            "name": SteamApps.name,
            "playtime": round(SteamUserAppsPlaytime.playtime_forever/60, 1),
            "unplayed": (SteamUserAppsPlaytime.playtime_forever==0),
            "now_playing": SteamUserApps.now_playing,
            "favourite": SteamUserApps.favourite,
            "last_played": convert_timestamp(SteamUserAppsPlaytime.last_played),
            "img": f"https://cdn.cloudflare.steamstatic.com/steam/apps/{SteamUserApps.appid}/header.jpg",
            "timestamp": convert_datetime(SteamUserAppsPlaytime.timestamp),
        }
        return JSONResponse(status_code=200, content=results_dict)

@app.get('/steam/game/{id}/favourite')
async def steam_game_id_favourite(id: str):

    session = get_session()

    result = session.query(
        models.SteamUserApps
    ).where(
        models.SteamUserApps.id == id
    ).one()

    if result:

        favourite = 1 if result.favourite == 0 else 0

        update_stmt = update(
            models.SteamUserApps
        ).where(
            models.SteamUserApps.id == id
        ).values(
            favourite = favourite
        )

        session.execute(update_stmt)
        session.commit()
        session.close()

        return JSONResponse(status_code=200, content="")

    else:

        return JSONResponse(status_code=404, content="No data available")

@app.get('/steam/stats')
async def steam_stats():

    """Retrieve aggregated statistics for Steam."""

    session = get_session()

    results = session.query(
        models.SteamUserApps,
        models.SteamApps,
        models.SteamUserAppsPlaytime
    ).join(
        models.SteamUserApps, models.SteamUserApps.appid == models.SteamApps.appid
    ).join(
        models.SteamUserAppsPlaytime, models.SteamUserAppsPlaytime.appid == models.SteamApps.appid
    ).order_by(
        models.SteamUserAppsPlaytime.timestamp.desc()
    ).all()
    
    if results:

        processed_ids = []
        total_playtime = 0
        total_unplayed = 0
        total_now_playing = 0
        total_favourites = 0
        last_played_time = 0
        last_played_name = None

        for result in results:

            SteamUserApps = result[0]
            SteamApps = result[1]
            SteamUserAppsPlaytime = result[2]

            if SteamApps.appid not in processed_ids:
                total_playtime += SteamUserAppsPlaytime.playtime_forever
                if SteamUserAppsPlaytime.last_played > last_played_time:
                    last_played_time = SteamUserAppsPlaytime.last_played
                    last_played_name = SteamApps.name
                if SteamUserAppsPlaytime.playtime_forever == 0: 
                    total_unplayed += 1
                if SteamUserApps.now_playing == 1:
                    total_now_playing += 1
                if SteamUserApps.favourite == 1:
                    total_favourites += 1
                processed_ids.append(SteamApps.appid)
            
            results_dict = {
                "count": len(processed_ids),
                "playtime": total_playtime,
                "unplayed": total_unplayed,
                "last_played": f"{last_played_name} ({convert_timestamp(last_played_time)})",
                "now_playing": total_now_playing,
                "favourites": total_favourites
            }

        return JSONResponse(status_code=200, content=results_dict)

    else:

        return JSONResponse(status_code=400, content="No data available.")

@app.get('/steam/user/status')
async def steam_user_status():

    """Retrieve the current status of the Steam user. This directly calls the Steam API and returns the content (with some error handling)."""

    user = get_user()

    url = f'{constants.PLAYER_SUMMARIES_URL}?key={user.api_key}&steamids={user.user_id}'

    async with httpx.AsyncClient() as client:

        try:
            
            results = await client.get(url)
            results.raise_for_status()
            results = results.json()
            return JSONResponse(
                status_code=200, 
                content=results["response"]["players"][0]
            )

        except (httpx.HTTPError) as e:

            return JSONResponse(
                status_code = e.response.status_code,
                content = repr(e)
            )

        except (KeyError, json.decoder.JSONDecodeError) as e:

            return JSONResponse(
                status_code = 500,
                content = repr(e)
            )

@app.get('/steam/user/recent')
async def steam_user_recent():

    """Retrieve data for any games played in the last two weeks. This directly calls the Steam API and returns the content (with some error handling)."""

    user = get_user()

    url = f'{constants.RECENTLY_PLAYED_GAMES_URL}?key={user.api_key}&steamid={user.user_id}&format=json'

    async with httpx.AsyncClient() as client:

        try:
            
            results = await client.get(url)
            results.raise_for_status()
            results = results.json()
            return JSONResponse(
                status_code=200, 
                content=results["response"]["games"]
            )

        except (httpx.HTTPError) as e:

            return JSONResponse(
                status_code = e.response.status_code,
                content = repr(e)
            )

        except (KeyError, json.decoder.JSONDecodeError) as e:

            return JSONResponse(
                status_code = 500,
                content = repr(e)
            )