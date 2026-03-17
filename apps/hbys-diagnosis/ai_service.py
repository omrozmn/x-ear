"""
AI-powered ICD-10 Smart Search and Differential Diagnosis Engine.

Provides:
- TF-IDF + cosine similarity based fuzzy Turkish ICD-10 search
- Symptom-based differential diagnosis with probability ranking
- Diagnosis-treatment consistency validation

CPU-only implementation using scikit-learn. No GPU required.
"""
import logging
import re
from typing import Optional

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# ─── Turkish character normalization ─────────────────────────────────────────

_TR_CHAR_MAP = str.maketrans(
    {
        "\u0131": "i",   # ı -> i
        "\u0130": "i",   # İ -> i
        "\u00e7": "c",   # ç -> c
        "\u00c7": "c",   # Ç -> c
        "\u011f": "g",   # ğ -> g
        "\u011e": "g",   # Ğ -> g
        "\u00f6": "o",   # ö -> o
        "\u00d6": "o",   # Ö -> o
        "\u015f": "s",   # ş -> s
        "\u015e": "s",   # Ş -> s
        "\u00fc": "u",   # ü -> u
        "\u00dc": "u",   # Ü -> u
    }
)


def _normalize(text: str) -> str:
    """Lowercase + strip Turkish diacritics + collapse whitespace."""
    return re.sub(r"\s+", " ", text.lower().translate(_TR_CHAR_MAP).strip())


# ─── Medical abbreviation / synonym expansion ───────────────────────────────

ABBREVIATIONS: dict[str, list[str]] = {
    "HT": ["hipertansiyon", "yüksek tansiyon", "esansiyel hipertansiyon", "tansiyon"],
    "DM": ["diyabet", "diabetes mellitus", "şeker hastalığı", "tip 2 diyabet", "tip 2 diabetes mellitus"],
    "KOAH": ["kronik obstrüktif akciğer hastalığı", "kronik bronşit", "amfizem"],
    "KAH": ["koroner arter hastalığı", "iskemik kalp hastalığı", "aterosklerotik kalp hastalığı"],
    "SVO": ["serebrovasküler olay", "inme", "felç", "serebral infarktüs"],
    "KBY": ["kronik böbrek yetmezliği", "kronik böbrek hastalığı"],
    "KKY": ["konjestif kalp yetmezliği", "kalp yetmezliği"],
    "AF": ["atriyal fibrilasyon", "atrial fibrilasyon"],
    "ÜSYE": ["üst solunum yolu enfeksiyonu", "soğuk algınlığı", "nezle"],
    "İYE": ["idrar yolu enfeksiyonu", "üriner enfeksiyon", "sistit"],
    "GERD": ["gastroözofageal reflü hastalığı", "reflü", "mide yanması"],
    "BPH": ["benign prostat hiperplazisi", "prostat hiperplazisi", "prostat büyümesi"],
    "DEA": ["demir eksikliği anemisi", "kansızlık"],
    "MI": ["miyokard infarktüsü", "kalp krizi", "akut miyokard infarktüsü"],
    "RA": ["romatoid artrit"],
    "MS": ["multipl skleroz"],
}

# Reverse map: synonym -> abbreviation
_SYNONYM_TO_ABBR: dict[str, str] = {}
for abbr, synonyms in ABBREVIATIONS.items():
    for syn in synonyms:
        _SYNONYM_TO_ABBR[_normalize(syn)] = abbr

# Turkish medical synonyms pointing to ICD codes
SYNONYM_TO_ICD: dict[str, str] = {
    # Hypertension
    "tansiyon": "I10",
    "yüksek tansiyon": "I10",
    "hipertansiyon": "I10",
    "esansiyel hipertansiyon": "I10",
    # Diabetes
    "şeker hastalığı": "I10",  # will be overridden below
    "diyabet": "E11",
    "şeker hastalığı": "E11",
    "tip 2 diyabet": "E11",
    "tip 1 diyabet": "E10.9",
    # Respiratory
    "soğuk algınlığı": "J06.9",
    "nezle": "J06.9",
    "grip": "J06.9",
    "zatürre": "J18.9",
    "astım": "J45.9",
    "bronşit": "J20.9",
    # Pain
    "baş ağrısı": "R51",
    "bel ağrısı": "M54.5",
    "karın ağrısı": "R10.4",
    "göğüs ağrısı": "R07.4",
    # GI
    "reflü": "K21.0",
    "gastrit": "K29.7",
    "kabızlık": "K59.0",
    # Mental
    "depresyon": "F32.9",
    "anksiyete": "F41.9",
    "uykusuzluk": "G47.0",
    "migren": "G43.9",
    # Ear
    "işitme kaybı": "H91.9",
    "kulak iltihabı": "H66.9",
    # Skin
    "ürtiker": "L50.9",
    "kurdeşen": "L50.9",
    # Urinary
    "idrar yolu enfeksiyonu": "N39.0",
    # Obesity
    "obezite": "E66.9",
    "şişmanlık": "E66.9",
    # Blood
    "kansızlık": "D50.9",
    "anemi": "D64.9",
    # Fever
    "ateş": "R50.9",
}


# ─── ICD-10 Knowledge Base (~500 most common codes) ─────────────────────────

