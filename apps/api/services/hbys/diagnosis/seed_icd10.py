"""
Seed script for common ICD-10 codes used in Turkish healthcare.
Contains 50 of the most frequently encountered ICD-10 codes with Turkish translations.

Usage:
    python -m services.hbys.diagnosis.seed_icd10

Or from the project root:
    from services.hbys.diagnosis.seed_icd10 import seed_icd10_codes
    seed_icd10_codes(db_session)
"""
import logging
from sqlalchemy.orm import Session

from .models.icd_code import ICDCode

logger = logging.getLogger(__name__)

ICD10_SEED_DATA = [
    # ── Respiratory (J) ──────────────────────────────────────────────────────
    ("J06.9", "10", "Akut üst solunum yolu enfeksiyonu, tanımlanmamış",
     "Acute upper respiratory infection, unspecified", "Solunum Sistemi Hastalıkları", "X", None, True),
    ("J18.9", "10", "Pnömoni, tanımlanmamış",
     "Pneumonia, unspecified organism", "Solunum Sistemi Hastalıkları", "X", None, True),
    ("J20.9", "10", "Akut bronşit, tanımlanmamış",
     "Acute bronchitis, unspecified", "Solunum Sistemi Hastalıkları", "X", None, True),
    ("J45.9", "10", "Astım, tanımlanmamış",
     "Asthma, unspecified", "Solunum Sistemi Hastalıkları", "X", None, True),
    ("J44.1", "10", "Akut alevlenme ile kronik obstrüktif akciğer hastalığı",
     "Chronic obstructive pulmonary disease with acute exacerbation", "Solunum Sistemi Hastalıkları", "X", None, True),
    ("J02.9", "10", "Akut farenjit, tanımlanmamış",
     "Acute pharyngitis, unspecified", "Solunum Sistemi Hastalıkları", "X", None, True),
    ("J03.9", "10", "Akut tonsillit, tanımlanmamış",
     "Acute tonsillitis, unspecified", "Solunum Sistemi Hastalıkları", "X", None, True),
    ("J30.1", "10", "Polen kaynaklı alerjik rinit",
     "Allergic rhinitis due to pollen", "Solunum Sistemi Hastalıkları", "X", None, True),

    # ── Circulatory (I) ──────────────────────────────────────────────────────
    ("I10", "10", "Esansiyel (primer) hipertansiyon",
     "Essential (primary) hypertension", "Dolaşım Sistemi Hastalıkları", "IX", None, True),
    ("I25.1", "10", "Aterosklerotik kalp hastalığı",
     "Atherosclerotic heart disease", "Dolaşım Sistemi Hastalıkları", "IX", None, True),
    ("I50.9", "10", "Kalp yetmezliği, tanımlanmamış",
     "Heart failure, unspecified", "Dolaşım Sistemi Hastalıkları", "IX", None, True),
    ("I48.9", "10", "Atriyal fibrilasyon, tanımlanmamış",
     "Atrial fibrillation, unspecified", "Dolaşım Sistemi Hastalıkları", "IX", None, True),
    ("I63.9", "10", "Serebral infarktüs, tanımlanmamış",
     "Cerebral infarction, unspecified", "Dolaşım Sistemi Hastalıkları", "IX", None, True),

    # ── Endocrine (E) ────────────────────────────────────────────────────────
    ("E11", "10", "Tip 2 diabetes mellitus",
     "Type 2 diabetes mellitus", "Endokrin Hastalıklar", "IV", None, True),
    ("E11.9", "10", "Tip 2 diabetes mellitus, komplikasyonsuz",
     "Type 2 diabetes mellitus without complications", "Endokrin Hastalıklar", "IV", "E11", True),
    ("E10.9", "10", "Tip 1 diabetes mellitus, komplikasyonsuz",
     "Type 1 diabetes mellitus without complications", "Endokrin Hastalıklar", "IV", None, True),
    ("E78.0", "10", "Saf hiperkolesterolemi",
     "Pure hypercholesterolemia", "Endokrin Hastalıklar", "IV", None, True),
    ("E03.9", "10", "Hipotiroidizm, tanımlanmamış",
     "Hypothyroidism, unspecified", "Endokrin Hastalıklar", "IV", None, True),
    ("E66.9", "10", "Obezite, tanımlanmamış",
     "Obesity, unspecified", "Endokrin Hastalıklar", "IV", None, True),

    # ── Digestive (K) ────────────────────────────────────────────────────────
    ("K29", "10", "Gastrit ve duodenit",
     "Gastritis and duodenitis", "Sindirim Sistemi Hastalıkları", "XI", None, True),
    ("K29.7", "10", "Gastrit, tanımlanmamış",
     "Gastritis, unspecified", "Sindirim Sistemi Hastalıkları", "XI", "K29", True),
    ("K21.0", "10", "Özofajit ile gastroözofageal reflü hastalığı",
     "Gastro-esophageal reflux disease with esophagitis", "Sindirim Sistemi Hastalıkları", "XI", None, True),
    ("K80.2", "10", "Safra kesesi taşı, kolesistitli",
     "Calculus of gallbladder without cholecystitis", "Sindirim Sistemi Hastalıkları", "XI", None, True),
    ("K35.8", "10", "Akut apandisit, diğer ve tanımlanmamış",
     "Acute appendicitis, other and unspecified", "Sindirim Sistemi Hastalıkları", "XI", None, True),
    ("K59.0", "10", "Kabızlık",
     "Constipation", "Sindirim Sistemi Hastalıkları", "XI", None, True),

    # ── Musculoskeletal (M) ──────────────────────────────────────────────────
    ("M54.5", "10", "Bel ağrısı",
     "Low back pain", "Kas-İskelet Sistemi Hastalıkları", "XIII", None, True),
    ("M54.2", "10", "Servikal bölge ağrısı",
     "Cervicalgia", "Kas-İskelet Sistemi Hastalıkları", "XIII", None, True),
    ("M79.3", "10", "Pannikülit, tanımlanmamış",
     "Panniculitis, unspecified", "Kas-İskelet Sistemi Hastalıkları", "XIII", None, True),
    ("M17.9", "10", "Gonartroz, tanımlanmamış",
     "Gonarthrosis, unspecified", "Kas-İskelet Sistemi Hastalıkları", "XIII", None, True),
    ("M16.9", "10", "Koksartroz, tanımlanmamış",
     "Coxarthrosis, unspecified", "Kas-İskelet Sistemi Hastalıkları", "XIII", None, True),
    ("M75.1", "10", "Rotator manşet sendromu",
     "Rotator cuff syndrome", "Kas-İskelet Sistemi Hastalıkları", "XIII", None, True),

    # ── Genitourinary (N) ────────────────────────────────────────────────────
    ("N39.0", "10", "İdrar yolu enfeksiyonu, yeri tanımlanmamış",
     "Urinary tract infection, site not specified", "Ürogenital Sistem Hastalıkları", "XIV", None, True),
    ("N40", "10", "Prostat hiperplazisi",
     "Enlarged prostate", "Ürogenital Sistem Hastalıkları", "XIV", None, True),
    ("N18.9", "10", "Kronik böbrek hastalığı, tanımlanmamış",
     "Chronic kidney disease, unspecified", "Ürogenital Sistem Hastalıkları", "XIV", None, True),

    # ── Mental / Neurological (F, G) ─────────────────────────────────────────
    ("F32.9", "10", "Depresif epizod, tanımlanmamış",
     "Major depressive disorder, single episode, unspecified", "Ruhsal Bozukluklar", "V", None, True),
    ("F41.1", "10", "Yaygın anksiyete bozukluğu",
     "Generalized anxiety disorder", "Ruhsal Bozukluklar", "V", None, True),
    ("F41.9", "10", "Anksiyete bozukluğu, tanımlanmamış",
     "Anxiety disorder, unspecified", "Ruhsal Bozukluklar", "V", None, True),
    ("G43.9", "10", "Migren, tanımlanmamış",
     "Migraine, unspecified", "Sinir Sistemi Hastalıkları", "VI", None, True),
    ("G47.0", "10", "Uykusuzluk (insomni)",
     "Insomnia", "Sinir Sistemi Hastalıkları", "VI", None, True),

    # ── Ear (H) ──────────────────────────────────────────────────────────────
    ("H90.3", "10", "Bilateral sensörinöral işitme kaybı",
     "Sensorineural hearing loss, bilateral", "Kulak Hastalıkları", "VIII", None, True),
    ("H90.5", "10", "Sensörinöral işitme kaybı, tanımlanmamış",
     "Unspecified sensorineural hearing loss", "Kulak Hastalıkları", "VIII", None, True),
    ("H91.9", "10", "İşitme kaybı, tanımlanmamış",
     "Hearing loss, unspecified", "Kulak Hastalıkları", "VIII", None, True),
    ("H66.9", "10", "Otitis media, tanımlanmamış",
     "Otitis media, unspecified", "Kulak Hastalıkları", "VIII", None, True),
    ("H61.2", "10", "Serümen tıkacı",
     "Impacted cerumen", "Kulak Hastalıkları", "VIII", None, True),

    # ── Skin (L) ─────────────────────────────────────────────────────────────
    ("L30.9", "10", "Dermatit, tanımlanmamış",
     "Dermatitis, unspecified", "Deri Hastalıkları", "XII", None, True),
    ("L50.9", "10", "Ürtiker, tanımlanmamış",
     "Urticaria, unspecified", "Deri Hastalıkları", "XII", None, True),

    # ── Injury / External (S, R) ─────────────────────────────────────────────
    ("R10.4", "10", "Diğer ve tanımlanmamış karın ağrısı",
     "Other and unspecified abdominal pain", "Belirtiler ve Bulgular", "XVIII", None, True),
    ("R51", "10", "Baş ağrısı",
     "Headache", "Belirtiler ve Bulgular", "XVIII", None, True),
    ("R50.9", "10", "Ateş, tanımlanmamış",
     "Fever, unspecified", "Belirtiler ve Bulgular", "XVIII", None, True),

    # ── Blood / Nutritional (D) ──────────────────────────────────────────────
    ("D50.9", "10", "Demir eksikliği anemisi, tanımlanmamış",
     "Iron deficiency anemia, unspecified", "Kan Hastalıkları", "III", None, True),
    ("D64.9", "10", "Anemi, tanımlanmamış",
     "Anemia, unspecified", "Kan Hastalıkları", "III", None, True),
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
    sys.path.insert(0, ".")
    from core.database import SessionLocal

    logging.basicConfig(level=logging.INFO)

    # Create tables if needed
    from database import Base, engine
    from .models.icd_code import ICDCode  # noqa: ensure table registered
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        inserted = seed_icd10_codes(session, force="--force" in sys.argv)
        print(f"Done. {inserted} ICD-10 codes seeded.")
