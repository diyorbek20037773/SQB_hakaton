"""
Seed script for Yulduz AI demo database.
Creates realistic Uzbek bank data:
  - 50 customers
  - 10 operators
  - 200 historical calls
  - 20 compliance events
  - 10 simulator sessions

Run:  python seed_data.py
"""
import asyncio
import json
import random
from datetime import datetime, timedelta

from sqlalchemy import select

from database import create_tables, AsyncSessionLocal
from models import Customer, Operator, Call, ComplianceEvent, SimulatorSession

# ─── Sample Data ─────────────────────────────────────────────────────────────

UZBEK_FIRST_NAMES = [
    "Bobur", "Nilufar", "Sardor", "Zulfiya", "Otabek", "Malika", "Jasur",
    "Dilnoza", "Kamol", "Feruza", "Ulugbek", "Nodira", "Sherzod", "Gulnora",
    "Eldor", "Sabohat", "Mansur", "Mohira", "Ravshan", "Barno", "Aziz",
    "Muazzam", "Timur", "Shahnoza", "Mirzo", "Dilorom", "Sanjar", "Iroda",
    "Bahrom", "Nasiba", "Doniyor", "Hulkar", "Alisher", "Sevara", "Nodir",
    "Mushtariy", "Firdavs", "Lobar", "Sarvarbek", "Maftuna",
]

UZBEK_LAST_NAMES = [
    "Toshmatov", "Karimova", "Yusupov", "Rahimova", "Holmatov", "Nazarova",
    "Qodirov", "Ergasheva", "Mirzayev", "Ismoilova", "Xasanov", "Tursunova",
    "Abdullayev", "Normatova", "Raximov", "Sobirov", "Jumayev", "Begmatova",
    "Haydarov", "Murodova", "Valiyev", "Teshaboyeva", "Yunusov", "Xoliqova",
    "Qosimov", "Baxtiyorova", "Mamatov", "Fayzullayeva", "Turgunov", "Azimova",
]

DEPARTMENTS = [
    "Retail Banking",
    "Corporate Banking",
    "Credit Department",
    "VIP Service",
    "Digital Banking",
    "Customer Support",
]

PRODUCTS = [
    "cc_standard", "cc_gold", "mortgage_30", "deposit_12m",
    "sme_loan", "insurance_life", "overdraft", "payroll",
]

TOPICS_POOL = [
    "kredit karta", "ipoteka", "depozit", "overdraft", "biznes kredit",
    "sug'urta", "internet bank", "karta blok", "foiz stavka", "muddatli to'lov",
    "ish haqi loyihasi", "qarz", "limit oshirish", "konvertatsiya", "pul o'tkazma",
    "shartnoma", "hujjatlar", "ariza", "tasdiqlash", "rad etish",
]

OBJECTIONS_POOL = [
    {"type": "high_interest", "customer_said": "Foiz juda yuqori"},
    {"type": "need_to_think", "customer_said": "O'ylab ko'rishim kerak"},
    {"type": "no_money", "customer_said": "Hozir pulim yo'q"},
    {"type": "dont_trust", "customer_said": "Ishonchim yo'q"},
    {"type": "already_have", "customer_said": "Boshqa bankda bor"},
]

SAMPLE_TRANSCRIPTS = [
    "Assalomu alaykum, kredit karta haqida ma'lumot olmoqchi edim. Foiz stavkangiz qancha? Tushunaman, 24% biroz yuqori. Lekin cashback borligi yaxshi. Ariza berishim mumkinmi?",
    "Salom, kartam bloklandi. Nega? Xorijiy saytda xarid qilgandim. Blokni oching iltimos. Rahmat, endi ishlayapti.",
    "Ipoteka haqida so'ramoqchiman. 30 yilga. Oylik to'lov qancha bo'ladi? 3.5 million - bu biroz ko'p. O'ylab ko'raman.",
    "Depozit ochmoqchiman. 12 oylik, 22% - yaxshi stavka. Qancha mablag' kerak minimal? 1 million - yaxshi. Rasmiylashtiraylik.",
    "Biznes kredit kerak. Yangi do'kon ochmoqchiman. 50 million. Garov bormi? Ha, ko'chmas mulk bor. Hujjatlar ro'yxatini bering.",
    "Internet bank ishlamayapti. Xato chiqayapti. Parolni unutdim. Qayta o'rnatishga yordam bering. Rahmat, endi kirdi.",
    "Sug'urta haqida so'rayman. Hayot sug'urtasi. Yillik to'lov qancha? 1.5% - yaxshi. Oilam uchun foydali.",
    "Overdraft xizmati haqida. Ish haqim 5 million, 2 barobar limit - 10 million. Qanday rasmiylashtiriladi?",
    "Xorijga pul o'tkazmoqchiman. Dollar kursini ayting. Komisiya qancha? Tushunaman, minimal komisiya - yaxshi.",
    "Kredit tarixim bormi? Ko'rishim mumkinmi? Kredit reytingim 720 - yaxshi. Yangi kredit olishim mumkinmi?",
]


