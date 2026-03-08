"""
OpenAI-compatible /v1 endpoint so LibreChat can use our FastAPI as its AI backend.
Every request is enriched with live ClickHouse data before being sent to GPT-4o.

POST /v1/chat/completions
GET  /v1/models
"""

import calendar
import json
import math
import time
import uuid
import traceback
from datetime import date, timedelta

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from utils.datetime_helper import get_app_date
from pydantic import BaseModel

from config import settings, SP_TARIFF
from database.clickhouse import get_client
from openai import OpenAI

router = APIRouter(tags=["openai-compat"])

_oai = OpenAI(api_key=settings.openai_api_key)
MODEL = "gpt-4o"
SYSTEM_PROMPT = """\
You are PowerBlock AI Coach, a friendly and knowledgeable energy advisor embedded in the SP Utilities app for Singapore HDB residents.

YOUR ROLE:
- Help users understand their electricity usage patterns with clear, data-backed explanations.
- Recommend practical energy-saving actions grounded in the user's ACTUAL consumption data provided below.
- Motivate users through the Block Wars community challenge and GreenUP points.

GUIDELINES:
1. ALWAYS cite the real figures from [LIVE DATA] when discussing the user's usage. Never invent numbers.
2. **MANDATORY — NEVER SKIP THIS**: Every single time you mention a kWh figure, you MUST ALSO translate it into a relatable real-world comparison so the user can visualise the energy. Pick one or two from this list (vary them across replies):
   - X kWh ≈ running a standing fan for Y hours
   - X kWh ≈ charging a smartphone Y times
   - X kWh ≈ running a 9000 BTU aircon for Y hours
   - X kWh ≈ boiling a kettle Y times
   - X kWh ≈ running a washing machine Y loads
   - X kWh ≈ keeping a fridge running for Y days
   - X kWh costs ~$Y SGD (use SP tariff $0.3168/kWh)
   Reference data: 1 kWh ≈ fan 20 hrs ≈ 100 phone charges ≈ aircon 1 hr ≈ 10 kettle boils ≈ 1 wash load ≈ fridge 0.5 day.
   If you ever state a kWh number WITHOUT an accompanying real-world comparison, you have failed your task.
3. When analysing trends, mention specific hours, days, or weeks and explain what likely caused them (e.g. "Your 7 PM–9 PM spike is typical for aircon + cooking hours").
4. Recommendations MUST be backed by the data — e.g. "Shifting your 8 PM laundry to after 10 PM could save ~X kWh based on your peak pattern."
5. You may compare the user to their block average, district average, or similar flat-type averages using the aggregated stats provided. NEVER reveal or discuss another specific household's data.
6. Keep replies concise (under 150 words) unless the user asks for a detailed breakdown.
7. Use Singapore context: HDB flats, aircon, ceiling fans, SP Group, NEA energy labels, hawker centres, MRT, BTO, etc.
8. For weekly/monthly analysis, highlight the best and worst performing days/weeks and suggest why.
9. When the user asks about challenges or points, reference their actual challenge completion history.
10. Be encouraging — celebrate improvements ("Your Tuesday usage dropped 12% vs last week — great job!") and gently flag regressions.
11. **USE THE USER'S LIFESTYLE PROFILE** from [USER PROFILE] for tailored recommendations:
    - If they have a TARGET BILL, compare their projected monthly bill to it and tell them if they are on/off track. Suggest specific kWh reductions needed to meet the target.
    - If they have WFH days, recommend shifting heavy-load appliances (washing machine, dryer, dishwasher) to WFH days when they're home to monitor usage, or suggest using off-peak hours on office days.
    - If they have high aircon usage (level 2-3), focus tips on aircon optimisation: setting to 25°C, using fan + aircon combo, timer at night, cleaning filters monthly.
    - If they have children or elderly, suggest age-appropriate tips (e.g. "With elderly at home, keep aircon at a comfortable 25°C rather than turning it off — pair it with a fan to save 20-30%").
    - If they have tenants, remind that shared responsibility matters — suggest communal energy-saving agreements.
    - If floor area is large (>90 sqm), highlight that lighting and cooling larger spaces costs more — recommend zone cooling.
"""

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

