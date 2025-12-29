# Missing Orval Hooks Analysis

## Hooks Currently in Use (from grep):
1. `useInventoryGetStockMovements` - ✅ (inventory movements)
2. `useReplacementsCreateReturnInvoice` - ✅ (return invoices)
3. `usePatientsGetPatientReplacements` - ✅ FIXED

## Hooks from PatientDevicesTab (need to check):
- To be extracted from file...

## Backend Endpoints to Verify:
- POST /device-assignments/{id}/return-loaner
- PATCH /device-assignments/{id} (with requestBody)
- GET /inventory/movements
