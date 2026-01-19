#!/bin/bash

# Fix generated API imports by creating index.ts files in each tag directory

GENERATED_DIR="src/api/generated"

echo "🔧 Creating index.ts files in generated API directories..."

# Find all directories in generated/ (excluding schemas and root)
for dir in "$GENERATED_DIR"/*/ ; do
    if [ -d "$dir" ]; then
        dirname=$(basename "$dir")
        
        # Skip schemas directory
        if [ "$dirname" = "schemas" ]; then
            continue
        fi
        
        # Check if there's a .ts file with the same name as the directory
        ts_file="${dir}${dirname}.ts"
        
        if [ -f "$ts_file" ]; then
            index_file="${dir}index.ts"
            echo "  📄 Creating $index_file"
            echo "export * from './${dirname}.ts';" > "$index_file"
        fi
    fi
done

echo "✅ Done! All index.ts files created."
