#!/usr/bin/env python3
"""
X-EAR CRM AI — Full Interactive Terminal Chat

Drives every CRM capability through the complete pipeline:
  Intent → Slot-filling → Tool execution → Summary → Confirmation → Modify

Runs 16 end-to-end scenarios covering every tool and every parameter.
"""

import sys
import os
sys.path.append(os.path.join(os.getcwd(), "apps/api"))

from ai.agents.intent_refiner import IntentRefiner
from ai.tools import get_tool_registry, ToolExecutionMode

refiner = IntentRefiner()
registry = get_tool_registry()
SEP = "─" * 60
OK = 0
FAIL = 0

# ───────────────── pretty printers ─────────────────
def ai(tag, txt, indent=0):
    print(f"{'  '*indent}🤖 [{tag}] {txt}")

def usr(txt):
    print(f"\n👤 SEN > {txt}")

def hdr(n, title):
    print(f"\n{'='*60}\n  SENARYO {n}: {title}\n{'='*60}")

def summary_box(data):
    """Print a nice summary box after tool execution."""
    print(f"\n  ┌{'─'*56}┐")
    print(f"  │{'İŞLEM ÖZETİ':^56}│")
    print(f"  ├{'─'*56}┤")
    if isinstance(data, dict):
        for k, v in data.items():
            k_str = str(k)[:20]
            v_str = str(v)[:32]
            print(f"  │  {k_str:<20} │ {v_str:<31} │")
    print(f"  └{'─'*56}┘\n")

# ───────────────── tool definitions ─────────────────
# Maps action_type → (tool_id, [(param_name, prompt, default_or_None)])
# The chat script uses these to drive slot-filling
ACTION_TOOLS = {
    "device_assign": ("assignDevice", [
        ("party_id",   "Hangi hasta için cihaz ataması yapılacak?",  None),
        ("device_id",  "Hangi cihaz atanacak?",                     None),
        ("ear_side",   "Hangi kulak? (Left/Right/Binaural)",        "Left"),
    ]),
    "cancel_appointment": ("cancel_appointment", [
        ("appointment_id", "Hangi randevuyu iptal etmek istiyorsunuz?", None),
    ]),
    "reschedule_appointment": ("reschedule_appointment", [
        ("appointment_id", "Hangi randevuyu ertelemek istiyorsunuz?",   None),
        ("new_date",       "Yeni tarih ne olsun? (YYYY-MM-DD)",        None),
    ]),
    "appointment_create": ("createAppointment", [
        ("party_id",          "Randevu kimin için?",            None),
        ("date",              "Tarih? (YYYY-MM-DD)",            None),
        ("time",              "Saat? (HH:MM)",                  None),
        ("appointment_type",  "Randevu tipi? (consultation/hearing_test/device_fitting/control)", "consultation"),
        ("notes",             "Not eklemek ister misiniz?",     ""),
    ]),
    "generate_and_send_e_invoice": ("generate_and_send_e_invoice", [
        ("invoice_id", "Hangi faturayı göndermek istiyorsunuz? (Fatura No)", None),
    ]),
    "sale_create": ("createSale", [
        ("party_id",      "Satışı kimin için oluşturuyoruz?",  None),
        ("total_amount",  "Toplam tutar ne kadar? (₺)",        None),
        ("notes",         "Satış notu?",                       ""),
    ]),
    "collection_create": ("get_daily_cash_summary", [
        ("period", "Hangi dönem?", "today"),
    ]),
}

QUERY_TOOLS = {
    "get_party_comprehensive_summary": ("get_party_comprehensive_summary", [
        ("party_id", "Hangi hastanın geçmişini istersiniz?", None),
    ]),
    "check_appointment_availability": ("check_appointment_availability", [
        ("date", "Hangi tarih için boş saatlere bakalım?", None),
    ]),
    "get_low_stock_alerts":          ("get_low_stock_alerts", []),
    "get_daily_cash_summary":        ("get_daily_cash_summary", [
        ("period", "Hangi dönemin özetini istersiniz? (today/week/month)", "today"),
    ]),
    "query_sgk_patient_rights":      ("query_sgk_patient_rights", [
        ("tc_number", "Hastanın TC Kimlik Numarası nedir?", None),
    ]),
    "query_sgk_e_receipt":           ("query_sgk_e_receipt", [
        ("tc_number", "Hastanın TC Kimlik Numarası nedir?", None),
    ]),
    "appointments_list":             ("check_appointment_availability", []),
    "inventory_list":                ("get_low_stock_alerts", []),
    "invoices_list":                 ("get_daily_cash_summary", []),
}


