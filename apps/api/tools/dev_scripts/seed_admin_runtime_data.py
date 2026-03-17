#!/usr/bin/env python3
"""Seed missing admin/runtime tables from existing sqlite data."""

from __future__ import annotations

import hashlib
import json
import sqlite3
import uuid
from collections import defaultdict
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_ADMIN_PERMISSIONS = [
    {"code": "platform.tenants.read", "label": "Tenant Bilgilerini Goruntule", "category": "tenants", "description": "Tenant listesini goruntule"},
    {"code": "platform.tenants.manage", "label": "Tenant Yonetimi", "category": "tenants", "description": "Tenant olustur ve guncelle"},
    {"code": "platform.users.read", "label": "Kullanicilari Goruntule", "category": "users", "description": "Admin kullanicilarini goruntule"},
    {"code": "platform.users.manage", "label": "Kullanici Yonetimi", "category": "users", "description": "Admin kullanicilarini yonet"},
    {"code": "platform.roles.read", "label": "Rolleri Goruntule", "category": "roles", "description": "Rolleri goruntule"},
    {"code": "platform.roles.manage", "label": "Rol Yonetimi", "category": "roles", "description": "Rolleri yonet"},
    {"code": "platform.billing.read", "label": "Finans Verilerini Goruntule", "category": "billing", "description": "Odeme ve fatura ekranlari"},
    {"code": "platform.billing.manage", "label": "Finans Yonetimi", "category": "billing", "description": "Odeme ve fatura yonetimi"},
    {"code": "platform.audit.read", "label": "Audit Kayitlarini Goruntule", "category": "logs", "description": "Audit kayitlarini goruntule"},
    {"code": "platform.activity_logs.read", "label": "Aktivite Loglarini Goruntule", "category": "logs", "description": "Aktivite loglarini goruntule"},
    {"code": "platform.system.read", "label": "Sistem Bilgilerini Goruntule", "category": "system", "description": "Sistem durumunu goruntule"},
    {"code": "platform.system.manage", "label": "Sistem Yonetimi", "category": "system", "description": "Sistem ayarlari"},
    {"code": "platform.sms.manage", "label": "SMS Yonetimi", "category": "modules", "description": "SMS yonetimi"},
    {"code": "platform.ai.read", "label": "AI Goruntule", "category": "ai", "description": "AI ekranlarini goruntule"},
    {"code": "platform.ai.manage", "label": "AI Yonetimi", "category": "ai", "description": "AI yonetimi"},
]

