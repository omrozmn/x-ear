# 🔧 Immediate Fixes - Implementation Guide

**Priority:** 🔴 CRITICAL  
**Sprint:** Current (Week 1)  
**Estimated Time:** 2-3 days  
**Risk Level:** Low

---

## 📋 Fix Checklist

- [ ] 1. Database migration (add discount_type, discount_value)
- [ ] 2. Backend: Update _build_full_sale_data()
- [ ] 3. Backend: Update PATCH /sales/{id} endpoint
- [ ] 4. Frontend: Fix useEditSale.ts field mapping
- [ ] 5. Frontend: Fix SalesTableView discount display
- [ ] 6. Frontend: Add payment method validation
- [ ] 7. Write unit tests
- [ ] 8. Manual QA testing
- [ ] 9. Deploy to staging
- [ ] 10. Deploy to production

---

## 🗄️ FIX #1: Database Migration

### File: `x-ear/apps/api/alembic/versions/add_discount_fields_to_sales.py`

```python
"""Add discount_type and discount_value to sales table

Revision ID: add_discount_fields
Revises: add_kdv_to_sales
Create Date: 2026-03-02 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_discount_fields'
down_revision = 'add_kdv_to_sales'  # Update to your latest migration
branch_labels = None
depends_on = None

def upgrade():
    # Add discount_type column
    op.add_column('sales', sa.Column(
        'discount_type',
        sa.String(20),
        nullable=True,
        server_default='none'
    ))
    
    # Add discount_value column
    op.add_column('sales', sa.Column(
        'discount_value',
        sa.Numeric(12, 2),
        nullable=True,
        server_default='0.0'
    ))
    
    # Backfill data from device_assignments
    # For sales with device assignments, copy discount info
    op.execute("""
        UPDATE sales s
        SET 
            discount_type = COALESCE(da.discount_type, 'none'),
            discount_value = COALESCE(da.discount_value, 0.0)
        FROM (
            SELECT DISTINCT ON (sale_id)
                sale_id,
                discount_type,
                discount_value
            FROM device_assignments
            WHERE sale_id IS NOT NULL
            ORDER BY sale_id, created_at DESC
        ) da
        WHERE s.id = da.sale_id
          AND s.discount_type IS NULL
    """)
    
    # For sales without assignments, calculate from discount_amount
    # Assume percentage if discount_amount is small relative to list_price_total
    op.execute("""
        UPDATE sales
        SET 
            discount_type = CASE
                WHEN discount_amount = 0 THEN 'none'
                WHEN discount_amount > 0 AND list_price_total > 0 
                     AND (discount_amount / list_price_total) < 1.0 THEN 'percentage'
                ELSE 'amount'
            END,
            discount_value = CASE
                WHEN discount_amount = 0 THEN 0.0
                WHEN discount_amount > 0 AND list_price_total > 0 
                     AND (discount_amount / list_price_total) < 1.0 
                     THEN (discount_amount / list_price_total) * 100
                ELSE discount_amount
            END
        WHERE discount_type IS NULL
    """)
    
    # Make columns non-nullable after backfill
    op.alter_column('sales', 'discount_type', nullable=False)
    op.alter_column('sales', 'discount_value', nullable=False)

def downgrade():
    op.drop_column('sales', 'discount_value')
    op.drop_column('sales', 'discount_type')
```

### Run Migration

```bash
cd x-ear/apps/api
source .venv/bin/activate  # or your venv activation command
alembic upgrade head
```

---

## 🔧 FIX #2: Backend - Update _build_full_sale_data()

### File: `x-ear/apps/api/routers/sales.py`

**Current Code (line ~320-400):**
```python
def _build_full_sale_data(sale, devices):
    # ... existing code ...
    
    # ❌ OLD: Reverse-engineer discount type
    discount_type = 'percentage'  # Always assumed!
    if discount_amount and discount_amount > 0 and actual_list_price_total > 0:
        discount_value = (discount_amount / actual_list_price_total) * 100
    else:
        discount_value = 0
```

