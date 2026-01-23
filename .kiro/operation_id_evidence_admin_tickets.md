# Operation ID Evidence — Admin Tickets

Source file: [x-ear/apps/api/routers/admin_tickets.py](x-ear/apps/api/routers/admin_tickets.py)

## listAdminTickets
Decorator and function signature (exact lines):

```py
@router.get("", operation_id="listAdminTickets", response_model=TicketListResponse)
async def get_admin_tickets(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("tickets.read", admin_only=True))
):
```

## createAdminTicket
Decorator and function signature (exact lines):

```py
@router.post("", operation_id="createAdminTicket", response_model=TicketDetailResponse)
async def create_admin_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("tickets.manage", admin_only=True))
):
```

## updateAdminTicket
Decorator and function signature (exact lines):

```py
@router.put("/{ticket_id}", operation_id="updateAdminTicket", response_model=TicketDetailResponse)
async def update_admin_ticket(
    ticket_id: str,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("tickets.manage", admin_only=True))
):
```
