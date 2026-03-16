"""
Admin API routes for user management and system administration.
Admin-only access for all operations.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserResponse
from app.core.security import get_password_hash, verify_password
from app.api.dependencies import get_current_admin


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


class UserPasswordChangeRequest(BaseModel):
    new_password: str

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Get all users in the system (Admin only).
    
    Args:
        db: Database session
        current_user: Current authenticated admin
        
    Returns:
        List of all users
    """
    return db.query(User).all()


@router.post("/users/{user_id}/promote", response_model=UserResponse)
def promote_user_to_librarian(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Promote a member to librarian (Admin only).
    
    Args:
        user_id: ID of the user to promote
        db: Database session
        current_user: Current authenticated admin
        
    Returns:
        Updated user information
        
    Raises:
        HTTPException: If user not found, already a librarian/admin, or trying to demote admin
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
            detail="Cannot modify admin user"
        )
    
    if user.role == UserRole.LIBRARIAN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a librarian"
        )
    
    user.role = UserRole.LIBRARIAN
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/demote", response_model=UserResponse)
def demote_librarian_to_member(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Demote a librarian to member (Admin only).
    
    Args:
        user_id: ID of the user to demote
        db: Database session
        current_user: Current authenticated admin
        
    Returns:
        Updated user information
        
    Raises:
        HTTPException: If user not found, not a librarian, or trying to demote admin
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
            detail="Cannot modify admin user"
        )
    
    if user.role != UserRole.LIBRARIAN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a librarian"
        )
    
    user.role = UserRole.MEMBER
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password")
def change_admin_password(
    password_data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Change admin password (Admin only).
    
    Args:
        password_data: Password change request with old and new password
        db: Database session
        current_user: Current authenticated admin
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If old password is incorrect or new password is invalid
    """
    if not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}


@router.post("/users/{user_id}/password")
def change_user_password(
    user_id: int,
    password_data: UserPasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Change any user's password (Admin only).
    """
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Delete a user account (Admin only).
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
            detail="Cannot delete admin user"
        )

    db.delete(user)
    db.commit()
    return None