**New Code:**
```python
def _build_full_sale_data(sale, devices):
    """Build complete sale data with device details"""
    device_count = len(devices) if devices else 1
    
    # Get unit list price (note: column name is misleading)
    unit_list_price = sale.list_price_total or 0
    actual_list_price_total = unit_list_price * device_count
    
    # ✅ NEW: Use stored discount type and value
    discount_type = sale.discount_type or 'none'
    discount_value = sale.discount_value or 0
    discount_amount = sale.discount_amount or 0
    
    # Validate discount consistency
    if discount_type == 'percentage' and discount_value > 0:
        # Recalculate discount_amount to ensure consistency
        calculated_discount = (actual_list_price_total * discount_value) / 100
        if abs(calculated_discount - discount_amount) > 0.01:
            logger.warning(
                f"Sale {sale.id}: Discount amount mismatch. "
                f"Stored: {discount_amount}, Calculated: {calculated_discount}"
            )
    elif discount_type == 'amount' and discount_value > 0:
        # For fixed amount, discount_value should equal discount_amount
        if abs(discount_value - discount_amount) > 0.01:
            logger.warning(
                f"Sale {sale.id}: Fixed discount mismatch. "
                f"Value: {discount_value}, Amount: {discount_amount}"
            )
    
    sgk_coverage = sale.sgk_coverage or 0
    final_amount = actual_list_price_total - discount_amount - sgk_coverage
    remaining_amount = max(0, final_amount - (sale.paid_amount or 0))
    
    # Build response
    sale_data = {
        'id': sale.id,
        'partyId': sale.party_id,
        'saleDate': sale.sale_date.isoformat() if sale.sale_date else None,
        'status': sale.status,
        'paymentMethod': sale.payment_method,
        
        # Pricing fields
        'listPriceTotal': unit_list_price,  # Note: This is per-unit price
        'actualListPriceTotal': actual_list_price_total,  # Total for all devices
        'discountType': discount_type,  # ✅ From DB
        'discountValue': float(discount_value),  # ✅ From DB
        'discountAmount': float(discount_amount),
        'sgkCoverage': float(sgk_coverage),
        'finalAmount': float(final_amount),
        'paidAmount': float(sale.paid_amount or 0),
        'remainingAmount': float(remaining_amount),
        
        # KDV fields
        'kdvRate': float(sale.kdv_rate or 0),
        'kdvAmount': float(sale.kdv_amount or 0),
        
        # Device details
        'devices': [_format_device_assignment(d) for d in devices],
        'deviceCount': device_count,
        
        # Metadata
        'notes': sale.notes,
        'createdAt': sale.created_at.isoformat() if sale.created_at else None,
        'updatedAt': sale.updated_at.isoformat() if sale.updated_at else None
    }
    
    return sale_data
```

---

## 🔧 FIX #3: Backend - Update PATCH Endpoint

### File: `x-ear/apps/api/routers/sales.py`

**Add to PATCH /sales/{sale_id} endpoint:**

