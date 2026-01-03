#!/usr/bin/env python3
"""Remove duplicate path definitions from OpenAPI spec"""
import re

# Read the file
with open('openapi.yaml', 'r') as f:
    lines = f.readlines()

# Track seen paths and lines to remove
seen_paths = {}
lines_to_remove = set()
current_path = None
path_start_line = None

for i, line in enumerate(lines):
    # Check if this is a path definition (starts with "  /api/")
    if re.match(r'^  /api/', line):
        path = line.strip().rstrip(':')
        current_path = path
        path_start_line = i
        
        if path in seen_paths:
            print(f"Duplicate found: {path}")
            print(f"  First occurrence: line {seen_paths[path] + 1}")
            print(f"  Duplicate at: line {i + 1}")
            print(f"  Keeping first, removing duplicate")
            
            # Mark this path and its content for removal
            # We'll remove from this line until the next path or end of paths section
            lines_to_remove.add(i)
        else:
            seen_paths[path] = i

# Find the end of each duplicate path block
i = 0
while i < len(lines):
    if i in lines_to_remove:
        # This is the start of a duplicate path
        # Remove lines until we hit the next path definition
        j = i + 1
        while j < len(lines) and not re.match(r'^  /api/', lines[j]):
            lines_to_remove.add(j)
            j += 1
        i = j
    else:
        i += 1

# Write the cleaned file
with open('openapi.yaml', 'w') as f:
    for i, line in enumerate(lines):
        if i not in lines_to_remove:
            f.write(line)

print(f"\nRemoved {len(lines_to_remove)} lines")
print("✅ OpenAPI spec cleaned!")
