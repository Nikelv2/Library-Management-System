"""
Book model representing library books.
"""
from sqlalchemy import Column, Integer, String, Boolean, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Book(Base):
    """
    Book model representing a book in the library.
    Tracks availability status for loan management.
    """
    __tablename__ = "books"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    author = Column(String, nullable=False, index=True)
    isbn = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    total_copies = Column(Integer, default=1, nullable=False)
    available_copies = Column(Integer, default=1, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    loans = relationship("Loan", back_populates="book", cascade="all, delete-orphan")
    
    def __repr__(self):
        return (
            f"<Book(id={self.id}, title={self.title}, "
            f"available_copies={self.available_copies}, total_copies={self.total_copies})>"
        )