```python
@router.patch("/sales/{sale_id}", response_model=ResponseEnvelope[SaleRead])
async def update_sale(
    sale_id: str,
    update_data: SaleUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_access("sales.edit"))
):
    """Update sale and related device assignments"""
    tenant_id = current_user.get("tenant_id")
    
    # Get existing sale
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.tenant_id == tenant_id
    ).first()
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Get existing device assignments
    assignments = db.query(DeviceAssignment).filter(
        DeviceAssignment.sale_id == sale_id,
        DeviceAssignment.tenant_id == tenant_id
    ).all()
    
    # ✅ NEW: Handle ear selection changes
    if update_data.ear and update_data.ear != sale.ear:
        logger.info(f"Ear selection changed from {sale.ear} to {update_data.ear}")
        
        if update_data.ear == 'both' and len(assignments) == 1:
            # Create second assignment
            existing = assignments[0]
            new_ear = 'right' if existing.ear == 'left' else 'left'
            
            new_assignment = DeviceAssignment(
                party_id=sale.party_id,
                device_id=existing.device_id,
                inventory_id=existing.inventory_id,
                sale_id=sale_id,
                tenant_id=tenant_id,
                ear=new_ear,
                reason=existing.reason,
                list_price=existing.list_price,
                sale_price=existing.sale_price,
                sgk_scheme=existing.sgk_scheme,
                sgk_support=existing.sgk_support,
                discount_type=existing.discount_type,
                discount_value=existing.discount_value,
                delivery_status=existing.delivery_status,
                report_status=existing.report_status
            )
            db.add(new_assignment)
            logger.info(f"Created new {new_ear} ear assignment")
            
        elif update_data.ear in ['left', 'right'] and len(assignments) == 2:
            # Delete the assignment that doesn't match
            for assignment in assignments:
                if assignment.ear != update_data.ear:
                    db.delete(assignment)
                    logger.info(f"Deleted {assignment.ear} ear assignment")
                    break
    
    # Update sale fields
    if update_data.list_price_total is not None:
        sale.list_price_total = update_data.list_price_total
    
    if update_data.discount_type is not None:
        sale.discount_type = update_data.discount_type
    
    if update_data.discount_value is not None:
        sale.discount_value = update_data.discount_value
        
        # Recalculate discount_amount based on type
        if update_data.discount_type == 'percentage':
            device_count = len(assignments)
            actual_total = sale.list_price_total * device_count
            sale.discount_amount = (actual_total * update_data.discount_value) / 100
        elif update_data.discount_type == 'amount':
            sale.discount_amount = update_data.discount_value
    
    if update_data.sgk_coverage is not None:
        sale.sgk_coverage = update_data.sgk_coverage
    
    if update_data.final_amount is not None:
        sale.final_amount = update_data.final_amount
    
    if update_data.paid_amount is not None:
        sale.paid_amount = update_data.paid_amount
    
    # Update device assignments
    for assignment in assignments:
        if update_data.sgk_scheme:
            assignment.sgk_scheme = update_data.sgk_scheme
        
        if update_data.serial_number_left and assignment.ear in ['left', 'both']:
            assignment.serial_number_left = update_data.serial_number_left
        
        if update_data.serial_number_right and assignment.ear in ['right', 'both']:
            assignment.serial_number_right = update_data.serial_number_right
        
        if update_data.delivery_status:
            assignment.delivery_status = update_data.delivery_status
        
        if update_data.report_status:
            assignment.report_status = update_data.report_status
        
        if update_data.discount_type:
            assignment.discount_type = update_data.discount_type
        
        if update_data.discount_value is not None:
            assignment.discount_value = update_data.discount_value
    
    db.commit()
    db.refresh(sale)
    
    # Rebuild full sale data
    updated_assignments = db.query(DeviceAssignment).filter(
        DeviceAssignment.sale_id == sale_id
    ).all()
    
    sale_data = _build_full_sale_data(sale, updated_assignments)
    
    return ResponseEnvelope(
        success=True,
        data=sale_data,
        message="Sale updated successfully"
    )
```

---

## 🎨 FIX #4: Frontend - Fix useEditSale.ts Field Mapping

### File: `x-ear/apps/web/src/components/parties/modals/edit-sale-modal/hooks/useEditSale.ts`

**Current Code (line ~180-220):**
```typescript
setFormData(prev => ({
  ...prev,
  listPrice: firstDevice?.listPrice || 0,
  salePrice: extendedSale.finalAmount,  // ❌ WRONG - This is total!
  discountAmount: extendedSale.discountAmount || 0,
  // ...
}));
```

**Fixed Code:**
```typescript
setFormData(prev => ({
  ...prev,
  // Use device data from devices array first
  productName: firstDevice?.name || productDetails?.name || sale.productId || '',
  brand: firstDevice?.brand || productDetails?.brand || '',
  model: firstDevice?.model || productDetails?.model || '',
  category: firstDevice?.category || productDetails?.category || '',
  barcode: firstDevice?.barcode || productDetails?.barcode || '',
  
  // Serial numbers
  serialNumber: firstDevice?.serialNumber || '',
  serialNumberLeft: firstDevice?.serialNumberLeft || '',
  serialNumberRight: firstDevice?.serialNumberRight || '',
  
  // ✅ FIXED: Use per-unit prices
  listPrice: firstDevice?.listPrice || (extendedSale.listPriceTotal ? extendedSale.listPriceTotal / (devices.length || 1) : 0),
  salePrice: firstDevice?.salePrice || (extendedSale.finalAmount ? extendedSale.finalAmount / (devices.length || 1) : 0),
  
  // Discount fields - use device data first
  discountAmount: firstDevice?.discountValue || extendedSale.discountAmount || 0,
  discountType: (firstDevice?.discountType || extendedSale.discountType || 'none') as 'none' | 'percentage' | 'amount',
  
  // SGK coverage - calculate total from all devices
  sgkCoverage: devices.reduce((sum, d) => sum + (d.sgkSupport || d.sgkCoverageAmount || 0), 0) || extendedSale.sgkCoverage || 0,
  sgkScheme: firstDevice?.sgkScheme || '',
  
  // Payment
  downPayment: extendedSale.paidAmount || 0,
  notes: sale.notes || '',
  saleDate: sale.saleDate ? sale.saleDate.split('T')[0] : '',
  
  // Device info
  deviceId: firstDevice?.id || sale.productId || '',
  ear: devices.length === 2 && devices.some(d => d.ear === 'left') && devices.some(d => d.ear === 'right')
    ? 'both'
    : (firstDevice?.ear as 'left' | 'right' | 'both' || 'both'),
  
  // Status fields
  deliveryStatus: firstDevice?.deliveryStatus || 'pending',
  reportStatus: firstDevice?.reportStatus || 'raporsuz',
  reason: firstDevice?.reason || 'Satış',
  
  // Keep existing values for these
  quantity: prev.quantity,
  warrantyPeriod: prev.warrantyPeriod,
  fittingDate: prev.fittingDate,
  deliveryDate: prev.deliveryDate
}));
```

