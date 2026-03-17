"""
AI Drug Interaction Prediction Service
=======================================
Scikit-learn based drug-drug interaction prediction engine.
Uses a built-in dataset of ~200 known drug interactions for training.
CPU-only, no GPU required.

The model is lazily trained on first use and cached for subsequent calls.
"""
from __future__ import annotations

import hashlib
import logging
from itertools import combinations
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Built-in training dataset of known drug interactions
# ---------------------------------------------------------------------------

# Drug metadata: name -> (ATC code prefix, category, molecular_weight_bucket, protein_binding_bucket, half_life_bucket)
DRUG_METADATA: dict[str, dict] = {
    # Anticoagulants / Antiplatelets
    "warfarin":       {"atc": "B01AA", "category": "anticoagulant",      "mw": 2, "pb": 3, "hl": 3},
    "heparin":        {"atc": "B01AB", "category": "anticoagulant",      "mw": 4, "pb": 1, "hl": 1},
    "aspirin":        {"atc": "B01AC", "category": "antiplatelet",       "mw": 1, "pb": 2, "hl": 1},
    "clopidogrel":    {"atc": "B01AC", "category": "antiplatelet",       "mw": 2, "pb": 3, "hl": 1},
    "rivaroxaban":    {"atc": "B01AF", "category": "anticoagulant",      "mw": 3, "pb": 3, "hl": 2},
    "apixaban":       {"atc": "B01AF", "category": "anticoagulant",      "mw": 3, "pb": 3, "hl": 2},
    "enoxaparin":     {"atc": "B01AB", "category": "anticoagulant",      "mw": 4, "pb": 1, "hl": 1},
    "dabigatran":     {"atc": "B01AE", "category": "anticoagulant",      "mw": 3, "pb": 2, "hl": 2},

    # NSAIDs
    "ibuprofen":      {"atc": "M01AE", "category": "nsaid",             "mw": 1, "pb": 3, "hl": 1},
    "naproxen":       {"atc": "M01AE", "category": "nsaid",             "mw": 1, "pb": 3, "hl": 2},
    "diclofenac":     {"atc": "M01AB", "category": "nsaid",             "mw": 2, "pb": 3, "hl": 1},
    "meloxicam":      {"atc": "M01AC", "category": "nsaid",             "mw": 2, "pb": 3, "hl": 3},
    "piroxicam":      {"atc": "M01AC", "category": "nsaid",             "mw": 2, "pb": 3, "hl": 3},
    "celecoxib":      {"atc": "M01AH", "category": "nsaid",             "mw": 2, "pb": 3, "hl": 2},
    "ketoprofen":     {"atc": "M01AE", "category": "nsaid",             "mw": 2, "pb": 3, "hl": 1},
    "indometasin":    {"atc": "M01AB", "category": "nsaid",             "mw": 2, "pb": 3, "hl": 2},

    # SSRIs
    "fluoxetine":     {"atc": "N06AB", "category": "ssri",              "mw": 2, "pb": 3, "hl": 3},
    "sertraline":     {"atc": "N06AB", "category": "ssri",              "mw": 2, "pb": 3, "hl": 2},
    "paroxetine":     {"atc": "N06AB", "category": "ssri",              "mw": 2, "pb": 3, "hl": 3},
    "citalopram":     {"atc": "N06AB", "category": "ssri",              "mw": 2, "pb": 2, "hl": 3},
    "escitalopram":   {"atc": "N06AB", "category": "ssri",              "mw": 2, "pb": 2, "hl": 2},
    "fluvoxamine":    {"atc": "N06AB", "category": "ssri",              "mw": 2, "pb": 2, "hl": 2},

    # MAOIs
    "phenelzine":     {"atc": "N06AF", "category": "maoi",              "mw": 1, "pb": 1, "hl": 2},
    "tranylcypromine":{"atc": "N06AF", "category": "maoi",              "mw": 1, "pb": 1, "hl": 1},
    "selegiline":     {"atc": "N04BD", "category": "maoi",              "mw": 1, "pb": 3, "hl": 2},
    "moclobemide":    {"atc": "N06AG", "category": "maoi",              "mw": 2, "pb": 2, "hl": 1},
    "isocarboxazid":  {"atc": "N06AF", "category": "maoi",              "mw": 1, "pb": 1, "hl": 2},
    "linezolid":      {"atc": "J01XX", "category": "maoi_antibiotic",   "mw": 2, "pb": 1, "hl": 1},

    # Antidiabetics
    "metformin":      {"atc": "A10BA", "category": "antidiabetic",      "mw": 1, "pb": 1, "hl": 1},
    "glimepiride":    {"atc": "A10BB", "category": "sulfonylurea",      "mw": 3, "pb": 3, "hl": 2},
    "gliclazide":     {"atc": "A10BB", "category": "sulfonylurea",      "mw": 2, "pb": 3, "hl": 2},
    "insulin":        {"atc": "A10A",  "category": "insulin",           "mw": 4, "pb": 1, "hl": 1},
    "pioglitazone":   {"atc": "A10BG", "category": "antidiabetic",      "mw": 2, "pb": 3, "hl": 2},
    "sitagliptin":    {"atc": "A10BH", "category": "dpp4_inhibitor",    "mw": 2, "pb": 2, "hl": 2},
    "empagliflozin":  {"atc": "A10BK", "category": "sglt2_inhibitor",   "mw": 3, "pb": 3, "hl": 2},
    "dapagliflozin":  {"atc": "A10BK", "category": "sglt2_inhibitor",   "mw": 3, "pb": 3, "hl": 2},

    # ACE Inhibitors / ARBs
    "enalapril":      {"atc": "C09AA", "category": "ace_inhibitor",     "mw": 2, "pb": 2, "hl": 2},
    "ramipril":       {"atc": "C09AA", "category": "ace_inhibitor",     "mw": 2, "pb": 2, "hl": 2},
    "lisinopril":     {"atc": "C09AA", "category": "ace_inhibitor",     "mw": 2, "pb": 1, "hl": 2},
    "perindopril":    {"atc": "C09AA", "category": "ace_inhibitor",     "mw": 2, "pb": 1, "hl": 2},
    "losartan":       {"atc": "C09CA", "category": "arb",               "mw": 3, "pb": 3, "hl": 1},
    "valsartan":      {"atc": "C09CA", "category": "arb",               "mw": 3, "pb": 3, "hl": 1},
    "irbesartan":     {"atc": "C09CA", "category": "arb",               "mw": 3, "pb": 3, "hl": 2},
    "telmisartan":    {"atc": "C09CA", "category": "arb",               "mw": 3, "pb": 3, "hl": 3},

    # Beta Blockers
    "metoprolol":     {"atc": "C07AB", "category": "beta_blocker",      "mw": 2, "pb": 1, "hl": 1},
    "atenolol":       {"atc": "C07AB", "category": "beta_blocker",      "mw": 2, "pb": 1, "hl": 1},
    "propranolol":    {"atc": "C07AA", "category": "beta_blocker",      "mw": 2, "pb": 3, "hl": 1},
    "bisoprolol":     {"atc": "C07AB", "category": "beta_blocker",      "mw": 2, "pb": 1, "hl": 2},
    "carvedilol":     {"atc": "C07AG", "category": "beta_blocker",      "mw": 2, "pb": 3, "hl": 1},
    "nebivolol":      {"atc": "C07AB", "category": "beta_blocker",      "mw": 2, "pb": 3, "hl": 2},

    # Calcium Channel Blockers
    "amlodipine":     {"atc": "C08CA", "category": "ccb",               "mw": 3, "pb": 3, "hl": 3},
    "nifedipine":     {"atc": "C08CA", "category": "ccb",               "mw": 2, "pb": 3, "hl": 1},
    "diltiazem":      {"atc": "C08DB", "category": "ccb",               "mw": 3, "pb": 3, "hl": 2},
    "verapamil":      {"atc": "C08DA", "category": "ccb",               "mw": 3, "pb": 3, "hl": 2},

    # Diuretics
    "furosemide":     {"atc": "C03CA", "category": "diuretic",          "mw": 2, "pb": 3, "hl": 1},
    "hydrochlorothiazide": {"atc": "C03AA", "category": "diuretic",     "mw": 2, "pb": 2, "hl": 2},
    "spironolactone": {"atc": "C03DA", "category": "k_sparing_diuretic","mw": 3, "pb": 3, "hl": 2},
    "indapamide":     {"atc": "C03BA", "category": "diuretic",          "mw": 2, "pb": 3, "hl": 2},

    # Statins
    "atorvastatin":   {"atc": "C10AA", "category": "statin",            "mw": 4, "pb": 3, "hl": 2},
    "rosuvastatin":   {"atc": "C10AA", "category": "statin",            "mw": 3, "pb": 3, "hl": 3},
    "simvastatin":    {"atc": "C10AA", "category": "statin",            "mw": 3, "pb": 3, "hl": 1},
    "pravastatin":    {"atc": "C10AA", "category": "statin",            "mw": 3, "pb": 2, "hl": 1},

    # Antibiotics
    "amoxicillin":    {"atc": "J01CA", "category": "antibiotic",        "mw": 2, "pb": 1, "hl": 1},
    "ciprofloxacin":  {"atc": "J01MA", "category": "fluoroquinolone",   "mw": 2, "pb": 1, "hl": 1},
    "levofloxacin":   {"atc": "J01MA", "category": "fluoroquinolone",   "mw": 2, "pb": 1, "hl": 2},
    "azithromycin":   {"atc": "J01FA", "category": "macrolide",         "mw": 4, "pb": 2, "hl": 3},
    "clarithromycin": {"atc": "J01FA", "category": "macrolide",         "mw": 4, "pb": 3, "hl": 2},
    "erythromycin":   {"atc": "J01FA", "category": "macrolide",         "mw": 4, "pb": 3, "hl": 1},
    "doxycycline":    {"atc": "J01AA", "category": "tetracycline",      "mw": 3, "pb": 3, "hl": 3},
    "metronidazole":  {"atc": "J01XD", "category": "antibiotic",        "mw": 1, "pb": 1, "hl": 2},
    "trimethoprim":   {"atc": "J01EA", "category": "antibiotic",        "mw": 2, "pb": 2, "hl": 2},
    "rifampin":       {"atc": "J04AB", "category": "antibiotic",        "mw": 4, "pb": 3, "hl": 1},

    # Antifungals
    "fluconazole":    {"atc": "J02AC", "category": "azole_antifungal",  "mw": 2, "pb": 1, "hl": 2},
    "ketoconazole":   {"atc": "J02AB", "category": "azole_antifungal",  "mw": 3, "pb": 3, "hl": 2},
    "itraconazole":   {"atc": "J02AC", "category": "azole_antifungal",  "mw": 4, "pb": 3, "hl": 3},

    # PPIs
    "omeprazole":     {"atc": "A02BC", "category": "ppi",               "mw": 2, "pb": 3, "hl": 1},
    "lansoprazole":   {"atc": "A02BC", "category": "ppi",               "mw": 2, "pb": 3, "hl": 1},
    "pantoprazole":   {"atc": "A02BC", "category": "ppi",               "mw": 2, "pb": 3, "hl": 1},
    "esomeprazole":   {"atc": "A02BC", "category": "ppi",               "mw": 2, "pb": 3, "hl": 1},

    # Benzodiazepines / Sedatives
    "diazepam":       {"atc": "N05BA", "category": "benzodiazepine",    "mw": 2, "pb": 3, "hl": 3},
    "alprazolam":     {"atc": "N05BA", "category": "benzodiazepine",    "mw": 2, "pb": 3, "hl": 2},
    "lorazepam":      {"atc": "N05BA", "category": "benzodiazepine",    "mw": 2, "pb": 3, "hl": 2},
    "midazolam":      {"atc": "N05CD", "category": "benzodiazepine",    "mw": 2, "pb": 3, "hl": 1},
    "zolpidem":       {"atc": "N05CF", "category": "sedative",          "mw": 2, "pb": 3, "hl": 1},

    # Opioids
    "morphine":       {"atc": "N02AA", "category": "opioid",            "mw": 2, "pb": 1, "hl": 1},
    "tramadol":       {"atc": "N02AX", "category": "opioid",            "mw": 2, "pb": 1, "hl": 2},
    "codeine":        {"atc": "N02AA", "category": "opioid",            "mw": 2, "pb": 1, "hl": 1},
    "fentanyl":       {"atc": "N02AB", "category": "opioid",            "mw": 2, "pb": 3, "hl": 1},

    # Corticosteroids
    "prednisolone":   {"atc": "H02AB", "category": "corticosteroid",    "mw": 2, "pb": 3, "hl": 1},
    "dexamethasone":  {"atc": "H02AB", "category": "corticosteroid",    "mw": 2, "pb": 3, "hl": 2},
    "methylprednisolone": {"atc": "H02AB", "category": "corticosteroid","mw": 2, "pb": 3, "hl": 2},

    # Thyroid
    "levothyroxine":  {"atc": "H03AA", "category": "thyroid",           "mw": 4, "pb": 3, "hl": 3},

    # Antiepileptics
    "carbamazepine":  {"atc": "N03AF", "category": "antiepileptic",     "mw": 2, "pb": 3, "hl": 2},
    "phenytoin":      {"atc": "N03AB", "category": "antiepileptic",     "mw": 2, "pb": 3, "hl": 3},
    "valproic_acid":  {"atc": "N03AG", "category": "antiepileptic",     "mw": 1, "pb": 3, "hl": 2},
    "lamotrigine":    {"atc": "N03AX", "category": "antiepileptic",     "mw": 2, "pb": 2, "hl": 2},
    "levetiracetam":  {"atc": "N03AX", "category": "antiepileptic",     "mw": 1, "pb": 1, "hl": 1},
    "gabapentin":     {"atc": "N03AX", "category": "antiepileptic",     "mw": 1, "pb": 1, "hl": 1},
    "pregabalin":     {"atc": "N03AX", "category": "antiepileptic",     "mw": 1, "pb": 1, "hl": 1},

    # Antipsychotics
    "haloperidol":    {"atc": "N05AD", "category": "antipsychotic",     "mw": 2, "pb": 3, "hl": 3},
    "quetiapine":     {"atc": "N05AH", "category": "antipsychotic",     "mw": 2, "pb": 3, "hl": 1},
    "olanzapine":     {"atc": "N05AH", "category": "antipsychotic",     "mw": 2, "pb": 3, "hl": 3},
    "risperidone":    {"atc": "N05AX", "category": "antipsychotic",     "mw": 2, "pb": 3, "hl": 1},
    "aripiprazole":   {"atc": "N05AX", "category": "antipsychotic",     "mw": 3, "pb": 3, "hl": 3},

    # Lithium
    "lithium":        {"atc": "N05AN", "category": "mood_stabilizer",   "mw": 1, "pb": 1, "hl": 3},

    # Digoxin
    "digoxin":        {"atc": "C01AA", "category": "cardiac_glycoside", "mw": 4, "pb": 1, "hl": 3},

    # Potassium
    "potassium_chloride": {"atc": "A12BA", "category": "electrolyte",   "mw": 1, "pb": 1, "hl": 1},

    # Contrast media
    "contrast_media": {"atc": "V08",   "category": "contrast",          "mw": 4, "pb": 1, "hl": 1},

    # Alcohol (for interaction references)
    "alcohol":        {"atc": "V03AB", "category": "substance",         "mw": 1, "pb": 1, "hl": 1},

    # Antacids
    "aluminum_hydroxide": {"atc": "A02AB", "category": "antacid",       "mw": 1, "pb": 1, "hl": 1},
    "calcium_carbonate":  {"atc": "A02AC", "category": "antacid",       "mw": 1, "pb": 1, "hl": 1},

    # Immunosuppressants
    "cyclosporine":   {"atc": "L04AD", "category": "immunosuppressant", "mw": 4, "pb": 3, "hl": 2},
    "tacrolimus":     {"atc": "L04AD", "category": "immunosuppressant", "mw": 4, "pb": 3, "hl": 2},
    "mycophenolate":  {"atc": "L04AA", "category": "immunosuppressant", "mw": 2, "pb": 3, "hl": 2},

    # Misc
    "theophylline":   {"atc": "R03DA", "category": "xanthine",          "mw": 1, "pb": 2, "hl": 2},
    "sildenafil":     {"atc": "G04BE", "category": "pde5_inhibitor",    "mw": 3, "pb": 3, "hl": 1},
    "nitroglycerin":  {"atc": "C01DA", "category": "nitrate",           "mw": 1, "pb": 2, "hl": 1},
    "isosorbide":     {"atc": "C01DA", "category": "nitrate",           "mw": 1, "pb": 1, "hl": 1},
    "amiodarone":     {"atc": "C01BD", "category": "antiarrhythmic",    "mw": 4, "pb": 3, "hl": 3},
    "colchicine":     {"atc": "M04AC", "category": "antigout",          "mw": 2, "pb": 2, "hl": 3},
    "allopurinol":    {"atc": "M04AA", "category": "antigout",          "mw": 1, "pb": 1, "hl": 1},
    "iron_supplement":{"atc": "B03AA", "category": "supplement",        "mw": 1, "pb": 3, "hl": 1},
    "vitamin_d":      {"atc": "A11CC", "category": "vitamin",           "mw": 2, "pb": 3, "hl": 3},
    "calcium":        {"atc": "A12AA", "category": "supplement",        "mw": 1, "pb": 1, "hl": 1},
    "magnesium":      {"atc": "A12CC", "category": "supplement",        "mw": 1, "pb": 1, "hl": 1},
}


