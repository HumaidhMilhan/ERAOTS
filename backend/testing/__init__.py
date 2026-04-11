"""
ERAOTS Testing Suite
=====================

This package contains all tests for the ERAOTS backend system.

Structure:
-----------
testing/
├── __init__.py              # This file
├── conftest.py              # Pytest fixtures and configuration
├── test_database_seed.py    # Database seeding utility
├── unit/                    # Unit tests (isolated component testing)
│   ├── test_security.py     # Security functions (JWT, hashing)
│   ├── test_models.py       # Database model validation
│   └── test_schemas.py      # Pydantic schema validation
└── integration/             # Integration tests (API endpoint testing)
    ├── test_api_endpoints.py    # Full API workflow tests
    └── test_attendance_api.py   # Attendance processing tests

Running Tests:
--------------
    # Run all tests
    pytest testing/ -v
    
    # Run only unit tests
    pytest testing/unit/ -v
    
    # Run only integration tests
    pytest testing/integration/ -v
    
    # Run with coverage report
    pytest testing/ --cov=app --cov-report=html

Prerequisites:
--------------
    pip install pytest pytest-asyncio pytest-cov httpx

Note:
-----
    Integration tests require the backend server to be running on localhost:8000.
    Run `python testing/test_database_seed.py` first to seed demo data.
"""

__version__ = "1.0.0"