DB_PATH = API_ROOT / "instance" / "xear_crm.db"


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def main() -> None:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    permission_count = cursor.execute("SELECT COUNT(*) FROM admin_permissions").fetchone()[0]
    if permission_count == 0:
        for permission in DEFAULT_ADMIN_PERMISSIONS:
            cursor.execute(
                """
                INSERT INTO admin_permissions (id, code, label, description, category, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
                """,
                (
                    make_id("admperm"),
                    permission["code"],
                    permission["label"],
                    permission.get("description"),
                    permission.get("category"),
                ),
            )

    role_permission_count = cursor.execute("SELECT COUNT(*) FROM admin_role_permissions").fetchone()[0]
    if role_permission_count == 0:
        system_roles = cursor.execute(
            "SELECT id FROM admin_roles WHERE is_system_role = 1 ORDER BY name"
        ).fetchall()
        if not system_roles:
            system_roles = cursor.execute(
                "SELECT id FROM admin_roles ORDER BY created_at LIMIT 25"
            ).fetchall()
        permissions = cursor.execute("SELECT id FROM admin_permissions").fetchall()
        for role in system_roles:
            for permission in permissions:
                cursor.execute(
                    """
                    INSERT INTO admin_role_permissions (id, role_id, permission_id, created_at)
                    VALUES (?, ?, ?, datetime('now'))
                    """,
                    (make_id("admroleperm"), role["id"], permission["id"]),
                )

    ai_audit_count = cursor.execute("SELECT COUNT(*) FROM ai_audit_logs").fetchone()[0]
    ai_actions_count = cursor.execute("SELECT COUNT(*) FROM ai_actions").fetchone()[0]
    ai_usage_count = cursor.execute("SELECT COUNT(*) FROM ai_usage").fetchone()[0]

    requests = cursor.execute(
        """
        SELECT id, tenant_id, user_id, intent_type, intent_confidence, model_id, model_version,
               status, error_message, tokens_input, tokens_output, created_at
        FROM ai_requests
        ORDER BY created_at DESC
        LIMIT 200
        """
    ).fetchall()

    if ai_audit_count == 0:
        for request in requests:
            cursor.execute(
                """
                INSERT INTO ai_audit_logs (
                    id, tenant_id, user_id, request_id, action_id, session_id, event_type,
                    event_timestamp, intent_type, intent_confidence, action_plan_hash,
                    risk_level, outcome, model_id, model_version, prompt_template_id,
                    prompt_template_version, prompt_template_hash, policy_version,
                    policy_rule_id, policy_decision, diff_snapshot, error_code,
                    error_message, incident_tag, incident_bundle_id, extra_data, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    make_id("ailog"),
                    request["tenant_id"],
                    request["user_id"],
                    request["id"],
                    None,
                    None,
                    "request_received",
                    request["created_at"],
                    request["intent_type"],
                    request["intent_confidence"],
                    None,
                    "medium" if request["error_message"] else "low",
                    "failure" if request["error_message"] else "success",
                    request["model_id"],
                    request["model_version"],
                    None,
                    None,
                    hashlib.sha256((request["id"] or "").encode("utf-8")).hexdigest(),
                    "seed-v1",
                    None,
                    "allow" if not request["error_message"] else "review",
                    json.dumps({"seeded": True}),
                    None,
                    request["error_message"],
                    "model_error" if request["error_message"] else "none",
                    None,
                    json.dumps({"source": "ai_requests"}),
                    request["created_at"],
                ),
            )

    if ai_actions_count == 0:
        for index, request in enumerate(requests[:40]):
            status = "pending_approval" if index < 12 else ("completed" if index % 3 else "approved")
            action_plan = {
                "summary": f"AI action for {request['id']}",
                "steps": [
                    {"type": "analyze", "target": request["id"]},
                    {"type": "notify", "tenant_id": request["tenant_id"]},
                ],
            }
            cursor.execute(
                """
                INSERT INTO ai_actions (
                    id, request_id, tenant_id, user_id, action_plan, action_plan_hash,
                    tool_schema_versions, risk_level, risk_reasoning, required_permissions,
                    rollback_plan, status, approval_token_hash, approval_expires_at,
                    approved_by, approved_at, rejection_reason, execution_started_at,
                    execution_completed_at, execution_result, execution_error,
                    dry_run_result, idempotency_key, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    make_id("aiact"),
                    request["id"],
                    request["tenant_id"],
                    request["user_id"],
                    json.dumps(action_plan),
                    hashlib.sha256(json.dumps(action_plan, sort_keys=True).encode("utf-8")).hexdigest(),
                    json.dumps({"seed": "1"}),
                    "high" if status == "pending_approval" else "medium",
                    "Seeded admin preview action",
                    json.dumps(["ai.manage"]),
                    json.dumps({"steps": [{"type": "noop"}]}),
                    status,
                    hashlib.sha256(f"approval-{request['id']}".encode("utf-8")).hexdigest() if status == "pending_approval" else None,
                    request["created_at"],
                    None,
                    None,
                    None,
                    request["created_at"] if status in {"completed", "approved"} else None,
                    request["created_at"] if status == "completed" else None,
                    json.dumps({"seeded": True}) if status == "completed" else None,
                    None,
                    json.dumps({"preview": True}),
                    make_id("idem"),
                    request["created_at"],
                    request["created_at"],
                ),
            )

    if ai_usage_count == 0:
        usage = defaultdict(lambda: {"count": 0, "input": 0, "output": 0})
        rows = cursor.execute(
            "SELECT tenant_id, date(created_at) AS usage_date, tokens_input, tokens_output FROM ai_requests"
        ).fetchall()
        for row in rows:
            key = (row["tenant_id"], row["usage_date"] or "2026-03-10")
            usage[key]["count"] += 1
            usage[key]["input"] += row["tokens_input"] or 0
            usage[key]["output"] += row["tokens_output"] or 0

        for (tenant_id, usage_date), item in usage.items():
            cursor.execute(
                """
                INSERT INTO ai_usage (
                    id, tenant_id, usage_date, usage_type, request_count,
                    token_count_input, token_count_output, quota_limit,
                    quota_exceeded_at, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                """,
                (
                    make_id("aiuse"),
                    tenant_id,
                    usage_date,
                    "chat",
                    item["count"],
                    item["input"],
                    item["output"],
                    1000,
                    None,
                ),
            )

    connection.commit()
    connection.close()
    print(f"Seeded runtime admin data into {DB_PATH}")


if __name__ == "__main__":
    main()