---

## 🎨 FIX #5: Frontend - Fix SalesTableView Discount Display

### File: `x-ear/apps/web/src/components/parties/party/SalesTableView.tsx`

**Current Code (line ~60):**
```typescript
const formatDiscount = (sale: Sale) => {
  const discountType = sale.discountType || 'none';
  const discountValue = sale.discountValue || 0;
  const discountAmount = sale.discountAmount || 0;
  
  if (discountType === 'percentage' && discountValue > 0) {
    return `%${discountValue.toFixed(2)}`;
  } else if (discountType === 'amount' && discountAmount > 0) {
    return `${discountAmount.toLocaleString('tr-TR')} TRY`;
  }
  return '-';
};
```

**Fixed Code:**
```typescript
const formatDiscount = (sale: Sale) => {
  const discountType = sale.discountType || 'none';
  const discountValue = sale.discountValue || 0;
  const discountAmount = sale.discountAmount || 0;
  
  // Handle different discount types
  if (discountType === 'percentage' && discountValue > 0) {
    // Show percentage without amount in parentheses
    return `%${discountValue.toFixed(2)}`;
  } else if (discountType === 'amount' && discountAmount > 0) {
    // Show fixed amount in TRY
    return `${discountAmount.toLocaleString('tr-TR')} TRY`;
  } else if (discountType === 'none' || discountValue === 0) {
    return '-';
  }
  
  // Fallback: If discountType is missing but discountAmount exists
  // (for old data before migration)
  if (discountAmount > 0) {
    return `${discountAmount.toLocaleString('tr-TR')} TRY`;
  }
  
  return '-';
};
```

---

## 🎨 FIX #6: Frontend - Add Payment Method Validation

### File: `x-ear/apps/web/src/components/parties/modals/edit-sale-modal/hooks/useEditSale.ts`

**Add to validateForm() function (line ~250):**

```typescript
const validateForm = (): boolean => {
  if (!formData.productName.trim()) {
    updateState({ error: 'Product name is required' });
    return false;
  }
  
  if (formData.listPrice <= 0) {
    updateState({ error: 'List price must be greater than 0' });
    return false;
  }
  
  if (!formData.saleDate) {
    updateState({ error: 'Sale date is required' });
    return false;
  }
  
  // ✅ NEW: Validate payment method when down payment exists
  const downPayment = formData.downPayment || 0;
  if (downPayment > 0 && !state.paymentMethod) {
    updateState({ error: 'Ön ödeme girildiğinde ödeme yöntemi seçimi zorunludur' });
    return false;
  }
  
  return true;
};
```

---

## 🧪 FIX #7: Write Unit Tests

### File: `x-ear/apps/api/tests/test_sales_discount.py`

