// Test frontend calculation logic
const sgkAmounts = {
  'no_coverage': 0,
  'under4_parent_working': 6104.44,
  'under4_parent_retired': 7630.56,
  'age5_12_parent_working': 5426.17,
  'age5_12_parent_retired': 6782.72,
  'age13_18_parent_working': 5087.04,
  'age13_18_parent_retired': 6358.88,
  'over18_working': 3391.36,
  'over18_retired': 4239.20,
  'under18': 5000,
  'standard': 0
};

function calculatePricing(formData) {
  if (!formData.listPrice || formData.listPrice <= 0) {
    return {
      salePrice: 0,
      sgkReduction: 0,
      totalAmount: 0,
      remainingAmount: 0
    };
  }

  // ✅ UPDATED: SGK ÖNCE, İndirim SONRA formula (per user decision)
  const listPrice = formData.listPrice;
  const quantity = formData.ear === 'both' ? 2 : 1;
  const totalListPrice = listPrice * quantity;

  // 1. Calculate SGK reduction per unit
  let sgkReductionPerUnit = 0;
  if (formData.sgkScheme && formData.sgkScheme !== 'no_coverage') {
    const sgkAmount = sgkAmounts[formData.sgkScheme];
    if (sgkAmount !== undefined) {
      sgkReductionPerUnit = Math.min(sgkAmount, listPrice);
    }
  }

  // 2. Calculate total SGK reduction
  const totalSgkReduction = sgkReductionPerUnit * quantity;

  // 3. Apply SGK FIRST: Total after SGK
  const totalAfterSgk = totalListPrice - totalSgkReduction;

  // 4. Apply discount SECOND: To the SGK-reduced amount
  let discountTotal = 0;
  if (formData.discountType === 'percentage' && formData.discountValue) {
    discountTotal = (totalAfterSgk * formData.discountValue) / 100;
  } else if (formData.discountType === 'amount' && formData.discountValue) {
    discountTotal = formData.discountValue;
  }

  // 5. Final calculations
  const totalAmount = Math.max(0, totalAfterSgk - discountTotal);
  const salePrice = totalAmount / quantity; // Per unit final price
  const remainingAmount = Math.max(0, totalAmount - (formData.downPayment || 0));

  return {
    salePrice: salePrice,
    sgkReduction: totalSgkReduction,
    totalAmount,
    remainingAmount
  };
}

// Test cases
console.log('=== Frontend Calculation Tests ===\n');

// Test 1: Basic calculation with SGK
const test1 = {
  listPrice: 10000,
  ear: 'both',
  sgkScheme: 'over18_retired',
  discountType: 'percentage',
  discountValue: 10,
  downPayment: 2000
};

const result1 = calculatePricing(test1);
console.log('Test 1 - SGK + 10% discount:');
console.log('Input:', test1);
console.log('Result:', result1);
console.log('Expected: SGK reduction = 8478.4, Total after SGK = 11521.6, Discount = 1152.16, Final = 10369.44');
console.log('');

// Test 2: Amount discount
const test2 = {
  listPrice: 10000,
  ear: 'both',
  sgkScheme: 'over18_retired',
  discountType: 'amount',
  discountValue: 1000,
  downPayment: 2000
};

const result2 = calculatePricing(test2);
console.log('Test 2 - SGK + 1000 TL discount:');
console.log('Input:', test2);
console.log('Result:', result2);
console.log('Expected: SGK reduction = 8478.4, Total after SGK = 11521.6, Discount = 1000, Final = 10521.6');
console.log('');

// Test 3: Single ear
const test3 = {
  listPrice: 10000,
  ear: 'left',
  sgkScheme: 'over18_retired',
  discountType: 'percentage',
  discountValue: 10,
  downPayment: 1000
};

const result3 = calculatePricing(test3);
console.log('Test 3 - Single ear + SGK + 10% discount:');
console.log('Input:', test3);
console.log('Result:', result3);
console.log('Expected: SGK reduction = 4239.2, Total after SGK = 5760.8, Discount = 576.08, Final = 5184.72');
console.log('');