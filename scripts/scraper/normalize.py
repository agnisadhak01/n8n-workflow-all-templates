"""
Normalize n8n workflow JSON (from API or local file) into our schema shape.
Extracts node types for faceted search and builds tags/category.
"""
from collections import Counter
import re


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


# Central mapping from tags/keywords to high-level categories.
# Keys are normalized tokens (lowercase).
CATEGORY_BY_TAG = {
    # Channels / communication
    "email": "Email & Communication",
    "gmail": "Email & Communication",
    "smtp": "Email & Communication",
    "newsletter": "Email & Communication",
    "mailchimp": "Email & Communication",
    "slack": "Chat & Messaging",
    "telegram": "Chat & Messaging",
    "whatsapp": "Chat & Messaging",
    "discord": "Chat & Messaging",
    "sms": "Chat & Messaging",
    "teams": "Chat & Messaging",
    "line": "Chat & Messaging",
    "linkedin": "Social Media",
    "twitter": "Social Media",
    "x": "Social Media",
    "facebook": "Social Media",
    "instagram": "Social Media",
    "youtube": "Video & Media",
    "tiktok": "Video & Media",
    "reels": "Video & Media",
    "video": "Video & Media",
    "voice": "Voice & Telephony",
    "call": "Voice & Telephony",
    "twilio": "Voice & Telephony",
    "webhook": "Webhooks & HTTP",
    "http": "Webhooks & HTTP",
    "api": "Webhooks & HTTP",
    "form": "Forms & Surveys",
    "forms": "Forms & Surveys",
    "survey": "Forms & Surveys",
    "typeform": "Forms & Surveys",
    # Business functions
    "crm": "CRM & Sales",
    "hubspot": "CRM & Sales",
    "salesforce": "CRM & Sales",
    "pipedrive": "CRM & Sales",
    "lead": "CRM & Sales",
    "leads": "CRM & Sales",
    "outreach": "Sales & Outreach",
    "prospect": "Sales & Outreach",
    "marketing": "Marketing & Campaigns",
    "campaign": "Marketing & Campaigns",
    "ads": "Marketing & Campaigns",
    "utm": "Marketing & Campaigns",
    "seo": "SEO & Content",
    "content": "SEO & Content",
    "blog": "SEO & Content",
    "copy": "SEO & Content",
    "support": "Support & Helpdesk",
    "ticket": "Support & Helpdesk",
    "tickets": "Support & Helpdesk",
    "zendesk": "Support & Helpdesk",
    "shopify": "E-commerce & Payments",
    "woocommerce": "E-commerce & Payments",
    "stripe": "E-commerce & Payments",
    "paypal": "E-commerce & Payments",
    "hr": "HR & Recruiting",
    "hiring": "HR & Recruiting",
    "recruit": "HR & Recruiting",
    "analytics": "Analytics & Reporting",
    "report": "Analytics & Reporting",
    "reports": "Analytics & Reporting",
    "dashboard": "Analytics & Reporting",
    "jira": "Project & Task Management",
    "trello": "Project & Task Management",
    "clickup": "Project & Task Management",
    "asana": "Project & Task Management",
    "tasks": "Project & Task Management",
    "todo": "Project & Task Management",
    "invoice": "Finance & Invoicing",
    "invoices": "Finance & Invoicing",
    "billing": "Finance & Invoicing",
    "notion": "Documentation & Knowledge",
    "confluence": "Documentation & Knowledge",
    "docs": "Documentation & Knowledge",
    "documentation": "Documentation & Knowledge",
    # Data & AI
    "gpt": "AI & LLMs",
    "openai": "AI & LLMs",
    "gemini": "AI & LLMs",
    "claude": "AI & LLMs",
    "llm": "AI & LLMs",
    "ai": "AI & LLMs",
    "agent": "AI & LLMs",
    "rag": "RAG & Vector Search",
    "vector": "RAG & Vector Search",
    "embeddings": "RAG & Vector Search",
    "summarize": "Summarization & Q&A",
    "summary": "Summarization & Q&A",
    "q&a": "Summarization & Q&A",
    "classification": "Classification & Routing",
    "classify": "Classification & Routing",
    "route": "Classification & Routing",
    "routing": "Classification & Routing",
    "scrape": "Data Extraction & Scraping",
    "scraper": "Data Extraction & Scraping",
    "scraping": "Data Extraction & Scraping",
    "crawl": "Data Extraction & Scraping",
    "rss": "Data Extraction & Scraping",
    "extract": "Data Extraction & Scraping",
    "etl": "ETL & Data Pipelines",
    "pipeline": "ETL & Data Pipelines",
    # Tools & ecosystem
    "google": "Google Workspace",
    "drive": "Google Workspace",
    "calendar": "Scheduling & Calendar",
    "sheets": "Spreadsheets",
    "sheet": "Spreadsheets",
    "excel": "Spreadsheets",
    "spreadsheet": "Spreadsheets",
    "postgres": "Databases & Storage",
    "postgresql": "Databases & Storage",
    "mysql": "Databases & Storage",
    "supabase": "Databases & Storage",
    "mongodb": "Databases & Storage",
    "s3": "Databases & Storage",
    "github": "Developer Tools",
    "gitlab": "Developer Tools",
    "docker": "Cloud & DevOps",
    "aws": "Cloud & DevOps",
    "azure": "Cloud & DevOps",
    # Cross-cutting
    "alerts": "Monitoring & Alerts",
    "alert": "Monitoring & Alerts",
    "monitor": "Monitoring & Alerts",
    "monitoring": "Monitoring & Alerts",
    "status": "Monitoring & Alerts",
    "schedule": "Scheduling & Calendar",
    "scheduling": "Scheduling & Calendar",
    "notification": "Notifications",
    "notifications": "Notifications",
    "backup": "Backup & Sync",
    "sync": "Backup & Sync",
    "automation": "Automation & Orchestration",
    "automate": "Automation & Orchestration",
    "automated": "Automation & Orchestration",
}


