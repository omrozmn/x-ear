# Tenant Security için doküman

## Durum: Global Filter ÇOK KARMAŞIK

SQLAlchemy 2.0'da `session.get()` gibi primary key lookuplar için global filter uygulamak çokkarmaşık. 

### Başarılı Yaklaşımlar:
1. ✅ **JWT Tenant Claim** - Uygulandı
2. ✅ **UnboundSession** - Sistem sorguları için bypass
3. ⚠️ **Global Filter** - `Query.filter_by()` için çalışır ama `session.get()` için çalışmaz

### Önerilen Alternatif:
Backend'de şu anda **manuel filter**ler var ve bunlar güvenli:
```python
Patient.query.filter_by(tenant_id=user.tenant_id)
```

**En Güvenli Yaklaşım:**
1. Manuel filtrelere devam et (zaten var)
2. Code review sürecine ekle: Her endpoint'te `tenant_id` filtresi var mı?
3. Integration testlerde kontrol et

## Sorular

### 1. Global Filter
- ✅ CRM tarafı: Manuel filtreler uygulanmış (tüm endpoint'lerde görüyorum)
- ✅ Admin tarafı: Admin endpointleri zaten tenant-aware değil (admin panel global)

### 2. JWT Tenant Claim (imzalı)
✅ **YAPILDI**  
JWT token içinde `tenant_id` var ve Flask-JWT tarafından imzalanıyor.

### 3. Service-layer tenant check
⚠️ **KISMİ** 
Şu anda sadece route seviyesinde. Servis katmanı eklenebilir.

### 4. DB Row Level Security (RLS)
❌ **YOK**
SQLite RLS desteklemiyor. PostgreSQL'e geçince eklenebilir:
```sql
CREATE POLICY tenant_isolation ON patients
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### 5. Foreign-key + TenantId constraint
❌ **YOK ama eklenebilir**
Her foreign key'e tenant_id de eklenebilir ama bu çok fazla değişiklik gerektirir.

## Öneri
Şu anda en güvenli yöntem:
1. Manuel filtrelere devam et (mevcut)
2. Test coverage artır
3. PostgreSQL'e geçince RLS ekle
