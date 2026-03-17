"""
Seed script for laboratory test definitions.
Populates 40 common lab tests with Turkish names, reference ranges,
critical/panic values, and LOINC codes.

Usage:
    python -m services.hbys.laboratory.seed_lab_tests
"""
import logging
from database import SessionLocal, gen_id, unbound_session
from services.hbys.laboratory.models.test_definition import TestDefinition

logger = logging.getLogger(__name__)

# fmt: off
SEED_TESTS = [
    # ── HEMATOLOGY ──────────────────────────────────────────────────────────
    {
        "name_tr": "Hemoglobin (Hb)",
        "name_en": "Hemoglobin",
        "loinc_code": "718-7",
        "category": "hematology",
        "specimen_type": "blood",
        "unit": "g/dL",
        "ref_range_male_low": 13.5, "ref_range_male_high": 17.5,
        "ref_range_female_low": 12.0, "ref_range_female_high": 16.0,
        "ref_range_child_low": 11.0, "ref_range_child_high": 16.0,
        "critical_low": 7.0, "critical_high": 20.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Hematokrit (Hct)",
        "name_en": "Hematocrit",
        "loinc_code": "4544-3",
        "category": "hematology",
        "specimen_type": "blood",
        "unit": "%",
        "ref_range_male_low": 40.0, "ref_range_male_high": 54.0,
        "ref_range_female_low": 36.0, "ref_range_female_high": 48.0,
        "ref_range_child_low": 33.0, "ref_range_child_high": 45.0,
        "critical_low": 20.0, "critical_high": 60.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Lökosit (WBC)",
        "name_en": "White Blood Cell Count",
        "loinc_code": "6690-2",
        "category": "hematology",
        "specimen_type": "blood",
        "unit": "x10^3/uL",
        "ref_range_male_low": 4.5, "ref_range_male_high": 11.0,
        "ref_range_female_low": 4.5, "ref_range_female_high": 11.0,
        "ref_range_child_low": 5.0, "ref_range_child_high": 15.0,
        "critical_low": 2.0, "critical_high": 30.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Trombosit (PLT)",
        "name_en": "Platelet Count",
        "loinc_code": "777-3",
        "category": "hematology",
        "specimen_type": "blood",
        "unit": "x10^3/uL",
        "ref_range_male_low": 150.0, "ref_range_male_high": 400.0,
        "ref_range_female_low": 150.0, "ref_range_female_high": 400.0,
        "ref_range_child_low": 150.0, "ref_range_child_high": 450.0,
        "critical_low": 50.0, "critical_high": 1000.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Eritrosit (RBC)",
        "name_en": "Red Blood Cell Count",
        "loinc_code": "789-8",
        "category": "hematology",
        "specimen_type": "blood",
        "unit": "x10^6/uL",
        "ref_range_male_low": 4.5, "ref_range_male_high": 5.9,
        "ref_range_female_low": 4.0, "ref_range_female_high": 5.2,
        "ref_range_child_low": 3.8, "ref_range_child_high": 5.5,
        "critical_low": 2.0, "critical_high": 7.5,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "MCV (Ortalama Eritrosit Hacmi)",
        "name_en": "Mean Corpuscular Volume",
        "loinc_code": "787-2",
        "category": "hematology",
        "specimen_type": "blood",
        "unit": "fL",
        "ref_range_male_low": 80.0, "ref_range_male_high": 100.0,
        "ref_range_female_low": 80.0, "ref_range_female_high": 100.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Sedimantasyon (ESR)",
        "name_en": "Erythrocyte Sedimentation Rate",
        "loinc_code": "4537-7",
        "category": "hematology",
        "specimen_type": "blood",
        "unit": "mm/saat",
        "ref_range_male_low": 0.0, "ref_range_male_high": 15.0,
        "ref_range_female_low": 0.0, "ref_range_female_high": 20.0,
        "ref_range_child_low": 0.0, "ref_range_child_high": 10.0,
        "turnaround_minutes": 120,
    },

    # ── BIOCHEMISTRY ────────────────────────────────────────────────────────
    {
        "name_tr": "Glukoz (Aclik)",
        "name_en": "Fasting Glucose",
        "loinc_code": "2345-7",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mg/dL",
        "ref_range_male_low": 70.0, "ref_range_male_high": 100.0,
        "ref_range_female_low": 70.0, "ref_range_female_high": 100.0,
        "ref_range_child_low": 60.0, "ref_range_child_high": 100.0,
        "critical_low": 40.0, "critical_high": 500.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "HbA1c (Glikozile Hemoglobin)",
        "name_en": "Hemoglobin A1c",
        "loinc_code": "4548-4",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "%",
        "ref_range_male_low": 4.0, "ref_range_male_high": 5.6,
        "ref_range_female_low": 4.0, "ref_range_female_high": 5.6,
        "critical_high": 14.0,
        "turnaround_minutes": 120,
    },
    {
        "name_tr": "BUN (Kan Ure Azotu)",
        "name_en": "Blood Urea Nitrogen",
        "loinc_code": "3094-0",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mg/dL",
        "ref_range_male_low": 7.0, "ref_range_male_high": 20.0,
        "ref_range_female_low": 7.0, "ref_range_female_high": 20.0,
        "ref_range_child_low": 5.0, "ref_range_child_high": 18.0,
        "critical_high": 100.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Kreatinin",
        "name_en": "Creatinine",
        "loinc_code": "2160-0",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mg/dL",
        "ref_range_male_low": 0.7, "ref_range_male_high": 1.3,
        "ref_range_female_low": 0.6, "ref_range_female_high": 1.1,
        "ref_range_child_low": 0.3, "ref_range_child_high": 0.7,
        "critical_high": 10.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "AST (SGOT)",
        "name_en": "Aspartate Aminotransferase",
        "loinc_code": "1920-8",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "U/L",
        "ref_range_male_low": 0.0, "ref_range_male_high": 40.0,
        "ref_range_female_low": 0.0, "ref_range_female_high": 32.0,
        "ref_range_child_low": 0.0, "ref_range_child_high": 60.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "ALT (SGPT)",
        "name_en": "Alanine Aminotransferase",
        "loinc_code": "1742-6",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "U/L",
        "ref_range_male_low": 0.0, "ref_range_male_high": 41.0,
        "ref_range_female_low": 0.0, "ref_range_female_high": 33.0,
        "ref_range_child_low": 0.0, "ref_range_child_high": 45.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "GGT (Gamma GT)",
        "name_en": "Gamma-Glutamyl Transferase",
        "loinc_code": "2324-2",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "U/L",
        "ref_range_male_low": 0.0, "ref_range_male_high": 55.0,
        "ref_range_female_low": 0.0, "ref_range_female_high": 38.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "ALP (Alkalen Fosfataz)",
        "name_en": "Alkaline Phosphatase",
        "loinc_code": "6768-6",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "U/L",
        "ref_range_male_low": 40.0, "ref_range_male_high": 129.0,
        "ref_range_female_low": 35.0, "ref_range_female_high": 104.0,
        "ref_range_child_low": 100.0, "ref_range_child_high": 500.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Total Bilirubin",
        "name_en": "Total Bilirubin",
        "loinc_code": "1975-2",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mg/dL",
        "ref_range_male_low": 0.1, "ref_range_male_high": 1.2,
        "ref_range_female_low": 0.1, "ref_range_female_high": 1.2,
        "critical_high": 15.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Direkt Bilirubin",
        "name_en": "Direct Bilirubin",
        "loinc_code": "1968-7",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mg/dL",
        "ref_range_male_low": 0.0, "ref_range_male_high": 0.3,
        "ref_range_female_low": 0.0, "ref_range_female_high": 0.3,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Total Protein",
        "name_en": "Total Protein",
        "loinc_code": "2885-2",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "g/dL",
        "ref_range_male_low": 6.0, "ref_range_male_high": 8.3,
        "ref_range_female_low": 6.0, "ref_range_female_high": 8.3,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Albumin",
        "name_en": "Albumin",
        "loinc_code": "1751-7",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "g/dL",
        "ref_range_male_low": 3.5, "ref_range_male_high": 5.0,
        "ref_range_female_low": 3.5, "ref_range_female_high": 5.0,
        "critical_low": 1.5,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Urik Asit",
        "name_en": "Uric Acid",
        "loinc_code": "3084-1",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mg/dL",
        "ref_range_male_low": 3.4, "ref_range_male_high": 7.0,
        "ref_range_female_low": 2.4, "ref_range_female_high": 5.7,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "LDH (Laktat Dehidrogenaz)",
        "name_en": "Lactate Dehydrogenase",
        "loinc_code": "2532-0",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "U/L",
        "ref_range_male_low": 125.0, "ref_range_male_high": 220.0,
        "ref_range_female_low": 125.0, "ref_range_female_high": 220.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "CRP (C-Reaktif Protein)",
        "name_en": "C-Reactive Protein",
        "loinc_code": "1988-5",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mg/L",
        "ref_range_male_low": 0.0, "ref_range_male_high": 5.0,
        "ref_range_female_low": 0.0, "ref_range_female_high": 5.0,
        "critical_high": 200.0,
        "turnaround_minutes": 60,
    },

    # ── LIPID PANEL ─────────────────────────────────────────────────────────
    {
        "name_tr": "Total Kolesterol",
        "name_en": "Total Cholesterol",
        "loinc_code": "2093-3",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mg/dL",
        "ref_range_male_low": 0.0, "ref_range_male_high": 200.0,
        "ref_range_female_low": 0.0, "ref_range_female_high": 200.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "HDL Kolesterol",
        "name_en": "HDL Cholesterol",
        "loinc_code": "2085-9",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mg/dL",
        "ref_range_male_low": 40.0, "ref_range_male_high": 200.0,
        "ref_range_female_low": 50.0, "ref_range_female_high": 200.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "LDL Kolesterol",
        "name_en": "LDL Cholesterol",
        "loinc_code": "2089-1",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mg/dL",
        "ref_range_male_low": 0.0, "ref_range_male_high": 130.0,
        "ref_range_female_low": 0.0, "ref_range_female_high": 130.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Trigliserit",
        "name_en": "Triglycerides",
        "loinc_code": "2571-8",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mg/dL",
        "ref_range_male_low": 0.0, "ref_range_male_high": 150.0,
        "ref_range_female_low": 0.0, "ref_range_female_high": 150.0,
        "critical_high": 1000.0,
        "turnaround_minutes": 60,
    },

    # ── ELECTROLYTES ────────────────────────────────────────────────────────
    {
        "name_tr": "Sodyum (Na)",
        "name_en": "Sodium",
        "loinc_code": "2951-2",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mEq/L",
        "ref_range_male_low": 136.0, "ref_range_male_high": 145.0,
        "ref_range_female_low": 136.0, "ref_range_female_high": 145.0,
        "critical_low": 120.0, "critical_high": 160.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Potasyum (K)",
        "name_en": "Potassium",
        "loinc_code": "2823-3",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mEq/L",
        "ref_range_male_low": 3.5, "ref_range_male_high": 5.1,
        "ref_range_female_low": 3.5, "ref_range_female_high": 5.1,
        "critical_low": 2.5, "critical_high": 6.5,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Kalsiyum (Ca)",
        "name_en": "Calcium",
        "loinc_code": "17861-6",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "mg/dL",
        "ref_range_male_low": 8.6, "ref_range_male_high": 10.2,
        "ref_range_female_low": 8.6, "ref_range_female_high": 10.2,
        "critical_low": 6.0, "critical_high": 13.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Demir (Fe)",
        "name_en": "Iron",
        "loinc_code": "2498-4",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "ug/dL",
        "ref_range_male_low": 65.0, "ref_range_male_high": 175.0,
        "ref_range_female_low": 50.0, "ref_range_female_high": 170.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "Ferritin",
        "name_en": "Ferritin",
        "loinc_code": "2276-4",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "ng/mL",
        "ref_range_male_low": 30.0, "ref_range_male_high": 400.0,
        "ref_range_female_low": 13.0, "ref_range_female_high": 150.0,
        "turnaround_minutes": 120,
    },

    # ── HORMONES ────────────────────────────────────────────────────────────
    {
        "name_tr": "TSH (Tiroid Stimulan Hormon)",
        "name_en": "Thyroid Stimulating Hormone",
        "loinc_code": "3016-3",
        "category": "hormones",
        "specimen_type": "blood",
        "unit": "uIU/mL",
        "ref_range_male_low": 0.27, "ref_range_male_high": 4.2,
        "ref_range_female_low": 0.27, "ref_range_female_high": 4.2,
        "critical_low": 0.01, "critical_high": 50.0,
        "turnaround_minutes": 180,
    },
    {
        "name_tr": "Serbest T4 (fT4)",
        "name_en": "Free T4",
        "loinc_code": "3024-7",
        "category": "hormones",
        "specimen_type": "blood",
        "unit": "ng/dL",
        "ref_range_male_low": 0.93, "ref_range_male_high": 1.7,
        "ref_range_female_low": 0.93, "ref_range_female_high": 1.7,
        "turnaround_minutes": 180,
    },
    {
        "name_tr": "Serbest T3 (fT3)",
        "name_en": "Free T3",
        "loinc_code": "3051-0",
        "category": "hormones",
        "specimen_type": "blood",
        "unit": "pg/mL",
        "ref_range_male_low": 2.0, "ref_range_male_high": 4.4,
        "ref_range_female_low": 2.0, "ref_range_female_high": 4.4,
        "turnaround_minutes": 180,
    },

    # ── VITAMINS ────────────────────────────────────────────────────────────
    {
        "name_tr": "B12 Vitamini",
        "name_en": "Vitamin B12",
        "loinc_code": "2132-9",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "pg/mL",
        "ref_range_male_low": 197.0, "ref_range_male_high": 771.0,
        "ref_range_female_low": 197.0, "ref_range_female_high": 771.0,
        "turnaround_minutes": 180,
    },
    {
        "name_tr": "Folat (Folik Asit)",
        "name_en": "Folate",
        "loinc_code": "2284-8",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "ng/mL",
        "ref_range_male_low": 3.89, "ref_range_male_high": 26.8,
        "ref_range_female_low": 3.89, "ref_range_female_high": 26.8,
        "turnaround_minutes": 180,
    },
    {
        "name_tr": "D Vitamini (25-OH)",
        "name_en": "Vitamin D (25-Hydroxy)",
        "loinc_code": "1989-3",
        "category": "biochemistry",
        "specimen_type": "blood",
        "unit": "ng/mL",
        "ref_range_male_low": 30.0, "ref_range_male_high": 100.0,
        "ref_range_female_low": 30.0, "ref_range_female_high": 100.0,
        "critical_high": 150.0,
        "turnaround_minutes": 180,
    },

    # ── COAGULATION ─────────────────────────────────────────────────────────
    {
        "name_tr": "PT (Protrombin Zamani)",
        "name_en": "Prothrombin Time",
        "loinc_code": "5902-2",
        "category": "coagulation",
        "specimen_type": "blood",
        "unit": "saniye",
        "ref_range_male_low": 11.0, "ref_range_male_high": 13.5,
        "ref_range_female_low": 11.0, "ref_range_female_high": 13.5,
        "critical_high": 30.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "INR",
        "name_en": "International Normalized Ratio",
        "loinc_code": "6301-6",
        "category": "coagulation",
        "specimen_type": "blood",
        "unit": "",
        "ref_range_male_low": 0.8, "ref_range_male_high": 1.1,
        "ref_range_female_low": 0.8, "ref_range_female_high": 1.1,
        "critical_high": 5.0,
        "turnaround_minutes": 60,
    },
    {
        "name_tr": "aPTT (Aktive Parsiyel Tromboplastin Zamani)",
        "name_en": "Activated Partial Thromboplastin Time",
        "loinc_code": "3173-2",
        "category": "coagulation",
        "specimen_type": "blood",
        "unit": "saniye",
        "ref_range_male_low": 25.0, "ref_range_male_high": 35.0,
        "ref_range_female_low": 25.0, "ref_range_female_high": 35.0,
        "critical_high": 100.0,
        "turnaround_minutes": 60,
    },

    # ── URINALYSIS ──────────────────────────────────────────────────────────
    {
        "name_tr": "Tam Idrar Tahlili (TIT)",
        "name_en": "Complete Urinalysis",
        "loinc_code": "24356-8",
        "category": "urinalysis",
        "specimen_type": "urine",
        "unit": "",
        "turnaround_minutes": 60,
        "description": "Makroskopik, kimyasal ve mikroskopik idrar analizi",
    },

    # ── TUMOR MARKERS ──────────────────────────────────────────────────────
    {
        "name_tr": "PSA (Prostat Spesifik Antijen)",
        "name_en": "Prostate-Specific Antigen",
        "loinc_code": "2857-1",
        "category": "tumor_markers",
        "specimen_type": "blood",
        "unit": "ng/mL",
        "ref_range_male_low": 0.0, "ref_range_male_high": 4.0,
        "turnaround_minutes": 240,
    },
]
# fmt: on


def seed_test_definitions(force: bool = False) -> int:
    """
    Insert seed test definitions into the database.

    Args:
        force: If True, skip existing check and insert duplicates.

    Returns:
        Number of test definitions inserted.
    """
    db = SessionLocal()
    inserted = 0

    try:
        with unbound_session(reason="seeding-lab-test-definitions-global-catalogue"):
            for test_data in SEED_TESTS:
                # Check if already exists by loinc_code
                loinc = test_data.get("loinc_code")
                if loinc and not force:
                    existing = db.query(TestDefinition).filter(
                        TestDefinition.loinc_code == loinc
                    ).first()
                    if existing:
                        logger.info(f"Skipping existing test: {test_data['name_tr']} ({loinc})")
                        continue

                definition = TestDefinition(
                    id=gen_id("tdf"),
                    is_active=True,
                    **test_data,
                )
                db.add(definition)
                inserted += 1

            db.commit()
            logger.info(f"Seeded {inserted} lab test definitions")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding test definitions: {e}")
        raise
    finally:
        db.close()

    return inserted


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    count = seed_test_definitions()
    print(f"Inserted {count} test definitions out of {len(SEED_TESTS)} total.")
