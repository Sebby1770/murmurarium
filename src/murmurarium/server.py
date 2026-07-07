"""Tiny HTTP server for the signal lab app."""

from __future__ import annotations

import argparse
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .simulation import build_transmission


PROJECT_ROOT = Path(__file__).resolve().parents[2]
WEB_ROOT = PROJECT_ROOT / "web"


class SignalLabHandler(SimpleHTTPRequestHandler):
    """Serve static files and the signal JSON endpoint."""

    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("X-Spectral-Switchboard", "listening")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/transmission":
            self._handle_transmission(parsed.query)
            return
        if parsed.path == "/health":
            self._send_json({"ok": True, "name": "spectral-switchboard", "version": "0.2.0"})
            return
        super().do_GET()

    def _handle_transmission(self, query: str) -> None:
        params = parse_qs(query)
        seed = params.get("seed", ["numbers station for houseplants"])[0]
        packets = _parse_int(params.get("packets", ["18"])[0], default=18)
        frequency = _parse_float(params.get("frequency", ["7.13"])[0], default=7.13)
        noise = _parse_float(params.get("noise", ["0.32"])[0], default=0.32)
        t = _parse_float(params.get("t", ["0"])[0], default=0.0)
        mode = params.get("mode", ["voice"])[0]
        self._send_json(
            build_transmission(
                seed=seed,
                packets=packets,
                frequency=frequency,
                noise=noise,
                t=t,
                mode=mode,
            )
        )

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
        print(f"[signal-lab] {self.address_string()} - {format % args}")


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
    return ThreadingHTTPServer((host, port), SignalLabHandler)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Spectral Switchboard web app.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind.")
    parser.add_argument("--port", default=8000, type=int, help="Port to bind.")
    args = parser.parse_args()

    server = create_server(args.host, args.port)
    url = f"http://{args.host}:{args.port}"
    print(f"Spectral Switchboard is listening at {url}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nSpectral Switchboard is quiet.")
    finally:
        server.server_close()
