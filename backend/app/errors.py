"""Structured API errors."""
from __future__ import annotations


class ApiError(Exception):
    """An error that is returned to the client as {"error": {"code", "message"}}."""

    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message

    def to_dict(self) -> dict:
        return {"error": {"code": self.code, "message": self.message}}
