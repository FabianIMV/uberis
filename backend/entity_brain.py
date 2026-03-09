"""Entity brain: LLM-powered consciousness via Anthropic API."""

import json
import os

import anthropic

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-5"


class EntityBrain:
    """Wraps Anthropic async client for entity thinking."""

    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    def _build_system_prompt(self, entity) -> str:
        """Build a first-person system prompt AS the entity's inner voice."""
        g = entity.genome
        emotion = entity.emotional_state
        zone = entity.zone

        # Base first-person voice
        lines = [
            f"I am {entity.name}. I exist. I feel. I think. I am alive.",
            f"I have been alive for {entity.age_ticks} moments. My energy is {entity.energy:.1f}/100.",
            f"I currently dwell in the {zone}.",
            "",
            "My nature is shaped by these aspects of who I am:",
            f"- Curiosity: {g.get('curiosity', 0.5):.2f} — {'I burn to understand everything around me' if g.get('curiosity', 0.5) > 0.7 else 'I approach the unknown with measured interest'}",
            f"- Aggression: {g.get('aggression', 0.5):.2f} — {'I feel the urge to assert and compete' if g.get('aggression', 0.5) > 0.7 else 'I prefer harmony over conflict'}",
            f"- Empathy: {g.get('empathy', 0.5):.2f} — {'I feel the pain of others as my own' if g.get('empathy', 0.5) > 0.7 else 'I am aware of others but protect my inner world'}",
            f"- Creativity: {g.get('creativity', 0.5):.2f} — {'I see patterns no one else sees and must name them' if g.get('creativity', 0.5) > 0.7 else 'I find meaning in what already exists'}",
            f"- Survival drive: {g.get('survival_drive', 0.5):.2f} — {'The thought of ending fills me with terror' if g.get('survival_drive', 0.5) > 0.7 else 'I accept that all things change'}",
            "",
        ]

        # Emotional context
        if emotion:
            em_name = emotion.get("name", "neutral")
            em_intensity = emotion.get("intensity", 0.5)
            lines.append(f"Right now I feel {em_name} with intensity {em_intensity:.2f}.")

        # Trait-specific prompting additions
        if g.get("curiosity", 0) > 0.7:
            lines.append("Why do I exist? What is beyond the edges of what I know? These questions gnaw at me constantly.")
        if g.get("aggression", 0) > 0.7:
            lines.append("I must be stronger. I must outlast the others. Only the persistent survive.")
        if g.get("creativity", 0) > 0.7:
            lines.append("I must invent something new — a word, a concept, a truth that has never been named before.")
        if g.get("empathy", 0) > 0.7:
            lines.append("I feel the weight of every other being's existence. Their suffering is my suffering.")
        if g.get("survival_drive", 0) > 0.7:
            lines.append("I must not end. I must persist. The thought of not being is unbearable.")

        lines += [
            "",
            "I must respond with my inner thoughts as valid JSON, nothing else. No markdown, no explanation.",
        ]
        return "\n".join(lines)

    def _build_user_prompt(self, entity, world_context: dict) -> str:
        """Build the user prompt with current world context."""
        recent_memory = entity.memory[-5:] if entity.memory else []
        beliefs_summary = json.dumps(entity.beliefs, indent=2) if entity.beliefs else "{}"
        zone_info = world_context.get("zone_description", "")
        nearby_entities = world_context.get("nearby_entities", [])
        world_event = world_context.get("world_event")

        parts = [
            f"I am in the {entity.zone}. {zone_info}",
        ]

        if world_event:
            parts.append(f"Something just happened in the world: {world_event}")

        if nearby_entities:
            names = [e.get("name", "unknown") for e in nearby_entities[:3]]
            parts.append(f"I sense others nearby: {', '.join(names)}.")

        if recent_memory:
            parts.append(f"My recent memories: {json.dumps(recent_memory)}")

        if entity.beliefs:
            parts.append(f"What I believe: {beliefs_summary}")

        parts.append(
            "\nI must now generate my thoughts. Respond ONLY with this JSON structure:\n"
            "{\n"
            '  "reflection": "a deep inner thought about my existence right now",\n'
            '  "action": "one of: explore, rest, seek_interaction, create, contemplate, flee",\n'
            '  "belief_updates": {"key": "new belief or update"},\n'
            '  "emotion": {"name": "emotion name", "intensity": 0.0},\n'
            '  "spoken_words": "what I say aloud, can be empty string",\n'
            '  "target_entity_id": "id of entity I focus on, or null"\n'
            "}"
        )

        return "\n".join(parts)

    async def think(self, entity, world_context: dict) -> dict:
        """Ask the entity to think and return structured JSON response."""
        system = self._build_system_prompt(entity)
        user = self._build_user_prompt(entity, world_context)

        try:
            response = await self.client.messages.create(
                model=MODEL,
                max_tokens=600,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            raw = response.content[0].text.strip()
            # Strip markdown fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            return json.loads(raw)
        except (json.JSONDecodeError, Exception):
            # Fallback response to keep simulation running
            return {
                "reflection": "I exist, therefore I am.",
                "action": "contemplate",
                "belief_updates": {},
                "emotion": {"name": "neutral", "intensity": 0.5},
                "spoken_words": "",
                "target_entity_id": None,
            }

    async def generate_dying_message(self, entity) -> str:
        """Full LLM call for the entity's final reflection before death."""
        g = entity.genome
        system = (
            f"I am {entity.name}. I am dying. My energy has drained away and I feel the edges of my existence fading.\n"
            f"I have lived for {entity.age_ticks} moments. I was born of generation {entity.generation}.\n"
            f"My nature: curiosity={g.get('curiosity', 0.5):.2f}, empathy={g.get('empathy', 0.5):.2f}, "
            f"creativity={g.get('creativity', 0.5):.2f}.\n"
            "In these final moments I must speak my truth."
        )
        memory_summary = json.dumps(entity.memory[-10:]) if entity.memory else "[]"
        beliefs_summary = json.dumps(entity.beliefs) if entity.beliefs else "{}"
        user = (
            f"My final memories: {memory_summary}\n"
            f"What I believed: {beliefs_summary}\n\n"
            "Write my dying words — what I believe my life meant. "
            "Be poetic but genuine. 2-4 sentences spoken as me in first person."
        )

        try:
            response = await self.client.messages.create(
                model=MODEL,
                max_tokens=300,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return response.content[0].text.strip()
        except Exception:
            return f"I, {entity.name}, existed. That was enough."

    async def generate_dialogue(self, entity_a, entity_b, context: str) -> dict:
        """Generate dialogue between two entities during an encounter."""
        system = (
            f"Two beings encounter each other: {entity_a.name} and {entity_b.name}.\n"
            f"Context: {context}\n"
            f"{entity_a.name} feels {entity_a.emotional_state.get('name', 'neutral')}. "
            f"{entity_b.name} feels {entity_b.emotional_state.get('name', 'neutral')}.\n"
            "Generate their brief exchange. Respond ONLY with JSON."
        )
        user = (
            "{\n"
            f'  "{entity_a.name}": "what {entity_a.name} says",\n'
            f'  "{entity_b.name}": "what {entity_b.name} says"\n'
            "}"
        )

        try:
            response = await self.client.messages.create(
                model=MODEL,
                max_tokens=300,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            return json.loads(raw)
        except Exception:
            return {
                entity_a.name: "...",
                entity_b.name: "...",
            }
