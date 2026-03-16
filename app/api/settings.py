"""
Settings API routes for global configuration.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.services.settings_service import SettingsService
from app.api.dependencies import get_current_librarian
from app.models.user import User

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian),
):
    """
    Get current system settings (Librarian only).
    """
    return SettingsService.get_settings(db)


@router.put("", response_model=SettingsResponse)
def update_settings(
    settings_update: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian),
):
    """
    Update system settings (Librarian only).
    """
    return SettingsService.update_settings(db, settings_update.model_dump())