# Interaction types
INTERACTION_TYPES = [
    "none",                  # 0 - no interaction
    "pharmacokinetic",       # 1 - absorption/metabolism/excretion alteration
    "pharmacodynamic",       # 2 - additive/synergistic/antagonistic effect
    "serotonin_syndrome",    # 3 - serotonin toxicity risk
    "bleeding_risk",         # 4 - increased bleeding
    "nephrotoxicity",        # 5 - kidney damage risk
    "hepatotoxicity",        # 6 - liver damage risk
    "hypoglycemia",          # 7 - dangerously low blood sugar
    "hypotension",           # 8 - dangerously low blood pressure
    "hyperkalemia",          # 9 - dangerously high potassium
    "qt_prolongation",       # 10 - cardiac arrhythmia risk
    "cns_depression",        # 11 - excessive sedation / respiratory depression
    "reduced_efficacy",      # 12 - one drug reduces the other's effect
    "toxicity_increase",     # 13 - increased drug levels / toxicity
]

SEVERITY_LEVELS = ["none", "minor", "moderate", "major", "contraindicated"]

# Known interaction dataset: (drug_a, drug_b, interaction_type, severity)
KNOWN_INTERACTIONS: list[tuple[str, str, str, str]] = [
    # --- Bleeding risks ---
    ("warfarin", "aspirin", "bleeding_risk", "major"),
    ("warfarin", "ibuprofen", "bleeding_risk", "major"),
    ("warfarin", "naproxen", "bleeding_risk", "major"),
    ("warfarin", "diclofenac", "bleeding_risk", "major"),
    ("warfarin", "meloxicam", "bleeding_risk", "major"),
    ("warfarin", "clopidogrel", "bleeding_risk", "major"),
    ("warfarin", "heparin", "bleeding_risk", "contraindicated"),
    ("warfarin", "enoxaparin", "bleeding_risk", "contraindicated"),
    ("warfarin", "rivaroxaban", "bleeding_risk", "contraindicated"),
    ("warfarin", "apixaban", "bleeding_risk", "contraindicated"),
    ("warfarin", "dabigatran", "bleeding_risk", "contraindicated"),
    ("aspirin", "clopidogrel", "bleeding_risk", "moderate"),
    ("aspirin", "ibuprofen", "reduced_efficacy", "moderate"),
    ("aspirin", "heparin", "bleeding_risk", "major"),
    ("aspirin", "enoxaparin", "bleeding_risk", "major"),
    ("rivaroxaban", "aspirin", "bleeding_risk", "major"),
    ("rivaroxaban", "clopidogrel", "bleeding_risk", "major"),
    ("rivaroxaban", "ibuprofen", "bleeding_risk", "major"),
    ("apixaban", "aspirin", "bleeding_risk", "major"),
    ("dabigatran", "aspirin", "bleeding_risk", "major"),
    ("warfarin", "fluconazole", "toxicity_increase", "major"),
    ("warfarin", "metronidazole", "bleeding_risk", "major"),
    ("warfarin", "clarithromycin", "toxicity_increase", "major"),
    ("warfarin", "erythromycin", "toxicity_increase", "major"),
    ("warfarin", "rifampin", "reduced_efficacy", "major"),
    ("warfarin", "carbamazepine", "reduced_efficacy", "major"),
    ("warfarin", "phenytoin", "pharmacokinetic", "major"),
    ("warfarin", "amiodarone", "toxicity_increase", "major"),

    # --- Serotonin syndrome ---
    ("fluoxetine", "phenelzine", "serotonin_syndrome", "contraindicated"),
    ("fluoxetine", "tranylcypromine", "serotonin_syndrome", "contraindicated"),
    ("fluoxetine", "selegiline", "serotonin_syndrome", "contraindicated"),
    ("fluoxetine", "moclobemide", "serotonin_syndrome", "contraindicated"),
    ("fluoxetine", "isocarboxazid", "serotonin_syndrome", "contraindicated"),
    ("fluoxetine", "linezolid", "serotonin_syndrome", "contraindicated"),
    ("sertraline", "phenelzine", "serotonin_syndrome", "contraindicated"),
    ("sertraline", "tranylcypromine", "serotonin_syndrome", "contraindicated"),
    ("sertraline", "selegiline", "serotonin_syndrome", "contraindicated"),
    ("sertraline", "linezolid", "serotonin_syndrome", "contraindicated"),
    ("paroxetine", "phenelzine", "serotonin_syndrome", "contraindicated"),
    ("paroxetine", "tranylcypromine", "serotonin_syndrome", "contraindicated"),
    ("citalopram", "phenelzine", "serotonin_syndrome", "contraindicated"),
    ("escitalopram", "phenelzine", "serotonin_syndrome", "contraindicated"),
    ("fluvoxamine", "phenelzine", "serotonin_syndrome", "contraindicated"),
    ("fluoxetine", "tramadol", "serotonin_syndrome", "major"),
    ("sertraline", "tramadol", "serotonin_syndrome", "major"),
    ("paroxetine", "tramadol", "serotonin_syndrome", "major"),
    ("paroxetine", "codeine", "reduced_efficacy", "major"),
    ("fluoxetine", "codeine", "reduced_efficacy", "major"),

    # SSRIs + bleeding
    ("fluoxetine", "warfarin", "bleeding_risk", "major"),
    ("sertraline", "warfarin", "bleeding_risk", "moderate"),
    ("fluoxetine", "aspirin", "bleeding_risk", "moderate"),
    ("sertraline", "aspirin", "bleeding_risk", "moderate"),
    ("fluoxetine", "ibuprofen", "bleeding_risk", "moderate"),

    # --- Hypoglycemia ---
    ("metformin", "insulin", "hypoglycemia", "moderate"),
    ("glimepiride", "insulin", "hypoglycemia", "major"),
    ("glimepiride", "fluconazole", "hypoglycemia", "major"),
    ("gliclazide", "insulin", "hypoglycemia", "major"),
    ("metformin", "glimepiride", "hypoglycemia", "moderate"),
    ("metformin", "gliclazide", "hypoglycemia", "moderate"),

    # Metformin + contrast
    ("metformin", "contrast_media", "nephrotoxicity", "major"),

    # --- Nephrotoxicity ---
    ("ibuprofen", "enalapril", "nephrotoxicity", "moderate"),
    ("ibuprofen", "ramipril", "nephrotoxicity", "moderate"),
    ("ibuprofen", "lisinopril", "nephrotoxicity", "moderate"),
    ("ibuprofen", "losartan", "nephrotoxicity", "moderate"),
    ("diclofenac", "enalapril", "nephrotoxicity", "moderate"),
    ("diclofenac", "ramipril", "nephrotoxicity", "moderate"),
    ("naproxen", "enalapril", "nephrotoxicity", "moderate"),
    ("naproxen", "lisinopril", "nephrotoxicity", "moderate"),
    ("ibuprofen", "metformin", "nephrotoxicity", "moderate"),
    ("diclofenac", "metformin", "nephrotoxicity", "moderate"),
    ("ibuprofen", "lithium", "toxicity_increase", "major"),
    ("naproxen", "lithium", "toxicity_increase", "major"),
    ("diclofenac", "lithium", "toxicity_increase", "major"),
    ("cyclosporine", "ibuprofen", "nephrotoxicity", "major"),
    ("cyclosporine", "diclofenac", "nephrotoxicity", "major"),
    ("tacrolimus", "ibuprofen", "nephrotoxicity", "major"),

    # --- Hyperkalemia ---
    ("enalapril", "spironolactone", "hyperkalemia", "major"),
    ("ramipril", "spironolactone", "hyperkalemia", "major"),
    ("lisinopril", "spironolactone", "hyperkalemia", "major"),
    ("losartan", "spironolactone", "hyperkalemia", "major"),
    ("valsartan", "spironolactone", "hyperkalemia", "major"),
    ("enalapril", "potassium_chloride", "hyperkalemia", "major"),
    ("ramipril", "potassium_chloride", "hyperkalemia", "major"),
    ("lisinopril", "potassium_chloride", "hyperkalemia", "major"),
    ("enalapril", "losartan", "hyperkalemia", "contraindicated"),
    ("ramipril", "valsartan", "hyperkalemia", "contraindicated"),
    ("enalapril", "valsartan", "hyperkalemia", "contraindicated"),
    ("trimethoprim", "spironolactone", "hyperkalemia", "major"),
    ("trimethoprim", "enalapril", "hyperkalemia", "moderate"),

    # --- Hypotension ---
    ("enalapril", "amlodipine", "hypotension", "minor"),
    ("metoprolol", "amlodipine", "hypotension", "moderate"),
    ("metoprolol", "verapamil", "hypotension", "major"),
    ("metoprolol", "diltiazem", "hypotension", "major"),
    ("atenolol", "verapamil", "hypotension", "major"),
    ("propranolol", "verapamil", "hypotension", "major"),
    ("bisoprolol", "diltiazem", "hypotension", "major"),
    ("carvedilol", "verapamil", "hypotension", "major"),
    ("sildenafil", "nitroglycerin", "hypotension", "contraindicated"),
    ("sildenafil", "isosorbide", "hypotension", "contraindicated"),
    ("propranolol", "insulin", "hypoglycemia", "moderate"),
    ("metoprolol", "insulin", "hypoglycemia", "minor"),

    # --- QT prolongation ---
    ("ciprofloxacin", "amiodarone", "qt_prolongation", "major"),
    ("levofloxacin", "amiodarone", "qt_prolongation", "major"),
    ("azithromycin", "amiodarone", "qt_prolongation", "major"),
    ("clarithromycin", "amiodarone", "qt_prolongation", "major"),
    ("haloperidol", "amiodarone", "qt_prolongation", "major"),
    ("haloperidol", "ciprofloxacin", "qt_prolongation", "moderate"),
    ("citalopram", "amiodarone", "qt_prolongation", "major"),
    ("escitalopram", "amiodarone", "qt_prolongation", "major"),
    ("quetiapine", "amiodarone", "qt_prolongation", "major"),
    ("metronidazole", "amiodarone", "qt_prolongation", "moderate"),

    # --- CNS depression ---
    ("diazepam", "morphine", "cns_depression", "major"),
    ("diazepam", "fentanyl", "cns_depression", "contraindicated"),
    ("alprazolam", "morphine", "cns_depression", "major"),
    ("alprazolam", "fentanyl", "cns_depression", "contraindicated"),
    ("lorazepam", "morphine", "cns_depression", "major"),
    ("lorazepam", "fentanyl", "cns_depression", "contraindicated"),
    ("midazolam", "fentanyl", "cns_depression", "contraindicated"),
    ("diazepam", "alcohol", "cns_depression", "major"),
    ("alprazolam", "alcohol", "cns_depression", "major"),
    ("zolpidem", "alcohol", "cns_depression", "major"),
    ("tramadol", "diazepam", "cns_depression", "major"),
    ("tramadol", "alprazolam", "cns_depression", "major"),
    ("gabapentin", "morphine", "cns_depression", "major"),
    ("pregabalin", "morphine", "cns_depression", "major"),
    ("gabapentin", "tramadol", "cns_depression", "moderate"),
    ("pregabalin", "tramadol", "cns_depression", "moderate"),
    ("quetiapine", "diazepam", "cns_depression", "major"),
    ("olanzapine", "diazepam", "cns_depression", "major"),

    # --- Pharmacokinetic interactions ---
    ("simvastatin", "clarithromycin", "toxicity_increase", "contraindicated"),
    ("simvastatin", "erythromycin", "toxicity_increase", "major"),
    ("simvastatin", "itraconazole", "toxicity_increase", "contraindicated"),
    ("simvastatin", "ketoconazole", "toxicity_increase", "contraindicated"),
    ("simvastatin", "cyclosporine", "toxicity_increase", "contraindicated"),
    ("atorvastatin", "clarithromycin", "toxicity_increase", "major"),
    ("atorvastatin", "itraconazole", "toxicity_increase", "major"),
    ("atorvastatin", "cyclosporine", "toxicity_increase", "major"),
    ("simvastatin", "diltiazem", "toxicity_increase", "major"),
    ("simvastatin", "verapamil", "toxicity_increase", "major"),
    ("simvastatin", "amiodarone", "toxicity_increase", "major"),

    # Digoxin interactions
    ("digoxin", "amiodarone", "toxicity_increase", "major"),
    ("digoxin", "verapamil", "toxicity_increase", "major"),
    ("digoxin", "diltiazem", "toxicity_increase", "moderate"),
    ("digoxin", "clarithromycin", "toxicity_increase", "major"),
    ("digoxin", "erythromycin", "toxicity_increase", "moderate"),
    ("digoxin", "itraconazole", "toxicity_increase", "major"),
    ("digoxin", "furosemide", "toxicity_increase", "moderate"),
    ("digoxin", "hydrochlorothiazide", "toxicity_increase", "moderate"),

    # Theophylline
    ("theophylline", "ciprofloxacin", "toxicity_increase", "major"),
    ("theophylline", "erythromycin", "toxicity_increase", "major"),
    ("theophylline", "clarithromycin", "toxicity_increase", "major"),
    ("theophylline", "fluvoxamine", "toxicity_increase", "major"),

    # Carbamazepine/Phenytoin enzyme induction
    ("carbamazepine", "oral_contraceptive", "reduced_efficacy", "major"),
    ("phenytoin", "valproic_acid", "pharmacokinetic", "major"),
    ("carbamazepine", "valproic_acid", "pharmacokinetic", "major"),
    ("lamotrigine", "valproic_acid", "toxicity_increase", "major"),

    # PPI interactions
    ("omeprazole", "clopidogrel", "reduced_efficacy", "major"),
    ("esomeprazole", "clopidogrel", "reduced_efficacy", "major"),
    ("omeprazole", "methotrexate", "toxicity_increase", "moderate"),

    # Absorption interactions
    ("ciprofloxacin", "aluminum_hydroxide", "reduced_efficacy", "major"),
    ("ciprofloxacin", "calcium_carbonate", "reduced_efficacy", "moderate"),
    ("ciprofloxacin", "iron_supplement", "reduced_efficacy", "major"),
    ("levofloxacin", "aluminum_hydroxide", "reduced_efficacy", "major"),
    ("levofloxacin", "iron_supplement", "reduced_efficacy", "major"),
    ("doxycycline", "aluminum_hydroxide", "reduced_efficacy", "major"),
    ("doxycycline", "calcium_carbonate", "reduced_efficacy", "moderate"),
    ("doxycycline", "iron_supplement", "reduced_efficacy", "major"),
    ("levothyroxine", "calcium_carbonate", "reduced_efficacy", "moderate"),
    ("levothyroxine", "iron_supplement", "reduced_efficacy", "moderate"),
    ("levothyroxine", "aluminum_hydroxide", "reduced_efficacy", "moderate"),
    ("levothyroxine", "omeprazole", "reduced_efficacy", "moderate"),

    # Immunosuppressant interactions
    ("cyclosporine", "ketoconazole", "toxicity_increase", "major"),
    ("cyclosporine", "clarithromycin", "toxicity_increase", "major"),
    ("cyclosporine", "erythromycin", "toxicity_increase", "major"),
    ("tacrolimus", "ketoconazole", "toxicity_increase", "major"),
    ("tacrolimus", "clarithromycin", "toxicity_increase", "major"),
    ("tacrolimus", "fluconazole", "toxicity_increase", "major"),

    # Colchicine
    ("colchicine", "clarithromycin", "toxicity_increase", "contraindicated"),
    ("colchicine", "ketoconazole", "toxicity_increase", "major"),
    ("colchicine", "cyclosporine", "toxicity_increase", "contraindicated"),

    # Allopurinol
    ("allopurinol", "azathioprine", "toxicity_increase", "contraindicated"),

    # Lithium
    ("lithium", "furosemide", "toxicity_increase", "major"),
    ("lithium", "hydrochlorothiazide", "toxicity_increase", "major"),
    ("lithium", "enalapril", "toxicity_increase", "major"),
    ("lithium", "ramipril", "toxicity_increase", "major"),
    ("lithium", "losartan", "toxicity_increase", "major"),

    # Corticosteroid interactions
    ("prednisolone", "ibuprofen", "bleeding_risk", "moderate"),
    ("prednisolone", "aspirin", "bleeding_risk", "moderate"),
    ("dexamethasone", "warfarin", "pharmacokinetic", "moderate"),

    # NSAID + NSAID
    ("ibuprofen", "naproxen", "bleeding_risk", "major"),
    ("ibuprofen", "diclofenac", "bleeding_risk", "contraindicated"),
    ("naproxen", "diclofenac", "bleeding_risk", "contraindicated"),
    ("ibuprofen", "meloxicam", "bleeding_risk", "contraindicated"),
    ("ibuprofen", "piroxicam", "bleeding_risk", "contraindicated"),
    ("ibuprofen", "ketoprofen", "bleeding_risk", "contraindicated"),
    ("diclofenac", "meloxicam", "bleeding_risk", "contraindicated"),
    ("naproxen", "meloxicam", "bleeding_risk", "contraindicated"),
    ("celecoxib", "ibuprofen", "bleeding_risk", "major"),
    ("celecoxib", "naproxen", "bleeding_risk", "major"),
]

