#!/usr/bin/env python3
"""
Seed all permissions to database
This script creates all necessary permissions for the RBAC system
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from core.database import SessionLocal, init_db
from core.models.permission import Permission
from core.database import gen_id

def seed_permissions():
    """Seed all permissions to database"""
    db = SessionLocal()
    
    try:
        # Define all permissions with categories
        permissions = [
            # Parties (Hastalar)
            ("parties.view", "Hastaları Görüntüle"),
            ("parties.create", "Hasta Oluştur"),
            ("parties.edit", "Hasta Düzenle"),
            ("parties.delete", "Hasta Sil"),
            ("parties.export", "Hastaları Dışarı Aktar"),
            
            # Sales (Satışlar)
            ("sales.view", "Satışları Görüntüle"),
            ("sales.create", "Satış Oluştur"),
            ("sales.edit", "Satış Düzenle"),
            ("sales.delete", "Satış Sil"),
            ("sales.approve", "Satış Onayla"),
            ("sales.cancel", "Satış İptal Et"),
            
            # Finance (Finans)
            ("finance.view", "Finans Görüntüle"),
            ("finance.cash_register", "Kasa Yönetimi"),
            ("finance.payments", "Ödeme Yönetimi"),
            ("finance.refunds", "İade Yönetimi"),
            
            # Invoices (Faturalar)
            ("invoices.view", "Faturaları Görüntüle"),
            ("invoices.create", "Fatura Oluştur"),
            ("invoices.edit", "Fatura Düzenle"),
            ("invoices.delete", "Fatura Sil"),
            ("invoices.export", "Faturaları Dışarı Aktar"),
            ("invoices.send", "Fatura Gönder"),
            
            # Devices (Cihazlar)
            ("devices.view", "Cihazları Görüntüle"),
            ("devices.create", "Cihaz Ekle"),
            ("devices.edit", "Cihaz Düzenle"),
            ("devices.delete", "Cihaz Sil"),
            ("devices.assign", "Cihaz Ata"),
            
            # Inventory (Stok)
            ("inventory.view", "Stok Görüntüle"),
            ("inventory.create", "Stok Ekle"),
            ("inventory.edit", "Stok Düzenle"),
            ("inventory.delete", "Stok Sil"),
            ("inventory.upload", "Stok Yükle"),
            
            # Campaigns (Kampanyalar)
            ("campaigns.view", "Kampanyaları Görüntüle"),
            ("campaigns.create", "Kampanya Oluştur"),
            ("campaigns.edit", "Kampanya Düzenle"),
            ("campaigns.delete", "Kampanya Sil"),
            ("campaigns.send_sms", "SMS Gönder"),
            
            # SGK
            ("sgk.view", "SGK Görüntüle"),
            ("sgk.edit", "SGK Düzenle"),
            ("sgk.upload", "SGK Yükle"),
            
            # Settings (Ayarlar)
            ("settings.view", "Ayarları Görüntüle"),
            ("settings.edit", "Ayarları Düzenle"),
            ("settings.branches", "Şube Yönetimi"),
            ("settings.integrations", "Entegrasyon Yönetimi"),
            ("settings.permissions", "İzin Yönetimi"),
            
            # Team (Ekip Yönetimi)
            ("team.view", "Ekibi Görüntüle"),
            ("team.create", "Ekip Üyesi Ekle"),
            ("team.edit", "Ekip Üyesi Düzenle"),
            ("team.delete", "Ekip Üyesi Sil"),
            
            # Reports (Raporlar)
            ("reports.view", "Raporları Görüntüle"),
            ("reports.export", "Raporları Dışarı Aktar"),
            
            # Dashboard
            ("dashboard.view", "Dashboard Görüntüle"),
            ("dashboard.analytics", "Analitik Görüntüle"),
            
            # Appointments (Randevular)
            ("appointments.view", "Randevuları Görüntüle"),
            ("appointments.create", "Randevu Oluştur"),
            ("appointments.edit", "Randevu Düzenle"),
            ("appointments.delete", "Randevu Sil"),
            
            # Activity Logs
            ("activity_logs.view", "Aktivite Loglarını Görüntüle"),
            
            # Legacy permissions (for backward compatibility)
            ("patient:read", "Hasta Oku (Legacy)"),
            ("patient:write", "Hasta Yaz (Legacy)"),
            ("patient:delete", "Hasta Sil (Legacy)"),
            ("patient:export", "Hasta Dışarı Aktar (Legacy)"),
            ("sale:read", "Satış Oku (Legacy)"),
            ("sale:write", "Satış Yaz (Legacy)"),
            ("invoice:read", "Fatura Oku (Legacy)"),
            ("invoice:write", "Fatura Yaz (Legacy)"),
            ("invoice:delete", "Fatura Sil (Legacy)"),
            ("invoice:export", "Fatura Dışarı Aktar (Legacy)"),
            ("appointment:read", "Randevu Oku (Legacy)"),
            ("appointment:write", "Randevu Yaz (Legacy)"),
            ("inventory:read", "Stok Oku (Legacy)"),
            ("inventory:write", "Stok Yaz (Legacy)"),
            ("supplier:read", "Tedarikçi Oku"),
            ("supplier:write", "Tedarikçi Yaz"),
            ("supplier:delete", "Tedarikçi Sil"),
            ("tenant:manage", "Tenant Yönet"),
            ("user:manage", "Kullanıcı Yönet"),
            ("dashboard:read", "Dashboard Oku (Legacy)"),
            ("branches:read", "Şube Oku"),
            ("branches:write", "Şube Yaz"),
            ("branches:delete", "Şube Sil"),
            ("payments:read", "Ödeme Oku"),
            ("payments:write", "Ödeme Yaz"),
            ("users:read", "Kullanıcı Oku"),
            ("users:write", "Kullanıcı Yaz"),
            ("users:delete", "Kullanıcı Sil"),
            ("cash_records:read", "Kasa Kaydı Oku"),
            ("cash_records:write", "Kasa Kaydı Yaz"),
            ("cash_records:delete", "Kasa Kaydı Sil"),
            ("campaign:read", "Kampanya Oku (Legacy)"),
            ("campaign:write", "Kampanya Yaz (Legacy)"),
            ("ocr:read", "OCR Oku"),
            ("ocr:write", "OCR Yaz"),
            ("role:read", "Rol Oku"),
            ("role:write", "Rol Yaz"),
            ("activity_logs:read", "Aktivite Log Oku (Legacy)"),
            ("sms:read", "SMS Oku"),
            ("sms:write", "SMS Yaz"),
            ("sms.view", "SMS Görüntüle"),
            ("sms.edit", "SMS Düzenle"),
        ]
        
        created_count = 0
        updated_count = 0
        
        for perm_name, perm_desc in permissions:
            # Check if permission already exists
            existing = db.query(Permission).filter_by(name=perm_name).first()
            
            if existing:
                # Update description if changed
                if existing.description != perm_desc:
                    existing.description = perm_desc
                    updated_count += 1
            else:
                # Create new permission
                perm = Permission(
                    id=gen_id("perm"),
                    name=perm_name,
                    description=perm_desc
                )
                db.add(perm)
                created_count += 1
        
        db.commit()
        
        print("✅ Permission seeding completed!")
        print(f"   Created: {created_count}")
        print(f"   Updated: {updated_count}")
        print(f"   Total: {len(permissions)}")
        
        # Verify
        total_in_db = db.query(Permission).count()
        print(f"   Database total: {total_in_db}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding permissions: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting permission seeding...")
    init_db()
    seed_permissions()
