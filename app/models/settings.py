"""
System settings model for global library configuration.
"""
from sqlalchemy import Column, Integer, Float
from app.core.database import Base


class SystemSettings(Base):
    """
    Singleton-like settings table.
    """
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    pickup_window_days = Column(Integer, default=2, nullable=False)
    standard_loan_days = Column(Integer, default=30, nullable=False)
    daily_fine_amount = Column(Float, default=0.1, nullable=False)

    def __repr__(self):
        return (
            f"<SystemSettings(pickup_window_days={self.pickup_window_days}, "
            f"standard_loan_days={self.standard_loan_days}, "
            f"daily_fine_amount={self.daily_fine_amount})>"
        )