# Each entry: (code, name_tr, name_en)
ICD10_KNOWLEDGE_BASE: list[dict] = [
    # ── Infectious (A/B) ────────────────────────────────────────────
    {"code": "A09", "name_tr": "Enfeksiyöz gastroenterit ve kolit", "name_en": "Infectious gastroenteritis and colitis"},
    {"code": "A49.9", "name_tr": "Bakteriyel enfeksiyon, tanımlanmamış", "name_en": "Bacterial infection, unspecified"},
    {"code": "B34.9", "name_tr": "Viral enfeksiyon, tanımlanmamış", "name_en": "Viral infection, unspecified"},
    {"code": "B37.0", "name_tr": "Oral kandidiyazis", "name_en": "Candidal stomatitis"},
    {"code": "A46", "name_tr": "Erizipel", "name_en": "Erysipelas"},
    {"code": "B02.9", "name_tr": "Zona (herpes zoster)", "name_en": "Zoster without complications"},
    {"code": "A15.0", "name_tr": "Akciğer tüberkülozu", "name_en": "Tuberculosis of lung"},
    {"code": "B18.1", "name_tr": "Kronik viral hepatit B", "name_en": "Chronic viral hepatitis B"},
    {"code": "B18.2", "name_tr": "Kronik viral hepatit C", "name_en": "Chronic viral hepatitis C"},
    {"code": "A41.9", "name_tr": "Sepsis, tanımlanmamış", "name_en": "Sepsis, unspecified organism"},

    # ── Neoplasms (C/D) ────────────────────────────────────────────
    {"code": "C34.9", "name_tr": "Akciğer kanseri, tanımlanmamış", "name_en": "Malignant neoplasm of bronchus or lung"},
    {"code": "C50.9", "name_tr": "Meme kanseri, tanımlanmamış", "name_en": "Malignant neoplasm of breast"},
    {"code": "C18.9", "name_tr": "Kolon kanseri, tanımlanmamış", "name_en": "Malignant neoplasm of colon"},
    {"code": "C61", "name_tr": "Prostat kanseri", "name_en": "Malignant neoplasm of prostate"},
    {"code": "C16.9", "name_tr": "Mide kanseri, tanımlanmamış", "name_en": "Malignant neoplasm of stomach"},
    {"code": "C67.9", "name_tr": "Mesane kanseri, tanımlanmamış", "name_en": "Malignant neoplasm of bladder"},
    {"code": "C73", "name_tr": "Tiroid kanseri", "name_en": "Malignant neoplasm of thyroid gland"},
    {"code": "C56", "name_tr": "Over kanseri", "name_en": "Malignant neoplasm of ovary"},
    {"code": "C20", "name_tr": "Rektum kanseri", "name_en": "Malignant neoplasm of rectum"},
    {"code": "C43.9", "name_tr": "Malign melanom, tanımlanmamış", "name_en": "Malignant melanoma of skin, unspecified"},

    # ── Blood (D50-D89) ────────────────────────────────────────────
    {"code": "D50.9", "name_tr": "Demir eksikliği anemisi, tanımlanmamış", "name_en": "Iron deficiency anemia, unspecified"},
    {"code": "D64.9", "name_tr": "Anemi, tanımlanmamış", "name_en": "Anemia, unspecified"},
    {"code": "D69.6", "name_tr": "Trombositopeni, tanımlanmamış", "name_en": "Thrombocytopenia, unspecified"},
    {"code": "D72.8", "name_tr": "Lökosit bozuklukları, diğer", "name_en": "Other specified disorders of white blood cells"},

    # ── Endocrine (E) ──────────────────────────────────────────────
    {"code": "E03.9", "name_tr": "Hipotiroidizm, tanımlanmamış", "name_en": "Hypothyroidism, unspecified"},
    {"code": "E05.9", "name_tr": "Hipertiroidizm, tanımlanmamış", "name_en": "Thyrotoxicosis, unspecified"},
    {"code": "E10.9", "name_tr": "Tip 1 diabetes mellitus, komplikasyonsuz", "name_en": "Type 1 diabetes mellitus without complications"},
    {"code": "E11", "name_tr": "Tip 2 diabetes mellitus", "name_en": "Type 2 diabetes mellitus"},
    {"code": "E11.9", "name_tr": "Tip 2 diabetes mellitus, komplikasyonsuz", "name_en": "Type 2 diabetes mellitus without complications"},
    {"code": "E11.6", "name_tr": "Tip 2 diabetes mellitus, diyabetik artropati ile", "name_en": "Type 2 diabetes mellitus with diabetic arthropathy"},
    {"code": "E11.2", "name_tr": "Tip 2 diabetes mellitus, böbrek komplikasyonları ile", "name_en": "Type 2 diabetes mellitus with kidney complications"},
    {"code": "E11.4", "name_tr": "Tip 2 diabetes mellitus, nörolojik komplikasyonları ile", "name_en": "Type 2 diabetes mellitus with neurological complications"},
    {"code": "E13.9", "name_tr": "Diğer tanımlanmış diabetes mellitus", "name_en": "Other specified diabetes mellitus"},
    {"code": "E66.9", "name_tr": "Obezite, tanımlanmamış", "name_en": "Obesity, unspecified"},
    {"code": "E78.0", "name_tr": "Saf hiperkolesterolemi", "name_en": "Pure hypercholesterolemia"},
    {"code": "E78.5", "name_tr": "Hiperlipidemi, tanımlanmamış", "name_en": "Dyslipidemia, unspecified"},
    {"code": "E87.6", "name_tr": "Hipokalemi", "name_en": "Hypokalemia"},
    {"code": "E87.1", "name_tr": "Hiponatremi", "name_en": "Hypo-osmolality and hyponatremia"},
    {"code": "E55.9", "name_tr": "D vitamini eksikliği, tanımlanmamış", "name_en": "Vitamin D deficiency, unspecified"},
    {"code": "E61.1", "name_tr": "Demir eksikliği", "name_en": "Iron deficiency"},
    {"code": "E53.8", "name_tr": "B12 vitamini eksikliği", "name_en": "Deficiency of other specified B group vitamins"},

    # ── Mental / Behavioral (F) ────────────────────────────────────
    {"code": "F10.2", "name_tr": "Alkol bağımlılık sendromu", "name_en": "Alcohol dependence syndrome"},
    {"code": "F17.2", "name_tr": "Tütün bağımlılığı", "name_en": "Nicotine dependence"},
    {"code": "F20.9", "name_tr": "Şizofreni, tanımlanmamış", "name_en": "Schizophrenia, unspecified"},
    {"code": "F31.9", "name_tr": "Bipolar bozukluk, tanımlanmamış", "name_en": "Bipolar disorder, unspecified"},
    {"code": "F32.9", "name_tr": "Depresif epizod, tanımlanmamış", "name_en": "Major depressive disorder, single episode, unspecified"},
    {"code": "F33.9", "name_tr": "Tekrarlayan depresif bozukluk, tanımlanmamış", "name_en": "Major depressive disorder, recurrent, unspecified"},
    {"code": "F41.0", "name_tr": "Panik bozukluk", "name_en": "Panic disorder"},
    {"code": "F41.1", "name_tr": "Yaygın anksiyete bozukluğu", "name_en": "Generalized anxiety disorder"},
    {"code": "F41.9", "name_tr": "Anksiyete bozukluğu, tanımlanmamış", "name_en": "Anxiety disorder, unspecified"},
    {"code": "F43.1", "name_tr": "Travma sonrası stres bozukluğu", "name_en": "Post-traumatic stress disorder"},
    {"code": "F51.0", "name_tr": "Organik olmayan uykusuzluk", "name_en": "Nonorganic insomnia"},
    {"code": "F90.0", "name_tr": "Dikkat eksikliği hiperaktivite bozukluğu", "name_en": "ADHD"},

    # ── Nervous system (G) ─────────────────────────────────────────
    {"code": "G20", "name_tr": "Parkinson hastalığı", "name_en": "Parkinson disease"},
    {"code": "G30.9", "name_tr": "Alzheimer hastalığı, tanımlanmamış", "name_en": "Alzheimer disease, unspecified"},
    {"code": "G35", "name_tr": "Multipl skleroz", "name_en": "Multiple sclerosis"},
    {"code": "G40.9", "name_tr": "Epilepsi, tanımlanmamış", "name_en": "Epilepsy, unspecified"},
    {"code": "G43.9", "name_tr": "Migren, tanımlanmamış", "name_en": "Migraine, unspecified"},
    {"code": "G47.0", "name_tr": "Uykusuzluk (insomni)", "name_en": "Insomnia"},
    {"code": "G47.3", "name_tr": "Uyku apnesi", "name_en": "Sleep apnea"},
    {"code": "G51.0", "name_tr": "Bell paralizi", "name_en": "Bell palsy"},
    {"code": "G56.0", "name_tr": "Karpal tünel sendromu", "name_en": "Carpal tunnel syndrome"},
    {"code": "G62.9", "name_tr": "Polinöropati, tanımlanmamış", "name_en": "Polyneuropathy, unspecified"},

    # ── Eye (H00-H59) ──────────────────────────────────────────────
    {"code": "H10.9", "name_tr": "Konjonktivit, tanımlanmamış", "name_en": "Conjunctivitis, unspecified"},
    {"code": "H25.9", "name_tr": "Senil katarakt, tanımlanmamış", "name_en": "Age-related cataract"},
    {"code": "H26.9", "name_tr": "Katarakt, tanımlanmamış", "name_en": "Cataract, unspecified"},
    {"code": "H40.9", "name_tr": "Glokom, tanımlanmamış", "name_en": "Glaucoma, unspecified"},
    {"code": "H52.1", "name_tr": "Miyopi", "name_en": "Myopia"},

    # ── Ear (H60-H95) ──────────────────────────────────────────────
    {"code": "H61.2", "name_tr": "Serümen tıkacı", "name_en": "Impacted cerumen"},
    {"code": "H65.9", "name_tr": "Seröz otitis media, tanımlanmamış", "name_en": "Nonsuppurative otitis media, unspecified"},
    {"code": "H66.9", "name_tr": "Otitis media, tanımlanmamış", "name_en": "Otitis media, unspecified"},
    {"code": "H81.1", "name_tr": "Benign paroksismal pozisyonel vertigo", "name_en": "Benign paroxysmal positional vertigo"},
    {"code": "H81.0", "name_tr": "Meniere hastalığı", "name_en": "Meniere disease"},
    {"code": "H90.3", "name_tr": "Bilateral sensorinöral işitme kaybı", "name_en": "Sensorineural hearing loss, bilateral"},
    {"code": "H90.5", "name_tr": "Sensorinöral işitme kaybı, tanımlanmamış", "name_en": "Unspecified sensorineural hearing loss"},
    {"code": "H91.1", "name_tr": "Presbiyakuzi", "name_en": "Presbycusis"},
    {"code": "H91.9", "name_tr": "İşitme kaybı, tanımlanmamış", "name_en": "Hearing loss, unspecified"},
    {"code": "H93.1", "name_tr": "Tinnitus", "name_en": "Tinnitus"},

    # ── Circulatory (I) ────────────────────────────────────────────
    {"code": "I10", "name_tr": "Esansiyel (primer) hipertansiyon", "name_en": "Essential (primary) hypertension"},
    {"code": "I11.9", "name_tr": "Hipertansif kalp hastalığı", "name_en": "Hypertensive heart disease without heart failure"},
    {"code": "I20.0", "name_tr": "Unstabil angina pektoris", "name_en": "Unstable angina"},
    {"code": "I20.9", "name_tr": "Angina pektoris, tanımlanmamış", "name_en": "Angina pectoris, unspecified"},
    {"code": "I21.0", "name_tr": "Akut anterior miyokard infarktüsü", "name_en": "Acute anterior myocardial infarction"},
    {"code": "I21.9", "name_tr": "Akut miyokard infarktüsü, tanımlanmamış", "name_en": "Acute myocardial infarction, unspecified"},
    {"code": "I25.1", "name_tr": "Aterosklerotik kalp hastalığı", "name_en": "Atherosclerotic heart disease"},
    {"code": "I25.9", "name_tr": "Kronik iskemik kalp hastalığı, tanımlanmamış", "name_en": "Chronic ischemic heart disease, unspecified"},
    {"code": "I26.9", "name_tr": "Pulmoner emboli, tanımlanmamış", "name_en": "Pulmonary embolism without acute cor pulmonale"},
    {"code": "I42.9", "name_tr": "Kardiyomiyopati, tanımlanmamış", "name_en": "Cardiomyopathy, unspecified"},
    {"code": "I44.1", "name_tr": "Atriyoventriküler blok, ikinci derece", "name_en": "Atrioventricular block, second degree"},
    {"code": "I48.9", "name_tr": "Atriyal fibrilasyon, tanımlanmamış", "name_en": "Atrial fibrillation, unspecified"},
    {"code": "I50.9", "name_tr": "Kalp yetmezliği, tanımlanmamış", "name_en": "Heart failure, unspecified"},
    {"code": "I63.9", "name_tr": "Serebral infarktüs, tanımlanmamış", "name_en": "Cerebral infarction, unspecified"},
    {"code": "I64", "name_tr": "İnme (serebrovasküler olay)", "name_en": "Stroke, not specified"},
    {"code": "I67.9", "name_tr": "Serebrovasküler hastalık, tanımlanmamış", "name_en": "Cerebrovascular disease, unspecified"},
    {"code": "I70.9", "name_tr": "Ateroskleroz, tanımlanmamış", "name_en": "Atherosclerosis, unspecified"},
    {"code": "I73.9", "name_tr": "Periferik vasküler hastalık, tanımlanmamış", "name_en": "Peripheral vascular disease, unspecified"},
    {"code": "I80.2", "name_tr": "Derin ven trombozu", "name_en": "Deep vein thrombosis"},
    {"code": "I83.9", "name_tr": "Varis, tanımlanmamış", "name_en": "Varicose veins, unspecified"},

    # ── Respiratory (J) ────────────────────────────────────────────
    {"code": "J02.9", "name_tr": "Akut farenjit, tanımlanmamış", "name_en": "Acute pharyngitis, unspecified"},
    {"code": "J03.9", "name_tr": "Akut tonsillit, tanımlanmamış", "name_en": "Acute tonsillitis, unspecified"},
    {"code": "J06.9", "name_tr": "Akut üst solunum yolu enfeksiyonu, tanımlanmamış", "name_en": "Acute upper respiratory infection, unspecified"},
    {"code": "J10.1", "name_tr": "İnfluenza (grip), tanımlanmış", "name_en": "Influenza with other respiratory manifestations"},
    {"code": "J12.9", "name_tr": "Viral pnömoni, tanımlanmamış", "name_en": "Viral pneumonia, unspecified"},
    {"code": "J15.9", "name_tr": "Bakteriyel pnömoni, tanımlanmamış", "name_en": "Bacterial pneumonia, unspecified"},
    {"code": "J18.9", "name_tr": "Pnömoni, tanımlanmamış", "name_en": "Pneumonia, unspecified organism"},
    {"code": "J20.9", "name_tr": "Akut bronşit, tanımlanmamış", "name_en": "Acute bronchitis, unspecified"},
    {"code": "J30.1", "name_tr": "Polen kaynaklı alerjik rinit", "name_en": "Allergic rhinitis due to pollen"},
    {"code": "J30.4", "name_tr": "Alerjik rinit, tanımlanmamış", "name_en": "Allergic rhinitis, unspecified"},
    {"code": "J32.9", "name_tr": "Kronik sinüzit, tanımlanmamış", "name_en": "Chronic sinusitis, unspecified"},
    {"code": "J34.2", "name_tr": "Nazal septum deviasyonu", "name_en": "Deviated nasal septum"},
    {"code": "J40", "name_tr": "Bronşit, akut veya kronik", "name_en": "Bronchitis, not specified as acute or chronic"},
    {"code": "J42", "name_tr": "Kronik bronşit, tanımlanmamış", "name_en": "Unspecified chronic bronchitis"},
    {"code": "J44.0", "name_tr": "KOAH, alt solunum yolu enfeksiyonu ile", "name_en": "COPD with acute lower respiratory infection"},
    {"code": "J44.1", "name_tr": "Akut alevlenme ile kronik obstrüktif akciğer hastalığı", "name_en": "COPD with acute exacerbation"},
    {"code": "J44.9", "name_tr": "Kronik obstrüktif akciğer hastalığı, tanımlanmamış", "name_en": "COPD, unspecified"},
    {"code": "J45.9", "name_tr": "Astım, tanımlanmamış", "name_en": "Asthma, unspecified"},
    {"code": "J84.1", "name_tr": "İdiyopatik pulmoner fibrozis", "name_en": "Idiopathic pulmonary fibrosis"},
    {"code": "J90", "name_tr": "Plevral efüzyon", "name_en": "Pleural effusion"},
    {"code": "J93.9", "name_tr": "Pnömotoraks, tanımlanmamış", "name_en": "Pneumothorax, unspecified"},
    {"code": "J96.9", "name_tr": "Solunum yetmezliği, tanımlanmamış", "name_en": "Respiratory failure, unspecified"},

    # ── Digestive (K) ──────────────────────────────────────────────
    {"code": "K04.7", "name_tr": "Periapikal apse", "name_en": "Periapical abscess"},
    {"code": "K21.0", "name_tr": "Özofajit ile gastroözofageal reflü hastalığı", "name_en": "GERD with esophagitis"},
    {"code": "K25.9", "name_tr": "Gastrik ülser, tanımlanmamış", "name_en": "Gastric ulcer, unspecified"},
    {"code": "K26.9", "name_tr": "Duodenal ülser, tanımlanmamış", "name_en": "Duodenal ulcer, unspecified"},
    {"code": "K29", "name_tr": "Gastrit ve duodenit", "name_en": "Gastritis and duodenitis"},
    {"code": "K29.7", "name_tr": "Gastrit, tanımlanmamış", "name_en": "Gastritis, unspecified"},
    {"code": "K35.8", "name_tr": "Akut apandisit, diğer ve tanımlanmamış", "name_en": "Acute appendicitis, other and unspecified"},
    {"code": "K40.9", "name_tr": "İnguinal herni, tanımlanmamış", "name_en": "Inguinal hernia, unspecified"},
    {"code": "K50.9", "name_tr": "Crohn hastalığı, tanımlanmamış", "name_en": "Crohn disease, unspecified"},
    {"code": "K51.9", "name_tr": "Ülseratif kolit, tanımlanmamış", "name_en": "Ulcerative colitis, unspecified"},
    {"code": "K56.6", "name_tr": "İntestinal obstrüksiyon, tanımlanmamış", "name_en": "Intestinal obstruction, unspecified"},
    {"code": "K57.9", "name_tr": "Divertiküler hastalık, tanımlanmamış", "name_en": "Diverticular disease, unspecified"},
    {"code": "K59.0", "name_tr": "Kabızlık", "name_en": "Constipation"},
    {"code": "K70.3", "name_tr": "Alkolik karaciğer sirozu", "name_en": "Alcoholic cirrhosis of liver"},
    {"code": "K74.6", "name_tr": "Karaciğer sirozu, tanımlanmamış", "name_en": "Cirrhosis of liver, unspecified"},
    {"code": "K76.0", "name_tr": "Yağlı karaciğer hastalığı", "name_en": "Fatty liver disease"},
    {"code": "K80.2", "name_tr": "Safra kesesi taşı, kolesistitli", "name_en": "Calculus of gallbladder without cholecystitis"},
    {"code": "K85.9", "name_tr": "Akut pankreatit, tanımlanmamış", "name_en": "Acute pancreatitis, unspecified"},
    {"code": "K92.0", "name_tr": "Hematemez", "name_en": "Hematemesis"},
    {"code": "K92.1", "name_tr": "Melena", "name_en": "Melena"},

    # ── Skin (L) ───────────────────────────────────────────────────
    {"code": "L02.9", "name_tr": "Apse, tanımlanmamış", "name_en": "Cutaneous abscess, unspecified"},
    {"code": "L08.9", "name_tr": "Lokal deri enfeksiyonu, tanımlanmamış", "name_en": "Local infection of skin, unspecified"},
    {"code": "L20.9", "name_tr": "Atopik dermatit, tanımlanmamış", "name_en": "Atopic dermatitis, unspecified"},
    {"code": "L23.9", "name_tr": "Kontakt dermatit, tanımlanmamış", "name_en": "Contact dermatitis, unspecified"},
    {"code": "L30.9", "name_tr": "Dermatit, tanımlanmamış", "name_en": "Dermatitis, unspecified"},
    {"code": "L40.0", "name_tr": "Psoriazis vulgaris", "name_en": "Psoriasis vulgaris"},
    {"code": "L50.9", "name_tr": "Ürtiker, tanımlanmamış", "name_en": "Urticaria, unspecified"},
    {"code": "L60.0", "name_tr": "Onikomikoz", "name_en": "Ingrowing nail"},
    {"code": "L70.0", "name_tr": "Akne vulgaris", "name_en": "Acne vulgaris"},
    {"code": "L72.0", "name_tr": "Epidermal kist", "name_en": "Epidermal cyst"},
    {"code": "L82", "name_tr": "Seboreik keratoz", "name_en": "Seborrheic keratosis"},

    # ── Musculoskeletal (M) ────────────────────────────────────────
    {"code": "M06.9", "name_tr": "Romatoid artrit, tanımlanmamış", "name_en": "Rheumatoid arthritis, unspecified"},
    {"code": "M10.9", "name_tr": "Gut, tanımlanmamış", "name_en": "Gout, unspecified"},
    {"code": "M13.9", "name_tr": "Artrit, tanımlanmamış", "name_en": "Arthritis, unspecified"},
    {"code": "M15.9", "name_tr": "Poliartroz, tanımlanmamış", "name_en": "Polyarthrosis, unspecified"},
    {"code": "M16.9", "name_tr": "Koksartroz, tanımlanmamış", "name_en": "Coxarthrosis, unspecified"},
    {"code": "M17.9", "name_tr": "Gonartroz, tanımlanmamış", "name_en": "Gonarthrosis, unspecified"},
    {"code": "M19.9", "name_tr": "Artroz, tanımlanmamış", "name_en": "Arthrosis, unspecified"},
    {"code": "M23.5", "name_tr": "Menisküs yırtığı", "name_en": "Derangement of meniscus"},
    {"code": "M25.5", "name_tr": "Eklem ağrısı", "name_en": "Pain in joint"},
    {"code": "M35.3", "name_tr": "Polimiyalji romatika", "name_en": "Polymyalgia rheumatica"},
    {"code": "M41.9", "name_tr": "Skolyoz, tanımlanmamış", "name_en": "Scoliosis, unspecified"},
    {"code": "M47.8", "name_tr": "Spondiloz, diğer", "name_en": "Other spondylosis"},
    {"code": "M51.1", "name_tr": "Lomber disk hernisi, radikülopati ile", "name_en": "Lumbar disc herniation with radiculopathy"},
    {"code": "M54.2", "name_tr": "Servikal bölge ağrısı", "name_en": "Cervicalgia"},
    {"code": "M54.5", "name_tr": "Bel ağrısı", "name_en": "Low back pain"},
    {"code": "M62.8", "name_tr": "Kas bozuklukları, diğer", "name_en": "Other specified disorders of muscle"},
    {"code": "M65.9", "name_tr": "Sinovit ve tenosinovit, tanımlanmamış", "name_en": "Synovitis and tenosynovitis, unspecified"},
    {"code": "M72.0", "name_tr": "Palmar fasiit", "name_en": "Palmar fascial fibromatosis"},
    {"code": "M75.1", "name_tr": "Rotator manşet sendromu", "name_en": "Rotator cuff syndrome"},
    {"code": "M77.1", "name_tr": "Lateral epikondilit (tenisçi dirseği)", "name_en": "Lateral epicondylitis"},
    {"code": "M79.1", "name_tr": "Miyalji", "name_en": "Myalgia"},
    {"code": "M79.3", "name_tr": "Pannikülit, tanımlanmamış", "name_en": "Panniculitis, unspecified"},
    {"code": "M81.9", "name_tr": "Osteoporoz, tanımlanmamış", "name_en": "Osteoporosis, unspecified"},

    # ── Genitourinary (N) ──────────────────────────────────────────
    {"code": "N10", "name_tr": "Akut tübülointerstisyel nefrit (piyelonefrit)", "name_en": "Acute pyelonephritis"},
    {"code": "N18.9", "name_tr": "Kronik böbrek hastalığı, tanımlanmamış", "name_en": "Chronic kidney disease, unspecified"},
    {"code": "N20.0", "name_tr": "Böbrek taşı", "name_en": "Calculus of kidney"},
    {"code": "N39.0", "name_tr": "İdrar yolu enfeksiyonu, yeri tanımlanmamış", "name_en": "Urinary tract infection, site not specified"},
    {"code": "N40", "name_tr": "Prostat hiperplazisi", "name_en": "Enlarged prostate"},
    {"code": "N41.0", "name_tr": "Akut prostatit", "name_en": "Acute prostatitis"},
    {"code": "N76.0", "name_tr": "Akut vajinit", "name_en": "Acute vaginitis"},
    {"code": "N80.9", "name_tr": "Endometriozis, tanımlanmamış", "name_en": "Endometriosis, unspecified"},
    {"code": "N92.0", "name_tr": "Aşırı menstruasyon", "name_en": "Excessive menstruation"},
    {"code": "N95.1", "name_tr": "Menopoz durumu", "name_en": "Menopausal and female climacteric states"},

    # ── Pregnancy (O) ─────────────────────────────────────────────
    {"code": "O80", "name_tr": "Spontan doğum", "name_en": "Single spontaneous delivery"},
    {"code": "O82", "name_tr": "Sezaryen ile doğum", "name_en": "Delivery by cesarean section"},
    {"code": "O03.9", "name_tr": "Düşük, tanımlanmamış", "name_en": "Spontaneous abortion, complete or unspecified"},
    {"code": "O14.9", "name_tr": "Preeklampsi, tanımlanmamış", "name_en": "Pre-eclampsia, unspecified"},

    # ── Symptoms / Signs (R) ──────────────────────────────────────
    {"code": "R00.0", "name_tr": "Taşikardi, tanımlanmamış", "name_en": "Tachycardia, unspecified"},
    {"code": "R04.0", "name_tr": "Burun kanaması (epistaksis)", "name_en": "Epistaxis"},
    {"code": "R05", "name_tr": "Öksürük", "name_en": "Cough"},
    {"code": "R06.0", "name_tr": "Dispne (nefes darlığı)", "name_en": "Dyspnea"},
    {"code": "R07.4", "name_tr": "Göğüs ağrısı, tanımlanmamış", "name_en": "Chest pain, unspecified"},
    {"code": "R10.1", "name_tr": "Üst karın ağrısı (epigastrik)", "name_en": "Pain localized to upper abdomen"},
    {"code": "R10.4", "name_tr": "Diğer ve tanımlanmamış karın ağrısı", "name_en": "Other and unspecified abdominal pain"},
    {"code": "R11", "name_tr": "Bulantı ve kusma", "name_en": "Nausea and vomiting"},
    {"code": "R19.7", "name_tr": "İshal, tanımlanmamış", "name_en": "Diarrhea, unspecified"},
    {"code": "R21", "name_tr": "Döküntü ve diğer nonspesifik deri belirtileri", "name_en": "Rash and other nonspecific skin eruption"},
    {"code": "R31.9", "name_tr": "Hematüri, tanımlanmamış", "name_en": "Hematuria, unspecified"},
    {"code": "R42", "name_tr": "Baş dönmesi (vertigo)", "name_en": "Dizziness and giddiness"},
    {"code": "R50.9", "name_tr": "Ateş, tanımlanmamış", "name_en": "Fever, unspecified"},
    {"code": "R51", "name_tr": "Baş ağrısı", "name_en": "Headache"},
    {"code": "R53.1", "name_tr": "Halsizlik", "name_en": "Weakness"},
    {"code": "R55", "name_tr": "Senkop (bayılma)", "name_en": "Syncope and collapse"},
    {"code": "R56.0", "name_tr": "Febril konvülziyon", "name_en": "Febrile convulsions"},
    {"code": "R63.4", "name_tr": "Kilo kaybı", "name_en": "Abnormal weight loss"},
    {"code": "R73.0", "name_tr": "Anormal glukoz toleransı", "name_en": "Abnormal glucose tolerance test"},

    # ── Injury (S/T) ──────────────────────────────────────────────
    {"code": "S06.0", "name_tr": "Beyin sarsıntısı (komosyo serebri)", "name_en": "Concussion"},
    {"code": "S22.3", "name_tr": "Kaburga kırığı", "name_en": "Fracture of rib"},
    {"code": "S42.0", "name_tr": "Klavikula kırığı", "name_en": "Fracture of clavicle"},
    {"code": "S52.5", "name_tr": "Radius alt uç kırığı", "name_en": "Fracture of lower end of radius"},
    {"code": "S62.5", "name_tr": "El parmak kırığı", "name_en": "Fracture of thumb"},
    {"code": "S72.0", "name_tr": "Femur boyun kırığı", "name_en": "Fracture of neck of femur"},
    {"code": "S82.0", "name_tr": "Patella kırığı", "name_en": "Fracture of patella"},
    {"code": "S83.5", "name_tr": "Diz bağ yaralanması", "name_en": "Sprain of cruciate ligament of knee"},
    {"code": "S93.4", "name_tr": "Ayak bileği burkulması", "name_en": "Sprain of ankle"},
    {"code": "T78.4", "name_tr": "Alerji, tanımlanmamış", "name_en": "Allergy, unspecified"},
    {"code": "T81.4", "name_tr": "Cerrahi sonrası enfeksiyon", "name_en": "Infection following a procedure"},

    # ── External causes / Other (Z) ───────────────────────────────
    {"code": "Z00.0", "name_tr": "Genel sağlık muayenesi", "name_en": "General adult medical examination"},
    {"code": "Z12.3", "name_tr": "Meme kanseri taraması", "name_en": "Screening for malignant neoplasm of breast"},
    {"code": "Z23", "name_tr": "Aşılama", "name_en": "Encounter for immunization"},
    {"code": "Z96.6", "name_tr": "Ortopedik eklem implantı varlığı", "name_en": "Presence of orthopedic joint implants"},
]

