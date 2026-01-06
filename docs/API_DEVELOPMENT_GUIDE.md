# API Development Guide

Bu döküman, X-EAR projesinde API geliştirme sürecini ve TypeScript tip güvenliğini nasıl sağlayacağınızı açıklar.

## 🎯 Hedef

Orval tarafından üretilen API isim değişikliklerinden frontend kodunu korumak ve PR'lerde tip hatalarını otomatik olarak yakalamak.

## 📁 Dosya Yapısı

```
x-ear/apps/web/
├── src/api/
│   ├── generated/           # Orval tarafından üretilen dosyalar (DÜZENLEME!)
│   │   ├── index.ts         # Ana export dosyası (otomatik)
│   │   ├── aliases.ts       # Stabil alias'lar (otomatik)
│   │   ├── schemas/         # TypeScript tipleri
│   │   └── [module]/        # API modülleri (users, patients, etc.)
│   ├── adapters/            # Manuel adapter'lar (gerekirse)
│   └── orval-mutator.ts     # Axios instance
├── api-aliases.json         # Manuel alias override'ları
└── scripts/
    ├── generate-api-index.mjs    # Index generator
    └── generate-api-aliases.mjs  # Alias generator
```

## 🔄 Workflow

### 1. Backend API Değişikliği Yaptığınızda

```bash
# 1. OpenAPI spec'i güncelle
cd apps/backend
python scripts/generate_openapi.py

# 2. Frontend API'yi yeniden üret
cd ../web
npm run gen:api

# 3. Tip kontrolü yap
npm run type-check

# 4. Değişiklikleri commit et
git add src/api/generated/
git commit -m "chore: regenerate API types"
```

### 2. Import Hatası Aldığınızda

Eğer `TS2305: Module has no exported member 'xxx'` hatası alıyorsanız:

1. **Doğru ismi bul:**
   ```bash
   # Generated dosyalarda ara
   grep -r "export const" src/api/generated/ | grep -i "istediğiniz_fonksiyon"
   ```

2. **Alias ekle (opsiyonel):**
   `api-aliases.json` dosyasına manuel alias ekleyin:
   ```json
   {
     "aliases": {
       "eskiIsim": "yeniStabilIsim"
     }
   }
   ```

3. **API'yi yeniden üret:**
   ```bash
   npm run gen:api
   ```

### 3. Yeni Endpoint Eklediğinizde

1. Backend'de endpoint'i ekleyin
2. `npm run gen:api` çalıştırın
3. Yeni fonksiyonu `src/api/generated/[module]/[module].ts` içinde bulun
4. Gerekirse `api-aliases.json`'a stabil alias ekleyin

## 🛡️ CI/CD Koruması

PR'lar şu kontrolleri geçmelidir:

1. **Generated files check:** `npm run gen:api` sonrası dosyalar değişmemeli
2. **Type check:** `npm run type-check` başarılı olmalı
3. **Build:** `npm run build` başarılı olmalı

### CI Hatası Aldığınızda

```bash
# Lokal olarak düzelt
npm run gen:api
npm run type-check

# Değişiklikleri commit et
git add .
git commit -m "fix: update generated API types"
git push
```

## 📝 Best Practices

### ✅ Yapın

- `@/api/generated` veya `@/api/adapters` üzerinden import edin
- Tip hatalarını hemen düzeltin
- `npm run gen:api` sonrası commit edin
- Stabil alias'lar için `api-aliases.json` kullanın

### ❌ Yapmayın

- `src/api/generated/` içindeki dosyaları manuel düzenlemeyin
- Tip hatalarını `// @ts-ignore` ile geçiştirmeyin
- `any` tipini gereksiz yere kullanmayın
- Generated dosyaları `.gitignore`'a eklemeyin

## 🔧 Geliştirme Ergonomisi

### Watch Mode ile Tip Kontrolü

```bash
# Terminal 1: Vite dev server
npm run dev

# Terminal 2: TypeScript watch
npm run type-check -- --watch

# Veya tek komutla (concurrently gerekli)
npm run dev:typecheck
```

### VS Code Ayarları

`.vscode/settings.json`:
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## 🐛 Sık Karşılaşılan Sorunlar

### 1. "Module has no exported member"

**Sebep:** Orval isim değişikliği yaptı
**Çözüm:** `npm run gen:api` çalıştır, doğru ismi bul

### 2. "Property does not exist on type"

**Sebep:** API schema değişti
**Çözüm:** `npm run gen:api` çalıştır, tip tanımını güncelle

### 3. "Cannot find module"

**Sebep:** Yeni modül eklendi ama index güncellenmedi
**Çözüm:** `npm run gen:api` çalıştır

## 🔍 Hata Tipleri ve Çözümleri

### TS2305 - Eksik Export
```
Module '"@/api/generated"' has no exported member 'xxx'
```
**Çözüm:** `api-aliases.json`'a alias ekle veya doğru ismi bul

### TS2339 - Property Mismatch
```
Property 'xxx' does not exist on type 'YYY'
```
**Çözüm:** Backend schema'sı değişmiş, `npm run gen:api` çalıştır

### TS2345 - Tip Uyumsuzluğu
```
Argument of type 'X' is not assignable to parameter of type 'Y'
```
**Çözüm:** Local tip tanımını API tipine uyumlu hale getir veya type assertion kullan

### TS18046 - Unknown Type
```
'response' is of type 'unknown'
```
**Çözüm:** Response'u cast et: `const data = response as MyType`

### TS2307 - Module Not Found
```
Cannot find module '@/api/generated/schemas/xxx'
```
**Çözüm:** Dosya yolu değişmiş, `@/api/generated/schemas` üzerinden import et

## 🏗️ Mimari Kararlar

### Neden Alias Sistemi?

Orval her çalıştığında endpoint isimlerine göre fonksiyon isimleri üretir:
- `GET /api/users/me` → `getMeApiUsersMeGet`
- Endpoint değişirse → `getMeApiUsersCurrentGet`

Bu değişiklik tüm import'ları kırar. Alias sistemi:
1. Stabil isimler sağlar: `useUsersGetMe`
2. Tek noktadan güncelleme: `api-aliases.json`
3. Backward compatibility

### Neden Generated Dosyalar Commit Ediliyor?

1. **Offline geliştirme** - Backend olmadan çalışabilirsin
2. **IDE desteği** - Autocomplete ve tip kontrolü hemen çalışır
3. **PR review** - API değişiklikleri görünür
4. **CI hızı** - Her build'de regenerate gerekmez

### Neden MJS (JavaScript) Script'ler?

1. **Aynı ekosistem** - Node.js zaten var, Python gerekmez
2. **npm entegrasyonu** - `package.json` scripts ile doğrudan çalışır
3. **CI basitliği** - Sadece Node.js setup yeterli
4. **Tutarlılık** - Mevcut `generate-api-index.mjs` ile uyumlu

## 📚 Kaynaklar

- [Orval Documentation](https://orval.dev/)
- [TanStack Query](https://tanstack.com/query)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [OpenAPI Specification](https://swagger.io/specification/)
