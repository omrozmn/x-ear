Manual test guide for xear-backbone.js

1) Quick smoke test in browser console
   - Open http://localhost:8080/dashboard.html
   - In dev console type:
     - `XEar.CategoryNormalizer.toCanonical('hearing_aid')` -> should return 'hearing_aid'
     - `XEar.CategoryNormalizer.isHearingAid('hearing_aid')` -> should return true
     - `XEar.Api.getDevices({ inventory_only:true, category:'hearing_aid' }).then(r => console.log(r.devices))`
       -> should log canonicalized inventory items with `availableInventory` etc.

2) Sample normalization input -> expected output
   - Input: `{ id:'x', name:'A', category:'hearing_aid', availableInventory:5, price:12000 }`
   - Call: `XEar.canonicalizeInventoryItem(input)`
   - Expected: `{ id:'x', name:'A', category:'hearing_aid', availableInventory:5, totalInventory:0, price:12000, ... }`

3) Pricing formula checks
   - `XEar.PricingHelper(15000,1, XEar.DEFAULT_SGK_SCHEMES.worker, 'percent', 10)`
     -> returns object with `listPrice`, `sgkSupportAmount`, `discountAmount` and `patientPays`.

4) Migration compatibility check (manual); verify both legacy and modern pages
   - Open legacy inventory page and check dropdowns still work.
   - Open modular patient details and ensure device assign can fetch devices via `XEar.Api.getDevices`.

Notes
- This test guide helps validate the backbone before replacing direct equality checks. For full validation run the backend test scripts and verify UI pages populate.
