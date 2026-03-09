import { test, expect } from '../fixtures/fixtures';
import type { APIRequestContext, Page, Response } from '@playwright/test';
import { inflateSync } from 'node:zlib';
import { deleteTestSupplier, ensureTestSupplier } from '../../helpers/auth.helper';

type DocumentKind = 'invoice' | 'despatch';

interface PartySeed {
  id: string;
  created: boolean;
  firstName: string;
  lastName: string;
  taxNumber: string;
  city: string;
  district: string;
  address: string;
}

interface InvoiceCase {
  key: string;
  title: string;
  documentKind?: DocumentKind;
  scenario: 'other' | 'export' | 'medical';
  subScenario?: '2' | '3';
  invoiceType?: string;
  lineTaxRate?: number;
  fillSpecial: (page: Page, seededParty: PartySeed) => Promise<void>;
  xmlChecks: (xmlText: string, seededParty: PartySeed, invoiceNumber: string) => void;
  pdfChecks: (pdfText: string, seededParty: PartySeed, invoiceNumber: string) => void;
}

interface CreatedInvoiceResult {
  invoiceId: number;
  invoiceNumber: string;
  lineName: string;
}

const CASES: InvoiceCase[] = [
  {
    key: 'satis_temel',
    title: 'SATIS Temel',
    scenario: 'other',
    subScenario: '2',
    invoiceType: '0',
    fillSpecial: async () => {},
    xmlChecks: (xmlText, seededParty) => {
      expect(xmlText).toContain('<cbc:ProfileID>TEMELFATURA</cbc:ProfileID>');
      expect(xmlText).toContain('<cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>');
      expect(xmlText).toContain(seededParty.firstName);
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.firstName);
    },
  },
  {
    key: 'satis_ticari',
    title: 'SATIS Ticari',
    scenario: 'other',
    subScenario: '3',
    invoiceType: '0',
    fillSpecial: async () => {},
    xmlChecks: (xmlText, seededParty) => {
      expect(xmlText).toContain('<cbc:ProfileID>TICARIFATURA</cbc:ProfileID>');
      expect(xmlText).toContain('<cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>');
      expect(xmlText).toContain(seededParty.lastName);
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.lastName);
    },
  },
  {
    key: 'iade',
    title: 'IADE',
    scenario: 'other',
    invoiceType: '50',
    lineTaxRate: 0,
    fillSpecial: async (page) => {
      await fillByLabel(page, 'İade Fatura No', 'GIB2009000000011');
      await fillByLabel(page, 'İade Nedeni', 'E2E iade testi');
      await page.getByLabel('İade Fatura Tarihi').fill('2026-03-01');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:InvoiceTypeCode>IADE</cbc:InvoiceTypeCode>');
      expect(xmlText).toContain('GIB2009000000011');
      expect(xmlText).toContain('E2E iade testi');
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.firstName);
    },
  },
  {
    key: 'tevkifat',
    title: 'TEVKIFAT',
    scenario: 'other',
    invoiceType: '11',
    lineTaxRate: 20,
    fillSpecial: async (page) => {
      await selectNative(page, 'Tevkifat Kodu', '624');
      await fillByLabel(page, 'Tevkifat İade Edilen Mal Oranı (%)', '20');
      await fillByLabel(page, 'Tevkifatsız İade KDV Tutarı (TL)', '20');
      await page.getByRole('button', { name: 'Kaydet' }).last().click();
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:InvoiceTypeCode>TEVKIFAT</cbc:InvoiceTypeCode>');
      expect(xmlText).toContain('624');
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.firstName);
    },
  },
  {
    key: 'istisna',
    title: 'ISTISNA',
    scenario: 'other',
    invoiceType: '13',
    lineTaxRate: 0,
    fillSpecial: async (page) => {
      await selectNative(page, 'İstisna Sebebi', '301');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:InvoiceTypeCode>ISTISNA</cbc:InvoiceTypeCode>');
      expect(xmlText).toContain('<cbc:TaxExemptionReasonCode>301</cbc:TaxExemptionReasonCode>');
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.lastName);
    },
  },
  {
    key: 'ozelmatrah',
    title: 'OZELMATRAH',
    scenario: 'other',
    invoiceType: '12',
    fillSpecial: async (page) => {
      await fillByLabel(page, 'Özel Matrah Tutarı', '80');
      await fillByLabel(page, 'Özel Matrah Oranı', '10');
      await fillByLabel(page, 'Açıklama', 'Ozel Matrah E2E');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:InvoiceTypeCode>OZELMATRAH</cbc:InvoiceTypeCode>');
      expect(xmlText).toContain('Ozel Matrah E2E');
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.firstName);
    },
  },
  {
    key: 'ihracat',
    title: 'IHRACAT',
    scenario: 'export',
    invoiceType: '27',
    lineTaxRate: 0,
    fillSpecial: async (page) => {
      await fillByLabel(page, 'Gümrük Beyanname Numarası', 'GBN-2026-001');
      await page.getByLabel('Gümrük Beyanname Tarihi').fill('2026-03-08');
      await selectNative(page, 'Taşıma Şekli', '1');
      await selectNative(page, 'Teslim Şartı (INCOTERMS)', 'CIF');
      await fillByLabel(page, 'GTİP Kodu', '847130');
      await fillByLabel(page, 'İhracat Ülkesi', 'DE');
      await fillByLabel(page, 'İhracat Limanı', 'Hamburg');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:ProfileID>IHRACAT</cbc:ProfileID>');
      expect(xmlText).toContain('847130');
      expect(xmlText).toContain('CIF');
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.lastName);
    },
  },
  {
    key: 'sgk',
    title: 'SGK',
    scenario: 'other',
    invoiceType: '14',
    lineTaxRate: 0,
    fillSpecial: async (page) => {
      await selectNative(page, 'İlave Fatura Bilgisi Tipi', 'H');
      await fillByLabel(page, 'Mükellef Kodu', '11111111');
      await fillByLabel(page, 'Mükellef Adı', 'TEST OPTIK');
      await fillByLabel(page, 'Dosya No', '1225324');
      await fillByLabel(page, 'Dönem Yılı', '2026');
      await fillByLabel(page, 'Dönem Ayı', '3');
      await page.getByLabel('Dönem Başlangıç Tarihi').fill('2026-03-01');
      await page.getByLabel('Dönem Bitiş Tarihi').fill('2026-03-31');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('1225324');
      expect(xmlText).toContain('TEST OPTIK');
      expect(xmlText).toContain('7750409379');
    },
    pdfChecks: (pdfText, _seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain('Sosyal');
    },
  },
  {
    key: 'hks',
    title: 'HKS',
    scenario: 'other',
    invoiceType: 'hks',
    fillSpecial: async (page) => {
      await fillByLabel(page, 'Tesis Kayıt No', 'HKS-2026-001');
      await page.getByLabel('Konaklama Başlangıç').fill('2026-03-01');
      await page.getByLabel('Konaklama Bitiş').fill('2026-03-05');
      await fillByLabel(page, 'Misafir Sayısı', '2');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:ProfileID>HKS</cbc:ProfileID>');
      expect(xmlText).toContain('HKS-2026-001');
      expect(xmlText).toContain('HOTEL_REG_NO');
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.firstName);
    },
  },
  {
    key: 'sarj',
    title: 'SARJ',
    scenario: 'other',
    invoiceType: 'sarj',
    fillSpecial: async (page) => {
      await fillByLabel(page, 'İstasyon Kodu', 'ST-2026-001');
      await fillByLabel(page, 'Plaka', '34ABC123');
      await page.getByLabel('Şarj Başlangıç').fill('2026-03-08');
      await page.getByLabel('Şarj Bitiş').fill('2026-03-08');
      await fillByLabel(page, 'Enerji Miktarı (kWh)', '14.5');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:ProfileID>ENERJI</cbc:ProfileID>');
      expect(xmlText).toContain('SARJ');
      expect(xmlText).toContain('ST-2026-001');
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.lastName);
    },
  },
  {
    key: 'earsiv',
    title: 'EARSIV',
    scenario: 'other',
    invoiceType: 'earsiv',
    fillSpecial: async (page) => {
      await selectNative(page, 'Belge Sistemi', 'EARSIV');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:ProfileID>EARSIVFATURA</cbc:ProfileID>');
      expect(xmlText).toContain('<cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>');
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.firstName);
    },
  },
  {
    key: 'yolcu',
    title: 'YOLCU BERABERI',
    scenario: 'other',
    invoiceType: 'yolcu',
    lineTaxRate: 0,
    fillSpecial: async (page) => {
      await fillByLabel(page, 'Yolcu Adı', 'Jane Doe');
      await fillByLabel(page, 'Pasaport No', 'P1234567');
      await fillByLabel(page, 'Uyruğu', 'DE');
      await fillByLabel(page, 'Vergi Temsilcisi', 'Tax Free GmbH');
      await fillByLabel(page, 'Temsilci Vergi No', '1111111111');
      await fillByLabel(page, 'Temsilci Etiketi', 'urn:mail:taxfree@example.com');
      await fillByLabel(page, 'İade IBAN', 'TR000000000000000000000001');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:ProfileID>YOLCUBERABERFATURA</cbc:ProfileID>');
      expect(xmlText).toContain('P1234567');
      expect(xmlText).toContain('urn:mail:taxfree@example.com');
    },
    pdfChecks: (pdfText, _seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain('Jane');
    },
  },
  {
    key: 'sevk',
    title: 'SEVK',
    documentKind: 'despatch',
    scenario: 'other',
    invoiceType: 'sevk',
    fillSpecial: async (page) => {
      await selectNative(page, 'Belge Sistemi', 'EIRSALIYE');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:ProfileID>TEMELIRSALIYE</cbc:ProfileID>');
      expect(xmlText).toContain('<cbc:DespatchAdviceTypeCode>SEVK</cbc:DespatchAdviceTypeCode>');
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.firstName);
    },
  },
  {
    key: 'sarjanlik',
    title: 'SARJANLIK',
    scenario: 'other',
    invoiceType: 'sarjanlik',
    fillSpecial: async (page) => {
      await fillByLabel(page, 'İstasyon Kodu', 'ST-2026-002');
      await page.getByLabel('Şarj Başlangıç').fill('2026-03-08');
      await page.getByLabel('Şarj Bitiş').fill('2026-03-08');
      await fillByLabel(page, 'Enerji Miktarı (kWh)', '7.5');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:ProfileID>ENERJI</cbc:ProfileID>');
      expect(xmlText).toContain('SARJANLIK');
      expect(xmlText).toContain('ST-2026-002');
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.lastName);
    },
  },
  {
    key: 'otv',
    title: 'OTV',
    scenario: 'other',
    invoiceType: 'otv',
    fillSpecial: async (page) => {
      await fillByLabel(page, 'ÖTV Kodu', '9021');
      await fillByLabel(page, 'ÖTV Oranı (%)', '25');
      await fillByLabel(page, 'ÖTV Tutarı', '25');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:TaxTypeCode>9021</cbc:TaxTypeCode>');
      expect(xmlText).toContain('<cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>');
    },
    pdfChecks: (pdfText, seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain(seededParty.firstName);
    },
  },
  {
    key: 'hastane',
    title: 'HASTANE',
    scenario: 'medical',
    invoiceType: 'hastane',
    fillSpecial: async (page) => {
      await fillByLabel(page, 'Hasta Adı', 'Hasta Test');
      await fillByLabel(page, 'Hasta TCKN/VKN', '12345678901');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:ProfileID>TICARIFATURA</cbc:ProfileID>');
      expect(xmlText).toContain('Hasta Test');
      expect(xmlText).toContain('12345678901');
    },
    pdfChecks: (pdfText, _seededParty, invoiceNumber) => {
      expect(pdfText).toContain(invoiceNumber);
      expect(pdfText).toContain('Hasta');
    },
  },
];

