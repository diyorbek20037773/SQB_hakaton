from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Call, Customer, Operator, ComplianceEvent
from services.call_summary import generate_summary

router = APIRouter(prefix="/calls", tags=["calls"])


class StartCallRequest(BaseModel):
    operator_id: int
    customer_id: int


class UpdateCallRequest(BaseModel):
    status: Optional[str] = None
    transcript: Optional[str] = None
    sentiment_score: Optional[float] = None
    compliance_score: Optional[float] = None
    nbo_offered: Optional[list] = None
    nbo_accepted: Optional[bool] = None
    objections_detected: Optional[list] = None
    satisfaction_rating: Optional[int] = None
    topics: Optional[list] = None


@router.get("")
async def list_calls(
    operator_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Call)
    if operator_id:
        stmt = stmt.where(Call.operator_id == operator_id)
    if status:
        stmt = stmt.where(Call.status == status)

    stmt = stmt.order_by(Call.started_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(stmt)
    calls = result.scalars().all()

    count_stmt = select(func.count(Call.id))
    if operator_id:
        count_stmt = count_stmt.where(Call.operator_id == operator_id)
    if status:
        count_stmt = count_stmt.where(Call.status == status)
    total = (await db.execute(count_stmt)).scalar()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [c.to_dict() for c in calls],
    }


@router.get("/{call_id}")
async def get_call(call_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Call).where(Call.id == call_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    data = call.to_dict()

    # Include customer + operator info
    if call.customer_id:
        cust_result = await db.execute(select(Customer).where(Customer.id == call.customer_id))
        cust = cust_result.scalar_one_or_none()
        data["customer"] = cust.to_dict() if cust else None

    if call.operator_id:
        op_result = await db.execute(select(Operator).where(Operator.id == call.operator_id))
        op = op_result.scalar_one_or_none()
        data["operator"] = op.to_dict() if op else None

    # Include compliance events
    ce_result = await db.execute(
        select(ComplianceEvent).where(ComplianceEvent.call_id == call_id)
    )
    ces = ce_result.scalars().all()
    data["compliance_events"] = [ce.to_dict() for ce in ces]

    return data


@router.post("")
async def start_call(req: StartCallRequest, db: AsyncSession = Depends(get_db)):
    # Verify operator and customer exist
    op = (await db.execute(select(Operator).where(Operator.id == req.operator_id))).scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")

    cust = (await db.execute(select(Customer).where(Customer.id == req.customer_id))).scalar_one_or_none()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    call = Call(
        operator_id=req.operator_id,
        customer_id=req.customer_id,
        started_at=datetime.utcnow(),
        status="active",
        transcript="",
        nbo_offered=[],
        objections_detected=[],
        topics=[],
    )
    db.add(call)
    await db.commit()
    await db.refresh(call)

    # Mark operator as online
    op.is_online = True
    op.total_calls += 1
    await db.commit()

    return call.to_dict()


@router.patch("/{call_id}")
async def update_call(
    call_id: int, req: UpdateCallRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Call).where(Call.id == call_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    if req.status is not None:
        call.status = req.status
    if req.transcript is not None:
        call.transcript = req.transcript
    if req.sentiment_score is not None:
        call.sentiment_score = req.sentiment_score
    if req.compliance_score is not None:
        call.compliance_score = req.compliance_score
    if req.nbo_offered is not None:
        call.nbo_offered = req.nbo_offered
    if req.nbo_accepted is not None:
        call.nbo_accepted = req.nbo_accepted
    if req.objections_detected is not None:
        call.objections_detected = req.objections_detected
    if req.satisfaction_rating is not None:
        call.satisfaction_rating = req.satisfaction_rating
    if req.topics is not None:
        call.topics = req.topics

    await db.commit()
    await db.refresh(call)
    return call.to_dict()


@router.post("/{call_id}/end")
async def end_call(call_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Call).where(Call.id == call_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    call.status = "completed"
    call.ended_at = datetime.utcnow()

    # Get names for summary
    cust_name = "Noma'lum mijoz"
    op_name = "Operator"

    if call.customer_id:
        cust = (await db.execute(select(Customer).where(Customer.id == call.customer_id))).scalar_one_or_none()
        if cust:
            cust_name = cust.full_name

    if call.operator_id:
        op = (await db.execute(select(Operator).where(Operator.id == call.operator_id))).scalar_one_or_none()
        if op:
            op_name = op.full_name

    # Generate summary
    summary_data = await generate_summary(
        transcript=call.transcript or "",
        customer_name=cust_name,
        operator_name=op_name,
    )

    call.summary = summary_data.get("summary", "")
    if summary_data.get("compliance_score") is not None:
        call.compliance_score = summary_data["compliance_score"]
    if summary_data.get("key_topics"):
        existing_topics = call.topics or []
        call.topics = list(set(existing_topics + summary_data["key_topics"]))

    # Update operator stats
    if call.operator_id:
        op = (await db.execute(select(Operator).where(Operator.id == call.operator_id))).scalar_one_or_none()
        if op and call.nbo_accepted:
            # Recalculate conversion rate
            total = op.total_calls or 1
            op.conversion_rate = min(
                1.0, ((op.conversion_rate * (total - 1)) + 1) / total
            )

        # Store compliance violations as ComplianceEvent records
        for violation in summary_data.get("compliance_violations", []):
            ce = ComplianceEvent(
                call_id=call_id,
                event_type=violation.get("type", "unknown"),
                description=violation.get("description", ""),
                severity=violation.get("severity", "low"),
                timestamp=datetime.utcnow(),
                resolved=False,
            )
            db.add(ce)

    await db.commit()
    await db.refresh(call)

    return {**call.to_dict(), "summary_details": summary_data}
