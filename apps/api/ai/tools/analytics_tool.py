"""
Ad-hoc Analytics Tool for AI Layer

Provides parameterized, tenant-scoped analytical queries.
Supports: top-N, aggregation, time-series, distribution queries.

Security: All queries are parameterized (no SQL injection), tenant-scoped.
"""

import logging
from datetime import datetime, timedelta, date
from typing import Any, Dict

from sqlalchemy import text

from ai.tools import (
    ToolParameter,
    ToolCategory,
    RiskLevel,
    ToolExecutionMode,
    ToolExecutionResult,
    register_tool,
)

logger = logging.getLogger(__name__)


# Pre-approved query templates (safe, parameterized, tenant-scoped)
QUERY_TEMPLATES = {
    "top_selling_devices": {
        "description": "En çok satılan cihazlar",
        "sql": """
            SELECT i.brand, i.model, COUNT(da.id) as sale_count, SUM(s.final_amount) as total_revenue
            FROM device_assignments da
            JOIN inventory i ON da.inventory_id = i.id
            JOIN sales s ON da.sale_id = s.id
            WHERE s.tenant_id = :tenant_id
              AND s.created_at >= :date_from AND s.created_at <= :date_to
            GROUP BY i.brand, i.model
            ORDER BY sale_count DESC
            LIMIT :limit
        """,
        "columns": ["brand", "model", "sale_count", "total_revenue"],
    },
    "revenue_by_period": {
        "description": "Dönemsel gelir özeti",
        "sql": """
            SELECT DATE_TRUNC(:period, s.created_at) as period_start,
                   COUNT(*) as sale_count, SUM(s.final_amount) as revenue
            FROM sales s
            WHERE s.tenant_id = :tenant_id
              AND s.created_at >= :date_from AND s.created_at <= :date_to
            GROUP BY period_start
            ORDER BY period_start DESC
            LIMIT :limit
        """,
        "columns": ["period", "sale_count", "revenue"],
    },
    "patients_by_city": {
        "description": "Şehre göre hasta dağılımı",
        "sql": """
            SELECT address_city as city, COUNT(*) as count
            FROM parties
            WHERE tenant_id = :tenant_id AND address_city IS NOT NULL AND address_city != ''
            GROUP BY address_city
            ORDER BY count DESC
            LIMIT :limit
        """,
        "columns": ["city", "count"],
    },
    "appointment_status_summary": {
        "description": "Randevu durum özeti",
        "sql": """
            SELECT status, COUNT(*) as count
            FROM appointments
            WHERE tenant_id = :tenant_id
              AND date >= :date_from AND date <= :date_to
            GROUP BY status
            ORDER BY count DESC
        """,
        "columns": ["status", "count"],
    },
    "overdue_payments": {
        "description": "Vadesi geçmiş ödemeler",
        "sql": """
            SELECT p.first_name || ' ' || p.last_name as patient_name,
                   pi.amount, pi.due_date, pi.status
            FROM payment_installments pi
            JOIN sales s ON pi.sale_id = s.id
            JOIN parties p ON s.party_id = p.id
            WHERE s.tenant_id = :tenant_id
              AND pi.status = 'pending' AND pi.due_date < :today
            ORDER BY pi.due_date ASC
            LIMIT :limit
        """,
        "columns": ["patient_name", "amount", "due_date", "status"],
    },
    "device_brand_distribution": {
        "description": "Marka bazlı cihaz dağılımı",
        "sql": """
            SELECT brand, COUNT(*) as count, SUM(quantity) as total_stock
            FROM inventory
            WHERE tenant_id = :tenant_id AND category = 'hearing_aid'
            GROUP BY brand
            ORDER BY count DESC
        """,
        "columns": ["brand", "count", "total_stock"],
    },
    "monthly_new_patients": {
        "description": "Aylık yeni hasta sayıları",
        "sql": """
            SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as new_patients
            FROM parties
            WHERE tenant_id = :tenant_id
              AND created_at >= :date_from AND created_at <= :date_to
            GROUP BY month
            ORDER BY month DESC
            LIMIT :limit
        """,
        "columns": ["month", "new_patients"],
    },
    "clinician_performance": {
        "description": "Klinisyen performans özeti",
        "sql": """
            SELECT u.username as clinician, COUNT(*) as appointment_count,
                   SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
                   SUM(CASE WHEN a.status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_shows
            FROM appointments a
            JOIN users u ON a.clinician_id = u.id
            WHERE a.tenant_id = :tenant_id
              AND a.date >= :date_from AND a.date <= :date_to
            GROUP BY u.username
            ORDER BY appointment_count DESC
            LIMIT :limit
        """,
        "columns": ["clinician", "appointment_count", "completed", "no_shows"],
    },
}

