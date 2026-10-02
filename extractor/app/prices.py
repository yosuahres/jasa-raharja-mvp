"""Parse Indonesian-formatted prices into integer rupiah.

Prices are read verbatim from the PDF; anything that isn't clearly a number
returns None so the row is flagged for review instead of guessed.
"""

import re

_MULTIPLIERS = {"rb": 1_000, "ribu": 1_000, "k": 1_000, "jt": 1_000_000, "juta": 1_000_000}


def parse_idr(raw: str | None) -> int | None:
    if raw is None:
        return None
    text = raw.strip().lower()
    if text in {"", "-", "--", "0", "n/a", "na"}:
        return None

    text = re.sub(r"^rp\.?\s*", "", text)
    text = text.replace(" ", "")
    text = re.sub(r",-+$|\.-+$|-+$", "", text)

    multiplier = 1
    suffix = re.search(r"(rb|ribu|k|jt|juta)$", text)
    if suffix:
        multiplier = _MULTIPLIERS[suffix.group(1)]
        text = text[: suffix.start()]

    if not re.fullmatch(r"[\d.,]+", text):
        return None

    if multiplier > 1:
        # "1,5jt" / "1.5jt" → decimal separator either way
        number = float(text.replace(",", "."))
        return round(number * multiplier)

    return _parse_plain(text)


def _parse_plain(text: str) -> int | None:
    # Indonesian: "." thousands, "," decimals. Some books use US style.
    if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d{1,2})?", text):
        return int(text.split(",")[0].replace(".", ""))
    if re.fullmatch(r"\d{1,3}(,\d{3})+(\.\d{1,2})?", text):
        return int(text.split(".")[0].replace(",", ""))
    if re.fullmatch(r"\d+(,\d{1,2})?", text):
        return int(text.split(",")[0])
    if re.fullmatch(r"\d+\.\d{1,2}", text):
        return int(text.split(".")[0])
    return None
