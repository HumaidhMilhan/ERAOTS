"""
Integration Tests for Attendance Processing API
=================================================

Tests for the attendance engine:
- Trigger attendance processing for a date
- Retrieve attendance records
- Verify record data structure

Prerequisites:
    - Backend server running on localhost:8000
    - Database seeded with test data
    - Some scan events exist for the target date

Run:
    pytest testing/integration/test_attendance_api.py -v
    
    # Or run standalone:
    python testing/integration/test_attendance_api.py
"""

import pytest
import httpx
import os
from datetime import date, timedelta

# Use environment variable for API URL
API_BASE = os.environ.get("TEST_API_URL", "http://localhost:8000")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for all tests."""
    import requests
    try:
        login_data = {'username': 'admin@eraots.com', 'password': 'admin123'}
        response = requests.post(f'{API_BASE}/api/auth/login', data=login_data, timeout=5)
        
        if response.status_code != 200:
            pytest.skip(f"Cannot authenticate: {response.text}. Is server running?")
        
        return response.json()['access_token']
    except requests.exceptions.ConnectionError:
        pytest.skip("Server not running - skipping integration tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Authorization headers for authenticated requests."""
    return {'Authorization': f'Bearer {auth_token}'}


class TestAttendanceProcessing:
    """
    Integration tests for the attendance processing API.
    
    These tests verify:
    1. Attendance processing can be triggered
    2. Attendance records can be retrieved
    3. Record structure matches expected schema
    """

    @pytest.mark.integration
    def test_process_attendance_returns_success(self, auth_headers):
        """Attendance processing should return success with record count."""
        import requests
        target_date = (date.today() - timedelta(days=1)).isoformat()
        
        response = requests.post(
            f'{API_BASE}/api/attendance/process',
            params={'target_date': target_date},
            headers=auth_headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert 'message' in data
        assert 'processed_records' in data

    @pytest.mark.integration
    def test_fetch_attendance_records(self, auth_headers):
        """Should retrieve attendance records with expected structure."""
        import requests
        start_date = (date.today() - timedelta(days=7)).isoformat()
        
        response = requests.get(
            f'{API_BASE}/api/attendance/',
            params={'start_date': start_date},
            headers=auth_headers,
            timeout=10
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        records = response.json()
        assert isinstance(records, list)
        
        # If we have records, verify structure
        if len(records) > 0:
            record = records[0]
            expected_fields = ['attendance_id', 'employee_id', 'date', 'check_in', 'is_late']
            for field in expected_fields:
                assert field in record, f"Missing field: {field}"

    @pytest.mark.integration
    def test_fetch_attendance_with_date_range(self, auth_headers):
        """Should support date range filtering."""
        import requests
        start_date = (date.today() - timedelta(days=30)).isoformat()
        end_date = date.today().isoformat()
        
        response = requests.get(
            f'{API_BASE}/api/attendance/',
            params={'start_date': start_date, 'end_date': end_date},
            headers=auth_headers,
            timeout=10
        )
        
        assert response.status_code == 200
        records = response.json()
        assert isinstance(records, list)

    @pytest.mark.integration
    def test_invalid_date_format_returns_error(self, auth_headers):
        """Invalid date format should return 400 or 422 validation error."""
        import requests
        
        response = requests.post(
            f'{API_BASE}/api/attendance/process',
            params={'target_date': 'not-a-date'},
            headers=auth_headers,
            timeout=10
        )
        
        # API returns 400 for invalid date format
        assert response.status_code in [400, 422], f"Should return validation error, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