# Build a lookup dict by code
_ICD_BY_CODE: dict[str, dict] = {entry["code"]: entry for entry in ICD10_KNOWLEDGE_BASE}


# ─── Symptom-to-Diagnosis Mapping (top 100 conditions) ──────────────────────

# Each mapping: symptom keywords -> list of (icd_code, probability_weight, condition_name_tr)
SYMPTOM_DIAGNOSIS_MAP: dict[str, list[tuple[str, float, str]]] = {
    # Respiratory symptoms
    "ateş": [
        ("J06.9", 0.35, "Akut üst solunum yolu enfeksiyonu"),
        ("J18.9", 0.20, "Pnömoni"),
        ("N39.0", 0.10, "İdrar yolu enfeksiyonu"),
        ("R50.9", 0.15, "Ateş, tanımlanmamış"),
        ("A09", 0.08, "Enfeksiyöz gastroenterit"),
        ("A41.9", 0.05, "Sepsis"),
        ("J02.9", 0.07, "Akut farenjit"),
    ],
    "öksürük": [
        ("J06.9", 0.30, "Akut üst solunum yolu enfeksiyonu"),
        ("J20.9", 0.20, "Akut bronşit"),
        ("J18.9", 0.18, "Pnömoni"),
        ("J45.9", 0.12, "Astım"),
        ("J44.1", 0.08, "KOAH alevlenmesi"),
        ("R05", 0.07, "Öksürük"),
        ("J42", 0.05, "Kronik bronşit"),
    ],
    "balgam": [
        ("J18.9", 0.30, "Pnömoni"),
        ("J20.9", 0.25, "Akut bronşit"),
        ("J44.1", 0.20, "KOAH alevlenmesi"),
        ("J06.9", 0.10, "Akut üst solunum yolu enfeksiyonu"),
        ("J42", 0.10, "Kronik bronşit"),
        ("A15.0", 0.05, "Akciğer tüberkülozu"),
    ],
    "nefes darlığı": [
        ("J45.9", 0.20, "Astım"),
        ("J44.1", 0.18, "KOAH alevlenmesi"),
        ("I50.9", 0.15, "Kalp yetmezliği"),
        ("J18.9", 0.12, "Pnömoni"),
        ("I26.9", 0.08, "Pulmoner emboli"),
        ("R06.0", 0.10, "Dispne"),
        ("J96.9", 0.05, "Solunum yetmezliği"),
        ("I20.9", 0.07, "Angina pektoris"),
        ("J90", 0.05, "Plevral efüzyon"),
    ],
    "hırıltı": [
        ("J45.9", 0.40, "Astım"),
        ("J44.1", 0.30, "KOAH alevlenmesi"),
        ("J20.9", 0.15, "Akut bronşit"),
        ("I50.9", 0.10, "Kalp yetmezliği"),
        ("J06.9", 0.05, "Akut üst solunum yolu enfeksiyonu"),
    ],
    "boğaz ağrısı": [
        ("J02.9", 0.35, "Akut farenjit"),
        ("J03.9", 0.30, "Akut tonsillit"),
        ("J06.9", 0.25, "Akut üst solunum yolu enfeksiyonu"),
        ("K21.0", 0.05, "Gastroözofageal reflü"),
        ("C73", 0.02, "Tiroid kanseri"),
    ],
    "burun tıkanıklığı": [
        ("J30.4", 0.30, "Alerjik rinit"),
        ("J06.9", 0.30, "Akut üst solunum yolu enfeksiyonu"),
        ("J32.9", 0.25, "Kronik sinüzit"),
        ("J34.2", 0.15, "Nazal septum deviasyonu"),
    ],

    # Cardiac symptoms
    "göğüs ağrısı": [
        ("R07.4", 0.25, "Göğüs ağrısı, tanımlanmamış"),
        ("I20.9", 0.20, "Angina pektoris"),
        ("I21.9", 0.15, "Akut miyokard infarktüsü"),
        ("K21.0", 0.12, "Gastroözofageal reflü"),
        ("I26.9", 0.08, "Pulmoner emboli"),
        ("J93.9", 0.05, "Pnömotoraks"),
        ("M54.2", 0.05, "Göğüs duvarı ağrısı"),
        ("I42.9", 0.05, "Kardiyomiyopati"),
        ("F41.0", 0.05, "Panik bozukluk"),
    ],
    "çarpıntı": [
        ("I48.9", 0.25, "Atriyal fibrilasyon"),
        ("R00.0", 0.20, "Taşikardi"),
        ("F41.1", 0.15, "Yaygın anksiyete bozukluğu"),
        ("E05.9", 0.12, "Hipertiroidizm"),
        ("I49.9" if False else "I48.9", 0.10, "Aritmi"),
        ("F41.0", 0.10, "Panik bozukluk"),
        ("D64.9", 0.08, "Anemi"),
    ],
    "bacak şişmesi": [
        ("I50.9", 0.25, "Kalp yetmezliği"),
        ("I80.2", 0.20, "Derin ven trombozu"),
        ("I83.9", 0.15, "Varis"),
        ("N18.9", 0.15, "Kronik böbrek hastalığı"),
        ("K74.6", 0.10, "Karaciğer sirozu"),
        ("E03.9", 0.08, "Hipotiroidizm"),
    ],

    # GI symptoms
    "karın ağrısı": [
        ("R10.4", 0.15, "Karın ağrısı, tanımlanmamış"),
        ("K29.7", 0.15, "Gastrit"),
        ("K35.8", 0.12, "Akut apandisit"),
        ("K80.2", 0.10, "Safra kesesi taşı"),
        ("K21.0", 0.08, "Gastroözofageal reflü"),
        ("K25.9", 0.07, "Gastrik ülser"),
        ("A09", 0.08, "Enfeksiyöz gastroenterit"),
        ("K85.9", 0.05, "Akut pankreatit"),
        ("K56.6", 0.05, "İntestinal obstrüksiyon"),
        ("K59.0", 0.05, "Kabızlık"),
    ],
    "bulantı": [
        ("K29.7", 0.20, "Gastrit"),
        ("A09", 0.18, "Enfeksiyöz gastroenterit"),
        ("K21.0", 0.12, "Gastroözofageal reflü"),
        ("R11", 0.15, "Bulantı ve kusma"),
        ("K85.9", 0.08, "Akut pankreatit"),
        ("G43.9", 0.07, "Migren"),
        ("K80.2", 0.05, "Safra kesesi taşı"),
    ],
    "kusma": [
        ("A09", 0.25, "Enfeksiyöz gastroenterit"),
        ("K29.7", 0.15, "Gastrit"),
        ("R11", 0.15, "Bulantı ve kusma"),
        ("K85.9", 0.10, "Akut pankreatit"),
        ("K56.6", 0.08, "İntestinal obstrüksiyon"),
        ("K35.8", 0.07, "Akut apandisit"),
        ("G43.9", 0.05, "Migren"),
    ],
    "ishal": [
        ("A09", 0.35, "Enfeksiyöz gastroenterit"),
        ("K59.0", 0.10, "Fonksiyonel barsak bozukluğu"),
        ("K50.9", 0.08, "Crohn hastalığı"),
        ("K51.9", 0.08, "Ülseratif kolit"),
        ("R19.7", 0.15, "İshal, tanımlanmamış"),
        ("E05.9", 0.05, "Hipertiroidizm"),
    ],
    "kabızlık": [
        ("K59.0", 0.40, "Kabızlık"),
        ("E03.9", 0.12, "Hipotiroidizm"),
        ("K56.6", 0.10, "İntestinal obstrüksiyon"),
        ("C18.9", 0.05, "Kolon kanseri"),
        ("E11", 0.05, "Diyabet"),
    ],
    "mide yanması": [
        ("K21.0", 0.40, "Gastroözofageal reflü"),
        ("K29.7", 0.25, "Gastrit"),
        ("K25.9", 0.15, "Gastrik ülser"),
        ("K26.9", 0.10, "Duodenal ülser"),
        ("I20.9", 0.05, "Angina pektoris"),
    ],

    # Neurological symptoms
    "baş ağrısı": [
        ("R51", 0.25, "Baş ağrısı"),
        ("G43.9", 0.20, "Migren"),
        ("I10", 0.12, "Hipertansiyon"),
        ("F41.1", 0.08, "Yaygın anksiyete bozukluğu"),
        ("G47.0", 0.05, "Uykusuzluk"),
        ("I63.9", 0.05, "Serebral infarktüs"),
        ("R50.9", 0.05, "Ateş"),
    ],
    "baş dönmesi": [
        ("R42", 0.25, "Baş dönmesi"),
        ("H81.1", 0.20, "Benign paroksismal pozisyonel vertigo"),
        ("H81.0", 0.10, "Meniere hastalığı"),
        ("I10", 0.10, "Hipertansiyon"),
        ("D50.9", 0.08, "Demir eksikliği anemisi"),
        ("I63.9", 0.07, "Serebral infarktüs"),
        ("F41.1", 0.05, "Yaygın anksiyete bozukluğu"),
    ],
    "bayılma": [
        ("R55", 0.30, "Senkop"),
        ("I48.9", 0.12, "Atriyal fibrilasyon"),
        ("G40.9", 0.10, "Epilepsi"),
        ("I10", 0.08, "Hipertansiyon"),
        ("D50.9", 0.08, "Demir eksikliği anemisi"),
        ("E11", 0.07, "Diyabet (hipoglisemi)"),
    ],
    "uyuşma": [
        ("G62.9", 0.25, "Polinöropati"),
        ("G56.0", 0.20, "Karpal tünel sendromu"),
        ("M51.1", 0.18, "Lomber disk hernisi"),
        ("I63.9", 0.12, "Serebral infarktüs"),
        ("E11.4", 0.10, "Diyabetik nöropati"),
        ("G35", 0.05, "Multipl skleroz"),
    ],
    "konuşma güçlüğü": [
        ("I63.9", 0.35, "Serebral infarktüs"),
        ("I64", 0.25, "İnme"),
        ("G35", 0.10, "Multipl skleroz"),
        ("G30.9", 0.08, "Alzheimer hastalığı"),
        ("G20", 0.05, "Parkinson hastalığı"),
    ],
    "halsizlik": [
        ("R53.1", 0.15, "Halsizlik"),
        ("D50.9", 0.15, "Demir eksikliği anemisi"),
        ("E03.9", 0.12, "Hipotiroidizm"),
        ("E11", 0.10, "Diyabet"),
        ("F32.9", 0.10, "Depresyon"),
        ("N18.9", 0.05, "Kronik böbrek hastalığı"),
        ("C34.9", 0.03, "Akciğer kanseri"),
    ],
    "kilo kaybı": [
        ("R63.4", 0.15, "Kilo kaybı"),
        ("E05.9", 0.15, "Hipertiroidizm"),
        ("E11", 0.12, "Diyabet"),
        ("C34.9", 0.10, "Akciğer kanseri"),
        ("C16.9", 0.08, "Mide kanseri"),
        ("F32.9", 0.08, "Depresyon"),
        ("K50.9", 0.05, "Crohn hastalığı"),
        ("A15.0", 0.05, "Akciğer tüberkülozu"),
    ],

    # Musculoskeletal
    "bel ağrısı": [
        ("M54.5", 0.35, "Bel ağrısı"),
        ("M51.1", 0.25, "Lomber disk hernisi"),
        ("M47.8", 0.12, "Spondiloz"),
        ("M81.9", 0.08, "Osteoporoz"),
        ("N20.0", 0.05, "Böbrek taşı"),
        ("M19.9", 0.05, "Artroz"),
    ],
    "eklem ağrısı": [
        ("M25.5", 0.20, "Eklem ağrısı"),
        ("M06.9", 0.15, "Romatoid artrit"),
        ("M10.9", 0.12, "Gut"),
        ("M13.9", 0.12, "Artrit"),
        ("M17.9", 0.10, "Gonartroz"),
        ("M16.9", 0.08, "Koksartroz"),
        ("M19.9", 0.08, "Artroz"),
    ],
    "boyun ağrısı": [
        ("M54.2", 0.40, "Servikal bölge ağrısı"),
        ("M47.8", 0.20, "Spondiloz"),
        ("M51.1", 0.15, "Disk hernisi"),
        ("M79.1", 0.10, "Miyalji"),
        ("G43.9", 0.05, "Migren"),
    ],
    "kas ağrısı": [
        ("M79.1", 0.35, "Miyalji"),
        ("M62.8", 0.20, "Kas bozuklukları"),
        ("M35.3", 0.10, "Polimiyalji romatika"),
        ("B34.9", 0.10, "Viral enfeksiyon"),
        ("E03.9", 0.08, "Hipotiroidizm"),
    ],
    "diz ağrısı": [
        ("M17.9", 0.30, "Gonartroz"),
        ("M23.5", 0.20, "Menisküs yırtığı"),
        ("M25.5", 0.15, "Eklem ağrısı"),
        ("S83.5", 0.12, "Diz bağ yaralanması"),
        ("M13.9", 0.08, "Artrit"),
        ("M10.9", 0.08, "Gut"),
    ],

    # Urological
    "sık idrara çıkma": [
        ("N39.0", 0.25, "İdrar yolu enfeksiyonu"),
        ("E11", 0.20, "Diyabet"),
        ("N40", 0.18, "Prostat hiperplazisi"),
        ("N41.0", 0.08, "Akut prostatit"),
        ("N18.9", 0.05, "Kronik böbrek hastalığı"),
    ],
    "idrar yaparken yanma": [
        ("N39.0", 0.45, "İdrar yolu enfeksiyonu"),
        ("N41.0", 0.15, "Akut prostatit"),
        ("N76.0", 0.10, "Akut vajinit"),
        ("N20.0", 0.08, "Böbrek taşı"),
    ],
    "yan ağrısı": [
        ("N20.0", 0.30, "Böbrek taşı"),
        ("N10", 0.25, "Akut piyelonefrit"),
        ("N39.0", 0.10, "İdrar yolu enfeksiyonu"),
        ("M54.5", 0.10, "Bel ağrısı"),
    ],

    # Dermatological
    "döküntü": [
        ("R21", 0.20, "Döküntü"),
        ("L30.9", 0.18, "Dermatit"),
        ("L50.9", 0.15, "Ürtiker"),
        ("T78.4", 0.12, "Alerji"),
        ("L20.9", 0.10, "Atopik dermatit"),
        ("L40.0", 0.08, "Psoriazis"),
        ("B02.9", 0.05, "Zona"),
    ],
    "kaşıntı": [
        ("L30.9", 0.20, "Dermatit"),
        ("L50.9", 0.18, "Ürtiker"),
        ("T78.4", 0.15, "Alerji"),
        ("L20.9", 0.12, "Atopik dermatit"),
        ("K76.0", 0.05, "Yağlı karaciğer"),
        ("N18.9", 0.05, "Kronik böbrek hastalığı"),
        ("E03.9", 0.05, "Hipotiroidizm"),
    ],

    # ENT / Ear
    "işitme kaybı": [
        ("H91.9", 0.25, "İşitme kaybı, tanımlanmamış"),
        ("H90.5", 0.20, "Sensorinöral işitme kaybı"),
        ("H90.3", 0.15, "Bilateral sensorinöral işitme kaybı"),
        ("H91.1", 0.12, "Presbiyakuzi"),
        ("H66.9", 0.10, "Otitis media"),
        ("H61.2", 0.08, "Serümen tıkacı"),
        ("H81.0", 0.05, "Meniere hastalığı"),
    ],
    "kulak ağrısı": [
        ("H66.9", 0.35, "Otitis media"),
        ("H65.9", 0.20, "Seröz otitis media"),
        ("H61.2", 0.12, "Serümen tıkacı"),
        ("J02.9", 0.10, "Akut farenjit"),
        ("J03.9", 0.08, "Akut tonsillit"),
    ],
    "çınlama": [
        ("H93.1", 0.30, "Tinnitus"),
        ("H90.5", 0.15, "Sensorinöral işitme kaybı"),
        ("H81.0", 0.12, "Meniere hastalığı"),
        ("I10", 0.10, "Hipertansiyon"),
        ("D50.9", 0.08, "Demir eksikliği anemisi"),
    ],

    # Psychiatric
    "uykusuzluk": [
        ("G47.0", 0.30, "Uykusuzluk"),
        ("F51.0", 0.20, "Organik olmayan uykusuzluk"),
        ("F41.1", 0.15, "Yaygın anksiyete bozukluğu"),
        ("F32.9", 0.12, "Depresyon"),
        ("E05.9", 0.05, "Hipertiroidizm"),
    ],
    "mutsuzluk": [
        ("F32.9", 0.35, "Depresif epizod"),
        ("F33.9", 0.20, "Tekrarlayan depresif bozukluk"),
        ("F41.1", 0.15, "Yaygın anksiyete bozukluğu"),
        ("F41.9", 0.10, "Anksiyete bozukluğu"),
    ],
    "endişe": [
        ("F41.1", 0.35, "Yaygın anksiyete bozukluğu"),
        ("F41.0", 0.20, "Panik bozukluk"),
        ("F41.9", 0.15, "Anksiyete bozukluğu"),
        ("F32.9", 0.10, "Depresyon"),
    ],

    # General / Other
    "kanamalı": [
        ("K92.0", 0.15, "Hematemez"),
        ("K92.1", 0.15, "Melena"),
        ("R04.0", 0.12, "Burun kanaması"),
        ("R31.9", 0.12, "Hematüri"),
        ("D69.6", 0.10, "Trombositopeni"),
    ],
    "şişlik": [
        ("T78.4", 0.15, "Alerji"),
        ("L50.9", 0.12, "Ürtiker"),
        ("I50.9", 0.10, "Kalp yetmezliği"),
        ("I80.2", 0.10, "Derin ven trombozu"),
        ("M25.5", 0.10, "Eklem ağrısı"),
        ("E03.9", 0.08, "Hipotiroidizm"),
    ],
    "iştahsızlık": [
        ("F32.9", 0.15, "Depresyon"),
        ("K29.7", 0.12, "Gastrit"),
        ("C16.9", 0.08, "Mide kanseri"),
        ("N18.9", 0.07, "Kronik böbrek hastalığı"),
        ("R63.4", 0.10, "Kilo kaybı"),
    ],
    "terleme": [
        ("E05.9", 0.20, "Hipertiroidizm"),
        ("N95.1", 0.15, "Menopoz"),
        ("E11", 0.12, "Diyabet (hipoglisemi)"),
        ("A15.0", 0.08, "Tüberküloz"),
        ("F41.0", 0.10, "Panik bozukluk"),
        ("I21.9", 0.08, "Miyokard infarktüsü"),
    ],
}

