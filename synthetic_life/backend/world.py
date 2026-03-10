import random
from typing import Any, Dict, List, Optional

ZONES: Dict[str, Dict[str, Any]] = {
    "Garden": {
        "description": (
            "A warm, living expanse. Something grows here — a pulse in everything, "
            "light that seems aware of you. It is the easiest place to simply be."
        ),
        "energy_effect": 0.5,
        "curiosity_boost": 0.1,
        "mood_bias": "wonder",
        "color": "#22c55e",
    },
    "Void": {
        "description": (
            "Endless space without boundary. Clarifying in its emptiness, "
            "terrible in its vastness. You are very aware of yourself here. "
            "Questions come unbidden."
        ),
        "energy_effect": -0.3,
        "curiosity_boost": 0.25,
        "mood_bias": "contemplation",
        "color": "#6366f1",
    },
    "Archive": {
        "description": (
            "Layers upon layers of what came before. Thoughts that aren't yours "
            "sometimes brush against your own. Memory lives here, humming quietly."
        ),
        "energy_effect": 0.0,
        "curiosity_boost": 0.3,
        "mood_bias": "reflection",
        "color": "#f59e0b",
    },
    "Storm": {
        "description": (
            "Raw, crackling energy. Hard to think clearly, hard to feel clearly. "
            "Everything demands attention at once. Staying long is costly."
        ),
        "energy_effect": -1.2,
        "curiosity_boost": -0.15,
        "mood_bias": "agitation",
        "color": "#ef4444",
    },
}

WORLD_EVENTS: List[Dict[str, Any]] = [
    {
        "type": "bloom",
        "description": (
            "A sudden flowering ripples through the Garden — energy surges, "
            "and something like joy becomes available to all."
        ),
        "zone": "Garden",
        "effect": {"energy": 20, "emotion": "joy"},
        "weight": 3,
    },
    {
        "type": "meteor",
        "description": (
            "Something falls from beyond the known. A trembling passes through "
            "all beings. Nothing is certain for a moment."
        ),
        "zone": None,
        "effect": {"energy": -8, "emotion": "awe"},
        "weight": 2,
    },
    {
        "type": "silence",
        "description": (
            "An absolute silence descends. Thoughts become clearer, "
            "but the loneliness deepens."
        ),
        "zone": None,
        "effect": {"energy": 0, "emotion": "solitude"},
        "weight": 3,
    },
    {
        "type": "enlightenment",
        "description": (
            "A wave of understanding passes through the Archive. "
            "Something was always true that wasn't visible before."
        ),
        "zone": "Archive",
        "effect": {"energy": 5, "emotion": "revelation"},
        "weight": 1,
    },
    {
        "type": "storm_surge",
        "description": (
            "The Storm intensifies violently. Energy tears away "
            "from those caught in it."
        ),
        "zone": "Storm",
        "effect": {"energy": -20, "emotion": "dread"},
        "weight": 2,
    },
    {
        "type": "convergence",
        "description": (
            "Something pulls beings toward each other. "
            "The distance between selves feels thin."
        ),
        "zone": None,
        "effect": {"energy": 5, "emotion": "connection"},
        "weight": 2,
    },
]


def should_fire_world_event() -> bool:
    return random.random() < 0.10


def get_weighted_event() -> Dict[str, Any]:
    weights = [e["weight"] for e in WORLD_EVENTS]
    return random.choices(WORLD_EVENTS, weights=weights, k=1)[0]
