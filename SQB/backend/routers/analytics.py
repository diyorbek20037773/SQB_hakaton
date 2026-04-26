from datetime import datetime, timedelta
from collections import Counter
import json

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Call, Operator

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/sentiment-trend")
async def sentiment_trend(db: AsyncSession = Depends(get_db)):
    """Daily sentiment averages for last 30 days."""
    since = datetime.utcnow() - timedelta(days=30)
    result = await db.execute(
        select(Call).where(
            and_(Call.started_at >= since, Call.status == "completed")
        )
    )
    calls = result.scalars().all()

    daily: dict = {}
    for call in calls:
        day = call.started_at.strftime("%Y-%m-%d")
        if day not in daily:
            daily[day] = {"sum": 0.0, "count": 0}
        daily[day]["sum"] += call.sentiment_score or 0
        daily[day]["count"] += 1

    trend = sorted(
        [
            {
                "date": day,
                "avg_sentiment": round(v["sum"] / v["count"], 3),
                "call_count": v["count"],
            }
            for day, v in daily.items()
        ],
        key=lambda x: x["date"],
    )
    return trend


@router.get("/top-complaints")
async def top_complaints(db: AsyncSession = Depends(get_db)):
    """Most common topics and objections from calls."""
    since = datetime.utcnow() - timedelta(days=30)
    result = await db.execute(
        select(Call).where(Call.started_at >= since)
    )
    calls = result.scalars().all()

    topic_counter: Counter = Counter()
    objection_counter: Counter = Counter()

    for call in calls:
        for topic in (call.topics or []):
            topic_counter[topic] += 1
        for obj in (call.objections_detected or []):
            if isinstance(obj, dict):
                obj_type = obj.get("type", "other")
            else:
                obj_type = str(obj)
            objection_counter[obj_type] += 1

    return {
        "top_topics": [
            {"topic": t, "count": c} for t, c in topic_counter.most_common(10)
        ],
        "top_objections": [
            {"objection": o, "count": c} for o, c in objection_counter.most_common(10)
        ],
    }


@router.get("/product-demand")
async def product_demand(db: AsyncSession = Depends(get_db)):
    """Which products were recommended and accepted most."""
    since = datetime.utcnow() - timedelta(days=30)
    result = await db.execute(
        select(Call).where(and_(Call.started_at >= since, Call.status == "completed"))
    )
    calls = result.scalars().all()

    offered_counter: Counter = Counter()
    accepted_counter: Counter = Counter()

    for call in calls:
        nbos = call.nbo_offered or []
        for nbo in nbos:
            if isinstance(nbo, dict):
                pid = nbo.get("product_id", "unknown")
                offered_counter[pid] += 1
                if call.nbo_accepted:
                    accepted_counter[pid] += 1
            elif isinstance(nbo, str):
                offered_counter[nbo] += 1

    products = []
    for pid, offered in offered_counter.most_common(10):
        accepted = accepted_counter.get(pid, 0)
        products.append(
            {
                "product_id": pid,
                "offered": offered,
                "accepted": accepted,
                "acceptance_rate": round(accepted / offered, 3) if offered else 0,
            }
        )
    return products


@router.get("/operator-efficiency")
async def operator_efficiency(db: AsyncSession = Depends(get_db)):
    """Per-operator stats suitable for a radar chart."""
    since = datetime.utcnow() - timedelta(days=7)

    operators_result = await db.execute(select(Operator))
    operators = operators_result.scalars().all()

    data = []
    for op in operators:
        stats_result = await db.execute(
            select(
                func.count(Call.id).label("total"),
                func.avg(Call.sentiment_score).label("avg_sentiment"),
                func.avg(Call.compliance_score).label("avg_compliance"),
                func.avg(Call.satisfaction_rating).label("avg_satisfaction"),
            ).where(
                and_(Call.operator_id == op.id, Call.started_at >= since)
            )
        )
        stats = stats_result.fetchone()
        total = stats.total or 0

        accepted_result = await db.execute(
            select(func.count(Call.id)).where(
                and_(Call.operator_id == op.id, Call.started_at >= since, Call.nbo_accepted == True)
            )
        )
        accepted = accepted_result.scalar() or 0

        # Normalize scores to 0-100
        sentiment_norm = ((stats.avg_sentiment or 0) + 1) / 2 * 100
        compliance = stats.avg_compliance or 0
        satisfaction = ((stats.avg_satisfaction or 3) / 5) * 100

        # Conversion
        conversion = (accepted / total * 100) if total > 0 else 0

        # Call volume score (relative)
        volume_score = min(total * 5, 100)

        data.append(
            {
                "operator_id": op.id,
                "operator_name": op.full_name,
                "department": op.department,
                "metrics": {
                    "sentiment": round(sentiment_norm, 1),
                    "compliance": round(compliance, 1),
                    "satisfaction": round(satisfaction, 1),
                    "conversion": round(conversion, 1),
                    "volume": round(volume_score, 1),
                },
                "total_calls": total,
            }
        )

    return sorted(data, key=lambda x: x["metrics"]["satisfaction"], reverse=True)


@router.get("/call-volume")
async def call_volume(db: AsyncSession = Depends(get_db)):
    """Hourly call volume for last 7 days."""
    since = datetime.utcnow() - timedelta(days=7)
    result = await db.execute(
        select(Call).where(Call.started_at >= since)
    )
    calls = result.scalars().all()

    hourly: dict = {}
    for call in calls:
        hour_key = call.started_at.strftime("%Y-%m-%d %H:00")
        hourly[hour_key] = hourly.get(hour_key, 0) + 1

    sorted_hours = sorted(hourly.items())
    return [{"hour": h, "count": c} for h, c in sorted_hours]