test.describe.serial('BirFatura 16 Invoice Types', () => {
  test.setTimeout(20 * 60 * 1000);

  test('creates, issues, validates XML/PDF and opens PDF for all 16 invoice types', async ({ tenantPage, apiContext, authTokens }) => {
    test.slow();

    const createdSupplierIds: number[] = [];

    try {
      for (const invoiceCase of CASES) {
        await test.step(invoiceCase.title, async () => {
          const seededParty = await seedParty(apiContext, authTokens.accessToken, invoiceCase.key);
          if (seededParty.created) {
            createdSupplierIds.push(Number(seededParty.id));
          }

          const { invoiceId, invoiceNumber, lineName } = await createInvoiceFromUi(tenantPage, invoiceCase, seededParty);

          const xmlResponse = await apiContext.get(`/api/invoices/${invoiceId}/document?format=xml`);
          expect(xmlResponse.ok(), `${invoiceCase.title} XML fetch failed`).toBeTruthy();
          const xmlText = await xmlResponse.text();
          expect(xmlText).toContain(lineName);
          invoiceCase.xmlChecks(xmlText, seededParty, invoiceNumber);

          const htmlResponse = await apiContext.get(`/api/invoices/${invoiceId}/document?format=html`);
          expect(htmlResponse.ok(), `${invoiceCase.title} HTML fetch failed`).toBeTruthy();
          const htmlText = normalizeText(await htmlResponse.text());
          expect(htmlText).toContain(normalizeText(lineName));
          expect(htmlText).toContain(normalizeText(invoiceNumber));

          const pdfResponse = await apiContext.get(`/api/invoices/${invoiceId}/document?format=pdf`);
          expect(pdfResponse.ok(), `${invoiceCase.title} PDF fetch failed`).toBeTruthy();
          const pdfHeaders = pdfResponse.headers();
          expect(pdfHeaders['content-type'] || '').toContain('application/pdf');
          const pdfBuffer = Buffer.from(await pdfResponse.body());
          expect(pdfBuffer.subarray(0, 4).toString('latin1')).toBe('%PDF');

          const pdfText = normalizeText(extractPdfText(pdfBuffer));
          expect(pdfText).toContain(normalizeText(invoiceNumber));
          invoiceCase.pdfChecks(pdfText, seededParty, invoiceNumber);

          await openInvoicePdfFromTable(tenantPage, invoiceId, invoiceNumber);
        });
      }
    } finally {
      for (const supplierId of createdSupplierIds) {
        await deleteTestSupplier(apiContext, authTokens.accessToken, supplierId);
      }
    }
  });
});

