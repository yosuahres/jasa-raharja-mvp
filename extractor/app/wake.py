"""An HTTP endpoint the dashboard calls when it queues a book, so the worker starts on it at once.

    POST /wake     Authorization: Bearer <EXTRACTOR_SECRET>   → 202, the worker checks the queue now
    GET  /health                                              → 200

It only wakes the worker: the book is still claimed from the queue in Supabase, so one
worker runs at a time and a book queued while this endpoint was unreachable is picked up
by the fallback poll.
"""

import hmac
import logging
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

log = logging.getLogger("wake")


def serve(port: int, secret: str, wake: threading.Event) -> None:
    """Answer on `port` in a background thread; a valid /wake sets `wake`."""

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            self._reply(200 if self.path == "/health" else 404)

        def do_POST(self) -> None:
            if self.path != "/wake":
                return self._reply(404)
            token = self.headers.get("Authorization", "").removeprefix("Bearer ")
            if not hmac.compare_digest(token.encode(), secret.encode()):
                return self._reply(401)
            wake.set()
            self._reply(202)

        def _reply(self, status: int) -> None:
            self.send_response(status)
            self.send_header("Content-Length", "0")
            self.end_headers()

        def log_message(self, format: str, *args) -> None:  # health checks shouldn't fill the log
            pass

    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    log.info("wake endpoint on port %d", port)
