# Complete API Call Audit - Detailed Analysis

## Summary Statistics
- **apiClient calls**: 18 (excluding generated code)
- **fetch() calls**: 48 (excluding generated code)
- **Total manual API interactions**: 66

## apiClient Usage Breakdown

### ✅ Safe to Keep (Infrastructure)
1. `api/orval-mutator.ts` (4 instances)
   - Axios interceptors for auth
   - Refresh token logic
   - **ACTION**: KEEP - these are infrastructure

### ❌ Need Migration to Orval

#### 1. AssignmentDetailsForm.tsx
```typescript
const response = await apiClient.get('/api/inventory', { params })
```
- **Endpoint**: GET /api/inventory
- **Hook Needed**: `useInventoryGetInventory` (probably exists)
- **Action**: Replace with Orval hook

#### 2. PatientDevicesTab.tsx (2 instances)
```typescript
await apiClient.post(`/api/patients/${patient.id}/replacements`, payload)
await apiClient.patch(`/api/device-assignments/${deviceId}`, updates)
```
- **Status**: PARTIALLY MIGRATED (file uses some Orval hooks)
- **Remaining**: These 2 calls
- **Hooks Needed**: Already exist! Just need to use them
- **Action**: Replace with existing hooks

#### 3. usePatient.simple.ts (4 instances)
```typescript
apiClient.getPatient(patientId)
apiClient.deletePatient(patientId)
apiClient.updatePatient(patientId, updates)
```
- **File**: Looks like old/duplicate patient hook
- **Action**: DELETE FILE if `usePatientDevices` already exists

#### 4. TeamMembersTab.tsx (2 instances)
```typescript
await apiClient.updateTenantUser(user.id, { isActive: !user.isActive })
await apiClient.updateTenantUser(editingUser.id, payload)
```
- **Endpoint**: PATCH /api/tenant-users/{id}
- **Hook Needed**: Check if exists, add to OpenAPI if not
- **Action**: Migrate to Orval

#### 5. patient-api.service.ts (4 instances)
```typescript
apiClient.createPatient(patientData)
apiClient.deletePatient(id)
apiClient.getPatient(id)
apiClient.updatePatient(id, updates)
```  
- **Status**: Legacy service file
- **Action**: DELETE FILE - hooks exist

#### 6. authStore.ts (2 instances)
```typescript
await apiClient.login(credentials)
await apiClient.refreshToken()
```
- **Status**: Auth infrastructure
- **Action**: KEEP or migrate to Orval auth hooks

## fetch() Usage Analysis (48 calls)

Need to see details to categorize. Likely in:
- Custom hooks
- One-off API calls
- File uploads
- External APIs

## Migration Priority

### HIGH PRIORITY (Breaking Functionality)
1. ❌ **PatientDevicesTab.tsx** - 2 calls (partially migrated file)
2. ❌ **AssignmentDetailsForm.tsx** - 1 call (inventory search)
3. ❌ **TeamMembersTab.tsx** - 2 calls (user management)

### MEDIUM PRIORITY (Cleanup)
4. **usePatient.simple.ts** - DELETE (duplicate)
5. **patient-api.service.ts** - DELETE (legacy)

### LOW PRIORITY (Review)
6. **authStore.ts** - Review if auth hooks exist
7. **48 fetch() calls** - Need individual review

## Next Steps
1. Check which Orval hooks already exist for above endpoints
2. Add missing endpoints to OpenAPI
3. Migrate high-priority files
4. Delete legacy files
5. Review fetch() calls
