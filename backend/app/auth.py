from fastapi import Header, HTTPException

from .config import PASSCODE


async def require_passcode(x_passcode: str = Header(...)):
    """FastAPI dependency — checks X-Passcode header against the env var."""
    if x_passcode != PASSCODE:
        raise HTTPException(status_code=401, detail="Invalid passcode")
