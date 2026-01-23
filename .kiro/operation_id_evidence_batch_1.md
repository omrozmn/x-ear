# Operation ID Evidence — Batch 1 (routers 1–10)

This batch groups the first 10 router modules (by repository listing order). For each router, I link to an existing `.kiro` evidence file when available, otherwise mark it as `PENDING` for extraction.

1) `x-ear/apps/api/routers/admin_inventory.py`
- Evidence: [x-ear/.kiro/operation_id_evidence_admin_inventory.md](x-ear/.kiro/operation_id_evidence_admin_inventory.md)

2) `x-ear/apps/api/routers/schema_registry.py`
- Evidence: PENDING (no per-router evidence file yet)

3) `x-ear/apps/api/routers/appointments.py`
- Evidence: [x-ear/.kiro/operation_id_evidence_admin_appointments.md](x-ear/.kiro/operation_id_evidence_admin_appointments.md)

4) `x-ear/apps/api/routers/replacements.py`
- Evidence: PENDING (no per-router evidence file yet)

5) `x-ear/apps/api/routers/admin_tenants.py`
- Evidence: [x-ear/.kiro/operation_id_evidence_admin_batch2.md](x-ear/.kiro/operation_id_evidence_admin_batch2.md) (contains `admin_tenants` snippets)

6) `x-ear/apps/api/routers/subscriptions.py`
- Evidence: PENDING (no per-router evidence file yet)

7) `x-ear/apps/api/routers/uts.py`
- Evidence: PENDING (no per-router evidence file yet)

8) `x-ear/apps/api/routers/admin_suppliers.py`
- Evidence: [x-ear/.kiro/operation_id_evidence_admin_suppliers.md](x-ear/.kiro/operation_id_evidence_admin_suppliers.md)

9) `x-ear/apps/api/routers/admin_analytics.py`
- Evidence: [x-ear/.kiro/operation_id_evidence_admin_analytics_extracted.md](x-ear/.kiro/operation_id_evidence_admin_analytics_extracted.md)

10) `x-ear/apps/api/routers/admin_scan_queue.py`
- Evidence: [x-ear/.kiro/operation_id_evidence_admin_scan_queue.md](x-ear/.kiro/operation_id_evidence_admin_scan_queue.md)

---

Notes:
- "PENDING" entries will be extracted in subsequent passes; I will parse the router file and write exact decorator+signature snippets into per-router evidence files.
- Next: processing routers 11–20 and creating `operation_id_evidence_batch_2.md`.
