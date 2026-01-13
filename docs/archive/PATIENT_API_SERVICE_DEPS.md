# Files Using patient-api.service.ts

Total: 14 files need migration before deletion

## Components (6 files)
1. `components/patients/modals/SaleModal.tsx`
2. `components/forms/patient-sale-form/PatientSaleFormRefactored.tsx`
3. `components/appointments/AppointmentCalendar.tsx`
4. `components/PatientSalesTab.tsx`
5. `components/PatientNotesTab.tsx`
6. `services/appointment.service.ts`

## Hooks (8 files)
1. `hooks/patients/usePatient.ts`
2. `hooks/patient/usePatientHearingTests.ts`
3. `hooks/patient/usePatientSales.ts`
4. `hooks/patient/usePatientDocuments.ts`
5. `hooks/patient/usePatientNotes.ts`
6. `hooks/patient/usePatientAppointments.ts`
7. `hooks/patient/usePatient.ts` (duplicate path?)
8. `hooks/patient/usePatientTimeline.ts`

## Revised Strategy
**DO NOT** delete patient-api.service.ts yet!

Instead:
1. Migrate each hook to use Orval directly
2. Migrate each component
3. Finally delete service file when all references gone
