"""Automated CLI deployment tool for Resonance SER Platform.
Deploys directly to Hugging Face Spaces (Free 16GB RAM) using huggingface_hub.
No git commands or complex setup required.
"""
import argparse
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Deploy Resonance SER to Hugging Face Spaces")
    parser.add_argument("--token", help="Hugging Face Access Token (with write permission)")
    parser.add_argument("--space-name", default="resonance-ser", help="Name of the Space (default: resonance-ser)")
    parser.add_argument("--private", action="store_true", help="Set Space to private")
    args = parser.parse_args()

    try:
        from huggingface_hub import HfApi, get_token
    except ImportError:
        print("Error: huggingface_hub is not installed. Run: pip install huggingface_hub")
        sys.exit(1)

    token = args.token or get_token()
    if not token:
        print("=" * 68)
        print("  Resonance SER — Direct Cloud Deployment Tool                     ")
        print("=" * 68)
        print("\nA Hugging Face Access Token (write permission) is required.")
        print("If you don't have one:")
        print("  1. Sign up / log in at: https://huggingface.co/join")
        print("  2. Create a Write token at: https://huggingface.co/settings/tokens")
        print("=" * 68)
        try:
            token = input("\nEnter your Hugging Face Token (starts with hf_): ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAborted.")
            sys.exit(1)
        if not token:
            print("Error: Token cannot be empty.")
            sys.exit(1)

    print("\n[1/4] Authenticating with Hugging Face...")
    api = HfApi(token=token)
    try:
        user_info = api.whoami()
        username = user_info["name"]
        print(f"       Logged in as: {username}")
    except Exception as exc:
        print(f"Error: Invalid token or authentication failed: {exc}")
        sys.exit(1)

    space_id = f"{username}/{args.space_name}"
    space_url = f"https://huggingface.co/spaces/{space_id}"
    app_url = f"https://{username.lower()}-{args.space_name.lower()}.hf.space"

    print(f"\n[2/4] Ensuring Space exists at {space_url}...")
    try:
        api.create_repo(
            repo_id=space_id,
            repo_type="space",
            space_sdk="docker",
            private=args.private,
            exist_ok=True,
        )
        print("       Space repository initialized with Docker runtime (Free 16 GB RAM).")
    except Exception as exc:
        print(f"       Notice: {exc}")

    root_dir = Path(__file__).resolve().parents[1]
    print(f"\n[3/4] Preparing repository and deep learning models from {root_dir}...")
    
    # Files to exclude from upload
    ignore_patterns = [
        "node_modules/*",
        ".git/*",
        ".pytest_cache/*",
        "__pycache__/*",
        "*.pyc",
        "logs/*",
        "screenshots/*",
        "collector/*",
        "prep_guides/*",
        "samples/*",
        "*.bat",
        "*.ps1",
        ".gemini/*",
    ]

    print("\n[4/4] Uploading full application and all AI models to Hugging Face...")
    print("       (This uploads frontend dist, FastAPI backend, and all 5 model weights)")
    try:
        api.upload_folder(
            folder_path=str(root_dir),
            repo_id=space_id,
            repo_type="space",
            ignore_patterns=ignore_patterns,
            commit_message="Deploy Resonance SER Platform with full deep learning models",
        )
    except Exception as exc:
        print(f"\nUpload error: {exc}")
        sys.exit(1)

    print("\n" + "=" * 68)
    print("  DEPLOYMENT UPLOAD SUCCESSFUL!                                    ")
    print("=" * 68)
    print(f"  Space Dashboard:  {space_url}")
    print(f"  Live Web App URL: {app_url}")
    print("\n  Hugging Face is building your container (takes ~2-3 minutes).")
    print("  All 5 AI models will be active and running on 16 GB RAM!")
    print("=" * 68 + "\n")


if __name__ == "__main__":
    main()