def exec_tool(tool_id, params):
    """Execute a tool and return (success, result_data)."""
    global OK, FAIL
    try:
        res = registry.execute_tool(tool_id, params, mode=ToolExecutionMode.SIMULATE)
        data = res.result or res.simulated_changes
        if res.success:
            ai("ARAÇ", f"✅ {tool_id} başarılı!")
            summary_box(data)
            OK += 1
            return True, data
        else:
            ai("ARAÇ", f"❌ {tool_id} hata: {res.error}")
            FAIL += 1
            return False, None
    except Exception as e:
        ai("ARAÇ", f"⚠️  {e}")
        FAIL += 1
        return False, None


def fill_slots(slots, answers):
    """Ask slot-filling questions and collect answers.
    Returns dict of param_name -> value."""
    collected = {}
    for name, prompt, default in slots:
        answer = answers.get(name)
        if answer is None and default is not None:
            answer = default
        ai("SORU", f"❓ {prompt}", indent=1)
        if answer is not None:
            print(f"    👤 CEVAP > {answer}")
            collected[name] = answer
        else:
            print("    👤 CEVAP > (eksik — bekliyor...)")
    return collected


def run(num, title, turns):
    """
    Run a scenario with multiple turns.
    
    turns = [
        (user_msg, answers_dict, expect_modification_dict_or_None),
        ...
    ]
    
    answers_dict: slot_name -> value answers for slot-filling.
    expect_modification_dict: if not None, simulates user saying "hayır, X'i değiştir"
        during confirmation approval. The dict maps param_name -> new_value.
    """
    hdr(num, title)
    ctx = {"conversation_history": []}
    last_collected = {}
    last_tool_id = None
    last_slots = []
    
    for user_msg, answers, modification in turns:
        usr(user_msg)
        result = refiner.classify_without_llm(user_msg, context=ctx)
        
        ai("NİYET", f"{result.intent_type.value} (güven: {result.confidence})")
        ai("YANIT", result.conversational_response)
        
        action_type = result.entities.get("action_type")
        query_type = result.entities.get("query_type")
        confirm_plan = result.entities.get("confirm_plan")
        
        if action_type and action_type in ACTION_TOOLS:
            tool_id, slots = ACTION_TOOLS[action_type]
            last_tool_id = tool_id
            last_slots = slots
            if slots and answers:
                ai("SLOT", "Eksik bilgileri topluyorum:")
                collected = fill_slots(slots, answers)
                last_collected = collected.copy()
                
                # If modification is requested during this turn
                if modification:
                    ai("ONAY", "📋 İşlem onayınıza sunuluyor:")
                    summary_box(collected)
                    ai("DEĞİŞİKLİK", f"Kullanıcı değişiklik istiyor: {modification}")
                    for mk, mv in modification.items():
                        if mk in collected:
                            ai("GÜNCELLEME", f"'{mk}': '{collected[mk]}' → '{mv}'", indent=1)
                            collected[mk] = mv
                    last_collected = collected.copy()
                    ai("ONAY", "📋 Güncellenmiş plan tekrar onaya sunuluyor:")
                    summary_box(collected)
                
                exec_tool(tool_id, collected)
            elif slots and not answers:
                ai("SLOT", "Bu işlem için bilgi gerekli:")
                fill_slots(slots, {})
        
        elif query_type and query_type in QUERY_TOOLS:
            tool_id, slots = QUERY_TOOLS[query_type]
            last_tool_id = tool_id
            last_slots = slots
            params = {}
            if slots and answers:
                ai("SLOT", "Sorgu parametrelerini topluyorum:")
                params = fill_slots(slots, answers)
                last_collected = params.copy()
            exec_tool(tool_id, params)
        
        elif confirm_plan:
            ai("ONAY", f"✅ Plan '{confirm_plan}' onaylandı!")
            if last_collected and last_tool_id:
                ai("YÜRÜTme", f"Önceki parametrelerle {last_tool_id} çalıştırılıyor...")
                exec_tool(last_tool_id, last_collected)
        
        # Update context
        ctx["conversation_history"].append({"role": "user", "content": user_msg})
        ctx["conversation_history"].append({
            "role": "assistant",
            "content": result.conversational_response,
            "entities": {
                "action_type": action_type,
                "query_type": query_type,
                "pending_plan_id": f"plan_{action_type or query_type or 'x'}_001" if not confirm_plan else None,
            }
        })
        print(SEP)