async function createInvoiceFromUi(page: Page, invoiceCase: InvoiceCase, seededParty: PartySeed): Promise<CreatedInvoiceResult> {
  const issueResponsePromise = page.waitForResponse((response) => isIssueResponse(response), { timeout: 180_000 });

  const search = invoiceCase.documentKind === 'despatch' ? '?documentKind=despatch' : '';
  await page.goto(`/invoices/new${search}`);
  await page.waitForLoadState('domcontentloaded');

  await page.getByTestId('invoice-scenario-select').selectOption(invoiceCase.scenario);
  if (invoiceCase.subScenario) {
    await page.getByTestId('invoice-subscenario-select').selectOption(invoiceCase.subScenario);
  }
  if (invoiceCase.invoiceType && invoiceCase.documentKind !== 'despatch') {
    await page.getByTestId('invoice-type-select').selectOption(invoiceCase.invoiceType);
  }

  await chooseCustomer(page, seededParty);
  await ensureLineExists(page);
  const lineName = await fillLine(page, 0, invoiceCase.key, invoiceCase.lineTaxRate ?? 20);
  await fillCommonSupportingFields(page, invoiceCase.key);
  await invoiceCase.fillSpecial(page, seededParty);

  await page.getByTestId('invoice-submit-button').click();

  const issueResponse = await issueResponsePromise;
  const issueJson = await issueResponse.json() as { data?: { invoice_id?: number; invoiceId?: number } };
  const invoiceId = issueJson.data?.invoice_id ?? issueJson.data?.invoiceId;
  expect(invoiceId, `${invoiceCase.title} issue response should include invoice id`).toBeTruthy();

  await page.waitForURL('**/invoices', { timeout: 180_000 });
  const invoiceRow = page.getByTestId(`outgoing-invoice-row-${Number(invoiceId)}`);
  await expect(invoiceRow).toBeVisible({ timeout: 120_000 });
  const invoiceNumber = (await invoiceRow.locator('td').nth(1).textContent())?.trim() || '';
  expect(invoiceNumber, `${invoiceCase.title} row should include invoice number`).toBeTruthy();

  return { invoiceId: Number(invoiceId), invoiceNumber, lineName };
}

