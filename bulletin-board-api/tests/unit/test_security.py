import pytest

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    hash_token,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_and_verify(self):
        password = "MySecurePass123"
        hashed = hash_password(password)
        assert hashed != password
        assert verify_password(password, hashed)

    def test_wrong_password_fails(self):
        hashed = hash_password("CorrectPassword1")
        assert not verify_password("WrongPassword1", hashed)


class TestTokens:
    def test_access_token_roundtrip(self):
        data = {"sub": "user-123", "role": "user"}
        token = create_access_token(data)
        decoded = decode_access_token(token)
        assert decoded is not None
        assert decoded["sub"] == "user-123"
        assert decoded["role"] == "user"

    def test_invalid_token_returns_none(self):
        result = decode_access_token("not-a-valid-token")
        assert result is None

    def test_refresh_token_is_random(self):
        t1 = create_refresh_token()
        t2 = create_refresh_token()
        assert t1 != t2
        assert len(t1) == 64  # 32 bytes hex

    def test_token_hash_is_deterministic(self):
        token = "my-test-token"
        h1 = hash_token(token)
        h2 = hash_token(token)
        assert h1 == h2

    def test_different_tokens_different_hashes(self):
        assert hash_token("token-a") != hash_token("token-b")
