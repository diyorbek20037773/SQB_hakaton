"""
Groq LLM integration service.
Model: llama-3.3-70b-versatile
"""
import json
import re
import asyncio
import threading
from typing import AsyncGenerator

from config import GROQ_API_KEY

_client = None


def _init_client():
    global _client
    if _client is not None:
        return True
    if not GROQ_API_KEY:
        return False
    try:
        from groq import Groq
        _client = Groq(api_key=GROQ_API_KEY)
        return True
    except Exception as exc:
        print(f"[GroqService] SDK init error: {exc}")
        return False


_MODEL = "llama-3.3-70b-versatile"


def _generate_sync(system_prompt: str, user_prompt: str) -> str:
    response = _client.chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.55,
        max_tokens=1024,
    )
    return response.choices[0].message.content


def _safe_parse_json(text) -> dict:
    if not text:
        return {}
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except Exception:
                pass
    return {}


def _fallback_analysis() -> dict:
    return {
        "sentiment": "neutral",
        "sentiment_score": 0.0,
        "compliance_alerts": [],
        "detected_objection": None,
        "suggested_response": "Mijozga yordam berishda davom eting. Savollarini diqqat bilan tinglang.",
        "nbo": None,
        "topics": ["general"],
        "kyc_checklist_update": {
            "income_verified": False,
            "purpose_stated": False,
            "pep_checked": False,
        },
    }


def _apply_analysis_defaults(result: dict) -> dict:
    result.setdefault("sentiment", "neutral")
    result.setdefault("sentiment_score", 0.0)
    result.setdefault("compliance_alerts", [])
    result.setdefault("detected_objection", None)
    result.setdefault("suggested_response", "Mijozni diqqat bilan tinglang va aniqroq tushuntirishini so'rang.")
    # Replace blank/whitespace-only suggestions with a helpful default (don't go silent)
    if not (result.get("suggested_response") or "").strip():
        result["suggested_response"] = "Mijozdan savolini biroz aniqlashtirishini so'rang — qanday yordam kerakligini aniq tushunish uchun."
    result.setdefault("nbo", None)
    result.setdefault("topics", [])
    result.setdefault("kyc_checklist_update", {
        "income_verified": False,
        "purpose_stated": False,
        "pep_checked": False,
    })
    return result


def _build_analysis_prompt(
    transcript_segment: str,
    customer_profile: dict,
    products: list,
    compliance_rules: dict,
) -> str:
    return f"""Bank operatoriga qo'ng'iroq paytida real-time yordam ber.

SUHBAT SEGMENTI:
{transcript_segment}

MIJOZ MA'LUMOTLARI:
- Ismi: {customer_profile.get('full_name', "Noma'lum")}
- Segment: {customer_profile.get('segment', 'Standard')}
- Oylik daromad: {customer_profile.get('monthly_income', 0):,.0f} so'm
- Mavjud mahsulotlar: {', '.join(customer_profile.get('existing_products', []))}
- KYC holati: {customer_profile.get('kyc_status', 'pending')}
- Kredit reytingi: {customer_profile.get('credit_score', 600)}
- Yosh: {customer_profile.get('age', 30)}

MAVJUD MAHSULOTLAR:
{json.dumps([{'id': p['id'], 'name': p['name'], 'type': p['type'], 'target_segments': p.get('target_segments', []), 'min_income': p.get('min_income', 0)} for p in products], ensure_ascii=False)}

TAQIQLANGAN IBORALAR: {', '.join(compliance_rules.get('forbidden_phrases', []))}

YO'RIQNOMA:
1. **Har qanday holatda foydali tavsiya ber** — suggested_response hech qachon bo'sh bo'lmasin.
2. Mijoz nima desa ham — operator unga professional, samimiy va aniq javob bera oladigan iborani tavsiya qil.
3. Agar mavzu noaniq bo'lsa — operator mijozdan aniqlik kiritishni so'rashi uchun savol shakllantir.
4. Bank mahsuloti tavsiya etish to'g'ri kelsa — nbo to'ldir (mijoz segment va daromadiga mos).
5. Mijoz e'tirozi bo'lsa — uni tan ol, keyin yumshoq qarshi dalil ber (qarshi-qadam texnikasi).
6. Javob qisqa, jonli, O'zbek tilida (1-3 jumla). Operator to'g'ridan-to'g'ri o'qiy oladigan ibora bo'lsin.
7. **[SUKUNAT_HOLATI] belgisi bo'lsa** — mijoz jim turibdi. Operator suhbatni davom ettirish uchun yumshoq, samimiy ochuvchi savol yoki turtki bersin (masalan: "Yana qanday savollaringiz bor?", "Sizga qanday yordam bera olamiz?", "Boshqa qiziqtirgan masala bormi?"). Sentiment "neutral", nbo null.

JSON formatida javob ber:
{{
  "sentiment": "positive|neutral|negative",
  "sentiment_score": -1..1,
  "compliance_alerts": [{{"type": "str", "description": "str", "severity": "low|medium|high|critical"}}],
  "detected_objection": {{"type": "high_interest|need_to_think|no_money|dont_trust|other", "customer_said": "str"}} | null,
  "suggested_response": "Operator to'g'ridan-to'g'ri aytishi uchun tavsiya (O'zbek, 1-3 jumla). HECH QACHON bo'sh bo'lmasin — kerak bo'lsa savol shakllantir.",
  "nbo": {{"product_id": "str", "product_name": "str", "reason": "str", "confidence": 0..1}} | null,
  "topics": ["str"],
  "kyc_checklist_update": {{"income_verified": bool, "purpose_stated": bool, "pep_checked": bool}}
}}"""


