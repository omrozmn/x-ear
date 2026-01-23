# Operation ID Evidence — Admin Appointments

Source file: [x-ear/apps/api/routers/admin_appointments.py](x-ear/apps/api/routers/admin_appointments.py)

## listAdminAppointments
Decorator and function signature (exact lines):

```py
@router.get("", operation_id="listAdminAppointments", response_model=AppointmentListResponse)
async def get_all_appointments(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("appointments.read", admin_only=True))
):
```
