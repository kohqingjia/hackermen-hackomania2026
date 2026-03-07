from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.onboarding import router as onboarding_router
from routes.usage import router as usage_router
from routes.block import router as block_router
from routes.map_view import router as map_router
from routes.leaderboard import router as leaderboard_router
from routes.challenges import router as challenges_router
from routes.ai import router as ai_router
from routes.openai_compat import router as openai_compat_router
from database.clickhouse import init_schema

app = FastAPI(
    title="PowerBlock API",
    description="SP Group Hackomania — AI for Actionable Energy Behaviour Change",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3080",  # LibreChat
        "http://localhost:3090",  # nginx proxy
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(onboarding_router)
app.include_router(usage_router)
app.include_router(block_router)
app.include_router(map_router)
app.include_router(leaderboard_router)
app.include_router(challenges_router)
app.include_router(ai_router)
app.include_router(openai_compat_router)


@app.on_event("startup")
def on_startup():
    """Initialise ClickHouse schema on startup."""
    init_schema()


@app.get("/health")
def health():
    return {"status": "ok", "service": "PowerBlock API"}
