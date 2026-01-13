#!/usr/bin/env python3
"""
API Contract Analysis Script (Multi-App Enhanced)
Analyzes backend endpoints and frontend API usage across multiple applications
(web, admin, landing) to identify mismatches and potential frontend breakages.
Outputs a detailed markdown report.
"""

import os
import re
import json
import sys
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Any

# Define paths relative to this script
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "apps" / "backend"
APPS_DIR = PROJECT_ROOT / "apps"
OUTPUT_FILE = PROJECT_ROOT / "API_CONTRACT_ANALYSIS.md"

# Applications to scan
# Applications to scan
# Applications to scan
APPS = {
    "web": {
        "src": APPS_DIR / "web" / "src",
        "orval_path": APPS_DIR / "web" / "src" / "api" / "generated"
    },
    "admin": {
        "src": APPS_DIR / "admin" / "src",
        "orval_path": APPS_DIR / "admin" / "src" / "api" / "generated"
    },
    "landing": {
        "src": APPS_DIR / "landing" / "src",
        "orval_path": APPS_DIR / "landing" / "src" / "api" / "generated"
    },
}

# ============================================================================
# Backend Endpoint Extraction
# ============================================================================

# ============================================================================
# Backend Endpoint Extraction
# ============================================================================

def extract_main_prefixes(main_py_path: Path) -> Dict[str, str]:
    """
    Parse main.py to find the prefix for each router.
    Returns {router_module_name: prefix}
    e.g. {'patients': '/api', 'auth': '/api'}
    """
    prefixes = {}
    if not main_py_path.exists():
        print(f"⚠️  Warning: {main_py_path} not found. Assuming default prefixes.")
        return prefixes

    try:
        content = main_py_path.read_text(encoding='utf-8')
        
        # Matches: app.include_router(module.router, prefix="/api")
        # Group 1: module name
        # Group 2: prefix (optional)
        pattern = re.compile(r'app\.include_router\s*\(\s*(\w+)\.router\s*(?:,\s*prefix\s*=\s*["\']([^"\']+)["\'])?[^)]*\)')
        
        for match in pattern.finditer(content):
            module = match.group(1)
            prefix = match.group(2) if match.group(2) else ""
            prefixes[module] = prefix
            
    except Exception as e:
        print(f"⚠️  Error parsing main.py: {e}")
        
    return prefixes

def extract_backend_endpoints(routers_dir: Path, main_py_path: Path = None) -> Dict[str, List[Dict[str, Any]]]:
    """
    Extract all API endpoints from FastAPI router files.
    Returns dict: {router_name: [endpoint_info, ...]}
    """
    endpoints = defaultdict(list)
    
    # Get prefixes from main.py if available
    main_prefixes = {}
    if main_py_path:
        main_prefixes = extract_main_prefixes(main_py_path)
    
    # FastAPI decorator patterns
    # Unified pattern to catch both @router and @api_router, and handle empty paths ("")
    # Using * instead of + for path group to allow empty strings
    patterns = [
        r'@(?:api_router|router)\.(get|post|put|patch|delete)\s*\(\s*["\']([^"\']*)["\']',
    ]
    
    for py_file in routers_dir.glob("*.py"):
        if py_file.name.startswith("__"):
            continue
            
        router_name = py_file.stem
        
        try:
            content = py_file.read_text(encoding='utf-8')
        except Exception as e:
            print(f"Warning: Could not read {py_file}: {e}")
            continue
        
        # Extract internal router prefix (defined in the file itself)
        prefix_match = re.search(r'router\s*=\s*APIRouter\s*\([^)]*prefix\s*=\s*["\']([^"\']+)["\']', content)
        internal_prefix = prefix_match.group(1) if prefix_match else ""
        
        # Get external prefix from main.py mapping
        external_prefix = main_prefixes.get(router_name, "")
        
        # Also check for tags to understand the module
        tags_match = re.search(r'router\s*=\s*APIRouter\s*\([^)]*tags\s*=\s*\[([^\]]+)\]', content)
        tags = []
        if tags_match:
            tags = [t.strip().strip('"\'') for t in tags_match.group(1).split(',')]
        
        # Extract endpoints
        for pattern in patterns:
            for match in re.finditer(pattern, content):
                method = match.group(1).upper()
                path = match.group(2)
                
                # Combine prefixes: External (main.py) + Internal (router file) + Path
                # Ensure we don't double slash
                
                full_path = path
                
                # 1. Apply internal prefix
                if internal_prefix:
                    if not internal_prefix.startswith('/'): internal_prefix = '/' + internal_prefix
                    internal_prefix = internal_prefix.rstrip('/')
                    if not full_path.startswith('/'): full_path = '/' + full_path
                    full_path = internal_prefix + full_path

                # 2. Apply external prefix (from main.py)
                if external_prefix:
                     if not external_prefix.startswith('/'): external_prefix = '/' + external_prefix
                     external_prefix = external_prefix.rstrip('/')
                     if not full_path.startswith('/'): full_path = '/' + full_path
                     full_path = external_prefix + full_path
                
                # Final cleanup
                if not full_path.startswith('/'):
                    full_path = '/' + full_path
                
                # Extract operation_id if present
                line_start = content.rfind('\n', 0, match.start()) + 1
                line_end = content.find('\n', match.end())
                decorator_line = content[line_start:line_end]
                
                op_id_match = re.search(r'operation_id\s*=\s*["\']([^"\']+)["\']', decorator_line)
                operation_id = op_id_match.group(1) if op_id_match else None
                
                # Get function name (next def after decorator)
                func_match = re.search(r'def\s+(\w+)\s*\(', content[match.end():match.end()+500])
                func_name = func_match.group(1) if func_match else "unknown"
                
                endpoints[router_name].append({
                    'method': method,
                    'path': full_path,
                    'operation_id': operation_id,
                    'function': func_name,
                    'tags': tags,
                    'file': str(py_file.name)
                })
                
                # Debug specific router
                if router_name == 'addons':
                     pass # Debug done

    
    return dict(endpoints)


