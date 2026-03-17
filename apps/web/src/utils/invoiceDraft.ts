import type { Party } from '@/types/party/party-base.types';

type DraftDiscountType = 'amount' | 'percentage';

export interface InvoiceDraftLine {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountType: DraftDiscountType;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface InvoiceDraftPayload {
  invoiceType: string;
  scenario: string;
  currency: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  customerName: string;
  customerTcNumber: string;
  customerTaxId: string;
  customerAddress: string;
  customerCity: string;
  customerDistrict: string;
  items: InvoiceDraftLine[];
  totalAmount: number;
  saleId?: string;
  saleIds?: string[];
  proformaNumber?: string;
  notes?: string;
  /** Return invoice reference details (iade fatura bilgileri) */
  returnInvoiceDetails?: {
    returnInvoiceNumber?: string;
    returnInvoiceDate?: string;
    returnReason?: string;
  };
}

export interface SaleInvoiceSource {
  id?: string;
  productId?: string | null;
  productName?: string | null;
  brand?: string | null;
  model?: string | null;
  finalAmount?: number | null;
  totalAmount?: number | null;
  kdvRate?: number | null;
  vatRate?: number | null;
  currentInventoryVatRate?: number | null;
  discountAmount?: number | null;
  quantity?: number | null;
  devices?: Array<{
    name?: string | null;
    salePrice?: number | null;
    listPrice?: number | null;
  }>;
}

export interface ProformaDocumentSource {
  metadata?: Record<string, unknown>;
}

export interface PartyInvoiceCustomer {
  id?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  tcNumber?: string;
  tc_number?: string;
  taxNumber?: string;
  tax_number?: string;
  addressFull?: string;
  address_full?: string;
  addressCity?: string;
  address_city?: string;
  addressDistrict?: string;
  address_district?: string;
}

const SESSION_KEY = 'invoice_copy_draft';

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeText = (value: unknown): string => (typeof value === 'string' ? value : '');

const createDraftLine = ({
  id,
  name,
  quantity,
  unitPrice,
  discount = 0,
  discountType = 'amount',
  taxRate,
}: {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: DraftDiscountType;
  taxRate: number;
}): InvoiceDraftLine => {
  const safeQuantity = quantity > 0 ? quantity : 1;
  const safeUnitPrice = toNumber(unitPrice);
  const safeDiscount = toNumber(discount);
  const safeTaxRate = taxRate >= 0 ? taxRate : 0;
  const subtotal = safeUnitPrice * safeQuantity;
  const discountAmount =
    discountType === 'percentage'
      ? subtotal * (safeDiscount / 100)
      : safeDiscount;
  const taxBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = Number(((taxBase * safeTaxRate) / 100).toFixed(2));
  const total = Number((taxBase + taxAmount).toFixed(2));

  return {
    id,
    name,
    quantity: safeQuantity,
    unit: 'Adet',
    unitPrice: Number(safeUnitPrice.toFixed(2)),
    discount: Number(safeDiscount.toFixed(2)),
    discountType,
    taxRate: safeTaxRate,
    taxAmount,
    total,
  };
};

export const getPartyInvoiceCustomer = (
  party?: PartyInvoiceCustomer | Party | null,
): Omit<InvoiceDraftPayload, 'invoiceType' | 'scenario' | 'currency' | 'items' | 'totalAmount' | 'saleId' | 'saleIds' | 'proformaNumber'> => {
  const firstName = party?.firstName || party?.first_name || '';
  const lastName = party?.lastName || party?.last_name || '';
  const tcNumber = party?.tcNumber || party?.tc_number || '';
  const taxNumber = party?.taxNumber || party?.tax_number || '';
  const customerName = [firstName, lastName].filter(Boolean).join(' ');

  return {
    customerId: party?.id || '',
    customerFirstName: firstName,
    customerLastName: lastName,
    customerName,
    customerTcNumber: tcNumber,
    customerTaxId: taxNumber || tcNumber,
    customerAddress: party?.addressFull || party?.address_full || '',
    customerCity: party?.addressCity || party?.address_city || '',
    customerDistrict: party?.addressDistrict || party?.address_district || '',
  };
};

const buildLineFromGross = (
  id: string,
  name: string,
  grossTotal: number,
  quantity: number,
  taxRate: number,
): InvoiceDraftLine => {
  const safeQuantity = quantity > 0 ? quantity : 1;
  const safeTaxRate = taxRate >= 0 ? taxRate : 0;
  const divisor = 1 + safeTaxRate / 100;
  const baseTotal = divisor > 0 ? grossTotal / divisor : grossTotal;

  return createDraftLine({
    id,
    name,
    quantity: safeQuantity,
    unitPrice: Number((baseTotal / safeQuantity).toFixed(2)),
    taxRate: safeTaxRate,
  });
};

const getSaleLineName = (sale: SaleInvoiceSource): string => {
  if (sale.productName) return sale.productName;
  const deviceName = sale.devices?.[0]?.name;
  if (deviceName) return deviceName;
  return [sale.brand, sale.model].filter(Boolean).join(' ') || 'Satış Kalemi';
};

const getSaleTaxRate = (sale: SaleInvoiceSource): number => {
  if (sale.currentInventoryVatRate !== null && sale.currentInventoryVatRate !== undefined) {
    return toNumber(sale.currentInventoryVatRate, 0);
  }
  if (sale.kdvRate !== null && sale.kdvRate !== undefined) return toNumber(sale.kdvRate, 0);
  if (sale.vatRate !== null && sale.vatRate !== undefined) return toNumber(sale.vatRate, 0);
  return 20;
};

export const buildInvoiceDraftFromSales = ({
  sales,
  party,
}: {
  sales: SaleInvoiceSource[];
  party?: PartyInvoiceCustomer | Party | null;
}): InvoiceDraftPayload => {
  const customer = getPartyInvoiceCustomer(party);
  const items = sales.map((sale) => {
    const grossTotal = toNumber(sale.finalAmount ?? sale.totalAmount);
    const quantity =
      toNumber(sale.quantity) ||
      (Array.isArray(sale.devices) && sale.devices.length > 0 ? sale.devices.length : 1);
    const taxRate = getSaleTaxRate(sale);
    return buildLineFromGross(
      sale.id || `sale-line-${Math.random().toString(36).slice(2, 10)}`,
      getSaleLineName(sale),
      grossTotal,
      quantity,
      taxRate,
    );
  });

  return {
    invoiceType: '0',
    scenario: 'other',
    currency: 'TRY',
    ...customer,
    items,
    totalAmount: Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2)),
    saleId: sales.length === 1 ? sales[0]?.id : undefined,
    saleIds: sales.map((sale) => sale.id).filter((id): id is string => Boolean(id)),
  };
};

