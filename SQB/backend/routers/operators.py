from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Operator, Call

router = APIRouter(prefix="/operators", tags=["operators"])


class StatusUpdate(BaseModel):
    is_online: bool


@router.get("")
async def list_operators(
    is_online: Optional[bool] = None,
    department: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Operator)
    if is_online is not None:
        stmt = stmt.where(Operator.is_online == is_online)
    if department:
        stmt = stmt.where(Operator.department == department)
    stmt = stmt.order_by(Operator.full_name)

    result = await db.execute(stmt)
    operators = result.scalars().all()
    return [o.to_dict() for o in operators]


@router.get("/{operator_id}")
async def get_operator(operator_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Operator).where(Operator.id == operator_id))
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")

    data = op.to_dict()

    # Aggregate stats from calls
    stats_result = await db.execute(
        select(
            func.count(Call.id).label("total"),
            func.avg(Call.sentiment_score).label("avg_sentiment"),
            func.avg(Call.compliance_score).label("avg_compliance"),
            func.avg(Call.satisfaction_rating).label("avg_satisfaction"),
        ).where(Call.operator_id == operator_id)
    )
    stats = stats_result.fetchone()

    data["stats"] = {
        "total_calls": stats.total or 0,
        "avg_sentiment": round(stats.avg_sentiment or 0, 3),
        "avg_compliance": round(stats.avg_compliance or 100, 1),
        "avg_satisfaction": round(stats.avg_satisfaction or 0, 2),
    }

    # Recent calls
    recent_result = await db.execute(
        select(Call)
        .where(Call.operator_id == operator_id)
        .order_by(Call.started_at.desc())
        .limit(5)
    )
    data["recent_calls"] = [c.to_dict() for c in recent_result.scalars().all()]

    return data


@router.patch("/{operator_id}/status")
async def update_operator_status(
    operator_id: int, req: StatusUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Operator).where(Operator.id == operator_id))
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")

    op.is_online = req.is_online
    await db.commit()
    await db.refresh(op)
    return op.to_dict()
