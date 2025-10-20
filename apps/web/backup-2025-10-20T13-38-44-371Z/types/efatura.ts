// E-Fatura XML Generation Types
// Based on GIB UBL-TR 1.2 Standard

export interface EFaturaXMLData {
  invoice: EFaturaInvoice;
  supplier: EFaturaParty;
  customer: EFaturaParty;
  invoiceLines: EFaturaInvoiceLine[];
  taxTotals: EFaturaTaxTotal[];
  legalMonetaryTotal: EFaturaLegalMonetaryTotal;
}

export interface EFaturaInvoice {
  id: string;
  uuid: string;
  issueDate: string;
  issueTime: string;
  invoiceTypeCode: string; // SATIS, IADE, TEVKIFAT, ISTISNA, OZELMATRAH
  note?: string;
  documentCurrencyCode: string; // TRY, USD, EUR, etc.
  taxCurrencyCode?: string;
  pricingCurrencyCode?: string;
  paymentCurrencyCode?: string;
  lineCountNumeric: number;
}

export interface EFaturaParty {
  partyIdentification: {
    id: string; // VKN or TCKN
    schemeID: string; // VKN or TCKN
  };
  partyName?: {
    name: string;
  };
  postalAddress: {
    streetName: string;
    buildingNumber?: string;
    citySubdivisionName?: string;
    cityName: string;
    postalZone?: string;
    country: {
      identificationCode: string; // TR
      name: string; // Türkiye
    };
  };
  partyTaxScheme?: {
    taxScheme: {
      name: string; // Vergi Dairesi
    };
  };
  contact?: {
    telephone?: string;
    electronicMail?: string;
  };
}

export interface EFaturaInvoiceLine {
  id: string;
  invoicedQuantity: {
    unitCode: string; // C62, NIU, etc.
    value: number;
  };
  lineExtensionAmount: {
    currencyID: string;
    value: number;
  };
  allowanceCharges?: EFaturaAllowanceCharge[];
  taxTotal?: EFaturaTaxTotal;
  item: {
    name: string;
    description?: string;
    sellersItemIdentification?: {
      id: string;
    };
    standardItemIdentification?: {
      id: string;
      schemeID?: string;
    };
    commodityClassification?: {
      itemClassificationCode: {
        listID: string;
        value: string;
      };
    };
  };
  price: {
    priceAmount: {
      currencyID: string;
      value: number;
    };
    baseQuantity?: {
      unitCode: string;
      value: number;
    };
  };
}

export interface EFaturaAllowanceCharge {
  chargeIndicator: boolean; // true for charge, false for allowance
  allowanceChargeReason?: string;
  multiplierFactorNumeric?: number;
  amount: {
    currencyID: string;
    value: number;
  };
  baseAmount?: {
    currencyID: string;
    value: number;
  };
}

export interface EFaturaTaxTotal {
  taxAmount: {
    currencyID: string;
    value: number;
  };
  taxSubtotals: EFaturaTaxSubtotal[];
}

export interface EFaturaTaxSubtotal {
  taxableAmount: {
    currencyID: string;
    value: number;
  };
  taxAmount: {
    currencyID: string;
    value: number;
  };
  calculationSequenceNumeric?: number;
  percent?: number;
  taxCategory: {
    taxScheme: {
      name: string; // KDV, ÖTV, etc.
      taxTypeCode: string; // 0015 for KDV
    };
  };
}

export interface EFaturaLegalMonetaryTotal {
  lineExtensionAmount: {
    currencyID: string;
    value: number;
  };
  taxExclusiveAmount: {
    currencyID: string;
    value: number;
  };
  taxInclusiveAmount: {
    currencyID: string;
    value: number;
  };
  allowanceTotalAmount?: {
    currencyID: string;
    value: number;
  };
  chargeTotalAmount?: {
    currencyID: string;
    value: number;
  };
  payableAmount: {
    currencyID: string;
    value: number;
  };
}

export interface EFaturaXMLOptions {
  includeSignature?: boolean;
  validateXML?: boolean;
  formatXML?: boolean;
  encoding?: string; // UTF-8, ISO-8859-9
  schemaLocation?: string;
}

export interface EFaturaXMLResult {
  success: boolean;
  xmlContent?: string;
  fileName?: string;
  ettn?: string;
  errors?: string[];
  warnings?: string[];
  validationResult?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface EFaturaSubmissionData {
  xmlContent: string;
  fileName: string;
  invoiceId: string;
  ettn: string;
  submissionType: 'single' | 'batch';
  integratorInfo?: {
    companyName: string;
    contactEmail: string;
    apiEndpoint?: string;
  };
}

export interface EFaturaIntegratorResponse {
  success: boolean;
  submissionId?: string;
  ettn?: string;
  status: 'received' | 'processing' | 'sent_to_gib' | 'accepted' | 'rejected';
  message?: string;
  errors?: string[];
  gibResponse?: {
    responseDate: string;
    status: string;
    errorCode?: string;
    errorMessage?: string;
  };
}

// UBL-TR Standard Code Lists
export const EFATURA_INVOICE_TYPE_CODES = {
  SATIS: 'SATIS',           // Satış Faturası
  IADE: 'IADE',             // İade Faturası
  TEVKIFAT: 'TEVKIFAT',     // Tevkifat Faturası
  ISTISNA: 'ISTISNA',       // İstisna Faturası
  OZELMATRAH: 'OZELMATRAH'  // Özel Matrah Faturası
} as const;

export const EFATURA_CURRENCY_CODES = {
  TRY: 'TRY',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP'
} as const;

export const EFATURA_UNIT_CODES = {
  C62: 'C62', // Adet
  NIU: 'NIU', // Sayı
  KGM: 'KGM', // Kilogram
  LTR: 'LTR', // Litre
  MTR: 'MTR', // Metre
  MTK: 'MTK', // Metrekare
  MTQ: 'MTQ', // Metreküp
  HUR: 'HUR', // Saat
  DAY: 'DAY', // Gün
  MON: 'MON', // Ay
  ANN: 'ANN'  // Yıl
} as const;

export const EFATURA_TAX_SCHEME_CODES = {
  KDV: '0015',  // Katma Değer Vergisi
  OTV: '9021',  // Özel Tüketim Vergisi
  TEVKIFAT: '9015', // Tevkifat
  STOPAJ: '9013'    // Stopaj
} as const;

export type EFaturaInvoiceTypeCode = keyof typeof EFATURA_INVOICE_TYPE_CODES;
export type EFaturaCurrencyCode = keyof typeof EFATURA_CURRENCY_CODES;
export type EFaturaUnitCode = keyof typeof EFATURA_UNIT_CODES;
export type EFaturaTaxSchemeCode = keyof typeof EFATURA_TAX_SCHEME_CODES;