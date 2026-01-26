import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { i18n, t } = useTranslation();

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'tr' ? 'en' : 'tr';
        i18n.changeLanguage(nextLang);
    };

    return (
        <button
            data-allow-raw="true"
            onClick={toggleLanguage}
            className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium ${className}`}
            title={t('language.select')}
        >
            <Languages className="w-4 h-4" />
            <span>{i18n.language === 'tr' ? 'EN' : 'TR'}</span>
        </button>
    );
};
