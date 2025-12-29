# Missing Orval Hooks - Complete Analysis

## ❌ Missing Hooks Causing App Crash:

### 1. `useDeviceAssignmentsReturnLoaner`
- **Location**: `PatientDevicesTab.tsx:19`
- **Import**: `device-assignments/device-assignments`
- **Backend Endpoint**: `POST /api/device-assignments/{assignment_id}/return-loaner`
- **Status**: ❌ Missing from OpenAPI

### 2. `useSalesUpdateDeviceAssignment`  
- **Location**: `PatientDevicesTab.tsx:18`
- **Import**: `device-assignments/device-assignments`
- **Backend Endpoint**: `PATCH /api/device-assignments/{assignment_id}`
- **Status**: ⚠️ Endpoint exists but missing `requestBody` definition

## ✅ Already Fixed:
- `usePatientsGetPatientReplacements` - ✅ Added GET endpoint

## ✅ Working Hooks:
- `useInventoryGetStockMovements` - ✅ (from StockMovement schema fix)
- `useReplacementsCreateReturnInvoice` - ✅
- `useReplacementsCreatePatientReplacement` - ✅
- `useSalesAssignDevicesExtended` - ✅

## Action Plan:
1. Add `POST /api/device-assignments/{assignment_id}/return-loaner` endpoint to OpenAPI
2. Add `requestBody` to existing `PATCH /api/device-assignments/{assignment_id}` endpoint
3. Regenerate Orval
4. Test app
5. Commit & Push
