"""
Pytest Configuration and Fixtures for ERAOTS Testing Suite.

This module provides shared fixtures and configuration for all tests.
Fixtures include database sessions, test clients, and authentication helpers.

Usage:
------
    Fixtures are automatically available in all test files within this directory.
    Import them as function parameters in your test functions.

Example:
--------
    async def test_something(db_session, auth_headers):
        # db_session is an async database session
        # auth_headers contains Bearer token for API calls
        pass
"""

import pytest
import asyncio
import os
import sys
from typing import AsyncGenerator, Dict

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Configure test environment
os.environ.setdefault("DEBUG", "false")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_eraots.db")


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def db_engine():
    """Create a test database engine."""
    from app.core.database import engine, create_tables
    import app.models  # noqa: F401 - Import all models
    
    await create_tables()
    yield engine
    
    # Cleanup: drop all tables after tests
    # await engine.dispose()


@pytest.fixture
async def db_session(db_engine) -> AsyncGenerator:
    """Provide a transactional database session for each test."""
    from app.core.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture
def api_base_url() -> str:
    """Return the base URL for API testing."""
    return os.environ.get("TEST_API_URL", "http://localhost:8000")


@pytest.fixture
async def auth_token(api_base_url: str) -> str:
    """
    Obtain an authentication token for API tests.
    
    Returns:
        JWT access token for the admin user.
    
    Raises:
        AssertionError: If login fails (server may not be running).
    """
    import httpx
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{api_base_url}/api/auth/login",
            data={"username": "admin@eraots.com", "password": "admin123"}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Cannot authenticate: {response.text}. Is the server running?")
        
        return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token: str) -> Dict[str, str]:
    """
    Provide authentication headers for API requests.
    
    Returns:
        Dictionary with Authorization header containing Bearer token.
    """
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
async def employee_token(api_base_url: str) -> str:
    """
    Obtain an authentication token for employee user tests.
    
    Returns:
        JWT access token for the employee user.
    """
    import httpx
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{api_base_url}/api/auth/login",
            data={"username": "employee@eraots.com", "password": "employee123"}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Cannot authenticate employee: {response.text}")
        
        return response.json()["access_token"]


@pytest.fixture
def employee_headers(employee_token: str) -> Dict[str, str]:
    """
    Provide employee authentication headers for API requests.
    
    Returns:
        Dictionary with Authorization header for employee user.
    """
    return {"Authorization": f"Bearer {employee_token}"}


# Markers for test categorization
def pytest_configure(config):
    """Configure custom pytest markers."""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test (isolated, no external dependencies)"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test (requires running server)"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow (may take more than 1 second)"
    )
