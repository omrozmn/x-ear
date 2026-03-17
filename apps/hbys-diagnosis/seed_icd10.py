"""
Seed script for common ICD-10 codes used in Turkish healthcare.
Contains 50 of the most frequently encountered ICD-10 codes with Turkish translations.

Usage:
    python seed_icd10.py
    python seed_icd10.py --force   # upsert all records
"""
import logging
from sqlalchemy.orm import Session

from models.icd_code import ICDCode

logger = logging.getLogger(__name__)

ICD10_SEED_DATA = [
    # ── Respiratory (J) ──────────────────────────────────────────────────────
    ("J06.9", "10", "Akut \u00fcst solunum yolu enfeksiyonu, tan\u0131mlanmam\u0131\u015f",
     "Acute upper respiratory infection, unspecified", "Solunum Sistemi Hastal\u0131klar\u0131", "X", None, True),
    ("J18.9", "10", "Pn\u00f6moni, tan\u0131mlanmam\u0131\u015f",
     "Pneumonia, unspecified organism", "Solunum Sistemi Hastal\u0131klar\u0131", "X", None, True),
    ("J20.9", "10", "Akut bron\u015fit, tan\u0131mlanmam\u0131\u015f",
     "Acute bronchitis, unspecified", "Solunum Sistemi Hastal\u0131klar\u0131", "X", None, True),
    ("J45.9", "10", "Ast\u0131m, tan\u0131mlanmam\u0131\u015f",
     "Asthma, unspecified", "Solunum Sistemi Hastal\u0131klar\u0131", "X", None, True),
    ("J44.1", "10", "Akut alevlenme ile kronik obstr\u00fcktif akci\u011fer hastal\u0131\u011f\u0131",
     "Chronic obstructive pulmonary disease with acute exacerbation", "Solunum Sistemi Hastal\u0131klar\u0131", "X", None, True),
    ("J02.9", "10", "Akut farenjit, tan\u0131mlanmam\u0131\u015f",
     "Acute pharyngitis, unspecified", "Solunum Sistemi Hastal\u0131klar\u0131", "X", None, True),
    ("J03.9", "10", "Akut tonsillit, tan\u0131mlanmam\u0131\u015f",
     "Acute tonsillitis, unspecified", "Solunum Sistemi Hastal\u0131klar\u0131", "X", None, True),
    ("J30.1", "10", "Polen kaynakl\u0131 alerjik rinit",
     "Allergic rhinitis due to pollen", "Solunum Sistemi Hastal\u0131klar\u0131", "X", None, True),

    # ── Circulatory (I) ──────────────────────────────────────────────────────
    ("I10", "10", "Esansiyel (primer) hipertansiyon",
     "Essential (primary) hypertension", "Dola\u015f\u0131m Sistemi Hastal\u0131klar\u0131", "IX", None, True),
    ("I25.1", "10", "Aterosklerotik kalp hastal\u0131\u011f\u0131",
     "Atherosclerotic heart disease", "Dola\u015f\u0131m Sistemi Hastal\u0131klar\u0131", "IX", None, True),
    ("I50.9", "10", "Kalp yetmezli\u011fi, tan\u0131mlanmam\u0131\u015f",
     "Heart failure, unspecified", "Dola\u015f\u0131m Sistemi Hastal\u0131klar\u0131", "IX", None, True),
    ("I48.9", "10", "Atriyal fibrilasyon, tan\u0131mlanmam\u0131\u015f",
     "Atrial fibrillation, unspecified", "Dola\u015f\u0131m Sistemi Hastal\u0131klar\u0131", "IX", None, True),
    ("I63.9", "10", "Serebral infark\u00fct\u00fcs, tan\u0131mlanmam\u0131\u015f",
     "Cerebral infarction, unspecified", "Dola\u015f\u0131m Sistemi Hastal\u0131klar\u0131", "IX", None, True),

    # ── Endocrine (E) ────────────────────────────────────────────────────────
    ("E11", "10", "Tip 2 diabetes mellitus",
     "Type 2 diabetes mellitus", "Endokrin Hastal\u0131klar", "IV", None, True),
    ("E11.9", "10", "Tip 2 diabetes mellitus, komplikasyonsuz",
     "Type 2 diabetes mellitus without complications", "Endokrin Hastal\u0131klar", "IV", "E11", True),
    ("E10.9", "10", "Tip 1 diabetes mellitus, komplikasyonsuz",
     "Type 1 diabetes mellitus without complications", "Endokrin Hastal\u0131klar", "IV", None, True),
    ("E78.0", "10", "Saf hiperkolesterolemi",
     "Pure hypercholesterolemia", "Endokrin Hastal\u0131klar", "IV", None, True),
    ("E03.9", "10", "Hipotiroidizm, tan\u0131mlanmam\u0131\u015f",
     "Hypothyroidism, unspecified", "Endokrin Hastal\u0131klar", "IV", None, True),
    ("E66.9", "10", "Obezite, tan\u0131mlanmam\u0131\u015f",
     "Obesity, unspecified", "Endokrin Hastal\u0131klar", "IV", None, True),

    # ── Digestive (K) ────────────────────────────────────────────────────────
    ("K29", "10", "Gastrit ve duodenit",
     "Gastritis and duodenitis", "Sindirim Sistemi Hastal\u0131klar\u0131", "XI", None, True),
    ("K29.7", "10", "Gastrit, tan\u0131mlanmam\u0131\u015f",
     "Gastritis, unspecified", "Sindirim Sistemi Hastal\u0131klar\u0131", "XI", "K29", True),
    ("K21.0", "10", "\u00d6zofajit ile gastr\u00f6zofageal refl\u00fc hastal\u0131\u011f\u0131",
     "Gastro-esophageal reflux disease with esophagitis", "Sindirim Sistemi Hastal\u0131klar\u0131", "XI", None, True),
    ("K80.2", "10", "Safra kesesi ta\u015f\u0131, kolesistitli",
     "Calculus of gallbladder without cholecystitis", "Sindirim Sistemi Hastal\u0131klar\u0131", "XI", None, True),
    ("K35.8", "10", "Akut apandisit, di\u011fer ve tan\u0131mlanmam\u0131\u015f",
     "Acute appendicitis, other and unspecified", "Sindirim Sistemi Hastal\u0131klar\u0131", "XI", None, True),
    ("K59.0", "10", "Kab\u0131zl\u0131k",
     "Constipation", "Sindirim Sistemi Hastal\u0131klar\u0131", "XI", None, True),

    # ── Musculoskeletal (M) ──────────────────────────────────────────────────
    ("M54.5", "10", "Bel a\u011fr\u0131s\u0131",
     "Low back pain", "Kas-\u0130skelet Sistemi Hastal\u0131klar\u0131", "XIII", None, True),
    ("M54.2", "10", "Servikal b\u00f6lge a\u011fr\u0131s\u0131",
     "Cervicalgia", "Kas-\u0130skelet Sistemi Hastal\u0131klar\u0131", "XIII", None, True),
    ("M79.3", "10", "Pannik\u00fclit, tan\u0131mlanmam\u0131\u015f",
     "Panniculitis, unspecified", "Kas-\u0130skelet Sistemi Hastal\u0131klar\u0131", "XIII", None, True),
    ("M17.9", "10", "Gonartroz, tan\u0131mlanmam\u0131\u015f",
     "Gonarthrosis, unspecified", "Kas-\u0130skelet Sistemi Hastal\u0131klar\u0131", "XIII", None, True),
    ("M16.9", "10", "Koksartroz, tan\u0131mlanmam\u0131\u015f",
     "Coxarthrosis, unspecified", "Kas-\u0130skelet Sistemi Hastal\u0131klar\u0131", "XIII", None, True),
    ("M75.1", "10", "Rotator man\u015fet sendromu",
     "Rotator cuff syndrome", "Kas-\u0130skelet Sistemi Hastal\u0131klar\u0131", "XIII", None, True),

    # ── Genitourinary (N) ────────────────────────────────────────────────────
    ("N39.0", "10", "\u0130drar yolu enfeksiyonu, yeri tan\u0131mlanmam\u0131\u015f",
     "Urinary tract infection, site not specified", "\u00dcrogenital Sistem Hastal\u0131klar\u0131", "XIV", None, True),
    ("N40", "10", "Prostat hiperplazisi",
     "Enlarged prostate", "\u00dcrogenital Sistem Hastal\u0131klar\u0131", "XIV", None, True),
    ("N18.9", "10", "Kronik b\u00f6brek hastal\u0131\u011f\u0131, tan\u0131mlanmam\u0131\u015f",
     "Chronic kidney disease, unspecified", "\u00dcrogenital Sistem Hastal\u0131klar\u0131", "XIV", None, True),

    # ── Mental / Neurological (F, G) ─────────────────────────────────────────
    ("F32.9", "10", "Depresif epizod, tan\u0131mlanmam\u0131\u015f",
     "Major depressive disorder, single episode, unspecified", "Ruhsal Bozukluklar", "V", None, True),
    ("F41.1", "10", "Yayg\u0131n anksiyete bozuklu\u011fu",
     "Generalized anxiety disorder", "Ruhsal Bozukluklar", "V", None, True),
    ("F41.9", "10", "Anksiyete bozuklu\u011fu, tan\u0131mlanmam\u0131\u015f",
     "Anxiety disorder, unspecified", "Ruhsal Bozukluklar", "V", None, True),
    ("G43.9", "10", "Migren, tan\u0131mlanmam\u0131\u015f",
     "Migraine, unspecified", "Sinir Sistemi Hastal\u0131klar\u0131", "VI", None, True),
    ("G47.0", "10", "Uykusuzluk (insomni)",
     "Insomnia", "Sinir Sistemi Hastal\u0131klar\u0131", "VI", None, True),

    # ── Ear (H) ──────────────────────────────────────────────────────────────
    ("H90.3", "10", "Bilateral sens\u00f6rin\u00f6ral i\u015fitme kayb\u0131",
     "Sensorineural hearing loss, bilateral", "Kulak Hastal\u0131klar\u0131", "VIII", None, True),
    ("H90.5", "10", "Sens\u00f6rin\u00f6ral i\u015fitme kayb\u0131, tan\u0131mlanmam\u0131\u015f",
     "Unspecified sensorineural hearing loss", "Kulak Hastal\u0131klar\u0131", "VIII", None, True),
    ("H91.9", "10", "\u0130\u015fitme kayb\u0131, tan\u0131mlanmam\u0131\u015f",
     "Hearing loss, unspecified", "Kulak Hastal\u0131klar\u0131", "VIII", None, True),
    ("H66.9", "10", "Otitis media, tan\u0131mlanmam\u0131\u015f",
     "Otitis media, unspecified", "Kulak Hastal\u0131klar\u0131", "VIII", None, True),
    ("H61.2", "10", "Ser\u00fcmen t\u0131kac\u0131",
     "Impacted cerumen", "Kulak Hastal\u0131klar\u0131", "VIII", None, True),

    # ── Skin (L) ─────────────────────────────────────────────────────────────
    ("L30.9", "10", "Dermatit, tan\u0131mlanmam\u0131\u015f",
     "Dermatitis, unspecified", "Deri Hastal\u0131klar\u0131", "XII", None, True),
    ("L50.9", "10", "\u00dcrtiker, tan\u0131mlanmam\u0131\u015f",
     "Urticaria, unspecified", "Deri Hastal\u0131klar\u0131", "XII", None, True),

    # ── Injury / External (S, R) ─────────────────────────────────────────────
    ("R10.4", "10", "Di\u011fer ve tan\u0131mlanmam\u0131\u015f kar\u0131n a\u011fr\u0131s\u0131",
     "Other and unspecified abdominal pain", "Belirtiler ve Bulgular", "XVIII", None, True),
    ("R51", "10", "Ba\u015f a\u011fr\u0131s\u0131",
     "Headache", "Belirtiler ve Bulgular", "XVIII", None, True),
    ("R50.9", "10", "Ate\u015f, tan\u0131mlanmam\u0131\u015f",
     "Fever, unspecified", "Belirtiler ve Bulgular", "XVIII", None, True),

    # ── Blood / Nutritional (D) ──────────────────────────────────────────────
    ("D50.9", "10", "Demir eksikli\u011fi anemisi, tan\u0131mlanmam\u0131\u015f",
     "Iron deficiency anemia, unspecified", "Kan Hastal\u0131klar\u0131", "III", None, True),
    ("D64.9", "10", "Anemi, tan\u0131mlanmam\u0131\u015f",
     "Anemia, unspecified", "Kan Hastal\u0131klar\u0131", "III", None, True),
]


