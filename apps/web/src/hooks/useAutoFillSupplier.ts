/**
 * Hook to auto-fill supplier details from incoming invoice data.
 * Matches supplier by taxNumber or companyName and extracts available fields.
 */
import { useMemo } from 'react';
import { useListInvoices } from '@/api/client/invoices.client';
import type { InvoiceRead } from '@/api/generated/schemas';

export interface AutoFillData {
  companyName?: string;
  taxNumber?: string;
  taxOffice?: string;
  address?: string;
  city?: string;
}

/**
 * Given a tax number or company name, attempts to find matching invoice sender
 * data and returns auto-fillable fields.
 */
export const useAutoFillSupplier = (taxNumber?: string, companyName?: string) => {
  const { data, isLoading } = useListInvoices(
    { per_page: 200 },
    { query: { enabled: !!(taxNumber || companyName) } },
  );

  const autoFillData = useMemo((): AutoFillData | null => {
    if (!data?.data) return null;
    const invoices: InvoiceRead[] = Array.isArray(data.data) ? data.data : [];

    // Try to find a matching invoice by tax office (taxNumber field) or party name
    let matchingInvoice: InvoiceRead | undefined;

    if (taxNumber) {
      matchingInvoice = invoices.find(inv =>
        inv.taxOffice && inv.taxOffice === taxNumber
      );
    }

    if (!matchingInvoice && companyName) {
      const lowerName = companyName.toLowerCase().trim();
      matchingInvoice = invoices.find(inv =>
        inv.partyName && inv.partyName.toLowerCase().trim() === lowerName
      );
    }

    if (!matchingInvoice) return null;

    return {
      companyName: matchingInvoice.partyName || undefined,
      taxOffice: matchingInvoice.taxOffice || undefined,
    };
  }, [data, taxNumber, companyName]);

  return {
    autoFillData,
    isLoading,
    hasData: !!autoFillData,
  };
};