async function chooseCustomer(page: Page, seededParty: PartySeed) {
  const taxInput = page.getByTestId('invoice-customer-tax-input');
  await taxInput.fill(seededParty.taxNumber);
  const option = page.getByRole('button', { name: new RegExp(`${seededParty.firstName}\\s+${seededParty.lastName}`) }).first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
}

async function ensureLineExists(page: Page) {
  const firstLine = page.getByTestId('invoice-line-0');
  if (await firstLine.count()) {
    return;
  }
  await page.getByTestId('invoice-add-line-button').click();
  await expect(page.getByTestId('invoice-line-0')).toBeVisible({ timeout: 10_000 });
}

async function fillLine(page: Page, index: number, key: string, taxRate: number) {
  const suffix = Date.now().toString().slice(-6);
  const lineName = `E2E ${key} urun ${suffix}`;
  await page.getByTestId(`invoice-line-name-${index}`).fill(lineName);
  await page.getByTestId(`invoice-line-quantity-${index}`).fill('1');
  await page.getByTestId(`invoice-line-unit-price-${index}`).fill(String(100 + index));
  await page.getByTestId(`invoice-line-tax-rate-${index}`).selectOption(String(taxRate));
  return lineName;
}

async function fillCommonSupportingFields(page: Page, key: string) {
  const suffix = Date.now().toString().slice(-4);

  await page.getByRole('button', { name: 'Sipariş Bilgisi' }).click();
  await page.getByTestId('additional-order-number').fill(`SIP-${key.toUpperCase()}-${suffix}`);
  await pickDateByTestId(page, 'additional-order-date', '2026-03-08');
  await page.getByTestId('additional-order-note').fill(`${key} siparis notu ${suffix}`);

  await page.getByRole('button', { name: 'İrsaliye Bilgisi' }).click();
  await page.getByTestId('additional-delivery-number').fill(`IRS-${key.toUpperCase()}-${suffix}`);
  await pickDateByTestId(page, 'additional-delivery-date', '2026-03-08');
  await page.getByTestId('additional-delivery-receiver').fill(`Teslim Alan ${suffix}`);

  await page.getByRole('button', { name: 'Sevk Bilgisi' }).click();
  await pickDateByTestId(page, 'additional-shipment-date', '2026-03-08');
  await page.getByTestId('additional-shipment-carrier').fill(`Kargo ${suffix}`);
  await page.getByTestId('additional-shipment-tracking').fill(`TRK${suffix}`);
  await page.getByTestId('additional-shipment-address').fill(`Sevk adres ${key} ${suffix}`);

  await page.getByRole('button', { name: 'Banka Bilgisi' }).click();
  await page.getByTestId('additional-bank-name').fill(`Test Bank ${suffix}`);
  await page.getByTestId('additional-bank-account-holder').fill(`X-Ear ${suffix}`);
  await page.getByTestId('additional-bank-account-number').fill(`12345678${suffix}`);
  await page.getByTestId('additional-bank-iban').fill(`TR12000610051978645784${suffix}`);
  await page.getByTestId('additional-bank-swift').fill(`TESTTRIS${suffix}`);

  await page.getByRole('button', { name: 'Ödeme Koşulları' }).click();
  await page.getByTestId('additional-payment-days').fill('21');
  await page.getByTestId('additional-payment-early-discount').fill('2');
  await page.getByTestId('additional-payment-late-penalty').fill('1');
  await page.getByTestId('additional-payment-term').fill(`21 gun vadeli ${key}`);

  const notes = page.getByPlaceholder(/Fatura ile ilgili notlar/i).first();
  if (await notes.isVisible().catch(() => false)) {
    await notes.fill(`Genel not ${key} ${suffix}`);
  }
}