# Intent → query mapping
INTENT_TO_QUERY = {
    "top_selling": "top_selling_devices",
    "en_çok_satılan": "top_selling_devices",
    "gelir": "revenue_by_period",
    "revenue": "revenue_by_period",
    "ciro": "revenue_by_period",
    "şehir": "patients_by_city",
    "city": "patients_by_city",
    "randevu_durum": "appointment_status_summary",
    "appointment_status": "appointment_status_summary",
    "vadesi_geçmiş": "overdue_payments",
    "overdue": "overdue_payments",
    "borç": "overdue_payments",
    "marka": "device_brand_distribution",
    "brand": "device_brand_distribution",
    "yeni_hasta": "monthly_new_patients",
    "new_patients": "monthly_new_patients",
    "klinisyen": "clinician_performance",
    "clinician": "clinician_performance",
    "performans": "clinician_performance",
}


def detect_query_type(query_hint: str) -> str:
    """Detect query type from user intent or keyword."""
    hint_lower = query_hint.lower()
    for keyword, query_type in INTENT_TO_QUERY.items():
        if keyword in hint_lower:
            return query_type
    return "top_selling_devices"  # safe default


@register_tool(
    tool_id="dynamic_query",
    name="Dynamic Analytics Query",
    description="Run predefined analytical queries: top selling devices, revenue by period, patient distribution, appointment status, overdue payments, clinician performance",
    category=ToolCategory.REPORT,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(name="query_type", type="string", description="Query type or keyword hint", required=True),
        ToolParameter(name="tenant_id", type="string", description="Tenant ID", required=True),
        ToolParameter(name="date_from", type="string", description="Start date (ISO)", required=False),
        ToolParameter(name="date_to", type="string", description="End date (ISO)", required=False),
        ToolParameter(name="limit", type="integer", description="Max results (default 10)", required=False),
        ToolParameter(name="period", type="string", description="Grouping period: day, week, month", required=False),
    ],
    returns="Analytical query results",
    requires_approval=False,
    requires_permissions=["reports.view"],
)
def dynamic_query(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Execute a predefined analytical query."""
    query_hint = params.get("query_type", "")
    tenant_id = params.get("tenant_id", "")
    limit = min(int(params.get("limit", 10)), 50)  # Cap at 50
    period = params.get("period", "month")
    today = date.today()

    try:
        date_from = datetime.fromisoformat(params["date_from"].replace('Z', '+00:00')) if params.get("date_from") else datetime.combine(today - timedelta(days=30), datetime.min.time())
        date_to = datetime.fromisoformat(params["date_to"].replace('Z', '+00:00')) if params.get("date_to") else datetime.combine(today, datetime.max.time())
    except (ValueError, TypeError):
        date_from = datetime.combine(today - timedelta(days=30), datetime.min.time())
        date_to = datetime.combine(today, datetime.max.time())

    query_type = detect_query_type(query_hint)
    template = QUERY_TEMPLATES.get(query_type)

    if not template:
        return ToolExecutionResult(
            tool_id="dynamic_query", success=False, mode=mode,
            error=f"Unknown query type: {query_type}. Available: {', '.join(QUERY_TEMPLATES.keys())}",
        )

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="dynamic_query", success=True, mode=mode,
            simulated_changes={"query_type": query_type, "description": template["description"]},
        )

    try:
        from core.database import SessionLocal
        db = SessionLocal()
        sql_params = {
            "tenant_id": tenant_id,
            "date_from": date_from,
            "date_to": date_to,
            "limit": limit,
            "period": period,
            "today": today,
        }
        rows = db.execute(text(template["sql"]), sql_params).fetchall()
        db.close()

        columns = template["columns"]
        data = []
        for row in rows:
            record = {}
            for i, col in enumerate(columns):
                val = row[i]
                if isinstance(val, datetime):
                    val = val.strftime("%Y-%m-%d")
                elif isinstance(val, date):
                    val = val.isoformat()
                elif hasattr(val, '__float__'):
                    val = round(float(val), 2)
                record[col] = val
            data.append(record)

        return ToolExecutionResult(
            tool_id="dynamic_query", success=True, mode=mode,
            result={
                "query_type": template["description"],
                "data": data,
                "total": len(data),
                "period": f"{date_from.strftime('%Y-%m-%d')} → {date_to.strftime('%Y-%m-%d')}",
            },
        )
    except Exception as e:
        logger.error(f"Dynamic query failed: {e}")
        return ToolExecutionResult(tool_id="dynamic_query", success=False, mode=mode, error=str(e))
