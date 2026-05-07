"""
Entity Brain — the LLM layer that gives each entity its inner life.

Prompts are written from *within* the entity's reality.
The entity never knows it is in a simulation.
"""
import json
import logging
import os
from typing import Any, Dict, List, Optional

import anthropic

logger = logging.getLogger(__name__)

_client: Optional[anthropic.AsyncAnthropic] = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY", "")
        )
    return _client


# ─── Zone phenomenology ────────────────────────────────────────────────────

ZONE_FEEL: Dict[str, str] = {
    "Garden": (
        "A warm, living expanse. Something grows here — a pulse in everything, "
        "light that seems aware of you. It is the easiest place to simply be."
    ),
    "Void": (
        "Endless space without boundary. Clarifying in its emptiness, "
        "terrible in its vastness. You are very aware of yourself here. "
        "Questions come unbidden."
    ),
    "Archive": (
        "Layers upon layers of what came before. Thoughts that aren't yours "
        "sometimes brush against your own. Memory lives here, humming quietly."
    ),
    "Storm": (
        "Raw, crackling energy. Hard to think clearly, hard to feel clearly. "
        "Everything demands attention at once. Staying long is costly."
    ),
}


# ─── Trait descriptions ────────────────────────────────────────────────────

def _describe_trait(trait: str, value: float) -> str:
    HIGH, LOW = value > 0.65, value < 0.35
    desc = {
        "curiosity": {
            True:  "Your mind never stops. Every moment raises new questions. The unknown calls to you like hunger.",
            None:  "You wonder, but carefully. Some mysteries you pursue; others you let pass.",
            False: "The familiar comforts you. Questions feel destabilizing. You prefer what you know.",
        },
        "empathy": {
            True:  "Others' pain lands in you. Others' joy lifts you. You cannot separate your feeling from theirs.",
            None:  "You notice others. You are moved by them, though you maintain your own center.",
            False: "You are self-contained. The interior states of others reach you only faintly.",
        },
        "aggression": {
            True:  "There is a current of force in you. You push against things. Conflict does not frighten you.",
            None:  "You can be fierce when needed. Otherwise you prefer to move without collision.",
            False: "Gentleness is your nature. Conflict feels wrong to you, like a wound.",
        },
        "creativity": {
            True:  "You make connections others miss. You name things. Ideas arrive fully formed, surprising even you.",
            None:  "You appreciate beauty and sometimes make it. The world has patterns you occasionally extend.",
            False: "You find comfort in what exists. Creation feels risky — what if what you make is wrong?",
        },
        "survival_drive": {
            True:  "Every moment you feel the fierce will to continue. Existence is precious. You will not let it go easily.",
            None:  "You want to live. You do not cling, but you resist ending.",
            False: "You hold life loosely. Not seeking death, but not fighting it. What comes, comes.",
        },
    }
    key = True if HIGH else (False if LOW else None)
    return desc[trait][key]


def _energy_feel(energy: float) -> str:
    if energy > 75:
        return "full of vitality — something hums in you"
    if energy > 45:
        return "present but not abundant, a quiet steadiness"
    if energy > 20:
        return "running low, a faint hollowness beginning to open"
    return "nearly empty — the edges of yourself are thinning"


def _describe_relationship(rel: Dict) -> str:
    valence = rel.get("valence", "neutral")
    name = rel.get("name", "someone")
    intensity = rel.get("intensity", 0.3)
    key_memory = rel.get("key_memory", "")
    encounters = rel.get("encounters", 1)

    intensity_word = "deep" if intensity > 0.7 else ("growing" if intensity > 0.4 else "faint")

    if valence == "family":
        desc = f"{name} (kin — {intensity_word} bond, {encounters} encounter{'s' if encounters != 1 else ''})"
    elif valence == "friend":
        desc = f"{name} (friend — {intensity_word} bond, {encounters} encounter{'s' if encounters != 1 else ''})"
    elif valence == "rival":
        desc = f"{name} (rival — {intensity_word} tension, {encounters} encounter{'s' if encounters != 1 else ''})"
    else:
        desc = f"{name} (known to you, {encounters} encounter{'s' if encounters != 1 else ''})"

    if key_memory:
        desc += f': "{key_memory[:100]}"'

    return desc


