# ERAOTS Testing Suite

Comprehensive testing framework for the Enterprise Real-Time Attendance & Occupancy Tracking System.

## 📁 Directory Structure

```
testing/
├── __init__.py                 # Package documentation
├── conftest.py                 # Pytest fixtures and configuration
├── README.md                   # This file
├── seed_database.py            # Database seeding utility (standalone)
│
├── unit/                       # Unit Tests (isolated component testing)
│   ├── __init__.py
│   ├── test_security.py        # Security functions (JWT, hashing, API keys)
│   ├── test_models.py          # Database model validation
│   └── test_schemas.py         # Pydantic schema validation
│
└── integration/                # Integration Tests (API endpoint testing)
    ├── __init__.py
    ├── test_api_endpoints.py   # Full API workflow tests
    └── test_attendance_api.py  # Attendance processing tests
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov httpx
```

### Running Tests

```bash
# Navigate to backend directory
cd backend

# Run all tests
pytest testing/ -v

# Run only unit tests (no server required)
pytest testing/unit/ -v

# Run only integration tests (requires running server)
pytest testing/integration/ -v

# Run with coverage report
pytest testing/ --cov=app --cov-report=html

# Run specific test file
pytest testing/unit/test_security.py -v

# Run tests matching a pattern
pytest testing/ -k "password" -v
```

## 🧪 Test Categories

### Unit Tests (`testing/unit/`)
- **No external dependencies** — runs without database or server
- **Fast execution** — complete in seconds
- **Isolated testing** — each test is independent

| File | Tests |
|------|-------|
| `test_security.py` | Password hashing, JWT tokens, API keys, fingerprint hashing |
| `test_models.py` | Model instantiation, defaults, computed properties |
| `test_schemas.py` | Request/response validation, field constraints |

### Integration Tests (`testing/integration/`)
- **Requires running server** on localhost:8000
- **Tests full API workflows** — authentication, CRUD, business logic
- **Uses real HTTP requests** — validates actual API behavior

| File | Tests |
|------|-------|
| `test_api_endpoints.py` | Complete API workflow: auth → CRUD → business operations |
| `test_attendance_api.py` | Attendance processing and record retrieval |

## 📋 Pre-Test Setup

Before running integration tests:

```bash
# 1. Seed the database
python testing/seed_database.py

# 2. Start the server (in separate terminal)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Run integration tests
pytest testing/integration/ -v
```

## 🎯 Test Markers

Tests are marked for selective execution:

```bash
# Run only unit tests
pytest -m unit testing/

# Run only integration tests
pytest -m integration testing/

# Skip slow tests
pytest -m "not slow" testing/
```

## 📊 Coverage Report

Generate HTML coverage report:

```bash
pytest testing/ --cov=app --cov-report=html
# Open htmlcov/index.html in browser
```

## 🔧 Fixtures (conftest.py)

| Fixture | Scope | Description |
|---------|-------|-------------|
| `db_session` | function | Async database session (auto-rollback) |
| `api_base_url` | session | Base URL for API tests |
| `auth_token` | session | Admin JWT token |
| `auth_headers` | session | Authorization headers |
| `employee_token` | session | Employee JWT token |

## ✅ Writing New Tests

### Unit Test Example

```python
import pytest
from app.core.security import hash_password

class TestPasswordHashing:
    @pytest.mark.unit
    def test_hash_password_produces_valid_hash(self):
        password = "testPassword123"
        hashed = hash_password(password)
        
        assert hashed is not None
        assert hashed.startswith("$2b$")  # bcrypt prefix
```

### Integration Test Example

```python
import pytest
import httpx

class TestEmployeeAPI:
    @pytest.mark.integration
    async def test_create_employee(self, api_base_url, auth_headers):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base_url}/api/employees",
                json={"first_name": "Test", "last_name": "User", ...},
                headers=auth_headers
            )
            assert response.status_code == 200
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Import errors | Run tests from `backend/` directory |
| Auth failures | Run `test_database_seed.py` first |
| Connection refused | Ensure server is running on port 8000 |
| Fixture not found | Check `conftest.py` is in `testing/` |

## 📝 Notes

- Integration tests use real HTTP calls, not test client
- Database is SQLite for tests (configurable in conftest.py)
- All tests should be idempotent (can run multiple times)
- Use `pytest -x` to stop on first failure
