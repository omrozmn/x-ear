"""Flask routes archive (non-runtime).

Reason:
- This directory is kept only for historical reference during migration.
- Importing it into the FastAPI runtime would re-introduce Flask dependencies.

Expected outcome:
- Any accidental import fails fast and loudly.
"""

raise RuntimeError(
	"`routes_flask_archive` is an archive and must not be imported at runtime. "
	"Use FastAPI routers under `x-ear/apps/backend/routers/`."
)

