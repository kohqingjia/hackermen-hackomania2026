"""
OpenAI-compatible /v1 endpoint so LibreChat can use our FastAPI as its AI backend.
Every request is enriched with live ClickHouse data before being sent to GPT-4o.

POST /v1/chat/completions
GET  /v1/models
"""

import json
import time
import uuid
from datetime import date, timedelta

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import settings
from database.clickhouse import get_client
from openai import OpenAI

router = APIRouter(tags=["openai-compat"])

_oai = OpenAI(api_key=settings.openai_api_key)
MODEL = "gpt-4o"
SYSTEM_PROMPT = (
    "You are PowerBlock AI Coach, a friendly energy advisor for Singapore HDB residents. "
    "Help users understand their electricity usage, save energy, and earn challenge points. "
    "Keep replies concise (under 100 words). Use Singapore context (HDB, aircon, SP Group, kWh, SGD)."
)

FALLBACK_USER_ID = "aaaa0001-0000-0000-0000-000000000000"
# Tracks which user is currently active (updated by the frontend on chat open)
_active_user_id: str = FALLBACK_USER_ID


class SessionRequest(BaseModel):
    user_id: str


@router.post("/api/session/user")
def set_active_user(req: SessionRequest):
    global _active_user_id
    _active_user_id = req.user_id
    return {"ok": True, "user_id": _active_user_id}


# ── Models ──────────────────────────────────────────────────────────────────

class OAIMessage(BaseModel):
    role: str
    content: str


class OAIRequest(BaseModel):
    model: str = "powerblock-coach"
    messages: list[OAIMessage]
    stream: bool = False
    temperature: float | None = None
    max_tokens: int | None = None


# ── Helpers ─────────────────────────────────────────────────────────────────

def _build_user_context() -> str:
    """Query ClickHouse and return a rich context string."""
    try:
        db = get_client()

        # ── User profile ──
        uid = _active_user_id
        row = db.query(
            """
            SELECT hd.HouseholdID, hd.Postal_Code, hd.District, hd.Flat_type,
                   hu.Num_residents, hu.Aircon_usage, hu.Num_WFH
            FROM household_data hd
            LEFT JOIN household_user_input hu ON hd.UserID = hu.UserID
            WHERE hd.UserID = {uid:String} LIMIT 1
            """,
            parameters={"uid": uid},
        ).result_rows
        if not row:
            # Fall back to demo user if the given user_id is not found
            uid = FALLBACK_USER_ID
            row = db.query(
                """
                SELECT hd.HouseholdID, hd.Postal_Code, hd.District, hd.Flat_type,
                       hu.Num_residents, hu.Aircon_usage, hu.Num_WFH
                FROM household_data hd
                LEFT JOIN household_user_input hu ON hd.UserID = hu.UserID
                WHERE hd.UserID = {uid:String} LIMIT 1
                """,
                parameters={"uid": uid},
            ).result_rows
        if not row:
            return ""
        household_id, postal_code, district, flat_type, num_residents, aircon_usage, num_wfh = row[0][:7]

        today = date.today()
        yesterday = today - timedelta(days=1)

        def scalar(sql, params):
            rows = db.query(sql, parameters=params).result_rows
            return float(rows[0][0] or 0) if rows else 0.0

        today_kwh = scalar(
            "SELECT sum(Consumption) FROM household_electricity_usage "
            "WHERE HouseholdID={hid:String} AND toDate(Timestamp)={d:Date}",
            {"hid": household_id, "d": today.isoformat()},
        )
        yesterday_kwh = scalar(
            "SELECT sum(Consumption) FROM household_electricity_usage "
            "WHERE HouseholdID={hid:String} AND toDate(Timestamp)={d:Date}",
            {"hid": household_id, "d": yesterday.isoformat()},
        )
        block_avg = scalar(
            "SELECT avg(e.Consumption)*48 FROM household_electricity_usage e "
            "JOIN household_data hd ON e.HouseholdID = hd.HouseholdID "
            "WHERE hd.Postal_Code={pc:String} AND toDate(e.Timestamp)={d:Date}",
            {"pc": postal_code, "d": today.isoformat()},
        )
        peak_rows = db.query(
            "SELECT Timestamp FROM household_electricity_usage "
            "WHERE HouseholdID={hid:String} AND toDate(Timestamp)={d:Date} "
            "ORDER BY Consumption DESC LIMIT 1",
            parameters={"hid": household_id, "d": today.isoformat()},
        ).result_rows
        peak_hour = peak_rows[0][0].strftime("%H:%M") if peak_rows else "N/A"

        diff_block = today_kwh - block_avg
        diff_yesterday = today_kwh - yesterday_kwh

        return (
            f"[LIVE DATA from ClickHouse] "
            f"User: {flat_type} flat at postal code {postal_code}, "
            f"{num_residents or 0} residents, aircon level {aircon_usage or 0}, "
            f"WFH {num_wfh or 0} days/week. "
            f"Today so far: {today_kwh:.2f} kWh (peak {peak_hour}). "
            f"Block avg: {block_avg:.2f} kWh "
            f"({'above' if diff_block > 0 else 'below'} by {abs(diff_block):.2f} kWh). "
            f"Yesterday: {yesterday_kwh:.2f} kWh "
            f"({'up' if diff_yesterday > 0 else 'down'} {abs(diff_yesterday):.2f} kWh). "
            "Always cite these real figures when answering about usage."
        )
    except Exception:
        return ""


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/v1/models")
def list_models():
    return {
        "object": "list",
        "data": [
            {
                "id": "powerblock-coach",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "powerblock",
            }
        ],
    }


@router.post("/v1/chat/completions")
def chat_completions(req: OAIRequest):
    user_context = _build_user_context()
    cid = f"chatcmpl-{uuid.uuid4().hex[:8]}"
    created = int(time.time())

    system = SYSTEM_PROMPT
    if user_context:
        system += f" {user_context}"

    oai_messages = [{"role": "system", "content": system}]
    oai_messages += [{"role": m.role, "content": m.content} for m in req.messages]

    if req.stream:
        def event_stream():
            # Opening chunk with role
            opening = {
                "id": cid, "object": "chat.completion.chunk", "created": created,
                "model": req.model,
                "choices": [{"index": 0, "delta": {"role": "assistant", "content": ""}, "finish_reason": None}],
            }
            yield f"data: {json.dumps(opening)}\n\n"

            stream = _oai.chat.completions.create(
                model=MODEL, messages=oai_messages, stream=True, max_tokens=300, temperature=0.7,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta
                finish = chunk.choices[0].finish_reason
                payload = {
                    "id": cid, "object": "chat.completion.chunk", "created": created,
                    "model": req.model,
                    "choices": [{"index": 0, "delta": {"content": delta.content or ""}, "finish_reason": finish}],
                }
                yield f"data: {json.dumps(payload)}\n\n"

            yield "data: [DONE]\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    # Non-streaming
    response = _oai.chat.completions.create(
        model=MODEL, messages=oai_messages, max_tokens=300, temperature=0.7,
    )
    reply = response.choices[0].message.content.strip()
    return {
        "id": cid, "object": "chat.completion", "created": created, "model": req.model,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": reply}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }
