import json
import re

def get_script_endpoints(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Simple regex to find test_endpoint calls
    matches = re.findall(r'test_endpoint\s+"([^"]+)"\s+"([^"]+)"', content)
    return set((method, path.split('?')[0]) for method, path in matches)

def compare():
    with open('extracted_endpoints.json', 'r') as f:
        extracted = json.load(f)
    
    script_endpoints_511 = get_script_endpoints('/Users/ozmen/Desktop/x-ear web app/x-ear/test_all_511_endpoints.sh')
    script_endpoints_comp = get_script_endpoints('/Users/ozmen/Desktop/x-ear web app/x-ear/test_all_endpoints_comprehensive.sh')
    
    all_extracted = set((e['method'], e['path']) for e in extracted)
    
    missing_in_511 = all_extracted - script_endpoints_511
    missing_in_comp = all_extracted - script_endpoints_comp
    
    print(f"Total extracted: {len(all_extracted)}")
    print(f"In 511 script: {len(script_endpoints_511)}")
    print(f"Missing in 511: {len(missing_in_511)}")
    print(f"In Comp script: {len(script_endpoints_comp)}")
    print(f"Missing in Comp: {len(missing_in_comp)}")
    
    # Save missing to a file for analysis
    with open('missing_endpoints.json', 'w') as f:
        json.dump(list(missing_in_511), f, indent=2)

if __name__ == "__main__":
    compare()