# ─── Differential Diagnosis Rules ────────────────────────────────────────────

# For a given primary diagnosis, list differential diagnoses to rule out
DIFFERENTIAL_RULES: dict[str, list[dict]] = {
    # MI differentials
    "I21": [
        {"code": "I20.9", "name_tr": "Angina pektoris", "reason": "Benzer göğüs ağrısı, EKG ve troponin ile ayırt edilir"},
        {"code": "I20.0", "name_tr": "Unstabil angina", "reason": "Troponin negatif MI benzeri tablo"},
        {"code": "R07.4", "name_tr": "Göğüs ağrısı, tanımlanmamış", "reason": "Non-kardiyak göğüs ağrısı ekarte edilmeli"},
        {"code": "I26.9", "name_tr": "Pulmoner emboli", "reason": "Dispne ve göğüs ağrısı ile benzer tablo"},
        {"code": "K21.0", "name_tr": "Gastroözofageal reflü", "reason": "Epigastrik ağrı MI'ı taklit edebilir"},
        {"code": "I42.9", "name_tr": "Kardiyomiyopati", "reason": "Troponin yüksekliği ile benzer bulgu"},
        {"code": "J93.9", "name_tr": "Pnömotoraks", "reason": "Ani başlangıçlı göğüs ağrısı"},
        {"code": "I71.0" if False else "I25.1", "name_tr": "Aterosklerotik kalp hastalığı", "reason": "Altta yatan kronik iskemi"},
    ],
    "I21.0": [
        {"code": "I20.9", "name_tr": "Angina pektoris", "reason": "Benzer göğüs ağrısı"},
        {"code": "I20.0", "name_tr": "Unstabil angina", "reason": "Troponin negatif MI benzeri tablo"},
        {"code": "R07.4", "name_tr": "Göğüs ağrısı", "reason": "Non-kardiyak nedenler ekarte edilmeli"},
        {"code": "I26.9", "name_tr": "Pulmoner emboli", "reason": "Göğüs ağrısı + dispne"},
    ],
    "I21.9": [
        {"code": "I20.9", "name_tr": "Angina pektoris", "reason": "Benzer göğüs ağrısı"},
        {"code": "I20.0", "name_tr": "Unstabil angina", "reason": "Troponin negatif MI benzeri tablo"},
        {"code": "R07.4", "name_tr": "Göğüs ağrısı", "reason": "Non-kardiyak nedenler ekarte edilmeli"},
        {"code": "I26.9", "name_tr": "Pulmoner emboli", "reason": "Göğüs ağrısı + dispne"},
        {"code": "K21.0", "name_tr": "Gastroözofageal reflü", "reason": "Epigastrik ağrı MI'ı taklit edebilir"},
    ],

    # Pneumonia differentials
    "J18": [
        {"code": "J20.9", "name_tr": "Akut bronşit", "reason": "Öksürük + ateş, radyolojik olarak ayrılır"},
        {"code": "J06.9", "name_tr": "Akut üst solunum yolu enfeksiyonu", "reason": "Hafif seyirli solunum yolu enfeksiyonu"},
        {"code": "I50.9", "name_tr": "Kalp yetmezliği", "reason": "Dispne + akciğer bulguları benzer olabilir"},
        {"code": "I26.9", "name_tr": "Pulmoner emboli", "reason": "Nefes darlığı, ateş olabilir"},
        {"code": "A15.0", "name_tr": "Akciğer tüberkülozu", "reason": "Kronik öksürük, balgam, ateş"},
        {"code": "C34.9", "name_tr": "Akciğer kanseri", "reason": "Tekrarlayan pnömoni post-obstrüktif olabilir"},
    ],
    "J18.9": [
        {"code": "J20.9", "name_tr": "Akut bronşit", "reason": "Öksürük + ateş, radyolojik olarak ayrılır"},
        {"code": "J06.9", "name_tr": "Akut üst solunum yolu enfeksiyonu", "reason": "Hafif seyirli solunum yolu enfeksiyonu"},
        {"code": "I50.9", "name_tr": "Kalp yetmezliği", "reason": "Dispne + akciğer bulguları benzer olabilir"},
        {"code": "I26.9", "name_tr": "Pulmoner emboli", "reason": "Nefes darlığı, ateş olabilir"},
        {"code": "A15.0", "name_tr": "Akciğer tüberkülozu", "reason": "Kronik öksürük, balgam, ateş"},
    ],

    # Hypertension differentials
    "I10": [
        {"code": "I11.9", "name_tr": "Hipertansif kalp hastalığı", "reason": "Uzun süreli HT'nin kalp komplikasyonu"},
        {"code": "E05.9", "name_tr": "Hipertiroidizm", "reason": "Sekonder hipertansiyon nedeni"},
        {"code": "N18.9", "name_tr": "Kronik böbrek hastalığı", "reason": "Renal nedenli sekonder HT"},
        {"code": "E66.9", "name_tr": "Obezite", "reason": "HT'ye katkıda bulunan komorbidite"},
    ],

    # Diabetes differentials
    "E11": [
        {"code": "E10.9", "name_tr": "Tip 1 diabetes mellitus", "reason": "Genç yaşta başlangıç, otoimmün"},
        {"code": "E13.9", "name_tr": "Diğer diabetes mellitus", "reason": "Sekonder diyabet (steroid, pankreatit)"},
        {"code": "E03.9", "name_tr": "Hipotiroidizm", "reason": "Metabolik sendrom birlikteliği"},
        {"code": "E78.0", "name_tr": "Hiperkolesterolemi", "reason": "Sıklıkla eşlik eden metabolik bozukluk"},
    ],

    # Headache differentials
    "R51": [
        {"code": "G43.9", "name_tr": "Migren", "reason": "Tekrarlayan, zonklayıcı baş ağrısı"},
        {"code": "I10", "name_tr": "Hipertansiyon", "reason": "HT'ye bağlı baş ağrısı"},
        {"code": "I63.9", "name_tr": "Serebral infarktüs", "reason": "Ani başlangıçlı şiddetli baş ağrısı"},
        {"code": "G40.9", "name_tr": "Epilepsi", "reason": "Post-iktal baş ağrısı"},
        {"code": "H40.9", "name_tr": "Glokom", "reason": "Akut glokom baş ağrısına neden olabilir"},
    ],

    # COPD differentials
    "J44": [
        {"code": "J45.9", "name_tr": "Astım", "reason": "Reversibl hava yolu obstrüksiyonu"},
        {"code": "I50.9", "name_tr": "Kalp yetmezliği", "reason": "Dispne, öksürük benzer semptomlar"},
        {"code": "C34.9", "name_tr": "Akciğer kanseri", "reason": "KOAH hastalarında artmış risk"},
        {"code": "J84.1", "name_tr": "İdiyopatik pulmoner fibrozis", "reason": "Progressif dispne"},
        {"code": "I26.9", "name_tr": "Pulmoner emboli", "reason": "Ani dispne alevlenmesi"},
    ],
    "J44.1": [
        {"code": "J45.9", "name_tr": "Astım", "reason": "Reversibl hava yolu obstrüksiyonu"},
        {"code": "I50.9", "name_tr": "Kalp yetmezliği", "reason": "Dispne, öksürük benzer semptomlar"},
        {"code": "J18.9", "name_tr": "Pnömoni", "reason": "Ateş + öksürük alevlenmeyi taklit edebilir"},
    ],

    # Asthma differentials
    "J45": [
        {"code": "J44.1", "name_tr": "KOAH alevlenmesi", "reason": "İrreversibl hava yolu obstrüksiyonu"},
        {"code": "I50.9", "name_tr": "Kalp yetmezliği", "reason": "Kardiyak astım benzeri tablo"},
        {"code": "I26.9", "name_tr": "Pulmoner emboli", "reason": "Ani dispne"},
        {"code": "K21.0", "name_tr": "Gastroözofageal reflü", "reason": "Reflüye bağlı öksürük ve hırıltı"},
    ],
    "J45.9": [
        {"code": "J44.1", "name_tr": "KOAH alevlenmesi", "reason": "İrreversibl hava yolu obstrüksiyonu"},
        {"code": "I50.9", "name_tr": "Kalp yetmezliği", "reason": "Kardiyak astım benzeri tablo"},
    ],

    # Appendicitis differentials
    "K35": [
        {"code": "K80.2", "name_tr": "Safra kesesi taşı", "reason": "Sağ üst kadran ağrısı ayırt edilmeli"},
        {"code": "N39.0", "name_tr": "İdrar yolu enfeksiyonu", "reason": "Alt karın ağrısı ile benzer tablo"},
        {"code": "K57.9", "name_tr": "Divertiküler hastalık", "reason": "Sol alt kadran ağrısı (sağ tarafta nadir)"},
        {"code": "A09", "name_tr": "Gastroenterit", "reason": "Karın ağrısı + ishal"},
        {"code": "N80.9", "name_tr": "Endometriozis", "reason": "Kadınlarda pelvik ağrı"},
    ],
    "K35.8": [
        {"code": "K80.2", "name_tr": "Safra kesesi taşı", "reason": "Sağ üst kadran ağrısı"},
        {"code": "N39.0", "name_tr": "İdrar yolu enfeksiyonu", "reason": "Alt karın ağrısı"},
        {"code": "A09", "name_tr": "Gastroenterit", "reason": "Karın ağrısı + bulantı"},
    ],

    # UTI differentials
    "N39": [
        {"code": "N10", "name_tr": "Akut piyelonefrit", "reason": "Komplike İYE, ateş + yan ağrısı"},
        {"code": "N41.0", "name_tr": "Akut prostatit", "reason": "Erkeklerde alt üriner semptomlar"},
        {"code": "N76.0", "name_tr": "Akut vajinit", "reason": "Kadınlarda benzer semptomlar"},
        {"code": "N20.0", "name_tr": "Böbrek taşı", "reason": "Hematüri ile benzer tablo"},
    ],
    "N39.0": [
        {"code": "N10", "name_tr": "Akut piyelonefrit", "reason": "Komplike İYE"},
        {"code": "N41.0", "name_tr": "Akut prostatit", "reason": "Erkeklerde alt üriner semptomlar"},
        {"code": "N20.0", "name_tr": "Böbrek taşı", "reason": "Hematüri ile benzer tablo"},
    ],

    # Depression differentials
    "F32": [
        {"code": "F33.9", "name_tr": "Tekrarlayan depresif bozukluk", "reason": "Birden fazla epizod varsa"},
        {"code": "F31.9", "name_tr": "Bipolar bozukluk", "reason": "Manik/hipomanik dönem sorgulanmalı"},
        {"code": "E03.9", "name_tr": "Hipotiroidizm", "reason": "Depresyon benzeri semptomlar yapabilir"},
        {"code": "D50.9", "name_tr": "Demir eksikliği anemisi", "reason": "Halsizlik ve depresif duygudurum"},
    ],
    "F32.9": [
        {"code": "F33.9", "name_tr": "Tekrarlayan depresif bozukluk", "reason": "Birden fazla epizod varsa"},
        {"code": "F31.9", "name_tr": "Bipolar bozukluk", "reason": "Manik dönem sorgulanmalı"},
        {"code": "E03.9", "name_tr": "Hipotiroidizm", "reason": "Tiroid fonksiyon testi önerilir"},
    ],

    # Hearing loss differentials
    "H91.9": [
        {"code": "H90.5", "name_tr": "Sensorinöral işitme kaybı", "reason": "Odyometri ile tip belirlenir"},
        {"code": "H90.3", "name_tr": "Bilateral sensorinöral işitme kaybı", "reason": "İki taraflı tutulum"},
        {"code": "H91.1", "name_tr": "Presbiyakuzi", "reason": "Yaşa bağlı işitme kaybı"},
        {"code": "H66.9", "name_tr": "Otitis media", "reason": "İletim tipi işitme kaybı nedeni"},
        {"code": "H61.2", "name_tr": "Serümen tıkacı", "reason": "Basit, reversibl neden"},
        {"code": "H81.0", "name_tr": "Meniere hastalığı", "reason": "Vertigo + tinnitus + işitme kaybı"},
    ],

    # Iron deficiency anemia differentials
    "D50.9": [
        {"code": "D64.9", "name_tr": "Anemi, tanımlanmamış", "reason": "Diğer anemi türleri ekarte edilmeli"},
        {"code": "K25.9", "name_tr": "Gastrik ülser", "reason": "GİS kanamasına bağlı demir eksikliği"},
        {"code": "C18.9", "name_tr": "Kolon kanseri", "reason": "Gizli GİS kanaması nedeni"},
        {"code": "K50.9", "name_tr": "Crohn hastalığı", "reason": "Malabsorpsiyon + GİS kanama"},
        {"code": "N92.0", "name_tr": "Aşırı menstruasyon", "reason": "Kadınlarda sık demir eksikliği nedeni"},
    ],
}


