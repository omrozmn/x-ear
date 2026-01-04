
import sys
import os
import re
import glob
import ast
from typing import Dict, List, Tuple

# Add backend to path to import permissions_map
BACKEND_PATH = os.path.join(os.getcwd(), 'apps', 'backend')
CONFIG_PATH = os.path.join(BACKEND_PATH, 'config')
sys.path.append(CONFIG_PATH)

try:
    from permissions_map import ENDPOINT_PERMISSIONS
except ImportError:
    print("Error: Could not import ENDPOINT_PERMISSIONS from permissions_map.py")
    sys.exit(1)

class PermissionAuditor:
    def __init__(self, backend_path: str):
        self.backend_path = backend_path
        self.mismatches = []
        # Re-using simple Blueprint logic or just assuming prefixes based on standard pattern
        self.blueprints = {
            'auth': '/auth',
            'branches': '/branches',
            'patients': '/patients', # or /api/patients? Unified routes in this backend seem to map to both often, or simple names
            # Actually, standardizing on what generate_openapi found:
            # Most files map to /api/<module> or Just /<module> 
            # But permissions_map has full paths.
        }
        
    def resolve_path(self, file_path: str, route_path: str) -> str:
        # Simplistic resolution based on file location
        # If in routes/branches.py -> /branches... but wait
        # branches.py: @branches_bp.route('/branches') -> /branches? Or /api/branches?
        # Let's look at app.py registration if possible, or just exact match search in map keys
        
        # Heuristic: the Permissions Map usually contains the FULL path starting with /
        # We need to construct the likely full path from the decorator.
        
        # Let's assume most blueprints are registered with prefix /api except 'auth' ...
        # But wait, permissions_map has: ('GET', '/branches'): 'branches.view'
        # And ('GET', '/api/branches'): 'settings.view' (?)
        
        # This double mapping (legacy vs new) is tricky.
        # But the Code (branches.py) only has ONE decorator: @branches_bp.route('/branches', ...)
        # It doesn't seemingly have /api/branches prefix inside the file.
        # It relies on how app.py registers it.
        
        # If I can't determine prefix 100%, I will try to find a suffix match in permissions_map
        return route_path # Return relative for now, fuzzy match later

    def scan_codebase(self):
        routes_path = os.path.join(self.backend_path, 'routes')
        for py_file in glob.glob(f"{routes_path}/**/*.py", recursive=True):
            with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()
                self._examine_file(content, py_file)
                
    def _examine_file(self, content: str, file_path: str):
        # We need to parse Method + Path from @bp.route
        # And Resource + Action from @unified_access associated with it
        
        # Using regex to find blocks of decorators + function def
        # Matches:
        # @bp.route(...)
        # @unified_access(...)
        # def func():
        
        # Flexible regex to capture decorator stack
        
        route_pattern = r"@(\w+)\.route\s*\(\s*['\"]([^'\"]+)['\"](?:,\s*methods=\[([^\]]+)\])?"
        
        # We iterate line by line to maintain context
        lines = content.splitlines()
        current_route = None
        current_ua = None
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Check for Route
            route_match = re.search(route_pattern, line)
            if route_match:
                path = route_match.group(2)
                methods_str = route_match.group(3)
                methods = ['GET']
                if methods_str:
                    methods = re.findall(r"['\"](\w+)['\"]", methods_str)
                
                # Normalize methods to UPPER
                methods = [m.upper() for m in methods]
                
                current_route = {
                    'path': path,
                    'methods': methods,
                    'line': i + 1,
                    # Guess prefix based on filename
                    'file': os.path.basename(file_path),
                    'bp': route_match.group(1)
                }
                current_ua = None # Reset UA for new route
                
            # Check for Unified Access
            # @unified_access(resource='branches', action='read')
            # @unified_access(permission='x.y')
            if '@unified_access' in line and current_route:
                # Extract args
                ua_match = re.search(r"resource=['\"]([^'\"]+)['\"]", line)
                resource = ua_match.group(1) if ua_match else None
                
                act_match = re.search(r"action=['\"]([^'\"]+)['\"]", line)
                action = act_match.group(1) if act_match else None
                
                perm_match = re.search(r"permission=['\"]([^'\"]+)['\"]", line)
                permission = perm_match.group(1) if perm_match else None
                
                current_ua = {
                    'resource': resource,
                    'action': action,
                    'permission': permission,
                    'line': i + 1
                }
                
            # Parse Function Def (End of decorator stack)
            if line.startswith('def ') and current_route:
                # Analyze!
                self._analyze_endpoint(current_route, current_ua)
                current_route = None
                current_ua = None

    def _analyze_endpoint(self, route, ua):
        if not ua:
            return # Not protected by verified_access (maybe public or jwt_required only)
            
        # Calculate Expected Permission (Source of Truth)
        expected_perm = ua.get('permission')
        if not expected_perm and ua.get('resource') and ua.get('action'):
            action_map = {'read': 'view', 'write': 'edit'}
            act = ua['action']
            suffix = action_map.get(act, act)
            expected_perm = f"{ua['resource']}.{suffix}"
            
        if not expected_perm:
             return # Can't determine
             
        # Resolve Full Path options
        # We blindly check common prefixes
        path = route['path']
        
        # Possible prefixes to check against permissions_map
        candidates = [
            path,
            f"/api{path}",
            f"/{route['bp'].replace('_bp', '')}{path}",
            path.replace('//', '/')
        ]
        
        # Also clean up path vars: <branch_id> -> <branch_id>
        # ensure matching format with permissions_map (which seems to use <param>)
        
        # Check against ENDPOINT_PERMISSIONS
        matched_entry = None
        current_perm = None
        
        for method in route['methods']:
            found = False
            for cand in candidates:
                cand = cand.replace('//', '/')
                key = (method, cand)
                if key in ENDPOINT_PERMISSIONS:
                    current_perm = ENDPOINT_PERMISSIONS[key]
                    matched_entry = key
                    found = True
                    break
            
            if not found:
                 # Try fuzzy match?
                 continue
                 
            # Compare
            if current_perm != expected_perm:
                self.mismatches.append({
                    'method': method,
                    'path': matched_entry[1], # Use the key that matched
                    'code_path': route['path'], # The raw path in code
                    'current_mw': current_perm,
                    'expected_ua': expected_perm,
                    'file': route['file'],
                    'line': route['line']
                })

    def generate_report(self):
        print("Route | Middleware (Current) | Decorator (New) | Status")
        print("---|---|---|---")
        for m in self.mismatches:
            print(f"`{m['method']} {m['path']}` | `{m['current_mw']}` | `{m['expected_ua']}` | 🔴 Mismatch")
            
        print(f"\nTotal Mismatches: {len(self.mismatches)}")
        
        # Save detailed CSV
        import csv
        with open('permission_audit.csv', 'w', newline='') as csvfile:
            fieldnames = ['method', 'path', 'current_permission', 'expected_permission', 'file', 'line']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for m in self.mismatches:
                writer.writerow({
                    'method': m['method'],
                    'path': m['path'],
                    'current_permission': m['current_mw'],
                    'expected_permission': m['expected_ua'],
                    'file': m['file'],
                    'line': m['line']
                })
        print("Detailed report saved to permission_audit.csv")

if __name__ == "__main__":
    auditor = PermissionAuditor('apps/backend')
    auditor.scan_codebase()
    auditor.generate_report()
