import React from 'react';
import { COUNTRY_REGISTRY, type CountryCode } from '@/config/countryRegistry';
import { PRODUCT_REGISTRY, type ProductCode } from '@/config/productRegistry';

const SECTORS = Object.entries(PRODUCT_REGISTRY)
  .filter(([, config]) => config.enabled)
  .map(([code, config]) => ({
    code: config.sector,
    name: config.name,
    productCode: code as ProductCode,
  }))
  .filter((item, index, self) => self.findIndex((s) => s.code === item.code) === index);

const COUNTRIES = Object.entries(COUNTRY_REGISTRY).map(([code, config]) => ({
  code: code as CountryCode,
  name: config.nativeName || config.name,
  flag: config.flag,
  currency: config.currency,
}));

interface SectorCountryFilterProps {
  sector: string;
  countryCode: string;
  onSectorChange: (sector: string) => void;
  onCountryChange: (countryCode: string) => void;
  showSector?: boolean;
  showCountry?: boolean;
  className?: string;
}

export const SectorCountryFilter: React.FC<SectorCountryFilterProps> = ({
  sector,
  countryCode,
  onSectorChange,
  onCountryChange,
  showSector = true,
  showCountry = true,
  className = '',
}) => {
  return (
    <div className={`flex gap-3 ${className}`}>
      {showSector && (
        <select
          value={sector}
          onChange={(e) => onSectorChange(e.target.value)}
          className="rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Tüm Sektörler</option>
          {SECTORS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      {showCountry && (
        <select
          value={countryCode}
          onChange={(e) => onCountryChange(e.target.value)}
          className="rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Tüm Ülkeler</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name} ({c.currency})
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

interface SectorCountrySelectProps {
  sector: string;
  countryCode: string;
  onSectorChange: (sector: string) => void;
  onCountryChange: (countryCode: string) => void;
  showSector?: boolean;
  showCountry?: boolean;
}

export const SectorCountryFormFields: React.FC<SectorCountrySelectProps> = ({
  sector,
  countryCode,
  onSectorChange,
  onCountryChange,
  showSector = true,
  showCountry = true,
}) => {
  return (
    <>
      {showSector && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sektör</label>
          <select
            value={sector}
            onChange={(e) => onSectorChange(e.target.value)}
            className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Tüm Sektörler (Genel)</option>
            {SECTORS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {showCountry && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ülke</label>
          <select
            value={countryCode}
            onChange={(e) => onCountryChange(e.target.value)}
            className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Tüm Ülkeler (Genel)</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} ({c.currency})
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
};

export const getSectorLabel = (sectorCode: string): string => {
  const found = SECTORS.find((s) => s.code === sectorCode);
  return found?.name || sectorCode;
};

export const getCountryLabel = (code: string): string => {
  const config = COUNTRY_REGISTRY[code as CountryCode];
  if (!config) return code;
  return `${config.flag} ${config.nativeName || config.name}`;
};

export { SECTORS, COUNTRIES };