async function openInvoicePdfFromTable(page: Page, invoiceId: number, invoiceNumber: string) {
  await page.goto('/invoices');
  const row = page.getByTestId(`outgoing-invoice-row-${invoiceId}`);
  await expect(row).toBeVisible({ timeout: 120_000 });
  await row.click();
  await expect(page.getByTestId('invoice-pdf-modal')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(invoiceNumber)).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press('Escape').catch(() => {});
}

async function seedParty(api: APIRequestContext, accessToken: string, key: string): Promise<PartySeed> {
  const taxNumber = process.env.E2E_TEST_RECEIVER_VKN || '1234567801';
  const companyName = process.env.E2E_TEST_RECEIVER_NAME || 'GIB TEST RECEIVER';
  const city = process.env.E2E_TEST_RECEIVER_CITY || 'ANKARA';
  const district = process.env.E2E_TEST_RECEIVER_DISTRICT || 'Cankaya';
  const address = process.env.E2E_TEST_RECEIVER_ADDRESS || 'Alici sokak';
  const taxOffice = process.env.E2E_TEST_RECEIVER_TAX_OFFICE || 'ANKARA';
  const ensuredSupplier = await ensureTestSupplier(api, accessToken, {
    name: companyName,
    companyName,
    taxNumber,
    taxOffice,
    email: 'gib-test-receiver@example.com',
    phone: '03120000001',
    address,
    city,
    notes: `Provider-ready E2E receiver for ${key}`,
  });

  const [firstName, ...rest] = companyName.split(/\s+/);
  return {
    id: String(ensuredSupplier.id),
    created: ensuredSupplier.created,
    firstName,
    lastName: rest.join(' '),
    taxNumber,
    city,
    district,
    address,
  };
}

