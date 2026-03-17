"""
Seed script for common clinical treatment protocols in Turkish.
Run with: python -m seed_protocols
"""
import json
import logging
import sys

from sqlalchemy.orm import Session

from hbys_common.database import gen_id
from models.clinical_protocol import ClinicalProtocol

logger = logging.getLogger(__name__)

SEED_PROTOCOLS = [
    {
        "name_tr": "Akut Koroner Sendrom (AKS) Tedavi Protokolü",
        "name_en": "Acute Coronary Syndrome Treatment Protocol",
        "icd_codes": ["I21", "I21.0", "I21.1", "I21.9", "I20.0"],
        "specialty": "Kardiyoloji",
        "protocol_type": "treatment",
        "description": "ST yükselmeli ve ST yükselmesiz miyokard enfarktüsü ile kararsız angina hastalarının acil ve erken dönem tedavi protokolü.",
        "steps": [
            {"order": 1, "title": "İlk Değerlendirme", "description": "12 derivasyonlu EKG (10 dk içinde), troponin, CBC, BMP, koagülasyon paneli istenir."},
            {"order": 2, "title": "Ağrı Kontrolü", "description": "Morfin 2-4 mg IV (gerekirse tekrar), NTG sublingual/IV başlanır."},
            {"order": 3, "title": "Antitrombotik Tedavi", "description": "Aspirin 300 mg çiğnenecek + Klopidogrel 600 mg veya Tikagrelor 180 mg yükleme dozu."},
            {"order": 4, "title": "Antikoagülan", "description": "Heparin 60 U/kg IV bolus (maks 4000 U), ardından 12 U/kg/saat infüzyon."},
            {"order": 5, "title": "STEMI ise", "description": "Primer PCI (kapı-balon süresi <90 dk) veya fibrinolitik tedavi (kapı-iğne <30 dk)."},
            {"order": 6, "title": "Beta-Bloker", "description": "Metoprolol 5 mg IV (kontrendikasyon yoksa), ardından 50 mg PO."},
        ],
        "contraindications": ["Aktif kanama", "İntrakraniyal kanama öyküsü", "Aort diseksiyonu şüphesi"],
        "evidence_level": "1a",
    },
    {
        "name_tr": "Toplum Kökenli Pnömoni Tedavi Protokolü",
        "name_en": "Community-Acquired Pneumonia Treatment Protocol",
        "icd_codes": ["J18", "J18.0", "J18.1", "J18.9", "J15"],
        "specialty": "Göğüs Hastalıkları",
        "protocol_type": "treatment",
        "description": "Erişkin toplum kökenli pnömoni hastalarının risk sınıflandırması ve ampirik antibiyotik tedavi protokolü.",
        "steps": [
            {"order": 1, "title": "Risk Değerlendirmesi", "description": "CURB-65 veya PSI skoru hesaplanır. SpO2, kan gazı, kan kültürü alınır."},
            {"order": 2, "title": "Ayaktan Tedavi (CURB-65: 0-1)", "description": "Amoksisilin 1g 3x1 PO veya Klaritromisin 500mg 2x1 PO, 5-7 gün."},
            {"order": 3, "title": "Servis Yatış (CURB-65: 2)", "description": "Ampisilin-sulbaktam 1.5g 4x1 IV + Klaritromisin 500mg 2x1 IV."},
            {"order": 4, "title": "YBÜ Yatış (CURB-65: 3-5)", "description": "Piperasilin-tazobaktam 4.5g 3x1 IV + Levofloksasin 750mg 1x1 IV."},
            {"order": 5, "title": "Takip", "description": "48-72 saatte klinik yanıt değerlendirilir. Kültür sonuçlarına göre tedavi düzenlenir."},
        ],
        "contraindications": ["Bilinen alerji durumunda alternatif antibiyotik seçilir"],
        "evidence_level": "1a",
    },
    {
        "name_tr": "Diyabetik Ketoasidoz (DKA) Tedavi Protokolü",
        "name_en": "Diabetic Ketoacidosis Treatment Protocol",
        "icd_codes": ["E10.1", "E11.1", "E13.1"],
        "specialty": "Endokrinoloji",
        "protocol_type": "treatment",
        "description": "Diyabetik ketoasidoz hastalarının acil değerlendirme, sıvı replasmanı, insülin tedavisi ve elektrolit düzeltme protokolü.",
        "steps": [
            {"order": 1, "title": "Tanı Kriterleri", "description": "Kan şekeri >250 mg/dL, pH <7.30, bikarbonat <18 mEq/L, pozitif keton."},
            {"order": 2, "title": "Sıvı Tedavisi", "description": "İlk saat: SF %0.9 1000-1500 mL, sonra 250-500 mL/saat. Glukoz <250 olunca %5 dekstroz eklenir."},
            {"order": 3, "title": "İnsülin Tedavisi", "description": "Regüler insülin 0.1-0.14 U/kg/saat IV infüzyon. Hedef: saatte 50-70 mg/dL düşüş."},
            {"order": 4, "title": "Potasyum Replasmanı", "description": "K <3.3: 20-40 mEq/saat (insülin başlamadan önce), K 3.3-5.3: 20-30 mEq/L sıvıya eklenir."},
            {"order": 5, "title": "Bikarbonat", "description": "Sadece pH <6.9 ise: NaHCO3 100 mmol/400 mL sıvı içinde 2 saat infüzyon."},
            {"order": 6, "title": "İzlem", "description": "Saatlik glukoz, 2 saatte bir elektrolit ve kan gazı takibi. DKA çözülünce SC insüline geçiş."},
        ],
        "contraindications": ["Serebral ödem gelişiminde manitol verilir", "Hipokalemi düzeltilmeden insülin başlanmaz"],
        "evidence_level": "1b",
    },
    {
        "name_tr": "Akut İskemik İnme Tedavi Protokolü",
        "name_en": "Acute Ischemic Stroke Treatment Protocol",
        "icd_codes": ["I63", "I63.0", "I63.3", "I63.4", "I63.9"],
        "specialty": "Nöroloji",
        "protocol_type": "treatment",
        "description": "Akut iskemik inme hastalarının tromboliz ve/veya mekanik trombektomi endikasyonu değerlendirmesi ve tedavi protokolü.",
        "steps": [
            {"order": 1, "title": "Acil Değerlendirme", "description": "NIHSS skoru, BT (kanama dışlanması), BT anjiyografi istenir. Kapıdan BT <25 dk."},
            {"order": 2, "title": "IV tPA (Alteplaz)", "description": "Semptom başlangıcından <4.5 saat: Alteplaz 0.9 mg/kg IV (%10 bolus, %90 60 dk infüzyon, maks 90 mg)."},
            {"order": 3, "title": "Mekanik Trombektomi", "description": "Büyük damar oklüzyonu + semptom <24 saat ise endovasküler tedavi değerlendirilir."},
            {"order": 4, "title": "Kan Basıncı Yönetimi", "description": "tPA adayı: KB <185/110 mmHg. tPA sonrası 24 saat: KB <180/105 mmHg."},
            {"order": 5, "title": "Destek Tedavisi", "description": "Ateş kontrolü (<37.5°C), kan şekeri kontrolü (140-180 mg/dL), yutma değerlendirmesi."},
            {"order": 6, "title": "Sekonder Koruma", "description": "24 saat sonra antiagregan tedavi başlanır. Statın, AF varsa antikoagülan planlanır."},
        ],
        "contraindications": ["Aktif kanama", "Trombosit <100.000", "INR >1.7", "Son 3 ayda intrakraniyal cerrahi"],
        "evidence_level": "1a",
    },
    {
        "name_tr": "Sepsis ve Septik Şok Tedavi Protokolü",
        "name_en": "Sepsis and Septic Shock Treatment Protocol",
        "icd_codes": ["A41", "A41.9", "R65.2"],
        "specialty": "Yoğun Bakım",
        "protocol_type": "treatment",
        "description": "Sepsis ve septik şok hastalarının erken tanı, 1 saatlik bundle ve hedefe yönelik tedavi protokolü (Surviving Sepsis Campaign).",
        "steps": [
            {"order": 1, "title": "Tanı ve Tarama", "description": "qSOFA >=2 veya SOFA >=2 puan artış. Laktat ölçümü, kan kültürü (2 set) alınır."},
            {"order": 2, "title": "1 Saatlik Bundle", "description": "Laktat ölçümü, antibiyotik öncesi kan kültürü, geniş spektrumlu antibiyotik IV, 30 mL/kg kristaloid (hipotansiyon/laktat >=4 ise)."},
            {"order": 3, "title": "Antibiyotik", "description": "Tanıdan itibaren 1 saat içinde ampirik geniş spektrumlu antibiyotik başlanır."},
            {"order": 4, "title": "Vazopressör", "description": "Sıvı resüsitasyonuna rağmen MAP <65 mmHg ise Norepinefrin ilk seçenek olarak başlanır."},
            {"order": 5, "title": "Kaynak Kontrolü", "description": "Enfeksiyon kaynağı belirlenir ve kontrol altına alınır (drenaj, debridman, cihaz çıkarılması)."},
            {"order": 6, "title": "İzlem", "description": "Laktat her 2-4 saatte tekrarlanır. Organ yetmezliği parametreleri izlenir. 48-72 saatte antibiyotik de-eskalasyonu değerlendirilir."},
        ],
        "contraindications": ["Vazopressör dozu titre edilirken kan basıncı hedefi bireyselleştirilir"],
        "evidence_level": "1a",
    },
    {
        "name_tr": "Hipertansif Acil Tedavi Protokolü",
        "name_en": "Hypertensive Emergency Treatment Protocol",
        "icd_codes": ["I10", "I11", "I13", "I16.1"],
        "specialty": "Kardiyoloji",
        "protocol_type": "treatment",
        "description": "Hipertansif acil (hedef organ hasarı ile birlikte) hastalarının acil kan basıncı düşürme protokolü.",
        "steps": [
            {"order": 1, "title": "Değerlendirme", "description": "KB >180/120 mmHg + hedef organ hasarı bulguları (göğüs ağrısı, nefes darlığı, nörolojik defisit, göz dibi değişiklikleri)."},
            {"order": 2, "title": "İlk Hedef", "description": "İlk 1 saatte KB'yi %25'ten fazla olmayacak şekilde düşür. Agresif düşüşten kaçın."},
            {"order": 3, "title": "IV Tedavi", "description": "Nikardipin 5 mg/saat IV (2.5 mg/saat artırılır, maks 15) veya Labetalol 20 mg IV bolus, ardından infüzyon."},
            {"order": 4, "title": "Aort Diseksiyonu", "description": "Esmolol IV + Nikardipin: Hedef sistolik <120 mmHg, kalp hızı <60/dk, 20 dk içinde."},
            {"order": 5, "title": "Sonraki 2-6 Saat", "description": "KB 160/100 mmHg'ye indirilir. Oral tedaviye geçiş planlanır."},
        ],
        "contraindications": ["Aort stenozu varlığında nitrogliserin dikkatli kullanılır", "Beta-bloker: astım, bradikardi, kalp bloğu"],
        "evidence_level": "1b",
    },
    {
        "name_tr": "Astım Atak Tedavi Protokolü",
        "name_en": "Asthma Exacerbation Treatment Protocol",
        "icd_codes": ["J45", "J45.2", "J45.3", "J46"],
        "specialty": "Göğüs Hastalıkları",
        "protocol_type": "treatment",
        "description": "Erişkin astım atak hastalarının acil servis ve yatış tedavi protokolü.",
        "steps": [
            {"order": 1, "title": "Başlangıç Değerlendirmesi", "description": "SpO2, PEF, konuşma yeteneği, yardımcı solunum kası kullanımı değerlendirilir."},
            {"order": 2, "title": "Hafif-Orta Atak", "description": "Salbutamol nebül 2.5 mg (20 dk arayla 3 doz) + İpratropium bromür 0.5 mg nebül + Prednizolon 40-50 mg PO."},
            {"order": 3, "title": "Ağır Atak", "description": "Salbutamol 5 mg nebül sürekli + İpratropium 0.5 mg nebül + Metilprednizolon 80 mg IV + MgSO4 2g IV 20 dk."},
            {"order": 4, "title": "Yaşamı Tehdit Eden", "description": "Mekanik ventilasyon hazırlığı, Adrenalin 0.5 mg IM, YBÜ konsültasyonu."},
            {"order": 5, "title": "Taburculuk Kriterleri", "description": "PEF >%70 beklenen, SpO2 >%94, 4 saat stabil, inhaler tekniği eğitimi, 5-7 gün oral steroid reçetesi."},
        ],
        "contraindications": ["Sedasyon verilmez (solunum depresyonu)", "Beta-bloker kontrendikedir"],
        "evidence_level": "1a",
    },
    {
        "name_tr": "Üriner Sistem Enfeksiyonu Tedavi Protokolü",
        "name_en": "Urinary Tract Infection Treatment Protocol",
        "icd_codes": ["N39.0", "N10", "N30.0"],
        "specialty": "Enfeksiyon Hastalıkları",
        "protocol_type": "treatment",
        "description": "Komplike ve komplike olmayan üriner sistem enfeksiyonlarının ampirik ve kültür bazlı tedavi protokolü.",
        "steps": [
            {"order": 1, "title": "Tanı", "description": "Tam idrar analizi, idrar kültürü ve duyarlılık testi istenir. Gerekirse kan kültürü."},
            {"order": 2, "title": "Komplike Olmayan Sistit", "description": "Fosfomisin 3g tek doz PO veya Nitrofurantoin 100mg 2x1 PO 5 gün veya TMP-SMX 160/800mg 2x1 PO 3 gün."},
            {"order": 3, "title": "Komplike Olmayan Piyelonefrit", "description": "Siprofloksasin 500mg 2x1 PO 7 gün veya Seftriakson 1g 1x1 IV (yatış gerektiriyorsa)."},
            {"order": 4, "title": "Komplike ÜSE / Ürosepsis", "description": "Seftriakson 2g 1x1 IV veya Piperasilin-tazobaktam 4.5g 3x1 IV. Kan kültürü ve idrar kültürüne göre tedavi düzenlenir."},
            {"order": 5, "title": "Tedavi Süresi", "description": "Komplike olmayan sistit: 3-5 gün, piyelonefrit: 7-14 gün, ürosepsis: 10-14 gün."},
        ],
        "contraindications": ["Florokinolon alerjisi veya tendon ruptur öyküsü varsa alternatif seçilir", "Gebelikte nitrofurantoin 3. trimesterde kontrendike"],
        "evidence_level": "1a",
    },
    {
        "name_tr": "Venöz Tromboembolizm (VTE) Profilaksi Protokolü",
        "name_en": "Venous Thromboembolism Prophylaxis Protocol",
        "icd_codes": ["I26", "I80", "I82"],
        "specialty": "Genel Cerrahi",
        "protocol_type": "preventive",
        "description": "Cerrahi ve dahili hastalar için venöz tromboembolizm risk değerlendirmesi ve profilaksi protokolü.",
        "steps": [
            {"order": 1, "title": "Risk Değerlendirmesi", "description": "Caprini skoru (cerrahi) veya Padua skoru (dahili) hesaplanır. Kanama riski değerlendirilir."},
            {"order": 2, "title": "Düşük Risk (Caprini 0-2)", "description": "Erken mobilizasyon. Farmakolojik profilaksi gerekmez."},
            {"order": 3, "title": "Orta Risk (Caprini 3-4)", "description": "Enoksaparin 40 mg 1x1 SC/gün veya Heparin 5000 U 2x1 SC. Kompresyon çorabı."},
            {"order": 4, "title": "Yüksek Risk (Caprini >=5)", "description": "Enoksaparin 40 mg 1x1 SC/gün + Kompresyon cihazı. Ortopedik cerrahi: 28 güne kadar uzatılır."},
            {"order": 5, "title": "Kanama Riski Yüksek", "description": "Mekanik profilaksi: Intermittent pnömatik kompresyon (IPC) + graduatedkompresyon çorabı."},
        ],
        "contraindications": ["Aktif kanama", "Trombosit <50.000", "Kreatinin klerensi <30 mL/dk (doz ayarlaması)"],
        "evidence_level": "1a",
    },
    {
        "name_tr": "Tip 2 Diyabet Tedavi Başlangıç Protokolü",
        "name_en": "Type 2 Diabetes Initial Treatment Protocol",
        "icd_codes": ["E11", "E11.0", "E11.6", "E11.9"],
        "specialty": "Endokrinoloji",
        "protocol_type": "treatment",
        "description": "Yeni tanı Tip 2 diyabet hastalarında yaşam tarzı değişikliği ve farmakolojik tedavi başlama protokolü.",
        "steps": [
            {"order": 1, "title": "HbA1c Değerlendirmesi", "description": "HbA1c, açlık glukozu, lipid profili, böbrek fonksiyonu, karaciğer fonksiyonu, tam idrar istenir."},
            {"order": 2, "title": "Yaşam Tarzı", "description": "Diyet danışmanlığı (karbonhidrat sayımı), haftada 150 dk orta yoğunlukta egzersiz, kilo verme hedefi (%5-10)."},
            {"order": 3, "title": "Monoterapi (HbA1c <8%)", "description": "Metformin 500 mg 1x1, 2 haftada bir artırarak 2000 mg/gün hedefine çıkılır."},
            {"order": 4, "title": "Kombinasyon (HbA1c 8-10%)", "description": "Metformin + SGLT2 inhibitörü (KV/renal fayda) veya GLP-1 RA (obezite varsa) veya DPP-4 inhibitörü."},
            {"order": 5, "title": "İnsülin Başlangıcı (HbA1c >10%)", "description": "Bazal insülin 10 U/gün veya 0.2 U/kg/gün + Metformin. Açlık glukozuna göre 2 günde bir 2 U artır."},
            {"order": 6, "title": "Takip", "description": "3 ayda bir HbA1c, yılda 1 göz dibi, ayak muayenesi, mikroalbumin, lipid takibi."},
        ],
        "contraindications": ["Metformin: GFR <30 mL/dk", "SGLT2i: Tekrarlayan genital enfeksiyon, DKA öyküsü", "Sulfonilüre: Hipoglisemi riski yüksek yaşlı hasta"],
        "evidence_level": "1a",
    },
]


