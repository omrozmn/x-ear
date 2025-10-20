import { Invoice } from '../types/invoice';
import {
  EFaturaXMLData,
  EFaturaXMLOptions,
  EFaturaXMLResult,
  EFaturaInvoice,
  EFaturaParty,
  EFaturaInvoiceLine,
  EFaturaTaxTotal,
  EFaturaLegalMonetaryTotal,
  EFATURA_INVOICE_TYPE_CODES,
  EFATURA_CURRENCY_CODES,
  EFATURA_UNIT_CODES,
  EFATURA_TAX_SCHEME_CODES
} from '../types/efatura';

export class EFaturaXMLService {
  private static instance: EFaturaXMLService;

  private constructor() {}

  public static getInstance(): EFaturaXMLService {
    if (!EFaturaXMLService.instance) {
      EFaturaXMLService.instance = new EFaturaXMLService();
    }
    return EFaturaXMLService.instance;
  }

  /**
   * Generate E-Fatura XML from invoice data
   */
  public async generateXML(
    invoice: Invoice,
    options: EFaturaXMLOptions = {}
  ): Promise<EFaturaXMLResult> {
    try {
      // Convert invoice to E-Fatura format
      const efaturaData = this.convertInvoiceToEFatura(invoice);
      
      // Generate XML content
      const xmlContent = this.buildXMLContent(efaturaData, options);
      
      // Validate XML if requested
      let validationResult;
      if (options.validateXML) {
        validationResult = this.validateXML(xmlContent);
        if (!validationResult.isValid) {
          return {
            success: false,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            validationResult
          };
        }
      }

      // Generate ETTN (E-Fatura Takip Numarası)
      const ettn = this.generateETTN();
      
      // Generate file name
      const fileName = this.generateFileName(invoice, ettn);

      return {
        success: true,
        xmlContent,
        fileName,
        ettn,
        validationResult
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'XML oluşturma hatası']
      };
    }
  }

  /**
   * Convert Invoice to E-Fatura format
   */
  private convertInvoiceToEFatura(invoice: Invoice): EFaturaXMLData {
  const now = new Date();
  const issueDate = invoice.issueDate ? new Date(invoice.issueDate) : new Date();

    // Convert invoice basic info
  const items = Array.isArray((invoice as any).items) ? (invoice as any).items : [];

    const efaturaInvoice: EFaturaInvoice = {
      id: invoice.invoiceNumber || (`inv-${Date.now()}`),
      uuid: this.generateUUID(),
      issueDate: this.formatDate(issueDate),
      issueTime: this.formatTime(now),
      invoiceTypeCode: this.mapInvoiceTypeToEFatura(invoice.type),
      note: invoice.notes || undefined,
      documentCurrencyCode: invoice.currency || 'TRY',
      lineCountNumeric: items.length
    };

    // Convert supplier (always the clinic/company)
    const supplier: EFaturaParty = {
      partyIdentification: {
        id: '1234567890', // This should come from company settings
        schemeID: 'VKN'
      },
      partyName: {
        name: 'X-Ear Klinik' // This should come from company settings
      },
      postalAddress: {
        streetName: 'Klinik Adresi', // This should come from company settings
        cityName: 'İstanbul',
        country: {
          identificationCode: 'TR',
          name: 'Türkiye'
        }
      },
      partyTaxScheme: {
        taxScheme: {
          name: 'Beşiktaş Vergi Dairesi' // This should come from company settings
        }
      }
    };

    // Convert customer
    const customer: EFaturaParty = {
      partyIdentification: {
        id: (invoice.billingAddress && invoice.billingAddress.taxNumber) || invoice.patientTcNumber || '11111111111',
        schemeID: (invoice.billingAddress && invoice.billingAddress.taxNumber) ? 'VKN' : 'TCKN'
      },
      partyName: {
        name: (invoice.billingAddress && invoice.billingAddress.name) || invoice.patientName || ''
      },
      postalAddress: {
        streetName: invoice.billingAddress?.address || '',
        cityName: invoice.billingAddress?.city || '',
        postalZone: invoice.billingAddress?.postalCode || undefined,
        country: {
          identificationCode: 'TR',
          name: 'Türkiye'
        }
      },
      partyTaxScheme: invoice.billingAddress?.taxOffice ? {
        taxScheme: {
          name: invoice.billingAddress!.taxOffice
        }
      } : undefined,
      contact: {
        telephone: invoice.patientPhone || undefined,
        electronicMail: undefined // Add email field to invoice if needed
      }
    };

    // Convert invoice lines
    const invoiceLines: EFaturaInvoiceLine[] = items.map((item, index) => ({
      id: (index + 1).toString(),
      invoicedQuantity: {
        unitCode: this.mapUnitToEFatura(item.unitPrice),
        value: item.quantity
      },
      lineExtensionAmount: {
        currencyID: invoice.currency || 'TRY',
        value: (Number(item.totalPrice || 0) - Number(item.taxAmount || 0))
      },
      taxTotal: {
        taxAmount: {
          currencyID: invoice.currency || 'TRY',
          value: Number(item.taxAmount || 0)
        },
        taxSubtotals: [{
          taxableAmount: {
            currencyID: invoice.currency || 'TRY',
            value: (Number(item.totalPrice || 0) - Number(item.taxAmount || 0))
          },
          taxAmount: {
            currencyID: invoice.currency || 'TRY',
            value: Number(item.taxAmount || 0)
          },
          percent: item.taxRate,
          taxCategory: {
            taxScheme: {
              name: 'KDV',
              taxTypeCode: EFATURA_TAX_SCHEME_CODES.KDV
            }
          }
        }]
      },
      item: {
        name: item.name,
        description: item.description,
        sellersItemIdentification: item.productId ? {
          id: item.productId
        } : undefined
      },
      price: {
        priceAmount: {
          currencyID: invoice.currency || 'TRY',
          value: item.unitPrice
        },
        baseQuantity: {
          unitCode: this.mapUnitToEFatura(item.unitPrice),
          value: 1
        }
      }
    }));

    // Convert tax totals
  const taxes = Array.isArray((invoice as any).taxes) ? (invoice as any).taxes : [];
    const taxTotals: EFaturaTaxTotal[] = [{
      taxAmount: {
        currencyID: invoice.currency || 'TRY',
        value: Number(invoice.totalTax || 0)
      },
      taxSubtotals: taxes.map(tax => ({
        taxableAmount: {
          currencyID: invoice.currency || 'TRY',
          value: Number((tax as any).baseAmount || 0)
        },
        taxAmount: {
          currencyID: invoice.currency || 'TRY',
          value: Number((tax as any).taxAmount || 0)
        },
        percent: (tax as any).rate || 0,
        taxCategory: {
          taxScheme: {
            name: String((tax as any).type || 'KDV').toUpperCase(),
            taxTypeCode: EFATURA_TAX_SCHEME_CODES[String((tax as any).type || 'KDV').toUpperCase() as keyof typeof EFATURA_TAX_SCHEME_CODES] || EFATURA_TAX_SCHEME_CODES.KDV
          }
        }
      }))
    }];

    // Convert legal monetary total
    const subtotal = Number(invoice.subtotal || 0);
    const totalDiscount = Number(invoice.totalDiscount || 0);
    const totalTax = Number(invoice.totalTax || 0);
    const grandTotal = Number(invoice.grandTotal || subtotal - totalDiscount + totalTax);

    const legalMonetaryTotal: EFaturaLegalMonetaryTotal = {
      lineExtensionAmount: {
        currencyID: invoice.currency || 'TRY',
        value: subtotal
      },
      taxExclusiveAmount: {
        currencyID: invoice.currency || 'TRY',
        value: subtotal - totalDiscount
      },
      taxInclusiveAmount: {
        currencyID: invoice.currency || 'TRY',
        value: grandTotal
      },
      allowanceTotalAmount: totalDiscount > 0 ? {
        currencyID: invoice.currency || 'TRY',
        value: totalDiscount
      } : undefined,
      payableAmount: {
        currencyID: invoice.currency || 'TRY',
        value: grandTotal
      }
    };

    return {
      invoice: efaturaInvoice,
      supplier,
      customer,
      invoiceLines,
      taxTotals,
      legalMonetaryTotal
    };
  }

  /**
   * Build XML content from E-Fatura data
   */
  private buildXMLContent(data: EFaturaXMLData, options: EFaturaXMLOptions): string {
    const encoding = options.encoding || 'UTF-8';
    const schemaLocation = options.schemaLocation || 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 UBL-Invoice-2.1.xsd';

    let xml = `<?xml version="1.0" encoding="${encoding}"?>\n`;
    xml += `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"\n`;
    xml += `         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"\n`;
    xml += `         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"\n`;
    xml += `         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
    xml += `         xsi:schemaLocation="${schemaLocation}">\n`;

    // UBL Version
    xml += `  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>\n`;
    xml += `  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>\n`;
    xml += `  <cbc:ProfileID>TICARIFATURA</cbc:ProfileID>\n`;

    // Invoice basic info
    xml += `  <cbc:ID>${this.escapeXML(data.invoice.id)}</cbc:ID>\n`;
    xml += `  <cbc:CopyIndicator>false</cbc:CopyIndicator>\n`;
    xml += `  <cbc:UUID>${data.invoice.uuid}</cbc:UUID>\n`;
    xml += `  <cbc:IssueDate>${data.invoice.issueDate}</cbc:IssueDate>\n`;
    xml += `  <cbc:IssueTime>${data.invoice.issueTime}</cbc:IssueTime>\n`;
    xml += `  <cbc:InvoiceTypeCode>${data.invoice.invoiceTypeCode}</cbc:InvoiceTypeCode>\n`;
    
    if (data.invoice.note) {
      xml += `  <cbc:Note>${this.escapeXML(data.invoice.note)}</cbc:Note>\n`;
    }

    xml += `  <cbc:DocumentCurrencyCode>${data.invoice.documentCurrencyCode}</cbc:DocumentCurrencyCode>\n`;
    xml += `  <cbc:LineCountNumeric>${data.invoice.lineCountNumeric}</cbc:LineCountNumeric>\n`;

    // Supplier Party
    xml += this.buildPartyXML(data.supplier, 'AccountingSupplierParty');

    // Customer Party
    xml += this.buildPartyXML(data.customer, 'AccountingCustomerParty');

    // Tax Total
    xml += this.buildTaxTotalXML(data.taxTotals[0]);

    // Legal Monetary Total
    xml += this.buildLegalMonetaryTotalXML(data.legalMonetaryTotal);

    // Invoice Lines
    data.invoiceLines.forEach(line => {
      xml += this.buildInvoiceLineXML(line);
    });

    xml += `</Invoice>`;

    return options.formatXML ? this.formatXML(xml) : xml;
  }

  private buildPartyXML(party: EFaturaParty, elementName: string): string {
    let xml = `  <cac:${elementName}>\n`;
    xml += `    <cac:Party>\n`;
    
    // Party Identification
    xml += `      <cac:PartyIdentification>\n`;
    xml += `        <cbc:ID schemeID="${party.partyIdentification.schemeID}">${party.partyIdentification.id}</cbc:ID>\n`;
    xml += `      </cac:PartyIdentification>\n`;

    // Party Name
    if (party.partyName) {
      xml += `      <cac:PartyName>\n`;
      xml += `        <cbc:Name>${this.escapeXML(party.partyName.name)}</cbc:Name>\n`;
      xml += `      </cac:PartyName>\n`;
    }

    // Postal Address
    xml += `      <cac:PostalAddress>\n`;
    xml += `        <cbc:StreetName>${this.escapeXML(party.postalAddress.streetName)}</cbc:StreetName>\n`;
    if (party.postalAddress.buildingNumber) {
      xml += `        <cbc:BuildingNumber>${this.escapeXML(party.postalAddress.buildingNumber)}</cbc:BuildingNumber>\n`;
    }
    if (party.postalAddress.citySubdivisionName) {
      xml += `        <cbc:CitySubdivisionName>${this.escapeXML(party.postalAddress.citySubdivisionName)}</cbc:CitySubdivisionName>\n`;
    }
    xml += `        <cbc:CityName>${this.escapeXML(party.postalAddress.cityName)}</cbc:CityName>\n`;
    if (party.postalAddress.postalZone) {
      xml += `        <cbc:PostalZone>${this.escapeXML(party.postalAddress.postalZone)}</cbc:PostalZone>\n`;
    }
    xml += `        <cac:Country>\n`;
    xml += `          <cbc:IdentificationCode>${party.postalAddress.country.identificationCode}</cbc:IdentificationCode>\n`;
    xml += `          <cbc:Name>${this.escapeXML(party.postalAddress.country.name)}</cbc:Name>\n`;
    xml += `        </cac:Country>\n`;
    xml += `      </cac:PostalAddress>\n`;

    // Party Tax Scheme
    if (party.partyTaxScheme) {
      xml += `      <cac:PartyTaxScheme>\n`;
      xml += `        <cac:TaxScheme>\n`;
      xml += `          <cbc:Name>${this.escapeXML(party.partyTaxScheme.taxScheme.name)}</cbc:Name>\n`;
      xml += `        </cac:TaxScheme>\n`;
      xml += `      </cac:PartyTaxScheme>\n`;
    }

    // Contact
    if (party.contact) {
      xml += `      <cac:Contact>\n`;
      if (party.contact.telephone) {
        xml += `        <cbc:Telephone>${this.escapeXML(party.contact.telephone)}</cbc:Telephone>\n`;
      }
      if (party.contact.electronicMail) {
        xml += `        <cbc:ElectronicMail>${this.escapeXML(party.contact.electronicMail)}</cbc:ElectronicMail>\n`;
      }
      xml += `      </cac:Contact>\n`;
    }

    xml += `    </cac:Party>\n`;
    xml += `  </cac:${elementName}>\n`;

    return xml;
  }

  private buildTaxTotalXML(taxTotal: EFaturaTaxTotal): string {
    let xml = `  <cac:TaxTotal>\n`;
    xml += `    <cbc:TaxAmount currencyID="${taxTotal.taxAmount.currencyID}">${taxTotal.taxAmount.value.toFixed(2)}</cbc:TaxAmount>\n`;
    
    taxTotal.taxSubtotals.forEach(subtotal => {
      xml += `    <cac:TaxSubtotal>\n`;
      xml += `      <cbc:TaxableAmount currencyID="${subtotal.taxableAmount.currencyID}">${subtotal.taxableAmount.value.toFixed(2)}</cbc:TaxableAmount>\n`;
      xml += `      <cbc:TaxAmount currencyID="${subtotal.taxAmount.currencyID}">${subtotal.taxAmount.value.toFixed(2)}</cbc:TaxAmount>\n`;
      if (subtotal.percent !== undefined) {
        xml += `      <cbc:Percent>${subtotal.percent}</cbc:Percent>\n`;
      }
      xml += `      <cac:TaxCategory>\n`;
      xml += `        <cac:TaxScheme>\n`;
      xml += `          <cbc:Name>${this.escapeXML(subtotal.taxCategory.taxScheme.name)}</cbc:Name>\n`;
      xml += `          <cbc:TaxTypeCode>${subtotal.taxCategory.taxScheme.taxTypeCode}</cbc:TaxTypeCode>\n`;
      xml += `        </cac:TaxScheme>\n`;
      xml += `      </cac:TaxCategory>\n`;
      xml += `    </cac:TaxSubtotal>\n`;
    });

    xml += `  </cac:TaxTotal>\n`;
    return xml;
  }

  private buildLegalMonetaryTotalXML(total: EFaturaLegalMonetaryTotal): string {
    let xml = `  <cac:LegalMonetaryTotal>\n`;
    xml += `    <cbc:LineExtensionAmount currencyID="${total.lineExtensionAmount.currencyID}">${total.lineExtensionAmount.value.toFixed(2)}</cbc:LineExtensionAmount>\n`;
    xml += `    <cbc:TaxExclusiveAmount currencyID="${total.taxExclusiveAmount.currencyID}">${total.taxExclusiveAmount.value.toFixed(2)}</cbc:TaxExclusiveAmount>\n`;
    xml += `    <cbc:TaxInclusiveAmount currencyID="${total.taxInclusiveAmount.currencyID}">${total.taxInclusiveAmount.value.toFixed(2)}</cbc:TaxInclusiveAmount>\n`;
    
    if (total.allowanceTotalAmount) {
      xml += `    <cbc:AllowanceTotalAmount currencyID="${total.allowanceTotalAmount.currencyID}">${total.allowanceTotalAmount.value.toFixed(2)}</cbc:AllowanceTotalAmount>\n`;
    }
    
    if (total.chargeTotalAmount) {
      xml += `    <cbc:ChargeTotalAmount currencyID="${total.chargeTotalAmount.currencyID}">${total.chargeTotalAmount.value.toFixed(2)}</cbc:ChargeTotalAmount>\n`;
    }
    
    xml += `    <cbc:PayableAmount currencyID="${total.payableAmount.currencyID}">${total.payableAmount.value.toFixed(2)}</cbc:PayableAmount>\n`;
    xml += `  </cac:LegalMonetaryTotal>\n`;
    
    return xml;
  }

  private buildInvoiceLineXML(line: EFaturaInvoiceLine): string {
    let xml = `  <cac:InvoiceLine>\n`;
    xml += `    <cbc:ID>${line.id}</cbc:ID>\n`;
    xml += `    <cbc:InvoicedQuantity unitCode="${line.invoicedQuantity.unitCode}">${line.invoicedQuantity.value}</cbc:InvoicedQuantity>\n`;
    xml += `    <cbc:LineExtensionAmount currencyID="${line.lineExtensionAmount.currencyID}">${line.lineExtensionAmount.value.toFixed(2)}</cbc:LineExtensionAmount>\n`;

    // Tax Total for line
    if (line.taxTotal) {
      xml += `    <cac:TaxTotal>\n`;
      xml += `      <cbc:TaxAmount currencyID="${line.taxTotal.taxAmount.currencyID}">${line.taxTotal.taxAmount.value.toFixed(2)}</cbc:TaxAmount>\n`;
      xml += `    </cac:TaxTotal>\n`;
    }

    // Item
    xml += `    <cac:Item>\n`;
    xml += `      <cbc:Name>${this.escapeXML(line.item.name)}</cbc:Name>\n`;
    if (line.item.description) {
      xml += `      <cbc:Description>${this.escapeXML(line.item.description)}</cbc:Description>\n`;
    }
    if (line.item.sellersItemIdentification) {
      xml += `      <cac:SellersItemIdentification>\n`;
      xml += `        <cbc:ID>${this.escapeXML(line.item.sellersItemIdentification.id)}</cbc:ID>\n`;
      xml += `      </cac:SellersItemIdentification>\n`;
    }
    xml += `    </cac:Item>\n`;

    // Price
    xml += `    <cac:Price>\n`;
    xml += `      <cbc:PriceAmount currencyID="${line.price.priceAmount.currencyID}">${line.price.priceAmount.value.toFixed(2)}</cbc:PriceAmount>\n`;
    if (line.price.baseQuantity) {
      xml += `      <cbc:BaseQuantity unitCode="${line.price.baseQuantity.unitCode}">${line.price.baseQuantity.value}</cbc:BaseQuantity>\n`;
    }
    xml += `    </cac:Price>\n`;

    xml += `  </cac:InvoiceLine>\n`;
    return xml;
  }

  // Helper methods
  private mapInvoiceTypeToEFatura(type: string): string {
    const mapping: Record<string, string> = {
      'sale': EFATURA_INVOICE_TYPE_CODES.SATIS,
      'service': EFATURA_INVOICE_TYPE_CODES.SATIS,
      'return': EFATURA_INVOICE_TYPE_CODES.IADE,
      'sgk': EFATURA_INVOICE_TYPE_CODES.SATIS
    };
    return mapping[type] || EFATURA_INVOICE_TYPE_CODES.SATIS;
  }

  private mapUnitToEFatura(unitPrice: number): string {
    // Default to piece (C62) - this could be enhanced based on product type
    return EFATURA_UNIT_CODES.C62;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateETTN(): string {
    // Generate 36-character ETTN
    return this.generateUUID();
  }

  private generateFileName(invoice: Invoice, ettn: string): string {
    const date = invoice.issueDate ? new Date(invoice.issueDate) : new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const invNumber = invoice.invoiceNumber || `inv-${dateStr}`;
    return `${invNumber}_${dateStr}_${ettn.substring(0, 8)}.xml`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0];
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatXML(xml: string): string {
    // Simple XML formatting - could be enhanced with proper XML formatter
    return xml.replace(/></g, '>\n<');
  }

  private validateXML(xml: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic XML validation
    try {
      // Check for basic XML structure
      if (!xml.includes('<?xml')) {
        errors.push('XML declaration missing');
      }
      
      if (!xml.includes('<Invoice')) {
        errors.push('Invoice root element missing');
      }

      // Check for required elements
      const requiredElements = [
        'cbc:ID',
        'cbc:IssueDate',
        'cbc:InvoiceTypeCode',
        'cac:AccountingSupplierParty',
        'cac:AccountingCustomerParty',
        'cac:LegalMonetaryTotal'
      ];

      requiredElements.forEach(element => {
        if (!xml.includes(element)) {
          errors.push(`Required element ${element} missing`);
        }
      });

    } catch (error) {
      errors.push(`XML validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default EFaturaXMLService;