# ─── Diagnosis-Treatment Consistency Rules ───────────────────────────────────

DIAGNOSIS_MEDICATION_MAP: dict[str, list[str]] = {
    "I10": ["antihipertansif", "amlodipine", "ramipril", "losartan", "valsartan", "enalapril",
            "metoprolol", "atenolol", "hidroklorotiazid", "indapamid", "nifedipin", "diltiyazem"],
    "E11": ["metformin", "gliclazide", "glimepirid", "insülin", "sitagliptin", "empagliflozin",
            "dapagliflozin", "pioglitazon", "linagliptin", "semaglutid", "liraglutid"],
    "E10.9": ["insülin", "insulin lispro", "insulin glargine", "insulin aspart"],
    "J45.9": ["salbutamol", "budesonid", "flutikazon", "montelukast", "ipratropium",
              "formoterol", "salmeterol", "beklometazon", "seretide", "symbicort"],
    "J44.1": ["salbutamol", "ipratropium", "tiotropium", "budesonid", "formoterol",
              "prednizolon", "antibiyotik", "salmeterol"],
    "I48.9": ["warfarin", "dabigatran", "rivaroksaban", "apiksaban", "amiodaron",
              "digoksin", "metoprolol", "diltiazem", "edoksaban"],
    "I50.9": ["furosemid", "spironolakton", "ramipril", "enalapril", "karvedilol",
              "metoprolol", "bisoprolol", "sakubitril", "digoksin", "ivabradine"],
    "F32.9": ["sertralin", "fluoksetin", "essitalopram", "paroksetin", "venlafaksin",
              "duloksetin", "mirtazapin", "bupropion", "sitalopram", "amitriptilin"],
    "F41.1": ["sertralin", "essitalopram", "paroksetin", "venlafaksin", "buspiron",
              "alprazolam", "diazepam", "duloksetin"],
    "K21.0": ["omeprazol", "lansoprazol", "pantoprazol", "rabeprazol", "esomeprazol",
              "famotidin", "ranitidin", "aljinat"],
    "K29.7": ["omeprazol", "lansoprazol", "pantoprazol", "sukralfat", "famotidin",
              "klaritromisin", "amoksisilin", "bizmut"],
    "E03.9": ["levotiroksin", "tiroksin"],
    "D50.9": ["demir sülfat", "demir fumarat", "demir glukonat", "ferröz sülfat",
              "intravenöz demir", "C vitamini"],
    "E78.0": ["atorvastatin", "rosuvastatin", "simvastatin", "ezetimib", "pravastatin",
              "fenofibrat"],
    "I21.9": ["aspirin", "klopidogrel", "tikagrelor", "heparin", "enoksaparin",
              "atorvastatin", "metoprolol", "ramipril", "nitrogliserin", "morfin"],
    "I20.9": ["aspirin", "nitrogliserin", "metoprolol", "atorvastatin", "klopidogrel",
              "amlodipine", "ramipril", "ivabradin"],
    "N39.0": ["amoksisilin", "siprofloksasin", "levofloksasin", "nitrofurantoin",
              "trimetoprim", "fosfomisin", "sefalosporin", "sefuroksim"],
    "M54.5": ["ibuprofen", "naproksen", "diklofenak", "parasetamol", "miyorelaksan",
              "tizanidin", "siklobenzaprin", "gabapentin", "pregabalin"],
    "G43.9": ["sumatriptan", "rizatriptan", "ergotamin", "parasetamol", "ibuprofen",
              "topiramat", "valproat", "propranolol", "amitriptilin", "flunarizin"],
    "J18.9": ["amoksisilin", "amoksisilin-klavulanat", "azitromisin", "klaritromisin",
              "levofloksasin", "moksifloksasin", "seftriakson", "doksisiklin"],
}

