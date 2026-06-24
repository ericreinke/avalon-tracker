from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property

from .database import Base


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False, server_default="")
    is_main = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    game_entries = relationship("GamePlayer", back_populates="player")

    @hybrid_property
    def display_name(self):
        if self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    num_players = Column(Integer, nullable=False)
    mission_1 = Column(String(10), nullable=False)
    mission_2 = Column(String(10), nullable=False)
    mission_3 = Column(String(10), nullable=False)
    mission_4 = Column(String(10), nullable=True)
    mission_5 = Column(String(10), nullable=True)
    winning_team = Column(String(10), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    players = relationship("GamePlayer", back_populates="game", cascade="all, delete-orphan")


class GamePlayer(Base):
    __tablename__ = "game_players"
    __table_args__ = (
        # At most one assassination target per game
        Index("ix_one_assassination_per_game", "game_id",
              unique=True, postgresql_where=Column("is_assassinated") == True),
    )

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    role = Column(String(30), nullable=False)
    is_assassinated = Column(Boolean, default=False, nullable=False)

    game = relationship("Game", back_populates="players")
    player = relationship("Player", back_populates="game_entries")

