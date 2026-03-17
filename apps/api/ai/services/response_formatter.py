"""
Response Formatter for AI Layer

Converts raw tool execution results (JSON) into natural language
responses in Turkish or English. Template-based — zero LLM tokens.

Usage:
    formatter = ResponseFormatter(locale="tr")
    text = formatter.format_tool_result("get_low_stock_alerts", result_dict)
    # → "3 ürün kritik stok seviyesinin altında: Phonak Audeo L90 (1 adet), ..."
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class ResponseFormatter:
    """Template-based formatter for tool results → natural language."""

    def __init__(self, locale: str = "tr"):
        self.locale = locale
        self._formatters = {
            "get_party_comprehensive_summary": self._fmt_party_summary,
            "check_appointment_availability": self._fmt_availability,
            "cancel_appointment": self._fmt_cancel_appointment,
            "reschedule_appointment": self._fmt_reschedule,
            "get_low_stock_alerts": self._fmt_low_stock,
            "get_daily_cash_summary": self._fmt_cash_summary,
            "generateReport": self._fmt_report,
            "getReportData": self._fmt_report,
            "query_sgk_patient_rights": self._fmt_sgk_rights,
            "query_sgk_e_receipt": self._fmt_sgk_receipt,
            "generate_and_send_e_invoice": self._fmt_einvoice,
            "feature_flags_list": self._fmt_feature_flags,
            "feature_flag_toggle": self._fmt_flag_toggle,
            "tenant_info_get": self._fmt_tenant_info,
            "notification_send": self._fmt_notification,
            "listAppointments": self._fmt_list_appointments,
            "listParties": self._fmt_list_parties,
            "listSales": self._fmt_list_sales,
            "listDevices": self._fmt_list_devices,
            "listInvoices": self._fmt_list_invoices,
            "createParty": self._fmt_create_party,
            "createAppointment": self._fmt_create_appointment,
            "createSale": self._fmt_create_sale,
            "searchParties": self._fmt_search_parties,
            "getPartyById": self._fmt_party_summary,
            "getSaleById": self._fmt_sale_detail,
            "checkDeviceStock": self._fmt_device_stock,
            "assignDevice": self._fmt_assign_device,
            "dynamic_query": self._fmt_dynamic_query,
            "getHearingTests": self._fmt_hearing_tests,
            "getHearingProfile": self._fmt_hearing_profile,
            "getDeviceRecommendations": self._fmt_device_recommendations,
            "listProformas": self._fmt_list_proformas,
            "recordPayment": self._fmt_record_payment,
            "listPayments": self._fmt_list_payments,
            "createCampaign": self._fmt_create_campaign,
            "listCampaigns": self._fmt_list_campaigns,
            "listDocuments": self._fmt_list_documents,
            "getPatientBalance": self._fmt_patient_balance,
            "daily_briefing": self._fmt_daily_briefing,
        }

    def format(self, tool_id: str, result: Dict[str, Any], success: bool = True, error: Optional[str] = None) -> str:
        """Format a tool result into natural language."""
        if not success or error:
            return self._fmt_error(tool_id, error)

        formatter = self._formatters.get(tool_id)
        if formatter:
            try:
                return formatter(result)
            except Exception as e:
                logger.warning(f"Formatter failed for {tool_id}: {e}")
                return self._fmt_generic(tool_id, result)
        return self._fmt_generic(tool_id, result)

    # ─── Error ──────────────────────────────────────────────────────

    def _fmt_error(self, tool_id: str, error: Optional[str]) -> str:
        if self.locale == "tr":
            return f"İşlem başarısız oldu: {error or 'Bilinmeyen hata'}"
        return f"Operation failed: {error or 'Unknown error'}"

    def _fmt_generic(self, tool_id: str, result: Dict) -> str:
        """Fallback: summarize key-value pairs."""
        if not result:
            return "İşlem tamamlandı." if self.locale == "tr" else "Operation completed."
        parts = []
        for k, v in result.items():
            if k.startswith("_") or v is None:
                continue
            if isinstance(v, list):
                parts.append(f"{k}: {len(v)} kayıt")
            elif isinstance(v, dict):
                continue
            else:
                parts.append(f"{k}: {v}")
        summary = ", ".join(parts[:6])
        return summary or ("Sonuç alındı." if self.locale == "tr" else "Result received.")

    # ─── Party ──────────────────────────────────────────────────────

    def _fmt_party_summary(self, r: Dict) -> str:
        party = r.get("party") or r
        name = f"{party.get('firstName', '')} {party.get('lastName', '')}".strip() or party.get("name", "")
        phone = party.get("phone", "")
        status = party.get("status", "")
        devices = r.get("devices", [])
        notes = r.get("recentNotes", [])

        if self.locale == "tr":
            text = f"**{name}**"
            if phone:
                text += f" | Tel: {phone}"
            if status:
                text += f" | Durum: {status}"
            if devices:
                text += f"\n📱 {len(devices)} cihaz atanmış"
            if notes:
                text += f"\n📝 {len(notes)} not mevcut"
            return text
        return f"**{name}** | Phone: {phone} | Status: {status}"

    def _fmt_create_party(self, r: Dict) -> str:
        name = r.get("name", "")
        if self.locale == "tr":
            return f"Hasta kaydı oluşturuldu: **{name}** (ID: {r.get('id', '')[:8]}...)"
        return f"Patient created: **{name}**"

    def _fmt_search_parties(self, r: Dict) -> str:
        items = r.get("items", [])
        if not items:
            return "Sonuç bulunamadı." if self.locale == "tr" else "No results found."
        names = [f"{p.get('firstName', '')} {p.get('lastName', '')}".strip() for p in items[:5]]
        if self.locale == "tr":
            return f"{len(items)} kişi bulundu: {', '.join(names)}"
        return f"Found {len(items)} people: {', '.join(names)}"

    def _fmt_list_parties(self, r: Dict) -> str:
        total = r.get("total", 0)
        items = r.get("items", [])
        if self.locale == "tr":
            if not items:
                return "Kayıtlı hasta bulunamadı."
            names = [f"{p.get('firstName', '')} {p.get('lastName', '')}".strip() for p in items[:5]]
            return f"Toplam {total} hasta. İlk {len(names)}: {', '.join(names)}"
        return f"Total {total} patients."

    # ─── Appointments ───────────────────────────────────────────────

    def _fmt_availability(self, r: Dict) -> str:
        date = r.get("date", "")
        slots = r.get("available_slots", [])
        booked = r.get("booked_count", 0)
        if self.locale == "tr":
            if not slots:
                return f"{date} tarihinde müsait slot yok."
            return f"**{date}** tarihinde {len(slots)} müsait slot var ({booked} dolu). Saatler: {', '.join(slots[:8])}"
        return f"{len(slots)} slots available on {date}."

    def _fmt_cancel_appointment(self, r: Dict) -> str:
        aid = r.get("appointment_id", "")
        if self.locale == "tr":
            return f"Randevu iptal edildi. (ID: {aid[:8]}...)"
        return f"Appointment cancelled. (ID: {aid})"

    def _fmt_reschedule(self, r: Dict) -> str:
        new_date = r.get("new_date", "")
        if self.locale == "tr":
            return f"Randevu yeni tarihe taşındı: **{new_date}**"
        return f"Appointment rescheduled to: **{new_date}**"

    def _fmt_create_appointment(self, r: Dict) -> str:
        if self.locale == "tr":
            return f"Randevu oluşturuldu. (ID: {r.get('id', '')[:8]}...)"
        return f"Appointment created."

    def _fmt_list_appointments(self, r: Dict) -> str:
        total = r.get("total", 0)
        items = r.get("items", [])
        if self.locale == "tr":
            if not items:
                return "Randevu bulunamadı."
            lines = []
            for a in items[:5]:
                date = a.get("date", "")[:10]
                status = a.get("status", "")
                party = a.get("partyName", a.get("party_name", ""))
                lines.append(f"  • {date} - {party} ({status})")
            return f"Toplam {total} randevu:\n" + "\n".join(lines)
        return f"Total {total} appointments."

    # ─── Inventory & Devices ────────────────────────────────────────

    def _fmt_low_stock(self, r: Dict) -> str:
        items = r.get("low_stock_items", [])
        total = r.get("total_alerts", len(items))
        if self.locale == "tr":
            if not items:
                return "Tüm stoklar yeterli seviyede."
            lines = [f"  • {i['name']}: **{i['current_stock']}** adet (eşik: {i['threshold']})" for i in items[:8]]
            return f"⚠️ **{total} ürün** kritik stok seviyesinde:\n" + "\n".join(lines)
        return f"{total} items below stock threshold."

    def _fmt_device_stock(self, r: Dict) -> str:
        total_items = r.get("totalItems", 0)
        total_qty = r.get("totalQuantity", 0)
        if self.locale == "tr":
            return f"Envanterde {total_items} çeşit, toplam {total_qty} adet ürün mevcut."
        return f"{total_items} types, {total_qty} total units in stock."

    def _fmt_list_devices(self, r: Dict) -> str:
        return self._fmt_device_stock(r)

    def _fmt_assign_device(self, r: Dict) -> str:
        if self.locale == "tr":
            return f"Cihaz başarıyla atandı."
        return "Device assigned successfully."

    # ─── Finance ────────────────────────────────────────────────────

    def _fmt_cash_summary(self, r: Dict) -> str:
        period = r.get("period", "bugün")
        if self.locale == "tr":
            total = r.get("total_revenue") or r.get("totalRevenue", 0)
            cash_in = r.get("cash_in") or r.get("cashIn", 0)
            card = r.get("credit_card_in") or r.get("creditCardIn", 0)
            return (f"💰 **{period}** kasa özeti:\n"
                    f"  • Nakit: {cash_in:,.0f} ₺\n"
                    f"  • Kredi kartı: {card:,.0f} ₺\n"
                    f"  • **Toplam: {total:,.0f} ₺**")
        return f"Cash summary for {period}: Total {r.get('total_revenue', 0)}"

    def _fmt_list_sales(self, r: Dict) -> str:
        total = r.get("total", 0)
        if self.locale == "tr":
            return f"Toplam {total} satış kaydı bulundu."
        return f"Found {total} sales."

    def _fmt_sale_detail(self, r: Dict) -> str:
        return self._fmt_generic("getSaleById", r)

    def _fmt_create_sale(self, r: Dict) -> str:
        if self.locale == "tr":
            return f"Satış kaydı oluşturuldu. (ID: {r.get('id', '')[:8]}...)"
        return "Sale created."

    def _fmt_list_invoices(self, r: Dict) -> str:
        total = r.get("total", 0)
        if self.locale == "tr":
            return f"Toplam {total} fatura bulundu."
        return f"Found {total} invoices."

    # ─── Reports ────────────────────────────────────────────────────

    def _fmt_report(self, r: Dict) -> str:
        report_type = r.get("report_type", "")
        data = r.get("data", [])
        summary = r.get("summary", {})
        if self.locale == "tr":
            type_names = {"sales": "Satış", "inventory": "Envanter", "customers": "Müşteri", "financial": "Finansal"}
            name = type_names.get(report_type, report_type)
            count = summary.get("total_count", len(data))
            text = f"📊 **{name} Raporu** — {count} kayıt"
            if summary.get("total_revenue"):
                text += f" | Toplam: {summary['total_revenue']:,.0f} ₺"
            return text
        return f"Report: {report_type}, {len(data)} records."

    # ─── SGK ────────────────────────────────────────────────────────

    def _fmt_sgk_rights(self, r: Dict) -> str:
        eligible = r.get("is_eligible", False)
        tc = r.get("tc_number", "")
        if self.locale == "tr":
            if eligible:
                return f"✅ TC {tc[-4:]}**** SGK işitme cihazı hakkı **mevcut**."
            return f"❌ TC {tc[-4:]}**** SGK işitme cihazı hakkı **bulunamadı**."
        return f"SGK eligibility: {'Eligible' if eligible else 'Not eligible'}"

    def _fmt_sgk_receipt(self, r: Dict) -> str:
        has = r.get("has_receipt", False)
        if self.locale == "tr":
            if has:
                return "✅ Geçerli SGK e-reçete bulundu."
            return "❌ Geçerli SGK e-reçete bulunamadı."
        return f"E-receipt: {'Found' if has else 'Not found'}"

    # ─── E-Invoice ──────────────────────────────────────────────────

    def _fmt_einvoice(self, r: Dict) -> str:
        status = r.get("status", "")
        if self.locale == "tr":
            return f"E-fatura GİB'e gönderildi. Durum: **{status}**"
        return f"E-invoice sent to GIB. Status: {status}"

    # ─── Admin ──────────────────────────────────────────────────────

    def _fmt_feature_flags(self, r: Dict) -> str:
        flags = r.get("flags", [])
        if self.locale == "tr":
            lines = [f"  • {f['name']}: {'✅ Aktif' if f['enabled'] else '❌ Pasif'}" for f in flags[:10]]
            return f"Feature flag'lar:\n" + "\n".join(lines)
        return f"{len(flags)} feature flags."

    def _fmt_flag_toggle(self, r: Dict) -> str:
        name = r.get("flag_name", "")
        enabled = r.get("enabled", False)
        if self.locale == "tr":
            return f"Feature flag **{name}** {'aktif edildi ✅' if enabled else 'pasif edildi ❌'}."
        return f"Flag {name} {'enabled' if enabled else 'disabled'}."

    def _fmt_tenant_info(self, r: Dict) -> str:
        name = r.get("name", "")
        plan = r.get("plan", "")
        if self.locale == "tr":
            return f"**{name}** | Plan: {plan} | Durum: {r.get('status', 'aktif')}"
        return f"{name} | Plan: {plan}"

    def _fmt_notification(self, r: Dict) -> str:
        count = r.get("sent_to", 0)
        channel = r.get("channel", "in_app")
        ch_name = {"sms": "SMS", "email": "E-posta", "in_app": "Uygulama içi"}.get(channel, channel)
        if self.locale == "tr":
            return f"📩 {count} kişiye {ch_name} bildirimi gönderildi."
        return f"Notification sent to {count} users via {channel}."

    # ─── Analytics ──────────────────────────────────────────────────

    def _fmt_dynamic_query(self, r: Dict) -> str:
        query_type = r.get("query_type", "")
        data = r.get("data", [])
        if self.locale == "tr":
            if not data:
                return "Sorgu sonucu boş döndü."
            lines = []
            for row in data[:10]:
                parts = [f"{v}" for k, v in row.items() if not k.startswith("_")]
                lines.append("  • " + " | ".join(parts))
            return f"📊 **{query_type}** — {len(data)} sonuç:\n" + "\n".join(lines)
        return f"Query '{query_type}': {len(data)} results."


    # ─── Hearing & Medical ─────────────────────────────────────────

    def _fmt_hearing_tests(self, r: Dict) -> str:
        tests = r.get("tests", [])
        if self.locale == "tr":
            if not tests:
                return "Bu hasta için işitme testi bulunamadı."
            lines = []
            for t in tests[:5]:
                date = (t.get("testDate") or "")[:10]
                test_type = t.get("testType", "")
                lines.append(f"  • {date} — {test_type}")
            return f"🔊 **{len(tests)} işitme testi** bulundu:\n" + "\n".join(lines)
        return f"{len(tests)} hearing tests found."

    def _fmt_hearing_profile(self, r: Dict) -> str:
        profile = r.get("profile")
        if not profile:
            return "İşitme profili bulunamadı." if self.locale == "tr" else "No hearing profile found."
        sgk = profile.get("sgkInfo") or {}
        if self.locale == "tr":
            text = "**İşitme Profili**"
            if sgk:
                text += f"\n  SGK Bilgi: {', '.join(f'{k}: {v}' for k, v in list(sgk.items())[:4])}"
            return text
        return "Hearing profile found."

    def _fmt_device_recommendations(self, r: Dict) -> str:
        severity = r.get("severity", "")
        recs = r.get("recommendations", [])
        left = r.get("leftPTA")
        right = r.get("rightPTA")
        bilateral = r.get("bilateral", False)
        sgk = r.get("sgkEligible", False)

        if self.locale == "tr":
            severity_tr = {"mild": "Hafif", "moderate": "Orta", "moderately_severe": "Orta-Ağır", "severe": "Ağır", "profound": "Çok Ağır", "normal": "Normal"}.get(severity, severity)
            text = f"🎧 **Kayıp Seviyesi: {severity_tr}**"
            if left:
                text += f"\n  Sol: {left} dB"
            if right:
                text += f" | Sağ: {right} dB"
            if bilateral:
                text += " (bilateral)"
            text += f"\n  SGK: {'✅ Uygun' if sgk else '❌ Uygun değil'}"
            if recs:
                text += f"\n\n**Önerilen Cihazlar** ({len(recs)}):"
                for d in recs[:5]:
                    stock = d.get("stock", 0)
                    price = d.get("price", 0)
                    text += f"\n  • **{d['name']}** — Stok: {stock}, {price:,.0f}₺ (skor: {d.get('score', 0):.0%})"
            elif severity != "normal":
                text += "\n\n⚠️ Envanterde uygun cihaz bulunamadı."
            return text
        return f"Severity: {severity}, {len(recs)} devices recommended."

    # ─── Business ───────────────────────────────────────────────────

    def _fmt_list_proformas(self, r: Dict) -> str:
        total = r.get("total", 0)
        if self.locale == "tr":
            return f"Toplam {total} teklif/proforma bulundu." if total else "Teklif bulunamadı."
        return f"{total} proformas found."

    def _fmt_record_payment(self, r: Dict) -> str:
        amount = r.get("amount", 0)
        method = {"cash": "Nakit", "credit_card": "Kredi Kartı", "bank_transfer": "Havale", "check": "Çek"}.get(r.get("method", ""), r.get("method", ""))
        if self.locale == "tr":
            return f"💳 **{amount:,.0f} ₺** ödeme kaydedildi ({method})."
        return f"Payment of {amount} recorded ({r.get('method')})."

    def _fmt_list_payments(self, r: Dict) -> str:
        items = r.get("items", [])
        if self.locale == "tr":
            if not items:
                return "Ödeme kaydı bulunamadı."
            total = sum(p.get("amount", 0) for p in items)
            return f"💰 {len(items)} ödeme kaydı, toplam {total:,.0f} ₺"
        return f"{len(items)} payments found."

    def _fmt_create_campaign(self, r: Dict) -> str:
        name = r.get("name", "")
        if self.locale == "tr":
            return f"📨 **{name}** kampanyası taslak olarak oluşturuldu. Kampanyalar panelinden gönderilebilir."
        return f"Campaign '{name}' created as draft."

    def _fmt_list_campaigns(self, r: Dict) -> str:
        total = r.get("total", 0)
        if self.locale == "tr":
            return f"Toplam {total} kampanya bulundu."
        return f"{total} campaigns found."

    def _fmt_list_documents(self, r: Dict) -> str:
        total = r.get("total", 0)
        if self.locale == "tr":
            return f"📄 {total} belge bulundu." if total else "Belge bulunamadı."
        return f"{total} documents found."

    def _fmt_patient_balance(self, r: Dict) -> str:
        total = r.get("total_amount", 0)
        paid = r.get("paid_amount", 0)
        remaining = r.get("remaining_balance", 0)
        if self.locale == "tr":
            text = f"💰 **Hasta Bakiyesi**\n"
            text += f"  • Toplam: {total:,.0f} ₺\n"
            text += f"  • Ödenen: {paid:,.0f} ₺\n"
            text += f"  • **Kalan: {remaining:,.0f} ₺**"
            if remaining <= 0:
                text += " ✅"
            return text
        return f"Balance: {remaining} remaining."

    def _fmt_daily_briefing(self, r: Dict) -> str:
        # Handled by daily_briefing.format_briefing() directly
        return r.get("formatted", str(r))


def get_response_formatter(locale: str = "tr") -> ResponseFormatter:
    """Factory function."""
    return ResponseFormatter(locale=locale)