def seed_icd10_codes(db: Session, *, force: bool = False) -> int:
    """
    Seed the ICD-10 codes table.

    Args:
        db: SQLAlchemy session
        force: If True, upsert all records. If False, skip existing codes.

    Returns:
        Number of codes inserted/updated.
    """
    count = 0
    for code, version, name_tr, name_en, category, chapter, parent_code, is_billable in ICD10_SEED_DATA:
        existing = db.query(ICDCode).filter(ICDCode.code == code).first()
        if existing and not force:
            continue

        if existing and force:
            existing.version = version
            existing.name_tr = name_tr
            existing.name_en = name_en
            existing.category = category
            existing.chapter = chapter
            existing.parent_code = parent_code
            existing.is_billable = is_billable
        else:
            icd = ICDCode(
                code=code,
                version=version,
                name_tr=name_tr,
                name_en=name_en,
                category=category,
                chapter=chapter,
                parent_code=parent_code,
                is_billable=is_billable,
            )
            db.add(icd)

        count += 1

    db.commit()
    logger.info("Seeded %d ICD-10 codes (total seed entries: %d)", count, len(ICD10_SEED_DATA))
    return count


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)

    from main import app, get_db as _get_db_gen

    # Get a session from the app's session factory
    session = app.state.session_factory()
    try:
        inserted = seed_icd10_codes(session, force="--force" in sys.argv)
        print(f"Done. {inserted} ICD-10 codes seeded.")
    finally:
        session.close()
