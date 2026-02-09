"""
Upsert normalized templates and node_types into Supabase.
Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env (e.g. .env in scripts/scraper).
"""
import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env from this script's directory so it works regardless of cwd
_env_dir = Path(__file__).resolve().parent
load_dotenv(_env_dir / ".env")

def get_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in scripts/scraper/.env (see .env.example)"
        )
    return create_client(url, key)


def upload_template(client: Client, normalized: dict) -> str | None:
    """
    Upsert one template and its node_types. Returns template uuid or None.
    normalized must have: source_id, title, description, category, tags, nodes, raw_workflow, source_url, node_type_counts.
    """
    # Upsert template (id is auto; we match on source_id)
    row = {
        "source_id": normalized["source_id"],
        "title": normalized["title"],
        "description": normalized["description"],
        "category": normalized["category"],
        "tags": normalized["tags"],
        "nodes": normalized["nodes"],
        "raw_workflow": normalized["raw_workflow"],
        "source_url": normalized.get("source_url") or "",
    }
    r = client.table("templates").upsert(row, on_conflict="source_id").execute()
    if not r.data or len(r.data) == 0:
        return None
    template_id = r.data[0]["id"]

    # Delete existing node_types for this template then insert
    client.table("node_types").delete().eq("template_id", template_id).execute()
    rows = [
        {"template_id": template_id, "node_type": nt, "count": c}
        for nt, c in normalized.get("node_type_counts") or []
    ]
    if rows:
        client.table("node_types").insert(rows).execute()
    return template_id
