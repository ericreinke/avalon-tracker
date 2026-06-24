from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Player, GamePlayer, Game
from ..schemas import PlayerCreate, PlayerUpdate, PlayerOut, PlayerProfile, PlayerStats
from ..auth import require_passcode

router = APIRouter(prefix="/api/players", tags=["players"])

GOOD_ROLES = {"Merlin", "Percival", "Loyal Servant", "Lover"}
EVIL_ROLES = {"Morgana", "Assassin", "Minion of Mordred", "Oberon", "Mordred"}


@router.get("", response_model=list[PlayerOut])
def list_players(db: Session = Depends(get_db)):
    return db.query(Player).order_by(Player.name).all()


@router.get("/main", response_model=PlayerOut)
def get_main_player(db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.is_main == True).first()
    if not player:
        raise HTTPException(404, "No main player set")
    return player


@router.get("/{player_id}", response_model=PlayerProfile)
def get_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(404, "Player not found")

    # Fetch all game entries for this player
    entries = (
        db.query(GamePlayer, Game)
        .join(Game, GamePlayer.game_id == Game.id)
        .filter(GamePlayer.player_id == player_id)
        .all()
    )

    games_played = len(entries)
    if games_played == 0:
        return PlayerProfile(
            id=player.id,
            name=player.name,
            is_main=player.is_main,
            created_at=player.created_at,
            stats=PlayerStats(),
        )

    def _win_rate(filtered):
        """Given a list of (GamePlayer, Game) tuples, compute win rate."""
        if not filtered:
            return None
        wins = 0
        for gp, game in filtered:
            role_is_good = gp.role in GOOD_ROLES
            if role_is_good and game.winning_team == "good":
                wins += 1
            elif not role_is_good and game.winning_team == "evil":
                wins += 1
        return round(wins / len(filtered), 4)

    good_entries = [(gp, g) for gp, g in entries if gp.role in GOOD_ROLES]
    evil_entries = [(gp, g) for gp, g in entries if gp.role in EVIL_ROLES]
    merlin_entries = [(gp, g) for gp, g in entries if gp.role == "Merlin"]
    percival_entries = [(gp, g) for gp, g in entries if gp.role == "Percival"]
    morgana_entries = [(gp, g) for gp, g in entries if gp.role == "Morgana"]

    stats = PlayerStats(
        games_played=games_played,
        win_rate=_win_rate(entries),
        win_rate_good=_win_rate(good_entries),
        win_rate_evil=_win_rate(evil_entries),
        win_rate_merlin=_win_rate(merlin_entries),
        win_rate_percival=_win_rate(percival_entries),
        win_rate_morgana=_win_rate(morgana_entries),
    )

    return PlayerProfile(
        id=player.id,
        name=player.name,
        is_main=player.is_main,
        created_at=player.created_at,
        stats=stats,
    )


@router.post("", response_model=PlayerOut, dependencies=[Depends(require_passcode)])
def create_player(data: PlayerCreate, db: Session = Depends(get_db)):
    existing = db.query(Player).filter(Player.name == data.name).first()
    if existing:
        raise HTTPException(400, "Player with this name already exists")
    player = Player(name=data.name)
    db.add(player)
    db.commit()
    db.refresh(player)
    return player


@router.put("/{player_id}", response_model=PlayerOut, dependencies=[Depends(require_passcode)])
def update_player(player_id: int, data: PlayerUpdate, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(404, "Player not found")
    player.name = data.name
    db.commit()
    db.refresh(player)
    return player


@router.delete("/{player_id}", dependencies=[Depends(require_passcode)])
def delete_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(404, "Player not found")
    db.delete(player)
    db.commit()
    return {"ok": True}
