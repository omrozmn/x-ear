#!/usr/bin/env python3
import sys
sys.path.insert(0, 'apps/api')

from core.database import SessionLocal
from core.models.user import User

db = SessionLocal()
try:
    # Find admin@xear.com
    user = db.query(User).filter(User.email == 'admin@xear.com').first()
    if user:
        print(f'Found: {user.email}')
        print(f'Current role: {user.role}')
        print(f'Current tenant: {user.tenant_id}')
        
        # Set password
        user.set_password('admin123')
        user.is_active = True
        db.commit()
        
        print(f'\n✅ Password set to: admin123')
        print(f'✅ Email: admin@xear.com')
        print(f'✅ Password: admin123')
        
        # Verify
        is_valid = user.check_password('admin123')
        print(f'✅ Password verification: {is_valid}')
    else:
        print('User not found')
finally:
    db.close()
