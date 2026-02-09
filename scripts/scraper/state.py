"""
State handling for the n8n template scraper.

We persist progress to a small JSON file so that runs can be resumed later.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

STATE_PATH = Path(__file__).resolve().parent / ".scraper_state.json"


@dataclass
class ScraperState:
    last_source_id: str
    last_run_utc: str
    total_synced: int
    total_errors: int


def load_state() -> Optional[ScraperState]:
    """
    Load scraper state from disk, if present.
    Returns None if no state file exists or it cannot be parsed.
    """
    if not STATE_PATH.exists():
        return None
    try:
        raw = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        return ScraperState(
            last_source_id=str(raw.get("last_source_id", "")),
            last_run_utc=str(raw.get("last_run_utc", "")),
            total_synced=int(raw.get("total_synced", 0)),
            total_errors=int(raw.get("total_errors", 0)),
        )
    except Exception:
        # Corrupt or unreadable state; ignore and treat as no state
        return None


def save_state(last_source_id: str, total_synced: int, total_errors: int) -> None:
    """
    Persist scraper state to disk.
    """
    state = ScraperState(
        last_source_id=str(last_source_id),
        last_run_utc=datetime.now(timezone.utc).isoformat(),
        total_synced=int(total_synced),
        total_errors=int(total_errors),
    )
    STATE_PATH.write_text(json.dumps(asdict(state), indent=2), encoding="utf-8")

