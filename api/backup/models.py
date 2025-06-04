import datetime

from sqlalchemy import Column, Integer, String, ForeignKey, Table, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, column_property, mapped_column, Mapped


class Base(DeclarativeBase):
    pass

class SteamApps(Base):
    __tablename__ = "steam_apps"
    id: Mapped[int] = mapped_column(primary_key=True)
    appid = mapped_column(Integer, unique=True)
    name: Mapped[str]

class SteamAppsMetadata(Base):
    __tablename__ = "steam_apps_metadata"
    id: Mapped[int] = mapped_column(primary_key=True)
    size = mapped_column(Integer)
    timestamp: Mapped[datetime.datetime]

class SteamUserApps(Base):
    __tablename__ = "steam_user_apps"
    id: Mapped[int] = mapped_column(primary_key=True)
    appid = mapped_column(Integer, ForeignKey("steam_apps.appid"), unique=True)
    now_playing: Mapped[int]
    favourite: Mapped[int]

class SteamUserAppsPlaytime(Base):
    __tablename__ = "steam_user_apps_playtime"
    __table_args__ = (
        UniqueConstraint("appid", "playtime_forever", name="steam_user_apps_playtime_constraint_1"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    appid = mapped_column(Integer, ForeignKey("steam_apps.appid"))
    playtime_forever = mapped_column(Integer)
    playtime_windows = mapped_column(Integer)
    playtime_mac = mapped_column(Integer)
    playtime_linux = mapped_column(Integer)
    playtime_deck = mapped_column(Integer)
    playtime_disconnected = mapped_column(Integer)
    last_played = mapped_column(Integer)
    timestamp: Mapped[datetime.datetime]

# class SteamUserAppsFavourites(Base):
#     __tablename__ = "steam_user_apps_playtime"
#     id: Mapped[int] = mapped_column(primary_key=True)
#     appid = mapped_column(Integer, ForeignKey("steam_user_apps.appid"))
    
# class SteamAppAchievements(Base):
#     __tablename__ = "steam_app_achievements"
#     id: Mapped[int] = mapped_column(primary_key=True)
#     appid = mapped_column(Integer)
#     achievements: Mapped[int]
#     total_achievements: Mapped[int]
#     timestamp: Mapped[datetime.datetime]