from sqlalchemy.orm import Session
from .models import Player


def seed_main_player(db: Session):
    """Create the 'Main' player if no main player exists yet."""
    existing = db.query(Player).filter(Player.is_main == True).first()
    if existing:
        return existing
    player = Player(name="Main", is_main=True)
    db.add(player)
    db.commit()
    db.refresh(player)
    print(f"[seed] Created main player: id={player.id}, name={player.name}")
    return player
