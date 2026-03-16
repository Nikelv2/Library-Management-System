"""
Service for system settings.
"""
from sqlalchemy.orm import Session
from app.models.settings import SystemSettings
from app.models.loan import Loan, LoanStatus
from datetime import datetime


class SettingsService:
    """
    Service class for singleton-like settings access.
    """

    @staticmethod
    def get_settings(db: Session) -> SystemSettings:
        settings = db.query(SystemSettings).first()
        if settings:
            updated = False
            if settings.pickup_window_days is None:
                settings.pickup_window_days = 2
                updated = True
            if settings.standard_loan_days is None:
                settings.standard_loan_days = 30
                updated = True
            if settings.daily_fine_amount in (None, 0.0, 0.5):
                settings.daily_fine_amount = 0.1
                updated = True
            if updated:
                db.commit()
                db.refresh(settings)
            return settings

        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
        return settings

    @staticmethod
    def update_settings(db: Session, updates: dict) -> SystemSettings:
        settings = SettingsService.get_settings(db)
        for key, value in updates.items():
            setattr(settings, key, value)
        db.commit()
        db.refresh(settings)
        SettingsService._recalculate_overdue_fines(db, settings)
        return settings

    @staticmethod
    def _recalculate_overdue_fines(db: Session, settings: SystemSettings) -> None:
        now = datetime.utcnow()
        overdue_loans = (
            db.query(Loan)
            .filter(
                Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.OVERDUE]),
                Loan.due_date.isnot(None),
                Loan.due_date < now,
            )
            .all()
        )
        for loan in overdue_loans:
            days_late = (now.date() - loan.due_date.date()).days
            if days_late == 0:
                days_late = 1
            if days_late > 0:
                loan.fine_amount = days_late * settings.daily_fine_amount
                loan.status = LoanStatus.OVERDUE
        db.commit()