# Turkish explanations for interaction types
_INTERACTION_EXPLANATIONS_TR: dict[str, str] = {
    "none": "{drug_a} ile {drug_b} arasinda bilinen bir etkilesim bulunmamaktadir.",
    "pharmacokinetic": "{drug_a} ve {drug_b} birlikte kullanildiginda, bir ilacin emilimi, dagilimi, metabolizmasi veya atilimi degisebilir. Doz ayarlamasi gerekebilir.",
    "pharmacodynamic": "{drug_a} ile {drug_b} birlikte kullanildiginda, ilaclarin etkileri birbirini guclendirebilir veya azaltabilir.",
    "serotonin_syndrome": "UYARI: {drug_a} ve {drug_b} birlikte kullanilmasi serotonin sendromuna yol acabilir. Belirtiler: ates, ajitasyon, titreme, ishal, kas sertligi. Bu kombinasyon kontrendikedir.",
    "bleeding_risk": "{drug_a} ile {drug_b} birlikte kullanildiginda kanama riski onemli olcude artar. Hasta yakindan takip edilmeli, kanama belirtileri izlenmelidir.",
    "nephrotoxicity": "{drug_a} ve {drug_b} birlikte kullanilmasi bobrek fonksiyonlarini olumsuz etkileyebilir. Borek fonksiyon testleri yakindan izlenmelidir.",
    "hepatotoxicity": "{drug_a} ile {drug_b} birlikte kullanildiginda karaciger hasari riski artar. Karaciger fonksiyon testleri izlenmelidir.",
    "hypoglycemia": "{drug_a} ve {drug_b} birlikte kullanildiginda kan sekeri tehlikeli duzeyde dusebilir (hipoglisemi). Kan sekeri duzenli olarak izlenmelidir.",
    "hypotension": "{drug_a} ile {drug_b} birlikte kullanilmasi kan basincinin asiri dusmesine (hipotansiyon) neden olabilir. Tansiyon duzenli takip edilmelidir.",
    "hyperkalemia": "{drug_a} ve {drug_b} birlikte kullanildiginda kan potasyum duzeyi tehlikeli olcude yukselebilir (hiperkalemi). Potasyum duzeyleri izlenmelidir.",
    "qt_prolongation": "{drug_a} ile {drug_b} birlikte kullanilmasi kalp ritim bozukluguna (QT uzamasi) yol acabilir. EKG izlenmesi onerilir.",
    "cns_depression": "{drug_a} ve {drug_b} birlikte kullanildiginda merkezi sinir sistemi baskisi artabilir. Asiri uyuklama, solunum depresyonu riski vardir.",
    "reduced_efficacy": "{drug_a} ile {drug_b} birlikte kullanildiginda ilaclarin birinin etkinligi azalabilir. Alternatif tedavi degerlendirilmelidir.",
    "toxicity_increase": "{drug_a} ve {drug_b} birlikte kullanildiginda ilac toksisite riski artar. Doz ayarlamasi ve yakin takip gereklidir.",
}

