import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

import httpx

log = logging.getLogger("lumo.resources")
PATH = Path(__file__).parent / "data" / "schemes.json"
ALLOWED_HOSTS = (
    "eshram.gov.in",
    "maandhan.in",
    "myscheme.gov.in",
    "jansuraksha.gov.in",
    "pmsvanidhi.mohua.gov.in",
    "pmjdy.gov.in",
    "mudra.org.in",
)
SOURCE_CACHE_TTL_SECONDS = 900
_source_cache: dict[str, tuple[float, dict]] = {}
_OCCUPATION_ALIASES = {
    "vegetable vendor": "street_vendor",
    "street vendor": "street_vendor",
    "सब्जी विक्रेता": "street_vendor",
}


class _PageMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.description = ""
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "title":
            self._in_title = True
        if tag == "meta" and attributes.get("name", "").lower() == "description":
            self.description = attributes.get("content", "").strip()

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data.strip()


def _is_official_url(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    return parsed.scheme == "https" and any(
        host == allowed or host.endswith(f".{allowed}") for allowed in ALLOWED_HOSTS
    )


async def _retrieve_source(client: httpx.AsyncClient, url: str) -> dict:
    if not _is_official_url(url):
        return {"source_status": "source_not_allowlisted"}
    cached = _source_cache.get(url)
    if cached and time.monotonic() - cached[0] < SOURCE_CACHE_TTL_SECONDS:
        return dict(cached[1])
    try:
        response = await client.get(url)
        retrieved_at = datetime.now(timezone.utc).isoformat()
        if response.status_code < 200 or response.status_code >= 300:
            result = {"source_status": "source_unavailable"}
        elif "text/html" not in response.headers.get("content-type", "").lower():
            result = {
                "source_status": "source_retrieved_no_html_metadata",
                "source_checked_at": retrieved_at,
            }
        else:
            parser = _PageMetadata()
            parser.feed(response.text[:250_000])
            description = parser.description[:700].strip()
            result = {
                "source_status": "source_retrieved",
                "source_page_title": parser.title[:300] or None,
                "source_excerpt": description if len(description) >= 20 else None,
                "source_checked_at": retrieved_at,
                "retrieved_content_kind": "html_page_metadata",
            }
        _source_cache[url] = (time.monotonic(), result)
        return dict(result)
    except (httpx.HTTPError, ValueError) as error:
        log.info("Official directory source unavailable for %s: %s", url, error)
        result = {"source_status": "source_unavailable"}
        _source_cache[url] = (time.monotonic(), result)
        return dict(result)


def _canonical_occupation(occupation: str | None) -> str | None:
    if not occupation:
        return None
    normalized = occupation.strip().replace("_", " ").casefold()
    return _OCCUPATION_ALIASES.get(normalized, normalized.replace(" ", "_"))


def _match_record(record: dict, occupation: str | None) -> dict:
    catalog_occupations = record.get("catalog_relevance_occupations", [])
    canonical_occupation = _canonical_occupation(occupation)
    matched = bool(canonical_occupation and canonical_occupation in catalog_occupations)
    if matched:
        return {
            "match_status": "insufficient_information",
            "match_reasons": [
                (
                    f"The local catalog associates {occupation} with {canonical_occupation}; "
                    "this is not an official eligibility rule."
                )
            ],
            "missing_information": record.get("unknown_information", []),
            "evidence": [{
                "source": "LUMO directory catalog",
                "claim": f"Occupation tag includes {canonical_occupation}.",
                "authority": "non_authoritative_catalog_hint",
            }],
        }
    missing = list(record.get("unknown_information", []))
    if not occupation:
        missing.insert(0, "occupation or worker category")
        return {
            "match_status": "insufficient_information",
            "match_reasons": [],
            "missing_information": missing,
            "evidence": [],
        }
    return {
        "match_status": "not_supported_by_evidence",
        "match_reasons": [],
        "missing_information": missing,
        "evidence": [],
    }


async def get_resources(
    occupation: str | None = None,
    limit: int = 5,
    state: str | None = None,
):
    with PATH.open(encoding="utf-8") as f:
        all_records = json.load(f)

    tagged = [
        record for record in all_records
        if (
            _canonical_occupation(occupation)
            and _canonical_occupation(occupation)
            in record.get("catalog_relevance_occupations", [])
        )
    ]
    records = tagged or all_records
    records = records[:limit]
    timeout = httpx.Timeout(5.0, connect=3.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        sources = await asyncio.gather(*(
            _retrieve_source(client, record["official_url"]) for record in records
        ))

    items = []
    for record, source in zip(records, sources):
        match = _match_record(record, occupation)
        catalog_matched = match["match_status"] == "insufficient_information" and bool(
            match["match_reasons"]
        )
        items.append({
            "id": record["id"],
            "scheme_id": record["id"],
            "title": record["name"],
            "category": record.get("category"),
            "official_source_type": record.get("official_source_type", "government_portal"),
            "why_relevant": (
                f"The local catalog associates this directory entry with {occupation}. "
                "This is only a catalog hint, not an eligibility finding."
                if catalog_matched and occupation
                else "General directory entry only; LUMO has not established that it is relevant to this profile."
            ),
            "eligibility_summary": (
                "No eligibility conditions have been extracted or verified by LUMO. "
                "Check current rules with the official provider."
            ),
            "benefit_summary": (
                "No benefit or financial amount has been extracted or verified by LUMO."
            ),
            "eligibility": {
                "verified": False,
                "verified_fields": {},
                "unknown_fields": record.get("unknown_information", []),
            },
            "benefits": {
                "verified": False,
                "verified_fields": {},
                "financial_benefit": None,
                "non_financial_benefit": None,
            },
            "requirements_to_verify": record.get("unknown_information", []),
            "official_url": record["official_url"],
            "source_name": record.get("source_name", "Official portal"),
            "profile_context": {
                "occupation": occupation,
                "state_or_location": state,
            },
            "source_status": source.get("source_status", "catalog_only"),
            "source_page_title": source.get("source_page_title"),
            "source_excerpt": source.get("source_excerpt"),
            "source_checked_at": source.get("source_checked_at"),
            "retrieved_content_kind": source.get("retrieved_content_kind"),
            "verified_facts": [],
            "match_status": match["match_status"],
            "match_reasons": match["match_reasons"],
            "missing_information": match["missing_information"],
            "match_evidence": match["evidence"],
            "relevance_confidence": "unassessed",
            "relevance_basis": (
                "Catalog occupation association only; no official eligibility or benefit evidence was assessed."
                if catalog_matched
                else "No profile-specific relevance is supported by available evidence."
            ),
            "disclaimer": (
                "Directory candidate only. Page metadata retrieval does not verify scheme facts, "
                "eligibility, benefits, current availability, or individual fit."
            ),
        })
    return {
        "items": items,
        "status": "catalog_candidates" if items else "no_candidates",
        "verified_scheme_facts": False,
    }