# Priority for categories when multiple matches exist.
CATEGORY_PRIORITY = {
    "AI & LLMs": 100,
    "RAG & Vector Search": 95,
    "Summarization & Q&A": 90,
    "Classification & Routing": 90,
    "CRM & Sales": 85,
    "Sales & Outreach": 85,
    "Marketing & Campaigns": 80,
    "SEO & Content": 80,
    "Support & Helpdesk": 75,
    "E-commerce & Payments": 75,
    "Analytics & Reporting": 70,
    "Project & Task Management": 70,
    "Documentation & Knowledge": 65,
    "Databases & Storage": 65,
    "Data Extraction & Scraping": 65,
    "ETL & Data Pipelines": 60,
    "Google Workspace": 60,
    "Spreadsheets": 60,
    "Developer Tools": 60,
    "Cloud & DevOps": 55,
    "Email & Communication": 55,
    "Chat & Messaging": 55,
    "Social Media": 55,
    "Video & Media": 55,
    "Voice & Telephony": 55,
    "Forms & Surveys": 50,
    "HR & Recruiting": 50,
    "Finance & Invoicing": 50,
    "Monitoring & Alerts": 50,
    "Scheduling & Calendar": 45,
    "Notifications": 45,
    "Backup & Sync": 45,
    "Automation & Orchestration": 40,
}


def _normalize_token(token: str) -> str:
    """Normalize a raw tag/keyword into a lookup token."""
    t = (token or "").strip().lower()
    if not t:
        return ""
    # Collapse common variants
    if t.startswith("gpt-"):
        return "gpt"
    if t.startswith("gpt "):
        return "gpt"
    if t in {"sheet", "sheets"}:
        return "sheets"
    return t


def derive_category_from_tags_and_text(tags: list[str], title: str, description: str) -> str:
    best_category = ""
    best_priority = -1

    # 1) Try tags (already normalized strings)
    for raw in tags or []:
        # Tags can be plain strings or dicts like {"id": "...", "name": "..."} from the API.
        if isinstance(raw, dict):
            raw_value = raw.get("name") or raw.get("label") or ""
        else:
            raw_value = raw
        token = _normalize_token(raw_value)
        if not token:
            continue
        cat = CATEGORY_BY_TAG.get(token)
        if not cat:
            continue
        prio = CATEGORY_PRIORITY.get(cat, 50)
        if prio > best_priority:
            best_category = cat
            best_priority = prio

    # 2) Try simple keyword tokens from title/description
    text = f"{title or ''} {description or ''}".lower()
    tokens = re.split(r"[^a-z0-9+]+", text)
    for tok in tokens:
        token = _normalize_token(tok)
        if not token:
            continue
        cat = CATEGORY_BY_TAG.get(token)
        if not cat:
            continue
        prio = CATEGORY_PRIORITY.get(cat, 50)
        if prio > best_priority:
            best_category = cat
            best_priority = prio

    return best_category


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
    category = ""
    if isinstance(categories, list):
        # Pick the first valid dict entry to avoid 'NoneType' errors when the
        # API returns categories like [null] or other non-dict values.
        first_valid = next((c for c in categories if isinstance(c, dict)), None)
        if first_valid:
            name_val = first_valid.get("name")
            if isinstance(name_val, str):
                category = name_val
    source_url = f"https://n8n.io/workflows/{template_id}"
    # Official tags may live on the outer wrapper (e.g. workflowInfo.tags, tags)
    # or on the inner workflow object. Collect from the common locations.
    outer_tags = outer.get("tags") or outer.get("workflowInfo", {}).get("tags") or []
    inner_tags = inner.get("tags") or []
    combined = []
    if isinstance(outer_tags, list):
        combined.extend(outer_tags)
    if isinstance(inner_tags, list):
        combined.extend(inner_tags)
    if not category:
        derived = derive_category_from_tags_and_text(combined, name, desc)
        if derived:
            category = derived
    return normalize_workflow(
        inner,
        source_id=str(template_id),
        title=name,
        description=desc[:10000] if desc else "",
        category=category,
        source_url=source_url,
        tags_override=combined or None,
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
