"""World zones and events for Uberis."""

import random
from dataclasses import dataclass


@dataclass
class Zone:
    name: str
    energy_delta: float
    mood_modifier: str
    description: str


ZONES: dict[str, Zone] = {
    "Garden": Zone(
        name="Garden",
        energy_delta=+2,
        mood_modifier="peaceful",
        description="A place of warmth and growth",
    ),
    "Void": Zone(
        name="Void",
        energy_delta=-1,
        mood_modifier="introspective",
        description="Empty space where thoughts echo",
    ),
    "Archive": Zone(
        name="Archive",
        energy_delta=0,
        mood_modifier="curious",
        description="Repository of all that was known",
    ),
    "Storm": Zone(
        name="Storm",
        energy_delta=-3,
        mood_modifier="anxious",
        description="Chaos that sharpens the mind",
    ),
}

ZONE_NAMES = list(ZONES.keys())

# World events: (event_type, weight, description, affected_zone, energy_effect)
WORLD_EVENTS = [
    {
        "event_type": "bloom",
        "weight": 30,
        "description": "Life erupts everywhere — the Garden pulses with new growth.",
        "affected_zone": "Garden",
        "energy_effect": +10,
    },
    {
        "event_type": "meteor",
        "weight": 5,
        "description": "A burning light crosses the sky — something ancient is awakening.",
        "affected_zone": None,
        "energy_effect": -5,
    },
    {
        "event_type": "silence",
        "weight": 20,
        "description": "A profound silence falls — the world holds its breath.",
        "affected_zone": None,
        "energy_effect": 0,
    },
    {
        "event_type": "storm_surge",
        "weight": 15,
        "description": "The Storm grows fierce — chaos consumes clarity.",
        "affected_zone": "Storm",
        "energy_effect": -8,
    },
    {
        "event_type": "memory_wave",
        "weight": 20,
        "description": "The Archive resonates — old knowledge surfaces unbidden.",
        "affected_zone": "Archive",
        "energy_effect": +5,
    },
    {
        "event_type": "void_call",
        "weight": 10,
        "description": "The Void whispers of endings — some feel a strange pull toward it.",
        "affected_zone": "Void",
        "energy_effect": -3,
    },
]


def pick_world_event() -> dict | None:
    """Randomly pick a world event. Returns None most of the time (~85% chance)."""
    if random.random() > 0.15:
        return None
    weights = [e["weight"] for e in WORLD_EVENTS]
    return random.choices(WORLD_EVENTS, weights=weights, k=1)[0]


def pick_random_zone() -> str:
    """Pick a random zone name."""
    return random.choice(ZONE_NAMES)


def emotion_to_zone_preference(emotion: str) -> str:
    """Map emotional state to a preferred zone."""
    mapping = {
        "peaceful": "Garden",
        "curious": "Archive",
        "anxious": "Storm",
        "introspective": "Void",
        "sad": "Void",
        "angry": "Storm",
        "joyful": "Garden",
        "fearful": "Void",
        "contemplative": "Archive",
        "grieving": "Void",
        "excited": "Garden",
        "confused": "Storm",
    }
    return mapping.get(emotion.lower(), random.choice(ZONE_NAMES))
