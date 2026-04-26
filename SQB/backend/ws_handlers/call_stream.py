"""
WebSocket handler for live call transcription analysis.
Endpoint: /ws/call/{call_id}

Protocol:
  Client sends: JSON { "transcript_chunk": "...", "customer_id": int }
  Server sends: JSON { analysis result from Gemini }
"""
import json
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.gemini_service import analyze_transcript_segment_streaming
from services.nbo_engine import load_products
from services.compliance import load_rules


async def call_stream_handler(
    websocket: WebSocket,
    call_id: int,
    db: AsyncSession,
):
    await websocket.accept()
    print(f"[WS/call] Connected: call_id={call_id}")

    # Load products and compliance rules once
    products = load_products()
    compliance_rules = load_rules()

    # Try to load call + customer info
    from models import Call, Customer

    call_obj = None
    customer_profile = {}

    try:
        result = await db.execute(select(Call).where(Call.id == call_id))
        call_obj = result.scalar_one_or_none()
        if call_obj and call_obj.customer_id:
            cust_result = await db.execute(
                select(Customer).where(Customer.id == call_obj.customer_id)
            )
            cust = cust_result.scalar_one_or_none()
            if cust:
                customer_profile = cust.to_dict()
    except Exception as exc:
        print(f"[WS/call] DB lookup error: {exc}")

    accumulated_transcript = ""

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
                continue

            chunk = data.get("transcript_chunk", "")
            if not chunk:
                # Ping / keepalive
                await websocket.send_json({"type": "ping_ack"})
                continue

            accumulated_transcript += " " + chunk

            # Use last ~500 chars as the segment for analysis
            segment = accumulated_transcript[-500:].strip()

            analysis = {}
            try:
                async for event, data in analyze_transcript_segment_streaming(
                    transcript_segment=segment,
                    customer_profile=customer_profile,
                    products=products,
                    compliance_rules=compliance_rules,
                ):
                    if event == 'token':
                        await websocket.send_json({"type": "suggestion_token", "token": data})
                    else:  # complete
                        analysis = data
                        await websocket.send_json({"type": "analysis", "call_id": call_id, **analysis})
            except Exception as exc:
                print(f"[WS/call] Analysis error: {exc}")
                analysis = {"error": str(exc)}

            # Persist transcript update if we have a call obj
            if call_obj:
                try:
                    call_obj.transcript = accumulated_transcript.strip()
                    if "sentiment_score" in analysis:
                        call_obj.sentiment_score = analysis["sentiment_score"]
                    await db.commit()
                except Exception as exc:
                    print(f"[WS/call] DB persist error: {exc}")
                    await db.rollback()

    except WebSocketDisconnect:
        print(f"[WS/call] Disconnected: call_id={call_id}")
    except Exception as exc:
        print(f"[WS/call] Unexpected error: {exc}")
        try:
            await websocket.send_json({"error": str(exc)})
        except Exception:
            pass