_SEVERITY_EXPLANATIONS_TR: dict[str, str] = {
    "none": "Etkilesim yok",
    "minor": "Hafif etkilesim - genellikle klinik olarak onemli degildir",
    "moderate": "Orta duzeyde etkilesim - hasta izlenmeli, gerekirse doz ayarlanmali",
    "major": "Ciddi etkilesim - mumkunse alternatif ilac kullanilmali, kullanilacaksa yakin takip gerekli",
    "contraindicated": "KONTREND&304;KE - bu ilaclar birlikte kullanilmamalidir",
}


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

# Collect all unique categories and ATC prefixes for encoding
_ALL_CATEGORIES = sorted(set(d["category"] for d in DRUG_METADATA.values()))
_ALL_ATC_PREFIXES = sorted(set(d["atc"][:3] for d in DRUG_METADATA.values()))

_CATEGORY_INDEX = {c: i for i, c in enumerate(_ALL_CATEGORIES)}
_ATC_INDEX = {a: i for i, a in enumerate(_ALL_ATC_PREFIXES)}


def _drug_features(drug_name: str) -> np.ndarray:
    """Convert a drug name into a numeric feature vector."""
    meta = DRUG_METADATA.get(drug_name.lower())
    if meta is None:
        # Unknown drug: use hash-based pseudo-features
        h = int(hashlib.md5(drug_name.lower().encode()).hexdigest()[:8], 16)
        cat_idx = h % len(_ALL_CATEGORIES)
        atc_idx = (h >> 8) % len(_ALL_ATC_PREFIXES)
        mw = (h >> 16) % 4 + 1
        pb = (h >> 20) % 3 + 1
        hl = (h >> 24) % 3 + 1
    else:
        cat_idx = _CATEGORY_INDEX.get(meta["category"], 0)
        atc_prefix = meta["atc"][:3]
        atc_idx = _ATC_INDEX.get(atc_prefix, 0)
        mw = meta["mw"]
        pb = meta["pb"]
        hl = meta["hl"]

    return np.array([cat_idx, atc_idx, mw, pb, hl], dtype=np.float64)


