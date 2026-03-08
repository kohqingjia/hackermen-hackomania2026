# BlockBattles — Community Energy Challenge

SP Group Hackomania 2025 — AI for Actionable Energy Behaviour Change

---

## Project Structure

```
Hackomania/
├── backend/          # FastAPI + ClickHouse + OpenAI
└── frontend/         # Next.js 14 + TypeScript + Tailwind
```

---

## Features (by view)

| View | Frontend | Backend |
|---|---|---|
| Onboarding | `app/onboarding/` | `routes/onboarding.py` |
| Dashboard | `app/dashboard/` | `routes/usage.py` |
| Block View | `app/block/` | `routes/block.py` |
| Map View | `app/map/` | `routes/map_view.py` |
| Leaderboard | `app/leaderboard/` | `routes/leaderboard.py` |
| Challenges | `app/challenges/` | `routes/challenges.py` |
| AI Insights | shared across views | `routes/ai.py` |

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts
- **Backend**: FastAPI (Python)
- **Database**: ClickHouse
- **AI**: OpenAI GPT-4o

---

## Setup

### Backend

```bash
cd backend
cp .env.example .env
# Fill in OPENAI_API_KEY and CLICKHOUSE_* vars
pip install -r requirements.txt
# Seed the database
python -m database.seed
# Start server
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

App runs at http://localhost:3000, API at http://localhost:8000

---

### AI Coach (LibreChat)

The floating chat widget is powered by [LibreChat](https://github.com/danny-avila/LibreChat) running in Docker, proxied through nginx so it can be embedded in an iframe.

**Prerequisites:** Docker Desktop installed and running.

**1. Create a root `.env` file** (same level as `docker-compose.librechat.yml`):

```bash
# .env  (gitignored — never commit this)
OPENAI_API_KEY=sk-proj-...your-key-here...
```

**2. Start LibreChat:**

```bash
docker compose -f docker-compose.librechat.yml up -d
```

This starts three containers:
- `mongodb` — stores LibreChat chat history
- `librechat` — the chat UI on internal port 3080
- `librechat-proxy` — nginx that strips `X-Frame-Options` and exposes port **3090**

**3. Set the frontend env var:**

```bash
# frontend/.env.local
NEXT_PUBLIC_LIBRECHAT_URL=http://localhost:3090
```

LibreChat is now accessible at http://localhost:3090 and embedded in the chat widget.

**How it connects to ClickHouse:**
LibreChat → FastAPI `/v1/chat/completions` → GPT-4o with live ClickHouse data injected into every message.
The FastAPI backend must be running (`uvicorn main:app --reload --port 8000` in `backend/`).

**Stop LibreChat:**

```bash
docker compose -f docker-compose.librechat.yml down
```

**Troubleshoot:** If the chat widget shows "AI Coach not running", make sure Docker Desktop is open and the containers are up:

```bash
docker compose -f docker-compose.librechat.yml ps
```

---

## SP Colour Palette

| Role | Hex |
|---|---|
| Primary Teal | `#2DB7A3` |
| Secondary Mint | `#9DE1D3` |
| Chart Mint | `#BFECE4` |
| Background | `#F5F7F7` |
| Card White | `#FFFFFF` |
| Alert Orange | `#F59E0B` |
| Primary Text | `#2F3A3A` |
| Secondary Text | `#6B7C7C` |
