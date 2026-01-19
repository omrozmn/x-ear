
import os
import glob

# Assumes running from root x-ear directory
GENERATED_DIR = "apps/web/src/api/generated"
CLIENT_DIR = "apps/web/src/api/client"

def create_adapter_files():
    if not os.path.exists(CLIENT_DIR):
        os.makedirs(CLIENT_DIR)
        print(f"Created directory: {CLIENT_DIR}")

    # Get all subdirectories in generated
    if not os.path.exists(GENERATED_DIR):
        print(f"Error: {GENERATED_DIR} does not exist. CWD: {os.getcwd()}")
        return

    generated_items = os.listdir(GENERATED_DIR)
    domains = []

    for item in generated_items:
        item_path = os.path.join(GENERATED_DIR, item)
        if os.path.isdir(item_path):
            if item == "schemas":
                continue 
            
            # Check if it has a file named {item}.ts inside
            expected_file = os.path.join(item_path, f"{item}.ts")
            if os.path.exists(expected_file):
                domains.append(item)
            else:
                # Some might handle dashes differently? e.g. admin-parties -> admin-parties.ts ?
                # The index.ts showed matching names.
                # Let's print if skipped
                print(f"Skipping {item} - no matching {item}.ts found")
    
    # Create wrapper files
    for domain in domains:
        # Use simple single quotes to avoid format string issues with curly braces
        content = "export * from '@/api/generated/" + domain + "/" + domain + "';\n"
        file_path = os.path.join(CLIENT_DIR, f"{domain}.client.ts")
        with open(file_path, "w") as f:
            f.write(content)
        print(f"Created {file_path}")

    # Create index.ts
    index_content = ""
    for domain in domains:
        index_content += f"export * from './{domain}.client';\n"
    
    index_content += "export * from '@/api/generated/schemas';\n"
    index_content += "export * from '@/api/generated/aliases';\n" # Also aliases mentioned in reqs

    with open(os.path.join(CLIENT_DIR, "index.ts"), "w") as f:
        f.write(index_content)
    print("Created index.ts")

if __name__ == "__main__":
    create_adapter_files()
