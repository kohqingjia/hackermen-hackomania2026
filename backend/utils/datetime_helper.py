"""
Datetime utilities for the app.
Provides get_app_date() to return a configurable "current date" 
instead of always using date.today().
"""

from datetime import date
from config import settings


def get_app_date() -> date:
    """
    Returns the app's "current date".
    
    If settings.current_app_date is set (e.g., "2025-12-31"), returns that.
    Otherwise returns the system date.today().
    
    This allows running the app against historical data by setting:
        CURRENT_APP_DATE=2025-12-31
    in .env or config.
    """
    if settings.current_app_date:
        try:
            return date.fromisoformat(settings.current_app_date)
        except (ValueError, TypeError):
            pass
    return date.today()
