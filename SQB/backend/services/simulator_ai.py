"""
Simulator AI service.
Loads customer personas and provides scoring/prompt utilities.
"""
import json
import os
from typing import Optional
from services.gemini_service import score_operator_performance

_PERSONAS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "customer_personas.json")
_personas_cache: Optional[dict] = None


def load_personas() -> dict:
    global _personas_cache
    if _personas_cache is None:
        try:
            with open(_PERSONAS_PATH, encoding="utf-8") as f:
                _personas_cache = json.load(f)
        except Exception as exc:
            print(f"[SimulatorAI] Could not load customer_personas.json: {exc}")
            _personas_cache = {}
    return _personas_cache


def get_persona_prompt(persona_type: str) -> str:
    """Return the system prompt for an AI customer persona."""
    personas = load_personas()
    persona = personas.get(persona_type)
    if not persona:
        return "Sen bank mijozisan. Oddiy savol ber va javoblarni tingla."
    return persona.get("system_prompt", "Sen bank mijozisan.")


def get_persona_config(persona_type: str) -> dict:
    """Return full persona configuration."""
    personas = load_personas()
    return personas.get(persona_type, {})


def get_initial_message(persona_type: str) -> str:
    """Return the initial customer message for a persona."""
    personas = load_personas()
    persona = personas.get(persona_type, {})
    return persona.get(
        "initial_message",
        "Salom, bank xizmati haqida savol bor edi."
    )


def get_all_personas() -> dict:
    return load_personas()


async def score_operator_response(
    conversation_history: list,
    persona_type: str,
) -> dict:
    """
    Score operator's performance using Gemini.
    Returns scores for empathy, compliance, product_knowledge, objection_handling.
    """
    scores = await score_operator_performance(conversation_history, persona_type)

    # Add criteria descriptions from persona config
    persona = get_persona_config(persona_type)
    criteria = persona.get("scoring_criteria", {})
    scores["criteria_descriptions"] = criteria

    return scores