```python
import pytest
from decimal import Decimal
from core.models.sales import Sale, DeviceAssignment
from routers.sales import _build_full_sale_data

def test_percentage_discount_calculation():
    """Test percentage discount is calculated correctly"""
    sale = Sale(
        id="test_sale_1",
        list_price_total=Decimal("54500"),
        discount_type="percentage",
        discount_value=Decimal("10"),
        discount_amount=Decimal("5450"),
        sgk_coverage=Decimal("3391.36"),
        final_amount=Decimal("45658.64"),
        paid_amount=Decimal("1000")
    )
    
    devices = [
        DeviceAssignment(
            ear="left",
            list_price=Decimal("54500"),
            discount_type="percentage",
            discount_value=Decimal("10")
        )
    ]
    
    result = _build_full_sale_data(sale, devices)
    
    assert result['discountType'] == 'percentage'
    assert result['discountValue'] == 10.0
    assert result['discountAmount'] == 5450.0
    assert result['actualListPriceTotal'] == 54500.0  # 1 device
    assert result['finalAmount'] == 45658.64

def test_fixed_amount_discount():
    """Test fixed amount discount is handled correctly"""
    sale = Sale(
        id="test_sale_2",
        list_price_total=Decimal("54500"),
        discount_type="amount",
        discount_value=Decimal("5000"),
        discount_amount=Decimal("5000"),
        sgk_coverage=Decimal("3391.36"),
        final_amount=Decimal("46108.64"),
        paid_amount=Decimal("0")
    )
    
    devices = [
        DeviceAssignment(
            ear="left",
            list_price=Decimal("54500"),
            discount_type="amount",
            discount_value=Decimal("5000")
        )
    ]
    
    result = _build_full_sale_data(sale, devices)
    
    assert result['discountType'] == 'amount'
    assert result['discountValue'] == 5000.0
    assert result['discountAmount'] == 5000.0

def test_bilateral_sale_calculation():
    """Test bilateral sale with 2 devices"""
    sale = Sale(
        id="test_sale_3",
        list_price_total=Decimal("54500"),  # Per unit
        discount_type="percentage",
        discount_value=Decimal("10"),
        discount_amount=Decimal("10900"),  # 10% of 109000
        sgk_coverage=Decimal("6782.72"),  # Total for 2 devices
        final_amount=Decimal("91317.28"),
        paid_amount=Decimal("0")
    )
    
    devices = [
        DeviceAssignment(ear="left", list_price=Decimal("54500")),
        DeviceAssignment(ear="right", list_price=Decimal("54500"))
    ]
    
    result = _build_full_sale_data(sale, devices)
    
    assert result['deviceCount'] == 2
    assert result['actualListPriceTotal'] == 109000.0  # 54500 × 2
    assert result['discountAmount'] == 10900.0
    assert result['finalAmount'] == 91317.28
```

### File: `x-ear/apps/web/src/components/parties/modals/edit-sale-modal/hooks/__tests__/useEditSale.test.ts`

```typescript
import { renderHook } from '@testing-library/react';
import { useEditSale } from '../useEditSale';

describe('useEditSale calculations', () => {
  it('calculates percentage discount correctly', () => {
    const sale = {
      id: 'test_1',
      listPriceTotal: 54500,
      discountType: 'percentage',
      discountValue: 10,
      discountAmount: 5450,
      devices: [{
        listPrice: 54500,
        ear: 'left'
      }]
    };
    
    const { result } = renderHook(() => useEditSale(sale, true));
    
    expect(result.current.calculatedPricing.totalAmount).toBe(45658.64);
  });
  
  it('calculates fixed amount discount correctly', () => {
    const sale = {
      id: 'test_2',
      listPriceTotal: 54500,
      discountType: 'amount',
      discountValue: 5000,
      discountAmount: 5000,
      devices: [{
        listPrice: 54500,
        ear: 'left'
      }]
    };
    
    const { result } = renderHook(() => useEditSale(sale, true));
    
    expect(result.current.calculatedPricing.totalAmount).toBe(46108.64);
  });
  
  it('handles bilateral sales correctly', () => {
    const sale = {
      id: 'test_3',
      listPriceTotal: 54500,
      devices: [
        { listPrice: 54500, ear: 'left' },
        { listPrice: 54500, ear: 'right' }
      ]
    };
    
    const { result } = renderHook(() => useEditSale(sale, true));
    
    expect(result.current.formData.ear).toBe('both');
    expect(result.current.formData.listPrice).toBe(54500); // Per unit
  });
});
```

---

## 📋 FIX #8: Manual QA Testing Checklist

### Test Scenarios

#### Scenario 1: Create Sale with Percentage Discount
- [ ] Create new sale with 10% discount
- [ ] Verify discount_type='percentage' in DB
- [ ] Verify discount_value=10 in DB
- [ ] View sales history, verify shows "%10.00"
- [ ] Edit sale, verify modal shows correct values
- [ ] Change discount to 15%, save
- [ ] Verify updated values in DB and display