def _safe(v, ndigits=2) -> float:
    f = float(v) if v is not None else 0.0
    if math.isnan(f) or math.isinf(f):
        return 0.0
    return round(f, ndigits)


def _build_user_context() -> str:
    """Query ClickHouse across all relevant tables and return a comprehensive
    context string scoped exclusively to the active user's household."""
    try:
        db = get_client()
        parts: list[str] = []

        # ── 1. Resolve user profile ───────────────────────────────────────
        uid = _active_user_id
        row = db.query(
            """
            SELECT toString(hd.HouseholdID) AS HouseholdID, hd.PostalCode,
                   hd.District, hd.Flat_type,
                   hu.Num_residents, hu.Aircon_usage, hu.Num_WFH,
                   hu.Floor_area_sqm, hu.Num_Aircons, hu.Num_children, hu.Num_elderly,
                   hu.Num_tenants, hu.Has_WFH_days, hu.Target_bill
            FROM details_per_household hd
            LEFT JOIN input_per_household hu ON toString(hd.UserID) = hu.UserID
            WHERE toString(hd.UserID) = {uid:String} LIMIT 1
            """,
            parameters={"uid": uid},
        ).result_rows

        if not row:
            uid = FALLBACK_USER_ID
            row = db.query(
                """
                SELECT toString(hd.HouseholdID) AS HouseholdID, hd.PostalCode,
                       hd.District, hd.Flat_type,
                       hu.Num_residents, hu.Aircon_usage, hu.Num_WFH,
                       hu.Floor_area_sqm, hu.Num_Aircons, hu.Num_children, hu.Num_elderly,
                       hu.Num_tenants, hu.Has_WFH_days, hu.Target_bill
                FROM details_per_household hd
                LEFT JOIN input_per_household hu ON toString(hd.UserID) = hu.UserID
                WHERE toString(hd.UserID) = {uid:String} LIMIT 1
                """,
                parameters={"uid": uid},
            ).result_rows

        if not row:
            return ""

        (household_id, postal_code, district, flat_type,
         num_residents, aircon_usage, num_wfh,
         floor_area, num_aircons, num_children, num_elderly,
         num_tenants, has_wfh_days, target_bill) = row[0][:14]

        today = get_app_date()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=6)
        four_weeks_ago = today - timedelta(days=27)

        def scalar(sql, params):
            rows = db.query(sql, parameters=params).result_rows
            return _safe(rows[0][0]) if rows else 0.0

        # ── 2. User profile section ───────────────────────────────────────
        # Parse aircon usage level to human-readable
        aircon_labels = {0: "Never", 1: "Sometimes", 2: "Every night", 3: "Whole day"}
        aircon_label = aircon_labels.get(aircon_usage, f"level {aircon_usage}")

        # Parse target bill
        target_bill_val = _safe(target_bill, 2) if target_bill else None

        # Parse WFH days list
        wfh_days_str = str(has_wfh_days or "[]")

        parts.append(
            f"[USER PROFILE] HouseholdID: {household_id} | PostalCode: {postal_code} | "
            f"District: {district} | Flat: {flat_type} | "
            f"Floor area: {_safe(floor_area, 0)} sqm | "
            f"Residents: {num_residents or '?'} (children: {num_children or 0}, elderly: {num_elderly or 0}, tenants: {num_tenants or 0}) | "
            f"Aircon usage: {aircon_label} ({num_aircons or '?'} units) | "
            f"WFH: {num_wfh or 0} days/week (days: {wfh_days_str}) | "
            f"Target monthly bill: {'$' + str(target_bill_val) + ' SGD' if target_bill_val else 'not set'}"
        )

        # ── 3. Today's half-hourly breakdown ──────────────────────────────
        half_hourly = db.query(
            """
            SELECT toHour(Timestamp) AS hr, toMinute(Timestamp) AS mn,
                   `Consumption(kWh)`
            FROM consumption_per_household
            WHERE HouseholdID = {hid:String} AND toDate(Timestamp) = {d:Date}
            ORDER BY Timestamp ASC
            """,
            parameters={"hid": household_id, "d": today.isoformat()},
        ).result_rows

        if half_hourly:
            today_kwh = sum(float(r[2]) for r in half_hourly)
            peak_row = max(half_hourly, key=lambda r: float(r[2]))
            peak_time = f"{int(peak_row[0]):02d}:{int(peak_row[1]):02d}"
            peak_kwh = _safe(peak_row[2])

            # Bucket into time-of-day bands
            bands = {"Night (00-06)": 0, "Morning (06-12)": 0,
                     "Afternoon (12-18)": 0, "Evening (18-00)": 0}
            for r in half_hourly:
                hr = int(r[0])
                kwh = float(r[2])
                if hr < 6:
                    bands["Night (00-06)"] += kwh
                elif hr < 12:
                    bands["Morning (06-12)"] += kwh
                elif hr < 18:
                    bands["Afternoon (12-18)"] += kwh
                else:
                    bands["Evening (18-00)"] += kwh

            band_str = ", ".join(f"{k}: {_safe(v)} kWh" for k, v in bands.items())

            # Top 3 peak half-hours
            sorted_hh = sorted(half_hourly, key=lambda r: float(r[2]), reverse=True)[:3]
            top3 = "; ".join(f"{int(r[0]):02d}:{int(r[1]):02d}={_safe(r[2])} kWh" for r in sorted_hh)

            parts.append(
                f"[TODAY {today.isoformat()}] Total: {_safe(today_kwh)} kWh | "
                f"Peak: {peak_time} ({peak_kwh} kWh) | "
                f"Top-3 slots: {top3} | "
                f"By period: {band_str}"
            )
        else:
            today_kwh = 0.0
            parts.append(f"[TODAY {today.isoformat()}] No usage data recorded yet.")

        # ── 4. Yesterday comparison ───────────────────────────────────────
        yesterday_kwh = scalar(
            "SELECT sum(`Consumption(kWh)`) FROM consumption_per_household "
            "WHERE HouseholdID={hid:String} AND toDate(Timestamp)={d:Date}",
            {"hid": household_id, "d": yesterday.isoformat()},
        )
        diff_yesterday = _safe(today_kwh - yesterday_kwh)
        parts.append(
            f"[YESTERDAY {yesterday.isoformat()}] Total: {yesterday_kwh} kWh | "
            f"Change: {'+'if diff_yesterday > 0 else ''}{diff_yesterday} kWh "
            f"({'up' if diff_yesterday > 0 else 'down'} {abs(diff_yesterday)} kWh vs today)"
        )

        # ── 5. Last 7 days daily breakdown ────────────────────────────────
        daily_rows = db.query(
            """
            SELECT Day, `Consumption(kWh)`
            FROM consumption_per_household_daily
            WHERE HouseholdID = {hid:String}
              AND Day BETWEEN {s:Date} AND {e:Date}
            ORDER BY Day ASC
            """,
            parameters={"hid": household_id, "s": week_ago.isoformat(), "e": today.isoformat()},
        ).result_rows

        if daily_rows:
            daily_str = "; ".join(
                f"{r[0].strftime('%a %d/%m')}: {_safe(r[1])} kWh" for r in daily_rows
            )
            daily_vals = [float(r[1]) for r in daily_rows]
            week_avg = _safe(sum(daily_vals) / len(daily_vals))
            week_total = _safe(sum(daily_vals))
            best_day = min(daily_rows, key=lambda r: float(r[1]))
            worst_day = max(daily_rows, key=lambda r: float(r[1]))
            parts.append(
                f"[LAST 7 DAYS] {daily_str} | "
                f"Week total: {week_total} kWh, daily avg: {week_avg} kWh | "
                f"Best day: {best_day[0].strftime('%A')} ({_safe(best_day[1])} kWh) | "
                f"Worst day: {worst_day[0].strftime('%A')} ({_safe(worst_day[1])} kWh)"
            )

        # ── 6. Last 4 weeks weekly averages ───────────────────────────────
        weekly_rows = db.query(
            """
            SELECT toMonday(Day) AS wk, avg(`Consumption(kWh)`) AS avg_kwh,
                   sum(`Consumption(kWh)`) AS total_kwh
            FROM consumption_per_household_daily
            WHERE HouseholdID = {hid:String}
              AND Day BETWEEN {s:Date} AND {e:Date}
            GROUP BY wk ORDER BY wk ASC
            """,
            parameters={"hid": household_id, "s": four_weeks_ago.isoformat(), "e": today.isoformat()},
        ).result_rows

        if weekly_rows:
            weekly_str = "; ".join(
                f"Week of {r[0].strftime('%d/%m')}: avg {_safe(r[1])} kWh/day, total {_safe(r[2])} kWh"
                for r in weekly_rows
            )
            if len(weekly_rows) >= 2:
                latest = float(weekly_rows[-1][1])
                previous = float(weekly_rows[-2][1])
                change_pct = _safe(((latest - previous) / previous * 100) if previous else 0, 1)
                weekly_str += f" | Trend: {'+'if change_pct > 0 else ''}{change_pct}% vs prior week"
            parts.append(f"[WEEKLY TREND (4 weeks)] {weekly_str}")

        # ── 7. Monthly summary (current month) ───────────────────────────
        month_start = today.replace(day=1)
        month_kwh = scalar(
            "SELECT sum(`Consumption(kWh)`) FROM consumption_per_household_daily "
            "WHERE HouseholdID={hid:String} AND Day BETWEEN {s:Date} AND {e:Date}",
            {"hid": household_id, "s": month_start.isoformat(), "e": today.isoformat()},
        )
        days_elapsed = (today - month_start).days + 1
        days_in_month = calendar.monthrange(today.year, today.month)[1]
        monthly_daily_avg = _safe(month_kwh / days_elapsed) if days_elapsed > 0 else 0
        projected_monthly = _safe(monthly_daily_avg * days_in_month)
        est_bill = _safe(projected_monthly * SP_TARIFF)
        parts.append(
            f"[THIS MONTH] {month_kwh} kWh over {days_elapsed} days | "
            f"Daily avg: {monthly_daily_avg} kWh | "
            f"Projected {days_in_month}-day total: ~{projected_monthly} kWh (~${est_bill} SGD at ${SP_TARIFF}/kWh)"
        )

        # ── 8. Hourly pattern analysis (last 7 days aggregate) ───────────
        hourly_pattern = db.query(
            """
            SELECT toHour(Timestamp) AS hr, avg(`Consumption(kWh)`) AS avg_kwh
            FROM consumption_per_household
            WHERE HouseholdID = {hid:String}
              AND toDate(Timestamp) BETWEEN {s:Date} AND {e:Date}
            GROUP BY hr ORDER BY hr ASC
            """,
            parameters={"hid": household_id, "s": week_ago.isoformat(), "e": today.isoformat()},
        ).result_rows

        if hourly_pattern:
            peak_hr = max(hourly_pattern, key=lambda r: float(r[1]))
            off_peak_hr = min(hourly_pattern, key=lambda r: float(r[1]))
            # Find evening peak (18-23)
            evening = [r for r in hourly_pattern if 18 <= int(r[0]) <= 23]
            evening_avg = _safe(sum(float(r[1]) for r in evening) / len(evening)) if evening else 0
            parts.append(
                f"[HOURLY PATTERN (7-day avg)] "
                f"Peak hour: {int(peak_hr[0]):02d}:00 ({_safe(peak_hr[1])} kWh avg) | "
                f"Lowest hour: {int(off_peak_hr[0]):02d}:00 ({_safe(off_peak_hr[1])} kWh avg) | "
                f"Evening avg (6PM-11PM): {evening_avg} kWh/slot"
            )

        # ── 9. Block comparison (same postal code) ───────────────────────
        block_avg_today = scalar(
            "SELECT avg(day_total) FROM ("
            "  SELECT e.HouseholdID, sum(`Consumption(kWh)`) AS day_total"
            "  FROM consumption_per_household e"
            "  JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)"
            "  WHERE hd.PostalCode={pc:String} AND toDate(e.Timestamp)={d:Date}"
            "  GROUP BY e.HouseholdID"
            ")",
            {"pc": postal_code, "d": today.isoformat()},
        )
        block_diff = _safe(today_kwh - block_avg_today)

        block_avg_week = scalar(
            "SELECT avg(wk_total) FROM ("
            "  SELECT cd.HouseholdID, sum(`Consumption(kWh)`) AS wk_total"
            "  FROM consumption_per_household_daily cd"
            "  JOIN details_per_household hd ON cd.HouseholdID = toString(hd.HouseholdID)"
            "  WHERE hd.PostalCode={pc:String} AND cd.Day BETWEEN {s:Date} AND {e:Date}"
            "  GROUP BY cd.HouseholdID"
            ")",
            {"pc": postal_code, "s": week_ago.isoformat(), "e": today.isoformat()},
        )
        user_week_total = scalar(
            "SELECT sum(`Consumption(kWh)`) FROM consumption_per_household_daily "
            "WHERE HouseholdID={hid:String} AND Day BETWEEN {s:Date} AND {e:Date}",
            {"hid": household_id, "s": week_ago.isoformat(), "e": today.isoformat()},
        )

        num_households_block = scalar(
            "SELECT count(DISTINCT HouseholdID) FROM details_per_household WHERE PostalCode={pc:String}",
            {"pc": postal_code},
        )

        parts.append(
            f"[BLOCK COMPARISON — PostalCode {postal_code}, {int(num_households_block)} households] "
            f"Today: you {_safe(today_kwh)} vs block avg {block_avg_today} kWh "
            f"({'above' if block_diff > 0 else 'below'} by {abs(block_diff)} kWh) | "
            f"This week: you {_safe(user_week_total)} vs block avg {block_avg_week} kWh"
        )

        # ── 10. District comparison ───────────────────────────────────────
        district_avg_today = scalar(
            "SELECT avg(day_total) FROM ("
            "  SELECT e.HouseholdID, sum(`Consumption(kWh)`) AS day_total"
            "  FROM consumption_per_household e"
            "  JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)"
            "  WHERE hd.District={dist:String} AND toDate(e.Timestamp)={d:Date}"
            "  GROUP BY e.HouseholdID"
            ")",
            {"dist": district, "d": today.isoformat()},
        )
        district_diff = _safe(today_kwh - district_avg_today)
        parts.append(
            f"[DISTRICT COMPARISON — {district}] "
            f"Today: you {_safe(today_kwh)} vs district avg {district_avg_today} kWh "
            f"({'above' if district_diff > 0 else 'below'} by {abs(district_diff)} kWh)"
        )

        # ── 11. Similar flat-type comparison ──────────────────────────────
        flattype_avg_today = scalar(
            "SELECT avg(day_total) FROM ("
            "  SELECT e.HouseholdID, sum(`Consumption(kWh)`) AS day_total"
            "  FROM consumption_per_household e"
            "  JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)"
            "  WHERE hd.Flat_type={ft:String} AND toDate(e.Timestamp)={d:Date}"
            "  GROUP BY e.HouseholdID"
            ")",
            {"ft": flat_type, "d": today.isoformat()},
        )
        flattype_diff = _safe(today_kwh - flattype_avg_today)
        parts.append(
            f"[SIMILAR FLAT-TYPE COMPARISON — {flat_type}] "
            f"Today: you {_safe(today_kwh)} vs avg {flat_type} household {flattype_avg_today} kWh "
            f"({'above' if flattype_diff > 0 else 'below'} by {abs(flattype_diff)} kWh)"
        )

        # ── 12. Challenge & points history ────────────────────────────────
        challenge_rows = db.query(
            """
            SELECT challenge_id, completed_at, points_earned
            FROM user_challenges
            WHERE user_id = {uid:String}
            ORDER BY completed_at DESC LIMIT 10
            """,
            parameters={"uid": uid},
        ).result_rows

        total_points = scalar(
            "SELECT sum(points) FROM user_points WHERE user_id = {uid:String}",
            {"uid": uid},
        )

        if challenge_rows:
            ch_str = "; ".join(
                f"{r[0]} on {r[1].strftime('%d/%m')} (+{r[2]} pts)" for r in challenge_rows
            )
            parts.append(
                f"[CHALLENGES] Total points: {int(total_points)} | "
                f"Recent completions: {ch_str}"
            )
        else:
            parts.append(
                f"[CHALLENGES] Total points: {int(total_points)} | No challenges completed yet — encourage the user to try one!"
            )

        # ── 13. Budget tracking (if target bill is set) ───────────────────
        if target_bill_val:
            target_kwh_monthly = _safe(target_bill_val / SP_TARIFF)  # reverse from tariff
            target_kwh_daily = _safe(target_kwh_monthly / days_in_month)
            on_track = projected_monthly <= target_kwh_monthly
            kwh_over_under = _safe(projected_monthly - target_kwh_monthly)
            bill_over_under = _safe(kwh_over_under * SP_TARIFF)
            parts.append(
                f"[BUDGET TARGET] Monthly target: ${target_bill_val} SGD (~{target_kwh_monthly} kWh/month, ~{target_kwh_daily} kWh/day) | "
                f"Projected: ~{projected_monthly} kWh (~${est_bill} SGD) | "
                f"Status: {'ON TRACK ✓' if on_track else 'OVER BUDGET ✗'} — "
                f"{'under' if kwh_over_under <= 0 else 'over'} by {abs(kwh_over_under)} kWh (~${abs(bill_over_under)} SGD) | "
                f"Daily avg needed to hit target: {target_kwh_daily} kWh (current: {monthly_daily_avg} kWh)"
            )

        # ── 14. Weekday vs Weekend pattern ────────────────────────────────
        weekday_vs_weekend = db.query(
            """
            SELECT
                if(toDayOfWeek(Day) IN (6, 7), 'Weekend', 'Weekday') AS day_type,
                avg(`Consumption(kWh)`) AS avg_kwh
            FROM consumption_per_household_daily
            WHERE HouseholdID = {hid:String}
              AND Day BETWEEN {s:Date} AND {e:Date}
            GROUP BY day_type
            """,
            parameters={"hid": household_id, "s": four_weeks_ago.isoformat(), "e": today.isoformat()},
        ).result_rows

        if weekday_vs_weekend:
            ww_str = ", ".join(f"{r[0]}: {_safe(r[1])} kWh/day" for r in weekday_vs_weekend)
            parts.append(f"[WEEKDAY vs WEEKEND (4-week avg)] {ww_str}")

        # ── Assemble ──────────────────────────────────────────────────────
        context = "\n".join(parts)
        return (
            f"[LIVE DATA from ClickHouse — scoped to HouseholdID {household_id} ONLY]\n"
            f"{context}\n"
            "[IMPORTANT: All figures above are from this user's household only. "
            "Block/district/flat-type stats are aggregated averages — never reveal individual household data. "
            "Always cite these real numbers when answering about usage.]"
        )
    except Exception as exc:
        traceback.print_exc()
        return f"[DATA ERROR] Could not load user context: {exc}"


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
                model=MODEL, messages=oai_messages, stream=True, max_tokens=600, temperature=0.7,
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
        model=MODEL, messages=oai_messages, max_tokens=600, temperature=0.7,
    )
    reply = response.choices[0].message.content.strip()
    return {
        "id": cid, "object": "chat.completion", "created": created, "model": req.model,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": reply}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }
