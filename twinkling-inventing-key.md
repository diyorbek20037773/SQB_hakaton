# Yulduz AI - AI Sales & Telephony Assistant (SQB Hackathon)

## Context
SQB Bank hackathoni uchun 12-muammo tanlandi: "Bank Operatorlari uchun Real-Time AI Savdo Yordamchisi (Cluely-style)". Jamoa 4 kishi. LLM sifatida Gemini API ishlatiladi. Asosiy g'oya - oddiy operator yordamchisi emas, balki to'liq **AI-powered Call Center Intelligence Platform** qilish.

## Platforma tuzilishi - 4 ta ekran

### 1. Operator Copilot (`/operator`)
Real-time suhbat yordamchisi - asosiy ekran:
- Chap: Live transcript (suhbat matni real-time)
- O'rta: Next-Best-Offer tavsiya + Objection handling
- O'ng: KYC/AML checklist + Customer profile
- Past: Compliance alertlar

### 2. Supervisor Dashboard (`/supervisor`)
Rahbar uchun boshqaruv markazi:
- Barcha faol qo'ng'iroqlar gridi (sentiment, status, alertlar)
- Real-time compliance alertlar
- Operator reytingi (bugungi)
- Asosiy KPI metrikalar

### 3. Analytics (`/analytics`)
Chuqur tahlil sahifasi:
- Mijozlar eng ko'p nimadan shikoyat qiladi (top complaints)
- Sentiment trend (vaqt bo'yicha)
- Mahsulot talabi (qaysi mahsulot ko'p so'raladi)
- Operator samaradorligi (radar chart)
- Qo'ng'iroq hajmi statistikasi

### 4. Call Simulator (`/simulator`) - KILLER FEATURE
AI bilan mashq rejimi:
- AI sun'iy mijoz rolini o'ynaydi (3 persona: g'azablangan, chalkash, ayyor)
- Operator javob beradi (yozma yoki ovozli)
- Real-time scoring (empathy, compliance, product knowledge, objection handling)
- Mashq tugaganda scorecard + tavsiyalar

## Tech Stack

| Komponent | Texnologiya |
|-----------|-------------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | FastAPI (Python) |
| Database | SQLite (SQLAlchemy) |
| Real-time | WebSocket (FastAPI) |
| LLM | Google Gemini API (gemini-2.0-flash / gemini-2.5-pro) |
| STT | Web Speech API (browser) yoki Gemini multimodal |
| Charts | Recharts |

## Loyiha fayl tuzilishi

```
SQB/
+-- backend/
|   +-- main.py                    # FastAPI entry, CORS, mount routers
|   +-- requirements.txt
|   +-- config.py                  # Gemini API key, settings
|   +-- database.py                # SQLAlchemy + SQLite setup
|   +-- models.py                  # Customer, Operator, Call, ComplianceEvent, SimSession
|   +-- seed_data.py               # 50 mijoz, 10 operator, 200 tarixiy qo'ng'iroq
|   +-- routers/
|   |   +-- calls.py
|   |   +-- customers.py
|   |   +-- operators.py
|   |   +-- analytics.py
|   |   +-- simulator.py
|   |   +-- supervisor.py
|   +-- services/
|   |   +-- gemini_service.py      # Gemini API wrapper (structured JSON output)
|   |   +-- nbo_engine.py          # Next-Best-Offer logic
|   |   +-- compliance.py          # KYC/AML checklist + forbidden phrases
|   |   +-- call_summary.py        # Post-call summary
|   |   +-- simulator_ai.py        # AI customer persona
|   +-- websockets/
|   |   +-- call_stream.py         # Live call WebSocket
|   |   +-- simulator_stream.py    # Simulator WebSocket
|   +-- data/
|       +-- products.json          # SQB mahsulotlar katalogi
|       +-- compliance_rules.json  # KYC/AML qoidalar
|       +-- objection_scripts.json # E'tiroz javoblari
|       +-- customer_personas.json # Simulator personalar
|       +-- demo_transcripts.json  # Demo uchun tayyor suhbat matnlari
|
+-- frontend/
    +-- src/app/
    |   +-- layout.tsx + page.tsx
    |   +-- operator/page.tsx      # Operator Copilot
    |   +-- supervisor/page.tsx    # Supervisor Dashboard
    |   +-- analytics/page.tsx     # Analytics
    |   +-- simulator/page.tsx     # Call Simulator
    +-- src/components/
    |   +-- ui/                    # shadcn components
    |   +-- Sidebar.tsx, Header.tsx
    |   +-- AudioRecorder.tsx
    +-- src/lib/
    |   +-- api.ts, websocket.ts, types.ts
    +-- src/hooks/
        +-- useCallStream.ts, useSimulator.ts
```

## Database schema (SQLite)

**customers**: id, full_name, phone, segment(VIP/Premium/Standard), monthly_income, existing_products(JSON), kyc_status, aml_risk_level, credit_score, age, language_pref

**operators**: id, full_name, employee_id, department, avg_satisfaction, total_calls, conversion_rate, is_online

**calls**: id, operator_id, customer_id, started_at, ended_at, status, transcript, summary, sentiment_score, compliance_score, nbo_offered(JSON), nbo_accepted, objections_detected(JSON), satisfaction_rating, topics(JSON)

**compliance_events**: id, call_id, event_type, description, severity, timestamp, resolved

**simulator_sessions**: id, operator_id, persona_type, started_at, ended_at, score, feedback, transcript

## Gemini LLM strategiyasi

Bitta structured prompt bilan barcha analizni bir API callda olish (tez + arzon):

```
Input: transcript_segment + customer_profile + products + rules
Output JSON: {
  sentiment, sentiment_score,
  compliance_alerts: [],
  detected_objection: {type, customer_said},
  suggested_response: "...",
  nbo: {product_id, product_name, reason, confidence},
  topics: [],
  kyc_checklist_update: {}
}
```

## Amalga oshirish tartibi

### Faza 1: Asos (Backend + Frontend skeleton)
1. `backend/` - FastAPI init, database.py, models.py, config.py
2. `backend/seed_data.py` - synthetic data generator (50 customers, 10 operators, 200 calls)
3. `backend/data/products.json` + `compliance_rules.json` + `objection_scripts.json`
4. `frontend/` - Next.js init, layout with sidebar, 4 page stubs
5. `frontend/src/lib/api.ts` + `types.ts`

### Faza 2: Operator Copilot (asosiy feature)
1. `backend/services/gemini_service.py` - Gemini API wrapper
2. `backend/websockets/call_stream.py` - WebSocket handler
3. `backend/services/nbo_engine.py` - NBO logic
4. `backend/services/compliance.py` - compliance checker
5. `frontend/src/app/operator/page.tsx` - to'liq Copilot UI
6. `frontend/src/hooks/useCallStream.ts` - WebSocket hook
7. `frontend/src/components/AudioRecorder.tsx` - mic capture
8. Demo mode: `demo_transcripts.json` playback (backup)

### Faza 3: Supervisor + Analytics
1. `backend/routers/supervisor.py` + `analytics.py` - API endpoints
2. `frontend/src/app/supervisor/page.tsx` - live calls grid, alerts, rankings
3. `frontend/src/app/analytics/page.tsx` - charts (Recharts)
4. `backend/services/call_summary.py` - post-call summary

### Faza 4: Simulator
1. `backend/data/customer_personas.json` - 3 persona
2. `backend/services/simulator_ai.py` - AI customer logic
3. `backend/websockets/simulator_stream.py` - simulator WebSocket
4. `frontend/src/app/simulator/page.tsx` - simulator UI + scoring

### Faza 5: Polish + Demo
1. UI polish: animations, dark theme, loading states
2. End-to-end test
3. Demo script tayyorlash
4. README.md

## Jamoa taqsimoti (4 kishi)

| Kishi | Faza 1 | Faza 2 | Faza 3 | Faza 4 |
|-------|--------|--------|--------|--------|
| P1 (Backend) | FastAPI, DB, models | Gemini service, WebSocket | Analytics API | Simulator AI |
| P2 (Frontend) | Next.js, layout | Operator Copilot UI | Supervisor dashboard | Simulator UI |
| P3 (AI/Data) | Seed data, JSON files | NBO engine, compliance | Call summary, sentiment | Simulator scoring |
| P4 (Frontend2) | Tailwind, shadcn setup | AudioRecorder, demo mode | Analytics charts | Polish, demo |

## Demo script (3 min)

1. [0:00-0:20] Platformani tanishtirish
2. [0:20-1:20] **Operator Copilot** - live call demo (transcript, NBO, compliance alert, objection handling)
3. [1:20-1:50] **Supervisor** - faol qo'ng'iroqlar, alertlar, operator ranking
4. [1:50-2:20] **Analytics** - complaint trends, sentiment, operator scorecard
5. [2:20-2:50] **Simulator** - AI mijoz bilan mashq, real-time scoring
6. [2:50-3:00] Xulosa

## Verification
1. `cd backend && pip install -r requirements.txt && python seed_data.py && uvicorn main:app --reload`
2. `cd frontend && npm install && npm run dev`
3. Open localhost:3000 - barcha 4 sahifa ishlashi kerak
4. Operator sahifasida "Start Call" -> transcript va AI tavsiyalar paydo bo'lishi
5. Supervisor sahifasida faol qo'ng'iroqlar ko'rinishi
6. Analytics sahifasida chartlar to'g'ri renderlanishi
7. Simulator sahifasida persona tanlash va suhbat ishlashi