# ============================================================================
# Orval-Generated Frontend Endpoints Extraction
# ============================================================================

def extract_orval_endpoints(app_name: str, generated_dir: Path) -> Dict[str, List[Dict[str, Any]]]:
    """
    Extract endpoint information from Orval-generated TypeScript files.
    Returns dict of module: [endpoint_info, ...]
    """
    endpoints = defaultdict(list)
    
    if not generated_dir.exists():
        return {}
    
    # Pattern to match URL definitions in Orval generated code
    url_pattern = re.compile(r'\{url:\s*[`"\']([^`"\']+)[`"\'],\s*method:\s*[\'"](\w+)[\'"]', re.IGNORECASE)
    
    # Pattern for function exports
    func_pattern = re.compile(r'export\s+const\s+(\w+)\s*=\s*\(')
    
    # Pattern for useXxx hooks
    hook_pattern = re.compile(r'export\s+(?:function\s+)?(use\w+)\s*[<\(]')
    
    for module_dir in generated_dir.iterdir():
        if not module_dir.is_dir() or module_dir.name.startswith('.') or module_dir.name == 'schemas':
            continue
        
        for ts_file in module_dir.glob("*.ts"):
            if ts_file.name.startswith('.'):
                continue
            
            try:
                content = ts_file.read_text(encoding='utf-8')
            except Exception:
                continue
            
            # Find all URL definitions
            for match in url_pattern.finditer(content):
                endpoint = match.group(1)
                method = match.group(2).upper()
                
                # Find the function this belongs to (search backwards)
                prev_content = content[:match.start()]
                func_matches = list(func_pattern.finditer(prev_content))
                func_name = func_matches[-1].group(1) if func_matches else "unknown"
                
                endpoints[module_dir.name].append({
                    'app': app_name,
                    'method': method,
                    'endpoint': endpoint,
                    'function': func_name,
                    'file': ts_file.name
                })
            
            # Find hook exports
            for match in hook_pattern.finditer(content):
                hook_name = match.group(1)
                
                # Try to find associated endpoint
                search_area = content[match.start():match.start()+2000]
                url_match = url_pattern.search(search_area)
                
                if url_match:
                    endpoints[module_dir.name].append({
                        'app': app_name,
                        'hook': hook_name,
                        'endpoint': url_match.group(1),
                        'method': url_match.group(2).upper(),
                        'file': ts_file.name
                    })
    
    return dict(endpoints)


