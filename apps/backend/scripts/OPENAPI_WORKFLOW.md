# OpenAPI Otomatik Workflow Dokümantasyonu

## 🎯 Genel Bakış

Bu proje **tam otomatik OpenAPI generation** kullanıyor. Backend'deki Flask route'lar otomatik olarak OpenAPI spec'e dönüştürülüyor ve frontend API client'ları regenerate ediliyor.

## 📋 Workflow Adımları

### 1. Backend'de Yeni Endpoint Ekleme

```python
# apps/backend/routes/sales.py
@sales_bp.route('/api/sales', methods=['POST'])
@jwt_required()
def create_sale():
    """Create a new sale
    
    Creates a new device sale with payment plan.
    """
    # ... implementation
```

**Önemli:**
- Docstring ekleyin (ilk satır → summary, geri kalanı → description)
- camelCase operationId otomatik üretilir: `salesCreateSale`
- Path parametreleri otomatik algılanır: `<patient_id>` → `{patient_id}`

### 2. OpenAPI Sync Çalıştırma

```bash
# Root dizinden:
npm run sync:api
```

Bu komut:
1. ✅ Backend route'lardan `openapi.generated.yaml` üretir
2. ✅ Manuel `openapi.yaml.backup` ile merge eder
3. ✅ **Web app** API client'ını regenerate eder (`apps/web/src/api/generated`)
4. ✅ **Admin app** API client'ını regenerate eder (`apps/admin/src/lib/api`)
5. ✅ **Landing app** API client'ını regenerate eder (`apps/landing/src/lib/api/generated`)

### 3. Frontend'de Kullanım

```typescript
// Otomatik generate edilen hook:
import { usePostApiSales } from '@/lib/api/sales/sales';

function CreateSaleForm() {
  const { mutate, isPending } = usePostApiSales();
  
  const handleSubmit = (data) => {
    mutate({ data }, {
      onSuccess: () => toast.success('Satış oluşturuldu'),
    });
  };
}
```

## 🔄 Otomatik Generation Detayları

### generate_openapi.py

Backend Flask app'i inspect eder:
- `app.url_map` → Tüm route'ları tarar
- `view_functions` → Docstring'leri çıkarır
- Path parametrelerini OpenAPI formatına çevirir
- camelCase operationId'ler üretir

**Naming Convention:**
```python
# Backend function → operationId
list_patients()    → patientsGetPatients  # list = GET collection
get_patient()      → patientsGetPatient   # get = GET single
create_sale()      → salesCreateSale      # create = POST
update_patient()   → patientsUpdatePatient # update = PUT/PATCH
delete_sale()      → salesDeleteSale      # delete = DELETE
```

### merge_openapi.py

İki spec'i birleştirir:
- **Manuel spec** (`openapi.yaml.backup`): Detaylı schema'lar, response types
- **Auto-generated**: Yeni endpoint'ler, güncel path'ler
- **Sonuç**: En iyi ikisinin kombinasyonu

## 🎨 Orval Configuration

### Web App (apps/web/orval.config.mjs)

```javascript
{
  input: '../../openapi.yaml',
  output: {
    mode: 'tags-split',           // Tag'lere göre dosyalara böl
    target: './src/api/generated',
    client: 'react-query',        // React Query hooks
    clean: true,                  // Eski dosyaları temizle
    override: {
      mutator: './src/api/orval-mutator.ts'  // Custom axios instance
    }
  }
}
```

### Admin App (apps/admin/orval.config.ts)

```typescript
{
  input: '../../openapi.yaml',
  output: {
    mode: 'tags-split',
    target: './src/lib/api',
    client: 'react-query',
    override: {
      mutator: './src/lib/apiMutator.ts'  // Offline queue + retry logic
    }
  }
}
```

### Landing App (apps/landing/orval.config.ts)

```typescript
{
  input: '../../openapi.yaml',
  output: {
    mode: 'tags-split',
    target: './src/lib/api/generated',
    client: 'react-query',
    override: {
      mutator: './src/lib/api/api-mutator.ts'  // Custom axios instance
    }
  },
  hooks: {
    afterAllFilesWrite: 'node scripts/generate-api-index.mjs'  // Auto-generate index
  }
}
```

## ⚠️ Hook Kırılma Durumları

### ❌ Hook Adı Değişir (Breaking Change)