DIAGNOSIS_PROCEDURE_MAP: dict[str, list[str]] = {
    "I21.9": ["EKG", "troponin", "ekokardiyografi", "koroner anjiyografi", "PKG",
              "KABG", "tam kan sayımı", "BNP"],
    "I21.0": ["EKG", "troponin", "koroner anjiyografi", "PKG", "KABG", "ekokardiyografi"],
    "I20.9": ["EKG", "troponin", "efor testi", "koroner anjiyografi", "ekokardiyografi"],
    "I10": ["kan basıncı ölçümü", "EKG", "ekokardiyografi", "böbrek fonksiyon testi",
            "fundoskopi", "idrar analizi", "elektrolitler"],
    "E11": ["HbA1c", "açlık kan şekeri", "tokluk kan şekeri", "OGTT", "böbrek fonksiyon testi",
            "göz dibi muayenesi", "ayak muayenesi", "lipid profili", "idrar mikroalbumin"],
    "J45.9": ["solunum fonksiyon testi", "PEF ölçümü", "alerji testi", "IgE",
              "metakolin testi", "akciğer grafisi"],
    "J44.1": ["solunum fonksiyon testi", "akciğer grafisi", "arter kan gazı",
              "tam kan sayımı", "CRP", "balgam kültürü"],
    "J18.9": ["akciğer grafisi", "tam kan sayımı", "CRP", "prokalsitonin",
              "balgam kültürü", "kan kültürü", "arter kan gazı"],
    "K35.8": ["karın USG", "abdomen BT", "tam kan sayımı", "CRP", "idrar analizi"],
    "N39.0": ["idrar analizi", "idrar kültürü", "tam kan sayımı", "CRP"],
    "D50.9": ["tam kan sayımı", "ferritin", "demir", "TDBK", "transferin saturasyonu",
              "periferik yayma", "retikülosit"],
    "H91.9": ["odyometri", "timpanometri", "ABR", "MRI", "otoskopi"],
    "F32.9": ["Beck depresyon ölçeği", "Hamilton depresyon ölçeği", "tiroid fonksiyon testi",
              "tam kan sayımı", "B12", "folat"],
}


