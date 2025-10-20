import pytest
from insight_console.auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_token
)

def test_hash_password():
    """Test password hashing"""
    password = "testpassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert len(hashed) > 20

def test_verify_password():
    """Test password verification"""
    password = "testpassword123"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_create_access_token():
    """Test JWT token creation"""
    data = {"sub": "test@example.com", "user_id": 1}
    token = create_access_token(data)
    assert isinstance(token, str)
    assert len(token) > 20

def test_verify_token():
    """Test JWT token verification"""
    data = {"sub": "test@example.com", "user_id": 1}
    token = create_access_token(data)
    payload = verify_token(token)
    assert payload["sub"] == "test@example.com"
    assert payload["user_id"] == 1

def test_verify_invalid_token():
    """Test that invalid tokens raise errors"""
    with pytest.raises(Exception):
        verify_token("invalid.token.here")
