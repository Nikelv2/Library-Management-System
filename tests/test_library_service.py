"""
Unit tests for LibraryService business logic.
"""
from datetime import datetime, timedelta
import pytest
from fastapi import HTTPException
from app.models.user import User, UserRole
from app.schemas.book import BookCreate
from app.schemas.loan import LoanCreate
from app.services.library_service import LibraryService
from app.services.settings_service import SettingsService
from app.core.security import get_password_hash


def _create_member(db_session):
    user = User(
        email="member@test.com",
        username="memberuser",
        hashed_password=get_password_hash("password123"),
        full_name="Member User",
        role=UserRole.MEMBER,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _create_librarian(db_session):
    user = User(
        email="librarian@test.com",
        username="librarianuser",
        hashed_password=get_password_hash("password123"),
        full_name="Librarian User",
        role=UserRole.LIBRARIAN,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _create_book(db_session):
    book = BookCreate(
        title="Test Book",
        author="Test Author",
        isbn="1234567890",
        description="A test book",
    )
    return LibraryService.create_book(db_session, book)


def test_reserve_pickup_return_lifecycle(db_session):
    member = _create_member(db_session)
    _create_librarian(db_session)
    created_book = _create_book(db_session)

    loan_data = LoanCreate(book_id=created_book.id)
    reservation = LibraryService.reserve_book(db_session, member.id, loan_data)

    assert reservation.status.value == "reserved"
    assert reservation.pickup_deadline is not None

    picked_up = LibraryService.confirm_pickup(db_session, reservation.id)
    assert picked_up.status.value == "active"
    assert picked_up.start_date is not None
    assert picked_up.due_date is not None

    returned = LibraryService.return_book(db_session, picked_up.id)
    assert returned.status.value == "returned"
    assert returned.returned_at is not None

    updated_book = LibraryService.get_book(db_session, created_book.id)
    assert updated_book.is_available is True


def test_overdue_fine_calculation(db_session):
    member = _create_member(db_session)
    created_book = _create_book(db_session)

    settings = SettingsService.get_settings(db_session)
    settings.daily_fine_amount = 0.75
    db_session.commit()

    loan_data = LoanCreate(book_id=created_book.id)
    reservation = LibraryService.reserve_book(db_session, member.id, loan_data)
    active = LibraryService.confirm_pickup(db_session, reservation.id)

    active.due_date = datetime.utcnow() - timedelta(days=10)
    db_session.commit()

    returned = LibraryService.return_book(db_session, active.id)
    assert returned.fine_amount == pytest.approx(7.5)


def test_expired_reservation(db_session):
    member = _create_member(db_session)
    created_book = _create_book(db_session)

    loan_data = LoanCreate(book_id=created_book.id)
    reservation = LibraryService.reserve_book(db_session, member.id, loan_data)
    reservation.pickup_deadline = datetime.utcnow() - timedelta(days=1)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        LibraryService.confirm_pickup(db_session, reservation.id)

    assert exc_info.value.status_code == 400
    assert "expired" in str(exc_info.value.detail).lower()

    updated_book = LibraryService.get_book(db_session, created_book.id)
    assert updated_book.is_available is True