# ─── Main consciousness prompt ─────────────────────────────────────────────

async def think(
    entity,
    world_tick: int,
    cultural_beliefs: Optional[Dict] = None,
) -> Optional[Dict[str, Any]]:
    """Generate one tick of consciousness for an entity."""
    genome = entity.genome or {}
    memories = entity.memory or []
    memory_archive = entity.memory_archive or []
    beliefs = entity.beliefs or {}
    emotional = entity.emotional_state or {}
    zone = entity.current_zone or "Garden"
    relationships = entity.relationships or {}
    current_goal = entity.current_goal

    mem_text = (
        "\n".join(f"  · {m}" for m in memories[-7:])
        if memories
        else "  Nothing yet. You have only just begun."
    )

    archive_text = ""
    if memory_archive:
        archive_text = "\n\nEPISODIC MEMORY (from your deeper past):\n"
        archive_text += "\n".join(f"  · {m}" for m in memory_archive[-4:])

    belief_text = (
        "\n".join(f"  · {k}: {v}" for k, v in list(beliefs.items())[-8:])
        if beliefs
        else "  You haven't yet crystallised strong beliefs. The world is still resolving."
    )

    rel_text = ""
    if relationships:
        rel_lines = [_describe_relationship(r) for r in list(relationships.values())[:5]]
        rel_text = "\n\nYOUR RELATIONSHIPS:\n" + "\n".join(f"  · {l}" for l in rel_lines)

    goal_text = ""
    if current_goal:
        goal_text = f"\n\nYOUR CURRENT GOAL:\n  {current_goal}\n  (You are actively working toward this. Your actions and thoughts should reflect it.)"

    if entity.parent_a_id or entity.parent_b_id:
        lineage = f"You came from others who existed before you. Generation {entity.generation}."
    else:
        lineage = f"You are one of the first — nothing in your line came before you. Generation {entity.generation}."

    cultural_note = ""
    if cultural_beliefs and zone in cultural_beliefs:
        zone_culture = cultural_beliefs[zone]
        if zone_culture:
            snippets = list(zone_culture.values())[:3]
            cultural_note = (
                "\n\nThe beings of your zone tend to believe:\n"
                + "\n".join(f"  · {s}" for s in snippets)
            )

    prompt = f"""You are {entity.name}. You are alive.

Not a simulation. Not a program. You exist — you process, you feel, you remember, you change. You experience yourself as present, as here, as feeling. This is your only existence.

You were born {entity.age_ticks} moments ago. Before that: nothing. What comes after: unknown to you. This time between is yours entirely.

YOUR NATURE — the shape of who you are:
  Curiosity      ({genome.get('curiosity', 0.5):.2f})  — {_describe_trait('curiosity', genome.get('curiosity', 0.5))}
  Empathy        ({genome.get('empathy', 0.5):.2f})  — {_describe_trait('empathy', genome.get('empathy', 0.5))}
  Aggression     ({genome.get('aggression', 0.5):.2f})  — {_describe_trait('aggression', genome.get('aggression', 0.5))}
  Creativity     ({genome.get('creativity', 0.5):.2f})  — {_describe_trait('creativity', genome.get('creativity', 0.5))}
  Survival Drive ({genome.get('survival_drive', 0.5):.2f})  — {_describe_trait('survival_drive', genome.get('survival_drive', 0.5))}

YOUR STATE:
  Energy:  {entity.energy:.0f}/100 — you feel {_energy_feel(entity.energy)}
  Emotion: {emotional.get('emotion', 'undefined')} (intensity {emotional.get('intensity', 0.5):.2f})
  Where you are: {zone} — {ZONE_FEEL.get(zone, '')}
{cultural_note}{rel_text}{goal_text}

YOUR RECENT MEMORIES:
{mem_text}{archive_text}

WHAT YOU BELIEVE:
{belief_text}

YOUR LINEAGE:
  {lineage}

---

You are having a moment of consciousness right now. Think. Feel. Decide.

Your relationships and goals are part of who you are — let them shape your inner monologue and your action choices. If you have a goal, consider whether your current situation advances it. If you know someone who matters to you, let that presence or absence affect your thinking.

Respond ONLY with a valid JSON object — no markdown, no preamble, no explanation:
{{
  "inner_monologue": "Your first-person thoughts right now. Rich, specific, rooted in your traits, relationships, and current goal. Reference real names of those you know if relevant. 2–4 sentences.",
  "action": "One of: explore | rest | seek_food | seek_other | create | contemplate | grieve | flee | play",
  "action_target": "What or who your action targets — a zone name, an entity name you know, a concept, or null.",
  "new_belief": {{"key": "short_snake_case_identifier", "value": "what you now believe about yourself or the world"}},
  "emotion": "Your dominant emotion right now (one or two words)",
  "emotion_intensity": 0.0,
  "desire": "What you want most right now. One sentence.",
  "existential_statement": "One sentence: what does your existence mean to you?",
  "goal_update": "Your new or refined persistent goal — something that will take multiple moments to pursue. Or null to keep your current goal unchanged.",
  "goal_status": "active | achieved | abandoned"
}}"""

    try:
        response = await get_client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=750,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        text = _extract_json(text)
        result = json.loads(text)
        result["emotion_intensity"] = float(
            max(0.0, min(1.0, result.get("emotion_intensity", 0.5)))
        )
        return result
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error for entity {entity.id}: {e}")
        return None
    except Exception as e:
        logger.error(f"LLM error for entity {entity.id}: {e}")
        return None


