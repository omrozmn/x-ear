export interface CountryConfig {
    name: string;
    nativeName: string;
    flag: string;
    currency: string;
    locale: string;
    timezone: string;
    phonePrefix: string;
}

export const COUNTRY_REGISTRY: Record<string, CountryConfig> = {
    TR: { name: "Turkey", nativeName: "T\u00FCrkiye", flag: "\uD83C\uDDF9\uD83C\uDDF7", currency: "TRY", locale: "tr-TR", timezone: "Europe/Istanbul", phonePrefix: "+90" },
    US: { name: "United States", nativeName: "United States", flag: "\uD83C\uDDFA\uD83C\uDDF8", currency: "USD", locale: "en-US", timezone: "America/New_York", phonePrefix: "+1" },
    CA: { name: "Canada", nativeName: "Canada", flag: "\uD83C\uDDE8\uD83C\uDDE6", currency: "CAD", locale: "en-CA", timezone: "America/Toronto", phonePrefix: "+1" },
    DE: { name: "Germany", nativeName: "Deutschland", flag: "\uD83C\uDDE9\uD83C\uDDEA", currency: "EUR", locale: "de-DE", timezone: "Europe/Berlin", phonePrefix: "+49" },
    FR: { name: "France", nativeName: "France", flag: "\uD83C\uDDEB\uD83C\uDDF7", currency: "EUR", locale: "fr-FR", timezone: "Europe/Paris", phonePrefix: "+33" },
    NL: { name: "Netherlands", nativeName: "Nederland", flag: "\uD83C\uDDF3\uD83C\uDDF1", currency: "EUR", locale: "nl-NL", timezone: "Europe/Amsterdam", phonePrefix: "+31" },
    SA: { name: "Saudi Arabia", nativeName: "\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629", flag: "\uD83C\uDDF8\uD83C\uDDE6", currency: "SAR", locale: "ar-SA", timezone: "Asia/Riyadh", phonePrefix: "+966" },
    AE: { name: "United Arab Emirates", nativeName: "\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0645\u062A\u062D\u062F\u0629", flag: "\uD83C\uDDE6\uD83C\uDDEA", currency: "AED", locale: "ar-AE", timezone: "Asia/Dubai", phonePrefix: "+971" },
    QA: { name: "Qatar", nativeName: "\u0642\u0637\u0631", flag: "\uD83C\uDDF6\uD83C\uDDE6", currency: "QAR", locale: "ar-QA", timezone: "Asia/Qatar", phonePrefix: "+974" },
    IQ: { name: "Iraq", nativeName: "\u0627\u0644\u0639\u0631\u0627\u0642", flag: "\uD83C\uDDEE\uD83C\uDDF6", currency: "IQD", locale: "ar-IQ", timezone: "Asia/Baghdad", phonePrefix: "+964" },
} as const;

export type CountryCode = keyof typeof COUNTRY_REGISTRY;

export const getCountryConfig = (code: string): CountryConfig => {
    return COUNTRY_REGISTRY[code as CountryCode] || COUNTRY_REGISTRY.TR;
};
