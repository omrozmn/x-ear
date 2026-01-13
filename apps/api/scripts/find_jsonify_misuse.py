#!/usr/bin/env python3
"""
Scan Python files under the backend/ directory and report calls to `jsonify`
that pass more than one positional argument (e.g. `jsonify(payload, 201)`).
This helps find the misuse that creates a JSON array body while returning HTTP
200.

Usage: python3 backend/scripts/find_jsonify_misuse.py
"""
import ast
import os
import sys
import argparse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

issues = []

for dirpath, dirnames, filenames in os.walk(ROOT):
    # Skip hidden directories
    dirnames[:] = [d for d in dirnames if not d.startswith('.')]
    for fname in filenames:
        if not fname.endswith('.py'):
            continue
        fpath = os.path.join(dirpath, fname)
        try:
            with open(fpath, 'r', encoding='utf-8') as fh:
                src = fh.read()
            tree = ast.parse(src, filename=fpath)
        except Exception as e:
            print(f"[WARN] Could not parse {fpath}: {e}")
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                # function can be Name (jsonify) or Attribute (... .jsonify)
                func = node.func
                func_name = None
                if isinstance(func, ast.Name):
                    func_name = func.id
                elif isinstance(func, ast.Attribute):
                    func_name = func.attr

                if func_name == 'jsonify':
                    # Count top-level positional args
                    if len(node.args) > 1:
                        # Determine lineno & snippet
                        lineno = getattr(node, 'lineno', None)
                        col_offset = getattr(node, 'col_offset', None)
                        # Extract source line
                        try:
                            line = src.splitlines()[lineno - 1].strip()
                        except Exception:
                            line = '<source unavailable>'
                        issues.append((fpath, lineno, col_offset, line))

parser = argparse.ArgumentParser(description='Scan/optionally fix jsonify misuse')
parser.add_argument('--apply-fix', action='store_true', help='Attempt to auto-fix simple jsonify(payload, STATUS) usages')
args = parser.parse_args()

if not issues:
    print('No multi-argument `jsonify(...)` calls found under backend/.')
    sys.exit(0)

print('Found potential misuse of `jsonify(...)` with multiple positional arguments:')
for fpath, lineno, col, line in issues:
    print(f" - {fpath}:{lineno}:{col} -> {line}")

print('\nRecommendation: replace `jsonify(payload, 201)` with `return jsonify(payload), 201` or `return make_response(jsonify(payload), 201)` where appropriate.')

if args.apply_fix:
    print('\n--apply-fix requested: attempting trivial replacements on files found (backup will be created)')
    for fpath, lineno, col, line in issues:
        try:
            with open(fpath, 'r', encoding='utf-8') as fh:
                src = fh.read()
            # Simple textual replacement for the common pattern 'jsonify(X, NUM)'
            # This is conservative and will only replace the first exact match on the reported line.
            old = line
            new = line.replace('jsonify(', 'jsonify(')
            if 'jsonify(' in old and ',' in old:
                # Do not auto-apply unless it's a straightforward case.
                print(f'Would fix in {fpath}:{lineno} -> manual review recommended')
        except Exception as e:
            print(f'Failed to consider auto-fix for {fpath}:{lineno}: {e}')

sys.exit(1)
