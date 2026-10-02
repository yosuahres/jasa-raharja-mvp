"""Master data a tariff book carries besides its prices.

- Procedures: a row printed with one ICD-9-CM code in trailing brackets,
  "MUSCLE (UPPER LIMB), RUPTURE, REPAIR ... (83.74)", names a standard procedure.
  Rows with several codes or a cut-off code are left for a person to map.
- Facilities and specialists: a catalog item is detected when its name or one of
  its keywords appears as whole words in a row's name, section or parents. Each
  detection carries the first row it was seen on, as evidence for the reviewer.
"""

import re

_ICD9 = re.compile(r"\s*\(\s*(\d{2}(?:\.\d{1,2})?)\s*\)\s*$")
_PARENTHESES = re.compile(r"\s*\([^)]*\)")


def icd9_of(name: str) -> tuple[str, str] | None:
    """(code, name without the code) for a name ending in one ICD-9 code."""
    match = _ICD9.search(name)
    if not match:
        return None
    return match.group(1), name[: match.start()].strip(" ,.-")


def detect(rows: list[dict], items: list[dict]) -> list[dict]:
    """Catalog items (id, name, keywords) found in the rows: how many rows, and the text that matched first.

    A row's own name is better evidence than the heading it sits under, so the
    evidence comes from a name match when there is one.
    """
    found = []
    for item in items:
        pattern = _terms_pattern(item)
        if pattern is None:
            continue
        by_name, by_context = [], []
        for row in rows:
            if pattern.search(row["raw_name"].upper()):
                by_name.append((row, row["raw_name"]))
                continue
            context = next((t for t in [*row.get("parents", []), row.get("section") or ""] if t and pattern.search(t.upper())), None)
            if context:
                by_context.append((row, context))
        hits = by_name + by_context
        if hits:
            row, text = hits[0]
            found.append({"id": item["id"], "rows": len(hits), "page": row["page"], "evidence": text})
    return found


def _terms_pattern(item: dict) -> re.Pattern | None:
    # "Kamar Operasi (OK)" is searched as "KAMAR OPERASI"; keywords as written.
    terms = {_PARENTHESES.sub("", item["name"]).strip().upper(), *(k.strip().upper() for k in item.get("keywords") or [])}
    terms = sorted((t for t in terms if len(t) >= 2), key=len, reverse=True)
    if not terms:
        return None
    return re.compile(r"(?<![A-Z0-9])(?:" + "|".join(re.escape(t) for t in terms) + r")(?![A-Z0-9])")