def seed_protocols(db: Session) -> int:
    """
    Seed the clinical protocols table with common treatment protocols.
    Skips protocols that already exist (matched by name_tr).
    Returns the number of newly inserted protocols.
    """
    inserted = 0

    for proto_data in SEED_PROTOCOLS:
        existing = (
            db.query(ClinicalProtocol)
            .filter(ClinicalProtocol.name_tr == proto_data["name_tr"])
            .first()
        )
        if existing:
            logger.info("Protocol already exists, skipping: %s", proto_data["name_tr"])
            continue

        protocol = ClinicalProtocol(
            id=gen_id("cpr"),
            name_tr=proto_data["name_tr"],
            name_en=proto_data.get("name_en"),
            icd_codes=json.dumps(proto_data.get("icd_codes", []), ensure_ascii=False),
            specialty=proto_data.get("specialty"),
            protocol_type=proto_data.get("protocol_type", "treatment"),
            description=proto_data.get("description"),
            steps=json.dumps(proto_data.get("steps", []), ensure_ascii=False),
            contraindications=json.dumps(proto_data.get("contraindications", []), ensure_ascii=False),
            evidence_level=proto_data.get("evidence_level"),
            is_active=True,
            version=1,
        )
        db.add(protocol)
        inserted += 1
        logger.info("Protocol seeded: %s", proto_data["name_tr"])

    db.commit()
    logger.info("Seed complete: %d protocols inserted", inserted)
    return inserted


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from main import app
    from hbys_common.service_app import get_db_dependency

    get_db = get_db_dependency(app)
    db_gen = get_db()
    db = next(db_gen)
    try:
        count = seed_protocols(db)
        print(f"Seeded {count} clinical protocols.")
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass
