"""
AI-Powered Clinical Decision Support Engine.

Smart dose calculation, allergy cross-reactivity prediction,
multi-drug safety scoring, and alternative drug suggestion.
"""
import logging
import math
from typing import List, Optional

logger = logging.getLogger(__name__)


# ============================================================================
# DRUG KNOWLEDGE BASE (~50 common drugs)
# ============================================================================

# Each drug entry:
#   name_tr: Turkish name
#   class: therapeutic class
#   standard_dose_mg: typical adult dose (single)
#   max_daily_dose_mg: max daily dose for normal adult
#   frequency: typical frequency
#   route: typical route
#   renal_adjustments: dict of GFR thresholds -> dose fraction or "contraindicated"
#   hepatic_adjustments: dict of liver_function -> dose fraction or "contraindicated"
#   pediatric: bool - suitable for children
#   geriatric_factor: dose reduction factor for elderly (1.0 = no change)
#   min_age: minimum age in years (0 if no restriction)
#   category: grouping for alternatives
#   contraindications: list of conditions
#   notes_tr: Turkish notes

DRUG_DATABASE = {
    "amoxicillin": {
        "name_tr": "Amoksisilin",
        "class": "penisilin",
        "category": "antibiyotik",
        "standard_dose_mg": 500,
        "max_daily_dose_mg": 3000,
        "frequency": "8 saatte bir",
        "route": "oral",
        "renal_adjustments": {30: 0.5, 15: 0.25},
        "hepatic_adjustments": {"moderate": 0.75, "severe": 0.5},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 25,
        "geriatric_factor": 0.85,
        "min_age": 0,
        "contraindications": ["penisilin_alerjisi"],
        "notes_tr": "Geniş spektrumlu penisilin grubu antibiyotik. Yemeklerle birlikte alınabilir.",
    },
    "ampicillin": {
        "name_tr": "Ampisilin",
        "class": "penisilin",
        "category": "antibiyotik",
        "standard_dose_mg": 500,
        "max_daily_dose_mg": 12000,
        "frequency": "6 saatte bir",
        "route": "oral/IV",
        "renal_adjustments": {30: 0.5, 15: 0.25},
        "hepatic_adjustments": {"moderate": 0.75, "severe": 0.5},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 50,
        "geriatric_factor": 0.85,
        "min_age": 0,
        "contraindications": ["penisilin_alerjisi"],
        "notes_tr": "Penisilin grubu antibiyotik. Aç karnına alınması önerilir.",
    },
    "amoxicillin_clavulanate": {
        "name_tr": "Amoksisilin-Klavulanat (Augmentin)",
        "class": "penisilin",
        "category": "antibiyotik",
        "standard_dose_mg": 625,
        "max_daily_dose_mg": 3000,
        "frequency": "8 saatte bir",
        "route": "oral",
        "renal_adjustments": {30: 0.5, 15: "contraindicated"},
        "hepatic_adjustments": {"moderate": 0.75, "severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 25,
        "geriatric_factor": 0.85,
        "min_age": 0,
        "contraindications": ["penisilin_alerjisi", "karaciger_yetmezligi"],
        "notes_tr": "Amoksisilin + klavulanik asit kombinasyonu. Yemekle birlikte alınmalıdır.",
    },
    "cephalexin": {
        "name_tr": "Sefaleksin",
        "class": "sefalosporin_1",
        "category": "antibiyotik",
        "standard_dose_mg": 500,
        "max_daily_dose_mg": 4000,
        "frequency": "6 saatte bir",
        "route": "oral",
        "renal_adjustments": {30: 0.5, 10: 0.25},
        "hepatic_adjustments": {"severe": 0.75},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 25,
        "geriatric_factor": 0.9,
        "min_age": 0,
        "contraindications": ["sefalosporin_alerjisi"],
        "notes_tr": "Birinci kuşak sefalosporin. Gram pozitif bakterilere etkilidir.",
    },
    "ceftriaxone": {
        "name_tr": "Seftriakson",
        "class": "sefalosporin_3",
        "category": "antibiyotik",
        "standard_dose_mg": 1000,
        "max_daily_dose_mg": 4000,
        "frequency": "12-24 saatte bir",
        "route": "IV/IM",
        "renal_adjustments": {10: 0.5},
        "hepatic_adjustments": {"severe": 0.75},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 50,
        "geriatric_factor": 0.9,
        "min_age": 0,
        "contraindications": ["sefalosporin_alerjisi", "hiperbilirubinemi_yenidogan"],
        "notes_tr": "Üçüncü kuşak sefalosporin. Geniş spektrumlu parenteral antibiyotik.",
    },
    "azithromycin": {
        "name_tr": "Azitromisin",
        "class": "makrolid",
        "category": "antibiyotik",
        "standard_dose_mg": 500,
        "max_daily_dose_mg": 500,
        "frequency": "günde 1 kez",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {"moderate": 0.75, "severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 10,
        "geriatric_factor": 1.0,
        "min_age": 0,
        "contraindications": ["makrolid_alerjisi", "ciddi_karaciger_yetmezligi"],
        "notes_tr": "Makrolid grubu antibiyotik. 3-5 günlük kür. Yemekten 1 saat önce alınmalıdır.",
    },
    "ciprofloxacin": {
        "name_tr": "Siprofloksasin",
        "class": "florokinolon",
        "category": "antibiyotik",
        "standard_dose_mg": 500,
        "max_daily_dose_mg": 1500,
        "frequency": "12 saatte bir",
        "route": "oral/IV",
        "renal_adjustments": {30: 0.5, 15: 0.25},
        "hepatic_adjustments": {"severe": 0.75},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.75,
        "min_age": 18,
        "contraindications": ["florokinolon_alerjisi", "tendon_ruptur_oykusu", "miyasteni_gravis"],
        "notes_tr": "Florokinolon grubu antibiyotik. 18 yaş altında kontrendikedir. Süt ürünleriyle birlikte alınmamalıdır.",
    },
    "levofloxacin": {
        "name_tr": "Levofloksasin",
        "class": "florokinolon",
        "category": "antibiyotik",
        "standard_dose_mg": 500,
        "max_daily_dose_mg": 750,
        "frequency": "günde 1 kez",
        "route": "oral/IV",
        "renal_adjustments": {50: 0.75, 20: 0.5},
        "hepatic_adjustments": {"severe": 0.75},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.75,
        "min_age": 18,
        "contraindications": ["florokinolon_alerjisi", "tendon_ruptur_oykusu"],
        "notes_tr": "Solunum yolu enfeksiyonlarında etkili florokinolon.",
    },
    "metformin": {
        "name_tr": "Metformin",
        "class": "biguanid",
        "category": "antidiyabetik",
        "standard_dose_mg": 850,
        "max_daily_dose_mg": 3000,
        "frequency": "8-12 saatte bir",
        "route": "oral",
        "renal_adjustments": {45: 0.5, 30: "contraindicated"},
        "hepatic_adjustments": {"moderate": "contraindicated", "severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.75,
        "min_age": 10,
        "contraindications": ["boebrek_yetmezligi_gfr30", "laktik_asidoz", "akut_kalp_yetmezligi"],
        "notes_tr": "Tip 2 DM tedavisinde ilk basamak ilaç. GFR < 30 kontrendikedir. Yemekle birlikte alınmalıdır.",
    },
    "glimepiride": {
        "name_tr": "Glimepirid",
        "class": "sulfonilure",
        "category": "antidiyabetik",
        "standard_dose_mg": 2,
        "max_daily_dose_mg": 8,
        "frequency": "günde 1 kez",
        "route": "oral",
        "renal_adjustments": {30: 0.5, 15: "contraindicated"},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.5,
        "min_age": 18,
        "contraindications": ["tip1_dm", "diyabetik_ketoasidoz"],
        "notes_tr": "Sülfonilüre grubu antidiyabetik. Kahvaltıyla birlikte alınmalıdır. Hipoglisemi riski vardır.",
    },
    "sitagliptin": {
        "name_tr": "Sitagliptin",
        "class": "dpp4_inhibitoru",
        "category": "antidiyabetik",
        "standard_dose_mg": 100,
        "max_daily_dose_mg": 100,
        "frequency": "günde 1 kez",
        "route": "oral",
        "renal_adjustments": {50: 0.5, 30: 0.25},
        "hepatic_adjustments": {},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 1.0,
        "min_age": 18,
        "contraindications": ["pankreatit_oykusu"],
        "notes_tr": "DPP-4 inhibitörü. Yemekten bağımsız alınabilir.",
    },
    "ibuprofen": {
        "name_tr": "İbuprofen",
        "class": "nsaid",
        "category": "analjezik_antiinflamatuar",
        "standard_dose_mg": 400,
        "max_daily_dose_mg": 2400,
        "frequency": "6-8 saatte bir",
        "route": "oral",
        "renal_adjustments": {30: "contraindicated"},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 10,
        "geriatric_factor": 0.5,
        "min_age": 0,
        "contraindications": ["nsaid_alerjisi", "gi_kanama", "boebrek_yetmezligi", "aspirin_alerjisi"],
        "notes_tr": "NSAID grubu ağrı kesici ve iltihap giderici. Tok karnına alınmalıdır. GİS kanama riski vardır.",
    },
    "naproxen": {
        "name_tr": "Naproksen",
        "class": "nsaid",
        "category": "analjezik_antiinflamatuar",
        "standard_dose_mg": 500,
        "max_daily_dose_mg": 1250,
        "frequency": "12 saatte bir",
        "route": "oral",
        "renal_adjustments": {30: "contraindicated"},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 5,
        "geriatric_factor": 0.5,
        "min_age": 2,
        "contraindications": ["nsaid_alerjisi", "gi_kanama", "boebrek_yetmezligi"],
        "notes_tr": "NSAID grubu ağrı kesici. Uzun etki süresi. Tok karnına alınmalıdır.",
    },
    "diclofenac": {
        "name_tr": "Diklofenak",
        "class": "nsaid",
        "category": "analjezik_antiinflamatuar",
        "standard_dose_mg": 50,
        "max_daily_dose_mg": 150,
        "frequency": "8-12 saatte bir",
        "route": "oral/IM",
        "renal_adjustments": {30: "contraindicated"},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.5,
        "min_age": 14,
        "contraindications": ["nsaid_alerjisi", "gi_kanama", "kardiyovaskuler_hastalik"],
        "notes_tr": "NSAID grubu. Kardiyovasküler risk taşıyan hastalarda dikkatle kullanılmalıdır.",
    },
    "aspirin": {
        "name_tr": "Aspirin (Asetilsalisilik Asit)",
        "class": "nsaid_salisilat",
        "category": "analjezik_antiinflamatuar",
        "standard_dose_mg": 100,
        "max_daily_dose_mg": 4000,
        "frequency": "günde 1 kez (düşük doz) / 4-6 saatte bir (analjezik)",
        "route": "oral",
        "renal_adjustments": {30: "contraindicated"},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.75,
        "min_age": 16,
        "contraindications": ["aspirin_alerjisi", "nsaid_alerjisi", "gi_kanama", "hemofili", "reye_sendromu_riski"],
        "notes_tr": "Düşük dozda antiagregan, yüksek dozda analjezik/antiinflamatuar. 16 yaş altında Reye sendromu riski.",
    },
    "paracetamol": {
        "name_tr": "Parasetamol (Asetaminofen)",
        "class": "analjezik_antipiretik",
        "category": "analjezik_antiinflamatuar",
        "standard_dose_mg": 500,
        "max_daily_dose_mg": 4000,
        "frequency": "4-6 saatte bir",
        "route": "oral/IV",
        "renal_adjustments": {10: 0.5},
        "hepatic_adjustments": {"mild": 0.75, "moderate": 0.5, "severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 15,
        "geriatric_factor": 0.75,
        "min_age": 0,
        "contraindications": ["ciddi_karaciger_yetmezligi"],
        "notes_tr": "En yaygın ağrı kesici ve ateş düşürücü. Karaciğer hastalığında dikkatli kullanılmalıdır. Günlük 4g aşılmamalıdır.",
    },
    "tramadol": {
        "name_tr": "Tramadol",
        "class": "opioid_zayif",
        "category": "analjezik_opioid",
        "standard_dose_mg": 50,
        "max_daily_dose_mg": 400,
        "frequency": "6-8 saatte bir",
        "route": "oral/IV",
        "renal_adjustments": {30: 0.5, 15: 0.25},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.5,
        "min_age": 18,
        "contraindications": ["opioid_alerjisi", "epilepsi", "mao_inhibitoru_kullanimi"],
        "notes_tr": "Zayıf opioid analjezik. Nöbet eşiğini düşürebilir. Bağımlılık riski mevcuttur.",
    },
    "morphine": {
        "name_tr": "Morfin",
        "class": "opioid_guclu",
        "category": "analjezik_opioid",
        "standard_dose_mg": 10,
        "max_daily_dose_mg": 200,
        "frequency": "4-6 saatte bir",
        "route": "oral/IV/SC",
        "renal_adjustments": {30: 0.5, 15: 0.25},
        "hepatic_adjustments": {"moderate": 0.5, "severe": 0.25},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0.1,
        "geriatric_factor": 0.5,
        "min_age": 0,
        "contraindications": ["opioid_alerjisi", "solunum_depresyonu", "paralitik_ileus"],
        "notes_tr": "Güçlü opioid analjezik. Solunum depresyonu riski. Kontrollü madde.",
    },
    "codeine": {
        "name_tr": "Kodein",
        "class": "opioid_zayif",
        "category": "analjezik_opioid",
        "standard_dose_mg": 30,
        "max_daily_dose_mg": 240,
        "frequency": "4-6 saatte bir",
        "route": "oral",
        "renal_adjustments": {30: 0.5, 15: "contraindicated"},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.5,
        "min_age": 12,
        "contraindications": ["opioid_alerjisi", "solunum_depresyonu"],
        "notes_tr": "Zayıf opioid. 12 yaş altında kontrendikedir. Ultra-hızlı metabolize edenlerde risk.",
    },
    "metoprolol": {
        "name_tr": "Metoprolol",
        "class": "beta_bloker",
        "category": "antihipertansif",
        "standard_dose_mg": 50,
        "max_daily_dose_mg": 400,
        "frequency": "12 saatte bir",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {"moderate": 0.5, "severe": 0.25},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.5,
        "min_age": 18,
        "contraindications": ["bradikardi", "kalp_blogu", "dekompanse_kalp_yetmezligi", "astim"],
        "notes_tr": "Beta-1 selektif bloker. Kalp hızını yavaşlatır. Yemekle birlikte alınmalıdır.",
    },
    "amlodipine": {
        "name_tr": "Amlodipin",
        "class": "kalsiyum_kanal_blokeri",
        "category": "antihipertansif",
        "standard_dose_mg": 5,
        "max_daily_dose_mg": 10,
        "frequency": "günde 1 kez",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {"moderate": 0.5, "severe": 0.5},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0.1,
        "geriatric_factor": 0.5,
        "min_age": 6,
        "contraindications": ["ciddi_aort_stenozu", "kardiyojenik_sok"],
        "notes_tr": "Kalsiyum kanal blokeri. Uzun etkili. Ayak ödemi yapabilir.",
    },
    "enalapril": {
        "name_tr": "Enalapril",
        "class": "ace_inhibitoru",
        "category": "antihipertansif",
        "standard_dose_mg": 10,
        "max_daily_dose_mg": 40,
        "frequency": "günde 1-2 kez",
        "route": "oral",
        "renal_adjustments": {30: 0.5, 15: 0.25},
        "hepatic_adjustments": {},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0.08,
        "geriatric_factor": 0.5,
        "min_age": 1,
        "contraindications": ["ace_inhibitoru_alerjisi", "bilateral_renal_arter_stenozu", "gebelik", "anjioodem_oykusu"],
        "notes_tr": "ACE inhibitörü. Kuru öksürük yapabilir. Gebelikte kontrendikedir. Potasyum izlenmelidir.",
    },
    "losartan": {
        "name_tr": "Losartan",
        "class": "arb",
        "category": "antihipertansif",
        "standard_dose_mg": 50,
        "max_daily_dose_mg": 100,
        "frequency": "günde 1 kez",
        "route": "oral",
        "renal_adjustments": {30: 0.5},
        "hepatic_adjustments": {"moderate": 0.5, "severe": 0.25},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0.7,
        "geriatric_factor": 0.75,
        "min_age": 6,
        "contraindications": ["gebelik", "bilateral_renal_arter_stenozu"],
        "notes_tr": "Anjiyotensin reseptör blokeri (ARB). ACE inhibitörlerine alternatif. Gebelikte kontrendikedir.",
    },
    "furosemide": {
        "name_tr": "Furosemid",
        "class": "loop_diuretik",
        "category": "diuretik",
        "standard_dose_mg": 40,
        "max_daily_dose_mg": 600,
        "frequency": "günde 1-2 kez",
        "route": "oral/IV",
        "renal_adjustments": {},
        "hepatic_adjustments": {"severe": 0.5},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 1,
        "geriatric_factor": 0.5,
        "min_age": 0,
        "contraindications": ["anuri", "hepatik_koma", "ciddi_hipokalemi"],
        "notes_tr": "Kıvrım diüretik. Güçlü diüretik etki. Elektrolit takibi gereklidir.",
    },
    "hydrochlorothiazide": {
        "name_tr": "Hidroklorotiyazid",
        "class": "tiyazid_diuretik",
        "category": "diuretik",
        "standard_dose_mg": 25,
        "max_daily_dose_mg": 50,
        "frequency": "günde 1 kez",
        "route": "oral",
        "renal_adjustments": {30: "contraindicated"},
        "hepatic_adjustments": {"severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 1,
        "geriatric_factor": 0.5,
        "min_age": 0,
        "contraindications": ["anuri", "ciddi_boebrek_yetmezligi", "gut"],
        "notes_tr": "Tiyazid diüretik. Hafif hipertansiyonda ilk basamak. GFR < 30'da etkisizdir.",
    },
    "atorvastatin": {
        "name_tr": "Atorvastatin",
        "class": "statin",
        "category": "lipid_dusurucu",
        "standard_dose_mg": 20,
        "max_daily_dose_mg": 80,
        "frequency": "günde 1 kez (akşam)",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.75,
        "min_age": 10,
        "contraindications": ["aktif_karaciger_hastaligi", "gebelik", "emzirme"],
        "notes_tr": "HMG-CoA redüktaz inhibitörü. Akşam alınması önerilir. Kas ağrısı olursa bildirilmelidir.",
    },
    "rosuvastatin": {
        "name_tr": "Rosuvastatin",
        "class": "statin",
        "category": "lipid_dusurucu",
        "standard_dose_mg": 10,
        "max_daily_dose_mg": 40,
        "frequency": "günde 1 kez",
        "route": "oral",
        "renal_adjustments": {30: 0.5, 15: 0.25},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.75,
        "min_age": 10,
        "contraindications": ["aktif_karaciger_hastaligi", "gebelik"],
        "notes_tr": "En güçlü statin. Günün herhangi bir saatinde alınabilir.",
    },
    "omeprazole": {
        "name_tr": "Omeprazol",
        "class": "ppi",
        "category": "antiulser",
        "standard_dose_mg": 20,
        "max_daily_dose_mg": 40,
        "frequency": "günde 1-2 kez",
        "route": "oral/IV",
        "renal_adjustments": {},
        "hepatic_adjustments": {"moderate": 0.5, "severe": 0.5},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 1,
        "geriatric_factor": 1.0,
        "min_age": 1,
        "contraindications": [],
        "notes_tr": "Proton pompa inhibitörü. Yemeklerden 30 dakika önce alınmalıdır.",
    },
    "pantoprazole": {
        "name_tr": "Pantoprazol",
        "class": "ppi",
        "category": "antiulser",
        "standard_dose_mg": 40,
        "max_daily_dose_mg": 80,
        "frequency": "günde 1-2 kez",
        "route": "oral/IV",
        "renal_adjustments": {},
        "hepatic_adjustments": {"severe": 0.5},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 1.0,
        "min_age": 18,
        "contraindications": [],
        "notes_tr": "Proton pompa inhibitörü. Klopidogrel ile etkileşimi omeprazolden daha azdır.",
    },
    "lansoprazole": {
        "name_tr": "Lansoprazol",
        "class": "ppi",
        "category": "antiulser",
        "standard_dose_mg": 30,
        "max_daily_dose_mg": 60,
        "frequency": "günde 1-2 kez",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {"moderate": 0.5, "severe": 0.5},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0.5,
        "geriatric_factor": 1.0,
        "min_age": 1,
        "contraindications": [],
        "notes_tr": "PPI. Yemeklerden önce alınmalıdır.",
    },
    "warfarin": {
        "name_tr": "Varfarin",
        "class": "antikoagulan_vka",
        "category": "antikoagulan",
        "standard_dose_mg": 5,
        "max_daily_dose_mg": 15,
        "frequency": "günde 1 kez",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {"mild": 0.5, "moderate": 0.25, "severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0.1,
        "geriatric_factor": 0.5,
        "min_age": 0,
        "contraindications": ["aktif_kanama", "gebelik", "ciddi_karaciger_yetmezligi"],
        "notes_tr": "K vitamini antagonisti. INR takibi gereklidir. Pek çok ilaç ve gıda etkileşimi vardır.",
    },
    "enoxaparin": {
        "name_tr": "Enoksaparin",
        "class": "dmah",
        "category": "antikoagulan",
        "standard_dose_mg": 40,
        "max_daily_dose_mg": 200,
        "frequency": "12-24 saatte bir",
        "route": "SC",
        "renal_adjustments": {30: 0.5, 15: "contraindicated"},
        "hepatic_adjustments": {},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 1,
        "geriatric_factor": 0.75,
        "min_age": 0,
        "contraindications": ["heparin_alerjisi", "hit_oykusu", "aktif_kanama"],
        "notes_tr": "Düşük molekül ağırlıklı heparin. Subkutan uygulanır. Anti-Xa takibi yapılabilir.",
    },
    "clopidogrel": {
        "name_tr": "Klopidogrel",
        "class": "antiagregan",
        "category": "antikoagulan",
        "standard_dose_mg": 75,
        "max_daily_dose_mg": 75,
        "frequency": "günde 1 kez",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {"moderate": 0.75, "severe": "contraindicated"},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 1.0,
        "min_age": 18,
        "contraindications": ["aktif_kanama", "ciddi_karaciger_yetmezligi"],
        "notes_tr": "P2Y12 inhibitörü. Antitrombosit ilaç. Omeprazol ile etkileşimi vardır.",
    },
    "prednisolone": {
        "name_tr": "Prednizolon",
        "class": "kortikosteroid",
        "category": "antiinflamatuar_steroid",
        "standard_dose_mg": 20,
        "max_daily_dose_mg": 80,
        "frequency": "günde 1 kez (sabah)",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 1,
        "geriatric_factor": 0.75,
        "min_age": 0,
        "contraindications": ["sistemik_fungal_enfeksiyon", "canli_asi_uygulamasi"],
        "notes_tr": "Kortikosteroid. Uzun süreli kullanımda yan etkiler belirginleşir. Kademeli azaltılmalıdır.",
    },
    "methylprednisolone": {
        "name_tr": "Metilprednizolon",
        "class": "kortikosteroid",
        "category": "antiinflamatuar_steroid",
        "standard_dose_mg": 16,
        "max_daily_dose_mg": 1000,
        "frequency": "günde 1-4 kez",
        "route": "oral/IV",
        "renal_adjustments": {},
        "hepatic_adjustments": {},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 1,
        "geriatric_factor": 0.75,
        "min_age": 0,
        "contraindications": ["sistemik_fungal_enfeksiyon"],
        "notes_tr": "Pulse terapi dahil çeşitli dozlarda kullanılır. IV formda yüksek doz verilebilir.",
    },
    "salbutamol": {
        "name_tr": "Salbutamol (Albuterol)",
        "class": "beta2_agonist",
        "category": "bronkodilatator",
        "standard_dose_mg": 0.1,
        "max_daily_dose_mg": 3.2,
        "frequency": "4-6 saatte bir (inh.), gerektiğinde",
        "route": "inhalasyon/oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 1.0,
        "min_age": 0,
        "contraindications": [],
        "notes_tr": "Kısa etkili beta-2 agonist. Astım kriz tedavisinde ilk basamak.",
    },
    "montelukast": {
        "name_tr": "Montelukast",
        "class": "lokotrien_antagonisti",
        "category": "bronkodilatator",
        "standard_dose_mg": 10,
        "max_daily_dose_mg": 10,
        "frequency": "günde 1 kez (akşam)",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {"severe": 0.5},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 1.0,
        "min_age": 2,
        "contraindications": [],
        "notes_tr": "Lökotrien reseptör antagonisti. Astım ve alerjik rinit tedavisinde yardımcı.",
    },
    "sertraline": {
        "name_tr": "Sertralin",
        "class": "ssri",
        "category": "antidepresan",
        "standard_dose_mg": 50,
        "max_daily_dose_mg": 200,
        "frequency": "günde 1 kez",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.5,
        "min_age": 6,
        "contraindications": ["mao_inhibitoru_kullanimi", "pimozid_kullanimi"],
        "notes_tr": "SSRI grubu antidepresan. Etki başlangıcı 2-4 hafta. Aniden kesilmemelidir.",
    },
    "escitalopram": {
        "name_tr": "Essitalopram",
        "class": "ssri",
        "category": "antidepresan",
        "standard_dose_mg": 10,
        "max_daily_dose_mg": 20,
        "frequency": "günde 1 kez",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.5,
        "min_age": 12,
        "contraindications": ["mao_inhibitoru_kullanimi", "qt_uzamasi"],
        "notes_tr": "SSRI grubu. QT uzaması riski nedeniyle yaşlılarda dikkatli kullanılmalıdır.",
    },
    "fluoxetine": {
        "name_tr": "Fluoksetin",
        "class": "ssri",
        "category": "antidepresan",
        "standard_dose_mg": 20,
        "max_daily_dose_mg": 80,
        "frequency": "günde 1 kez",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.5,
        "min_age": 8,
        "contraindications": ["mao_inhibitoru_kullanimi"],
        "notes_tr": "SSRI. Uzun yarı ömürlü. Sabah alınması önerilir.",
    },
    "gabapentin": {
        "name_tr": "Gabapentin",
        "class": "antiepileptik",
        "category": "norolojik",
        "standard_dose_mg": 300,
        "max_daily_dose_mg": 3600,
        "frequency": "8 saatte bir",
        "route": "oral",
        "renal_adjustments": {60: 0.75, 30: 0.5, 15: 0.25},
        "hepatic_adjustments": {},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 10,
        "geriatric_factor": 0.5,
        "min_age": 3,
        "contraindications": [],
        "notes_tr": "Nöropatik ağrı ve epilepsi tedavisinde kullanılır. Renal eliminasyon.",
    },
    "pregabalin": {
        "name_tr": "Pregabalin",
        "class": "antiepileptik",
        "category": "norolojik",
        "standard_dose_mg": 75,
        "max_daily_dose_mg": 600,
        "frequency": "12 saatte bir",
        "route": "oral",
        "renal_adjustments": {60: 0.75, 30: 0.5, 15: 0.25},
        "hepatic_adjustments": {},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.5,
        "min_age": 18,
        "contraindications": [],
        "notes_tr": "Nöropatik ağrı, epilepsi ve yaygın anksiyete bozukluğunda kullanılır.",
    },
    "levothyroxine": {
        "name_tr": "Levotiroksin",
        "class": "tiroid_hormonu",
        "category": "endokrin",
        "standard_dose_mg": 0.1,
        "max_daily_dose_mg": 0.3,
        "frequency": "günde 1 kez (sabah aç karnına)",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.5,
        "min_age": 0,
        "contraindications": ["tedavi_edilmemis_adrenal_yetmezlik", "akut_mi"],
        "notes_tr": "Tiroid hormonu replasman tedavisi. Sabah aç karnına, kahvaltıdan 30-60 dk önce alınmalıdır.",
    },
    "insulin_glargine": {
        "name_tr": "İnsülin Glarjin",
        "class": "insulin_uzun",
        "category": "antidiyabetik",
        "standard_dose_mg": 10,
        "max_daily_dose_mg": 100,
        "frequency": "günde 1 kez",
        "route": "SC",
        "renal_adjustments": {30: 0.75, 15: 0.5},
        "hepatic_adjustments": {"moderate": 0.75, "severe": 0.5},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.75,
        "min_age": 2,
        "contraindications": ["hipoglisemi"],
        "notes_tr": "Uzun etkili bazal insülin. Her gün aynı saatte uygulanmalıdır. Ünite olarak dozlanır.",
    },
    "methotrexate": {
        "name_tr": "Metotreksat",
        "class": "antimetabolit",
        "category": "immunsupresan",
        "standard_dose_mg": 15,
        "max_daily_dose_mg": 25,
        "frequency": "haftada 1 kez",
        "route": "oral/SC",
        "renal_adjustments": {30: 0.5, 15: "contraindicated"},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 0.5,
        "min_age": 3,
        "contraindications": ["gebelik", "emzirme", "ciddi_boebrek_yetmezligi", "ciddi_karaciger_yetmezligi", "kemik_iligi_baskılanmasi"],
        "notes_tr": "HAFTADA 1 KEZ kullanılır! Günlük doz hatası ölümcül olabilir. Folik asit desteği gereklidir.",
    },
    "sulfasalazine": {
        "name_tr": "Sülfasalazin",
        "class": "sulfonamid_turev",
        "category": "antiinflamatuar_spesifik",
        "standard_dose_mg": 1000,
        "max_daily_dose_mg": 4000,
        "frequency": "12 saatte bir",
        "route": "oral",
        "renal_adjustments": {30: 0.5, 15: "contraindicated"},
        "hepatic_adjustments": {"severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 30,
        "geriatric_factor": 0.75,
        "min_age": 6,
        "contraindications": ["sulfonamid_alerjisi", "porfiri", "intestinal_obstruksiyon"],
        "notes_tr": "Romatoid artrit ve inflamatuar barsak hastalığında kullanılır. Sulfonamid türevi.",
    },
    "trimethoprim_sulfamethoxazole": {
        "name_tr": "Trimetoprim-Sülfametoksazol (Bactrim)",
        "class": "sulfonamid",
        "category": "antibiyotik",
        "standard_dose_mg": 960,
        "max_daily_dose_mg": 1920,
        "frequency": "12 saatte bir",
        "route": "oral/IV",
        "renal_adjustments": {30: 0.5, 15: "contraindicated"},
        "hepatic_adjustments": {"severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 6,
        "geriatric_factor": 0.75,
        "min_age": 0,
        "contraindications": ["sulfonamid_alerjisi", "megaloblastik_anemi", "ciddi_boebrek_yetmezligi"],
        "notes_tr": "Sulfonamid grubu antibiyotik. İdrar yolu enfeksiyonlarında sık kullanılır.",
    },
    "doxycycline": {
        "name_tr": "Doksisiklin",
        "class": "tetrasiklin",
        "category": "antibiyotik",
        "standard_dose_mg": 100,
        "max_daily_dose_mg": 200,
        "frequency": "12 saatte bir",
        "route": "oral",
        "renal_adjustments": {},
        "hepatic_adjustments": {"severe": 0.5},
        "pediatric": False,
        "pediatric_dose_mg_per_kg": 0,
        "geriatric_factor": 1.0,
        "min_age": 8,
        "contraindications": ["tetrasiklin_alerjisi", "gebelik"],
        "notes_tr": "Tetrasiklin grubu antibiyotik. 8 yaş altında kontrendike (diş renk değişikliği). Güneşe duyarlılık yapabilir.",
    },
    "clindamycin": {
        "name_tr": "Klindamisin",
        "class": "linkozamid",
        "category": "antibiyotik",
        "standard_dose_mg": 300,
        "max_daily_dose_mg": 1800,
        "frequency": "6-8 saatte bir",
        "route": "oral/IV",
        "renal_adjustments": {},
        "hepatic_adjustments": {"moderate": 0.5, "severe": 0.25},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 10,
        "geriatric_factor": 0.85,
        "min_age": 0,
        "contraindications": ["linkozamid_alerjisi"],
        "notes_tr": "Anaerop enfeksiyonlarda etkili. C. difficile koliti riski mevcuttur.",
    },
    "fluconazole": {
        "name_tr": "Flukonazol",
        "class": "azol_antifungal",
        "category": "antifungal",
        "standard_dose_mg": 150,
        "max_daily_dose_mg": 400,
        "frequency": "günde 1 kez",
        "route": "oral/IV",
        "renal_adjustments": {50: 0.5},
        "hepatic_adjustments": {"moderate": 0.5, "severe": "contraindicated"},
        "pediatric": True,
        "pediatric_dose_mg_per_kg": 6,
        "geriatric_factor": 0.85,
        "min_age": 0,
        "contraindications": ["azol_alerjisi", "ciddi_karaciger_yetmezligi"],
        "notes_tr": "Azol grubu antifungal. Çok sayıda ilaç etkileşimi vardır (CYP2C9, CYP3A4).",
    },
}


# ============================================================================
# ALLERGY CROSS-REACTIVITY GROUPS
# ============================================================================

CROSS_REACTIVITY_GROUPS = {
    "penisilin": {
        "members": [
            "amoxicillin", "ampicillin", "amoxicillin_clavulanate",
            "penicillin", "penisilin", "amoksisilin", "ampisilin",
            "piperacillin", "piperasilin", "oxacillin", "oksasilin",
            "mezlocillin", "ticarcillin", "nafcillin",
        ],
        "cross_reactive": {
            "sefalosporin_1": {"risk": 0.10, "description_tr": "Birinci kuşak sefalosporinlerle %5-10 çapraz reaksiyon riski"},
            "sefalosporin_3": {"risk": 0.03, "description_tr": "Üçüncü kuşak sefalosporinlerle %1-3 çapraz reaksiyon riski"},
            "karbapenem": {"risk": 0.01, "description_tr": "Karbapenemlerle %1 çapraz reaksiyon riski"},
        },
    },
    "sefalosporin": {
        "members": [
            "cephalexin", "ceftriaxone", "cefuroxime", "cefazolin",
            "sefaleksin", "seftriakson", "sefuroksim", "sefazolin",
            "ceftazidime", "seftazidim", "cefepime", "sefepim",
            "cefixime", "sefiksim",
        ],
        "cross_reactive": {
            "penisilin": {"risk": 0.05, "description_tr": "Penisilinlerle %2-5 çapraz reaksiyon riski"},
        },
    },
    "sulfonamid": {
        "members": [
            "trimethoprim_sulfamethoxazole", "sulfasalazine",
            "sulfametoksazol", "sülfasalazin", "sulfadiazine", "sulfadiazin",
            "sulfisoxazole", "sülfisoksazol",
        ],
        "cross_reactive": {
            "tiyazid_diuretik": {"risk": 0.05, "description_tr": "Tiyazid diüretiklerle düşük çapraz reaksiyon riski"},
            "sulfonilure": {"risk": 0.05, "description_tr": "Sülfonilürelerle düşük çapraz reaksiyon riski"},
        },
    },
    "nsaid": {
        "members": [
            "ibuprofen", "naproxen", "diclofenac", "indomethacin",
            "ibuprofen", "naproksen", "diklofenak", "indometasin",
            "piroxicam", "piroksikam", "meloxicam", "meloksikam",
            "ketoprofen", "ketorolac",
        ],
        "cross_reactive": {
            "nsaid_salisilat": {"risk": 0.50, "description_tr": "Aspirin ile %50 çapraz reaksiyon riski (COX-1 inhibisyon mekanizması)"},
            "nsaid": {"risk": 0.25, "description_tr": "Diğer NSAID'lerle %25 çapraz reaksiyon riski"},
        },
    },
    "nsaid_salisilat": {
        "members": [
            "aspirin", "asetilsalisilik_asit", "acetylsalicylic_acid",
        ],
        "cross_reactive": {
            "nsaid": {"risk": 0.50, "description_tr": "NSAID'lerle %50 çapraz reaksiyon riski"},
        },
    },
    "opioid": {
        "members": [
            "morphine", "codeine", "tramadol", "fentanyl",
            "morfin", "kodein", "fentanil", "meperidine", "petidin",
            "oxycodone", "oksikodon", "hydromorphone", "hidromorfon",
        ],
        "cross_reactive": {
            "opioid_zayif": {"risk": 0.15, "description_tr": "Diğer opioidlerle %10-15 çapraz reaksiyon riski"},
            "opioid_guclu": {"risk": 0.15, "description_tr": "Diğer opioidlerle %10-15 çapraz reaksiyon riski"},
        },
    },
    "makrolid": {
        "members": [
            "azithromycin", "erythromycin", "clarithromycin",
            "azitromisin", "eritromisin", "klaritromisin",
        ],
        "cross_reactive": {
            "makrolid": {"risk": 0.50, "description_tr": "Diğer makrolid antibiyotiklerle yüksek çapraz reaksiyon riski"},
        },
    },
    "florokinolon": {
        "members": [
            "ciprofloxacin", "levofloxacin", "moxifloxacin",
            "siprofloksasin", "levofloksasin", "moksifloksasin",
        ],
        "cross_reactive": {
            "florokinolon": {"risk": 0.50, "description_tr": "Diğer florokinolonlarla yüksek çapraz reaksiyon riski"},
        },
    },
}


# ============================================================================
# CONTRAINDICATION RULES
# ============================================================================

CONTRAINDICATION_RULES = [
    {
        "drug": "metformin",
        "condition": "gfr_below_30",
        "severity": "critical",
        "message_tr": "Metformin GFR < 30 ml/dk olan hastalarda kontrendikedir (laktik asidoz riski).",
    },
    {
        "drug": "metformin",
        "condition": "liver_severe",
        "severity": "critical",
        "message_tr": "Metformin ciddi karaciğer yetmezliğinde kontrendikedir.",
    },
    {
        "drug": "ibuprofen",
        "condition": "gfr_below_30",
        "severity": "critical",
        "message_tr": "İbuprofen ciddi böbrek yetmezliğinde (GFR < 30) kontrendikedir.",
    },
    {
        "drug": "hydrochlorothiazide",
        "condition": "gfr_below_30",
        "severity": "critical",
        "message_tr": "Hidroklorotiyazid GFR < 30'da etkisiz ve kontrendikedir.",
    },
    {
        "drug": "ciprofloxacin",
        "condition": "age_below_18",
        "severity": "warning",
        "message_tr": "Siprofloksasin 18 yaş altında kullanılmamalıdır (kıkırdak gelişim riski).",
    },
    {
        "drug": "aspirin",
        "condition": "age_below_16",
        "severity": "critical",
        "message_tr": "Aspirin 16 yaş altında kontrendikedir (Reye sendromu riski).",
    },
    {
        "drug": "warfarin",
        "condition": "liver_severe",
        "severity": "critical",
        "message_tr": "Varfarin ciddi karaciğer yetmezliğinde kontrendikedir.",
    },
]

# Drug interaction pairs for multi-drug safety scoring
DRUG_INTERACTION_PAIRS = {
    ("warfarin", "ibuprofen"): {"severity": "critical", "message_tr": "Varfarin + NSAID: ciddi kanama riski"},
    ("warfarin", "naproxen"): {"severity": "critical", "message_tr": "Varfarin + NSAID: ciddi kanama riski"},
    ("warfarin", "aspirin"): {"severity": "critical", "message_tr": "Varfarin + Aspirin: ciddi kanama riski"},
    ("warfarin", "diclofenac"): {"severity": "critical", "message_tr": "Varfarin + NSAID: ciddi kanama riski"},
    ("metformin", "furosemide"): {"severity": "warning", "message_tr": "Metformin + Furosemid: dehidratasyon ile laktik asidoz riski"},
    ("enalapril", "losartan"): {"severity": "warning", "message_tr": "ACE inh. + ARB: çift RAAS blokajı - hiperkalemi ve hipotansiyon riski"},
    ("sertraline", "tramadol"): {"severity": "critical", "message_tr": "SSRI + Tramadol: serotonin sendromu riski"},
    ("escitalopram", "tramadol"): {"severity": "critical", "message_tr": "SSRI + Tramadol: serotonin sendromu riski"},
    ("fluoxetine", "tramadol"): {"severity": "critical", "message_tr": "SSRI + Tramadol: serotonin sendromu riski"},
    ("metoprolol", "amlodipine"): {"severity": "warning", "message_tr": "Beta-bloker + KKB: bradikardi ve hipotansiyon riski"},
    ("atorvastatin", "azithromycin"): {"severity": "warning", "message_tr": "Statin + Makrolid: rabdomiyoliz riski artabilir"},
    ("clopidogrel", "omeprazole"): {"severity": "warning", "message_tr": "Klopidogrel + Omeprazol: antitrombosit etki azalabilir"},
}


# ============================================================================
# CORE FUNCTIONS
# ============================================================================


def _normalize_drug_name(drug: str) -> str:
    """Normalize drug name to match database keys."""
    return drug.strip().lower().replace(" ", "_").replace("-", "_")


def _get_patient_age_category(age: int) -> str:
    """Categorize patient age."""
    if age < 1:
        return "yenidogan"
    elif age < 12:
        return "cocuk"
    elif age < 18:
        return "adolesan"
    elif age < 65:
        return "yetiskin"
    else:
        return "yasli"


def _estimate_gfr(patient: dict) -> Optional[float]:
    """
    Estimate GFR using Cockcroft-Gault or use provided value.
    Returns GFR in mL/min.
    """
    if "gfr" in patient and patient["gfr"] is not None:
        return float(patient["gfr"])

    # Cockcroft-Gault formula if creatinine available
    creatinine = patient.get("creatinine")
    age = patient.get("age")
    weight = patient.get("weight_kg")
    gender = patient.get("gender", "").lower()

    if creatinine and age and weight and creatinine > 0:
        gfr = ((140 - age) * weight) / (72 * creatinine)
        if gender in ("f", "female", "kadin", "kadın"):
            gfr *= 0.85
        return round(gfr, 1)

    return None


def calculate_safe_dose(drug: str, patient: dict) -> dict:
    """
    Calculate safe dose for a drug based on patient parameters.

    Args:
        drug: Drug name (English or Turkish)
        patient: dict with keys: age, weight_kg, height_cm, gender,
                 creatinine, gfr, liver_function (normal/mild/moderate/severe)

    Returns:
        dict with: recommended_dose, max_dose, unit, frequency,
                   adjustment_reason, warnings
    """
    normalized = _normalize_drug_name(drug)
    drug_info = DRUG_DATABASE.get(normalized)

    if not drug_info:
        # Try matching by Turkish name
        for key, info in DRUG_DATABASE.items():
            if _normalize_drug_name(info["name_tr"]) == normalized:
                drug_info = info
                normalized = key
                break

    if not drug_info:
        return {
            "drug": drug,
            "found": False,
            "recommended_dose": None,
            "max_dose": None,
            "unit": "mg",
            "frequency": None,
            "adjustment_reason": [],
            "warnings": [f"'{drug}' ilaç veritabanında bulunamadı. Manuel doz hesaplaması gereklidir."],
        }

    age = patient.get("age", 30)
    weight_kg = patient.get("weight_kg", 70)
    liver_function = patient.get("liver_function", "normal")
    age_category = _get_patient_age_category(age)
    gfr = _estimate_gfr(patient)

    warnings = []
    adjustment_reasons = []

    # Start with standard dose
    recommended_dose = drug_info["standard_dose_mg"]
    max_dose = drug_info["max_daily_dose_mg"]
    dose_factor = 1.0

    # --- Pediatric dosing ---
    if age_category in ("yenidogan", "cocuk", "adolesan") and age < 18:
        if not drug_info["pediatric"] and drug_info["min_age"] > age:
            warnings.append(
                f"{drug_info['name_tr']} {drug_info['min_age']} yaş altında kontrendikedir."
            )
            return {
                "drug": drug_info["name_tr"],
                "found": True,
                "recommended_dose": 0,
                "max_dose": 0,
                "unit": "mg",
                "frequency": drug_info["frequency"],
                "adjustment_reason": [f"{drug_info['min_age']} yaş altı kontrendikasyon"],
                "warnings": warnings,
            }

        if drug_info.get("pediatric_dose_mg_per_kg", 0) > 0 and weight_kg:
            recommended_dose = round(drug_info["pediatric_dose_mg_per_kg"] * weight_kg, 1)
            max_dose = round(recommended_dose * 3, 1)  # approx
            if max_dose > drug_info["max_daily_dose_mg"]:
                max_dose = drug_info["max_daily_dose_mg"]
            adjustment_reasons.append(f"Pediatrik doz: {drug_info['pediatric_dose_mg_per_kg']} mg/kg")

    # --- Geriatric adjustment ---
    if age_category == "yasli":
        geriatric_factor = drug_info.get("geriatric_factor", 1.0)
        if geriatric_factor < 1.0:
            dose_factor *= geriatric_factor
            adjustment_reasons.append(
                f"Yaşlı hasta doz azaltması (x{geriatric_factor})"
            )

    # --- Weight-based adjustment for extremes ---
    if weight_kg and age >= 18:
        if weight_kg < 50:
            weight_factor = weight_kg / 70
            dose_factor *= weight_factor
            adjustment_reasons.append(f"Düşük vücut ağırlığı ({weight_kg} kg) için doz azaltması")
        elif weight_kg > 120:
            warnings.append("Obez hasta: doz ayarlaması klinik değerlendirme gerektirir.")

    # --- Renal adjustment ---
    if gfr is not None and drug_info["renal_adjustments"]:
        for gfr_threshold in sorted(drug_info["renal_adjustments"].keys()):
            if gfr < gfr_threshold:
                adj = drug_info["renal_adjustments"][gfr_threshold]
                if adj == "contraindicated":
                    warnings.append(
                        f"{drug_info['name_tr']} GFR < {gfr_threshold} ml/dk olan hastalarda kontrendikedir."
                    )
                    return {
                        "drug": drug_info["name_tr"],
                        "found": True,
                        "recommended_dose": 0,
                        "max_dose": 0,
                        "unit": "mg",
                        "frequency": drug_info["frequency"],
                        "adjustment_reason": [f"GFR {gfr} ml/dk - kontrendike"],
                        "warnings": warnings,
                    }
                else:
                    dose_factor *= adj
                    adjustment_reasons.append(
                        f"Renal doz ayarı: GFR {gfr} ml/dk (x{adj})"
                    )
                break

    # --- Hepatic adjustment ---
    if liver_function != "normal" and drug_info["hepatic_adjustments"]:
        adj = drug_info["hepatic_adjustments"].get(liver_function)
        if adj == "contraindicated":
            warnings.append(
                f"{drug_info['name_tr']} {liver_function} karaciğer yetmezliğinde kontrendikedir."
            )
            return {
                "drug": drug_info["name_tr"],
                "found": True,
                "recommended_dose": 0,
                "max_dose": 0,
                "unit": "mg",
                "frequency": drug_info["frequency"],
                "adjustment_reason": [f"Karaciğer fonksiyonu: {liver_function} - kontrendike"],
                "warnings": warnings,
            }
        elif adj is not None:
            dose_factor *= adj
            adjustment_reasons.append(
                f"Hepatik doz ayarı: {liver_function} (x{adj})"
            )

    # Apply dose factor
    recommended_dose = round(recommended_dose * dose_factor, 1)
    adjusted_max_dose = round(max_dose * dose_factor, 1)

    # Add notes as warnings
    if drug_info.get("notes_tr"):
        warnings.append(drug_info["notes_tr"])

    return {
        "drug": drug_info["name_tr"],
        "found": True,
        "recommended_dose": recommended_dose,
        "max_dose": adjusted_max_dose,
        "unit": "mg",
        "frequency": drug_info["frequency"],
        "adjustment_reason": adjustment_reasons,
        "warnings": warnings,
    }


def check_allergy_cross_reactivity(known_allergies: list, new_drug: str) -> dict:
    """
    Check if a new drug has cross-reactivity risk with known allergies.

    Args:
        known_allergies: list of drug names the patient is allergic to
        new_drug: name of the drug to check

    Returns:
        dict with: cross_reactivity_risk (0-1), related_allergens, recommendation
    """
    normalized_drug = _normalize_drug_name(new_drug)
    drug_info = DRUG_DATABASE.get(normalized_drug)

    # Also try Turkish name matching
    if not drug_info:
        for key, info in DRUG_DATABASE.items():
            if _normalize_drug_name(info["name_tr"]) == normalized_drug:
                drug_info = info
                normalized_drug = key
                break

    new_drug_class = drug_info["class"] if drug_info else None

    max_risk = 0.0
    related_allergens = []
    recommendations = []

    normalized_allergies = [_normalize_drug_name(a) for a in known_allergies]

    # Direct match
    if normalized_drug in normalized_allergies:
        return {
            "cross_reactivity_risk": 1.0,
            "related_allergens": [new_drug],
            "recommendation": f"KONTRENDIKE: Hasta {new_drug} alerjisi kayıtlıdır. Bu ilaç kullanılmamalıdır.",
        }

    # Check each allergy group
    for group_name, group_data in CROSS_REACTIVITY_GROUPS.items():
        group_members_normalized = [_normalize_drug_name(m) for m in group_data["members"]]

        # Check if any known allergy is in this group
        allergy_in_group = False
        matching_allergen = None
        for allergy in normalized_allergies:
            if allergy in group_members_normalized or allergy == group_name:
                allergy_in_group = True
                matching_allergen = allergy
                break

        if not allergy_in_group:
            continue

        # Check if new drug is in the same group (same class)
        if normalized_drug in group_members_normalized:
            max_risk = max(max_risk, 0.8)
            related_allergens.append(matching_allergen)
            recommendations.append(
                f"Aynı ilaç grubu ({group_name}): yüksek çapraz reaksiyon riski."
            )
            continue

        # Check cross-reactive classes
        if new_drug_class and group_data.get("cross_reactive"):
            for cross_class, cross_info in group_data["cross_reactive"].items():
                if new_drug_class == cross_class:
                    risk = cross_info["risk"]
                    max_risk = max(max_risk, risk)
                    related_allergens.append(matching_allergen)
                    recommendations.append(cross_info["description_tr"])

    if max_risk == 0.0:
        recommendation = f"{new_drug} için bilinen alerjilerle çapraz reaksiyon riski saptanmadı."
    elif max_risk < 0.1:
        recommendation = f"Düşük çapraz reaksiyon riski ({max_risk*100:.0f}%). Dikkatli kullanılabilir. " + " ".join(recommendations)
    elif max_risk < 0.3:
        recommendation = f"Orta düzeyde çapraz reaksiyon riski ({max_risk*100:.0f}%). Alternatif ilaç tercih edilmelidir. " + " ".join(recommendations)
    else:
        recommendation = f"YÜKSEK çapraz reaksiyon riski ({max_risk*100:.0f}%). Bu ilaç kullanılmamalıdır. " + " ".join(recommendations)

    return {
        "cross_reactivity_risk": round(max_risk, 2),
        "related_allergens": list(set(related_allergens)),
        "recommendation": recommendation,
    }


def score_prescription_safety(medications: list, patient: dict) -> dict:
    """
    Score overall safety of a prescription.

    Args:
        medications: list of dicts, each with 'name' and optionally 'dose'
        patient: dict with age, weight_kg, gfr, liver_function, known_allergies

    Returns:
        dict with: safety_score (0-100), risk_factors, suggestions
    """
    score = 100
    risk_factors = []
    suggestions = []

    age = patient.get("age", 30)
    gfr = _estimate_gfr(patient)
    liver_function = patient.get("liver_function", "normal")
    known_allergies = patient.get("known_allergies", [])
    age_category = _get_patient_age_category(age)

    med_names = [_normalize_drug_name(m.get("name", m) if isinstance(m, dict) else m) for m in medications]

    # --- Polypharmacy check ---
    med_count = len(med_names)
    if med_count >= 10:
        score -= 25
        risk_factors.append(f"Ciddi polifarmasi: {med_count} ilaç aynı anda reçete edilmiş")
        suggestions.append("İlaç sayısını azaltmak için ilaç uzlaşması (medication reconciliation) yapılmalıdır.")
    elif med_count >= 7:
        score -= 15
        risk_factors.append(f"Polifarmasi: {med_count} ilaç aynı anda reçete edilmiş")
        suggestions.append("İlaç listesi gözden geçirilmelidir.")
    elif med_count >= 5:
        score -= 5
        risk_factors.append(f"Çoklu ilaç kullanımı: {med_count} ilaç")

    # --- Elderly polypharmacy is extra risky ---
    if age_category == "yasli" and med_count >= 5:
        score -= 10
        risk_factors.append("Yaşlı hastada polifarmasi: advers etki riski yüksek")
        suggestions.append("Yaşlı hastada Beers kriterleri ile ilaç uygunluğu değerlendirilmelidir.")

    # --- Drug-drug interactions ---
    for i, med_a in enumerate(med_names):
        for med_b in med_names[i + 1:]:
            pair = (med_a, med_b)
            reverse_pair = (med_b, med_a)
            interaction = DRUG_INTERACTION_PAIRS.get(pair) or DRUG_INTERACTION_PAIRS.get(reverse_pair)
            if interaction:
                if interaction["severity"] == "critical":
                    score -= 20
                else:
                    score -= 10
                risk_factors.append(interaction["message_tr"])

    # --- Renal risk ---
    if gfr is not None:
        for med_name in med_names:
            drug_info = DRUG_DATABASE.get(med_name)
            if not drug_info:
                continue
            for gfr_threshold in sorted(drug_info.get("renal_adjustments", {}).keys()):
                if gfr < gfr_threshold:
                    adj = drug_info["renal_adjustments"][gfr_threshold]
                    if adj == "contraindicated":
                        score -= 25
                        risk_factors.append(
                            f"{drug_info['name_tr']}: GFR {gfr} ml/dk - kontrendike"
                        )
                        suggestions.append(f"{drug_info['name_tr']} kesilmelidir veya alternatif ilaç seçilmelidir.")
                    else:
                        score -= 5
                        risk_factors.append(
                            f"{drug_info['name_tr']}: GFR {gfr} ml/dk - doz ayarı gerekli"
                        )
                    break

    # --- Hepatic risk ---
    if liver_function in ("moderate", "severe"):
        for med_name in med_names:
            drug_info = DRUG_DATABASE.get(med_name)
            if not drug_info:
                continue
            adj = drug_info.get("hepatic_adjustments", {}).get(liver_function)
            if adj == "contraindicated":
                score -= 25
                risk_factors.append(
                    f"{drug_info['name_tr']}: {liver_function} karaciğer yetmezliğinde kontrendike"
                )
                suggestions.append(f"{drug_info['name_tr']} kesilmelidir.")
            elif adj is not None:
                score -= 5
                risk_factors.append(
                    f"{drug_info['name_tr']}: hepatik doz ayarı gerekli"
                )

    # --- Allergy risk ---
    if known_allergies:
        for med_name in med_names:
            cross = check_allergy_cross_reactivity(known_allergies, med_name)
            if cross["cross_reactivity_risk"] >= 0.5:
                score -= 20
                risk_factors.append(
                    f"{med_name}: bilinen alerji ile yüksek çapraz reaksiyon riski"
                )
                suggestions.append(f"{med_name} değiştirilmelidir.")
            elif cross["cross_reactivity_risk"] > 0:
                score -= 5
                risk_factors.append(
                    f"{med_name}: olası çapraz reaksiyon riski ({cross['cross_reactivity_risk']*100:.0f}%)"
                )

    # --- Duplicate therapeutic class ---
    classes_seen = {}
    for med_name in med_names:
        drug_info = DRUG_DATABASE.get(med_name)
        if drug_info:
            cls = drug_info["category"]
            if cls in classes_seen:
                score -= 5
                risk_factors.append(
                    f"Aynı kategoride ({cls}) birden fazla ilaç: {classes_seen[cls]} ve {drug_info['name_tr']}"
                )
                suggestions.append(
                    f"Aynı kategorideki ({cls}) ilaçlardan birinin çıkarılması değerlendirilmelidir."
                )
            else:
                classes_seen[cls] = drug_info["name_tr"]

    # Clamp score
    score = max(0, min(100, score))

    return {
        "safety_score": score,
        "risk_factors": risk_factors,
        "suggestions": suggestions,
    }


def suggest_alternatives(drug: str, reason: str, patient: dict) -> list:
    """
    Suggest alternative drugs when one is contraindicated.

    Args:
        drug: the contraindicated drug name
        reason: reason for seeking alternative (e.g., 'allergy', 'renal', 'hepatic')
        patient: patient dict with age, weight_kg, gfr, liver_function, known_allergies

    Returns:
        list of dicts with: drug_name, drug_name_tr, reason_tr, suitability_score
    """
    normalized = _normalize_drug_name(drug)
    drug_info = DRUG_DATABASE.get(normalized)

    if not drug_info:
        for key, info in DRUG_DATABASE.items():
            if _normalize_drug_name(info["name_tr"]) == normalized:
                drug_info = info
                normalized = key
                break

    if not drug_info:
        return []

    target_category = drug_info["category"]
    target_class = drug_info["class"]
    known_allergies = patient.get("known_allergies", [])
    gfr = _estimate_gfr(patient)
    liver_function = patient.get("liver_function", "normal")
    age = patient.get("age", 30)

    alternatives = []

    for alt_key, alt_info in DRUG_DATABASE.items():
        if alt_key == normalized:
            continue

        # Same category = potential alternative
        if alt_info["category"] != target_category:
            continue

        # Skip same class if reason is allergy (cross-reactivity)
        if reason.lower() in ("allergy", "alerji") and alt_info["class"] == target_class:
            continue

        suitability = 100

        # Check age
        if age < alt_info["min_age"]:
            suitability -= 100  # Not suitable

        # Check renal
        if gfr is not None:
            for threshold in sorted(alt_info.get("renal_adjustments", {}).keys()):
                if gfr < threshold:
                    adj = alt_info["renal_adjustments"][threshold]
                    if adj == "contraindicated":
                        suitability -= 100
                    else:
                        suitability -= 20
                    break

        # Check hepatic
        if liver_function != "normal":
            adj = alt_info.get("hepatic_adjustments", {}).get(liver_function)
            if adj == "contraindicated":
                suitability -= 100
            elif adj is not None:
                suitability -= 10

        # Check allergy cross-reactivity
        if known_allergies:
            cross = check_allergy_cross_reactivity(known_allergies, alt_key)
            if cross["cross_reactivity_risk"] >= 0.3:
                suitability -= 50
            elif cross["cross_reactivity_risk"] > 0:
                suitability -= int(cross["cross_reactivity_risk"] * 30)

        if suitability > 0:
            # Determine reason text
            if alt_info["class"] != target_class:
                reason_tr = f"Farklı ilaç sınıfı ({alt_info['class']}), aynı tedavi kategorisi"
            else:
                reason_tr = f"Aynı sınıfta alternatif ({alt_info['class']})"

            alternatives.append({
                "drug_name": alt_key,
                "drug_name_tr": alt_info["name_tr"],
                "drug_class": alt_info["class"],
                "reason_tr": reason_tr,
                "suitability_score": max(0, min(100, suitability)),
                "notes_tr": alt_info.get("notes_tr", ""),
            })

    # Sort by suitability descending
    alternatives.sort(key=lambda x: x["suitability_score"], reverse=True)

    return alternatives[:5]


def get_dosing_guidelines(drug: str) -> dict:
    """
    Get standard dosing guidelines for a drug in Turkish.

    Args:
        drug: drug name

    Returns:
        dict with dosing information in Turkish
    """
    normalized = _normalize_drug_name(drug)
    drug_info = DRUG_DATABASE.get(normalized)

    if not drug_info:
        for key, info in DRUG_DATABASE.items():
            if _normalize_drug_name(info["name_tr"]) == normalized:
                drug_info = info
                break

    if not drug_info:
        return {
            "found": False,
            "drug": drug,
            "message": f"'{drug}' için dozaj bilgisi bulunamadı.",
        }

    # Build renal adjustment text
    renal_text = []
    if drug_info["renal_adjustments"]:
        for threshold, adj in sorted(drug_info["renal_adjustments"].items(), reverse=True):
            if adj == "contraindicated":
                renal_text.append(f"GFR < {threshold} ml/dk: KONTRENDİKE")
            else:
                renal_text.append(f"GFR < {threshold} ml/dk: dozun %{int(adj*100)}'i")
    else:
        renal_text.append("Renal doz ayarı gerekmez")

    # Build hepatic adjustment text
    hepatic_text = []
    if drug_info["hepatic_adjustments"]:
        for level, adj in drug_info["hepatic_adjustments"].items():
            level_tr = {"mild": "Hafif", "moderate": "Orta", "severe": "Ciddi"}.get(level, level)
            if adj == "contraindicated":
                hepatic_text.append(f"{level_tr} KC yetmezliği: KONTRENDİKE")
            else:
                hepatic_text.append(f"{level_tr} KC yetmezliği: dozun %{int(adj*100)}'i")
    else:
        hepatic_text.append("Hepatik doz ayarı gerekmez")

    return {
        "found": True,
        "ilac_adi": drug_info["name_tr"],
        "ilac_sinifi": drug_info["class"],
        "kategori": drug_info["category"],
        "standart_doz": f"{drug_info['standard_dose_mg']} mg",
        "maksimum_gunluk_doz": f"{drug_info['max_daily_dose_mg']} mg",
        "kullanim_sikligi": drug_info["frequency"],
        "uygulama_yolu": drug_info["route"],
        "pediatrik_kullanim": "Evet" if drug_info["pediatric"] else "Hayır",
        "minimum_yas": drug_info["min_age"],
        "renal_doz_ayari": renal_text,
        "hepatik_doz_ayari": hepatic_text,
        "kontrendikasyonlar": drug_info["contraindications"],
        "notlar": drug_info.get("notes_tr", ""),
    }
