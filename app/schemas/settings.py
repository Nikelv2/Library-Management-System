"""
Pydantic schemas for system settings.
"""
from pydantic import BaseModel, ConfigDict, Field


class SettingsResponse(BaseModel):
    """Schema for settings response."""
    pickup_window_days: int
    standard_loan_days: int
    daily_fine_amount: float
    model_config = ConfigDict(from_attributes=True)


class SettingsUpdate(BaseModel):
    """Schema for updating settings."""
    pickup_window_days: int = Field(..., ge=1, le=14)
    standard_loan_days: int = Field(..., ge=1, le=120)
    daily_fine_amount: float = Field(..., ge=0.0, le=100.0)
