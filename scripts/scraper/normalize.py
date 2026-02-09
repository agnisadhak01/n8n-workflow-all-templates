"""
Normalize n8n workflow JSON (from API or local file) into our schema shape.
Extracts node types for faceted search and builds tags/category.
"""
from collections import Counter


def extract_node_types(nodes: list) -> list[tuple[str, int]]:
    """From nodes array, return list of (node_type, count)."""
    types = [n.get("type") for n in nodes if n.get("type")]
    return list(Counter(types).items())


def normalize_position(pos) -> dict:
    """n8n uses position as [x, y] or {x, y}. Return {x, y} for React Flow."""
    if isinstance(pos, list) and len(pos) >= 2:
        return {"x": float(pos[0]), "y": float(pos[1])}
    if isinstance(pos, dict) and "x" in pos and "y" in pos:
        return {"x": float(pos["x"]), "y": float(pos["y"])}
    return {"x": 0, "y": 0}


def normalize_workflow(raw: dict, source_id: str, title: str, description: str = "", category: str = "", source_url: str = "", tags_override: list | None = None) -> dict:
    """
    Normalize to our template row shape.
    raw must have 'nodes' and 'connections' (or at least 'nodes').
    """
    nodes = raw.get("nodes") or []
    connections = raw.get("connections") or {}
    raw_tags = list(tags_override) if tags_override is not None else (list(raw.get("tags") or []) if isinstance(raw.get("tags"), list) else [])
    # Normalize to list of tag name strings (API may return objects like {"id": "...", "name": "AI"})
    tags = []
    for t in raw_tags:
        if isinstance(t, dict) and t.get("name"):
            tags.append(str(t["name"]).strip())
        elif isinstance(t, str) and t.strip():
            tags.append(t.strip())
    tags = list(dict.fromkeys(tags))  # dedupe preserving order
    if not tags and raw.get("meta", {}).get("name"):
        # Use meta name as extra search context; don't duplicate as tag if same as title
        pass

    node_type_counts = extract_node_types(nodes)
    return {
        "source_id": source_id,
        "title": title,
        "description": description or "",
        "category": category or "",
        "tags": tags,
        "nodes": nodes,
        "raw_workflow": raw,
        "source_url": source_url,
        "node_type_counts": node_type_counts,
    }


def normalize_from_api_payload(api_response: dict, template_id: int) -> dict | None:
    """
    api.n8n.io/templates/workflows/<id> returns { workflow: { workflow: { nodes, connections }, ... }, ... }.
    We need workflow name/description from the outer wrapper if available.
    """
    outer = api_response.get("workflow") or {}
    inner = outer.get("workflow") or outer
    if not inner.get("nodes"):
        return None
    name = (outer.get("name") or inner.get("name") or "Untitled").strip()
    desc = outer.get("description") or inner.get("meta", {}).get("templateCredsSetupCompleted") or ""
    if isinstance(desc, bool):
        desc = ""
    categories = outer.get("workflowInfo", {}).get("categories") or []
    category = categories[0].get("name") if categories else ""
    source_url = f"https://n8n.io/workflows/{template_id}"
    return normalize_workflow(
        inner,
        source_id=str(template_id),
        title=name,
        description=desc[:10000] if desc else "",
        category=category,
        source_url=source_url,
    )


def normalize_from_local_json(local_json: dict, source_id: str, source_url: str = "") -> dict:
    """Normalize from repo JSON (meta.name, name, tags, nodes, connections)."""
    meta = local_json.get("meta") or {}
    title = (meta.get("name") or local_json.get("name") or "Untitled").strip()
    tags = list(local_json.get("tags") or [])
    return normalize_workflow(
        local_json,
        source_id=source_id,
        title=title,
        description="",
        category="",
        source_url=source_url,
        tags_override=tags,
    )
