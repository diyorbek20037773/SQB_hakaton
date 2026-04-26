import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./asta.db")

if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set. AI features will use fallback responses.")