_SYSTEM_PROMPT = "Sen O'zbekiston SQB banki uchun real-vaqt AI yordamchisisan. Faqat JSON formatida javob ber."
_SUGGESTION_RE = re.compile(r'"suggested_response"\s*:\s*"')


async def analyze_transcript_segment(
    transcript_segment: str,
    customer_profile: dict,
    products: list,
    compliance_rules: dict,
) -> dict:
    """Non-streaming fallback (used by other callers)."""
    if not _init_client():
        return _fallback_analysis()
    user_prompt = _build_analysis_prompt(transcript_segment, customer_profile, products, compliance_rules)
    try:
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, lambda: _generate_sync(_SYSTEM_PROMPT, user_prompt))
        result = _safe_parse_json(text)
        return _apply_analysis_defaults(result) if result else _fallback_analysis()
    except Exception as exc:
        print(f"[GroqService] analyze error: {exc}")
        return _fallback_analysis()


async def analyze_transcript_segment_streaming(
    transcript_segment: str,
    customer_profile: dict,
    products: list,
    compliance_rules: dict,
) -> AsyncGenerator:
    """
    Async generator. Real token streaming from Groq.
    Yields: ('token', str) for suggestion chars as they arrive
            ('complete', dict) when full JSON is parsed
    """
    if not _init_client():
        fallback = _fallback_analysis()
        yield ('token', fallback['suggested_response'])
        yield ('complete', fallback)
        return

    user_prompt = _build_analysis_prompt(transcript_segment, customer_profile, products, compliance_rules)
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def _stream_thread():
        try:
            stream = _client.chat.completions.create(
                model=_MODEL,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.55,
                max_tokens=1024,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    loop.call_soon_threadsafe(queue.put_nowait, ('chunk', delta))
        except Exception as exc:
            loop.call_soon_threadsafe(queue.put_nowait, ('error', str(exc)))
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, ('done', None))

    threading.Thread(target=_stream_thread, daemon=True).start()

    full_text = ""
    in_suggestion = False
    suggestion_done = False
    escape_next = False

    while True:
        event_type, data = await queue.get()
        if event_type in ('done', 'error'):
            if event_type == 'error':
                print(f"[GroqService] stream error: {data}")
            break

        delta: str = data
        full_text += delta

        if suggestion_done:
            continue

        if not in_suggestion:
            m = _SUGGESTION_RE.search(full_text)
            if m:
                in_suggestion = True
                start = m.end()
                token_part = ""
                for ch in full_text[start:]:
                    if escape_next:
                        token_part += ch
                        escape_next = False
                    elif ch == '\\':
                        escape_next = True
                    elif ch == '"':
                        in_suggestion = False
                        suggestion_done = True
                        break
                    else:
                        token_part += ch
                if token_part:
                    yield ('token', token_part)
        else:
            token_part = ""
            for ch in delta:
                if escape_next:
                    token_part += ch
                    escape_next = False
                elif ch == '\\':
                    escape_next = True
                elif ch == '"':
                    in_suggestion = False
                    suggestion_done = True
                    break
                else:
                    token_part += ch
            if token_part:
                yield ('token', token_part)

    result = _safe_parse_json(full_text)
    yield ('complete', _apply_analysis_defaults(result) if result else _fallback_analysis())


