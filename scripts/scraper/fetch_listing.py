"""
Fetch template listing from official n8n API (api.n8n.io/templates/search).
Returns list of workflow IDs and basic metadata for fetching details.
"""
import time
import requests

API_BASE = "https://api.n8n.io"
SEARCH_URL = f"{API_BASE}/templates/search"
MAX_RETRIES = 3
RETRY_DELAY = 2


def fetch_page(page: int = 1, rows: int = 50) -> dict:
    last_err = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(
                SEARCH_URL,
                params={"page": page, "rows": rows},
                timeout=60,
                headers={"Accept": "application/json", "User-Agent": "n8n-template-scraper/1.0"},
            )
            resp.raise_for_status()
            return resp.json()
        except (requests.exceptions.ChunkedEncodingError, requests.exceptions.ConnectionError, OSError) as e:
            last_err = e
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                raise last_err
    raise last_err


def fetch_all_listings(rows_per_page: int = 100) -> list[dict]:
    """Paginate through all workflow listings. Returns list of workflow summary dicts."""
    out = []
    page = 1
    while True:
        data = fetch_page(page=page, rows=rows_per_page)
        workflows = data.get("workflows") or []
        total = data.get("totalWorkflows", 0)
        for w in workflows:
            out.append({
                "id": w["id"],
                "name": w.get("name", ""),
                "description": w.get("description", ""),
                "totalViews": w.get("totalViews", 0),
            })
        if not workflows or len(out) >= total:
            break
        page += 1
    return out


if __name__ == "__main__":
    import json
    listings = fetch_all_listings(rows_per_page=50)
    print(json.dumps(listings[:3], indent=2))
    print(f"... total {len(listings)} workflows")
