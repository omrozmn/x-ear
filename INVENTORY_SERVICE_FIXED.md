## ✅ INVENTORY SERVICE ORVAL DÖNÜŞÜMÜ TAMAMLANDI

### Değişiklikler:

**`inventory.service.ts`:**
- ❌ Manuel `fetch()` (Authorization header YOK)
- ✅ Orval `customInstance` (Authorization header OTOMATĐK)

### createItem() & updateItem():
```typescript
// ESKI (❌ Auth yok):
const response = await fetch('http://localhost:5003/api/inventory', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // ❌ Authorization header eksik!
  },
  body: JSON.stringify(data),
});

// YENĐ (✅ Auth otomatik):
const { customInstance } = await import('../api/orval-mutator');
const response = await customInstance<{ data: InventoryItem }>({
  url: '/api/inventory',
  method: 'POST',
  data,  // ✅ Authorization header interceptor tarafından ekleniyor
});
```

### Orval Interceptor (orval-mutator.ts):
```typescript
apiClient.interceptors.request.use((config) => {
  const token = window.__AUTH_TOKEN__ || 
                localStorage.getItem('x-ear.auth.token@v1');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;  // ✅ Otomatik!
  }
  return config;
});
```

### Test:
Artık envanter formu çalışmalı!
