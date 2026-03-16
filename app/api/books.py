"""
Books API routes for CRUD operations.
Librarian-only access for POST, PUT, DELETE operations.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.book import BookCreate, BookUpdate, BookResponse
from app.services.library_service import LibraryService
from app.api.dependencies import get_current_user, get_current_librarian

router = APIRouter(prefix="/api/books", tags=["Books"])


@router.post("", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
def create_book(
    book_data: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian)
):
    """
    Create a new book (Librarian only).
    
    Args:
        book_data: Book creation data
        db: Database session
        current_user: Current authenticated librarian
        
    Returns:
        Created book information
    """
    return LibraryService.create_book(db, book_data)


@router.get("", response_model=List[BookResponse])
def get_books(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all books (paginated) with optional search by title or author.
    Available to all authenticated users (members, librarians, and admins).
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        search: Optional search term to filter by title or author
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        List of books
    """
    return LibraryService.get_books(db, skip=skip, limit=limit, search=search)


@router.get("/{book_id}", response_model=BookResponse)
def get_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a book by ID.
    
    Args:
        book_id: Book ID
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Book information
    """
    book = LibraryService.get_book(db, book_id)
    if not book:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    return book


@router.put("/{book_id}", response_model=BookResponse)
def update_book(
    book_id: int,
    book_data: BookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian)
):
    """
    Update a book (Librarian only).
    
    Args:
        book_id: Book ID
        book_data: Book update data
        db: Database session
        current_user: Current authenticated librarian
        
    Returns:
        Updated book information
    """
    return LibraryService.update_book(db, book_id, book_data)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_librarian)
):
    """
    Delete a book (Librarian only).
    
    Args:
        book_id: Book ID
        db: Database session
        current_user: Current authenticated librarian
    """
    LibraryService.delete_book(db, book_id)
    return None
