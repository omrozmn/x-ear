
file_path = "apps/api/ai/agents/intent_refiner.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add to the fallback classifying logic (around line 694 Collections/Payments)
new_rules = """        # CRM: Comprehensive Party Summary
        if _has_stem(["geçmiş", "özet", "hasta detayı", "hasta özeti"]):
            return IntentOutput(
                intent_type=IntentType.QUERY,
                confidence=0.85,
                entities={"query_type": "get_party_comprehensive_summary"},
                conversational_response="Hasta geçmişini özetliyorum.",
                reasoning="Hasta geçmişi/özeti sorgusu tespit edildi"
            )

        # Inventory: Low Stock Alerts
        if _has_stem(["eksik", "stok uyarısı", "biten", "kritik stok"]):
            return IntentOutput(
                intent_type=IntentType.QUERY,
                confidence=0.85,
                entities={"query_type": "get_low_stock_alerts"},
                conversational_response="Kritik seviyedeki stokları kontrol ediyorum.",
                reasoning="Kritik stok sorgusu tespit edildi"
            )

        # Appointments: Check Availability
        if _has_stem(["boş saat", "boş yer", "müsait", "uygun saat"]):
            return IntentOutput(
                intent_type=IntentType.QUERY,
                confidence=0.85,
                entities={"query_type": "check_appointment_availability"},
                conversational_response="Müsait saatleri kontrol ediyorum.",
                reasoning="Randevu uygunluk sorgusu tespit edildi"
            )

        # Appointments: Cancel / Reschedule
        if _has_stem(["iptal et", "randevu iptal"]):
            return IntentOutput(
                intent_type=IntentType.ACTION,
                confidence=0.85,
                entities={"action_type": "cancel_appointment"},
                conversational_response="Randevu iptal işlemini başlatıyorum.",
                reasoning="Randevu iptali tespit edildi"
            )
        if _has_stem(["ertele", "kaydır", "değiştir", "başka zamana"]):
            return IntentOutput(
                intent_type=IntentType.ACTION,
                confidence=0.85,
                entities={"action_type": "reschedule_appointment"},
                conversational_response="Randevu erteleme işlemini başlatıyorum.",
                reasoning="Randevu erteleme tespit edildi"
            )

        # Finance & Invoicing
        if _has_stem(["kasa durum", "bugünkü kasa", "ne kadar var", "nakit özet"]):
            return IntentOutput(
                intent_type=IntentType.QUERY,
                confidence=0.85,
                entities={"query_type": "get_daily_cash_summary"},
                conversational_response="Kasa durumunu özetliyorum.",
                reasoning="Günlük kasa özeti sorgusu tespit edildi"
            )
        if _has_stem(["e-fatura kes", "gib'e yolla", "faturayı gönder", "fatura yolla", "gib gönder"]):
            return IntentOutput(
                intent_type=IntentType.ACTION,
                confidence=0.85,
                entities={"action_type": "generate_and_send_e_invoice"},
                conversational_response="E-fatura gönderim işlemini başlatıyorum.",
                reasoning="E-Fatura gönderim tespiti"
            )

        # SGK Integrations
        if _has_stem(["müstahaklık", "sgk hak", "cihaz hakkı"]):
            return IntentOutput(
                intent_type=IntentType.QUERY,
                confidence=0.85,
                entities={"query_type": "query_sgk_patient_rights"},
                conversational_response="SGK müstahaklık durumunu sorguluyorum.",
                reasoning="SGK hak sorgusu tespit edildi"
            )
        if _has_stem(["e-reçete", "reçete sorgula", "sgk reçete", "reçetesi var mı"]):
            return IntentOutput(
                intent_type=IntentType.QUERY,
                confidence=0.85,
                entities={"query_type": "query_sgk_e_receipt"},
                conversational_response="SGK e-reçete durumunu sorguluyorum.",
                reasoning="SGK e-reçete sorgusu tespit edildi"
            )

        # Collections / Payments"""

content = content.replace("        # Collections / Payments", new_rules)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected intent rules to intent_refiner.py")
