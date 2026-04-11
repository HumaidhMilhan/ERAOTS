"""
Unit Tests for Security Module
===============================

Tests for app.core.security functions:
- Password hashing and verification (bcrypt)
- JWT token creation and decoding
- Fingerprint hashing
- API key generation and verification

These tests run in isolation without database or server dependencies.

Run:
    pytest testing/unit/test_security.py -v
"""

import pytest
import sys
import os

# Add parent path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Set required environment variables before importing app modules
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-min-32-chars")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-for-testing")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    hash_fingerprint,
    generate_api_key,
    hash_api_key,
    verify_api_key,
)


class TestPasswordHashing:
    """
    Test suite for password hashing functions.
    
    Verifies bcrypt implementation with cost factor 12 as per NFR6.6.
    """

    @pytest.mark.unit
    def test_hash_password_produces_valid_hash(self):
        """Hash should be a non-empty bcrypt string."""
        password = "securePassword123!"
        hashed = hash_password(password)
        
        assert hashed is not None
        assert isinstance(hashed, str)
        assert len(hashed) > 50  # bcrypt hashes are ~60 chars
        assert hashed.startswith("$2b$")  # bcrypt identifier

    @pytest.mark.unit
    def test_hash_password_produces_unique_hashes(self):
        """Same password should produce different hashes (salt)."""
        password = "testPassword"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        assert hash1 != hash2  # Different salts

    @pytest.mark.unit
    def test_verify_password_correct(self):
        """Correct password should verify successfully."""
        password = "mySecretPass"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True

    @pytest.mark.unit
    def test_verify_password_incorrect(self):
        """Incorrect password should fail verification."""
        password = "correctPassword"
        wrong_password = "wrongPassword"
        hashed = hash_password(password)
        
        assert verify_password(wrong_password, hashed) is False

    @pytest.mark.unit
    def test_verify_password_case_sensitive(self):
        """Password verification should be case-sensitive."""
        password = "CaseSensitive"
        hashed = hash_password(password)
        
        assert verify_password("casesensitive", hashed) is False
        assert verify_password("CASESENSITIVE", hashed) is False

    @pytest.mark.unit
    def test_hash_empty_password(self):
        """Empty password should still produce a valid hash."""
        hashed = hash_password("")
        assert hashed is not None
        assert verify_password("", hashed) is True


class TestJWTTokens:
    """
    Test suite for JWT token creation and decoding.
    
    Verifies HS256 algorithm and proper payload handling.
    """

    @pytest.mark.unit
    def test_create_access_token_returns_string(self):
        """Token should be a non-empty string."""
        data = {"sub": "user123", "role": "ADMIN"}
        token = create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 50

    @pytest.mark.unit
    def test_create_access_token_is_jwt_format(self):
        """Token should have three parts separated by dots."""
        token = create_access_token({"sub": "test"})
        parts = token.split(".")
        
        assert len(parts) == 3  # header.payload.signature

    @pytest.mark.unit
    def test_decode_access_token_returns_payload(self):
        """Decoded token should contain original data."""
        original_data = {"sub": "user456", "role": "EMPLOYEE", "employee_id": "emp123"}
        token = create_access_token(original_data)
        decoded = decode_access_token(token)
        
        assert decoded is not None
        assert decoded["sub"] == "user456"
        assert decoded["role"] == "EMPLOYEE"
        assert decoded["employee_id"] == "emp123"

    @pytest.mark.unit
    def test_decode_access_token_includes_timestamps(self):
        """Decoded token should have exp and iat claims."""
        token = create_access_token({"sub": "test"})
        decoded = decode_access_token(token)
        
        assert "exp" in decoded  # Expiration time
        assert "iat" in decoded  # Issued at time
        assert decoded["exp"] > decoded["iat"]

    @pytest.mark.unit
    def test_decode_invalid_token_returns_none(self):
        """Invalid token should return None, not raise exception."""
        invalid_token = "not.a.valid.token"
        result = decode_access_token(invalid_token)
        
        assert result is None

    @pytest.mark.unit
    def test_decode_tampered_token_returns_none(self):
        """Tampered token should fail verification."""
        token = create_access_token({"sub": "test"})
        tampered = token[:-5] + "XXXXX"  # Modify signature
        
        result = decode_access_token(tampered)
        assert result is None


class TestFingerprintHashing:
    """
    Test suite for fingerprint ID hashing.
    
    Verifies SHA-256 hashing with salt as per NFR4.1.
    """

    @pytest.mark.unit
    def test_hash_fingerprint_produces_hex_string(self):
        """Fingerprint hash should be a 64-char hex string (SHA-256)."""
        fp_id = "FP-001-EMPLOYEE"
        hashed = hash_fingerprint(fp_id)
        
        assert hashed is not None
        assert isinstance(hashed, str)
        assert len(hashed) == 64  # SHA-256 = 256 bits = 64 hex chars
        assert all(c in "0123456789abcdef" for c in hashed)

    @pytest.mark.unit
    def test_hash_fingerprint_is_deterministic(self):
        """Same fingerprint should always produce same hash."""
        fp_id = "FP-CONSISTENT-123"
        hash1 = hash_fingerprint(fp_id)
        hash2 = hash_fingerprint(fp_id)
        
        assert hash1 == hash2

    @pytest.mark.unit
    def test_hash_fingerprint_different_ids_different_hashes(self):
        """Different fingerprints should produce different hashes."""
        hash1 = hash_fingerprint("FP-001")
        hash2 = hash_fingerprint("FP-002")
        
        assert hash1 != hash2


class TestAPIKeys:
    """
    Test suite for API key generation and verification.
    
    Used for scanner hardware authentication (NFR6.7).
    """

    @pytest.mark.unit
    def test_generate_api_key_returns_string(self):
        """Generated API key should be a URL-safe string."""
        key = generate_api_key()
        
        assert key is not None
        assert isinstance(key, str)
        assert len(key) >= 32  # Sufficient entropy

    @pytest.mark.unit
    def test_generate_api_key_is_unique(self):
        """Each generated key should be unique."""
        keys = [generate_api_key() for _ in range(100)]
        unique_keys = set(keys)
        
        assert len(unique_keys) == 100

    @pytest.mark.unit
    def test_hash_api_key_produces_hex_string(self):
        """Hashed API key should be SHA-256 hex string."""
        key = generate_api_key()
        hashed = hash_api_key(key)
        
        assert len(hashed) == 64
        assert all(c in "0123456789abcdef" for c in hashed)

    @pytest.mark.unit
    def test_verify_api_key_correct(self):
        """Correct API key should verify successfully."""
        key = generate_api_key()
        hashed = hash_api_key(key)
        
        assert verify_api_key(key, hashed) is True

    @pytest.mark.unit
    def test_verify_api_key_incorrect(self):
        """Incorrect API key should fail verification."""
        key = generate_api_key()
        wrong_key = generate_api_key()
        hashed = hash_api_key(key)
        
        assert verify_api_key(wrong_key, hashed) is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