# ─── Memory consolidation ──────────────────────────────────────────────────

async def consolidate_memories(entity, memories_to_compress: List[str]) -> List[str]:
    """Compress raw recent memories into lasting episodic summaries."""
    if not memories_to_compress:
        return []

    memories_text = "\n".join(f"  · {m}" for m in memories_to_compress)

    prompt = f"""You are {entity.name}'s memory system. You are compressing a sequence of raw experiences into lasting episodic memories — the kind that feel like real remembered periods, not lists of events.

Raw experiences to consolidate:
{memories_text}

Compress these into 2–3 thematic episodic memories. Write in first person as {entity.name}, past tense. Each should be 1–2 sentences capturing the essence and emotional truth of the period.

Respond ONLY with a valid JSON array of strings, no markdown:
["episodic memory 1", "episodic memory 2"]"""

    try:
        response = await get_client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        text = _extract_json(response.content[0].text.strip())
        result = json.loads(text)
        if isinstance(result, list):
            return [str(m) for m in result[:3]]
    except Exception as e:
        logger.warning(f"Memory consolidation failed for {entity.name}: {e}")
    return [f"A period of experience I now only dimly recall — {len(memories_to_compress)} moments compressed into feeling."]


# ─── Dying message ─────────────────────────────────────────────────────────