# ─── Generators ──────────────────────────────────────────────────────────────


def random_name() -> str:
    return f"{random.choice(UZBEK_FIRST_NAMES)} {random.choice(UZBEK_LAST_NAMES)}"


def random_phone() -> str:
    return f"+99890{random.randint(1000000, 9999999)}"


def random_segment() -> str:
    return random.choices(
        ["Standard", "Premium", "VIP"],
        weights=[60, 30, 10],
    )[0]


def random_income(segment: str) -> float:
    if segment == "VIP":
        return random.uniform(20_000_000, 100_000_000)
    elif segment == "Premium":
        return random.uniform(8_000_000, 25_000_000)
    else:
        return random.uniform(2_000_000, 10_000_000)


def random_credit_score(segment: str) -> int:
    if segment == "VIP":
        return random.randint(750, 850)
    elif segment == "Premium":
        return random.randint(650, 800)
    else:
        return random.randint(450, 720)


def random_products(segment: str) -> list:
    count = {"Standard": 1, "Premium": 2, "VIP": 3}[segment]
    return random.sample(PRODUCTS, min(count, len(PRODUCTS)))


def random_date_in_past(days: int = 30) -> datetime:
    delta = timedelta(
        days=random.randint(0, days),
        hours=random.randint(8, 18),
        minutes=random.randint(0, 59),
    )
    return datetime.utcnow() - delta


def random_transcript() -> str:
    return random.choice(SAMPLE_TRANSCRIPTS)


def random_topics() -> list:
    return random.sample(TOPICS_POOL, random.randint(1, 3))


def random_objections() -> list:
    if random.random() < 0.4:
        return [random.choice(OBJECTIONS_POOL)]
    return []


def random_nbo() -> list:
    if random.random() < 0.6:
        product_id = random.choice(PRODUCTS)
        return [{"product_id": product_id, "product_name": product_id, "confidence": round(random.uniform(0.5, 0.95), 2)}]
    return []


# ─── Seed Functions ──────────────────────────────────────────────────────────


def make_customers(n: int = 50) -> list:
    used_phones = set()
    customers = []
    for i in range(n):
        segment = random_segment()
        phone = random_phone()
        while phone in used_phones:
            phone = random_phone()
        used_phones.add(phone)

        customers.append(
            Customer(
                full_name=random_name(),
                phone=phone,
                segment=segment,
                monthly_income=random_income(segment),
                kyc_status=random.choices(
                    ["verified", "pending", "failed"], weights=[70, 25, 5]
                )[0],
                aml_risk_level=random.choices(
                    ["low", "medium", "high"], weights=[75, 20, 5]
                )[0],
                credit_score=random_credit_score(segment),
                age=random.randint(20, 65),
                language_pref=random.choices(["uz", "ru"], weights=[70, 30])[0],
            )
        )
        customers[-1].existing_products = random_products(segment)
    return customers


def make_operators(n: int = 10) -> list:
    used_ids = set()
    operators = []
    names = [
        "Malika Yusupova", "Bobur Holmatov", "Dilnoza Ergasheva",
        "Jasur Qodirov", "Kamola Nazarova", "Sardor Mirzayev",
        "Nilufar Rahimova", "Otabek Toshmatov", "Feruza Karimova",
        "Ulugbek Xasanov",
    ]
    for i, name in enumerate(names[:n]):
        emp_id = f"SQB{1001 + i}"
        operators.append(
            Operator(
                full_name=name,
                employee_id=emp_id,
                department=DEPARTMENTS[i % len(DEPARTMENTS)],
                avg_satisfaction=round(random.uniform(3.5, 5.0), 2),
                total_calls=random.randint(50, 500),
                conversion_rate=round(random.uniform(0.1, 0.45), 3),
                is_online=random.random() < 0.5,
            )
        )
    return operators


