# Stock Movements Issue Analysis

## Problem 1: Movements Not Loading ❌
- **Frontend**: Uses `useInventoryGetStockMovements` hook (InventoryMovementsTable.tsx:16)
- **OpenAPI**: ❌ GET /api/inventory/movements endpoint MISSING
- **Backend**: ✅ Route exists at inventory.py:786

## Problem 2: Patient Info Display 🎨
- **Current**: Simple "Hasta" column showing patient name
- **Requested**: Context-aware descriptions:
  - Sale → "Hastaya çıktı: Ali Veli"
  - Loaner → "Emanet verildi: Ayşe Yılmaz"
  - Return → "İade: Mehmet Demir"
  - Adjustment → "-" (no patient)

## Fix Plan:
1. Add GET /api/inventory/movements to OpenAPI
2. Regenerate Orval
3. Change "Hasta" column to "Açıklama"
4. Add helper function for context-aware descriptions
