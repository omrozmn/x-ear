# OperationId Evidence — Reports Router

Source file: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)

Below are exact decorator + function-signature snippets copied from the router implementation to serve as direct code evidence for the listed operationIds.

- **listReportOverview**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)
  - Snippet:
    ```py
    @router.get("/reports/overview", operation_id="listReportOverview", response_model=ResponseEnvelope[ReportOverviewResponse])
    def report_overview(
        days: int = Query(30, ge=1, le=365),
    ```

- **listReportPatients**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)
  - Snippet:
    ```py
    @router.get("/reports/patients", operation_id="listReportPatients", response_model=ResponseEnvelope[ReportPatientsResponse])
    def report_patients(
        days: int = Query(30, ge=1, le=365),
    ```

- **listReportFinancial**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)
  - Snippet:
    ```py
    @router.get("/reports/financial", operation_id="listReportFinancial", response_model=ResponseEnvelope[ReportFinancialResponse])
    def report_financial(
        days: int = Query(30, ge=1, le=365),
    ```

- **listReportCampaigns**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)
  - Snippet:
    ```py
    @router.get("/reports/campaigns", operation_id="listReportCampaigns", response_model=ResponseEnvelope[ReportCampaignsResponse])
    def report_campaigns(
        days: int = Query(30, ge=1, le=365),
    ```

- **listReportRevenue**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)
  - Snippet:
    ```py
    @router.get("/reports/revenue", operation_id="listReportRevenue", response_model=ResponseEnvelope[ReportRevenueResponse])
    def report_revenue(
        access: UnifiedAccess = Depends(require_access()),
    ```

- **listReportAppointments**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)
  - Snippet:
    ```py
    @router.get("/reports/appointments", operation_id="listReportAppointments")
    def report_appointments(
        page: int = Query(1, ge=1),
    ```

- **listReportPromissoryNotes**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)
  - Snippet:
    ```py
    @router.get("/reports/promissory-notes", operation_id="listReportPromissoryNotes", response_model=ResponseEnvelope[ReportPromissoryNotesResponse])
    def report_promissory_notes(
        days: int = Query(365, ge=1),
    ```

- **listReportPromissoryNoteByPatient**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)
  - Snippet:
    ```py
    @router.get("/reports/promissory-notes/by-patient", operation_id="listReportPromissoryNoteByPatient", response_model=ResponseEnvelope[List[PromissoryNotePatientItem]])
    def report_promissory_notes_by_patient(
        page: int = Query(1, ge=1),
    ```

- **listReportPromissoryNoteList**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)
  - Snippet:
    ```py
    @router.get("/reports/promissory-notes/list", operation_id="listReportPromissoryNoteList", response_model=ResponseEnvelope[List[PromissoryNoteListItem]])
    def report_promissory_notes_list(
        page: int = Query(1, ge=1),
    ```

- **listReportRemainingPayments**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)
  - Snippet:
    ```py
    @router.get("/reports/remaining-payments", operation_id="listReportRemainingPayments", response_model=ResponseEnvelope[List[RemainingPaymentItem]])
    def report_remaining_payments(
        page: int = Query(1, ge=1),
    ```

- **listReportCashflowSummary**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)
  - Snippet:
    ```py
    @router.get("/reports/cashflow-summary", operation_id="listReportCashflowSummary", response_model=ResponseEnvelope[ReportCashflowResponse])
    def report_cashflow_summary(
        days: int = Query(30, ge=1, le=365),
    ```

- **listReportPosMovements**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py)
  - Snippet:
    ```py
    @router.get("/reports/pos-movements", operation_id="listReportPosMovements", response_model=ResponseEnvelope[List[PosMovementItem]])
    def report_pos_movements(
        page: int = Query(1, ge=1),
    ```


---

Next: I'll continue with the next router file batch (admin_*, invoices, invoices_actions, payment_integrations) and produce the same decorator+signature evidence entries, then consolidate into a single `operation_id_evidence.md` if you prefer.
