"""Tiny HTTP server for the Murmurarium app."""

from __future__ import annotations

import argparse
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .simulation import build_terrarium


PROJECT_ROOT = Path(__file__).resolve().parents[2]
WEB_ROOT = PROJECT_ROOT / "web"


class MurmurariumHandler(SimpleHTTPRequestHandler):
    """Serve static files and the terrarium JSON endpoint."""

    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("X-Murmurarium", "awake")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/terrarium":
            self._handle_terrarium(parsed.query)
            return
        if parsed.path == "/health":
            self._send_json({"ok": True, "name": "murmurarium"})
            return
        super().do_GET()

    def _handle_terrarium(self, query: str) -> None:
        params = parse_qs(query)
        seed = params.get("seed", ["murmurarium"])[0]
        count = _parse_int(params.get("count", ["44"])[0], default=44)
        t = _parse_float(params.get("t", ["0"])[0], default=0.0)
        gravity = _parse_float(params.get("gravity", ["0.62"])[0], default=0.62)
        self._send_json(build_terrarium(seed=seed, count=count, t=t, gravity=gravity))

    def _send_json(self, payload: dict[str, object]) -> None:
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        print(f"[murmurarium] {self.address_string()} - {format % args}")


def _parse_int(value: str, default: int) -> int:
    try:
        return int(value)
    except ValueError:
        return default


def _parse_float(value: str, default: float) -> float:
    try:
        return float(value)
    except ValueError:
        return default


def create_server(host: str = "127.0.0.1", port: int = 8000) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), MurmurariumHandler)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Murmurarium web app.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind.")
    parser.add_argument("--port", default=8000, type=int, help="Port to bind.")
    args = parser.parse_args()

    server = create_server(args.host, args.port)
    url = f"http://{args.host}:{args.port}"
    print(f"Murmurarium is humming at {url}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nMurmurarium is sleeping.")
    finally:
        server.server_close()
