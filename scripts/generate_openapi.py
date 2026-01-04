
import yaml
import os
import re
import glob
import sys
from typing import Set, Tuple, List, Dict

class BlueprintResolver:
    """Resolves URL prefixes for Flask blueprints."""
    
    def __init__(self, backend_path: str):
        self.backend_path = backend_path
        self.blueprints = self._scan_blueprints()
        
    def _scan_blueprints(self) -> Dict[str, str]:
        """Scan app.py to find blueprint registrations and their URL prefixes."""
        blueprints = {}
        app_path = os.path.join(self.backend_path, 'app.py')
        
        if not os.path.exists(app_path):
            return blueprints
            
        try:
            with open(app_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Match: app.register_blueprint(bp_name, url_prefix='/api/prefix')
            pattern = r"register_blueprint\s*\(\s*(\w+)[^)]*url_prefix\s*=\s*['\"]([^'\"]+)['\"]"
            for match in re.finditer(pattern, content):
                bp_name = match.group(1)
                prefix = match.group(2)
                blueprints[bp_name] = prefix
                
        except Exception as e:
            print(f"Warning: Failed to scan blueprints: {e}")
            
        return blueprints
    
    def resolve_prefix(self, file_path: str, content: str) -> str:
        """Resolve URL prefix for a given route file."""
        # Try to find blueprint name definition
        bp_match = re.search(r"(\w+)\s*=\s*Blueprint", content)
        if bp_match:
            bp_variable_name = bp_match.group(1)
            # Find which blueprint definition corresponds to this file
            # This is tricky without static analysis, so we use a heuristic
            # We assume the variable name in app.py matches the imported name or the file structure
            
            # Simple heuristic: Checking imports in app.py for this file isn't easy.
            # Instead, check if any scanned blueprint prefix concept matches
            
            # Fallback: Many projects name blueprint variable same as file or folder
            fname = os.path.basename(file_path).replace('.py', '')
            
            # Try to map variable name to prefix directly if possible
            if bp_variable_name in self.blueprints:
                return self.blueprints[bp_variable_name]
                
            # Most robust fallback for this specific project structure based on `api_contract_analyzer.py` learnings:
            # It seems prefixes are standard like /api/<module>
            # Let's try to deduce from standard patterns if blueprint scan fails
            pass
            
        # Hardcoded fallback for known modules based on file naming (Project Specific)
        fname = os.path.basename(file_path)
        if 'auth' in fname: return '/api/auth'
        if 'admin' in fname and 'admin.py' not in fname: return '/api/admin' # Generic admin
        if 'admin.py' in fname: return '/api/admin'
        if 'inventory' in fname: return '/api/inventory'
        if 'users' in fname: return '/api/users'
        if 'patients' in fname: return '/api/patients'
        if 'campaigns' in fname: return '/api/campaigns'
        if 'branches' in fname: return '/api/branches'
        
        return ''

class OpenAPIGenerator:
    def __init__(self, openapi_path: str, backend_path: str):
        self.openapi_path = openapi_path
        self.backend_path = backend_path
        self.resolver = BlueprintResolver(backend_path)
        self.existing_endpoints: Set[Tuple[str, str]] = set() # (method, path)
        self.found_routes: List[Dict] = []
        
    def load_existing(self):
        """Load existing OpenAPI endpoints."""
        if not os.path.exists(self.openapi_path):
            print(f"Error: OpenAPI file not found at {self.openapi_path}")
            return

        with open(self.openapi_path, 'r', encoding='utf-8') as f:
            spec = yaml.safe_load(f)
            
        for path, methods in spec.get('paths', {}).items():
            for method in methods:
                if method.lower() in ['get', 'post', 'put', 'delete', 'patch']:
                     # Normalize: /api/users/{id} -> /api/users/<id>
                    normalized = re.sub(r'\{(\w+)\}', r'<\1>', path)
                    self.existing_endpoints.add((method.upper(), normalized))
                    
    def scan_backend(self):
        """Scan backend for routes."""
        routes_path = os.path.join(self.backend_path, 'routes')
        for py_file in glob.glob(f"{routes_path}/**/*.py", recursive=True):
             with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()
                self._extract_routes(content, py_file)
                
    def _extract_routes(self, content: str, file_path: str):
        prefix = self.resolver.resolve_prefix(file_path, content)
        
        # Matches: @bp.route('/path', methods=['POST']) def my_func():
        # Capturing: 1=path, 2=methods, 3=func_name
        pattern = r"@\w+\.route\s*\(\s*['\"]([^'\"]+)['\"](?:,\s*methods=\[([^\]]+)\])?\s*\)\s*(?:@[\w]+\s*\(\s*.*\s*\)\s*)*def\s+(\w+)\s*\("
        
        for match in re.finditer(pattern, content):
            path = match.group(1)
            methods_str = match.group(2)
            func_name = match.group(3)
            
            # Resolve full path
            full_path = (prefix + path).replace('//', '/')
            
            # Resolve methods
            methods = ['GET']
            if methods_str:
                methods = re.findall(r"['\"](\w+)['\"]", methods_str)
                
            for method in methods:
                method = method.upper()
                
                # Check for Docstring (Summary) extraction - Simple lookahead
                # This is a basic implementation; robust parsing would use AST
                summary = f"Auto-generated for {func_name}"
                
                self.found_routes.append({
                    'method': method,
                    'path': full_path,
                    'function': func_name,
                    'summary': summary,
                    'file': os.path.basename(file_path)
                })

    def generate_report(self):
        print(f"--- Analysis Report ---")
        print(f"Existing OpenAPI Endpoints: {len(self.existing_endpoints)}")
        print(f"Found Backend Routes: {len(self.found_routes)}")
        
        missing = []
        for route in self.found_routes:
            # Check if exists
            # Normalize backend path: /api/users/<id> is already in <id> format mostly
            # But sometimes people write <string:id> or <int:id>
            
            normalized_backend = re.sub(r'<[^>]*:([^>]+)>', r'<\1>', route['path']) # <int:id> -> <id>
            
            # Double check existing normalization
            # existing stored as upper METHOD, /api/users/<id>
            
            if (route['method'], normalized_backend) not in self.existing_endpoints:
                missing.append(route)
                
        print(f"Missing Endpoints in OpenAPI: {len(missing)}")
        print("\n--- Missing Routes List ---")
        for m in missing:
            print(f"[{m['method']}] {m['path']} (func: {m['function']})")
            
        return missing

    def apply_updates(self, missing_routes):
        """
        Updates the OpenAPI YAML file with missing routes.
        This is a safe append operation.
        """
        with open(self.openapi_path, 'r', encoding='utf-8') as f:
            spec = yaml.safe_load(f)
            
        if 'paths' not in spec:
            spec['paths'] = {}
            
        count = 0
        for route in missing_routes:
            # Convert backend path <id> to OpenAPI {id}
            openapi_path = re.sub(r'<[^>]*:?([^>]+)>', r'{\1}', route['path'])
            method_lower = route['method'].lower()
            
            if openapi_path not in spec['paths']:
                spec['paths'][openapi_path] = {}
                
            if method_lower in spec['paths'][openapi_path]:
                continue # Safety skip if it somehow exists
                
            # Construct Operation Object
            operation = {
                'summary': route['summary'].replace('_', ' ').title(),
                'operationId': route['function'],
                'tags': ['AutoGenerated'],
                'responses': {
                    '200': {
                        'description': 'Success',
                        'content': {'application/json': {'schema': {'type': 'object'}}}
                    }
                }
            }
            
            # Add parameters if {} in path
            params = re.findall(r'\{(\w+)\}', openapi_path)
            if params:
                operation['parameters'] = []
                for p in params:
                    operation['parameters'].append({
                        'name': p,
                        'in': 'path',
                        'required': True,
                        'schema': {'type': 'string'}
                    })
            
            spec['paths'][openapi_path][method_lower] = operation
            count += 1
            
        with open(self.openapi_path, 'w', encoding='utf-8') as f:
            yaml.dump(spec, f, sort_keys=False, allow_unicode=True)
            
        print(f"\n✅ Successfully added {count} new endpoints to {self.openapi_path}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply changes to OpenAPI file")
    parser.add_argument("--openapi", required=True)
    parser.add_argument("--backend", required=True)
    args = parser.parse_args()
    
    gen = OpenAPIGenerator(args.openapi, args.backend)
    gen.load_existing()
    gen.scan_backend()
    missing = gen.generate_report()
    
    if args.apply:
        gen.apply_updates(missing)
    else:
        print("\nRun with --apply to write these changes to the file.")
