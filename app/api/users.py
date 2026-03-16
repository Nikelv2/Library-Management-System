"""
User management routes for librarian actions.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserResponse
from app.schemas.loan import LoanResponse
from app.api.dependencies import get_current_librarian
from app.services.library_service import LibraryService

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian),
):
    """
    Get all users (Librarian only).
    """
    return db.query(User).all()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian),
):
    """
    Get a specific user (Librarian only).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.get("/{user_id}/loans", response_model=List[LoanResponse])
def get_user_loans(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian),
):
    """
    Get completed loans for a specific user (Librarian only).
    """
    return LibraryService.get_user_loans_for_management(db, user_id)


@router.post("/{user_id}/ban", response_model=UserResponse)
def ban_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian),
):
    """
    Ban a user from reserving books (Librarian only).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot ban admin user"
        )

    user.is_banned = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/unban", response_model=UserResponse)
def unban_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian),
):
    """
    Unban a user from reserving books (Librarian only).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.is_banned = False
    db.commit()
    db.refresh(user)
    return user
