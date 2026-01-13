# Revised Migration Scope Analysis

## Current Situation

Found **patient-api.service.ts** is a 492-line wrapper service with 20+ methods.
8 hooks depend on it, totaling **~1259 lines of code**.

### Service Analysis

**Already uses Orval (good):**
- `salesGetPatientSales` - ✅
- `appointmentsListAppointments` - ✅  
- `timelineGetPatientTimeline` - ✅
- `sgkGetPatientSgk Documents` - ✅
- `patientSubresourcesCreatePatientNote` - ✅
- `patientSubresourcesDeletePatientNote` - ✅

**Uses apiClient (needs migration):**
- `apiClient.getPatient` (line 186)
- `apiClient.createPatient` (line 199)
- `apiClient.updatePatient` (line 213)
- `apiClient.deletePatient` (line 227)

### Hooks Depending on Service (8 files, ~1259 lines total)

1. usePatientSales.ts - 142 lines
2. usePatientNotes.ts - 71 lines
3. usePatientTimeline.ts - ?
4. usePatientHearingTests.ts - ?
5. usePatientDocuments.ts - ?
6. usePatientAppointments.ts - ?
7. usePatient.ts (hooks/patient/) - 146 lines
8. usePatient.ts (hooks/patients/) - duplicate?

## Recommendations

### Option A: FULL MIGRATION (4-5 hours)
- Migrate all 8 hooks
- Migrate all 6 components
- Delete service layer entirely
- **Effort**: Very high
- **Risk**: Breaking working functionality
- **Value**: Clean architecture, but...

### Option B: PRACTICAL (30 min)
- Keep service layer as-is
- Only migrate files with DIRECT apiClient calls:
  - AssignmentDetailsForm.tsx
  - TeamMembersTab.tsx  
  - Maybe 1-2 more
- **Effort**: Low
- **Risk**: Minimal
- **Value**: Fix actual problems

### Option C: OPTIMAL (1 hour)
- Fix apiClient calls in service (4 methods)
- Leave hooks/components using service unchanged
- Add missing Orval hooks for those 4 patient CRUD operations
- **Effort**: Medium
- **Risk**: Low
- **Value**: Best practices where it matters

## Recommendation: Option B or C

The service layer is ALREADY using Orval for most methods. Only 4 methods use legacy apiClient.

**Don't spend 4-5 hours refactoring working code.**

Focus on actual problems:
1. Files with DIRECT apiClient calls
2. Fix those 4 apiClient methods in service if time permits

What's your call?
