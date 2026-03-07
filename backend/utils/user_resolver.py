"""
Shared helper to resolve the effective user_id.
Priority: explicit query-param > env USER_ID.
"""

from config import settings


def resolve_user_id(param_user_id: str | None = None) -> str:
    """Return the best available user_id string (never empty)."""
    uid = (param_user_id or "").strip() or (settings.user_id or "").strip()
    if not uid:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=401,
            detail="No user_id provided and USER_ID is not set in backend env.",
        )
    return uid
