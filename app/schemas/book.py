"""
Pydantic schemas for Book-related requests and responses.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class BookBase(BaseModel):
    """Base schema for book data."""
    title: str = Field(..., min_length=1, max_length=200)
    author: str = Field(..., min_length=1, max_length=100)
    isbn: str = Field(..., min_length=10, max_length=20)
    description: Optional[str] = None
    total_copies: int = Field(1, ge=1, le=1000)
    available_copies: int = Field(1, ge=0, le=1000)


class BookCreate(BookBase):
    """Schema for creating a new book."""
    pass


class BookUpdate(BaseModel):
    """Schema for updating a book."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    author: Optional[str] = Field(None, min_length=1, max_length=100)
    isbn: Optional[str] = Field(None, min_length=10, max_length=20)
    description: Optional[str] = None
    total_copies: Optional[int] = Field(None, ge=1, le=1000)
    available_copies: Optional[int] = Field(None, ge=0, le=1000)


class BookResponse(BookBase):
    """Schema for book response."""
    id: int
    is_available: bool
    model_config = ConfigDict(from_attributes=True)
