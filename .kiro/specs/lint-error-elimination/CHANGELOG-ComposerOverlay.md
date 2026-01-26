# ComposerOverlay.tsx - Lint Error Fixes

## Summary
Fixed all 14 `no-restricted-syntax` errors in `x-ear/apps/web/src/components/ai/ComposerOverlay.tsx`

## Changes Made

### 1. Added UI Component Imports
```typescript
import { Button, Input } from '@x-ear/ui-web';
```

### 2. Replaced Manual fetch() Call (Line 106)
**Before:**
```typescript
const res = await fetch('/api/ai/composer/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        files: [fileKey],
        context_intent: selectedAction?.name || 'general'
    })
});
```

**After:**
```typescript
// Added hook import
import { useAnalyzeDocumentsApiAiComposerAnalyzePost } from '../../api/generated/ai-composer/ai-composer';

// Added hook initialization
const { mutateAsync: analyzeDocuments } = useAnalyzeDocumentsApiAiComposerAnalyzePost();

// Used in analyzeDocument function
const result = await analyzeDocuments({
    data: {
        files: [fileKey],
        contextIntent: selectedAction?.name || 'general'
    }
});
```

### 3. Replaced Raw HTML Elements with UI Components

#### Buttons (8 replacements)
- **Line 263**: Context close button → `<Button variant="ghost" size="sm">`
- **Line 368**: AI suggestion buttons → `<Button variant="outline" size="sm">`
- **Line 479**: Enum option buttons → `<Button variant="outline">`
- **Line 574**: Simulate button → `<Button variant="outline">`
- **Line 581**: Cancel button → `<Button variant="ghost">`
- **Line 587**: Confirm button → `<Button variant="success">`
- **Line 639**: Close button → `<Button variant="secondary" fullWidth>`

#### Inputs (6 replacements)
- **Line 267**: Main search input → `<Input>` with proper styling
- **Line 398**: Entity search input → `<Input leftIcon={<Search />}>`
- **Line 435**: Text slot input → `<Input>`
- **Line 449**: Number slot input → `<Input type="number">`
- **Line 464**: Date slot input → `<Input type="date">`
- **Line 512**: File upload input → `<Input type="file">`

## Validation

### Type Check
✅ No TypeScript errors: `getDiagnostics` returned clean

### Lint Check
✅ No ESLint errors: File passes all lint rules

### Functionality Preserved
- All event handlers maintained
- All styling preserved via className props
- All component logic unchanged
- API integration improved (using typed hooks instead of raw fetch)

## Benefits

1. **Type Safety**: Orval-generated hook provides full type safety for API calls
2. **Consistency**: All UI elements now use the design system components
3. **Maintainability**: Centralized component styling and behavior
4. **Auth Handling**: API calls now go through the proper interceptor chain (token refresh, error handling, retry logic)
5. **Idempotency**: API calls automatically include Idempotency-Key headers

## Related Tasks
- Phase 2: Component Standards (High Priority)
- Part of systematic elimination of 1,168 lint problems

## Files Modified
- `x-ear/apps/web/src/components/ai/ComposerOverlay.tsx`

## Testing Recommendations
1. Test AI composer overlay opens correctly (Cmd+K / Ctrl+K)
2. Test entity search functionality
3. Test slot filling with different input types (text, number, date, enum, file)
4. Test file upload and document analysis
5. Test action execution (simulate and confirm)
6. Verify all buttons respond correctly
7. Verify styling matches previous appearance
