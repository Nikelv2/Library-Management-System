"""
Loan model representing book loan lifecycle states.
"""
from datetime import datetime
import enum
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Enum, Float
from sqlalchemy.orm import relationship
from app.core.database import Base


class LoanStatus(str, enum.Enum):
    """Enumeration of loan lifecycle states."""
    RESERVED = "reserved"
    ACTIVE = "active"
    RETURNED = "returned"
    EXPIRED = "expired"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class Loan(Base):
    """
    Loan model representing a reservation/loan lifecycle.
    """
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    status = Column(
        Enum(
            LoanStatus,
            native_enum=True,
            create_constraint=True,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
        default=LoanStatus.RESERVED,
    )

    reservation_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    pickup_deadline = Column(DateTime, nullable=True)
    start_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    returned_at = Column(DateTime, nullable=True)
    canceled_at = Column(DateTime, nullable=True)
    fine_amount = Column(Float, default=0.0, nullable=False)

    # Relationships
    user = relationship("User", back_populates="loans")
    book = relationship("Book", back_populates="loans")

    def __repr__(self):
        return f"<Loan(id={self.id}, user_id={self.user_id}, book_id={self.book_id}, status={self.status})>"
