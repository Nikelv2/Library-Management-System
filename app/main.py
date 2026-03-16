"""
Main application entry point for LibryFlow.
FastAPI application with all routes and middleware configured.
"""
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text, inspect
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.core.database import db_singleton, Base, get_db
from app.api import auth, books, loans, admin, settings, users
from app.models.user import User, UserRole
from app.core.security import get_password_hash

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables and create default admin user on application startup."""
    if os.environ.get("PYTEST_CURRENT_TEST"):
        yield
        return

    db_singleton.create_tables()
    
    # Create default admin user if it doesn't exist
    db_gen = get_db()
    db = next(db_gen)
    try:
        _migrate_loan_schema(db)
        _migrate_user_schema(db)
        _migrate_book_schema(db)

        db.execute(text("UPDATE users SET role = lower(role::text)::userrole"))
        db.commit()

        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@example.com",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin"),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            print("Default admin user created: username='admin', password='admin'")
        elif admin_user.email == "admin@libryflow.local":
            admin_user.email = "admin@example.com"
            db.commit()
    finally:
        db.close()
    
    yield


# Create FastAPI application
app = FastAPI(
    title="LibryFlow",
    description="A production-ready RESTful Library Management System",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files and templates for basic UI
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Include routers
app.include_router(auth.router)
app.include_router(books.router)
app.include_router(loans.router)
app.include_router(admin.router)
app.include_router(settings.router)
app.include_router(users.router)


@app.get("/")
def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to LibryFlow API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/ui")
def ui(request: Request):
    """Simple UI to demo member/librarian flows."""
    return templates.TemplateResponse("index.html", {"request": request})


def _migrate_loan_schema(db) -> None:
    """Best-effort schema updates for the loans table in Postgres."""
    bind = db.get_bind()
    inspector = inspect(bind)

    if inspector.dialect.name != "postgresql":
        return

    db.execute(
        text(
            """
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loanstatus') THEN
        CREATE TYPE loanstatus AS ENUM ('reserved','active','returned','expired','overdue','cancelled');
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loanstatus') THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_enum
            WHERE enumlabel = 'cancelled'
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'loanstatus')
        ) THEN
            ALTER TYPE loanstatus ADD VALUE 'cancelled';
        END IF;
    END IF;
END $$;
"""
        )
    )
    db.commit()

    columns = {col["name"] for col in inspector.get_columns("loans")}
    if "borrow_date" in columns:
        db.execute(text("ALTER TABLE loans DROP COLUMN IF EXISTS borrow_date"))
    if "return_date" in columns:
        db.execute(text("ALTER TABLE loans DROP COLUMN IF EXISTS return_date"))
    if "is_returned" in columns:
        db.execute(text("ALTER TABLE loans DROP COLUMN IF EXISTS is_returned"))

    if "status" not in columns:
        db.execute(
            text(
                "ALTER TABLE loans ADD COLUMN status loanstatus NOT NULL DEFAULT 'reserved'"
            )
        )
    if "reservation_date" not in columns:
        db.execute(
            text(
                "ALTER TABLE loans ADD COLUMN reservation_date TIMESTAMP NOT NULL DEFAULT NOW()"
            )
        )
    if "pickup_deadline" not in columns:
        db.execute(text("ALTER TABLE loans ADD COLUMN pickup_deadline TIMESTAMP"))
    if "start_date" not in columns:
        db.execute(text("ALTER TABLE loans ADD COLUMN start_date TIMESTAMP"))
    if "due_date" not in columns:
        db.execute(text("ALTER TABLE loans ADD COLUMN due_date TIMESTAMP"))
    if "returned_at" not in columns:
        db.execute(text("ALTER TABLE loans ADD COLUMN returned_at TIMESTAMP"))
    if "canceled_at" not in columns:
        db.execute(text("ALTER TABLE loans ADD COLUMN canceled_at TIMESTAMP"))
    if "fine_amount" not in columns:
        db.execute(
            text("ALTER TABLE loans ADD COLUMN fine_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0")
        )
    db.commit()

    db.execute(
        text("UPDATE loans SET status = lower(status::text)::loanstatus")
    )
    db.commit()


def _migrate_user_schema(db) -> None:
    """Best-effort schema updates for the users table in Postgres."""
    bind = db.get_bind()
    inspector = inspect(bind)
    if inspector.dialect.name != "postgresql":
        return

    columns = {col["name"] for col in inspector.get_columns("users")}
    if "is_banned" not in columns:
        db.execute(text("ALTER TABLE users ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT FALSE"))
        db.commit()


def _migrate_book_schema(db) -> None:
    """Best-effort schema updates for the books table in Postgres."""
    bind = db.get_bind()
    inspector = inspect(bind)
    if inspector.dialect.name != "postgresql":
        return

    columns = {col["name"] for col in inspector.get_columns("books")}
    if "total_copies" not in columns:
        db.execute(text("ALTER TABLE books ADD COLUMN total_copies INTEGER NOT NULL DEFAULT 1"))
    if "available_copies" not in columns:
        db.execute(text("ALTER TABLE books ADD COLUMN available_copies INTEGER NOT NULL DEFAULT 1"))
    db.execute(text("UPDATE books SET available_copies = GREATEST(available_copies, 0)"))
    db.execute(text("UPDATE books SET total_copies = GREATEST(total_copies, available_copies)"))
    db.execute(text("UPDATE books SET is_available = (available_copies > 0)"))
    db.commit()