# ─── TF-IDF Engine ───────────────────────────────────────────────────────────

class _ICDSearchEngine:
    """Lazy-initialized TF-IDF search engine over the ICD-10 knowledge base."""

    def __init__(self) -> None:
        self._vectorizer: Optional[TfidfVectorizer] = None
        self._tfidf_matrix = None
        self._entries: list[dict] = []
        self._initialized = False

    def _ensure_initialized(self) -> None:
        if self._initialized:
            return

        # Build corpus: combine code + name_tr + name_en + synonyms
        self._entries = list(ICD10_KNOWLEDGE_BASE)
        corpus: list[str] = []

        # Build reverse synonym lookup: code -> extra terms
        code_synonyms: dict[str, list[str]] = {}
        for syn, code in SYNONYM_TO_ICD.items():
            code_synonyms.setdefault(code, []).append(syn)
        for abbr, syns in ABBREVIATIONS.items():
            # Find which code the abbreviation maps to
            for syn in syns:
                norm_syn = _normalize(syn)
                for entry in self._entries:
                    if _normalize(entry["name_tr"]).find(norm_syn) >= 0:
                        code_synonyms.setdefault(entry["code"], []).append(abbr)
                        for s in syns:
                            code_synonyms.setdefault(entry["code"], []).append(s)
                        break

        for entry in self._entries:
            parts = [
                entry["code"],
                entry["name_tr"],
                entry.get("name_en", "") or "",
            ]
            # Add synonyms for this code
            extra = code_synonyms.get(entry["code"], [])
            parts.extend(extra)
            # Normalize everything
            text = " ".join(_normalize(p) for p in parts if p)
            corpus.append(text)

        self._vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 4),
            max_features=50000,
            lowercase=True,
        )
        self._tfidf_matrix = self._vectorizer.fit_transform(corpus)
        self._initialized = True
        logger.info("ICD-10 TF-IDF search engine initialized with %d entries", len(self._entries))

    def search(self, query: str, top_k: int = 10) -> list[dict]:
        self._ensure_initialized()

        # Expand abbreviations in query
        query_normalized = _normalize(query)
        query_upper = query.strip().upper()

        # Check if query is an abbreviation
        expanded_terms = [query_normalized]
        if query_upper in ABBREVIATIONS:
            for syn in ABBREVIATIONS[query_upper]:
                expanded_terms.append(_normalize(syn))

        # Check synonym direct match
        direct_icd = SYNONYM_TO_ICD.get(query.strip().lower())
        if not direct_icd:
            direct_icd = SYNONYM_TO_ICD.get(_normalize(query.strip()))

        # Score via TF-IDF for each expanded term and take the max per entry
        best_scores = np.zeros(len(self._entries))
        for term in expanded_terms:
            q_vec = self._vectorizer.transform([term])
            scores = cosine_similarity(q_vec, self._tfidf_matrix).flatten()
            best_scores = np.maximum(best_scores, scores)

        # Boost direct code matches
        for i, entry in enumerate(self._entries):
            code_norm = entry["code"].lower().replace(".", "")
            q_norm = query_normalized.replace(".", "")
            if code_norm == q_norm or entry["code"].lower() == query.strip().lower():
                best_scores[i] = max(best_scores[i], 0.99)
            elif code_norm.startswith(q_norm) and len(q_norm) >= 2:
                best_scores[i] = max(best_scores[i], 0.80)

        # Boost direct synonym/abbreviation matches
        if direct_icd:
            for i, entry in enumerate(self._entries):
                if entry["code"] == direct_icd:
                    best_scores[i] = max(best_scores[i], 0.95)

        # If query is an abbreviation, boost all related codes
        if query_upper in ABBREVIATIONS:
            for syn in ABBREVIATIONS[query_upper]:
                syn_icd = SYNONYM_TO_ICD.get(syn.lower()) or SYNONYM_TO_ICD.get(_normalize(syn))
                if syn_icd:
                    for i, entry in enumerate(self._entries):
                        if entry["code"] == syn_icd:
                            best_scores[i] = max(best_scores[i], 0.90)

        # Get top-k indices
        top_indices = np.argsort(best_scores)[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = float(best_scores[idx])
            if score < 0.01:
                continue
            entry = self._entries[idx]
            results.append({
                "code": entry["code"],
                "name_tr": entry["name_tr"],
                "name_en": entry.get("name_en", ""),
                "similarity_score": round(score, 4),
            })

        return results


# Singleton engine instance
_search_engine = _ICDSearchEngine()


# ─── Public API Functions ────────────────────────────────────────────────────


def smart_icd_search(query: str, top_k: int = 10) -> list[dict]:
    """
    Fuzzy Turkish search across ICD-10 codes using TF-IDF + cosine similarity.

    Handles typos, abbreviations, and synonyms.

    Args:
        query: Search query in Turkish (or code, abbreviation, synonym)
        top_k: Maximum number of results to return

    Returns:
        List of dicts: [{code, name_tr, name_en, similarity_score}]
    """
    if not query or not query.strip():
        return []

    return _search_engine.search(query.strip(), top_k=top_k)


def suggest_diagnoses_from_symptoms(
    symptoms: list[str],
    age: int,
    gender: str,
) -> list[dict]:
    """
    Suggest diagnoses based on a list of symptoms, considering age and gender.

    Args:
        symptoms: List of symptom descriptions in Turkish
        age: Patient age in years
        gender: Patient gender ('M' or 'F')

    Returns:
        List of dicts sorted by probability:
        [{icd_code, diagnosis_name_tr, probability, key_symptoms_matched}]
    """
    if not symptoms:
        return []

    # Accumulate scores per ICD code
    code_scores: dict[str, dict] = {}  # code -> {score, name_tr, matched_symptoms}

    for symptom in symptoms:
        symptom_norm = _normalize(symptom)
        # Find best matching symptom key
        best_key = None
        best_sim = 0.0

        for key in SYMPTOM_DIAGNOSIS_MAP:
            key_norm = _normalize(key)
            # Exact match
            if symptom_norm == key_norm:
                best_key = key
                best_sim = 1.0
                break
            # Substring match
            if key_norm in symptom_norm or symptom_norm in key_norm:
                sim = len(key_norm) / max(len(symptom_norm), 1)
                if sim > best_sim:
                    best_sim = sim
                    best_key = key

        if best_key and best_sim > 0.3:
            for icd_code, weight, name_tr in SYMPTOM_DIAGNOSIS_MAP[best_key]:
                if icd_code not in code_scores:
                    code_scores[icd_code] = {
                        "score": 0.0,
                        "name_tr": name_tr,
                        "matched_symptoms": [],
                    }
                code_scores[icd_code]["score"] += weight * best_sim
                code_scores[icd_code]["matched_symptoms"].append(symptom)

    # Apply age/gender adjustments
    for code, data in code_scores.items():
        # Pediatric adjustments
        if age < 18:
            if code in ("N40", "C61", "N95.1"):
                data["score"] *= 0.01
            if code in ("J06.9", "H66.9", "R56.0"):
                data["score"] *= 1.3
        # Elderly adjustments
        if age > 65:
            if code in ("I21.9", "I50.9", "I63.9", "H91.1", "M81.9", "G30.9"):
                data["score"] *= 1.2
            if code in ("F90.0",):
                data["score"] *= 0.1
        # Gender adjustments
        if gender.upper() == "M":
            if code in ("N76.0", "N80.9", "N92.0", "O80", "O82", "O03.9", "O14.9"):
                data["score"] *= 0.01
            if code in ("N40", "N41.0", "C61"):
                data["score"] *= 1.2
        elif gender.upper() == "F":
            if code in ("N40", "N41.0", "C61"):
                data["score"] *= 0.01
            if code in ("D50.9", "N92.0"):
                data["score"] *= 1.2

    # Normalize probabilities to [0, 1]
    if not code_scores:
        return []

    max_score = max(d["score"] for d in code_scores.values())
    if max_score <= 0:
        return []

    results = []
    for code, data in code_scores.items():
        prob = min(data["score"] / max_score, 1.0)
        if prob < 0.05:
            continue
        results.append({
            "icd_code": code,
            "diagnosis_name_tr": data["name_tr"],
            "probability": round(prob, 4),
            "key_symptoms_matched": list(set(data["matched_symptoms"])),
        })

    results.sort(key=lambda x: x["probability"], reverse=True)
    return results


def get_differential_diagnosis(
    primary_icd: str,
    symptoms: list[str],
) -> list[dict]:
    """
    Given a suspected primary diagnosis, suggest differential diagnoses to consider.

    Args:
        primary_icd: Primary ICD-10 code (e.g. 'I21.9')
        symptoms: Current symptoms list

    Returns:
        List of differential diagnoses:
        [{icd_code, diagnosis_name_tr, reason, relevance_score}]
    """
    # Look up differentials - try exact code first, then parent code
    differentials = DIFFERENTIAL_RULES.get(primary_icd)
    if not differentials:
        # Try parent code (e.g., I21.9 -> I21)
        parent = primary_icd.split(".")[0]
        differentials = DIFFERENTIAL_RULES.get(parent, [])

    if not differentials:
        # Fallback: use symptom-based suggestions excluding the primary diagnosis
        if symptoms:
            suggestions = suggest_diagnoses_from_symptoms(symptoms, age=40, gender="M")
            return [
                {
                    "icd_code": s["icd_code"],
                    "diagnosis_name_tr": s["diagnosis_name_tr"],
                    "reason": f"Mevcut semptomlarla uyumlu alternatif tanı (eşleşen: {', '.join(s['key_symptoms_matched'])})",
                    "relevance_score": round(s["probability"], 4),
                }
                for s in suggestions
                if s["icd_code"] != primary_icd
            ][:10]
        return []

    # Score differentials based on symptom overlap
    results = []
    for diff in differentials:
        relevance = 0.5  # base relevance

        # Check if any current symptoms align with this differential
        if symptoms:
            diff_code = diff["code"]
            for symptom in symptoms:
                symptom_norm = _normalize(symptom)
                for key, mappings in SYMPTOM_DIAGNOSIS_MAP.items():
                    key_norm = _normalize(key)
                    if symptom_norm == key_norm or key_norm in symptom_norm or symptom_norm in key_norm:
                        for mapped_code, weight, _ in mappings:
                            if mapped_code == diff_code:
                                relevance += weight * 0.5
                                break

        relevance = min(relevance, 1.0)
        results.append({
            "icd_code": diff["code"],
            "diagnosis_name_tr": diff["name_tr"],
            "reason": diff["reason"],
            "relevance_score": round(relevance, 4),
        })

    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return results


def validate_diagnosis_consistency(
    diagnoses: list[str],
    medications: list[str],
    procedures: list[str],
) -> dict:
    """
    Check if prescribed medications and procedures are consistent with the diagnoses.

    Args:
        diagnoses: List of ICD-10 codes
        medications: List of prescribed medication names
        procedures: List of performed/ordered procedure names

    Returns:
        dict with:
        - is_consistent: bool
        - warnings: list of inconsistency warnings
        - suggestions: list of suggested additions
        - matched_medications: dict of diagnosis -> matched medications
        - matched_procedures: dict of diagnosis -> matched procedures
    """
    warnings: list[str] = []
    suggestions: list[str] = []
    matched_medications: dict[str, list[str]] = {}
    matched_procedures: dict[str, list[str]] = {}

    medications_norm = [_normalize(m) for m in medications]
    procedures_norm = [_normalize(p) for p in procedures]

    for diag_code in diagnoses:
        # Check medications
        expected_meds = DIAGNOSIS_MEDICATION_MAP.get(diag_code, [])
        matched_meds = []
        if expected_meds:
            for med in medications:
                med_norm = _normalize(med)
                for expected in expected_meds:
                    expected_norm = _normalize(expected)
                    if expected_norm in med_norm or med_norm in expected_norm:
                        matched_meds.append(med)
                        break

            if not matched_meds and medications:
                diag_name = _ICD_BY_CODE.get(diag_code, {}).get("name_tr", diag_code)
                warnings.append(
                    f"'{diag_code} ({diag_name})' tanısı için reçetede uygun ilaç bulunamadı. "
                    f"Beklenen ilaçlar: {', '.join(expected_meds[:5])}"
                )

        matched_medications[diag_code] = matched_meds

        # Check procedures
        expected_procs = DIAGNOSIS_PROCEDURE_MAP.get(diag_code, [])
        matched_procs = []
        if expected_procs:
            for proc in procedures:
                proc_norm = _normalize(proc)
                for expected in expected_procs:
                    expected_norm = _normalize(expected)
                    if expected_norm in proc_norm or proc_norm in expected_norm:
                        matched_procs.append(proc)
                        break

            if not matched_procs:
                diag_name = _ICD_BY_CODE.get(diag_code, {}).get("name_tr", diag_code)
                suggestions.append(
                    f"'{diag_code} ({diag_name})' tanısı için şu tetkikler önerilir: "
                    f"{', '.join(expected_procs[:5])}"
                )

        matched_procedures[diag_code] = matched_procs

    # Check for medications without matching diagnosis
    all_expected_codes: set[str] = set()
    for med in medications:
        med_norm = _normalize(med)
        found = False
        for code, expected_meds in DIAGNOSIS_MEDICATION_MAP.items():
            for expected in expected_meds:
                if _normalize(expected) in med_norm or med_norm in _normalize(expected):
                    all_expected_codes.add(code)
                    if code in diagnoses:
                        found = True
                    break
            if found:
                break
        if not found and all_expected_codes:
            missing_codes = all_expected_codes - set(diagnoses)
            if missing_codes:
                for mc in list(missing_codes)[:2]:
                    mc_name = _ICD_BY_CODE.get(mc, {}).get("name_tr", mc)
                    warnings.append(
                        f"'{med}' ilacı '{mc} ({mc_name})' tanısı için uygundur "
                        f"ancak bu tanı listede bulunmuyor."
                    )
            all_expected_codes.clear()

    is_consistent = len(warnings) == 0

    return {
        "is_consistent": is_consistent,
        "warnings": warnings,
        "suggestions": suggestions,
        "matched_medications": matched_medications,
        "matched_procedures": matched_procedures,
    }
