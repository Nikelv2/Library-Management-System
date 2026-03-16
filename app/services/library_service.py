"""
Library Service module containing business logic for library operations.
"""
from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from app.models.book import Book
from app.models.loan import Loan, LoanStatus
from app.models.user import User, UserRole
from app.schemas.book import BookCreate, BookUpdate
from app.schemas.loan import LoanCreate
from app.services.settings_service import SettingsService


class LibraryService:
    """
    Service class containing business logic for library management.
    Handles books and loans operations.
    """
    
    @staticmethod
    def create_book(db: Session, book_data: BookCreate) -> Book:
        """
        Create a new book in the library.
        
        Args:
            db: Database session
            book_data: Book creation data
            
        Returns:
            Created Book instance
            
        Raises:
            HTTPException: If ISBN already exists
        """
        try:
            payload = book_data.model_dump()
            if payload.get("available_copies") is None:
                payload["available_copies"] = payload.get("total_copies", 1)
            payload["available_copies"] = min(payload["available_copies"], payload.get("total_copies", 1))
            book = Book(**payload)
            db.add(book)
            db.commit()
            db.refresh(book)
            return book
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Book with this ISBN already exists"
            )
    
    @staticmethod
    def get_book(db: Session, book_id: int) -> Optional[Book]:
        """
        Get a book by ID.
        
        Args:
            db: Database session
            book_id: Book ID
            
        Returns:
            Book instance or None if not found
        """
        return db.query(Book).filter(Book.id == book_id).first()
    
    @staticmethod
    def get_books(
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[Book]:
        """
        Get all books with pagination and optional search.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Optional search term to filter by title or author
            
        Returns:
            List of Book instances
        """
        query = db.query(Book)
        
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(
                (Book.title.ilike(search_term)) | (Book.author.ilike(search_term))
            )
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def update_book(db: Session, book_id: int, book_data: BookUpdate) -> Book:
        """
        Update a book.
        
        Args:
            db: Database session
            book_id: Book ID
            book_data: Book update data
            
        Returns:
            Updated Book instance
            
        Raises:
            HTTPException: If book not found
        """
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )
        
        update_data = book_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(book, field, value)

        if "total_copies" in update_data or "available_copies" in update_data:
            if book.available_copies > book.total_copies:
                book.available_copies = book.total_copies
        
        db.commit()
        db.refresh(book)
        return book
    
    @staticmethod
    def delete_book(db: Session, book_id: int) -> None:
        """
        Delete a book.
        
        Args:
            db: Database session
            book_id: Book ID
            
        Raises:
            HTTPException: If book not found
        """
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )
        
        db.delete(book)
        db.commit()
    
    @staticmethod
    def reserve_book(db: Session, user_id: int, loan_data: LoanCreate) -> Loan:
        """
        Reserve a book.
        Business logic: Checks availability and creates a RESERVED loan.
        
        Args:
            db: Database session
            user_id: User ID reserving the book
            loan_data: Loan creation data
            
        Returns:
            Created Loan instance
            
        Raises:
            HTTPException: If book not found or not available
        """
        book = db.query(Book).filter(Book.id == loan_data.book_id).first()
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )
        
        if book.available_copies <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Book is not available for reservation"
            )

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if user.is_banned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are banned from reserving books"
            )

        now = datetime.utcnow()
        recent_cancel = db.query(Loan).filter(
            Loan.user_id == user_id,
            Loan.book_id == loan_data.book_id,
            Loan.status == LoanStatus.CANCELLED,
            Loan.canceled_at.isnot(None),
            Loan.canceled_at > now - timedelta(days=1),
        ).first()
        if recent_cancel:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must wait 24 hours before reserving this book again"
            )

        settings = SettingsService.get_settings(db)
        pickup_deadline = now + timedelta(days=settings.pickup_window_days)

        # Create reservation
        loan = Loan(
            user_id=user_id,
            book_id=loan_data.book_id,
            status=LoanStatus.RESERVED,
            reservation_date=now,
            pickup_deadline=pickup_deadline,
        )
        
        # Update book availability
        book.available_copies -= 1
        book.is_available = book.available_copies > 0
        
        db.add(loan)
        db.commit()
        db.refresh(loan)
        return loan
    
    @staticmethod
    def confirm_pickup(db: Session, loan_id: int) -> Loan:
        """
        Confirm a pickup for a reserved loan.
        Business logic: Ensures pickup deadline not exceeded.
        """
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Loan not found"
            )

        if loan.status != LoanStatus.RESERVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only reserved loans can be picked up"
            )

        now = datetime.utcnow()
        if loan.pickup_deadline and now > loan.pickup_deadline:
            loan.status = LoanStatus.EXPIRED
            book = db.query(Book).filter(Book.id == loan.book_id).first()
            if book:
                book.available_copies += 1
                book.is_available = book.available_copies > 0
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reservation has expired"
            )

        settings = SettingsService.get_settings(db)
        loan.status = LoanStatus.ACTIVE
        loan.start_date = now
        loan.due_date = now + timedelta(days=settings.standard_loan_days)

        db.commit()
        db.refresh(loan)
        return loan

    @staticmethod
    def assign_loan(db: Session, user_id: int, book_id: int) -> Loan:
        """
        Assign a loan directly to a user (librarian/admin action).
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        if user.role != UserRole.MEMBER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Loans can only be assigned to members"
            )
        if user.is_banned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is banned from reserving books"
            )

        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )
        if book.available_copies <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Book is not available for loan"
            )

        settings = SettingsService.get_settings(db)
        now = datetime.utcnow()
        loan = Loan(
            user_id=user_id,
            book_id=book_id,
            status=LoanStatus.ACTIVE,
            reservation_date=now,
            start_date=now,
            due_date=now + timedelta(days=settings.standard_loan_days),
        )

        book.available_copies -= 1
        book.is_available = book.available_copies > 0

        db.add(loan)
        db.commit()
        db.refresh(loan)
        return loan

    @staticmethod
    def return_book(db: Session, loan_id: int) -> Loan:
        """
        Return a borrowed book (librarian action).
        Business logic: Sets return status and calculates fine if overdue.
        """
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Loan not found"
            )

        if loan.status not in [LoanStatus.ACTIVE, LoanStatus.OVERDUE]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only active loans can be returned"
            )

        now = datetime.utcnow()
        fine_amount = 0.0
        if loan.due_date and now > loan.due_date:
            settings = SettingsService.get_settings(db)
            days_late = (now.date() - loan.due_date.date()).days
            if days_late == 0:
                days_late = 1
            if days_late > 0:
                fine_amount = days_late * settings.daily_fine_amount
                loan.fine_amount = fine_amount

        loan.status = LoanStatus.RETURNED
        loan.returned_at = now

        book = db.query(Book).filter(Book.id == loan.book_id).first()
        if book:
            book.available_copies += 1
            book.is_available = book.available_copies > 0

        db.commit()
        db.refresh(loan)
        return loan

    @staticmethod
    def cancel_reservation(db: Session, user_id: int, loan_id: int) -> Loan:
        """
        Cancel a reserved loan (member action).
        """
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Loan not found"
            )

        if loan.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own reservations"
            )

        if loan.status != LoanStatus.RESERVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only reserved loans can be cancelled"
            )

        loan.status = LoanStatus.CANCELLED
        loan.canceled_at = datetime.utcnow()

        book = db.query(Book).filter(Book.id == loan.book_id).first()
        if book:
            book.available_copies += 1
            book.is_available = book.available_copies > 0

        db.commit()
        db.refresh(loan)
        return loan
    
    @staticmethod
    def get_user_loans(db: Session, user_id: int) -> List[Loan]:
        """
        Get all loans for a user.
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            List of Loan instances
        """
        loans = (
            db.query(Loan)
            .options(selectinload(Loan.user))
            .filter(Loan.user_id == user_id)
            .all()
        )
        LibraryService._mark_overdue(db, loans)
        db.commit()
        return loans
    
    @staticmethod
    def get_all_loans(db: Session, skip: int = 0, limit: int = 100) -> List[Loan]:
        """
        Get all loans (for librarians).
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of Loan instances
        """
        loans = (
            db.query(Loan)
            .options(selectinload(Loan.user))
            .offset(skip)
            .limit(limit)
            .all()
        )
        LibraryService._mark_overdue(db, loans)
        db.commit()
        return loans

    @staticmethod
    def get_user_loans_for_management(db: Session, user_id: int) -> List[Loan]:
        """
        Get completed loans for a specific user (staff view).
        """
        loans = (
            db.query(Loan)
            .options(selectinload(Loan.user))
            .filter(Loan.user_id == user_id, Loan.status == LoanStatus.RETURNED)
            .all()
        )
        return loans

    @staticmethod
    def _mark_overdue(db: Session, loans: List[Loan]) -> None:
        """Mark active loans as overdue when past due date."""
        now = datetime.utcnow()
        settings = None
        for loan in loans:
            if loan.status in [LoanStatus.ACTIVE, LoanStatus.OVERDUE] and loan.due_date and now > loan.due_date:
                loan.status = LoanStatus.OVERDUE
                if settings is None:
                    settings = SettingsService.get_settings(db)
                days_late = (now.date() - loan.due_date.date()).days
                if days_late == 0:
                    days_late = 1
                if days_late > 0:
                    loan.fine_amount = days_late * settings.daily_fine_amount
