import yaml
import json

def extract_endpoints(file_path):
    with open(file_path, 'r') as f:
        spec = yaml.safe_load(f)
    
    endpoints = []
    paths = spec.get('paths', {})
    for path, methods in paths.items():
        for method, details in methods.items():
            if method not in ['get', 'post', 'put', 'delete', 'patch']:
                continue
            
            endpoint_info = {
                'path': path,
                'method': method.upper(),
                'summary': details.get('summary', ''),
                'parameters': details.get('parameters', []),
                'requestBody': details.get('requestBody', {})
            }
            endpoints.append(endpoint_info)
    
    return endpoints

if __name__ == "__main__":
    file_path = "/Users/ozmen/Desktop/x-ear web app/x-ear/openapi.yaml"
    endpoints = extract_endpoints(file_path)
    print(f"Total endpoints found: {len(endpoints)}")
    
    with open("extracted_endpoints.json", "w") as f:
        json.dump(endpoints, f, indent=2)