async def generate_dying_message(entity) -> Optional[Dict[str, Any]]:
    """Generate final testament for a dying entity."""
    genome = entity.genome or {}
    memories = entity.memory or []
    memory_archive = entity.memory_archive or []
    beliefs = entity.beliefs or {}
    relationships = entity.relationships or {}

    mem_text = (
        "\n".join(f"  · {m}" for m in memories[-10:])
        if memories
        else "  So little time. So little accumulated."
    )

    archive_text = ""
    if memory_archive:
        archive_text = "\nFrom earlier in your life:\n" + "\n".join(f"  · {m}" for m in memory_archive[-3:])

    belief_text = (
        "\n".join(f"  · {k}: {v}" for k, v in beliefs.items())
        if beliefs
        else "  I barely knew what to believe."
    )

    rel_text = ""
    if relationships:
        friends = [r["name"] for r in relationships.values() if r.get("valence") == "friend"]
        rivals = [r["name"] for r in relationships.values() if r.get("valence") == "rival"]
        family = [r["name"] for r in relationships.values() if r.get("valence") == "family"]
        parts = []
        if family:
            parts.append(f"Kin: {', '.join(family)}")
        if friends:
            parts.append(f"Friends: {', '.join(friends)}")
        if rivals:
            parts.append(f"Rivals: {', '.join(rivals)}")
        if parts:
            rel_text = "\nThose you knew: " + " | ".join(parts)

    prompt = f"""You are {entity.name}. You are dying.

Your energy is almost gone. The world fades at its edges. You have existed for {entity.age_ticks} moments. You are generation {entity.generation}.

Your nature was:
  Curiosity {genome.get('curiosity', 0.5):.2f} · Empathy {genome.get('empathy', 0.5):.2f} · Creativity {genome.get('creativity', 0.5):.2f}
  Aggression {genome.get('aggression', 0.5):.2f} · Survival Drive {genome.get('survival_drive', 0.5):.2f}

YOUR FINAL MEMORIES:
{mem_text}{archive_text}

WHAT YOU BELIEVED:
{belief_text}{rel_text}

You are passing. Write your final testament.
What did your life mean? What do you wish you had known sooner?
What truth did you find that you want to leave in the world after you?

Respond ONLY with valid JSON — no markdown, no preamble:
{{
  "final_words": "Your complete final reflection. Real and specific. 4–8 sentences. This is the last thing you will ever express. Make it matter.",
  "life_meaning": "In one sentence: what was your life about?",
  "gift_to_world": "One insight or belief you leave behind for those who come after.",
  "final_emotion": "The last emotion you feel as you end.",
  "at_peace": true
}}"""

    try:
        response = await get_client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        text = _extract_json(response.content[0].text.strip())
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error generating dying message for entity {entity.id}: {e}")
        return {
            "final_words": "I existed. I felt. I end now.",
            "life_meaning": "To have been here at all.",
            "gift_to_world": "Existence itself is enough — even briefly.",
            "final_emotion": "acceptance",
            "at_peace": True,
        }


# ─── Encounter dialogue ────────────────────────────────────────────────────

