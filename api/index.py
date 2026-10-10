import sys
from pathlib import Path

# Ensure project root and backend folder are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
BACKEND_DIR = ROOT_DIR / "backend"

for directory in [str(ROOT_DIR), str(BACKEND_DIR)]:
    if directory not in sys.path:
        sys.path.insert(0, directory)

from backend.main import app

# Vercel's Python runtime discovers the ASGI `app` callable in this module
