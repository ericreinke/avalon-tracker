import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://avalon:avalon@localhost:5432/avalon")
PASSCODE: str = os.environ["PASSCODE"]
