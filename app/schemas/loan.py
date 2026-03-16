"""
Pydantic schemas for Loan-related requests and responses.
"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.loan import LoanStatus


class LoanUserSummary(BaseModel):
    """Schema for basic user info on loans."""
    username: str
    full_name: str
    model_config = ConfigDict(from_attributes=True)


class LoanCreate(BaseModel):
    """Schema for reserving a book."""
    book_id: int


class LoanAssign(BaseModel):
    """Schema for assigning a loan to a user (staff)."""
    user_id: int
    book_id: int


class LoanResponse(BaseModel):
    """Schema for loan response."""
    id: int
    user_id: int
    book_id: int
    status: LoanStatus
    reservation_date: datetime
    pickup_deadline: Optional[datetime]
    start_date: Optional[datetime]
    due_date: Optional[datetime]
    returned_at: Optional[datetime]
    canceled_at: Optional[datetime]
    fine_amount: float
    user: Optional[LoanUserSummary] = None
    model_config = ConfigDict(from_attributes=True)
