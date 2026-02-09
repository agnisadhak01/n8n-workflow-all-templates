"""
Load templates from local JSON files (n8n-workflow-all-templates/**/*.json) and upload to Supabase.
Run from repo root or scripts/scraper. Expects REPO_ROOT or finds it relative to this file.
"""
import json
import sys
from pathlib import Path

# repo root: parent of scripts/
REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = REPO_ROOT / "n8n-workflow-all-templates" / "n8n-workflow-all-templates"

from normalize import normalize_from_local_json
from upload_to_supabase import get_client, upload_template


def iter_jsons():
    if not TEMPLATES_DIR.exists():
        print("Templates dir not found:", TEMPLATES_DIR)
        return
    for path in TEMPLATES_DIR.rglob("*.json"):
        yield path


def main():
    limit = 0
    skip = 0
    argv = sys.argv[1:]
    for i, arg in enumerate(argv):
        if arg == "--limit" and i + 1 < len(argv):
            limit = int(argv[i + 1])
        elif arg == "--skip" and i + 1 < len(argv):
            skip = int(argv[i + 1])

    paths = list(iter_jsons())
    print(f"Found {len(paths)} JSON files")
    if skip:
        paths = paths[skip:]
    if limit:
        paths = paths[:limit]
    client = get_client()
    ok, err = 0, 0
    for i, path in enumerate(paths):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not data.get("nodes"):
                err += 1
                continue
            source_id = data.get("meta", {}).get("id") or path.stem
            if isinstance(source_id, int):
                source_id = str(source_id)
            source_url = data.get("meta", {}).get("site", "")
            norm = normalize_from_local_json(data, source_id=source_id, source_url=source_url)
            upload_template(client, norm)
            ok += 1
            if (i + 1) % 100 == 0:
                print(f"  {i + 1}/{len(paths)} ok={ok} err={err}")
        except Exception as e:
            err += 1
            print(f"  Error {path}: {e}")
    print(f"Done. ok={ok} err={err}")


if __name__ == "__main__":
    main()
