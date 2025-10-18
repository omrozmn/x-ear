#!/usr/bin/env python3
"""
Script to update imports from old models.py to new modular structure
"""
import os
import re
import glob

# Model mapping: old import -> new import
MODEL_MAPPINGS = {
    'db': 'models.base',
    'Patient': 'models.patient',
    'Device': 'models.device',
    'User': 'models.user',
    'ActivityLog': 'models.user',
    'Appointment': 'models.appointment',
    'Sale': 'models.sales',
    'DeviceAssignment': 'models.sales',
    'PaymentPlan': 'models.sales',
    'PaymentInstallment': 'models.sales',
    'Invoice': 'models.invoice',
    'Proforma': 'models.invoice',
    'Inventory': 'models.inventory',
    'Supplier': 'models.suppliers',
    'SupplierContact': 'models.suppliers',
    'PurchaseOrder': 'models.suppliers',
    'PurchaseOrderItem': 'models.suppliers',
    'Report': 'models.report',
    'ReportTemplate': 'models.report',
    'Setting': 'models.setting',
    'Campaign': 'models.campaign',
    'CampaignPatient': 'models.campaign',
    'SMSTemplate': 'models.campaign',
    'SMSLog': 'models.campaign',
    'SGKQuery': 'models.sgk',
    'SGKResult': 'models.sgk',
    'EFaturaSettings': 'models.efatura',
    'EFaturaLog': 'models.efatura',
    # Additional models found
    'App': 'models.app',
    'Role': 'models.role',
    'Permission': 'models.permission',
    'UserAppRole': 'models.user_app_role',
    'Settings': 'models.system',
}

def update_file_imports(file_path):
    """Update imports in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Pattern to match: from models import ...
        pattern = r'from models import (.+)'
        matches = re.findall(pattern, content)
        
        if not matches:
            return False, "No imports found"
        
        # Process each import line
        for match in matches:
            # Split imports by comma and clean them
            imports = [imp.strip() for imp in match.split(',')]
            
            # Group imports by their new modules
            new_imports = {}
            for imp in imports:
                if imp in MODEL_MAPPINGS:
                    module = MODEL_MAPPINGS[imp]
                    if module not in new_imports:
                        new_imports[module] = []
                    new_imports[module].append(imp)
                else:
                    print(f"WARNING: Unknown import '{imp}' in {file_path}")
            
            # Replace the old import line with new ones
            old_line = f"from models import {match}"
            new_lines = []
            for module, items in new_imports.items():
                new_lines.append(f"from {module} import {', '.join(items)}")
            
            content = content.replace(old_line, '\n'.join(new_lines))
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, "Updated"
        else:
            return False, "No changes needed"
            
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    """Main function to update all files"""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Directories to process
    directories = [
        'routes',
        'tests', 
        'migrations',
        'scripts',
        'services',
        'utils'
    ]
    
    # Also process app.py
    files_to_process = [os.path.join(base_dir, 'app.py')]
    
    # Add all Python files from directories
    for directory in directories:
        dir_path = os.path.join(base_dir, directory)
        if os.path.exists(dir_path):
            pattern = os.path.join(dir_path, '**/*.py')
            files_to_process.extend(glob.glob(pattern, recursive=True))
    
    print(f"Processing {len(files_to_process)} files...")
    
    updated_count = 0
    error_count = 0
    
    for file_path in files_to_process:
        # Skip this script itself
        if file_path.endswith('update_imports.py'):
            continue
            
        success, message = update_file_imports(file_path)
        
        if success:
            updated_count += 1
            print(f"✅ {os.path.relpath(file_path)}: {message}")
        elif "No imports found" not in message:
            if "Error:" in message:
                error_count += 1
            print(f"⚠️  {os.path.relpath(file_path)}: {message}")
    
    print(f"\n📊 Summary:")
    print(f"   Updated: {updated_count} files")
    print(f"   Errors: {error_count} files")
    print(f"   Total processed: {len(files_to_process)} files")

if __name__ == "__main__":
    main()