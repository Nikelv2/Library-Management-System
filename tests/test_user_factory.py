"""
Unit tests for UserFactory implementing Factory Method pattern.
"""
import pytest
from app.models.user import UserRole
from app.schemas.user import UserCreate
from app.services.user_factory import UserFactory, LibrarianCreator, MemberCreator


def test_librarian_creator(db_session):
    """Test that LibrarianCreator creates a user with LIBRARIAN role."""
    user_data = UserCreate(
        email="librarian@test.com",
        username="librarian",
        full_name="Test Librarian",
        password="password123",
        role=UserRole.LIBRARIAN
    )
    
    creator = LibrarianCreator()
    user = creator.create_user(db_session, user_data)
    
    assert user.role == UserRole.LIBRARIAN
    assert user.email == "librarian@test.com"
    assert user.username == "librarian"
    assert user.hashed_password != "password123"  # Should be hashed


def test_member_creator(db_session):
    """Test that MemberCreator creates a user with MEMBER role."""
    user_data = UserCreate(
        email="member@test.com",
        username="member",
        full_name="Test Member",
        password="password123"
    )
    
    creator = MemberCreator()
    user = creator.create_user(db_session, user_data)
    
    assert user.role == UserRole.MEMBER
    assert user.email == "member@test.com"
    assert user.username == "member"


def test_user_factory_pattern(db_session):
    """Test that UserFactory correctly uses Factory Method pattern."""
    # Test creating librarian
    librarian_data = UserCreate(
        email="lib@test.com",
        username="lib",
        full_name="Librarian",
        password="password123",
        role=UserRole.LIBRARIAN
    )
    librarian = UserFactory.create_user(db_session, librarian_data)
    assert librarian.role == UserRole.LIBRARIAN
    
    # Test creating member
    member_data = UserCreate(
        email="mem@test.com",
        username="mem",
        full_name="Member",
        password="password123"
    )
    member = UserFactory.create_user(db_session, member_data)
    assert member.role == UserRole.MEMBER
