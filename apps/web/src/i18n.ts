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

export default i18n;
