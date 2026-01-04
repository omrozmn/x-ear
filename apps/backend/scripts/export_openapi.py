import json
import os
import sys
from pathlib import Path


def main() -> None:
    # Importing the app is the single source of truth for OpenAPI generation.
    # This script is meant to be run from repo root or apps/backend.
    backend_dir = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_dir))
    from main import app

    output_path = os.environ.get("OPENAPI_OUTPUT", "openapi.json")
    out_file = Path(output_path).expanduser().resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)

    schema = app.openapi()

    # Ensure deterministic output (stable key ordering)
    out_file.write_text(
        json.dumps(schema, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
