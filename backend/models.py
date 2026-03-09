"""SQLAlchemy async models for the Uberis synthetic life simulation."""

import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.ext.asyncio import AsyncAttrs, AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = "sqlite+aiosqlite:///./uberis.db"

engine = create_async_engine(DATABASE_URL, echo=False)


class Base(AsyncAttrs, DeclarativeBase):
    pass


class EntityModel(Base):
    __tablename__ = "entities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    generation = Column(Integer, default=1)
    born_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    age_ticks = Column(Integer, default=0)

    # JSON-encoded fields
    genome_json = Column(Text, default="{}")
    memory_json = Column(Text, default="[]")
    beliefs_json = Column(Text, default="{}")
    emotional_state_json = Column(Text, default="{}")
    consciousness_log_json = Column(Text, default="[]")
    parent_ids_json = Column(Text, default="[]")

    energy = Column(Float, default=100.0)
    status = Column(String, default="alive")  # alive, dying, dead
    zone = Column(String, default="Garden")

    # Properties for JSON fields
    @property
    def genome(self) -> dict:
        return json.loads(self.genome_json or "{}")

    @genome.setter
    def genome(self, value: dict):
        self.genome_json = json.dumps(value)

    @property
    def memory(self) -> list:
        return json.loads(self.memory_json or "[]")

    @memory.setter
    def memory(self, value: list):
        self.memory_json = json.dumps(value)

    @property
    def beliefs(self) -> dict:
        return json.loads(self.beliefs_json or "{}")

    @beliefs.setter
    def beliefs(self, value: dict):
        self.beliefs_json = json.dumps(value)

    @property
    def emotional_state(self) -> dict:
        return json.loads(self.emotional_state_json or "{}")

    @emotional_state.setter
    def emotional_state(self, value: dict):
        self.emotional_state_json = json.dumps(value)

    @property
    def consciousness_log(self) -> list:
        return json.loads(self.consciousness_log_json or "[]")

    @consciousness_log.setter
    def consciousness_log(self, value: list):
        self.consciousness_log_json = json.dumps(value)

    @property
    def parent_ids(self) -> list:
        return json.loads(self.parent_ids_json or "[]")

    @parent_ids.setter
    def parent_ids(self, value: list):
        self.parent_ids_json = json.dumps(value)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "generation": self.generation,
            "born_at": self.born_at.isoformat() if self.born_at else None,
            "age_ticks": self.age_ticks,
            "genome": self.genome,
            "memory": self.memory,
            "beliefs": self.beliefs,
            "emotional_state": self.emotional_state,
            "consciousness_log": self.consciousness_log,
            "energy": self.energy,
            "status": self.status,
            "zone": self.zone,
            "parent_ids": self.parent_ids,
        }


class WorldEventModel(Base):
    __tablename__ = "world_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tick = Column(Integer, nullable=False)
    event_type = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    affected_zone = Column(String, nullable=True)
    occurred_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "tick": self.tick,
            "event_type": self.event_type,
            "description": self.description,
            "affected_zone": self.affected_zone,
            "occurred_at": self.occurred_at.isoformat() if self.occurred_at else None,
        }


class SimulationStateModel(Base):
    __tablename__ = "simulation_state"

    id = Column(Integer, primary_key=True, default=1)
    current_tick = Column(Integer, default=0)
    total_born = Column(Integer, default=0)
    total_dead = Column(Integer, default=0)
    population_history_json = Column(Text, default="[]")

    @property
    def population_history(self) -> list:
        return json.loads(self.population_history_json or "[]")

    @population_history.setter
    def population_history(self, value: list):
        self.population_history_json = json.dumps(value)


async def get_session() -> AsyncSession:
    async with AsyncSession(engine) as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
