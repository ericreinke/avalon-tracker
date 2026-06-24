from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Players ──────────────────────────────────────────────

class PlayerCreate(BaseModel):
    name: str

class PlayerUpdate(BaseModel):
    name: str

class PlayerOut(BaseModel):
    id: int
    name: str
    is_main: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class PlayerStats(BaseModel):
    games_played: int = 0
    win_rate: Optional[float] = None
    win_rate_good: Optional[float] = None
    win_rate_evil: Optional[float] = None
    win_rate_merlin: Optional[float] = None
    win_rate_percival: Optional[float] = None
    win_rate_morgana: Optional[float] = None

class PlayerProfile(PlayerOut):
    stats: PlayerStats


# ── Games ────────────────────────────────────────────────

class GamePlayerIn(BaseModel):
    player_id: int
    role: str
    is_assassinated: bool = False

class GameCreate(BaseModel):
    num_players: int
    missions: list[Optional[str]]  # length 5, each "success" / "fail" / null
    players: list[GamePlayerIn]
    notes: Optional[str] = None

class GamePlayerOut(BaseModel):
    id: int
    player_id: int
    player_name: str
    role: str
    is_assassinated: bool

    model_config = {"from_attributes": True}

class GameOut(BaseModel):
    id: int
    num_players: int
    missions: list[Optional[str]]
    winning_team: str
    assassinated_id: Optional[int] = None
    assassinated_name: Optional[str] = None
    notes: Optional[str] = None
    players: list[GamePlayerOut]
    created_at: datetime

    model_config = {"from_attributes": True}

