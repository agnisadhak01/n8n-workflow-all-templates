"""
Run the full pipeline: fetch listing from api.n8n.io -> fetch each workflow -> normalize -> upload to Supabase.

Usage (non-interactive / CI):
  python run.py [--limit N] [--skip N] [--batch-size N] [--delay SECONDS] [--no-resume]

Default interactive mode (when stdin is a TTY) will prompt for:
  - batch size
  - delay between requests
  - optional limit
  - whether to resume from the last run if state exists
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Set

from fetch_listing import fetch_all_listings
from fetch_detail import fetch_workflow
from normalize import normalize_from_api_payload
from upload_to_supabase import get_client, upload_template
from state import load_state, save_state


def _prompt_int(prompt: str, default: int) -> int:
    try:
        raw = input(f"{prompt} [{default}]: ").strip()
    except EOFError:
        return default
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        print("  Invalid number, using default.")
        return default


def _prompt_float(prompt: str, default: float) -> float:
    try:
        raw = input(f"{prompt} [{default}]: ").strip()
    except EOFError:
        return default
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        print("  Invalid number, using default.")
        return default


def _prompt_yes_no(prompt: str, default_yes: bool = True) -> bool:
    default_label = "Y/n" if default_yes else "y/N"
    try:
        raw = input(f"{prompt} [{default_label}]: ").strip().lower()
    except EOFError:
        return default_yes
    if not raw:
        return default_yes
    if raw in ("y", "yes"):
        return True
    if raw in ("n", "no"):
        return False
    print("  Invalid choice, using default.")
    return default_yes


def _report_admin_run(
    run_id: str,
    templates_ok: int,
    templates_error: int,
    status: str,
) -> None:
    try:
        client = get_client()
        client.table("admin_job_runs").update(
            {
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "status": status,
                "result": {"templates_ok": templates_ok, "templates_error": templates_error},
            }
        ).eq("id", run_id).execute()
    except Exception:  # noqa: BLE001
        pass


def _report_admin_progress(
    run_id: str,
    templates_ok: int,
    templates_error: int,
    total_count: int,
) -> None:
    try:
        client = get_client()
        client.table("admin_job_runs").update(
            {
                "result": {
                    "templates_ok": templates_ok,
                    "templates_error": templates_error,
                    "total_count": total_count,
                },
            }
        ).eq("id", run_id).execute()
    except Exception:  # noqa: BLE001
        pass


def main() -> None:
    admin_run_id = os.environ.get("ADMIN_RUN_ID") or None
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="Max templates to sync (0 = all)")
    ap.add_argument("--skip", type=int, default=0, help="Skip first N in listing (applied after resume)")
    ap.add_argument("--batch-size", type=int, default=0, help="Templates per batch (0 = prompt/default)")
    ap.add_argument("--delay", type=float, default=0.0, help="Delay between items in seconds (0 = prompt/default)")
    ap.add_argument("--no-resume", action="store_true", help="Ignore any saved state and start from scratch")
    ap.add_argument("--dry-run", action="store_true", help="Fetch and normalize only; do not upload to Supabase")
    args = ap.parse_args()

    interactive = sys.stdin.isatty()

    # Defaults
    default_batch_size = 50
    default_delay = 0.3

    batch_size = args.batch_size or (default_batch_size if not interactive else _prompt_int("Templates per batch (state saved after each)", default_batch_size))
    delay = args.delay or (default_delay if not interactive else _prompt_float("Delay between requests (seconds)", default_delay))

    limit = args.limit
    if interactive and not args.limit:
        limit = _prompt_int("Max templates to sync (0 = all)", 0)

    print("Fetching listing from api.n8n.io...")
    listings: List[Dict[str, Any]] = fetch_all_listings()
    print(f"Found {len(listings)} templates")

    # Load existing state (if any)
    state = None if args.no_resume else load_state()
    start_index = 0
    total_ok = 0
    total_err = 0

    if state:
        # Find index of last_source_id in current listing
        last_id = state.last_source_id
        idx = next((i for i, item in enumerate(listings) if str(item.get("id")) == str(last_id)), None)
        if idx is not None:
            already_synced = idx + 1
            print(f"Existing state: last_source_id={last_id} (position {already_synced}), total_synced={state.total_synced}, total_errors={state.total_errors}")
            resume = interactive and _prompt_yes_no(f"Resume from last run (skip {already_synced} already synced)?", default_yes=True)
            if resume or not interactive:
                start_index = already_synced
                total_ok = state.total_synced
                total_err = state.total_errors
        # If state exists but we didn't find the ID, ignore and start from 0.

    # Apply additional skip and limit on top of resume index
    if args.skip:
        start_index += args.skip
        print(f"Explicit skip: additional {args.skip} templates (start index {start_index})")

    if start_index:
        listings = listings[start_index:]
        print(f"Starting from index {start_index}, {len(listings)} templates remaining")

    if limit:
        listings = listings[:limit]
        print(f"Limited to {limit} templates from starting position")

    if not listings:
        print("Nothing to do (no templates after applying resume/skip/limit).")
        if admin_run_id:
            _report_admin_run(admin_run_id, 0, 0, "completed")
        return

    client = None if args.dry_run else get_client()

    # Preload existing source_ids so we can skip templates that are already in Supabase.
    existing_source_ids: Set[str] = set()
    if client is not None:
        page_size = 1000
        offset = 0
        while True:
            resp = client.table("templates").select("source_id").range(offset, offset + page_size - 1).execute()
            rows = resp.data or []
            if not rows:
                break
            for row in rows:
                sid = row.get("source_id")
                if sid:
                    existing_source_ids.add(str(sid))
            if len(rows) < page_size:
                break
            offset += page_size
        print(f"Loaded {len(existing_source_ids)} existing templates from Supabase (by source_id) for skipping.")

    total_count = len(listings)
    print(f"Processing {total_count} templates in batches of {batch_size} (dry_run={args.dry_run})")

    if admin_run_id:
        _report_admin_progress(admin_run_id, 0, 0, total_count)

    for batch_start in range(0, total_count, batch_size):
        batch = listings[batch_start : batch_start + batch_size]
        batch_ok = 0
        batch_err = 0
        last_success_id = None

        for item in batch:
            tid = item["id"]
            # If this template already exists in Supabase, skip it and move on.
            if client is not None and str(tid) in existing_source_ids:
                continue
            try:
                raw = fetch_workflow(tid)
                if not raw:
                    batch_err += 1
                    total_err += 1
                    continue
                api_shape = {
                    "workflow": {
                        "workflow": raw,
                        "name": item.get("name"),
                        "description": item.get("description", ""),
                        "workflowInfo": {"categories": []},
                    }
                }
                norm = normalize_from_api_payload(api_shape, tid)
                if not norm:
                    batch_err += 1
                    total_err += 1
                    continue
                if not args.dry_run and client is not None:
                    upload_template(client, norm)
                batch_ok += 1
                total_ok += 1
                last_success_id = norm["source_id"]
            except Exception as e:  # noqa: BLE001
                batch_err += 1
                total_err += 1
                print(f"  Error template {tid}: {e}")
            if delay > 0:
                time.sleep(delay)

        batch_end_index = min(batch_start + batch_size, total_count)
        print(
            f"Batch {batch_start + 1}-{batch_end_index}/{total_count} done: ok={batch_ok} err={batch_err} (total ok={total_ok} err={total_err})"
        )

        # Report progress for admin UI
        if admin_run_id:
            _report_admin_progress(admin_run_id, total_ok, total_err, total_count)

        # Persist state after each batch so we can resume if interrupted
        if last_success_id is not None:
            save_state(last_success_id, total_ok, total_err)

    print(f"Done. ok={total_ok} err={total_err}")
    if admin_run_id:
        _report_admin_run(admin_run_id, total_ok, total_err, "completed")


if __name__ == "__main__":
    _admin_run_id = os.environ.get("ADMIN_RUN_ID")
    _total_ok = 0
    _total_err = 0
    _exit_status = "completed"
    try:
        main()
    except Exception:
        _exit_status = "failed"
        if _admin_run_id:
            try:
                client = get_client()
                client.table("admin_job_runs").update(
                    {
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "status": _exit_status,
                        "result": {"templates_ok": _total_ok, "templates_error": _total_err},
                    }
                ).eq("id", _admin_run_id).execute()
            except Exception:  # noqa: BLE001
                pass
        raise
