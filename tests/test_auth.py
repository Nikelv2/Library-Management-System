"""
Unit tests for authentication endpoints.
"""
import pytest
from app.models.user import UserRole
from app.core.security import get_password_hash


def test_register_user(client, db_session):
    """Test user registration endpoint."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@test.com",
            "username": "newuser",
            "full_name": "New User",
            "password": "password123",
            "role": "member"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["username"] == "newuser"
    assert data["role"] == "member"
    assert "password" not in data  # Password should not be in response


def test_login_success(client, db_session):
    """Test successful login returns JWT token."""
    from app.models.user import User
    
    # Create a user first
    user = User(
        email="login@test.com",
        username="loginuser",
        hashed_password=get_password_hash("password123"),
        full_name="Login User",
        role=UserRole.MEMBER
    )
    db_session.add(user)
    db_session.commit()
    
    # Login
    response = client.post(
        "/api/auth/login",
        data={
            "username": "loginuser",
            "password": "password123"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials(client, db_session):
    """Test login with invalid credentials returns 401."""
    response = client.post(
        "/api/auth/login",
        data={
            "username": "nonexistent",
            "password": "wrongpassword"
        }
    )
    
    assert response.status_code == 401
