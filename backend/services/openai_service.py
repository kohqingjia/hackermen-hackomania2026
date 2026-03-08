"""
OpenAI service — all AI-powered features for PowerBlock.

Functions:
  - generate_usage_insight      Daily usage explanation + tip
  - generate_recommendations    List of behaviour change actions
  - generate_monthly_analysis   Month-on-month comparison narrative
"""

from openai import OpenAI
from config import settings, SP_TARIFF
import json

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

    prompt = f"""You are an energy coach for Singapore HDB household. You generate insights on a household's daily energy consumption pattern, and give one actionable tip to save energy tonight.

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
        max_completion_tokens=300,
        temperature=0.7,
    )

    import json
    return json.loads(response.choices[0].message.content)

def generate_usage_context(
    user_id: str,
    user_kwh: float,
    block_avg_kwh: float,
    difference: float,
) -> str:
    """
    Returns: { context }
    """
    prompt = f"""You are an energy coach for Singapore HDB household. 
    Your goal is to relate differences between a block's average daily electricity consumption rate ({block_avg_kwh} kWh) and the user's average daily electricity consumption rate ({user_kwh} kWh).
    The difference is {difference:+.2f} kWh.
    
    Create an engaging, visual comparison using Singapore HDB context. Use relatable analogies:
    - Appliance equivalents (e.g., "running 2 air-cons for X hours")
    - Cost impact (e.g., "costs ~S${abs(difference)*SP_TARIFF:.2f} more/less per day"), and show what the savings could have been used for (e.g. a cup of hot tea/coffee from the coffee shop)
    - Emoji or simple visual language to make it memorable
    
    Example: "🌡️ Your usage is +0.5 kWh higher — like running 1 extra fan for 8 hours. That's ~15¢ more daily."
    
    Keep it under 40 words, punchy, and actionable. Use Singapore context (HDB, aircon, fan, laundry, kWh, SGD).
    """

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_completion_tokens=300,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()


def generate_recommendations(
    user_kwh_by_slot: list[float],
    flat_type: str,
    num_wfh: int = 0,
    aircon_usage: int = 0,
    num_residents: int = 0,
    num_aircons: int = 0,
    num_children: int = 0,
    num_elderly: int = 0,
    num_tenants: int = 0
) -> list[dict]:
    """
    Returns list of: { title, action, estimated_saving_kwh, estimated_saving_sgd, time_of_day, priority }
    """
    # Identify peak half-hour slots
    peak_slots = sorted(range(48), key=lambda i: user_kwh_by_slot[i], reverse=True)[:6]
    peak_hours = [f"{s//2:02d}:{(s%2)*30:02d}" for s in peak_slots]

    prompt = f"""You are an AI energy advisor for Singapore HDB residents.

Household: {flat_type} flat, {num_residents} residents, aircon usage level {aircon_usage}/3, WFH {num_wfh} days/week, {num_aircons} air conditioners, {num_children} children, {num_elderly} elderly individuals, {num_tenants} tenants.
Top usage hours today: {', '.join(peak_hours)}.

Generate 3 personalised energy-saving recommendations.
Each must include:
- title: short label (max 5 words)
- action: specific action to take (max 20 words)
- estimated_saving_kwh: realistic float (how much kWh saved per day)
- estimated_saving_sgd: float (use SGD {SP_TARIFF}/kWh rate)
- time_of_day: "morning" | "afternoon" | "evening" | "night"
- priority: "high" | "medium" | "low"

Respond as JSON with key "recommendations" containing the array. Use Singapore context."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_completion_tokens=1000,
        temperature=0.3,
    )

    content = response.choices[0].message.content

    if not content:
        return []

    try:
        result = json.loads(content)
        return result.get("recommendations", [])
    except json.JSONDecodeError:
        print("Invalid JSON:", content)
        return []


def generate_monthly_analysis(
    current_month_kwh: float,
    previous_month_kwh: float,
    target_bill: float,
    projected_bill: float,
    flat_type: str,
) -> str:
    """Returns a short narrative paragraph for the monthly analysis view."""
    # Current month (but not the full month), previous month, target bill
    current_bill = current_month_kwh * SP_TARIFF
    previous_bill = previous_month_kwh * SP_TARIFF
    change_pct = round(((current_month_kwh - previous_month_kwh) / previous_month_kwh * 100) if previous_month_kwh else 0, 1)
    savings_sgd = round(previous_bill - current_bill, 2)
    on_track = (projected_bill <= target_bill) if target_bill else None

    prompt = f"""You are a helpful energy coach for a Singapore HDB resident.

Household type: {flat_type}
This month: {current_month_kwh:.1f} kWh (est. S${current_bill:.2f})
Last month: {previous_month_kwh:.1f} kWh
Change: {change_pct:+.1f}%
Savings from last month: S${savings_sgd:.2f}
Projected bill for this month: S${projected_bill:.2f}
Target: S${target_bill:.2f}/month
On track: {on_track}

Write a 2-sentence friendly analysis. Acknowledge progress or give encouragement. If their projections exceed their target, urge them to take action and suggest they check the recommendations tab.
Mention if they're on track for their target. Keep it under 50 words total."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_completion_tokens=120,
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
        max_completion_tokens=200,
        temperature=0.8,
    )
    return response.choices[0].message.content.strip()
