from dotenv import load_dotenv

from sqlalchemy import Column, ForeignKey, Integer, String, Boolean, DateTime, create_engine, func
from sqlalchemy.orm import Session
import os
from neologger import NeoLogger

from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.exc import IntegrityError

class Base(DeclarativeBase):
    pass

class SteamApps(Base):

    __tablename__ = "steam_apps"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    appid = Column(Integer, unique=True)
    playing = Column(Boolean, default=False)
    favourite = Column(Boolean, default=False)
    added = Column(DateTime(timezone=True), server_default=func.now())
    updated = Column(DateTime(timezone=True))

    def to_dict(self):

        return {
            "id": self.id,
            "name": self.name,
            "appid": self.appid,
            "playing": self.playing,
            "favourite": self.favourite,
            "added": self.added.isoformat(),
            "updated": self.updated.isoformat() if self.updated else None
        }

class SteamPlaytime(Base):

    __tablename__ = "steam_playtime"
    id = Column(Integer, primary_key=True)
    appid = Column(Integer, ForeignKey("steam_apps.appid"), unique=True)
    playtime_forever = Column(Integer)
    playtime_windows_forever = Column(Integer)
    playtime_mac_forever = Column(Integer)
    playtime_linux_forever = Column(Integer)
    playtime_deck_forever = Column(Integer)
    rtime_last_played = Column(Integer)
    playtime_disconnected = Column(Integer)
    added = Column(DateTime(timezone=True), server_default=func.now())

class DatabaseHandler:

    def __init__(self):

        load_dotenv()
        self.logger = NeoLogger("DatabaseHandler")
        self.db_string = self.database_string()

    def database_string(self):

        postgres_username = os.getenv("POSTGRES_USERNAME", None)
        postgres_password = os.getenv("POSTGRES_PASSWORD", None)
        postgres_database = os.getenv("POSTGRES_DATABASE", None)
        postgres_host = os.getenv("POSTGRES_HOST", None)
        postgres_port = os.getenv("POSTGRES_PORT", None)
        database_string = f"postgresql+psycopg2://{postgres_username}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_database}"
        return database_string

    def get_engine_session(self):

        engine = create_engine(self.db_string)
        session = Session(bind=engine)
        return engine, session
    
    def create_tables(self):

        self.logger.log_this("Attempting to create tables")
        try:
            engine, _ = self.get_engine_session()
            Base.metadata.create_all(engine)
            self.logger.log_this_success("Created tables")
        except Exception as ex:
            self.logger.log_this_error(f"{type(ex)}: {ex}")

    async def get_apps(self):

        _, session = self.get_engine_session()
        apps = session.query(SteamApps).all()
        return [i.to_dict() for i in apps]

    async def insert_apps(self, apps):

        _, session = self.get_engine_session()
        game_count = apps.get("game_count")
        games = apps.get("games")

        self.logger.log_this(f"{game_count} games to be processed")

        try:
            app_inserts = []
            playtime_inserts = []
            for entry in games:
                app = SteamApps(
                    appid=entry.get("appid")
                )
                app_inserts.append(app)
                playtime = SteamPlaytime(
                    appid=entry.get("appid"),
                    playtime_forever=entry.get("playtime_forever"),
                    playtime_windows_forever=entry.get("playtime_windows_forever"),
                    playtime_mac_forever=entry.get("playtime_mac_forever"),
                    playtime_linux_forever=entry.get("playtime_linux_forever"),
                    playtime_deck_forever=entry.get("playtime_deck_forever"),
                    rtime_last_played=entry.get("rtime_last_played"),
                    playtime_disconnected=entry.get("playtime_disconnected")
                )
                playtime_inserts.append(playtime)
        except Exception as ex1:
            self.logger.log_this_error(f"{type(ex1)}: {ex1}")

        try:
            session.add_all(app_inserts)
            session.commit()
        except IntegrityError as ex1:
            self.logger.log_this_error(f"{type(ex1)}: {ex1}")
        except Exception as ex2:
            self.logger.log_this_error(f"{type(ex2)}: {ex2}")

        try:
            session.add_all(playtime_inserts)
            session.commit()
        except IntegrityError as ex1:
            self.logger.log_this_error(f"{type(ex1)}: {ex1}")
        except Exception as ex2:
            self.logger.log_this_error(f"{type(ex2)}: {ex2}")
            
        try:
            games = session.query(SteamApps).all()
            session.close()
        except IntegrityError as ex1:
            self.logger.log_this_error(f"{type(ex1)}: {ex1}")
        except Exception as ex2:
            self.logger.log_this_error(f"{type(ex2)}: {ex2}")

        results_dict = {
            "game_count": game_count,
            "games_in_database": len(games)
        }

        return results_dict
    

# import datetime

# from sqlalchemy import Column, Integer, String, ForeignKey, Table, UniqueConstraint
# from sqlalchemy.orm import DeclarativeBase, column_property, mapped_column, Mapped

# class Base(DeclarativeBase):
#     pass

# class SteamApps(Base):
#     __tablename__ = "steam_apps"
#     id: Mapped[int] = mapped_column(primary_key=True)
#     appid = mapped_column(Integer, unique=True)
#     name: Mapped[str]

# class SteamAppsMetadata(Base):
#     __tablename__ = "steam_apps_metadata"
#     id: Mapped[int] = mapped_column(primary_key=True)
#     size = mapped_column(Integer)
#     timestamp: Mapped[datetime.datetime]

# class SteamUserApps(Base):
#     __tablename__ = "steam_user_apps"
#     id: Mapped[int] = mapped_column(primary_key=True)
#     appid = mapped_column(Integer, ForeignKey("steam_apps.appid"), unique=True)
#     now_playing: Mapped[int]
#     favourite: Mapped[int]

# class SteamUserAppsPlaytime(Base):
#     __tablename__ = "steam_user_apps_playtime"'
#     __table_args__ = (
#         UniqueConstraint("appid", "playtime_forever", name="steam_user_apps_playtime_constraint_1"),
#     )
#     id: Mapped[int] = mapped_column(primary_key=True)
#     appid = mapped_column(Integer, ForeignKey("steam_apps.appid"))
#     playtime_forever = mapped_column(Integer)
#     playtime_windows = mapped_column(Integer)
#     playtime_mac = mapped_column(Integer)
#     playtime_linux = mapped_column(Integer)
#     playtime_deck = mapped_column(Integer)
#     playtime_disconnected = mapped_column(Integer)
#     last_played = mapped_column(Integer)
#     timestamp: Mapped[datetime.datetime]

# # class SteamUserAppsFavourites(Base):
# #     __tablename__ = "steam_user_apps_playtime"
# #     id: Mapped[int] = mapped_column(primary_key=True)
# #     appid = mapped_column(Integer, ForeignKey("steam_user_apps.appid"))
    
# # class SteamAppAchievements(Base):
# #     __tablename__ = "steam_app_achievements"
# #     id: Mapped[int] = mapped_column(primary_key=True)
# #     appid = mapped_column(Integer)
# #     achievements: Mapped[int]
# #     total_achievements: Mapped[int]
# #     timestamp: Mapped[datetime.datetime]