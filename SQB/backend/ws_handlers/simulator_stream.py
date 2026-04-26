"""
WebSocket handler for the training simulator.
Endpoint: /ws/simulator/{session_id}

Protocol:
  Client sends: JSON { "operator_message": "..." }
  Server sends: JSON { "ai_response": "...", "scores": {...}, "feedback": "..." }
"""
import json
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.gemini_service import generate_simulator_response
from services.simulator_ai import get_persona_config, score_operator_response


async def simulator_stream_handler(
    websocket: WebSocket,
    session_id: int,
    db: AsyncSession,
):
    await websocket.accept()
    print(f"[WS/simulator] Connected: session_id={session_id}")

    from models import SimulatorSession

    # Load session
    session = None
    persona_type = "confused"
    persona_config = {}

    try:
        result = await db.execute(
            select(SimulatorSession).where(SimulatorSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if session:
            persona_type = session.persona_type
            persona_config = get_persona_config(persona_type)
        else:
            await websocket.send_json({"error": f"Session {session_id} not found"})
            await websocket.close()
            return
    except Exception as exc:
        print(f"[WS/simulator] DB lookup error: {exc}")

    conversation_history = []
    total_satisfaction = 5  # Start at neutral

    # Send initial AI customer message
    initial_msg = persona_config.get("initial_message", "Salom, yordam kerak.")
    conversation_history.append({"role": "customer", "text": initial_msg})
    await websocket.send_json(
        {
            "type": "ai_message",
            "ai_response": initial_msg,
            "emotion": "neutral",
            "satisfaction": total_satisfaction,
            "turn": 0,
        }
    )

    turn = 0

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
                continue

            operator_message = data.get("operator_message", "").strip()
            if not operator_message:
                await websocket.send_json({"type": "ping_ack"})
                continue

            turn += 1
            conversation_history.append({"role": "operator", "text": operator_message})

            # Generate AI customer response
            try:
                ai_result = await generate_simulator_response(
                    persona_type=persona_type,
                    operator_message=operator_message,
                    conversation_history=conversation_history,
                    persona_config=persona_config,
                )
            except Exception as exc:
                print(f"[WS/simulator] Gemini error: {exc}")
                ai_result = {
                    "ai_response": "Tushundim.",
                    "emotion": "neutral",
                    "satisfaction_delta": 0,
                    "is_ready_to_end": False,
                }

            ai_response_text = ai_result.get("ai_response", "Tushundim.")
            conversation_history.append({"role": "customer", "text": ai_response_text})

            # Update satisfaction
            delta = ai_result.get("satisfaction_delta", 0)
            total_satisfaction = max(1, min(10, total_satisfaction + delta))

            # Score operator response (lightweight, every 3 turns)
            turn_scores = {}
            if turn % 3 == 0 and len(conversation_history) >= 4:
                try:
                    scores = await score_operator_response(
                        conversation_history[-6:], persona_type
                    )
                    turn_scores = {
                        "empathy": scores.get("empathy", 0),
                        "compliance": scores.get("compliance", 0),
                        "product_knowledge": scores.get("product_knowledge", 0),
                        "objection_handling": scores.get("objection_handling", 0),
                        "overall": scores.get("overall", 0),
                    }
                except Exception as exc:
                    print(f"[WS/simulator] Score error: {exc}")

            # Persist transcript to session
            if session:
                try:
                    transcript_lines = []
                    for msg in conversation_history:
                        role_label = "Operator" if msg["role"] == "operator" else "Mijoz (AI)"
                        transcript_lines.append(f"{role_label}: {msg['text']}")
                    session.transcript = "\n".join(transcript_lines)
                    await db.commit()
                except Exception as exc:
                    print(f"[WS/simulator] DB persist error: {exc}")
                    await db.rollback()

            response_payload = {
                "type": "ai_message",
                "ai_response": ai_response_text,
                "emotion": ai_result.get("emotion", "neutral"),
                "satisfaction": total_satisfaction,
                "satisfaction_delta": delta,
                "turn": turn,
                "is_ready_to_end": ai_result.get("is_ready_to_end", False),
            }
            if turn_scores:
                response_payload["scores"] = turn_scores

            await websocket.send_json(response_payload)

            # Auto-end if AI customer is done
            if ai_result.get("is_ready_to_end") and turn >= 5:
                await websocket.send_json(
                    {
                        "type": "session_complete",
                        "message": "Mijoz suhbatni tugatdi. Natijalarni ko'rish uchun seansni yakunlang.",
                    }
                )
                break

    except WebSocketDisconnect:
        print(f"[WS/simulator] Disconnected: session_id={session_id}")
    except Exception as exc:
        print(f"[WS/simulator] Unexpected error: {exc}")
        try:
            await websocket.send_json({"error": str(exc)})
        except Exception:
            pass