#### Scenario 2: Create Sale with Fixed Amount Discount
- [ ] Create new sale with 5000 TRY discount
- [ ] Verify discount_type='amount' in DB
- [ ] Verify discount_value=5000 in DB
- [ ] View sales history, verify shows "5000 TRY"
- [ ] Edit sale, verify modal shows correct values

#### Scenario 3: Bilateral Sale
- [ ] Create sale with ear='both' (2 devices)
- [ ] Verify 2 DeviceAssignment records created
- [ ] Verify list_price_total is per-unit in DB
- [ ] View sales history, verify total calculations
- [ ] Edit sale, verify "Birim Satış Fiyatı" shows per-unit price

#### Scenario 4: Ear Selection Changes
- [ ] Create sale with ear='left' (1 device)
- [ ] Edit sale, change ear to 'both'
- [ ] Save and verify 2nd DeviceAssignment created
- [ ] Edit again, change ear to 'right'
- [ ] Verify left assignment deleted, right remains

#### Scenario 5: Payment Method Validation
- [ ] Edit sale, enter down payment without selecting payment method
- [ ] Try to save, verify validation error
- [ ] Select payment method, save successfully

---

## 🚀 Deployment Steps

### Step 1: Backup Database
```bash
# Production backup
pg_dump -h localhost -U postgres -d x_ear_prod > backup_before_discount_fix_$(date +%Y%m%d).sql
```

### Step 2: Deploy to Staging
```bash
# Pull latest code
git pull origin main

# Run migration on staging
cd x-ear/apps/api
source .venv/bin/activate
alembic upgrade head

# Restart backend
pm2 restart x-ear-api-staging

# Deploy frontend
cd ../../apps/web
npm run build
# Deploy build to staging server
```

### Step 3: Test on Staging
- [ ] Run all manual QA scenarios
- [ ] Verify no errors in logs
- [ ] Check database for correct values
- [ ] Test with real user accounts

### Step 4: Deploy to Production
```bash
# Schedule maintenance window (5-10 minutes)
# Run migration on production
cd x-ear/apps/api
source .venv/bin/activate
alembic upgrade head

# Restart backend
pm2 restart x-ear-api-prod

# Deploy frontend
cd ../../apps/web
npm run build
# Deploy build to production server
```

### Step 5: Monitor Production
- [ ] Check error logs for 1 hour
- [ ] Verify sales creation works
- [ ] Verify sales editing works
- [ ] Check discount display in sales history
- [ ] Monitor database performance

---

## 🔄 Rollback Plan

If issues occur in production:

### Step 1: Rollback Code
```bash
# Revert to previous version
git revert HEAD
git push origin main

# Redeploy previous version
pm2 restart x-ear-api-prod
# Redeploy previous frontend build
```

### Step 2: Rollback Database (if needed)
```bash
# Downgrade migration
cd x-ear/apps/api
alembic downgrade -1

# Or restore from backup
psql -h localhost -U postgres -d x_ear_prod < backup_before_discount_fix_YYYYMMDD.sql
```

### Step 3: Notify Team
- Send alert to team
- Document issues encountered
- Schedule fix for next sprint

---

## 📊 Success Metrics

### Before Fix
- ❌ Discount display: 0% for all sales
- ❌ Wrong "Birim Satış Fiyatı" in modal
- ❌ Calculation mismatches between frontend/backend
- ❌ Ear selection changes don't work

### After Fix
- ✅ Discount display: Correct % or TRY
- ✅ Correct per-unit prices in modal
- ✅ Consistent calculations
- ✅ Ear selection changes create/delete assignments
- ✅ All unit tests passing
- ✅ No production errors

---

## 📞 Support

**Questions during implementation?**
- Check `COMPREHENSIVE_QA_ANALYSIS.md` for detailed analysis
- Check `SALES_DATA_FLOW_DIAGRAM.md` for visual flow
- Contact team lead for clarification

**Issues during deployment?**
- Follow rollback plan immediately
- Document error messages
- Check logs: `pm2 logs x-ear-api-prod`
- Check database: `psql -d x_ear_prod`

---

**Implementation Date:** TBD  
**Implemented By:** TBD  
**Reviewed By:** TBD  
**Deployed By:** TBD
