from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Customer, Call

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/search")
async def search_customers(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    """Quick search by name or phone."""
    q_like = f"%{q}%"
    stmt = (
        select(Customer)
        .where(or_(Customer.full_name.ilike(q_like), Customer.phone.ilike(q_like)))
        .limit(10)
    )
    result = await db.execute(stmt)
    customers = result.scalars().all()
    return [c.to_dict() for c in customers]


@router.get("")
async def list_customers(
    q: Optional[str] = None,
    segment: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Customer)
    if q:
        q_like = f"%{q}%"
        stmt = stmt.where(
            or_(Customer.full_name.ilike(q_like), Customer.phone.ilike(q_like))
        )
    if segment:
        stmt = stmt.where(Customer.segment == segment)

    stmt = stmt.order_by(Customer.id.desc())

    count_stmt = select(func.count(Customer.id))
    if q:
        q_like = f"%{q}%"
        count_stmt = count_stmt.where(
            or_(Customer.full_name.ilike(q_like), Customer.phone.ilike(q_like))
        )
    if segment:
        count_stmt = count_stmt.where(Customer.segment == segment)
    total = (await db.execute(count_stmt)).scalar()

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    customers = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [c.to_dict() for c in customers],
    }


@router.get("/{customer_id}")
async def get_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    data = customer.to_dict()

    # Include recent call history (last 10)
    calls_result = await db.execute(
        select(Call)
        .where(Call.customer_id == customer_id)
        .order_by(Call.started_at.desc())
        .limit(10)
    )
    calls = calls_result.scalars().all()
    data["call_history"] = [c.to_dict() for c in calls]

    # Basic stats
    data["total_calls"] = len(calls)
    completed = [c for c in calls if c.status == "completed"]
    if completed:
        data["avg_satisfaction"] = sum(
            c.satisfaction_rating for c in completed if c.satisfaction_rating
        ) / max(1, len([c for c in completed if c.satisfaction_rating]))
    else:
        data["avg_satisfaction"] = None

    return data