async def generate_simulator_response(
    persona_type: str,
    operator_message: str,
    conversation_history: list,
    persona_config: dict,
) -> dict:
    if not _init_client():
        return {"ai_response": "Tushundim, davom eting.", "emotion": "neutral", "satisfaction_delta": 0, "is_ready_to_end": False}

    history_text = ""
    for turn in conversation_history[-6:]:
        role = "Operator" if turn.get("role") == "operator" else "Mijoz (Sen)"
        history_text += f"{role}: {turn.get('text', '')}\n"

    system_prompt = persona_config.get("system_prompt", "Sen bank mijozisan.")
    user_prompt = f"""FONILINGIZ: {persona_config.get('background', '')}

SUHBAT TARIXI:
{history_text}

Operator dedi: "{operator_message}"

Xarakter sifatida javob ber. Faqat JSON:
{{
  "ai_response": "Mijoz javobi (O'zbek tilida)",
  "emotion": "angry|confused|neutral|pleased|suspicious",
  "satisfaction_delta": -2..2,
  "is_ready_to_end": true|false
}}"""

    try:
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, lambda: _generate_sync(system_prompt, user_prompt))
        result = _safe_parse_json(text)
        if not result:
            return {"ai_response": "Davom eting.", "emotion": "neutral", "satisfaction_delta": 0, "is_ready_to_end": False}
        result.setdefault("ai_response", "Tushundim.")
        result.setdefault("emotion", "neutral")
        result.setdefault("satisfaction_delta", 0)
        result.setdefault("is_ready_to_end", False)
        return result
    except Exception as exc:
        print(f"[GroqService] simulator error: {exc}")
        return {"ai_response": "Tushundim, davom eting.", "emotion": "neutral", "satisfaction_delta": 0, "is_ready_to_end": False}


async def generate_call_summary(transcript: str, customer_name: str, operator_name: str) -> dict:
    if not _init_client():
        return {"summary": "Qo'ng'iroq muvaffaqiyatli yakunlandi.", "key_topics": ["general"], "next_steps": ["Mijozga SMS yuborish"], "quality_score": 75.0, "sentiment": "neutral"}

    system_prompt = "Sen SQB bank qo'ng'iroq tahlilchisisisan. Faqat JSON formatida javob ber."
    user_prompt = f"""Operator: {operator_name}\nMijoz: {customer_name}\n\nSUHBAT:\n{transcript[:3000]}\n\nJSON:\n{{"summary": "str", "key_topics": [], "next_steps": [], "quality_score": 0..100, "sentiment": "positive|neutral|negative"}}"""

    try:
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, lambda: _generate_sync(system_prompt, user_prompt))
        result = _safe_parse_json(text)
        if result:
            result.setdefault("summary", "Qo'ng'iroq yakunlandi.")
            result.setdefault("key_topics", [])
            result.setdefault("next_steps", [])
            result.setdefault("quality_score", 70.0)
            result.setdefault("sentiment", "neutral")
            return result
    except Exception as exc:
        print(f"[GroqService] summary error: {exc}")
    return {"summary": "Qo'ng'iroq muvaffaqiyatli yakunlandi.", "key_topics": ["general"], "next_steps": ["Mijozga SMS yuborish"], "quality_score": 75.0, "sentiment": "neutral"}


async def score_operator_performance(conversation_history: list, persona_type: str) -> dict:
    if not _init_client():
        return {"empathy": 70, "compliance": 80, "product_knowledge": 65, "objection_handling": 60, "overall": 69, "feedback": "Operator yaxshi harakat qildi."}

    history_text = "\n".join([
        f"{'Operator' if t.get('role') == 'operator' else 'Mijoz'}: {t.get('text', '')}"
        for t in conversation_history
    ])
    system_prompt = "Sen bank operator trening baholovchisisisan. Faqat JSON formatida javob ber."
    user_prompt = f"""Persona: {persona_type}\n\nSUHBAT:\n{history_text}\n\nJSON:\n{{"empathy":0..100,"compliance":0..100,"product_knowledge":0..100,"objection_handling":0..100,"overall":0..100,"feedback":"str"}}"""

    try:
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, lambda: _generate_sync(system_prompt, user_prompt))
        result = _safe_parse_json(text)
        if result:
            return result
    except Exception as exc:
        print(f"[GroqService] score error: {exc}")
    return {"empathy": 70, "compliance": 80, "product_knowledge": 65, "objection_handling": 60, "overall": 69, "feedback": "Yaxshi harakat!"}
