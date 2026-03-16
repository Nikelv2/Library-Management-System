"""
User Factory module implementing Factory Method design pattern.
Creates different user types (Librarian vs Member) based on role.
"""
from abc import ABC, abstractmethod
from app.models.user import User, UserRole
from app.schemas.user import UserCreate
from app.core.security import get_password_hash
from sqlalchemy.orm import Session


class UserCreator(ABC):
    """
    Abstract creator class for Factory Method pattern.
    Defines the factory method for creating user objects.
    """
    
    @abstractmethod
    def create_user(self, db: Session, user_data: UserCreate) -> User:
        """
        Factory method to create a user.
        
        Args:
            db: Database session
            user_data: User creation data
            
        Returns:
            Created User instance
        """
        pass
    
    def _create_base_user(self, db: Session, user_data: UserCreate) -> User:
        """
        Helper method to create base user with common attributes.
        
        Args:
            db: Database session
            user_data: User creation data
            
        Returns:
            User instance with base attributes set
        """
        hashed_password = get_password_hash(user_data.password)
        user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role or UserRole.MEMBER
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


class LibrarianCreator(UserCreator):
    """
    Concrete creator for Librarian users.
    Implements Factory Method pattern for creating Librarian instances.
    """
    
    def create_user(self, db: Session, user_data: UserCreate) -> User:
        """
        Create a Librarian user.
        
        Args:
            db: Database session
            user_data: User creation data
            
        Returns:
            Created Librarian User instance
        """
        user_data.role = UserRole.LIBRARIAN
        return self._create_base_user(db, user_data)


class MemberCreator(UserCreator):
    """
    Concrete creator for Member users.
    Implements Factory Method pattern for creating Member instances.
    """
    
    def create_user(self, db: Session, user_data: UserCreate) -> User:
        """
        Create a Member user.
        
        Args:
            db: Database session
            user_data: User creation data
            
        Returns:
            Created Member User instance
        """
        user_data.role = UserRole.MEMBER
        return self._create_base_user(db, user_data)


class UserFactory:
    """
    Factory class that provides a simple interface to create users
    based on their role using the Factory Method pattern.
    """
    
    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """
        Factory method to create a user based on role.
        
        Args:
            db: Database session
            user_data: User creation data
            
        Returns:
            Created User instance with appropriate role
        """
        role = user_data.role or UserRole.MEMBER
        
        if role == UserRole.LIBRARIAN:
            creator = LibrarianCreator()
        else:
            creator = MemberCreator()
        
        return creator.create_user(db, user_data)
