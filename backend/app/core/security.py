"""
Security utilities: JWT tokens, password hashing, API key validation.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from app.core.config import settings
import hashlib
import secrets


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt with cost factor 12 per NFR6.6.
    Passwords longer than 72 bytes are truncated (bcrypt limitation).
    """
    # Truncate to 72 bytes to satisfy bcrypt limit
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    # Truncate to 72 bytes to match hashing behavior
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload to encode (must include 'sub' with user ID)
        expires_delta: Custom expiration time
    
    Returns:
        Encoded JWT string
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.
    
    Returns:
        Decoded payload dict, or None if invalid
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def hash_fingerprint(fingerprint_id: str) -> str:
    """
    Hash a fingerprint ID for secure storage (NFR4.1).
    Uses SHA-256 with a salt derived from the secret key.
    """
    salt = settings.SECRET_KEY[:16]
    return hashlib.sha256(f"{salt}:{fingerprint_id}".encode()).hexdigest()


def generate_api_key() -> str:
    """Generate a secure API key for scanner authentication (NFR6.7)."""
    return secrets.token_urlsafe(32)


def hash_api_key(api_key: str) -> str:
    """Hash an API key for storage."""
    return hashlib.sha256(api_key.encode()).hexdigest()


def verify_api_key(api_key: str, hashed_key: str) -> bool:
    """Verify an API key against its hash."""
    return hash_api_key(api_key) == hashed_key
