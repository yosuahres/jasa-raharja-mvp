"""A minimal Supabase client on the standard library: table rows over PostgREST, files from Storage.

Uses the project's secret (service-role) key, which bypasses row-level security,
so it belongs on the machine running the worker and nowhere else.
"""

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TIMEOUT_SECONDS = 120
# PostgREST returns at most this many rows per request.
PAGE_SIZE = 1000


class SupabaseError(Exception):
    pass


class Supabase:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.headers = {"apikey": key}
        # Legacy keys are JWTs and go in Authorization too; new sb_secret_ keys go in apikey only.
        if not key.startswith("sb_"):
            self.headers["Authorization"] = f"Bearer {key}"

    @classmethod
    def from_env(cls) -> "Supabase":
        _load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise SupabaseError("Set SUPABASE_URL and SUPABASE_SECRET_KEY (in the environment or extractor/.env).")
        return cls(url, key)

    # ------------------------------------------------------------ tables

    def select(self, table: str, params: dict[str, str]) -> list[dict]:
        return self._request("GET", f"/rest/v1/{table}", params)

    def select_all(self, table: str, params: dict[str, str]) -> list[dict]:
        """Every matching row, fetched a page at a time."""
        rows: list[dict] = []
        while True:
            page = self.select(table, {**params, "limit": str(PAGE_SIZE), "offset": str(len(rows))})
            rows.extend(page)
            if len(page) < PAGE_SIZE:
                return rows

    def insert(self, table: str, rows: list[dict], skip_duplicates_on: str | None = None) -> None:
        """Insert rows; with `skip_duplicates_on`, rows clashing on that unique column are left out."""
        if not rows:
            return
        if skip_duplicates_on:
            self._request(
                "POST",
                f"/rest/v1/{table}",
                {"on_conflict": skip_duplicates_on},
                body=rows,
                prefer="resolution=ignore-duplicates,return=minimal",
            )
        else:
            self._request("POST", f"/rest/v1/{table}", body=rows, prefer="return=minimal")

    def upsert(self, table: str, rows: list[dict], on_conflict: str) -> None:
        """Insert rows, overwriting the ones that clash on `on_conflict`."""
        if rows:
            self._request(
                "POST", f"/rest/v1/{table}", {"on_conflict": on_conflict}, body=rows, prefer="resolution=merge-duplicates,return=minimal"
            )

    def update(self, table: str, filters: dict[str, str], values: dict) -> list[dict]:
        """Rows that matched and were updated; empty when the filters matched nothing."""
        return self._request("PATCH", f"/rest/v1/{table}", filters, body=values, prefer="return=representation")

    def delete(self, table: str, filters: dict[str, str]) -> None:
        self._request("DELETE", f"/rest/v1/{table}", filters, prefer="return=minimal")

    # ------------------------------------------------------------ storage

    def download(self, bucket: str, path: str) -> bytes:
        quoted = urllib.parse.quote(path)
        return self._send(urllib.request.Request(f"{self.url}/storage/v1/object/{bucket}/{quoted}", headers=self.headers))

    # ------------------------------------------------------------ http

    def _request(self, method: str, path: str, params: dict[str, str] | None = None, body=None, prefer: str | None = None):
        query = f"?{urllib.parse.urlencode(params)}" if params else ""
        headers = {**self.headers, "Content-Type": "application/json"}
        if prefer:
            headers["Prefer"] = prefer
        data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
        payload = self._send(urllib.request.Request(f"{self.url}{path}{query}", data=data, headers=headers, method=method))
        return json.loads(payload) if payload else []

    def _send(self, request: urllib.request.Request) -> bytes:
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors="replace")
            raise SupabaseError(f"{request.get_method()} {request.full_url.split('?')[0]} → {error.code}: {detail}") from error


def _load_dotenv(path: Path) -> None:
    """KEY=VALUE lines from a .env file, without overriding the real environment."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))
