
import os
import re

# Assumes running from root x-ear directory
SRC_DIR = "apps/web/src"
GENERATED_DIR_REL = "api/generated"
CLIENT_DIR_REL = "api/client"

def migrate_imports():
    print(f"Scanning {SRC_DIR} for imports to migrate...")
    
    # Regex to match imports from @/api/generated/...
    # Captures the quote used
    import_regex = re.compile(r"from (['\"])@/api/generated/([^'\"]+)(['\"])")
    
    # Files to modify
    files_modified = 0
    
    for root, dirs, files in os.walk(SRC_DIR):
        # Skip generated and client directories
        # Normalize paths to handle potential differences
        rel_path = os.path.relpath(root, SRC_DIR)
        if rel_path.startswith(GENERATED_DIR_REL) or rel_path.startswith(CLIENT_DIR_REL):
            continue
            
        for file in files:
            if not file.endswith(('.ts', '.tsx')):
                continue
                
            file_path = os.path.join(root, file)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            
            def replace_match(match):
                quote = match.group(1)
                path_suffix = match.group(2)
                
                # Check if it's strictly a generated import
                # We want to replace almost everything with @/api/client
                # But let's see if we should keep subpaths?
                # The prompt implies using the adapter layer which uses barrel or specific files.
                # Simplest is replacing with @/api/client which is the barrel.
                
                return f"from {quote}@/api/client{quote}"

            new_content = import_regex.sub(replace_match, content)
            
            if new_content != content:
                print(f"Modifying {file_path}")
                files_modified += 1
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
    
    print(f"Migration complete. Modified {files_modified} files.")

if __name__ == "__main__":
    migrate_imports()
