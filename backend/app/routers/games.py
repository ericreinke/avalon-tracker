from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Game, GamePlayer, Player
from ..schemas import GameCreate, GameOut, GamePlayerOut
from ..auth import require_passcode

router = APIRouter(prefix="/api/games", tags=["games"])

GOOD_ROLES = {"Merlin", "Percival", "Loyal Servant", "Lover"}


def _serialize_game(game: Game) -> GameOut:
    missions = [game.mission_1, game.mission_2, game.mission_3, game.mission_4, game.mission_5]

    assassinated_player_id = None
    assassinated_name = None

    players_out = []
    for gp in game.players:
        players_out.append(GamePlayerOut(
            id=gp.id,
            player_id=gp.player_id,
            player_name=gp.player.display_name,
            role=gp.role,
            is_assassinated=gp.is_assassinated,
        ))
        if gp.is_assassinated:
            assassinated_player_id = gp.player_id
            assassinated_name = gp.player.display_name

    return GameOut(
        id=game.id,
        num_players=game.num_players,
        missions=missions,
        winning_team=game.winning_team,
        assassinated_id=assassinated_player_id,
        assassinated_name=assassinated_name,
        notes=game.notes,
        players=players_out,
        created_at=game.created_at,
    )


@router.get("", response_model=list[GameOut])
def list_games(db: Session = Depends(get_db)):
    games = (
        db.query(Game)
        .options(joinedload(Game.players).joinedload(GamePlayer.player))
        .order_by(Game.created_at.desc())
        .all()
    )
    return [_serialize_game(g) for g in games]


@router.get("/{game_id}", response_model=GameOut)
def get_game(game_id: int, db: Session = Depends(get_db)):
    game = (
        db.query(Game)
        .options(joinedload(Game.players).joinedload(GamePlayer.player))
        .filter(Game.id == game_id)
        .first()
    )
    if not game:
        raise HTTPException(404, "Game not found")
    return _serialize_game(game)


@router.post("", response_model=GameOut, dependencies=[Depends(require_passcode)])
def create_game(data: GameCreate, db: Session = Depends(get_db)):
    # Validate missions list length
    if len(data.missions) != 5:
        raise HTTPException(400, "Missions list must have exactly 5 entries")

    missions = data.missions
    successes = sum(1 for m in missions if m == "success")
    fails = sum(1 for m in missions if m == "fail")

    # Find the assassinated entry (if any)
    assassinated_entries = [p for p in data.players if p.is_assassinated]
    if len(assassinated_entries) > 1:
        raise HTTPException(400, "Only one player can be assassinated per game")
    assassinated_entry = assassinated_entries[0] if assassinated_entries else None

    # Determine winning team
    if fails >= 3:
        winning_team = "evil"
    elif successes >= 3:
        if assassinated_entry is None:
            raise HTTPException(400, "Must specify assassinated player when good wins missions")

        if assassinated_entry.role == "Merlin":
            winning_team = "evil"
        else:
            winning_team = "good"
    else:
        raise HTTPException(400, "At least 3 missions must have resolved (success or fail)")

    game = Game(
        num_players=data.num_players,
        mission_1=missions[0],
        mission_2=missions[1],
        mission_3=missions[2],
        mission_4=missions[3],
        mission_5=missions[4],
        winning_team=winning_team,
        notes=data.notes,
    )
    db.add(game)
    db.flush()  # get game.id

    for p in data.players:
        gp = GamePlayer(
            game_id=game.id,
            player_id=p.player_id,
            role=p.role,
            is_assassinated=p.is_assassinated,
        )
        db.add(gp)

    db.commit()

    # Re-fetch with relationships
    game = (
        db.query(Game)
        .options(joinedload(Game.players).joinedload(GamePlayer.player))
        .filter(Game.id == game.id)
        .first()
    )

    return _serialize_game(game)


@router.delete("/{game_id}", dependencies=[Depends(require_passcode)])
def delete_game(game_id: int, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(404, "Game not found")
    db.delete(game)
    db.commit()
    return {"ok": True}