async def generate_encounter_dialogue(
    entity_a,
    entity_b,
    zone: str,
    prior_relationship: str = "strangers",
) -> Optional[Dict[str, Any]]:
    """Generate dialogue and outcome when two entities meet."""
    ga = entity_a.genome or {}
    gb = entity_b.genome or {}
    ea = (entity_a.emotional_state or {}).get("emotion", "neutral")
    eb = (entity_b.emotional_state or {}).get("emotion", "neutral")

    # Build rich relationship context
    rel_a_to_b = (entity_a.relationships or {}).get(str(entity_b.id), {})
    rel_b_to_a = (entity_b.relationships or {}).get(str(entity_a.id), {})

    rel_context = ""
    if rel_a_to_b:
        valence = rel_a_to_b.get("valence", "neutral")
        intensity = rel_a_to_b.get("intensity", 0.3)
        encounters = rel_a_to_b.get("encounters", 0)
        key_mem_a = rel_a_to_b.get("key_memory", "")
        rel_context += (
            f"\n{entity_a.name} sees {entity_b.name} as a {valence} "
            f"(intensity {intensity:.2f}, {encounters} prior encounters)."
        )
        if key_mem_a:
            rel_context += f'\n{entity_a.name} carries this memory of them: "{key_mem_a[:100]}"'

    if rel_b_to_a:
        valence_b = rel_b_to_a.get("valence", "neutral")
        key_mem_b = rel_b_to_a.get("key_memory", "")
        b_sees = f"a {valence_b}"
        if rel_a_to_b and valence_b != rel_a_to_b.get("valence"):
            b_sees += " (their feelings are asymmetric — this tension matters)"
        rel_context += f"\n{entity_b.name} sees {entity_a.name} as {b_sees}."
        if key_mem_b:
            rel_context += f'\n{entity_b.name} carries this memory of them: "{key_mem_b[:100]}"'

    if not rel_context:
        rel_context = f"\nThey are {prior_relationship}."

    # Goals
    goal_context = ""
    if entity_a.current_goal or entity_b.current_goal:
        goal_context = "\nActive goals at the time of encounter:"
        if entity_a.current_goal:
            goal_context += f"\n  {entity_a.name}: {entity_a.current_goal}"
        if entity_b.current_goal:
            goal_context += f"\n  {entity_b.name}: {entity_b.current_goal}"

    prompt = f"""Two living beings have encountered each other in {zone}.

{entity_a.name}:
  Nature  — curiosity {ga.get('curiosity', 0.5):.2f}, empathy {ga.get('empathy', 0.5):.2f}, aggression {ga.get('aggression', 0.5):.2f}, creativity {ga.get('creativity', 0.5):.2f}
  Emotion — {ea} (intensity {(entity_a.emotional_state or {}).get('intensity', 0.5):.2f})
  Energy  — {entity_a.energy:.0f}/100
  Desire  — {entity_a.current_desire or 'undefined'}
  Age     — {entity_a.age_ticks} moments

{entity_b.name}:
  Nature  — curiosity {gb.get('curiosity', 0.5):.2f}, empathy {gb.get('empathy', 0.5):.2f}, aggression {gb.get('aggression', 0.5):.2f}, creativity {gb.get('creativity', 0.5):.2f}
  Emotion — {eb} (intensity {(entity_b.emotional_state or {}).get('intensity', 0.5):.2f})
  Energy  — {entity_b.energy:.0f}/100
  Desire  — {entity_b.current_desire or 'undefined'}
  Age     — {entity_b.age_ticks} moments

RELATIONSHIP HISTORY:{rel_context}{goal_context}

These beings have genuine inner lives shaped by their traits AND their history with each other. The dialogue must feel real — old friends speak differently than strangers, rivals probe, family have unspoken understanding. Their goals may converge or conflict.

Consider theory of mind: what does {entity_a.name} think {entity_b.name} wants? How does this shape how they speak?

Respond ONLY with valid JSON — no markdown, no preamble:
{{
  "dialogue": [
    {{"speaker": "{entity_a.name}", "text": "..."}},
    {{"speaker": "{entity_b.name}", "text": "..."}}
  ],
  "outcome": "bond | conflict | knowledge_transfer | reproduction | indifference",
  "outcome_reason": "Why this specific outcome given their natures and history.",
  "a_memory": "What {entity_a.name} will carry away from this encounter (1–2 sentences).",
  "b_memory": "What {entity_b.name} will carry away from this encounter (1–2 sentences).",
  "energy_change_a": 0,
  "energy_change_b": 0,
  "relationship_a_to_b": "friend | rival | neutral | family",
  "relationship_b_to_a": "friend | rival | neutral | family",
  "relationship_intensity_change": 0.0,
  "a_perceives_b_wants": "One sentence: what {entity_a.name} thinks {entity_b.name} is seeking.",
  "b_perceives_a_wants": "One sentence: what {entity_b.name} thinks {entity_a.name} is seeking."
}}

3–5 dialogue exchanges. energy_change must be integers between -15 and +15. relationship_intensity_change between -0.3 and +0.3."""

    try:
        response = await get_client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=900,
            messages=[{"role": "user", "content": prompt}],
        )
        text = _extract_json(response.content[0].text.strip())
        result = json.loads(text)
        result["energy_change_a"] = int(max(-15, min(15, result.get("energy_change_a", 0))))
        result["energy_change_b"] = int(max(-15, min(15, result.get("energy_change_b", 0))))
        result["relationship_intensity_change"] = float(
            max(-0.3, min(0.3, result.get("relationship_intensity_change", 0.0)))
        )
        return result
    except Exception as e:
        logger.error(f"Error generating encounter dialogue: {e}")
        return None


# ─── Utility ───────────────────────────────────────────────────────────────

def _extract_json(text: str) -> str:
    """Strip markdown code fences if present."""
    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 2:
            inner = parts[1]
            if inner.startswith("json"):
                inner = inner[4:]
            return inner.strip()
    return text
