# Backend SGK Calculation Fix

## Problem
- `totalAmount` SGK tutarını düşmüyordu
- Satış geçmişi tablosunda yanlış tutarlar görünüyordu
- Bilateral satışlarda SGK toplamı yanlış hesaplanıyordu

## Solution
Backend `_build_full_sale_data()` fonksiyonunda:

1. **Total Net Payable Calculation**
   ```python
   total_net_payable = sum(float(d.get('netPayable') or 0) for d in devices)
   ```

2. **Total SGK Coverage Calculation**
   ```python
   total_sgk_coverage = sum(float(d.get('sgkSupport') or 0) for d in devices)
   ```

3. **Updated Fields**
   - `totalAmount` = `total_net_payable` (SGK düşülmüş)
   - `finalAmount` = `total_net_payable` (SGK düşülmüş)
   - `sgkCoverage` = `total_sgk_coverage` (tüm cihazların toplamı)
   - `remainingAmount` = `total_net_payable - paid_amount`

## Test Results
```
Sale ID: TEST-260301032514
- List Price: 30,000 TRY
- Discount: -2,000 TRY
- SGK Coverage: -4,239.2 TRY
- Net Payable: 21,250.8 TRY ✅
- Paid: 5,000 TRY
- Remaining: 16,250.8 TRY ✅
```

## Files Changed
- `x-ear/apps/api/routers/sales.py` - `_build_full_sale_data()` function
