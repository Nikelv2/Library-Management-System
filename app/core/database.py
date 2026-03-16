"""
Database connection module implementing Singleton pattern.
Ensures a single database connection pool instance throughout the application.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from typing import Generator
from app.core.config import settings


class DatabaseSingleton:
    """
    Singleton class for managing database connection.
    Implements the Singleton design pattern to ensure only one database
    connection pool exists in the application.
    """
    _instance = None
    _engine = None
    _SessionLocal = None
    
    def __new__(cls):
        """Ensure only one instance of DatabaseSingleton exists."""
        if cls._instance is None:
            cls._instance = super(DatabaseSingleton, cls).__new__(cls)
            cls._initialize()
        return cls._instance
    
    @classmethod
    def _initialize(cls):
        """Initialize database engine and session factory."""
        if cls._engine is None:
            # SQLite requires check_same_thread=False
            connect_args = {}
            if settings.DATABASE_URL.startswith("sqlite"):
                connect_args = {"check_same_thread": False}
            
            cls._engine = create_engine(
                settings.DATABASE_URL,
                connect_args=connect_args,
                echo=settings.ENVIRONMENT == "development"
            )
            cls._SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=cls._engine
            )
    
    @property
    def engine(self):
        """Get the database engine."""
        return self._engine
    
    @property
    def SessionLocal(self):
        """Get the session factory."""
        return self._SessionLocal
    
    def create_tables(self):
        """Create all database tables and update enums if needed."""
        # For PostgreSQL, we need to handle enum updates
        if self._engine.url.drivername == 'postgresql':
            self._update_postgresql_enums()
        
        Base.metadata.create_all(bind=self._engine)
    
    def _update_postgresql_enums(self):
        """Update PostgreSQL enum types to include all current enum values."""
        from sqlalchemy import text
        from app.models.user import UserRole
        
        with self._engine.begin() as conn:
            # Check if userrole enum exists and if it needs updating
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'userrole'
                )
            """))
            enum_exists = result.scalar()
            
            if enum_exists:
                # Get current enum values
                result = conn.execute(text("""
                    SELECT enumlabel 
                    FROM pg_enum 
                    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')
                    ORDER BY enumsortorder
                """))
                existing_values = {row[0] for row in result}
                
                # Get all required enum values
                all_values = {role.value for role in UserRole}
                missing_values = all_values - existing_values
                
                # If there are missing values, we need to drop and recreate the enum
                # This is necessary because PostgreSQL doesn't allow easy enum modification
                if missing_values:
                    # First, change the column to use text temporarily
                    try:
                        conn.execute(text("ALTER TABLE users ALTER COLUMN role TYPE text"))
                        # Drop the old enum
                        conn.execute(text("DROP TYPE IF EXISTS userrole CASCADE"))
                        # Recreate enum with all values
                        enum_values = "', '".join(sorted(all_values))
                        conn.execute(text(f"CREATE TYPE userrole AS ENUM ('{enum_values}')"))
                        # Change column back to enum
                        conn.execute(text("ALTER TABLE users ALTER COLUMN role TYPE userrole USING role::userrole"))
                    except Exception as e:
                        # If table doesn't exist yet, that's fine - it will be created with correct enum
                        pass
                else:
                    # Try to add missing values one by one (for cases where enum exists but is missing values)
                    for value in missing_values:
                        try:
                            check_result = conn.execute(text("""
                                SELECT EXISTS (
                                    SELECT 1 FROM pg_enum 
                                    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')
                                    AND enumlabel = :value
                                )
                            """), {"value": value})
                            value_exists = check_result.scalar()
                            
                            if not value_exists:
                                conn.execute(text(f"ALTER TYPE userrole ADD VALUE '{value}'"))
                        except Exception:
                            # If adding fails, the enum might be in use - that's okay
                            pass


# Create singleton instance
db_singleton = DatabaseSingleton()

# Base class for SQLAlchemy models
Base = declarative_base()

# Dependency injection for database session
def get_db() -> Generator[Session, None, None]:
    """
    Dependency injection function for database sessions.
    Yields a database session and ensures it's closed after use.
    """
    db = db_singleton.SessionLocal()
    try:
        yield db
    finally:
        db.close()