```python
# ÖNCE:
@sales_bp.route('/api/sales', methods=['POST'])
def create_sale():  # → salesCreateSale → usePostApiSales()

# SONRA:
@sales_bp.route('/api/orders', methods=['POST'])  # ❌ Path değişti
def add_order():  # ❌ Function adı değişti
# → ordersAddOrder → usePostApiOrders()  # ❌ Hook adı değişti!
```

**Çözüm:** Migration script yazın veya frontend'de find-replace yapın.

### ✅ Hook Adı Aynı Kalır (Non-Breaking)

```python
# Response schema değişikliği:
def create_sale():
    return {
        'id': sale.id,
        'total': sale.total,
        'new_field': sale.new_field  # ✅ Yeni field eklendi
    }
```

Hook adı aynı kalır, sadece TypeScript tipi güncellenir.

## 🛡️ Best Practices

### 1. Endpoint Naming Stability

```python
# ✅ İYİ: Stabil, açıklayıcı isimler
@sales_bp.route('/api/sales', methods=['GET'])
def list_sales():  # → salesGetSales (stabil)

# ❌ KÖTÜ: Belirsiz, değişken isimler
@sales_bp.route('/api/sales', methods=['GET'])
def fetch_all():  # → salesGetAll (belirsiz)
```

### 2. Docstring Kullanımı

```python
# ✅ İYİ: Detaylı docstring
def create_sale():
    """Create a new device sale
    
    Creates a new sale record with payment plan, inventory allocation,
    and optional SGK integration.
    
    Returns:
        Sale object with payment schedule
    """

# ❌ KÖTÜ: Docstring yok
def create_sale():
    pass  # OpenAPI'de generic "POST /api/sales" görünür
```

### 3. Response Schema Consistency

```python
# ✅ İYİ: Tutarlı response format
return {
    'success': True,
    'data': sale.to_dict(),
    'meta': {'timestamp': now()}
}

# ❌ KÖTÜ: Değişken format
return sale.to_dict()  # Bazen dict, bazen list
```

## 🔧 Troubleshooting

### Problem: Yeni endpoint görünmüyor

```bash
# 1. Backend'i restart edin (route cache temizlenir)
cd apps/backend
python app.py

# 2. OpenAPI regenerate edin
npm run sync:api

# 3. Diff kontrol edin
git diff openapi.yaml
```

### Problem: Hook tipi yanlış

```bash
# 1. OpenAPI spec'i kontrol edin
cat openapi.yaml | grep -A 20 "/api/sales"

# 2. Manuel schema ekleyin (openapi.yaml.backup)
# 3. Merge edin
npm run sync:api
```

### Problem: Orval hata veriyor

```bash
# 1. OpenAPI spec'i validate edin
npx @stoplight/spectral-cli lint openapi.yaml

# 2. Syntax hatalarını düzeltin
# 3. Regenerate edin
cd apps/admin
npm run gen:api
```

## 📊 Monitoring

### OpenAPI Coverage

```bash
# Backend'de kaç endpoint var?
python apps/backend/scripts/generate_openapi.py --output /tmp/test.yaml
cat /tmp/test.yaml | grep "operationId:" | wc -l

# Frontend'de kaç hook var?
find apps/admin/src/lib/api -name "*.ts" | xargs grep "export const use" | wc -l
```

### Breaking Changes Detection

```bash
# OpenAPI diff (CI'da çalıştırılabilir)
git diff HEAD~1 openapi.yaml | grep "operationId:"
```

## 🚀 CI/CD Integration

```yaml
# .github/workflows/api-sync.yml
name: API Sync Check

on: [pull_request]

jobs:
  check-api-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Generate OpenAPI
        run: |
          cd apps/backend
          python scripts/generate_openapi.py
          python scripts/merge_openapi.py
      
      - name: Check for changes
        run: |
          if git diff --exit-code openapi.yaml; then
            echo "✅ OpenAPI is up to date"
          else
            echo "❌ OpenAPI is out of sync. Run: npm run sync:api"
            exit 1
          fi
```

## 📚 Kaynaklar

- [Orval Documentation](https://orval.dev/)
- [OpenAPI 3.0 Spec](https://swagger.io/specification/)
- [Flask URL Routing](https://flask.palletsprojects.com/en/2.3.x/api/#url-route-registrations)
