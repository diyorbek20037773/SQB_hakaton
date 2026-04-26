<div align="center">

# ⚡ ASTA — AI Sales & Telephony Assistant

### SQB bank call-center operatorlari uchun real-time AI copilot

<br />

<a href="https://celebrated-analysis-production-7353.up.railway.app/operator">
  <img src="https://img.shields.io/badge/🚀%20ISHLATIB%20KO'RING-Live%20Demo-1f2937?style=for-the-badge&labelColor=4f46e5&color=1f2937" alt="Ishlatib ko'ring" height="56" />
</a>

<br /><br />

### 👉 [**celebrated-analysis-production-7353.up.railway.app/operator**](https://celebrated-analysis-production-7353.up.railway.app/operator) 👈

<sub>Brauzerda ochib, darhol sinab ko'ring — o'rnatish kerak emas</sub>

<br />

> ⚠️ **Muhim:** Ilovani **Google Chrome** brauzerida ishlating.

<br />

<sub>📦 Manba kodi: [github.com/diyorbek20037773/SQB_hakaton](https://github.com/diyorbek20037773/SQB_hakaton)</sub>

<br />

![Stack](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=flat-square)
![Stack](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square)
![Stack](https://img.shields.io/badge/AI-Groq%20%7C%20Gemini-ff6b6b?style=flat-square)
![Stack](https://img.shields.io/badge/Realtime-WebSocket-4f46e5?style=flat-square)
![Theme](https://img.shields.io/badge/UI-Dark%20%2B%20Light-f59e0b?style=flat-square)

</div>

---

## 📖 Loyiha haqida

**ASTA** — bu SQB bank operatorlari mijoz bilan jonli telefon suhbati paytida real vaqtda AI yordami beradigan **copilot** tizimi. Operator gapirayotgan paytda tizim:

- 🎙️ Mijoz nutqini transkripsiya qiladi (uz-UZ)
- 🧠 Suhbat kontekstini AI orqali tahlil qiladi
- 💡 Operatorga **nima deyishini** tavsiya qiladi (Claude/Groq/Gemini)
- 🎯 **NBO** (Next Best Offer) — eng mos mahsulotni topadi
- ⚠️ E'tirozlarni aniqlaydi va javob taklif qiladi
- ✅ KYC/AML talablarini tekshiradi
- 📊 Sentiment va sifat balini real vaqtda hisoblaydi

---

## ✨ Asosiy imkoniyatlar

| Modul | Tavsif |
|-------|--------|
| 🤖 **Operator Copilot** | 3-ustun layout: mijoz profili / AI tavsiya / jonli transkript |
| 📞 **Live Call Stream** | WebSocket orqali real vaqt nutq va AI streaming |
| 🛡️ **Compliance Engine** | KYC, AML, PEP tekshirish, ogohlantirishlar |
| 🎯 **NBO Engine** | Mijoz profili asosida eng yaxshi mahsulot tavsiyasi |
| 👨‍💼 **Supervisor Dashboard** | Operatorlar nazorati, jonli qo'ng'iroqlar monitoring |
| 📈 **Analytics** | Konversiya, sifat, sentiment tahlili (Recharts) |
| 🗺️ **Geo Map** | Viloyat/tuman bo'yicha qo'ng'iroqlar (Leaflet + GeoJSON) |
| 🎓 **Simulator** | 3 ta persona (g'azablangan / chalkash / ayyor) bilan trening |
| 📝 **Call Summary** | Qo'ng'iroq yakunida AI xulosa va keyingi qadamlar |

---

## 🎨 Ikki dizayn variant

Loyihada **bir vaqtda ikki professional UI variant** bor — bitta tugma bilan almashtiriladi:

### 🌙 Variant 1 — Premium Dark
Indigo glow, slate-950 fon, 72px icon-only sidebar, AI Copilot markazda hero card sifatida. Operator-focused, dense.

### ☀️ Variant 2 — Editorial Light
"Bloomberg meets Linear" — cream `#faf9f6` fon, **Instrument Serif** typography, 220px to'liq sidebar, magazine uslubidagi 28px serif AI tavsiyasi. Bank-quality, premium.

---

## 🛠️ Texnologiyalar

### Frontend
- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4** (CSS-first config) + **shadcn/ui**
- **lucide-react** (ikonkalar)
- **recharts** (grafiklar)
- **leaflet** + **react-leaflet** (xaritalar)
- **Instrument Serif** + **Geist Sans** (typography)

### Backend
- **FastAPI** (async)
- **SQLAlchemy 2** + **aiosqlite** (SQLite async)
- **WebSocket** (jonli stream)
- **Groq SDK** + **Gemini service** (AI provayder)
- **Pydantic v2**

### AI Servislar
- `gemini_service.py` — Google Gemini integratsiya
- `nbo_engine.py` — Next Best Offer logikasi
- `compliance.py` — KYC/AML real-time tekshirish
- `call_summary.py` — qo'ng'iroq yakuni xulosa
- `simulator_ai.py` — trening uchun mijoz personalari

---

## 📁 Loyiha tuzilishi

```
SQB_hakaton/
├── SQB/
│   ├── backend/                 # FastAPI server
│   │   ├── main.py              # App entry, CORS, routers mount
│   │   ├── models.py            # SQLAlchemy modellar
│   │   ├── database.py          # Async session
│   │   ├── seed_data.py         # Test ma'lumotlar
│   │   ├── routers/             # REST endpointlar
│   │   │   ├── calls.py
│   │   │   ├── customers.py
│   │   │   ├── operators.py
│   │   │   ├── analytics.py
│   │   │   ├── supervisor.py
│   │   │   └── simulator.py
│   │   ├── services/            # AI logika
│   │   │   ├── gemini_service.py
│   │   │   ├── nbo_engine.py
│   │   │   ├── compliance.py
│   │   │   ├── call_summary.py
│   │   │   └── simulator_ai.py
│   │   └── ws_handlers/         # WebSocket
│   │       ├── call_stream.py
│   │       └── simulator_stream.py
│   │
│   └── frontend/                # Next.js
│       ├── app/
│       │   ├── operator/        # Asosiy copilot UI
│       │   ├── supervisor/      # Nazoratchi dashboard
│       │   ├── analytics/       # Statistika
│       │   ├── simulator/       # Trening mode
│       │   └── globals.css      # Tailwind v4 + theme
│       ├── components/          # Sidebar, Header, AudioRecorder, ui/
│       ├── hooks/               # useCallStream, useSimulator
│       └── lib/                 # api, websocket, types
│
├── uz-viloyatlar.geojson        # Xarita ma'lumotlari
├── uz-tumanlar.geojson
└── keyes12_call_center_data.xlsx
```

---

## 🚀 Ishga tushirish

### 1. Repozitoriyani klonlash

```bash
git clone https://github.com/diyorbek20037773/SQB_hakaton.git
cd SQB_hakaton
```

### 2. Backend (FastAPI)

```bash
cd SQB/backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt

# .env yarating va AI kalitlarni qo'ying:
# GROQ_API_KEY=...
# GEMINI_API_KEY=...

uvicorn main:app --reload --port 8000
```

Backend: `http://localhost:8000`
API hujjatlari: `http://localhost:8000/docs`

### 3. Frontend (Next.js)

```bash
cd SQB/frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000`

### 4. Sahifalar

| URL | Tavsif |
|-----|--------|
| `/operator` | Operator copilot (asosiy interfeys) |
| `/supervisor` | Nazoratchi dashboard |
| `/analytics` | Statistika va grafiklar |
| `/simulator` | Trening simulyator |

---

## 🎤 Mikrofon kerak

`/operator` sahifasida real qo'ng'iroq simulyatsiyasi uchun:
- Browser mikrofon ruxsati
- Web Speech API qo'llab-quvvatlanadigan brauzer (Chrome/Edge)
- Til: **uz-UZ**

---

## 🔌 API Endpointlar (asosiy)

```
GET    /health                        — health check
GET    /api/products                  — bank mahsulotlari
GET    /api/customers                 — mijozlar ro'yxati
POST   /api/calls/start               — qo'ng'iroq boshlash
POST   /api/calls/{id}/end            — qo'ng'iroq tugatish
GET    /api/analytics/overview        — statistika
WS     /ws/call/{call_id}             — jonli call stream
WS     /ws/simulator                  — simulyator stream
```

To'liq Swagger: `http://localhost:8000/docs`

---

## 🧪 Demo mijozlar

Frontend'da mock 5 ta mijoz:

| ID | Ism | Segment | Bali | Maqsad |
|----|-----|---------|------|--------|
| 1 | Azimov Bobur | VIP | 742 | Uy-joy krediti |
| 2 | Karimova Malika | Premium | 694 | Depozit |
| 3 | Nazarov Ulug'bek | Mass | 521 | Karta blokdan ochish |
| 4 | Holmatova Zilola | VIP | 801 | Katta o'tkazma 500M |
| 5 | Toshmatov Jasur | Mass | 538 | Iste'mol krediti |

Har bir mijoz uchun: KYC status, AML xavf, mavjud mahsulotlar, rad etilgan takliflar, AI tarixi.

---

## 🏆 SQB Hackathon

Loyiha **SQB Hackathon** uchun yaratildi — bank operatorlari uchun AI ko'mak vositasi.

**Maqsadlar:**
- Operator yukini kamaytirish
- Konversiyani oshirish (NBO orqali)
- Compliance xatolarini kamaytirish (real-time KYC/AML)
- Yangi operatorlarni tezroq trening qilish (simulyator)

---

<div align="center">

### 🔗 Live Demo — bir klikda sinab ko'ring

# [celebrated-analysis-production-7353.up.railway.app/operator](https://celebrated-analysis-production-7353.up.railway.app/operator)

<sub>📦 Manba kodi: [github.com/diyorbek20037773/SQB_hakaton](https://github.com/diyorbek20037773/SQB_hakaton) — ⭐ Yoqdimi? Star bering!</sub>

</div>
