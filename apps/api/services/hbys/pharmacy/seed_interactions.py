"""
Seed 30 Common Drug Interactions (Turkish)
Run this script to populate the drug_interactions table with well-known
drug-drug interactions used in clinical pharmacy practice in Turkey.

Usage:
    python -m services.hbys.pharmacy.seed_interactions
"""
from core.database import SessionLocal, Base, engine
from services.hbys.pharmacy.models.drug_interaction import DrugInteraction


SEED_DATA = [
    # 1
    {
        "drug_a_code": "B01AA03",
        "drug_a_name": "Warfarin",
        "drug_b_code": "M01AE01",
        "drug_b_name": "Ibuprofen",
        "severity": "major",
        "description_tr": "Warfarin ile ibuprofen birlikte kullanildiginda kanama riski belirgin sekilde artar.",
        "description_en": "Concurrent use of warfarin and ibuprofen significantly increases bleeding risk.",
        "clinical_effect": "Artmis kanama riski, GIS kanamasi",
        "management": "Birlikte kullanimi kacinilmalidir. Gerekiyorsa INR yakindan izlenmelidir.",
    },
    # 2
    {
        "drug_a_code": "C09AA01",
        "drug_a_name": "Kaptopril",
        "drug_b_code": "C09CA01",
        "drug_b_name": "Losartan",
        "severity": "major",
        "description_tr": "ACE inhibitoru ve ARB birlikte kullanimi hiperkalemi ve akut bobrek yetmezligi riskini artirir.",
        "description_en": "Combined ACE inhibitor and ARB use increases hyperkalemia and acute renal failure risk.",
        "clinical_effect": "Hiperkalemi, hipotansiyon, bobrek fonksiyon bozuklugu",
        "management": "Cift RAAS blokaji genellikle onerilmez. Potasyum ve kreatinin izlenmeli.",
    },
    # 3
    {
        "drug_a_code": "N06AB03",
        "drug_a_name": "Fluoksetin",
        "drug_b_code": "N06AB06",
        "drug_b_name": "Sertralin",
        "severity": "contraindicated",
        "description_tr": "Iki SSRI birlikte kullanimi serotonin sendromu riskini arttirir.",
        "description_en": "Combining two SSRIs increases the risk of serotonin syndrome.",
        "clinical_effect": "Serotonin sendromu: hipertermi, ajitasyon, klonus, diyare",
        "management": "Birlikte kullanimi kontrendikedir. Biri kesilmelidir.",
    },
    # 4
    {
        "drug_a_code": "C01AA05",
        "drug_a_name": "Digoksin",
        "drug_b_code": "C08DA01",
        "drug_b_name": "Verapamil",
        "severity": "major",
        "description_tr": "Verapamil digoksin kan duzeyini %50-75 oraninda arttirir.",
        "description_en": "Verapamil increases digoxin levels by 50-75%.",
        "clinical_effect": "Digoksin toksisitesi: bulanti, kusma, aritmi",
        "management": "Digoksin dozu %50 azaltilmali. Digoksin kan duzeyi izlenmeli.",
    },
    # 5
    {
        "drug_a_code": "J01MA02",
        "drug_a_name": "Siprofloksasin",
        "drug_b_code": "N05BA01",
        "drug_b_name": "Diazepam",
        "severity": "moderate",
        "description_tr": "Siprofloksasin teofilin ve benzodiazepin metabolizmasini inhibe eder.",
        "description_en": "Ciprofloxacin inhibits the metabolism of theophylline and benzodiazepines.",
        "clinical_effect": "Artmis sedasyondan nobet riskine kadar",
        "management": "Benzodiazepin dozu azaltilmasi gerekebilir. Hasta izlenmeli.",
    },
    # 6
    {
        "drug_a_code": "B01AC06",
        "drug_a_name": "Asetilsalisilik Asit (ASA)",
        "drug_b_code": "B01AA03",
        "drug_b_name": "Warfarin",
        "severity": "major",
        "description_tr": "ASA ve warfarin birlikte kanama riskini belirgin olarak arttirir.",
        "description_en": "ASA and warfarin together markedly increase bleeding risk.",
        "clinical_effect": "Ciddi kanama, GIS kanamasi",
        "management": "Zorunlu olmadikca birlikte kullanilmamali. INR sik izlenmeli.",
    },
    # 7
    {
        "drug_a_code": "A10BA02",
        "drug_a_name": "Metformin",
        "drug_b_code": "V08AB02",
        "drug_b_name": "Iyotlu Kontrast Madde",
        "severity": "major",
        "description_tr": "Metformin iyotlu kontrast madde ile laktik asidoz riskini arttirir.",
        "description_en": "Metformin with iodinated contrast increases lactic acidosis risk.",
        "clinical_effect": "Laktik asidoz",
        "management": "Kontrast oncesi metformin kesilmeli, islem sonrasi 48 saat beklenip kreatinin kontrol edilmeli.",
    },
    # 8
    {
        "drug_a_code": "N02BE01",
        "drug_a_name": "Parasetamol",
        "drug_b_code": "B01AA03",
        "drug_b_name": "Warfarin",
        "severity": "moderate",
        "description_tr": "Yuksek doz parasetamol warfarinin antikoagulan etkisini artirir.",
        "description_en": "High-dose paracetamol may potentiate warfarin's anticoagulant effect.",
        "clinical_effect": "Artmis INR, kanama riski",
        "management": "Gunluk 2g uzeri parasetamol kullaniliyorsa INR yakindan izlenmeli.",
    },
    # 9
    {
        "drug_a_code": "C03CA01",
        "drug_a_name": "Furosemid",
        "drug_b_code": "J01GA01",
        "drug_b_name": "Gentamisin",
        "severity": "major",
        "description_tr": "Furosemid ve aminoglikozidler birlikte ototoksisite ve nefrotoksisite riskini artirir.",
        "description_en": "Furosemide and aminoglycosides together increase ototoxicity and nephrotoxicity risk.",
        "clinical_effect": "Isitme kaybi, bobrek hasari",
        "management": "Birlikte kullanim kacinilmali. Gerekiyorsa bobrek fonksiyonu ve odiyometri izlenmeli.",
    },
    # 10
    {
        "drug_a_code": "C10AA01",
        "drug_a_name": "Simvastatin",
        "drug_b_code": "J02AC01",
        "drug_b_name": "Flukonazol",
        "severity": "major",
        "description_tr": "Flukonazol CYP3A4 inhibisyonu ile statin duzeylerini arttirir.",
        "description_en": "Fluconazole increases statin levels via CYP3A4 inhibition.",
        "clinical_effect": "Rabdomiyoliz riski",
        "management": "Statin dozu azaltilmali veya gecirilmeli. CK duzeyi izlenmeli.",
    },
    # 11
    {
        "drug_a_code": "N06AB10",
        "drug_a_name": "Essitalopram",
        "drug_b_code": "N02CC01",
        "drug_b_name": "Sumatriptan",
        "severity": "major",
        "description_tr": "SSRI ile triptan birlikte kullanimi serotonin sendromu riskini artirir.",
        "description_en": "SSRI with triptan increases serotonin syndrome risk.",
        "clinical_effect": "Serotonin sendromu",
        "management": "Hasta serotonin sendromu belirtileri acisidan bilgilendirilmeli ve izlenmeli.",
    },
    # 12
    {
        "drug_a_code": "C07AB02",
        "drug_a_name": "Metoprolol",
        "drug_b_code": "C08DA01",
        "drug_b_name": "Verapamil",
        "severity": "major",
        "description_tr": "Beta-bloker ile verapamil birlikte ciddi bradikardi ve kalp bloku olusturabilir.",
        "description_en": "Beta-blocker with verapamil can cause severe bradycardia and heart block.",
        "clinical_effect": "Bradikardi, AV blok, kardiyojenik sok",
        "management": "Birlikte IV kullanimi kontrendikedir. Oral kullanimda dikkatli izlem gerekir.",
    },
    # 13
    {
        "drug_a_code": "N05AH03",
        "drug_a_name": "Olanzapin",
        "drug_b_code": "N05BA01",
        "drug_b_name": "Diazepam",
        "severity": "major",
        "description_tr": "Antipsikotik ve benzodiazepin birlikte asiri sedasyon ve solunum depresyonuna neden olabilir.",
        "description_en": "Antipsychotic with benzodiazepine can cause excessive sedation and respiratory depression.",
        "clinical_effect": "Asiri sedasyon, solunum depresyonu, hipotansiyon",
        "management": "Birlikte IM kullanimi kacinilmali. Oral kullanimda dikkatli doz titrasyonu yapilmali.",
    },
    # 14
    {
        "drug_a_code": "C03AA03",
        "drug_a_name": "Hidroklorotiyazid",
        "drug_b_code": "A12BA01",
        "drug_b_name": "Potasyum Klorur",
        "severity": "moderate",
        "description_tr": "Tiazid diuretikler potasyum kaybina neden olur, potasyum takviyesi gerekebilir.",
        "description_en": "Thiazides cause potassium loss; potassium supplementation may be needed.",
        "clinical_effect": "Hipokalemi veya rebound hiperkalemi riski",
        "management": "Serum potasyum duzeyi duzenli izlenmeli.",
    },
    # 15
    {
        "drug_a_code": "N02AX02",
        "drug_a_name": "Tramadol",
        "drug_b_code": "N06AB03",
        "drug_b_name": "Fluoksetin",
        "severity": "major",
        "description_tr": "Tramadol ve SSRI birlikte serotonin sendromu ve nobet riskini arttirir.",
        "description_en": "Tramadol with SSRI increases serotonin syndrome and seizure risk.",
        "clinical_effect": "Serotonin sendromu, nobet",
        "management": "Alternatif analjezik tercih edilmeli. Birlikte kullaniliyorsa yakin izlem yapilmali.",
    },
    # 16
    {
        "drug_a_code": "J01FA01",
        "drug_a_name": "Eritromisin",
        "drug_b_code": "C10AA01",
        "drug_b_name": "Simvastatin",
        "severity": "major",
        "description_tr": "Eritromisin CYP3A4 inhibisyonu ile simvastatin duzeylerini artirir.",
        "description_en": "Erythromycin increases simvastatin levels through CYP3A4 inhibition.",
        "clinical_effect": "Rabdomiyoliz riski",
        "management": "Makrolid tedavisi sirasinda statin gecirilmeli veya alternatif antibiyotik secilmeli.",
    },
    # 17
    {
        "drug_a_code": "H02AB06",
        "drug_a_name": "Prednizolon",
        "drug_b_code": "M01AE01",
        "drug_b_name": "Ibuprofen",
        "severity": "moderate",
        "description_tr": "Kortikosteroid ve NSAID birlikte GIS ulser ve kanama riskini arttirir.",
        "description_en": "Corticosteroid with NSAID increases GI ulceration and bleeding risk.",
        "clinical_effect": "GIS ulseri, kanama",
        "management": "Proton pompa inhibitoru (PPI) eklenmelidir. Birlikte kullanim suresi kisa tutulmali.",
    },
    # 18
    {
        "drug_a_code": "N03AB02",
        "drug_a_name": "Fenitoin",
        "drug_b_code": "N06AB03",
        "drug_b_name": "Fluoksetin",
        "severity": "major",
        "description_tr": "Fluoksetin fenitoin metabolizmasini inhibe ederek toksik duzeylere neden olabilir.",
        "description_en": "Fluoxetine inhibits phenytoin metabolism, potentially causing toxic levels.",
        "clinical_effect": "Fenitoin toksisitesi: ataksi, nistagmus, mental degisiklikler",
        "management": "Fenitoin kan duzeyi izlenmeli, doz ayarlanmali.",
    },
    # 19
    {
        "drug_a_code": "C01BD01",
        "drug_a_name": "Amiodaron",
        "drug_b_code": "C01AA05",
        "drug_b_name": "Digoksin",
        "severity": "major",
        "description_tr": "Amiodaron digoksin duzeylerini %70-100 oraninda artirir.",
        "description_en": "Amiodarone increases digoxin levels by 70-100%.",
        "clinical_effect": "Digoksin toksisitesi, aritmi",
        "management": "Digoksin dozu %50 azaltilmali. Digoksin kan duzeyi ve EKG izlenmeli.",
    },
    # 20
    {
        "drug_a_code": "B01AF01",
        "drug_a_name": "Rivaroksaban",
        "drug_b_code": "J02AC01",
        "drug_b_name": "Flukonazol",
        "severity": "major",
        "description_tr": "Flukonazol rivaroksaban plazma duzeylerini artirarak kanama riskini yukseltir.",
        "description_en": "Fluconazole increases rivaroxaban plasma levels, increasing bleeding risk.",
        "clinical_effect": "Artmis kanama riski",
        "management": "Birlikte kullanimi onerilmez. Gerekiyorsa kanama belirtileri izlenmeli.",
    },
    # 21
    {
        "drug_a_code": "N05CF01",
        "drug_a_name": "Zopiklon",
        "drug_b_code": "N07BC02",
        "drug_b_name": "Metadon",
        "severity": "major",
        "description_tr": "Opioid ve sedatif-hipnotik birlikte solunum depresyonu riskini arttirir.",
        "description_en": "Opioid with sedative-hypnotic increases respiratory depression risk.",
        "clinical_effect": "Solunum depresyonu, koma, olum",
        "management": "Birlikte kullanimi mumkun oldukca kacinilmali. Kullaniliyorsa doz ve sure minimumda tutulmali.",
    },
    # 22
    {
        "drug_a_code": "A02BC01",
        "drug_a_name": "Omeprazol",
        "drug_b_code": "B01AC04",
        "drug_b_name": "Klopidogrel",
        "severity": "major",
        "description_tr": "Omeprazol klopidogrelin aktif metabolitine donusumunu azaltir.",
        "description_en": "Omeprazole reduces conversion of clopidogrel to its active metabolite.",
        "clinical_effect": "Azalmis antiplatelet etki, tromboz riski",
        "management": "Omeprazol yerine pantoprazol tercih edilmeli.",
    },
    # 23
    {
        "drug_a_code": "L04AD01",
        "drug_a_name": "Siklosporin",
        "drug_b_code": "C10AA01",
        "drug_b_name": "Simvastatin",
        "severity": "contraindicated",
        "description_tr": "Siklosporin ile simvastatin birlikte ciddi rabdomiyoliz riskine neden olur.",
        "description_en": "Cyclosporine with simvastatin causes severe rhabdomyolysis risk.",
        "clinical_effect": "Rabdomiyoliz, akut bobrek yetmezligi",
        "management": "Birlikte kullanimi kontrendikedir. Alternatif lipid dusurucu secilmeli.",
    },
    # 24
    {
        "drug_a_code": "N06DA02",
        "drug_a_name": "Donepezil",
        "drug_b_code": "C07AB02",
        "drug_b_name": "Metoprolol",
        "severity": "moderate",
        "description_tr": "Kolinesteraz inhibitoru beta-bloker ile birlikte bradikardi riskini arttirir.",
        "description_en": "Cholinesterase inhibitor with beta-blocker increases bradycardia risk.",
        "clinical_effect": "Sinuzoidal bradikardi, senkop",
        "management": "Kalp hizi duzenli izlenmeli. Gerektiginde doz ayarlanmali.",
    },
    # 25
    {
        "drug_a_code": "N05AX08",
        "drug_a_name": "Risperidon",
        "drug_b_code": "N06AB10",
        "drug_b_name": "Essitalopram",
        "severity": "moderate",
        "description_tr": "Her iki ilac QT uzamasina neden olabilir; birlikte risk artar.",
        "description_en": "Both drugs can cause QT prolongation; combined risk is increased.",
        "clinical_effect": "QT uzamasi, torsades de pointes",
        "management": "EKG izlenmeli. Elektrolitler (K+, Mg2+) kontrol edilmeli.",
    },
    # 26
    {
        "drug_a_code": "J01DD01",
        "drug_a_name": "Seftriakson",
        "drug_b_code": "B05XA07",
        "drug_b_name": "Kalsiyum Glubionat (IV)",
        "severity": "contraindicated",
        "description_tr": "Seftriakson ile IV kalsiyum birlikte olumcul precipitasyona neden olabilir.",
        "description_en": "Ceftriaxone with IV calcium can cause fatal precipitation.",
        "clinical_effect": "Pulmoner ve renal precipitasyon, olum",
        "management": "Yenidoganlarda kontrendikedir. Eriskinlerde farkli IV yollardan 48 saat arayla verilebilir.",
    },
    # 27
    {
        "drug_a_code": "N03AF01",
        "drug_a_name": "Karbamazepin",
        "drug_b_code": "J01FA01",
        "drug_b_name": "Eritromisin",
        "severity": "major",
        "description_tr": "Eritromisin karbamazepin metabolizmasini yavaslatarak toksik duzeylere yol acar.",
        "description_en": "Erythromycin slows carbamazepine metabolism, leading to toxic levels.",
        "clinical_effect": "Karbamazepin toksisitesi: bas donmesi, ataksi, gorme bozuklugu",
        "management": "Alternatif antibiyotik kullanilmali. Karbamazepin kan duzeyi izlenmeli.",
    },
    # 28
    {
        "drug_a_code": "M04AA01",
        "drug_a_name": "Allopurinol",
        "drug_b_code": "L01BB02",
        "drug_b_name": "Merkaptopurin",
        "severity": "major",
        "description_tr": "Allopurinol merkaptopurin metabolizmasini inhibe ederek toksisiteyi arttirir.",
        "description_en": "Allopurinol inhibits mercaptopurine metabolism, increasing toxicity.",
        "clinical_effect": "Kemik iligi supresyonu, pansitopeni",
        "management": "Merkaptopurin dozu %25'e dusurulmeli. Hemogram yakindan izlenmeli.",
    },
    # 29
    {
        "drug_a_code": "J01CR02",
        "drug_a_name": "Amoksisilin-Klavulanat",
        "drug_b_code": "B01AA03",
        "drug_b_name": "Warfarin",
        "severity": "moderate",
        "description_tr": "Amoksisilin-klavulanat warfarinin antikoagulan etkisini artirabilir.",
        "description_en": "Amoxicillin-clavulanate may potentiate warfarin's anticoagulant effect.",
        "clinical_effect": "Artmis INR, kanama riski",
        "management": "Tedavi baslangicinda ve bitiminde INR izlenmeli.",
    },
    # 30
    {
        "drug_a_code": "C09AA02",
        "drug_a_name": "Enalapril",
        "drug_b_code": "C03DA01",
        "drug_b_name": "Spironolakton",
        "severity": "major",
        "description_tr": "ACE inhibitoru ve potasyum tutucu diuretik birlikte hiperkalemi riskini ciddi olarak arttirir.",
        "description_en": "ACE inhibitor with potassium-sparing diuretic seriously increases hyperkalemia risk.",
        "clinical_effect": "Hiperkalemi, kardiyak aritmi",
        "management": "Potasyum duzeyi yakindan izlenmeli. Potasyum alimi kisitlanmali.",
    },
]


def seed_interactions():
    """Insert seed drug interactions into the database. Skips duplicates."""
    db = SessionLocal()
    try:
        inserted = 0
        skipped = 0
        for item in SEED_DATA:
            exists = (
                db.query(DrugInteraction)
                .filter(
                    DrugInteraction.drug_a_code == item["drug_a_code"],
                    DrugInteraction.drug_b_code == item["drug_b_code"],
                )
                .first()
            )
            if exists:
                skipped += 1
                continue

            interaction = DrugInteraction(**item)
            db.add(interaction)
            inserted += 1

        db.commit()
        print(f"Seed complete: {inserted} inserted, {skipped} skipped (already exist).")
    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_interactions()
