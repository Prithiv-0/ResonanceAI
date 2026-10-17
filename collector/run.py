#!/usr/bin/env python3
"""
RESONANCE Studio Booth — Unified Server Runner

Launches the unified fullstack server (FastAPI backend + React frontend).
Detects local network IP and displays instructions for local and remote HTTPS access.
"""

import argparse
import os
import socket
import subprocess
import sys
from pathlib import Path

COLLECTOR_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = COLLECTOR_DIR / "frontend"
BACKEND_DIR = COLLECTOR_DIR / "backend"
DIST_DIR = FRONTEND_DIR / "dist"


def get_local_ips() -> list[str]:
    """Discover local LAN IP addresses."""
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        ips.append(primary_ip)
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if ip not in ips and not ip.startswith("127."):
                ips.append(ip)
    except Exception:
        pass

    return ips or ["127.0.0.1"]


def ensure_frontend_build(force: bool = False):
    """Ensure that the React frontend is compiled into dist/."""
    index_html = DIST_DIR / "index.html"
    if force or not index_html.exists():
        print("\n[Studio Booth] Building frontend for production...")
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(FRONTEND_DIR),
            shell=True,
        )
        if result.returncode != 0:
            print("[Warning] Frontend build returned an error. Using existing build if available.")
        else:
            print("[Studio Booth] Frontend build complete.\n")


def print_banner(host: str, port: int, lan_ips: list[str]):
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    print("=" * 68)
    print("       RESONANCE STUDIO BOOTH -- SPEECH EMOTION COLLECTOR       ")
    print("=" * 68)
    print(f"\n  [OK] Local access:       http://localhost:{port}")
    for ip in lan_ips:
        print(f"  [OK] Network / Wi-Fi:    http://{ip}:{port}")
    
    print("\n  [!] REMOTE / MOBILE PARTICIPANTS (HTTPS REQUIRED):")
    print("      Mobile browsers block microphone access on unencrypted HTTP.")
    print("      To share a link with anyone on any phone, run in a separate terminal:")
    print(f"         cloudflared tunnel --url http://localhost:{port}")
    print(f"      OR:")
    print(f"         npx localtunnel --port {port}")
    print("      Share the resulting https:// URL with your participants.")
    print("\n  [*] Press Ctrl+C to stop the server.")
    print("=" * 68 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Run the Resonance Studio Booth unified server.")
    parser.add_argument("--host", default="0.0.0.0", help="Host address (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    parser.add_argument("--build", action="store_true", help="Force rebuild of frontend before starting")
    parser.add_argument("--reload", action="store_true", help="Enable uvicorn hot reload")
    args = parser.parse_args()

    ensure_frontend_build(force=args.build)

    lan_ips = get_local_ips()
    print_banner(args.host, args.port, lan_ips)

    os.chdir(str(BACKEND_DIR))
    sys.path.insert(0, str(BACKEND_DIR))

    try:
        import uvicorn
        uvicorn.run("main:app", host=args.host, port=args.port, reload=args.reload)
    except KeyboardInterrupt:
        print("\n[Studio Booth] Server stopped.")


if __name__ == "__main__":
    main()