def _pair_features(drug_a: str, drug_b: str) -> np.ndarray:
    """
    Create a symmetric feature vector for a drug pair.
    Always orders alphabetically so (A,B) == (B,A).
    """
    a, b = sorted([drug_a.lower(), drug_b.lower()])
    fa = _drug_features(a)
    fb = _drug_features(b)

    # Features: [fa..., fb..., abs_diff..., same_category, same_atc]
    diff = np.abs(fa - fb)
    same_cat = 1.0 if fa[0] == fb[0] else 0.0
    same_atc = 1.0 if fa[1] == fb[1] else 0.0

    return np.concatenate([fa, fb, diff, [same_cat, same_atc]])


# ---------------------------------------------------------------------------
# Model training & caching (lazy singleton)
# ---------------------------------------------------------------------------

class _InteractionModel:
    """Lazily trained drug interaction prediction model."""

    def __init__(self):
        self._type_model: Optional[GradientBoostingClassifier] = None
        self._severity_model: Optional[GradientBoostingClassifier] = None
        self._type_encoder = LabelEncoder()
        self._severity_encoder = LabelEncoder()
        self._trained = False
        # Build a lookup for exact matches
        self._known: dict[tuple[str, str], tuple[str, str]] = {}

    def _ensure_trained(self):
        if self._trained:
            return
        self._train()

    def _train(self):
        logger.info("Training AI drug interaction model...")

        # Build known interaction lookup
        for drug_a, drug_b, itype, sev in KNOWN_INTERACTIONS:
            key = tuple(sorted([drug_a.lower(), drug_b.lower()]))
            self._known[key] = (itype, sev)

        # Build training data: known interactions + negative samples
        X_rows = []
        y_type = []
        y_severity = []

        # Positive samples from known interactions
        for drug_a, drug_b, itype, sev in KNOWN_INTERACTIONS:
            feats = _pair_features(drug_a, drug_b)
            X_rows.append(feats)
            y_type.append(itype)
            y_severity.append(sev)

        # Generate negative samples (safe combinations)
        all_drugs = list(DRUG_METADATA.keys())
        known_keys = set(self._known.keys())
        neg_count = 0
        target_neg = len(KNOWN_INTERACTIONS)  # equal number of negatives

        for i, da in enumerate(all_drugs):
            if neg_count >= target_neg:
                break
            for db in all_drugs[i + 1:]:
                if neg_count >= target_neg:
                    break
                key = tuple(sorted([da, db]))
                if key not in known_keys:
                    feats = _pair_features(da, db)
                    X_rows.append(feats)
                    y_type.append("none")
                    y_severity.append("none")
                    neg_count += 1

        X = np.array(X_rows)

        # Encode labels
        self._type_encoder.fit(INTERACTION_TYPES)
        self._severity_encoder.fit(SEVERITY_LEVELS)

        y_t = self._type_encoder.transform(y_type)
        y_s = self._severity_encoder.transform(y_severity)

        # Train gradient boosting classifiers
        self._type_model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=5,
            random_state=42,
            min_samples_leaf=2,
        )
        self._type_model.fit(X, y_t)

        self._severity_model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=5,
            random_state=42,
            min_samples_leaf=2,
        )
        self._severity_model.fit(X, y_s)

        self._trained = True
        logger.info(
            "AI model trained on %d interactions (%d positive, %d negative)",
            len(X_rows), len(KNOWN_INTERACTIONS), neg_count,
        )

    def predict(self, drug_a: str, drug_b: str) -> dict:
        """Predict interaction between two drugs."""
        self._ensure_trained()

        a = drug_a.lower().strip()
        b = drug_b.lower().strip()

        # Same drug check
        if a == b:
            return {
                "drug_a": drug_a,
                "drug_b": drug_b,
                "interaction_type": "none",
                "severity": "none",
                "confidence": 1.0,
                "is_known": False,
                "source": "same_drug",
            }

        key = tuple(sorted([a, b]))

        # Check exact known interactions first
        if key in self._known:
            itype, sev = self._known[key]
            return {
                "drug_a": drug_a,
                "drug_b": drug_b,
                "interaction_type": itype,
                "severity": sev,
                "confidence": 0.95,
                "is_known": True,
                "source": "known_database",
            }

        # Use ML model for prediction
        feats = _pair_features(a, b).reshape(1, -1)

        type_proba = self._type_model.predict_proba(feats)[0]
        type_idx = np.argmax(type_proba)
        type_conf = float(type_proba[type_idx])
        predicted_type = self._type_encoder.inverse_transform([type_idx])[0]

        severity_proba = self._severity_model.predict_proba(feats)[0]
        sev_idx = np.argmax(severity_proba)
        sev_conf = float(severity_proba[sev_idx])
        predicted_severity = self._severity_encoder.inverse_transform([sev_idx])[0]

        # If model predicts "none" type, severity should also be "none"
        if predicted_type == "none":
            predicted_severity = "none"

        # Combined confidence
        confidence = round(min(type_conf, sev_conf), 4)

        return {
            "drug_a": drug_a,
            "drug_b": drug_b,
            "interaction_type": predicted_type,
            "severity": predicted_severity,
            "confidence": confidence,
            "is_known": False,
            "source": "ml_prediction",
        }


