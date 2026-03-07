from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.onboarding import router as onboarding_router
from routes.usage import router as usage_router
from routes.block import router as block_router
from routes.map_view import router as map_router
from routes.leaderboard import router as leaderboard_router
from routes.challenges import router as challenges_router
from routes.ai import router as ai_router

app = FastAPI(
    title="PowerBlock API",
    description="SP Group Hackomania — AI for Actionable Energy Behaviour Change",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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


@app.get("/health")
def health():
    return {"status": "ok", "service": "PowerBlock API"}