def extract_orval_function_usage(app_name: str, frontend_dir: Path, orval_functions: Set[str]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Find where Orval-generated functions are imported and used in non-generated files.
    """
    usages = defaultdict(list)
    
    # Directories to scan (excluding generated)
    scan_dirs = [
        frontend_dir / "services",
        frontend_dir / "hooks",
        frontend_dir / "pages",
        frontend_dir / "components",
        frontend_dir / "features", # Check features dir too
    ]
    
    # Pattern to detect Orval imports
    # Allow imports from subpaths like @/api/generated/module/file
    import_pattern = re.compile(r"import\s*\{([^}]+)\}\s*from\s*['\"]@/api/generated(?:/[^'\"]+)?['\"]")
    orval_path_pattern = re.compile(r"from\s*['\"]@/api/generated(?:/[^'\"]+)?['\"]")
    
    for scan_dir in scan_dirs:
        if not scan_dir.exists():
            continue
        
        for ts_file in scan_dir.rglob("*.ts"):
            if 'generated' in str(ts_file) or 'node_modules' in str(ts_file):
                continue
            _process_file(app_name, ts_file, frontend_dir, usages, import_pattern, orval_path_pattern, orval_functions)
        
        for tsx_file in scan_dir.rglob("*.tsx"):
            if 'generated' in str(tsx_file) or 'node_modules' in str(tsx_file):
                continue
            _process_file(app_name, tsx_file, frontend_dir, usages, import_pattern, orval_path_pattern, orval_functions)
    
    return dict(usages)


def _process_file(app_name, ts_file, frontend_dir, usages, import_pattern, orval_path_pattern, orval_functions):
    try:
        content = ts_file.read_text(encoding='utf-8')
    except Exception:
        return
    
    relative_path = f"{app_name}/{ts_file.relative_to(frontend_dir)}"
    
    # Find all Orval imports
    has_orval_import = orval_path_pattern.search(content)
    if not has_orval_import:
        return
    
    # Extract specific imports
    for match in import_pattern.finditer(content):
        imports = match.group(1)
        imported_items = [i.strip() for i in imports.split(',')]
        
        for item in imported_items:
            # Handle 'x as y' patterns
            if ' as ' in item:
                item = item.split(' as ')[0].strip()
            
            if item and item in orval_functions:
                # Find usage lines
                usage_lines = []
                for line_num, line in enumerate(content.split('\n'), 1):
                    if item in line and not line.strip().startswith('import'):
                        usage_lines.append(line_num)
                
                usages[relative_path].append({
                    'app': app_name,
                    'function': item,
                    'usage_lines': usage_lines[:5],  # Limit to 5
                })


# ============================================================================
# Direct API Call Extraction
# ============================================================================

def extract_direct_api_calls(app_name: str, frontend_dir: Path) -> Dict[str, List[Dict[str, Any]]]:
    """
    Extract direct API calls (fetch, axios, apiClient) from frontend files.
    """
    usages = defaultdict(list)
    
    patterns = [
        # apiClient.get/post/etc('/api/...')
        (r'apiClient\.(get|post|put|patch|delete)\s*[<\(]\s*[`"\']([^`"\']+)[`"\']', 'apiClient'),
        # fetch('/api/...')
        (r'fetch\s*\(\s*[`"\']([^`"\']+)[`"\']', 'fetch'),
        # Template literals with /api/
        (r'[`]([^`]*?/api/[^`]+)[`]', 'template'),
    ]
    
    scan_dirs = [
        frontend_dir / "services",
        frontend_dir / "hooks",
        frontend_dir / "pages",
        frontend_dir / "components",
        frontend_dir / "features",
    ]
    
    for scan_dir in scan_dirs:
        if not scan_dir.exists():
            continue
        
        for ts_file in scan_dir.rglob("*.ts"):
            if 'generated' in str(ts_file) or 'node_modules' in str(ts_file):
                continue
            _extract_calls_from_file(app_name, ts_file, frontend_dir, usages, patterns)
        
        for tsx_file in scan_dir.rglob("*.tsx"):
            if 'generated' in str(tsx_file) or 'node_modules' in str(tsx_file):
                continue
            _extract_calls_from_file(app_name, tsx_file, frontend_dir, usages, patterns)
    
    return dict(usages)


def _extract_calls_from_file(app_name, file_path, frontend_dir, usages, patterns):
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception:
        return
    
    relative_path = f"{app_name}/{file_path.relative_to(frontend_dir)}"
    
    for pattern, call_type in patterns:
        for match in re.finditer(pattern, content):
            if call_type == 'apiClient':
                method = match.group(1).upper()
                endpoint = match.group(2)
            elif call_type == 'fetch':
                method = 'GET'  # Assume GET for simple fetch
                endpoint = match.group(1)
            else:
                try:
                    method = 'UNKNOWN'
                    endpoint = match.group(1)
                except IndexError:
                    continue
            
            if '/api' in endpoint:
                line_num = content[:match.start()].count('\n') + 1
                usages[relative_path].append({
                    'app': app_name,
                    'method': method,
                    'endpoint': endpoint,
                    'line': line_num,
                    'type': call_type
                })


# ============================================================================
# Analysis Functions
# ============================================================================

def normalize_endpoint(endpoint: str) -> str:
    """Normalize endpoint for comparison (remove params, trailing slashes)"""
    if not endpoint:
        return ""
        
    # Replace path params with placeholder
    normalized = re.sub(r'\{[^}]+\}', '{id}', endpoint)
    normalized = re.sub(r'\$\{[^}]+\}', '{id}', normalized)
    # Remove trailing slash
    normalized = normalized.rstrip('/')
    
    # Ensure starts with / (but do NOT force /api anymore, rely on main.py parsing)
    if not normalized.startswith('/'):
        normalized = '/' + normalized
            
    return normalized


def analyze_coverage(
    backend_endpoints: Dict[str, List[Dict]],
    orval_endpoints: Dict[str, List[Dict]],
    orval_usages: Dict[str, List[Dict]],
    direct_calls: Dict[str, List[Dict]]
) -> Dict[str, Any]:
    """
    Analyze API coverage between backend and frontend.
    """
    # Flatten backend endpoints (normalized)
    backend_set = set()
    backend_by_path = {}
    
    for router, eps in backend_endpoints.items():
        for ep in eps:
            normalized = normalize_endpoint(ep['path'])
            key = (ep['method'], normalized)
            backend_set.add(key)
            backend_by_path[key] = {'router': router, **ep}
    
    # Flatten Orval endpoints
    orval_set = set()
    orval_by_path = {}
    
    for module, eps in orval_endpoints.items():
        for ep in eps:
            endpoint = ep.get('endpoint', '')
            normalized = normalize_endpoint(endpoint)
            # Use app in key to differentiate if needed, but for coverage we verify if backend supports it
            key = (ep.get('method', 'GET'), normalized)
            orval_set.add(key)
            if key not in orval_by_path:
                orval_by_path[key] = []
            orval_by_path[key].append({'module': module, **ep})
    
    # Find mismatches
    
    # 1. Orval endpoints missing in backend (potential 404s)
    missing_in_backend = []
    for key in orval_set:
        if key not in backend_set:
            if key in orval_by_path:
                for item in orval_by_path[key]:
                    missing_in_backend.append(item)
    
    # 2. Backend endpoints not in Orval (might need regeneration)
    missing_in_orval = []
    for key in backend_set:
        if key not in orval_set:
            missing_in_orval.append(backend_by_path[key])
    
    # 3. Orval functions imported but might not map to backend
    used_orval_functions = set()
    for file, usages in orval_usages.items():
        for usage in usages:
            used_orval_functions.add(usage.get('function', ''))
    
    # Count direct API calls
    direct_call_count = sum(len(calls) for calls in direct_calls.values())
    
    return {
        'backend_count': len(backend_set),
        'orval_count': len(orval_set),
        'missing_in_backend': missing_in_backend,
        'missing_in_orval': missing_in_orval,
        'used_orval_functions': len(used_orval_functions),
        'direct_api_calls': direct_call_count,
        'orval_files_using': len(orval_usages),
        'direct_call_files': len(direct_calls),
    }


def analyze_potential_breakages(app_name: str, frontend_dir: Path) -> List[Dict[str, Any]]:
    """
    Analyze potential frontend breakages by checking for common issues.
    """
    issues = []
    
    patterns_to_check = [
        (r'response\.data\.(\w+)', 'Assumes response.data.{field} exists'),
        (r'\.then\s*\(\s*\(\s*\{\s*data\s*\}\s*\)', 'Destructures data from response'),
        (r'(?:items|results|list|data)\s*\??\s*\.\s*map', 'Iterates over potentially undefined array'),
        (r'(?<![\w.])id(?![\w])', 'Direct id field access (check nullability)'),
    ]
    
    scan_dirs = [frontend_dir / "services", frontend_dir / "hooks", frontend_dir / "features"]
    
    for scan_dir in scan_dirs:
        if not scan_dir.exists():
            continue
        
        for ts_file in list(scan_dir.rglob("*.ts")) + list(scan_dir.rglob("*.tsx")):
            if 'generated' in str(ts_file) or 'node_modules' in str(ts_file):
                continue
            
            try:
                content = ts_file.read_text(encoding='utf-8')
            except Exception:
                continue
            
            relative_path = f"{app_name}/{ts_file.relative_to(frontend_dir)}"
            
            for pattern, description in patterns_to_check:
                matches = list(re.finditer(pattern, content))[:2]
                for match in matches:
                    line_num = content[:match.start()].count('\n') + 1
                    issues.append({
                        'file': relative_path,
                        'line': line_num,
                        'pattern': description,
                        'match': match.group(0)[:40]
                    })
    
    return issues[:200]  # Limit total issues


# ============================================================================
# Report Generation
# ============================================================================

def generate_report(
    backend_endpoints: Dict[str, List[Dict]],
    orval_endpoints: Dict[str, List[Dict]],
    orval_usages: Dict[str, List[Dict]],
    direct_calls: Dict[str, List[Dict]],
    analysis: Dict[str, Any],
    breakages: List[Dict]
) -> str:
    """Generate the markdown report."""
    
    lines = [
        "# 🔌 Multi-App API Contract Analysis Report",
        "",
        f"**Generated:** {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "---",
        "",
        "## 📊 Executive Summary",
        "",
        "| Metric | Count |",
        "|--------|-------|",
        f"| Backend Endpoints | {analysis['backend_count']} |",
        f"| Orval-Generated Endpoints | {analysis['orval_count']} |",
        f"| ⚠️ Orval endpoints NOT in backend | {len(analysis['missing_in_backend'])} |",
        f"| 📋 Backend endpoints NOT in Orval | {len(analysis['missing_in_orval'])} |",
        f"| Files using Orval functions | {analysis['orval_files_using']} |",
        f"| Direct API calls (non-Orval) | {analysis['direct_api_calls']} |",
        f"| 🔍 Potential breakage points | {len(breakages)} |",
        "",
    ]
    
    # Critical Issues - Orval endpoints not in backend
    if analysis['missing_in_backend']:
        lines.extend([
            "---",
            "",
            "## 🚨 Critical: Orval Endpoints Missing in Backend",
            "",
            "> [!CAUTION]",
            "> These endpoints are defined in Orval-generated code (across apps) but don't have matching backend routes!",
            "> Frontend calls to these will return 404 errors.",
            "",
            "| App | Method | Endpoint | Orval Module | Function |",
            "|-----|--------|----------|--------------|----------|",
        ])
        
        # Sort by app then endpoint
        sorted_missing = sorted(analysis['missing_in_backend'], key=lambda x: (x.get('app', ''), x.get('endpoint', '')))
        
        for item in sorted_missing[:30]:
            lines.append(f"| {item.get('app', '?')} | {item.get('method', '?')} | `{item.get('endpoint', '?')[:50]}` | {item.get('module', '?')} | `{item.get('function', '?')}` |")
        
        if len(analysis['missing_in_backend']) > 30:
            lines.append(f"| ... | ... | _{len(analysis['missing_in_backend']) - 30} more_ | ... | ... |")
        lines.append("")
    
    # Backend endpoints not in Orval (might need regeneration)
    if analysis['missing_in_orval']:
        lines.extend([
            "---",
            "",
            "## 📋 Backend Endpoints Not in Orval",
            "",
            "> [!WARNING]",
            "> These backend endpoints don't have Orval-generated hooks in ANY app.",
            "> You may need to regenerate Orval for the relevant app.",
            "",
            "<details>",
            f"<summary>Click to expand ({len(analysis['missing_in_orval'])} endpoints)</summary>",
            "",
            "| Method | Path | Router | Function |",
            "|--------|------|--------|----------|",
        ])
        
        for item in sorted(analysis['missing_in_orval'], key=lambda x: x.get('path', ''))[:50]:
            lines.append(f"| {item.get('method', '?')} | `{item.get('path', '?')}` | {item.get('router', '?')} | `{item.get('function', '?')}` |")
        
        if len(analysis['missing_in_orval']) > 50:
            lines.append(f"| ... | _{len(analysis['missing_in_orval']) - 50} more_ | ... | ... |")
        
        lines.extend(["", "</details>", ""])
    
    # Direct API calls (should migrate to Orval)
    if direct_calls:
        lines.extend([
            "---",
            "",
            "## 🔧 Direct API Calls (Consider Migrating to Orval)",
            "",
            "> [!NOTE]",
            "> These files use direct `fetch` or `apiClient` calls instead of Orval hooks.",
            "> Consider migrating to Orval for type safety.",
            "",
        ])
        
        # Group by app
        calls_by_app = defaultdict(list)
        for file, calls in direct_calls.items():
            app = file.split('/')[0]
            calls_by_app[app].extend([{'file': file, **c} for c in calls])
            
        for app in sorted(calls_by_app.keys()):
            lines.append(f"### App: `{app}`")
            lines.append("")
            
            # Sort files with most calls
            sorted_files = sorted(
                [f for f in direct_calls.keys() if f.startswith(app)],
                key=lambda k: -len(direct_calls[k])
            )
            
            for file in sorted_files[:5]:
                calls = direct_calls[file]
                file_name_only = file.split('/', 1)[1] if '/' in file else file
                lines.append(f"#### `{file_name_only}`")
                for call in calls[:3]:
                    lines.append(f"- Line {call.get('line', '?')}: `{call.get('method', '?')} {call.get('endpoint', '?')[:60]}`")
                if len(calls) > 3:
                    lines.append(f"- _...and {len(calls) - 3} more calls_")
                lines.append("")
            if len(sorted_files) > 5:
                lines.append(f"> _...and {len(sorted_files) - 5} more files in {app}_")
            lines.append("")
    
    # Orval function usage summary by app
    lines.extend([
        "---",
        "",
        "## ✅ Orval Usage Summary",
        "",
        "| Application | Files Using Orval |",
        "|-------------|-------------------|",
    ])
    
    files_by_app = defaultdict(int)
    for file in orval_usages.keys():
        app = file.split('/')[0]
        files_by_app[app] += 1
        
    for app in sorted(APPS.keys()):
        lines.append(f"| `{app}` | {files_by_app[app]} |")
    lines.append("")
    
    # Potential Breakages
    if breakages:
        lines.extend([
            "---",
            "",
            "## 🔍 Potential Frontend Breakage Points",
            "",
            "These code patterns might be fragile if API response structure changes:",
            "",
            "| File | Line | Pattern | Match |",
            "|------|------|---------|-------|",
        ])
        
        seen = set()
        for item in breakages[:30]:
            key = (item['file'], item['pattern'])
            if key not in seen:
                seen.add(key)
                lines.append(f"| `{item['file']}` | {item['line']} | {item['pattern']} | `{item['match'][:30]}` |")
        
        lines.append("")
    
    # Recommendations
    lines.extend([
        "---",
        "",
        "## 💡 Recommendations",
        "",
        "1. **🚨 Fix Critical Issues**: Any Orval endpoint not in backend will cause 404 errors",
        "2. **📋 Regenerate Orval**: Run `npm run orval` for apps with missing endpoints",
        "3. **🔧 Migrate Direct Calls**: Convert `fetch`/`apiClient` calls to Orval hooks for type safety",
        "4. **🔍 Review Breakage Points**: Add null checks for fragile data access patterns",
        "",
        "---",
        "",
        "*Report generated by `scripts/analyze_api_contract.py`*",
    ])
    
    return '\n'.join(lines)


# ============================================================================
# Main Execution
# ============================================================================

def main():
    print("🔍 Multi-App API Contract Analysis")
    print("=" * 50)
    
    # Check directories exist
    routers_dir = BACKEND_DIR / "routers"
    main_py_path = BACKEND_DIR / "main.py"
    
    if not routers_dir.exists():
        print(f"❌ Backend routers directory not found: {routers_dir}")
        sys.exit(1)
    
    print(f"📂 Backend routers: {routers_dir}")
    print(f"📄 Main backend file: {main_py_path}")
    for app, config in APPS.items():
        if config["src"].exists():
            print(f"📂 App '{app}': {config['src']}")
            print(f"   Orval path: {config['orval_path']}")
        else:
            print(f"⚠️  App '{app}': Not found at {config['src']}")
    print()
    
    # Extract data
    print(f"📖 Extracting backend endpoints...")
    
    # Debug: Print extracted prefixes
    if main_py_path and main_py_path.exists():
        prefixes = extract_main_prefixes(main_py_path)
        # Debug prints removed
        
    backend_endpoints = extract_backend_endpoints(routers_dir, main_py_path)
    total_be = sum(len(v) for v in backend_endpoints.values())
    print(f"   Found {len(backend_endpoints)} routers with {total_be} endpoints")
    
    # Extract frontend data for each app
    all_orval_endpoints = defaultdict(list)
    all_orval_usages = defaultdict(list)
    all_direct_calls = defaultdict(list)
    all_breakages = []
    
    for app_name, config in APPS.items():
        app_path = config["src"]
        if not app_path.exists():
            continue
            
        print(f"\n📖 Processing '{app_name}'...")
        
        # Orval endpoints
        generated_dir = config["orval_path"]
        if generated_dir.exists():
            orval_eps = extract_orval_endpoints(app_name, generated_dir)
            cnt = sum(len(v) for v in orval_eps.values())
            print(f"   - Found {cnt} Orval endpoints")
            for k, v in orval_eps.items():
                all_orval_endpoints[k].extend(v)
            
            # Orval usage
            orval_functions = set()
            for module, eps in orval_eps.items():
                for ep in eps:
                    if 'function' in ep:
                        orval_functions.add(ep['function'])
                    if 'hook' in ep:
                        orval_functions.add(ep['hook'])
            
            usages = extract_orval_function_usage(app_name, app_path, orval_functions)
            print(f"   - Found {len(usages)} files using Orval")
            all_orval_usages.update(usages)
        else:
            print(f"   - No Orval generation found at {generated_dir}")
        
        # Direct calls
        direct_calls = extract_direct_api_calls(app_name, app_path)
        cnt_calls = sum(len(v) for v in direct_calls.values())
        print(f"   - Found {cnt_calls} direct API calls")
        all_direct_calls.update(direct_calls)
        
        # Breakages
        breakages = analyze_potential_breakages(app_name, app_path)
        all_breakages.extend(breakages)
    
    print()
    print("🔎 Analyzing coverage...")
    analysis = analyze_coverage(backend_endpoints, all_orval_endpoints, all_orval_usages, all_direct_calls)
    
    print()
    print("📝 Generating report...")
    report = generate_report(
        backend_endpoints,
        all_orval_endpoints,
        all_orval_usages,
        all_direct_calls,
        analysis,
        all_breakages
    )
    
    # Write report
    OUTPUT_FILE.write_text(report, encoding='utf-8')
    print(f"✅ Report saved to: {OUTPUT_FILE}")
    
    # Print summary
    print()
    print("=" * 50)
    print("📊 Summary:")
    print(f"   • Backend endpoints: {analysis['backend_count']}")
    print(f"   • Orval endpoints: {analysis['orval_count']}")
    print(f"   • ⚠️  Missing in backend: {len(analysis['missing_in_backend'])}")
    print(f"   • 📋 Missing in Orval: {len(analysis['missing_in_orval'])}")
    print(f"   • 🔧 Direct API calls: {analysis['direct_api_calls']}")
    print(f"   • 🔍 Potential breakages: {len(all_breakages)}")
    
    if len(analysis['missing_in_backend']) > 0:
        print()
        print("⚠️  There are Orval endpoints missing in backend!")
        print("   Check the report for details.")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
