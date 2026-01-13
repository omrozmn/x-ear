import re

SLUG_RE = re.compile(r'^[a-z0-9-_]+$')
ROLE_RE = re.compile(r'^[A-Za-z0-9_\-:]+$')
PERMISSION_RE = re.compile(r'^[a-z0-9:_\-]+$')


def normalize_slug(value: str) -> str:
    if not value:
        return ''
    v = value.strip().lower().replace(' ', '-')
    # collapse multiple hyphens
    v = re.sub(r'-+', '-', v)
    return v


def is_valid_slug(value: str) -> bool:
    if not value:
        return False
    return bool(SLUG_RE.match(value))


def is_valid_role_name(value: str) -> bool:
    return bool(value) and bool(ROLE_RE.match(value))


def is_valid_permission_name(value: str) -> bool:
    return bool(value) and bool(PERMISSION_RE.match(value))
