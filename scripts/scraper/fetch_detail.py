"""
Fetch full workflow JSON for a single template from api.n8n.io/templates/workflows/<id>.
"""
import time
import requests

API_BASE = "https://api.n8n.io"
MAX_RETRIES = 3
RETRY_DELAY = 1


def fetch_workflow(template_id: int) -> dict | None:
    """Returns raw workflow JSON (nodes, connections, meta, etc.) or None on failure."""
    url = f"{API_BASE}/templates/workflows/{template_id}"
    last_err = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(
                url,
                timeout=60,
                headers={"Accept": "application/json", "User-Agent": "n8n-template-scraper/1.0"},
            )
            if resp.status_code != 200:
                return None
            try:
                data = resp.json()
            except ValueError:
                # Non-JSON or empty response
                return None
            break
        except (requests.exceptions.ChunkedEncodingError, requests.exceptions.ConnectionError, OSError) as e:
            last_err = e
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                return None
    # API wraps in workflow.workflow; be defensive about shapes.
    if not isinstance(data, dict):
        return None
    w = data.get("workflow") or {}
    if not isinstance(w, dict):
        w = {}
    inner = w.get("workflow") or w
    if not isinstance(inner, dict):
        inner = {}

    if "nodes" in inner and "connections" in inner:
        return inner
    if "nodes" in w:
        return w
    return None


if __name__ == "__main__":
    import json
    import sys
    tid = int(sys.argv[1]) if len(sys.argv) > 1 else 6270
    out = fetch_workflow(tid)
    print(json.dumps(out, indent=2)[:2000] if out else "No workflow")
