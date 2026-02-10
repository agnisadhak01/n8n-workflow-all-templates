"""
Enrich existing templates in Supabase with category and tags.

For each template row in public.templates:
  - Fetch fresh metadata from the official n8n templates API.
  - Normalize it using normalize_from_api_payload.
  - Update category and tags in Supabase (matching on source_id).

This script is safe to re-run; it only updates category and tags.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Dict, List

import requests

from normalize import normalize_from_api_payload, derive_category_from_tags_and_text
from ai_categorizer import categorize_batch
from upload_to_supabase import get_client


API_BASE = "https://api.n8n.io/templates/workflows"
PAGE_SIZE = 500  # number of templates to fetch per page from Supabase
TIMEOUT_SECONDS = 15


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


STOPWORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "by",
    "at",
    "from",
    "is",
    "are",
    "be",
    "this",
    "that",
    "these",
    "those",
    "your",
    "my",
    "our",
    "their",
    "using",
    "use",
    "into",
}


def _derive_keyword_tags(title: str, description: str, max_tags: int = 5) -> List[str]:
    """
    Derive simple keyword-based tags from title and description.
    Very lightweight: split on non-alphanumeric, lowercase, drop stopwords/short tokens.
    """
    text = f"{title or ''} {description or ''}".lower()
    tokens = re.split(r"[^a-z0-9]+", text)
    tags: List[str] = []
    for tok in tokens:
        if not tok or len(tok) < 3:
            continue
        if tok in STOPWORDS:
            continue
        if tok not in tags:
            tags.append(tok)
        if len(tags) >= max_tags:
            break
    return tags


def _merge_tags(primary: List[str], derived: List[str]) -> List[str]:
    """Merge two tag lists, preserving order and uniqueness."""
    seen = set()
    merged: List[str] = []
    for t in (primary or []) + (derived or []):
        t = (t or "").strip()
        if not t:
            continue
        if t in seen:
            continue
        seen.add(t)
        merged.append(t)
    return merged


def enrich() -> None:
    client = get_client()

    offset = 0
    total_updated = 0
    total_skipped = 0

    while True:
        logger.info("Fetching templates batch from Supabase (offset=%s, limit=%s)...", offset, PAGE_SIZE)
        resp = client.table("templates").select(
            "id,source_id,title,description,category,tags"
        ).range(offset, offset + PAGE_SIZE - 1).execute()
        rows: List[Dict[str, Any]] = resp.data or []

        if not rows:
            break

        # Collect per-row info and items that need AI categorization.
        row_infos: List[Dict[str, Any]] = []
        ai_items: List[Dict[str, Any]] = []

        for row in rows:
            source_id = row.get("source_id")
            if not source_id:
                total_skipped += 1
                continue

            try:
                url = f"{API_BASE}/{source_id}"
                r = requests.get(url, timeout=TIMEOUT_SECONDS)
                if r.status_code != 200:
                    logger.warning("Skipping %s: API returned %s", source_id, r.status_code)
                    total_skipped += 1
                    continue

                api_payload = r.json()
                norm = normalize_from_api_payload(api_payload, int(source_id))
                if not norm:
                    logger.warning("Skipping %s: normalize_from_api_payload returned None", source_id)
                    total_skipped += 1
                    continue

                # Use normalized category and tags, and optionally enrich with keyword tags.
                normalized_category = norm.get("category") or ""
                normalized_tags = list(norm.get("tags") or [])

                derived_tags = _derive_keyword_tags(norm.get("title") or "", norm.get("description") or "")
                merged_tags = _merge_tags(normalized_tags, derived_tags)

                if not normalized_category:
                    fallback_category = derive_category_from_tags_and_text(
                        merged_tags,
                        norm.get("title") or "",
                        norm.get("description") or "",
                    )
                    if fallback_category:
                        normalized_category = fallback_category

                row_info = {
                    "id": row["id"],
                    "source_id": source_id,
                    "existing_category": row.get("category") or "",
                    "final_category": normalized_category,
                    "final_tags": merged_tags,
                    "title": norm.get("title") or row.get("title") or "",
                    "description": norm.get("description") or row.get("description") or "",
                    # node_types could be passed in later if needed
                    "node_types": [],
                }
                row_infos.append(row_info)

                # Decide if this row should be refined by AI.
                if not normalized_category or normalized_category in {"Automation & Orchestration", "Other"}:
                    ai_items.append(
                        {
                            "id": row_info["id"],
                            "title": row_info["title"],
                            "description": row_info["description"],
                            "tags": row_info["final_tags"],
                            "node_types": row_info["node_types"],
                        }
                    )
            except Exception as e:  # noqa: BLE001
                logger.exception("Error enriching template %s: %s", source_id, e)
                total_skipped += 1

        # Call OpenAI in batches for rows that still need better categories.
        ai_categories: Dict[str, str] = {}
        if ai_items:
            ai_categories = categorize_batch(ai_items)

        # Apply updates back to Supabase.
        for info in row_infos:
            row_id = info["id"]
            existing_category = info["existing_category"]
            final_category = info["final_category"]

            # If AI produced a category for this row, prefer it.
            ai_cat = ai_categories.get(str(row_id))
            if ai_cat:
                final_category = ai_cat

            update_data: Dict[str, Any] = {}
            if final_category and final_category != existing_category:
                update_data["category"] = final_category
            if info["final_tags"]:
                update_data["tags"] = info["final_tags"]

            if not update_data:
                total_skipped += 1
                continue

            try:
                client.table("templates").update(update_data).eq("id", row_id).execute()
                total_updated += 1
            except Exception as e:  # noqa: BLE001
                logger.exception("Error updating template %s in Supabase: %s", info["source_id"], e)
                total_skipped += 1

        offset += len(rows)
        if len(rows) < PAGE_SIZE:
            break

    logger.info("Enrichment complete. Updated=%s, Skipped=%s", total_updated, total_skipped)


if __name__ == "__main__":
    enrich()

