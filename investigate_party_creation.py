#!/usr/bin/env python3
import sys
sys.path.insert(0, 'apps/api')

from core.database import get_db
from core.models import Party
from models.user import ActivityLog

db = next(get_db())
try:
    party_id = 'pat_5d88ce9f'
    
    # 1. Party bilgileri
    party = db.query(Party).filter(Party.id == party_id).first()
    if party:
        print("=" * 80)
        print("PARTY BİLGİLERİ")
        print("=" * 80)
        print(f"Party ID: {party.id}")
        print(f"Ad Soyad: {party.first_name} {party.last_name}")
        print(f"Tenant ID: {party.tenant_id}")
        print(f"Oluşturulma: {party.created_at}")
        print(f"Güncellenme: {party.updated_at}")
        print()
        
        # 2. ActivityLog kontrolü
        print("=" * 80)
        print("ACTIVITY LOG KAYITLARI")
        print("=" * 80)
        
        # Party oluşturma kaydı
        creation_logs = db.query(ActivityLog).filter(
            ActivityLog.entity_type == 'party',
            ActivityLog.entity_id == party_id,
            ActivityLog.action.in_(['party_created', 'create_party', 'created'])
        ).order_by(ActivityLog.created_at).all()
        
        if creation_logs:
            print(f"\n✅ {len(creation_logs)} adet oluşturma kaydı bulundu:")
            for log in creation_logs:
                print(f"\n  Tarih: {log.created_at}")
                print(f"  User ID: {log.user_id}")
                print(f"  Tenant ID: {log.tenant_id}")
                print(f"  Action: {log.action}")
                print(f"  IP: {log.ip_address}")
                print(f"  Details: {log.details}")
        else:
            print("\n❌ Oluşturma kaydı bulunamadı")
        
        # Tüm activity loglar
        all_logs = db.query(ActivityLog).filter(
            ActivityLog.entity_type == 'party',
            ActivityLog.entity_id == party_id
        ).order_by(ActivityLog.created_at).all()
        
        if all_logs:
            print(f"\n\n📋 Toplam {len(all_logs)} adet activity log:")
            for log in all_logs:
                print(f"\n  [{log.created_at}] {log.action}")
                print(f"    User: {log.user_id}, Tenant: {log.tenant_id}")
                print(f"    Details: {log.details}")
        
        # 3. JWT'deki tenant ile karşılaştırma
        print("\n" + "=" * 80)
        print("TENANT KARŞILAŞTIRMASI")
        print("=" * 80)
        jwt_tenant = "95625589-a4ad-41ff-a99e-4955943bb421"
        print(f"Party Tenant ID:  {party.tenant_id}")
        print(f"JWT Tenant ID:    {jwt_tenant}")
        print(f"Eşleşme:          {'✅ EVET' if party.tenant_id == jwt_tenant else '❌ HAYIR'}")
        
    else:
        print(f"❌ Party bulunamadı: {party_id}")
        
finally:
    db.close()