# ══════════════════════════════════════════════════════════
#                       SENARYOLAR
# ══════════════════════════════════════════════════════════

def main():
    global OK, FAIL
    
    print("\n🏥" * 25)
    print("  X-EAR CRM AI — KAPSAMLI U2U SENARYO TESTLERİ")
    print("  Slot-Filling • Araç Çalıştırma • Özet • Değişiklik • Onay")
    print("🏥" * 25)
    
    # ── 1. CİHAZ ATAMA (tam akış) ──
    run(1, "CİHAZ ATAMA — Slot-Filling + Onay", [
        ("cihaz ata", {"party_id": "p_12345", "device_id": "dev_phonak_l90_001", "ear_side": "Left"}, None),
        ("ee", None, None),
    ])
    
    # ── 2. CİHAZ ATAMA (düzeltme akışı) ──
    run(2, "CİHAZ ATAMA — Kullanıcı Düzeltme İstiyor", [
        ("cihaz ata", 
         {"party_id": "p_12345", "device_id": "dev_phonak_l90_001", "ear_side": "Left"},
         {"ear_side": "Right"}),  # Kullanıcı: "hayır, sağ kulak olacak"
    ])
    
    # ── 3. RANDEVU İPTAL ──
    run(3, "RANDEVU İPTAL", [
        ("randevuyu iptal et", {"appointment_id": "apt_2026_0301_001"}, None),
        ("et", None, None),
    ])
    
    # ── 4. RANDEVU UYGUNLUK ──
    run(4, "RANDEVU UYGUNLUK KONTROLÜ", [
        ("yarın boş yer var mı", {"date": "2026-03-01"}, None),
    ])
    
    # ── 5. RANDEVU OLUŞTURMA ──
    run(5, "RANDEVU OLUŞTURMA — Tam Slot-Filling", [
        ("randevu oluştur", {
            "party_id": "p_12345",
            "date": "2026-03-01",
            "time": "14:00",
            "appointment_type": "hearing_test",
            "notes": "İlk odyometri testi",
        }, None),
        ("tamam", None, None),
    ])
    
    # ── 6. RANDEVU OLUŞTURMA + DÜZELTME ──
    run(6, "RANDEVU OLUŞTURMA — Tarih Düzeltme", [
        ("randevu oluştur", {
            "party_id": "p_12345",
            "date": "2026-03-01",
            "time": "14:00",
            "notes": "Kontrol",
        }, {"time": "15:30"}),  # Kullanıcı: "saati 15:30 yap"
    ])
    
    # ── 7. HASTA ÖZETİ ──
    run(7, "HASTA ÖZETİ GETİRME", [
        ("Ahmet Yılmaz'ın geçmişini özetle", {"party_id": "p_12345"}, None),
    ])
    
    # ── 8. STOK UYARISI (parametresiz) ──
    run(8, "STOK UYARISI KONTROLÜ", [
        ("stok uyarısı var mı", None, None),
    ])
    
    # ── 9. KASA DURUMU ──
    run(9, "KASA DURUMU", [
        ("kasa ne durumda", {"period": "today"}, None),
    ])
    
    # ── 10. E-FATURA GÖNDERİMİ ──
    run(10, "E-FATURA GÖNDERİMİ", [
        ("faturayı yolla", {"invoice_id": "inv_2026_0099"}, None),
        ("devam", None, None),
    ])
    
    # ── 11. SGK MÜSTAHAKLIK ──
    run(11, "SGK MÜSTAHAKLIK SORGUSU", [
        ("müstahaklık sorgula", {"tc_number": "12345678901"}, None),
    ])
    
    # ── 12. SGK E-REÇETE ──
    run(12, "SGK E-REÇETE SORGUSU", [
        ("bu hastanın reçetesi var mı", {"tc_number": "12345678901"}, None),
    ])
    
    # ── 13. RANDEVU ERTELEME ──
    run(13, "RANDEVU ERTELEME", [
        ("randevuyu ertele", {"appointment_id": "apt_2026_0301_001", "new_date": "2026-03-05"}, None),
        ("tamam", None, None),
    ])
    
    # ── 14. SATIŞ OLUŞTURMA — tam akış ──
    run(14, "SATIŞ OLUŞTURMA — Tam Akış", [
        ("satış yap", {"party_id": "p_12345", "total_amount": 25000, "notes": "Phonak L90 sol kulak"}, None),
        ("evet", None, None),
    ])
    
    # ── 15. SELAMLAMA + BİLİNMEYEN ──
    run(15, "SELAMLAMA VE BİLİNMEYEN MESAJ", [
        ("merhaba", None, None),
        ("asdfghjkl", None, None),
    ])
    
    # ── 16. İPTAL AKIŞI ──
    run(16, "İŞLEM İPTALİ (vazgeç)", [
        ("cihaz ata", None, None),
        ("vazgeç", None, None),
    ])
    
    # ── SONUÇ ──
    total = OK + FAIL
    print(f"\n\n{'🎯'*25}")
    print("  TEST SONUÇ ÖZETİ")
    print(f"{'🎯'*25}")
    print(f"""
  Toplam Senaryo  : 16
  Araç Çağrısı    : {total}
  ✅ Başarılı      : {OK}
  ❌ Başarısız     : {FAIL}

  Test edilen yetenekler:
  ┌──────┬─────────────────────────────┬────────────────────────────────┐
  │  #   │ Yetenek                     │ Slot Parametreleri             │
  ├──────┼─────────────────────────────┼────────────────────────────────┤
  │  1   │ Cihaz Atama + Onay          │ hasta, cihaz, kulak            │
  │  2   │ Cihaz Atama + Düzeltme      │ kulak: Left → Right            │
  │  3   │ Randevu İptal + Onay        │ randevu ID                     │
  │  4   │ Randevu Uygunluk            │ tarih                          │
  │  5   │ Randevu Oluşturma + Onay    │ hasta, tarih, saat, tip, not   │
  │  6   │ Randevu + Saat Düzeltme     │ saat: 14:00 → 15:30            │
  │  7   │ Hasta Özeti                 │ hasta ID                       │
  │  8   │ Stok Uyarısı                │ (parametresiz)                 │
  │  9   │ Kasa Durumu                 │ dönem                          │
  │ 10   │ E-Fatura Gönderimi + Onay   │ fatura ID                      │
  │ 11   │ SGK Müstahaklık             │ TC no                          │
  │ 12   │ SGK E-Reçete                │ TC no                          │
  │ 13   │ Randevu Erteleme + Onay     │ randevu ID, yeni tarih         │
  │ 14   │ Satış Oluşturma + Onay      │ hasta, tutar, not              │
  │ 15   │ Selamlama + Bilinmeyen      │ —                              │
  │ 16   │ İşlem İptali (vazgeç)       │ —                              │
  └──────┴─────────────────────────────┴────────────────────────────────┘
""")
    if FAIL == 0:
        print("  🟢 TÜM ARAÇLAR SORUNSUZ ÇALIŞTI!")
    else:
        print(f"  🔴 {FAIL} ARAÇ HATALI — Düzeltme Gerekli!")
    print()


if __name__ == "__main__":
    main()
