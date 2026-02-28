# Promissory Note Payment Tracking Fix

## Problem
When collecting promissory note payments (tahsilat), the payments were not appearing in the "Ödeme Takibi" (Payment Tracking) tab immediately. Users had to refresh the page to see the collected payments.

## Root Cause
The `handleCollect` function in `PromissoryNotesTab.tsx` was only invalidating the promissory notes query (`getListSalePromissoryNotesQueryKey`) but not the payment records query (`getListPartyPaymentRecordsQueryKey`).

## Solution
Added query invalidation for payment records after successful promissory note collection:

```typescript
// Invalidate payment records query to show collected payment in Ödeme Takibi tab
await queryClient.invalidateQueries({
  queryKey: getListPartyPaymentRecordsQueryKey(sale.partyId)
});
```

## Backend Verification
Confirmed that the backend (`x-ear/apps/api/routers/payments.py` lines 421-500) correctly:
1. Creates `PaymentRecord` with `promissory_note_id` and `sale_id`
2. Updates `sale.paid_amount` with the collected amount
3. Sets payment type to `'promissory_note'`
4. Updates note status to `'paid'` or `'partial'` based on remaining balance

## Files Modified
- `x-ear/apps/web/src/components/payments/PromissoryNotesTab.tsx`
  - Added `getListPartyPaymentRecordsQueryKey` import
  - Added payment records query invalidation in `handleCollect` function

## Testing
1. Open a sale with promissory notes
2. Click "Tahsil Et" on a note
3. Enter collection details and submit
4. Verify payment appears immediately in "Ödeme Takibi" tab
5. Verify total paid amount updates correctly
6. Verify remaining balance decreases

## Expected Behavior
- ✅ Collected promissory note payments appear immediately in Ödeme Takibi tab
- ✅ Payment history shows "Senet ile Ödeme" entries
- ✅ Total paid amount updates automatically
- ✅ Remaining balance decreases by collected amount
- ✅ No page refresh required
