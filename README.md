# 📚 LibryFlow - Library Management System

LibryFlow is a production-ready RESTful Information System for library management. It is built with a modern stack featuring **Python 3.10+**, **FastAPI**, **SQLAlchemy**, and **PostgreSQL**, with a **React** frontend.

---

## ✨ Features

* **React Frontend**: Modern, responsive web interface for seamless user interaction.
* **JWT-based Authentication**: Secure session management using JSON Web Tokens.
* **Role-Based Access Control (RBAC)**: Distinct permissions for **Librarians** and **Members**.
* **Book Management**: Full CRUD operations (Librarian-only for create/update/delete).
* **Loan Management**: Automated borrow/return flows with real-time availability checks.
* **Implemented Design Patterns**:
* **Singleton Pattern**: Efficient database connection pool management.
* **Factory Method Pattern**: Scalable user creation logic (Librarian vs. Member).


* **Layered Architecture**: Clean separation of concerns (API → Services → Models).
* **Docker Support**: One-command deployment using Docker Compose.

---

## 🏗️ Project Structure

```text
libryflow/
├── app/
│   ├── api/            # REST API endpoints (auth, books, loans)
│   ├── core/           # Config, Database Singleton, and Security
│   ├── models/         # SQLAlchemy ORM models
│   ├── schemas/        # Pydantic validation schemas
│   ├── services/       # Business logic & User Factory
│   └── main.py         # Fast API entry point
├── tests/              # Unit and Integration tests
├── docker-compose.yml  # Multi-container orchestration
├── Dockerfile          # Backend container definition
├── requirements.txt    # Python dependencies
└── README.md           # Documentation

```

---

## 🚀 Installation & Setup

### Option 1: Local Development (SQLite)

1. **Clone the repository**:
```bash
git clone https://github.com/Nikelv2/Library-Management-System.git
cd Library-Management-System

```


2. **Create a virtual environment**:
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Unix/macOS:
source venv/bin/activate

```


3. **Install dependencies**:
```bash
pip install -r requirements.txt

```


4. **Run the application**:
```bash
uvicorn app.main:app --reload

```



> [!TIP]
> Access the interactive documentation at: [http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)

### Option 2: Docker Deployment (PostgreSQL + React)

Build and run the entire stack (Backend, Frontend, and Database) with one command:

```bash
docker-compose up --build

```

* **Frontend**: `http://localhost:3000`
* **API**: `http://localhost:8000`

---

## 🛣️ API Endpoints

| Category | Method | Endpoint | Access |
| --- | --- | --- | --- |
| **Auth** | `POST` | `/api/auth/register` | Public |
| **Auth** | `POST` | `/api/auth/login` | Public |
| **Books** | `GET` | `/api/books` | All Users |
| **Books** | `POST` | `/api/books` | Librarian |
| **Books** | `DELETE` | `/api/books/{id}` | Librarian |
| **Loans** | `POST` | `/api/loans/borrow` | Member |
| **Loans** | `POST` | `/api/loans/return` | Member |

---

## 🛠️ Design Patterns & Architecture

### 1. Singleton Pattern (`app/core/database.py`)

Ensures that the application maintains a **single connection pool** to the database, preventing memory leaks and connection exhaustion.

### 2. Factory Method Pattern (`app/services/user_factory.py`)

Uses `LibrarianCreator` and `MemberCreator` to decouple the user creation logic from the API routes, making the system easy to extend with new roles (e.g., "Admin" or "Guest").

### 3. Layered Architecture

1. **API Layer**: Handles HTTP requests and Pydantic validation.
2. **Service Layer**: Contains the "brain" of the app (Business Logic).
3. **Model Layer**: Manages data persistence via SQLAlchemy.

---

## 🧪 Testing

Run the comprehensive test suite using `pytest`:

```bash
pytest tests/ -v

```

The suite covers **UserFactory** logic, **LibraryService** operations, and **Auth** integration.

---

## 🔑 Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=sqlite:///./libryflow.db
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=development

```

---

## 📜 License

This project is created for educational purposes.

**Author:** Nikelv2

---
