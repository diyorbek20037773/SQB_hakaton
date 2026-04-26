from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import SimulatorSession, Operator
from services.simulator_ai import (
    get_initial_message,
    get_all_personas,
    score_operator_response,
)

router = APIRouter(prefix="/simulator", tags=["simulator"])


class StartSessionRequest(BaseModel):
    operator_id: int
    persona_type: str  # angry / confused / savvy


class EndSessionRequest(BaseModel):
    transcript: Optional[str] = None
    conversation_history: Optional[list] = None


@router.post("/start")
async def start_session(req: StartSessionRequest, db: AsyncSession = Depends(get_db)):
    # Verify operator
    op = (
        await db.execute(select(Operator).where(Operator.id == req.operator_id))
    ).scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")

    valid_personas = ["angry", "confused", "savvy"]
    if req.persona_type not in valid_personas:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid persona_type. Must be one of: {valid_personas}",
        )

    session = SimulatorSession(
        operator_id=req.operator_id,
        persona_type=req.persona_type,
        started_at=datetime.utcnow(),
        transcript="",
        score=0.0,
        feedback="",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Get initial customer message
    initial_msg = get_initial_message(req.persona_type)
    personas = get_all_personas()
    persona_info = personas.get(req.persona_type, {})

    return {
        **session.to_dict(),
        "initial_message": initial_msg,
        "persona": {
            "name": persona_info.get("name", req.persona_type),
            "description": persona_info.get("description", ""),
            "difficulty": persona_info.get("difficulty", "medium"),
        },
    }


@router.get("/sessions")
async def list_sessions(
    operator_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SimulatorSession).order_by(SimulatorSession.started_at.desc())
    if operator_id:
        stmt = stmt.where(SimulatorSession.operator_id == operator_id)
    stmt = stmt.limit(50)

    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return [s.to_dict() for s in sessions]


@router.get("/{session_id}")
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SimulatorSession).where(SimulatorSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    data = session.to_dict()
    personas = get_all_personas()
    persona_info = personas.get(session.persona_type, {})
    data["persona"] = {
        "name": persona_info.get("name", session.persona_type),
        "description": persona_info.get("description", ""),
        "difficulty": persona_info.get("difficulty", "medium"),
        "scoring_criteria": persona_info.get("scoring_criteria", {}),
    }
    return data


@router.post("/{session_id}/end")
async def end_session(
    session_id: int,
    req: EndSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SimulatorSession).where(SimulatorSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.ended_at:
        raise HTTPException(status_code=400, detail="Session already ended")

    session.ended_at = datetime.utcnow()

    if req.transcript:
        session.transcript = req.transcript

    # Score the session
    conversation_history = req.conversation_history or []
    scores = await score_operator_response(conversation_history, session.persona_type)

    session.score = float(scores.get("overall", 0))
    session.feedback = scores.get("feedback", "")

    await db.commit()
    await db.refresh(session)

    return {
        **session.to_dict(),
        "scores": {
            "empathy": scores.get("empathy", 0),
            "compliance": scores.get("compliance", 0),
            "product_knowledge": scores.get("product_knowledge", 0),
            "objection_handling": scores.get("objection_handling", 0),
            "overall": scores.get("overall", 0),
        },
        "feedback": scores.get("feedback", ""),
        "criteria_descriptions": scores.get("criteria_descriptions", {}),
    }
