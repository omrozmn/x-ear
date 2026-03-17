import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonEn from './locales/en/common.json';
import commonTr from './locales/tr/common.json';
import layoutEn from './locales/en/layout.json';
import layoutTr from './locales/tr/layout.json';
import constantsEn from './locales/en/constants.json';
import constantsTr from './locales/tr/constants.json';
import authEn from './locales/en/auth.json';
import authTr from './locales/tr/auth.json';
import patientsEn from './locales/en/patients.json';
import patientsTr from './locales/tr/patients.json';
import appointmentsEn from './locales/en/appointments.json';
import appointmentsTr from './locales/tr/appointments.json';
import financeEn from './locales/en/finance.json';
import financeTr from './locales/tr/finance.json';
import settingsEn from './locales/en/settings.json';
import settingsTr from './locales/tr/settings.json';
import validationEn from './locales/en/validation.json';
import validationTr from './locales/tr/validation.json';
import personnelEn from './locales/en/personnel.json';
import personnelTr from './locales/tr/personnel.json';

// Sector terminology overlays
import sectorHearingTr from './locales/tr/sectors/hearing.json';
import sectorPharmacyTr from './locales/tr/sectors/pharmacy.json';
import sectorHospitalTr from './locales/tr/sectors/hospital.json';
import sectorHotelTr from './locales/tr/sectors/hotel.json';
import sectorBeautyTr from './locales/tr/sectors/beauty.json';
import sectorGeneralTr from './locales/tr/sectors/general.json';
import sectorMedicalTr from './locales/tr/sectors/medical.json';
import sectorOpticTr from './locales/tr/sectors/optic.json';
import sectorHearingEn from './locales/en/sectors/hearing.json';
import sectorPharmacyEn from './locales/en/sectors/pharmacy.json';
import sectorHospitalEn from './locales/en/sectors/hospital.json';
import sectorHotelEn from './locales/en/sectors/hotel.json';
import sectorBeautyEn from './locales/en/sectors/beauty.json';
import sectorGeneralEn from './locales/en/sectors/general.json';
import sectorMedicalEn from './locales/en/sectors/medical.json';
import sectorOpticEn from './locales/en/sectors/optic.json';

// Define resources
const resources = {
    en: {
        common: commonEn,
        layout: layoutEn,
        constants: constantsEn,
        auth: authEn,
        patients: patientsEn,
        appointments: appointmentsEn,
        finance: financeEn,
        settings: settingsEn,
        validation: validationEn,
        personnel: personnelEn,
        // Sector namespaces
        sector_hearing: sectorHearingEn,
        sector_pharmacy: sectorPharmacyEn,
        sector_hospital: sectorHospitalEn,
        sector_hotel: sectorHotelEn,
        sector_beauty: sectorBeautyEn,
        sector_general: sectorGeneralEn,
        sector_medical: sectorMedicalEn,
        sector_optic: sectorOpticEn,
    },
    tr: {
        common: commonTr,
        layout: layoutTr,
        constants: constantsTr,
        auth: authTr,
        patients: patientsTr,
        appointments: appointmentsTr,
        finance: financeTr,
        settings: settingsTr,
        validation: validationTr,
        personnel: personnelTr,
        // Sector namespaces
        sector_hearing: sectorHearingTr,
        sector_pharmacy: sectorPharmacyTr,
        sector_hospital: sectorHospitalTr,
        sector_hotel: sectorHotelTr,
        sector_beauty: sectorBeautyTr,
        sector_general: sectorGeneralTr,
        sector_medical: sectorMedicalTr,
        sector_optic: sectorOpticTr,
    },
};

i18n
    // detect user language
    // learn more: https://github.com/i18next/i18next-browser-languagedetector
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next.
    .use(initReactI18next)
    // init i18next
    // for all options read: https://www.i18next.com/overview/configuration-options
    .init({
        resources,
        fallbackLng: 'tr', // Default language
        debug: import.meta.env.DEV, // Enable debug in development

        ns: ['common'],
        defaultNS: 'common',

        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },

        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        }
    });

/**
 * Apply sector terminology overlay on the 'sector' namespace.
 * Call this when the tenant sector is known (e.g., after auth + features load).
 *
 * Usage:
 *   applySectorOverlay('pharmacy');
 *   t('sector:party') // → "Müşteri"
 */
export function applySectorOverlay(sector: string): void {
    const ns = `sector_${sector}`;
    // Add 'sector' as an alias namespace pointing to the sector-specific bundle
    const trBundle = i18n.getResourceBundle('tr', ns);
    const enBundle = i18n.getResourceBundle('en', ns);

    if (trBundle) {
        i18n.addResourceBundle('tr', 'sector', trBundle, true, true);
    }
    if (enBundle) {
        i18n.addResourceBundle('en', 'sector', enBundle, true, true);
    }
}

export default i18n;
