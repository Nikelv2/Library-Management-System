"""
Loans API routes for reservation and return lifecycle.
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.loan import LoanCreate, LoanResponse, LoanAssign
from app.services.library_service import LibraryService
from app.api.dependencies import get_current_user, get_current_librarian, get_current_member

router = APIRouter(prefix="/api/loans", tags=["Loans"])


@router.post("/reserve", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
def reserve_book(
    loan_data: LoanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_member)
):
    """
    Reserve a book.
    
    Args:
        loan_data: Reservation data (book_id)
        db: Database session
        current_user: Current authenticated member
        
    Returns:
        Created reservation information
        
    Raises:
        HTTPException: If book not found or not available
    """
    return LibraryService.reserve_book(db, current_user.id, loan_data)


@router.post("/assign", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
def assign_loan(
    loan_data: LoanAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian)
):
    """
    Assign a loan directly to a user (Librarian/Admin only).
    """
    return LibraryService.assign_loan(db, loan_data.user_id, loan_data.book_id)


@router.post("/{loan_id}/pickup", response_model=LoanResponse)
def confirm_pickup(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian)
):
    """
    Confirm a pickup for a reserved book (Librarian only).
    
    Args:
        loan_id: Loan ID
        db: Database session
        current_user: Current authenticated librarian
        
    Returns:
        Updated loan information after pickup
        
    Raises:
        HTTPException: If loan not found, expired, or invalid state
    """
    return LibraryService.confirm_pickup(db, loan_id)


@router.post("/{loan_id}/return", response_model=LoanResponse)
def return_book(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian)
):
    """
    Return a borrowed book (Librarian only).
    
    Args:
        loan_id: Loan ID
        db: Database session
        current_user: Current authenticated librarian
        
    Returns:
        Updated loan information
        
    Raises:
        HTTPException: If loan not found or not active
    """
    return LibraryService.return_book(db, loan_id)


@router.post("/{loan_id}/cancel", response_model=LoanResponse)
def cancel_reservation(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_member)
):
    """
    Cancel a reserved loan (Member only).
    """
    return LibraryService.cancel_reservation(db, current_user.id, loan_id)


@router.get("/my-loans", response_model=List[LoanResponse])
def get_my_loans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all loans for the current user.
    
    Args:
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        List of user's loans
    """
    return LibraryService.get_user_loans(db, current_user.id)


@router.get("", response_model=List[LoanResponse])
def get_all_loans(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian)
):
    """
    Get all loans (Librarian only).
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session
        current_user: Current authenticated librarian
        
    Returns:
        List of all loans
    """
    return LibraryService.get_all_loans(db, skip=skip, limit=limit)
