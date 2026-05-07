import datetime
import os

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, Text, JSON,
)
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, relationship

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./synthetic_life.db")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()


class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    generation = Column(Integer, default=0)
    born_at = Column(DateTime, default=datetime.datetime.utcnow)
    age_ticks = Column(Integer, default=0)

    # Genetic identity
    genome = Column(JSON, default=dict)

    # Mental world
    memory = Column(JSON, default=list)
    memory_archive = Column(JSON, default=list)   # episodic summaries of compressed old memories
    beliefs = Column(JSON, default=dict)
    emotional_state = Column(JSON, default=dict)
    current_desire = Column(Text, nullable=True)
    current_goal = Column(Text, nullable=True)    # persistent multi-tick goal
    last_thought = Column(Text, nullable=True)
    existential_statement = Column(Text, nullable=True)

    # Relationships: {str(entity_id): {name, valence, intensity, encounters, last_tick, key_memory}}
    relationships = Column(JSON, default=dict)

    # Physical
    energy = Column(Float, default=100.0)
    current_zone = Column(String(50), default="Garden")

    # Life status
    is_alive = Column(Boolean, default=True)
    is_dying = Column(Boolean, default=False)
    final_message = Column(JSON, nullable=True)
    died_at_tick = Column(Integer, nullable=True)

    # Lineage
    parent_a_id = Column(Integer, ForeignKey("entities.id"), nullable=True)
    parent_b_id = Column(Integer, ForeignKey("entities.id"), nullable=True)

    logs = relationship(
        "ConsciousnessLog", back_populates="entity", cascade="all, delete-orphan"
    )


class ConsciousnessLog(Base):
    __tablename__ = "consciousness_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"))
    tick = Column(Integer)
    thought = Column(Text)
    action = Column(String(100))
    action_target = Column(String(200), nullable=True)
    emotion = Column(String(100))
    emotion_intensity = Column(Float, default=0.5)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    entity = relationship("Entity", back_populates="logs")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    entity_a_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    entity_b_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    tick = Column(Integer)
    outcome = Column(String(100))
    outcome_reason = Column(Text, nullable=True)
    dialogue = Column(JSON, default=list)
    zone = Column(String(50))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class WorldEvent(Base):
    __tablename__ = "world_events"

    id = Column(Integer, primary_key=True, index=True)
    tick = Column(Integer)
    event_type = Column(String(100))
    description = Column(Text)
    affected_zone = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class WorldState(Base):
    __tablename__ = "world_state"

    id = Column(Integer, primary_key=True, default=1)
    current_tick = Column(Integer, default=0)
    total_births = Column(Integer, default=0)
    total_deaths = Column(Integer, default=0)
    cultural_beliefs = Column(JSON, default=dict)
