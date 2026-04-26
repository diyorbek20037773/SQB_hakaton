from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Call, Operator, Customer, ComplianceEvent

router = APIRouter(prefix="/supervisor", tags=["supervisor"])


@router.get("/active-calls")
async def active_calls(db: AsyncSession = Depends(get_db)):
    """All currently active calls with live data."""
    result = await db.execute(
        select(Call).where(Call.status == "active").order_by(Call.started_at.asc())
    )
    calls = result.scalars().all()

    enriched = []
    for call in calls:
        data = call.to_dict()

        # Customer info
        cust = (
            await db.execute(select(Customer).where(Customer.id == call.customer_id))
        ).scalar_one_or_none()
        data["customer"] = cust.to_dict() if cust else None

        # Operator info
        op = (
            await db.execute(select(Operator).where(Operator.id == call.operator_id))
        ).scalar_one_or_none()
        data["operator"] = op.to_dict() if op else None

        # Duration
        if call.started_at:
            duration = (datetime.utcnow() - call.started_at).total_seconds()
            data["duration_seconds"] = int(duration)
        else:
            data["duration_seconds"] = 0

        enriched.append(data)

    return enriched


@router.get("/operator-rankings")
async def operator_rankings(db: AsyncSession = Depends(get_db)):
    """Today's operator rankings."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    operators_result = await db.execute(select(Operator))
    operators = operators_result.scalars().all()

    rankings = []
    for op in operators:
        stats_result = await db.execute(
            select(
                func.count(Call.id).label("calls_today"),
                func.avg(Call.satisfaction_rating).label("avg_satisfaction"),
                func.avg(Call.compliance_score).label("avg_compliance"),
                func.avg(Call.sentiment_score).label("avg_sentiment"),
            ).where(
                and_(Call.operator_id == op.id, Call.started_at >= today)
            )
        )
        stats = stats_result.fetchone()
        calls_today = stats.calls_today or 0

        # Simple ranking score
        satisfaction = stats.avg_satisfaction or 0
        compliance = stats.avg_compliance or 0
        sentiment = ((stats.avg_sentiment or 0) + 1) / 2 * 100
        score = (satisfaction / 5 * 40) + (compliance / 100 * 40) + (sentiment / 100 * 20)

        rankings.append(
            {
                "operator_id": op.id,
                "operator_name": op.full_name,
                "employee_id": op.employee_id,
                "department": op.department,
                "is_online": op.is_online,
                "calls_today": calls_today,
                "avg_satisfaction": round(satisfaction, 2),
                "avg_compliance": round(compliance, 1),
                "ranking_score": round(score, 1),
            }
        )

    return sorted(rankings, key=lambda x: x["ranking_score"], reverse=True)


@router.get("/alerts")
async def get_alerts(db: AsyncSession = Depends(get_db)):
    """Unresolved compliance events."""
    result = await db.execute(
        select(ComplianceEvent)
        .where(ComplianceEvent.resolved == False)
        .order_by(ComplianceEvent.timestamp.desc())
        .limit(50)
    )
    events = result.scalars().all()

    enriched = []
    for event in events:
        data = event.to_dict()
        # Get operator info via call
        call = (
            await db.execute(select(Call).where(Call.id == event.call_id))
        ).scalar_one_or_none()
        if call:
            op = (
                await db.execute(select(Operator).where(Operator.id == call.operator_id))
            ).scalar_one_or_none()
            data["operator_name"] = op.full_name if op else "Unknown"
            data["operator_id"] = call.operator_id
        enriched.append(data)

    return enriched


@router.patch("/alerts/{event_id}/resolve")
async def resolve_alert(event_id: int, db: AsyncSession = Depends(get_db)):
    """Mark a compliance event as resolved."""
    result = await db.execute(
        select(ComplianceEvent).where(ComplianceEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Event not found")
    event.resolved = True
    await db.commit()
    await db.refresh(event)
    return event.to_dict()


@router.get("/kpis")
async def get_kpis(db: AsyncSession = Depends(get_db)):
    """Key metrics for today."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Total calls today
    total_today = (
        await db.execute(
            select(func.count(Call.id)).where(Call.started_at >= today)
        )
    ).scalar() or 0

    # Active calls
    active_count = (
        await db.execute(
            select(func.count(Call.id)).where(Call.status == "active")
        )
    ).scalar() or 0

    # Avg satisfaction today
    avg_sat = (
        await db.execute(
            select(func.avg(Call.satisfaction_rating)).where(
                and_(Call.started_at >= today, Call.status == "completed")
            )
        )
    ).scalar() or 0

    # Avg compliance today
    avg_compliance = (
        await db.execute(
            select(func.avg(Call.compliance_score)).where(Call.started_at >= today)
        )
    ).scalar() or 100

    # Conversion rate today
    total_completed = (
        await db.execute(
            select(func.count(Call.id)).where(
                and_(Call.started_at >= today, Call.status == "completed")
            )
        )
    ).scalar() or 0
    accepted = (
        await db.execute(
            select(func.count(Call.id)).where(
                and_(
                    Call.started_at >= today,
                    Call.status == "completed",
                    Call.nbo_accepted == True,
                )
            )
        )
    ).scalar() or 0
    conversion = (accepted / total_completed) if total_completed > 0 else 0

    # Unresolved alerts
    alerts_count = (
        await db.execute(
            select(func.count(ComplianceEvent.id)).where(
                ComplianceEvent.resolved == False
            )
        )
    ).scalar() or 0

    # Online operators
    online_ops = (
        await db.execute(
            select(func.count(Operator.id)).where(Operator.is_online == True)
        )
    ).scalar() or 0

    return {
        "total_calls_today": total_today,
        "active_calls": active_count,
        "avg_satisfaction": round(avg_sat, 2),
        "avg_compliance": round(avg_compliance, 1),
        "conversion_rate": round(conversion, 3),
        "unresolved_alerts": alerts_count,
        "online_operators": online_ops,
        "timestamp": datetime.utcnow().isoformat(),
    }
