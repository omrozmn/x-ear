-- Fix discount_type and discount_value in old device assignments
-- This script updates device assignments that have discount_amount but missing discount_type

-- For assignments with discount_amount > 0 but no discount_type, set to 'amount'
UPDATE device_assignments
SET 
    discount_type = 'amount',
    discount_value = discount_amount
WHERE 
    discount_amount IS NOT NULL 
    AND discount_amount > 0 
    AND (discount_type IS NULL OR discount_type = '');

-- Verify the update
SELECT 
    id,
    sale_id,
    discount_type,
    discount_value,
    discount_amount,
    list_price,
    sale_price
FROM device_assignments
WHERE discount_amount > 0
ORDER BY created_at DESC
LIMIT 10;
