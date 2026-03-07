"""
OpenAI service — all AI-powered features for PowerBlock.

Functions:
  - generate_usage_insight      Daily usage explanation + tip
  - generate_recommendations    List of behaviour change actions
  - generate_monthly_analysis   Month-on-month comparison narrative
"""

from openai import OpenAI
from config import settings

client = OpenAI(api_key=settings.openai_api_key)

MODEL = "gpt-4o"


def generate_usage_insight(
    user_id: str,
    user_kwh_total: float,
    peak_hour: str,
    block_avg_kwh: float,
    prev_day_kwh: float,
    flat_type: str,
    aircon_usage: int = 0,
) -> dict:
    """
    Returns: { insight, tip, comparison }
    """
    diff_from_block = user_kwh_total - block_avg_kwh
    diff_from_yesterday = user_kwh_total - prev_day_kwh

    prompt = f"""You are an energy coach for a Singapore HDB household.

User profile: {flat_type} flat, aircon usage level {aircon_usage}/3.
Today's total usage: {user_kwh_total:.2f} kWh
Peak usage hour: {peak_hour}
Block average today: {block_avg_kwh:.2f} kWh
Difference from block average: {diff_from_block:+.2f} kWh ({'+' if diff_from_block>0 else ''}{(diff_from_block/block_avg_kwh*100):.1f}%)
Yesterday's usage: {prev_day_kwh:.2f} kWh
Change from yesterday: {diff_from_yesterday:+.2f} kWh

Write THREE short, friendly responses:
1. "insight": 1-2 sentences explaining today's usage pattern in plain language.
2. "tip": One specific, actionable tip to reduce usage tonight.
3. "comparison": One sentence comparing to the block and to yesterday.

Respond in JSON with keys: insight, tip, comparison. Keep each under 30 words. Use Singapore context (e.g. HDB, aircon, fan, laundry)."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=300,
        temperature=0.7,
    )

    import json
    return json.loads(response.choices[0].message.content)


def generate_recommendations(
    user_kwh_by_slot: list[float],
    flat_type: str,
    num_wfh: int = 0,
    aircon_usage: int = 0,
    num_residents: int = 0,
) -> list[dict]:
    """
    Returns list of: { title, action, estimated_saving_kwh, estimated_saving_sgd, time_of_day, priority }
    """
    # Identify peak half-hour slots
    peak_slots = sorted(range(48), key=lambda i: user_kwh_by_slot[i], reverse=True)[:6]
    peak_hours = [f"{s//2:02d}:{(s%2)*30:02d}" for s in peak_slots]

    prompt = f"""You are an AI energy advisor for a Singapore HDB resident.

Household: {flat_type} flat, {num_residents} residents, aircon usage level {aircon_usage}/3, WFH {num_wfh} days/week.
Top usage hours today: {', '.join(peak_hours)}.

Generate 3 personalised energy-saving recommendations.
Each must include:
- title: short label (max 5 words)
- action: specific action to take (max 20 words)
- estimated_saving_kwh: realistic float (how much kWh saved per day)
- estimated_saving_sgd: float (use SGD 0.33/kWh rate)
- time_of_day: "morning" | "afternoon" | "evening" | "night"
- priority: "high" | "medium" | "low"

Respond as JSON with key "recommendations" containing the array. Use Singapore context."""

    import json
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=500,
        temperature=0.7,
    )

    result = json.loads(response.choices[0].message.content)
    return result.get("recommendations", [])


def generate_monthly_analysis(
    current_month_kwh: float,
    previous_month_kwh: float,
    budget_sgd: float,
    target_reduction_pct: float,
    flat_type: str,
) -> str:
    """Returns a short narrative paragraph for the monthly analysis view."""

    current_bill = current_month_kwh * 0.33
    change_pct = ((current_month_kwh - previous_month_kwh) / previous_month_kwh * 100) if previous_month_kwh else 0
    on_track = change_pct <= -target_reduction_pct

    prompt = f"""You are a friendly energy coach for a Singapore HDB resident.

Household type: {flat_type}
This month: {current_month_kwh:.1f} kWh (est. S${current_bill:.2f})
Last month: {previous_month_kwh:.1f} kWh
Change: {change_pct:+.1f}%
Target: -{target_reduction_pct:.0f}% reduction
Budget: S${budget_sgd:.2f}/month
On track: {on_track}

Write a 2-sentence friendly analysis. Acknowledge progress or give encouragement.
Mention if they're on track for their target. Keep it under 50 words total."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=120,
        temperature=0.7,
    )

    return response.choices[0].message.content.strip()


def chat_with_coach(
    user_message: str,
    history: list[dict],
    user_context: str = "",
) -> str:
    """Free-form energy coach chat. Returns plain-text reply."""
    system = (
        "You are PowerBlock AI Coach, a friendly energy advisor for Singapore HDB residents. "
        "Help users understand their electricity usage, save energy, and earn challenge points. "
        "Keep replies concise (under 80 words). Use Singapore context (HDB, aircon, SP Group, kWh, SGD)."
    )
    if user_context:
        system += f" {user_context}"

    messages = [{"role": "system", "content": system}]
    messages.extend(history[-10:])  # keep last 10 turns for context
    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=200,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()
