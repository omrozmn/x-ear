# Admin Panel "Çalışmıyor" Sorununun Kök Sebebi

## 🎯 Ana Sorun Bulundu!

**Generated API Hook'larında `/api` prefix'i eksik!**

### Örnek:

**Frontend Generated H ook:**
```typescript
// lib/api/tenants/tenants.ts satır 142
return adminApi<GetAdminTenants200>({
  url: `/admin/tenants`,  // ❌ YANLIŞ - /api eksik!
  method: 'GET',
  params, signal
});
```

**Backend Endpoint:**
```python
# routes/admin_tenants.py satır 15
admin_tenants_bp = Blueprint('admin_tenants', __name__, 
                            url_prefix='/api/admin/tenants')  # ✅ DOĞRU
```

**Sonuç:**
- Frontend istek: `GET /admin/tenants` 
- Backend bekliyor: `GET /api/admin/tenants`
- **404 Not Found!**

## 🔍 Neden "Kayıt Bulunamadı" Görünüyor?

1. Frontend `useGetAdminTenants()` hook'u çağırıyor
2. Hook `/admin/tenants` endpoint'ine istek atıyor (✗ `/api` eksik)
3. Backend 404 döndürüyor
4. Frontend response parse edemiyor
5. `tenants = tenantsData?.data?.tenants || []` → boş array
6. Sayfa "Kayıt bulunamadı" gösteriyor

## 💡 Çözümler

### Seçenek 1: OpenAPI Spec'i Düzelt ve API'yi Yeniden Generate Et ⭐ ÖNERİLEN
**Avantajları:**
- Tüm endpoint'ler otomatik düzelir
- Gelecekte yeni endpoint'ler doğru generate edilir
- Best practice

**Yapılacaklar:**
1. OpenAPI spec dosyasını bul
2. `basePath` veya `servers` ayarını `/api` ekleyecek şekilde güncelle
3. `orval` ile API hook'larını yeniden generate et

### Seçenek 2: apiMutator'da Base URL Ekle ⚡ HIZLI ÇÖZÜM
**Avantajları:**
- Tek dosya değişikliği
- Hemen çalışır
- API yeniden generate gerektirmez

**Yapılacaklar:**
```typescript
// lib/apiMutator.ts
export const adminApi = async <T>(config: AxiosRequestConfig): Promise<T> => {
  // URL'ye /api prefix ekle
  if (config.url && !config.url.startsWith('/api')) {
    config.url = `/api${config.url}`;
  }
  
  const response = await axios.request<T>(config);
  return response.data;
};
```

### Seçenek 3: Nginx/Proxy ile `/admin/*` → `/api/admin/*` Rewrite
**Avantajları:**
- Backend değişmez
- Frontend değişmez

**Eksileri:**
- Ekstra komplekslik
- Development ortamında çalışması zor

## 📊 Etkilenen Endpoint'ler

Muhtemelen TÜM generated endpoint'ler etkileniyor:

- `/admin/tenants` → `/api/admin/tenants` olmalı
- `/admin/users` → `/api/admin/users` olmalı
- `/admin/plans` → `/api/admin/plans` olmalı
- `/admin/analytics` → `/api/admin/analytics` olmalı
- vb...

## 🚀 Önerilen Aksiyon Planı

1. ✅ **Hemen:** apiMutator'ı düzelt (Seçenek 2)
2. ⏭️ **Gelecek:** OpenAPI spec düzelt ve yeniden generate et (Seçenek 1)

---

**TEST:** Kiracılar sayfası apiMutator düzeltmesi sonrası çalışmalı!
