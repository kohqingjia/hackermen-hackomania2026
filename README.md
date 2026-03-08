# BlockBattles — Community Energy Challenge

**SP Group Hackomania 2025 — AI for Actionable Energy Behaviour Change**

BlockBattles transforms the SP Utilities App from a passive energy dashboard into an active behaviour change platform. It explains electricity usage patterns, recommends actionable behaviour changes, and motivates users through community gamification — pitting HDB blocks against each other in a weekly energy-saving competition.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. AI Coach (LibreChat) Setup](#4-ai-coach-librechat-setup)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [SP Colour Palette](#sp-colour-palette)

---

## Overview

### The Problem

The SP App already provides half-hourly electricity consumption data, but:
- Users see numbers but don't know what they mean
- Peak usage times are not clearly explained
- There's no motivation to return to the app beyond bill payment

### Our Solution: Block Wars

HDB blocks compete to reduce electricity consumption. Residents earn **GreenUP points** through:
- Shifting usage to off-peak hours
- Following AI energy recommendations
- Completing daily energy-saving challenges

This creates a **modern kampung spirit around energy conservation**.

---

## Features

| View | Description | Frontend | Backend |
|---|---|---|---|
| Onboarding | Collects household profile for personalised recommendations | `app/onboarding/` | `routes/onboarding.py` |
| Dashboard | Half-hourly usage graph with AI insights and bill tracking | `app/dashboard/` | `routes/usage.py` |
| Block View | Compare own usage vs block average, AI energy tips | `app/block/` | `routes/block.py` |
| Map View | Visual map of block energy performance across district | `app/map/` | `routes/map_view.py` |
| Leaderboard | Weekly block rankings by energy reduction percentage | `app/leaderboard/` | `routes/leaderboard.py` |
| Challenges | Daily gamified energy-saving challenges with photo proof | `app/challenges/` | `routes/challenges.py` |
| AI Coach | Floating chat widget powered by LibreChat + GPT-4o | Shared (ChatWidget) | `routes/openai_compat.py` |
| Insights | Bill projection, anomaly detection, usage benchmarks | `app/insights/` | `routes/ai.py` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Charts | Recharts |
| Maps | Leaflet + React Leaflet |
| Animations | Motion (Framer Motion) |
| Backend | FastAPI (Python 3.8+) |
| ASGI Server | Uvicorn |
| Database | ClickHouse Cloud |
| AI | OpenAI GPT-4o |
| AI Chat UI | LibreChat (Docker) |
| Proxy | Nginx (for LibreChat iframe embedding) |
| Location Data | OneMap API (Singapore) |

---

## Project Structure

```
Hackomania/
├── .env                              # Root env — OPENAI_API_KEY for LibreChat
├── .gitignore
├── CLAUDE.md                         # Project context document
├── docker-compose.librechat.yml      # LibreChat + MongoDB + Nginx setup
├── librechat.yaml                    # LibreChat custom endpoint config
├── nginx.librechat.conf              # Nginx proxy config (strips X-Frame-Options)
│
├── backend/                          # FastAPI + ClickHouse + OpenAI
│   ├── .env                          # Backend environment variables
│   ├── main.py                       # FastAPI app entry point
│   ├── config.py                     # Pydantic settings (SP_TARIFF = 0.3168 SGD/kWh)
│   ├── requirements.txt              # Python dependencies
│   ├── database/
│   │   └── clickhouse.py             # ClickHouse client + table schema definitions
│   ├── models/
│   │   └── schemas.py                # Pydantic request/response models
│   ├── routes/
│   │   ├── onboarding.py             # User onboarding endpoints
│   │   ├── usage.py                  # Half-hourly electricity usage data
│   │   ├── block.py                  # Block/postal code comparison
│   │   ├── map_view.py               # Map visualisation data
│   │   ├── leaderboard.py            # Block leaderboard rankings
│   │   ├── challenges.py             # Gamification challenges
│   │   ├── ai.py                     # AI insights (OpenAI)
│   │   └── openai_compat.py          # OpenAI-compatible endpoint for LibreChat
│   ├── services/
│   │   ├── openai_service.py         # OpenAI API wrapper
│   │   └── onemap_service.py         # OneMap geocoding service
│   └── utils/
│       ├── datetime_helper.py        # App date management (for demo replay)
│       └── user_resolver.py          # User ID resolution
│
└── frontend/                         # Next.js 14 + TypeScript + Tailwind
    ├── .env.local                    # Frontend environment variables
    ├── next.config.js                # Rewrites /api/* → backend:8000
    ├── tailwind.config.js            # Custom SP colour palette
    ├── app/
    │   ├── layout.tsx                # Root layout (NavBar + ChatWidget)
    │   ├── page.tsx                  # Home / landing page
    │   ├── onboarding/page.tsx
    │   ├── dashboard/page.tsx
    │   ├── block/page.tsx
    │   ├── map/page.tsx
    │   ├── leaderboard/page.tsx
    │   ├── challenges/page.tsx
    │   └── insights/page.tsx
    ├── components/
    │   ├── shared/                   # NavBar, ChatWidget (LibreChat iframe), Card, StatBox
    │   ├── onboarding/
    │   ├── dashboard/                # AIInsightCard, BuildingGraph (Recharts)
    │   ├── block/                    # BlockStats, BlockComparisonChart, AITipCard
    │   ├── map/                      # BlockMap, OneMapLeaflet
    │   ├── leaderboard/
    │   ├── challenges/               # ChallengeCard, SubmitPhotoModal
    │   └── insights/                 # EditTargetBillModal, BenchmarkCard, ProjectionsCard, AnomalyCard
    └── lib/
        ├── api.ts                    # All API client functions
        ├── types.ts                  # TypeScript type definitions
        └── blockNames.ts             # Block naming utilities
```

---

## Prerequisites

- **Node.js** 18+ with npm
- **Python** 3.8+ with pip
- **Docker Desktop** (required only for the AI Coach / LibreChat feature)
- An **OpenAI API key** (GPT-4o)
- Access to the **ClickHouse Cloud** database (credentials provided separately)
- A **OneMap API token** for map geocoding — register at [onemap.gov.sg](https://www.onemap.gov.sg/apidocs/register)

---

## Setup & Installation

### 1. Clone the Repository

```bash
git clone <repo-url>
cd Hackomania
```

### 2. Backend Setup

```bash
cd backend
```

**Create the `.env` file:**

```bash
# backend/.env
OPENAI_API_KEY=sk-proj-...your-key-here...

# ClickHouse Cloud (Asia Southeast 1 — GCP)
CLICKHOUSE_HOST=kcpmfvvs96.asia-southeast1.gcp.clickhouse.cloud
CLICKHOUSE_PORT=443
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=<password>
CLICKHOUSE_DATABASE=default
CLICKHOUSE_SECURE=true

# Default demo user (skips onboarding requirement)
USER_ID=3d6414de-7c0f-4b0d-817e-9bb25eb18c3b
HOUSEHOLD_ID=3d6414de-7c0f-4b0d-817e-9bb25eb18c3b

# OneMap API token
ONEMAP_API_KEY=<your-onemap-jwt-token>

# App date for demo replay (set to desired date for historical data)
CURRENT_APP_DATE=2025-12-31
```

**Install Python dependencies:**

```bash
pip install -r requirements.txt
```

**Seed the database (first-time setup):**

```bash
python -m database.seed
```

**Start the backend server:**

```bash
uvicorn main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**
Swagger API docs at **http://localhost:8000/docs**

---

### 3. Frontend Setup

```bash
cd frontend
```

**Create the `.env.local` file:**

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_LIBRECHAT_URL=http://localhost:3090
NEXT_PUBLIC_ONEMAP_TOKEN=<your-onemap-jwt-token>
```

**Install dependencies:**

```bash
npm install
```

**Start the dev server:**

```bash
npm run dev
```

Frontend runs at **http://localhost:3000**

> **Note:** The frontend proxies all `/api/*` requests to the backend via a Next.js rewrite rule in `next.config.js`. No CORS configuration needed.

---

### 4. AI Coach (LibreChat) Setup

The floating chat widget is powered by [LibreChat](https://github.com/danny-avila/LibreChat) running in Docker, proxied through Nginx so it can be embedded in an iframe.

**Prerequisite:** Docker Desktop must be installed and running.

**Create a root `.env` file** (same directory as `docker-compose.librechat.yml`):

```bash
# .env  (gitignored — never commit this)
OPENAI_API_KEY=sk-proj-...your-key-here...
```

**Start LibreChat:**

```bash
docker compose -f docker-compose.librechat.yml up -d
```

This starts three containers:

| Container | Description | Port |
|---|---|---|
| `mongodb` | Stores LibreChat conversation history | Internal only |
| `librechat` | LibreChat chat UI | Internal :3080 |
| `librechat-proxy` | Nginx — strips `X-Frame-Options` for iframe embedding | **:3090** |

LibreChat is accessible at **http://localhost:3090** and automatically embedded in the app's chat widget.

**How the AI Coach works:**

```
User message → LibreChat UI → FastAPI /v1/chat/completions
                                       ↓
                            Queries live ClickHouse data
                                       ↓
                            GPT-4o generates personalised insight
                                       ↓
                            Response streamed back to chat widget
```

The FastAPI backend must be running for the AI Coach to work.

**Stop LibreChat:**

```bash
docker compose -f docker-compose.librechat.yml down
```

**Troubleshoot:** If the chat widget shows "AI Coach not running":

```bash
docker compose -f docker-compose.librechat.yml ps
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o | Yes |
| `CLICKHOUSE_HOST` | ClickHouse Cloud host | Yes |
| `CLICKHOUSE_PORT` | ClickHouse port (443 for cloud) | Yes |
| `CLICKHOUSE_USER` | ClickHouse username | Yes |
| `CLICKHOUSE_PASSWORD` | ClickHouse password | Yes |
| `CLICKHOUSE_DATABASE` | ClickHouse database name | Yes |
| `CLICKHOUSE_SECURE` | Use TLS (`true` for cloud) | Yes |
| `USER_ID` | Default demo user UUID | Optional |
| `HOUSEHOLD_ID` | Default demo household UUID | Optional |
| `ONEMAP_API_KEY` | OneMap JWT token for geocoding | Optional |
| `CURRENT_APP_DATE` | Override app date for demo replay (YYYY-MM-DD) | Optional |

### Frontend (`frontend/.env.local`)

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL | Yes |
| `NEXT_PUBLIC_LIBRECHAT_URL` | LibreChat URL (for chat widget iframe) | Optional |
| `NEXT_PUBLIC_ONEMAP_TOKEN` | OneMap JWT token for map tiles | Optional |

### Root (`.env`) — LibreChat only

| Variable | Description | Required |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key used by LibreChat | Yes (if using LibreChat) |

---

## Running the App

### Development (all services)

Open 3 terminals:

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 — LibreChat (optional):**
```bash
docker compose -f docker-compose.librechat.yml up
```

### Port Summary

| Service | Port | URL |
|---|---|---|
| Frontend (Next.js) | 3000 | http://localhost:3000 |
| Backend (FastAPI) | 8000 | http://localhost:8000 |
| API Docs (Swagger) | 8000 | http://localhost:8000/docs |
| LibreChat Proxy (Nginx) | 3090 | http://localhost:3090 |
| LibreChat App | 3080 | Internal Docker only |
| MongoDB | 27017 | Internal Docker only |

### Production Build (Frontend)

```bash
cd frontend
npm run build
npm start
```

---

## API Reference

### Health Check

```
GET /health
→ {"status": "ok", "service": "BlockBattles API"}

GET /api/app-date
→ {"date": "2025-12-31", "formatted": "31 December 2025"}
```

### Onboarding

```
POST /api/onboarding          # Submit household profile
GET  /api/onboarding/{user_id} # Retrieve user profile
```

### Usage Data

```
GET /api/usage/daily          # Today's half-hourly consumption
GET /api/usage/monthly        # Monthly usage summary
GET /api/usage/peak-hours     # Peak usage period analysis
```

### Block Comparison

```
GET /api/block/comparison     # Own usage vs block average
GET /api/block/stats          # Block-level statistics
```

### Leaderboard

```
GET /api/leaderboard          # Weekly block rankings
```

### Map View

```
GET /api/map/blocks           # Block energy data for map rendering
```

### Challenges

```
GET  /api/challenges          # List available challenges
POST /api/challenges/complete # Submit challenge completion with photo
```

### AI Insights

```
POST /api/ai/insights         # Generate personalised AI insight
POST /v1/chat/completions     # OpenAI-compatible endpoint (used by LibreChat)
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│           Next.js Frontend (3000)        │
│  Dashboard │ Block │ Map │ Leaderboard   │
│            └── ChatWidget (iframe)        │
└──────────────┬──────────────────────────┘
               │ /api/* (rewrites)
               ▼
┌─────────────────────────────────────────┐
│          FastAPI Backend (8000)          │
│  Routes: usage / block / map / ai / ...  │
│  Config: SP_TARIFF = 0.3168 SGD/kWh     │
└──────┬──────────────────┬───────────────┘
       │                  │
       ▼                  ▼
┌─────────────┐   ┌──────────────────┐
│  ClickHouse │   │  OpenAI GPT-4o   │
│  Cloud DB   │   │  (AI Insights)   │
└─────────────┘   └──────────────────┘

┌─────────────────────────────────────────┐
│       LibreChat Docker Stack (3090)      │
│  Nginx Proxy → LibreChat → MongoDB       │
│  ↕ calls FastAPI /v1/chat/completions    │
└─────────────────────────────────────────┘
```

### Database Tables (ClickHouse)

| Table | Description |
|---|---|
| `household_data` | Static household profile (area, district, postal code, dwelling type) |
| `household_user_input` | User preferences (floor area, residents, aircon usage, WFH days) |
| `household_electricity_usage` | Half-hourly consumption readings (HouseholdID, Timestamp, kWh) |
| `user_challenges` | Completed gamification challenges (user, challenge, points, photo) |
| `user_points` | Weekly GreenUP points per user per block |

---

## SP Colour Palette

The UI matches the SP Utilities App visual identity.

| Role | Colour | Hex |
|---|---|---|
| Primary | Teal | `#2DB7A3` |
| Secondary | Mint Green | `#9DE1D3` |
| Chart | Soft Mint | `#BFECE4` |
| Background | Light Grey | `#F5F7F7` |
| Card | White | `#FFFFFF` |
| Alert | Orange | `#F59E0B` |
| Primary Text | Dark Grey | `#2F3A3A` |
| Secondary Text | Grey | `#6B7C7C` |

All colours are available as Tailwind utility classes:
`sp-teal`, `sp-mint`, `sp-chart`, `sp-bg`, `sp-alert`, `sp-text`, `sp-text-secondary`

---

## Notes

- **Demo Mode:** `USER_ID` and `HOUSEHOLD_ID` in `backend/.env` bypass onboarding, useful for demos and testing.
- **App Date Replay:** Set `CURRENT_APP_DATE` in `backend/.env` to replay historical data for any date.
- **Electricity Tariff:** SP tariff is hardcoded at `0.3168 SGD/kWh` in `backend/config.py`.
- **Simulated Data:** Real SP data is unavailable during the hackathon. The prototype uses simulated half-hourly household electricity data for one month.
- **Privacy:** Individual household data is never publicly visible. Only aggregated block averages are displayed in Block View and Map View.
- **OneMap API:** Required for the map view. Register and obtain a JWT token at [onemap.gov.sg](https://www.onemap.gov.sg/apidocs/register).