async function fillByLabel(page: Page, label: string, value: string) {
  const target = page.getByLabel(label, { exact: false }).first();
  await expect(target).toBeVisible({ timeout: 15_000 });
  await target.fill(value);
}

async function selectNative(page: Page, label: string, value: string) {
  const target = page.getByLabel(label, { exact: false }).first();
  await expect(target).toBeVisible({ timeout: 15_000 });
  await target.selectOption(value);
}

async function pickDateByTestId(page: Page, testId: string, isoDate: string) {
  const input = page.getByTestId(testId);
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.click();

  const [year, month, day] = isoDate.split('-');
  const popup = page.getByTestId(`${testId}-popup`);
  await expect(popup).toBeVisible({ timeout: 15_000 });
  await popup.getByLabel('Ay seçin').selectOption(String(Number(month) - 1));
  await popup.getByLabel('Yıl seçin').selectOption(year);
  await popup.getByTestId(`${testId}-day-${year}-${month}-${day}`).click();
}

function isIssueResponse(response: Response) {
  return response.request().method() === 'POST' && /\/api\/invoices\/draft\/\d+\/issue$/.test(response.url());
}

function normalizeText(value: string) {
  return value
    .split('\u0000').join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPdfText(buffer: Buffer): string {
  const parts = new Set<string>();

  const pushChunk = (candidate: string) => {
    const normalized = candidate.replace(/[^\p{L}\p{N}\s:/.#_-]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (normalized.length >= 2) {
      parts.add(normalized);
    }
  };

  pushChunk(extractAsciiStrings(buffer));
  pushChunk(extractUtf16Strings(buffer));

  const binary = buffer.toString('latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(binary)) !== null) {
    const streamText = match[1];
    const start = match.index + match[0].indexOf(streamText);
    const end = start + streamText.length;
    const rawStream = buffer.subarray(start, end);
    const header = binary.slice(Math.max(0, match.index - 200), match.index);

    const candidates: Buffer[] = [rawStream];
    if (header.includes('/FlateDecode')) {
      try {
        candidates.push(inflateSync(rawStream));
      } catch {
        // ignored on purpose
      }
    }

    for (const candidate of candidates) {
      pushChunk(extractLiteralPdfStrings(candidate.toString('latin1')));
      pushChunk(extractAsciiStrings(candidate));
      pushChunk(extractUtf16Strings(candidate));
    }
  }

  return Array.from(parts).join(' ');
}

function extractAsciiStrings(buffer: Buffer): string {
  const matches = buffer.toString('latin1').match(/[A-Za-z0-9ÇĞİÖŞÜçğıöşü@:/.#_\- ]{4,}/g);
  return matches ? matches.join(' ') : '';
}

function extractUtf16Strings(buffer: Buffer): string {
  const chunks: string[] = [];
  for (let i = 0; i < buffer.length - 1; i += 2) {
    const code = buffer.readUInt16BE(i);
    if (code >= 32 && code <= 126) {
      let current = '';
      let j = i;
      while (j < buffer.length - 1) {
        const inner = buffer.readUInt16BE(j);
        if (inner < 32 || inner > 126) break;
        current += String.fromCharCode(inner);
        j += 2;
      }
      if (current.length >= 4) {
        chunks.push(current);
      }
      i = j;
    }
  }
  return chunks.join(' ');
}

function extractLiteralPdfStrings(pdfSource: string): string {
  const chunks: string[] = [];
  const literalRegex = /\((?:\\.|[^\\)])*\)|<([0-9A-Fa-f]+)>/g;
  let match: RegExpExecArray | null;
  while ((match = literalRegex.exec(pdfSource)) !== null) {
    if (match[0].startsWith('(')) {
      chunks.push(
        match[0]
          .slice(1, -1)
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\\\\/g, '\\')
      );
    } else if (match[1]) {
      try {
        const hex = Buffer.from(match[1], 'hex');
        chunks.push(hex.toString('utf8'));
      } catch {
        // ignore invalid hex strings
      }
    }
  }
  return chunks.join(' ');
}