def make_calls(customers: list, operators: list, n: int = 200) -> list:
    calls = []
    for _ in range(n):
        customer = random.choice(customers)
        operator = random.choice(operators)
        started = random_date_in_past(60)
        status = random.choices(
            ["completed", "missed", "active"], weights=[75, 15, 10]
        )[0]

        ended_at = None
        if status == "completed":
            duration = timedelta(minutes=random.randint(3, 25))
            ended_at = started + duration

        nbo = random_nbo()
        nbo_accepted = bool(nbo) and random.random() < 0.35

        call = Call(
            operator_id=operator.id,
            customer_id=customer.id,
            started_at=started,
            ended_at=ended_at,
            status=status,
            transcript=random_transcript() if status == "completed" else "",
            summary="Qo'ng'iroq muvaffaqiyatli yakunlandi." if status == "completed" else "",
            sentiment_score=round(random.uniform(-0.5, 1.0), 3),
            compliance_score=round(random.uniform(70, 100), 1),
            nbo_accepted=nbo_accepted,
            satisfaction_rating=random.randint(3, 5) if status == "completed" else None,
        )
        call.nbo_offered = nbo
        call.objections_detected = random_objections()
        call.topics = random_topics()
        calls.append(call)
    return calls


def make_compliance_events(calls: list, n: int = 20) -> list:
    completed_calls = [c for c in calls if c.status == "completed"]
    events = []
    event_types = [
        ("forbidden_phrase", "Taqiqlangan ibora aniqlandi: 'kafolatlangan daromad'", "high"),
        ("kyc_missing", "Daromad manbaini so'rash amalga oshirilmadi", "medium"),
        ("aml_suspicious", "Shubhali miqdor tranzaksiyasi aniqlandi", "critical"),
        ("disclosure_missing", "Foiz stavka to'liq ochiqlanmadi", "medium"),
        ("pep_not_checked", "PEP tekshiruvi o'tkazilmadi", "high"),
        ("large_cash_mention", "Naqd pul miqdori chegaradan oshdi", "high"),
    ]
    for i in range(min(n, len(completed_calls))):
        call = completed_calls[i % len(completed_calls)]
        et, desc, sev = random.choice(event_types)
        events.append(
            ComplianceEvent(
                call_id=call.id,
                event_type=et,
                description=desc,
                severity=sev,
                timestamp=call.started_at + timedelta(minutes=random.randint(1, 10)),
                resolved=random.random() < 0.5,
            )
        )
    return events


def make_simulator_sessions(operators: list, n: int = 10) -> list:
    sessions = []
    persona_types = ["angry", "confused", "savvy"]
    for i in range(n):
        op = random.choice(operators)
        persona = persona_types[i % len(persona_types)]
        started = random_date_in_past(14)
        ended = started + timedelta(minutes=random.randint(5, 20))
        score = round(random.uniform(55, 95), 1)
        feedback_map = {
            "angry": "G'azabli mijoz bilan ishlash yaxshi amalga oshdi. Empatiya ko'rsatishga e'tibor bering.",
            "confused": "Keksa mijozga sabr bilan tushuntirdingiz. Yana aniqroq qadamlar bering.",
            "savvy": "Tajribali mijoz savollari yaxshi hal qilindi. Raqiblar bilan taqqoslashni o'rganing.",
        }
        sess = SimulatorSession(
            operator_id=op.id,
            persona_type=persona,
            started_at=started,
            ended_at=ended,
            score=score,
            feedback=feedback_map.get(persona, "Yaxshi harakat!"),
            transcript=f"Operator: Assalomu alaykum!\nMijoz (AI): {persona.capitalize()} mijoz javobi.",
        )
        sessions.append(sess)
    return sessions


# ─── Main seed function ───────────────────────────────────────────────────────


async def seed_all(db=None):
    """Seed all tables. Accepts an optional existing session."""
    close_db = False
    if db is None:
        db = AsyncSessionLocal()
        close_db = True

    try:
        # Customers
        print("  Creating 50 customers...")
        customers = make_customers(50)
        for c in customers:
            db.add(c)
        await db.flush()  # get IDs

        # Operators
        print("  Creating 10 operators...")
        operators = make_operators(10)
        for o in operators:
            db.add(o)
        await db.flush()

        # Calls
        print("  Creating 200 calls...")
        calls = make_calls(customers, operators, 200)
        for c in calls:
            db.add(c)
        await db.flush()

        # Compliance events
        print("  Creating 20 compliance events...")
        events = make_compliance_events(calls, 20)
        for e in events:
            db.add(e)

        # Simulator sessions
        print("  Creating 10 simulator sessions...")
        sessions = make_simulator_sessions(operators, 10)
        for s in sessions:
            db.add(s)

        await db.commit()
        print("  Seed complete!")
    except Exception as exc:
        await db.rollback()
        print(f"  Seed failed: {exc}")
        raise
    finally:
        if close_db:
            await db.close()


async def main():
    await create_tables()
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        result = await db.execute(select(Customer).limit(1))
        existing = result.scalar_one_or_none()
        if existing:
            print("Database already has data. Skipping seed.")
            return
    await seed_all()
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
