#!/usr/bin/env python3
"""Fix all stats endpoints - remove tenant_id references for cross-tenant admin"""
import re

files = {
    "apps/api/routers/unsubscribe_management.py": [
        (
            r'total_unsubscribes = db\.query\(EmailUnsubscribe\)\.filter\(\s*EmailUnsubscribe\.tenant_id == tenant_id\s*\)\.count\(\)',
            'total_unsubscribes = db.query(EmailUnsubscribe).count()'
        ),
        (
            r'and_\(\s*EmailUnsubscribe\.tenant_id == tenant_id,\s*EmailUnsubscribe\.unsubscribed_at >= cutoff_7_days\s*\)',
            'EmailUnsubscribe.unsubscribed_at >= cutoff_7_days'
        ),
        (
            r'and_\(\s*EmailUnsubscribe\.tenant_id == tenant_id,\s*EmailUnsubscribe\.unsubscribed_at >= cutoff_30_days\s*\)',
            'EmailUnsubscribe.unsubscribed_at >= cutoff_30_days'
        ),
        (
            r'and_\(\s*EmailLog\.tenant_id == tenant_id,\s*EmailLog\.status == "sent"\s*\)',
            'EmailLog.status == "sent"'
        ),
        (
            r'\.filter\(\s*EmailUnsubscribe\.tenant_id == tenant_id\s*\)\.group_by',
            '.group_by'
        ),
        (
            r'and_\(\s*EmailUnsubscribe\.id == unsubscribe_id\s*\)',
            'EmailUnsubscribe.id == unsubscribe_id'
        ),
    ],
    "apps/api/routers/email_approval.py": [
        (
            r'stats = service\.get_approval_stats\(tenant_id\)',
            'stats = service.get_approval_stats(None)'
        ),
    ],
    "apps/api/routers/complaint_management.py": [
        # Similar patterns
    ],
}

for filepath, replacements in files.items():
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original = content
        for pattern, replacement in replacements:
            content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
        
        if content != original:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"✓ Fixed {filepath}")
        else:
            print(f"- No changes in {filepath}")
            
    except FileNotFoundError:
        print(f"✗ File not found: {filepath}")
    except Exception as e:
        print(f"✗ Error in {filepath}: {e}")

print("\nDone!")
