"""
AI-assisted categorizer for n8n templates.

Given a batch of template summaries (id, title, description, tags, node_types),
calls the OpenAI API in sub-batches and returns a mapping of id -> category.

The model is constrained to choose from a fixed list of allowed categories.
"""
from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Dict, List

try:
    # New-style OpenAI client (openai>=1.0)
    from openai import OpenAI
except ImportError:  # pragma: no cover - library may not be installed yet
    OpenAI = None  # type: ignore[assignment]


logger = logging.getLogger(__name__)


ALLOWED_CATEGORIES: List[str] = [
    # Channels
    "Email & Communication",
    "Chat & Messaging",
    "Social Media",
    "Video & Media",
    "Voice & Telephony",
    "Webhooks & HTTP",
    "Forms & Surveys",
    # Business functions
    "CRM & Sales",
    "Sales & Outreach",
    "Marketing & Campaigns",
    "Support & Helpdesk",
    "E-commerce & Payments",
    "HR & Recruiting",
    "Analytics & Reporting",
    "Project & Task Management",
    "Finance & Invoicing",
    "Documentation & Knowledge",
    # Data / AI
    "AI & LLMs",
    "RAG & Vector Search",
    "Summarization & Q&A",
    "Classification & Routing",
    "SEO & Content",
    "Data Extraction & Scraping",
    "ETL & Data Pipelines",
    # Tools
    "Google Workspace",
    "Spreadsheets",
    "Databases & Storage",
    "Developer Tools",
    "Cloud & DevOps",
    "Notion & Knowledge Tools",
    # Cross-cutting
    "Automation & Orchestration",
    "Monitoring & Alerts",
    "Notifications",
    "Scheduling & Calendar",
    "Backup & Sync",
    "Utilities & Helpers",
    "Other",
]


def _get_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY is not set; AI categorization will be skipped.")
        return None
    if OpenAI is None:
        logger.warning("openai package is not installed; AI categorization will be skipped.")
        return None
    return OpenAI(api_key=api_key)


def _get_model_name() -> str:
    return os.environ.get("OPENAI_MODEL", "gpt-4o-mini")


def _get_batch_size() -> int:
    raw = os.environ.get("AI_BATCH_SIZE", "25")
    try:
        size = int(raw)
    except ValueError:
        size = 25
    return max(1, min(size, 100))


def _get_batch_delay_seconds() -> float:
    raw = os.environ.get("AI_BATCH_DELAY_MS", "250")
    try:
        ms = int(raw)
    except ValueError:
        ms = 250
    return max(0.0, ms / 1000.0)


def categorize_batch(items: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Categorize a list of template summaries using OpenAI.

    items: [{ "id": str, "title": str, "description": str, "tags": [str], "node_types": [str] }, ...]
    returns: { "<id>": "<CategoryName>", ... }
    """
    client = _get_client()
    if client is None:
        return {}

    if not items:
        return {}

    model = _get_model_name()
    max_batch = _get_batch_size()
    delay = _get_batch_delay_seconds()

    results: Dict[str, str] = {}

    for start in range(0, len(items), max_batch):
        batch = items[start : start + max_batch]

        payload = {
            "allowed_categories": ALLOWED_CATEGORIES,
            "items": [
                {
                    "id": str(it.get("id") or it.get("source_id")),
                    "title": it.get("title") or "",
                    "description": (it.get("description") or "")[:4000],
                    "tags": it.get("tags") or [],
                    "node_types": it.get("node_types") or [],
                }
                for it in batch
            ],
        }

        # Skip if any item is missing id
        payload["items"] = [it for it in payload["items"] if it["id"]]
        if not payload["items"]:
            continue

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert product categorizer for workflow automations. "
                    "For each item, choose exactly ONE category from the allowed list that best "
                    "describes the primary purpose of the workflow. "
                    "Respond as a JSON array of objects, each with fields 'id' and 'category'. "
                    "The 'category' MUST be one of the allowed_categories exactly, and you must "
                    "return the same number of items, in the same order, as the input."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(payload),
            },
        ]

        backoff = 1.0
        max_retries = 3

        for attempt in range(max_retries):
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.0,
                )
                content = response.choices[0].message.content or "[]"
                data = json.loads(content)
                if not isinstance(data, list):
                    logger.warning("AI response is not a list; skipping batch.")
                    break
                for entry in data:
                    if not isinstance(entry, dict):
                        continue
                    _id = str(entry.get("id") or "")
                    cat = str(entry.get("category") or "")
                    if not _id or not cat:
                        continue
                    if cat not in ALLOWED_CATEGORIES:
                        continue
                    results[_id] = cat
                break
            except Exception as exc:  # noqa: BLE001
                logger.warning("Error from OpenAI (attempt %s/%s): %s", attempt + 1, max_retries, exc)
                if attempt == max_retries - 1:
                    break
                time.sleep(backoff)
                backoff *= 2

        if delay > 0:
            time.sleep(delay)

    return results

