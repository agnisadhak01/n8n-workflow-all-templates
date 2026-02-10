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

                update_data: Dict[str, Any] = {}
                if normalized_category and normalized_category != (row.get("category") or ""):
                    update_data["category"] = normalized_category
                if merged_tags:
                    update_data["tags"] = merged_tags

                if not update_data:
                    total_skipped += 1
                    continue

                client.table("templates").update(update_data).eq("id", row["id"]).execute()
                total_updated += 1
            except Exception as e:  # noqa: BLE001
                logger.exception("Error enriching template %s: %s", source_id, e)
                total_skipped += 1

        offset += len(rows)
        if len(rows) < PAGE_SIZE:
            break

    logger.info("Enrichment complete. Updated=%s, Skipped=%s", total_updated, total_skipped)


if __name__ == "__main__":
    enrich()