# Singleton model instance
_model = _InteractionModel()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def predict_interaction(drug_a: str, drug_b: str) -> dict:
    """
    Predict the interaction between two drugs.

    Returns:
        dict with keys:
            - drug_a, drug_b: input drug names
            - interaction_type: one of INTERACTION_TYPES
            - severity: one of SEVERITY_LEVELS
            - confidence: float 0-1
            - is_known: bool, whether this is from the known database
            - source: "known_database", "ml_prediction", or "same_drug"
    """
    return _model.predict(drug_a, drug_b)


def check_prescription_interactions(medications: list[dict]) -> list[dict]:
    """
    Check all pairwise interactions in a prescription.

    Args:
        medications: list of dicts, each must have a "name" key.

    Returns:
        list of interaction dicts (only non-"none" interactions),
        sorted by severity (most severe first).
    """
    if not medications or len(medications) < 2:
        return []

    drug_names = []
    for med in medications:
        name = med.get("name", "").strip()
        if name:
            drug_names.append(name)

    if len(drug_names) < 2:
        return []

    results = []
    severity_order = {s: i for i, s in enumerate(SEVERITY_LEVELS)}

    for a, b in combinations(drug_names, 2):
        interaction = predict_interaction(a, b)
        if interaction["interaction_type"] != "none":
            results.append(interaction)

    # Sort: contraindicated first, then major, moderate, minor
    results.sort(key=lambda x: severity_order.get(x["severity"], 0), reverse=True)

    return results


def get_interaction_explanation(drug_a: str, drug_b: str) -> str:
    """
    Get a Turkish-language explanation of the interaction between two drugs.

    Returns a human-readable string in Turkish.
    """
    interaction = predict_interaction(drug_a, drug_b)
    itype = interaction["interaction_type"]
    severity = interaction["severity"]

    template = _INTERACTION_EXPLANATIONS_TR.get(itype, _INTERACTION_EXPLANATIONS_TR["none"])
    explanation = template.format(drug_a=drug_a.capitalize(), drug_b=drug_b.capitalize())

    severity_text = _SEVERITY_EXPLANATIONS_TR.get(severity, "")
    if severity_text and severity != "none":
        explanation += f"\n\nSiddet derecesi: {severity_text}"

    if interaction["confidence"] < 0.7 and not interaction["is_known"]:
        explanation += "\n\nNot: Bu tahmin yapay zeka modeli tarafindan dusuk guvenilirlik ile uretilmistir. Klinik degerlendirme onerilir."

    return explanation