export const buildInvoiceDraftFromProforma = ({
  document,
  party,
  partyId,
}: {
  document: ProformaDocumentSource;
  party?: PartyInvoiceCustomer | Party | null;
  partyId: string;
}): InvoiceDraftPayload => {
  const meta = document.metadata || {};
  const metaParty = ((meta.party as Record<string, unknown> | undefined) || {}) as PartyInvoiceCustomer;
  const customer = getPartyInvoiceCustomer({
    ...party,
    ...metaParty,
    id: metaParty.id || party?.id || partyId,
  });

  const rawItems = Array.isArray(meta.items) ? meta.items : [];
  const items =
    rawItems.length > 0
      ? rawItems.map((rawItem) => {
          const item = (rawItem || {}) as Record<string, unknown>;
          const quantity = toNumber(item.quantity, 1);
          const taxRate = toNumber(item.vatRate, 20);
          return createDraftLine({
            id:
              sanitizeText(item.productId) ||
              sanitizeText(item.id) ||
              `proforma-line-${Math.random().toString(36).slice(2, 10)}`,
            name: sanitizeText(item.name) || 'Proforma Kalemi',
            quantity,
            unitPrice: toNumber(item.unitPrice),
            discount: toNumber(item.discountAmount),
            discountType: 'amount',
            taxRate,
          });
        })
      : [
          buildLineFromGross('proforma-line-fallback', 'Proforma Kalemi', toNumber(meta.grandTotal), 1, 20),
        ];

  return {
    invoiceType: '0',
    scenario: 'other',
    currency: 'TRY',
    ...customer,
    items,
    totalAmount: Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2)),
    proformaNumber: sanitizeText(meta.proformaNumber),
  };
};

export const storeInvoiceDraft = (draft: InvoiceDraftPayload) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
};
