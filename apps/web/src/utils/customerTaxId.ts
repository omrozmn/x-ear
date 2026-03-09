export interface CustomerTaxIdState {
  customerTaxId?: string;
  customerTaxNumber?: string;
  customerTcNumber?: string;
}

const digitsOnly = (value: unknown): string => String(value ?? '').replace(/\D/g, '').trim();

export const resolveCustomerTaxId = (source: CustomerTaxIdState): string => {
  const direct = digitsOnly(source.customerTaxId);
  if (direct) return direct;

  const taxNumber = digitsOnly(source.customerTaxNumber);
  if (taxNumber) return taxNumber;

  return digitsOnly(source.customerTcNumber);
};

export const normalizeCustomerTaxIdFields = <T extends object>(source: T & CustomerTaxIdState): T & Required<CustomerTaxIdState> => {
  const customerTaxId = resolveCustomerTaxId(source);
  const isTckn = customerTaxId.length === 11;
  const customerTaxNumber = !isTckn && customerTaxId.length === 10 ? customerTaxId : '';
  const customerTcNumber = isTckn ? customerTaxId : '';

  return {
    ...source,
    customerTaxId,
    customerTaxNumber,
    customerTcNumber,
  };
};
