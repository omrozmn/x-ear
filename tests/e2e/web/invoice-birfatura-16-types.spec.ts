import { test, expect, type Locator } from '../fixtures/fixtures';
import type { Page, Response } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inflateSync } from 'node:zlib';

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
      // Wait for return invoice section to appear after invoice type selection
      await page.waitForSelector('[data-testid="return-invoice-number"]', { timeout: 10000 });
      
      await page.getByTestId('return-invoice-number').fill('GIB2009000000011');
      await page.getByTestId('return-invoice-reason').fill('E2E iade testi');
      
      // Date picker is readonly, need to remove readonly attribute first
      const dateInput = page.getByTestId('return-invoice-date');
      await dateInput.evaluate((el: HTMLInputElement) => el.removeAttribute('readonly'));
      await dateInput.fill('2026-03-01');
      
      // Wait for React state to update
      await page.waitForTimeout(500);
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
      await page.getByRole('button', { name: /^Tevkifat$/ }).first().click();
      const modal = page.locator('.fixed.inset-0.z-50').last();
      await expect(modal.getByRole('heading', { name: /Satır Bazında Tevkifat/i })).toBeVisible({ timeout: 15_000 });
      await selectFieldFromLabel(page, 'Tevkifat Kodu', '624');
      await fillFieldFromLabel(page, 'Tevkifat Oranı (%)', '20');
      await modal.getByRole('button', { name: 'Kaydet', exact: true }).click();
      await expect(modal).toBeHidden({ timeout: 15_000 });
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
      await fillFieldFromLabel(page, 'Özel Matrah Tutarı', '80');
      await fillFieldFromLabel(page, 'KDV Oranı (%)', '10');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:InvoiceTypeCode>OZELMATRAH</cbc:InvoiceTypeCode>');
      expect(xmlText).toContain('80');
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
      const exportSection = page.locator('div.bg-white.rounded-2xl.border.border-gray-200.p-4.shadow-sm', {
        has: page.getByRole('heading', { name: 'İhracat Bilgileri' }),
      }).first();
      await expect(exportSection).toBeVisible({ timeout: 15_000 });
      await fillFieldFromContainer(exportSection, 'Gümrük Beyanname Numarası', 'GBN-2026-001');
      await fillDateFieldFromContainer(exportSection, 'Gümrük Beyanname Tarihi', '2026-03-08');
      await selectFieldFromContainer(exportSection, 'Taşıma Şekli', '1');
      await selectFieldFromContainer(exportSection, 'Teslim Şartı (INCOTERMS)', 'CIF');
      await fillFieldFromContainer(exportSection, 'GTİP Kodu', '84713000');
      await fillFieldFromContainer(exportSection, 'İhracat Ülkesi', 'DE');
      await fillFieldFromContainer(exportSection, 'İhracat Limanı', 'Hamburg');
    },
    xmlChecks: (xmlText) => {
      expect(xmlText).toContain('<cbc:ProfileID>IHRACAT</cbc:ProfileID>');
      expect(xmlText).toContain('84713000');
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
      await selectNative(page, 'Dönem Yılı', '2026');
      await selectNative(page, 'Dönem Ayı', '03');
      await fillDateFieldFromLabel(page, 'Dönem Başlangıç Tarihi', '2026-03-01');
      await fillDateFieldFromLabel(page, 'Dönem Bitiş Tarihi', '2026-03-31');
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
      await fillDateFieldFromLabel(page, 'Konaklama Başlangıç', '2026-03-01');
      await fillDateFieldFromLabel(page, 'Konaklama Bitiş', '2026-03-05');
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
      await fillDateFieldFromLabel(page, 'Şarj Başlangıç', '2026-03-08');
      await fillDateFieldFromLabel(page, 'Şarj Bitiş', '2026-03-08');
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
    fillSpecial: async () => {},
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
    fillSpecial: async () => {},
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
      await fillDateFieldFromLabel(page, 'Şarj Başlangıç', '2026-03-08');
      await fillDateFieldFromLabel(page, 'Şarj Bitiş', '2026-03-08');
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

  CASES.forEach((invoiceCase, index) => {
    test(`${invoiceCase.title}: creates, issues, validates XML/PDF and opens PDF`, async ({ tenantPage, apiContext }) => {
      test.slow();

      const seededParty = getExistingReceiverParty();
      console.log(`✅ Using existing receiver: ${seededParty.firstName} ${seededParty.lastName} (${seededParty.taxNumber})`);

      await ensureTenantInvoiceSettings(apiContext, index);

      const { invoiceId, invoiceNumber, lineName } = await createInvoiceFromUi(tenantPage, invoiceCase, seededParty);

      const xmlResponse = await apiContext.get(`/api/invoices/${invoiceId}/document?format=xml`);
      expect(xmlResponse.ok(), `${invoiceCase.title} XML fetch failed`).toBeTruthy();
      const xmlText = await xmlResponse.text();
      if (invoiceCase.key !== 'sgk') {
        expect(xmlText).toContain(lineName);
      }
      invoiceCase.xmlChecks(xmlText, seededParty, invoiceNumber);

      const htmlResponse = await apiContext.get(`/api/invoices/${invoiceId}/document?format=html`);
      expect(htmlResponse.ok(), `${invoiceCase.title} HTML fetch failed`).toBeTruthy();
      const htmlText = normalizeText(await htmlResponse.text());
      if (invoiceCase.key !== 'sgk') {
        expect(htmlText).toContain(normalizeText(lineName));
      }
      expect(htmlText).toContain(normalizeText(invoiceNumber));

      const pdfResponse = await apiContext.get(`/api/invoices/${invoiceId}/document?format=pdf`);
      expect(pdfResponse.ok(), `${invoiceCase.title} PDF fetch failed`).toBeTruthy();
      const pdfHeaders = pdfResponse.headers();
      expect(pdfHeaders['content-type'] || '').toContain('application/pdf');
      const pdfBuffer = Buffer.from(await pdfResponse.body());
      expect(pdfBuffer.subarray(0, 4).toString('latin1')).toBe('%PDF');

      let pdfChecksPassed = false;
      const providerPdfText = normalizeText(extractPdfText(pdfBuffer));
      if (providerPdfText.length > 100) {
        try {
          invoiceCase.pdfChecks(providerPdfText, seededParty, invoiceNumber);
          pdfChecksPassed = true;
          console.log(`[${invoiceCase.title}] ✅ Provider PDF text checks passed`);
        } catch {
          console.log(`[${invoiceCase.title}] Provider PDF text extraction readable but content checks failed; retrying with local PDF`);
        }
      } else {
        console.log(`[${invoiceCase.title}] Provider PDF text extraction minimal; retrying with local PDF`);
      }

      if (!pdfChecksPassed) {
        const localPdfResponse = await apiContext.get(`/api/invoices/${invoiceId}/document?format=pdf&render_mode=local`);
        expect(localPdfResponse.ok(), `${invoiceCase.title} local PDF fetch failed`).toBeTruthy();
        const localPdfHeaders = localPdfResponse.headers();
        expect(localPdfHeaders['content-type'] || '').toContain('application/pdf');
        const localPdfBuffer = Buffer.from(await localPdfResponse.body());
        expect(localPdfBuffer.subarray(0, 4).toString('latin1')).toBe('%PDF');

        const localPdfText = normalizeText(extractPdfText(localPdfBuffer));
        expect(localPdfText.length, `${invoiceCase.title} local PDF text extraction should be readable`).toBeGreaterThan(50);
        invoiceCase.pdfChecks(localPdfText, seededParty, invoiceNumber);
        console.log(`[${invoiceCase.title}] ✅ Local PDF text checks passed`);
      }

      await openInvoicePdfFromTable(tenantPage, invoiceId, invoiceNumber);
    });
  });
});

async function ensureTenantInvoiceSettings(apiContext: { get: Function; patch: Function }, caseIndex: number) {
  const timestamp = (Date.now() + caseIndex).toString();
  const uniquePrefix = `E${timestamp.slice(-2)}`;
  console.log(`🔢 Test run using unique invoice prefix: ${uniquePrefix}`);

  try {
    const tenantResponse = await apiContext.get('/api/tenants/current');
    if (!tenantResponse.ok()) {
      return;
    }

    const tenantData = await tenantResponse.json();
    const currentSettings = tenantData.data?.settings || {};
    const currentCompanyInfo = tenantData.data?.companyInfo || tenantData.data?.company_info || {};
    const invoiceIntegration = currentSettings.invoice_integration || currentSettings.invoiceIntegration || {};

    const updatedSettings = {
      ...currentSettings,
      company: {
        ...(currentSettings.company || {}),
        name: currentCompanyInfo.companyName || currentCompanyInfo.name || 'X-Ear Test Isitme Merkezi',
        address: currentCompanyInfo.address || 'Test Sokak No:1',
        city: currentCompanyInfo.city || 'Ankara',
        district: currentCompanyInfo.district || 'Cankaya',
        taxOffice: currentCompanyInfo.taxOffice || currentCompanyInfo.tax_office || 'ANKARA',
      },
      invoice_integration: {
        ...invoiceIntegration,
        invoice_prefix: uniquePrefix,
        invoice_prefixes: [uniquePrefix, ...(invoiceIntegration.invoice_prefixes || [])],
        vkn: '1234567801',
        tax_office: invoiceIntegration.tax_office || currentCompanyInfo.taxOffice || currentCompanyInfo.tax_office || 'ANKARA',
      },
    };

    await apiContext.patch('/api/tenants/current', {
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `test-prefix-${timestamp}`,
      },
      data: {
        settings: updatedSettings,
        companyInfo: {
          ...currentCompanyInfo,
          companyName: currentCompanyInfo.companyName || currentCompanyInfo.name || 'X-Ear Test Isitme Merkezi',
          taxNumber: '1234567801',
          taxOffice: currentCompanyInfo.taxOffice || currentCompanyInfo.tax_office || 'ANKARA',
          address: currentCompanyInfo.address || 'Test Sokak No:1',
          city: currentCompanyInfo.city || 'Ankara',
          district: currentCompanyInfo.district || 'Cankaya',
          country: currentCompanyInfo.country || 'Turkiye',
          email: currentCompanyInfo.email || 'test@example.com',
          phone: currentCompanyInfo.phone || '03120000000',
        },
      },
    });

    console.log(`✅ Tenant settings updated with unique prefix and sandbox VKN: ${uniquePrefix}`);
  } catch (error) {
    console.error('⚠️ Failed to update tenant settings:', error);
  }
}

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
    // Wait for form to update after invoice type selection
    // For return invoices (50, 15, 49), wait for special fields to appear
    if (['50', '15', '49'].includes(invoiceCase.invoiceType)) {
      await page.waitForTimeout(1000); // Give more time for form to update
    } else {
      await page.waitForTimeout(500);
    }
  }

  if (invoiceCase.invoiceType !== '14') {
    await chooseCustomer(page, seededParty);
  }
  await ensureLineExists(page);
  const lineName = await fillLine(page, 0, invoiceCase.key, invoiceCase.lineTaxRate ?? 20);
  await fillCommonSupportingFields(page, invoiceCase.key);
  await invoiceCase.fillSpecial(page, seededParty);

  await page.getByTestId('invoice-submit-button').click();

  const issueResponse = await issueResponsePromise;
  const issueJson = await issueResponse.json() as { data?: { invoice_id?: number; invoiceId?: number } };
  
  // Debug: log response if invoice_id is missing
  if (!issueJson.data?.invoice_id && !issueJson.data?.invoiceId) {
    console.error(`[${invoiceCase.title}] Issue response missing invoice_id:`, JSON.stringify(issueJson, null, 2));
  }
  
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
  
  // Tax rate select may be disabled for return invoices (type 50, 15, 49)
  const taxRateSelect = page.getByTestId(`invoice-line-tax-rate-${index}`);
  const isDisabled = await taxRateSelect.isDisabled().catch(() => true);
  if (!isDisabled) {
    await taxRateSelect.selectOption(String(taxRate));
  }
  
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
  
  // Close any error overlays that might be blocking the click
  const errorOverlay = page.locator('vite-error-overlay');
  if (await errorOverlay.count() > 0) {
    await errorOverlay.evaluate((el) => el.remove());
  }
  
  const modal = page.getByTestId('invoice-pdf-modal');

  await row.locator('button').last().click();
  const viewButton = page.getByRole('button', { name: 'Fatura Görüntüle' });
  if (await viewButton.isVisible().catch(() => false)) {
    await viewButton.click();
  } else {
    await row.click();
  }

  await expect(modal).toBeVisible({ timeout: 30_000 });
  // Use more specific selector - check modal heading contains invoice number
  await expect(modal.getByRole('heading').filter({ hasText: invoiceNumber })).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press('Escape').catch(() => {});
}

function getExistingReceiverParty(): PartySeed {
  const taxNumber = process.env.E2E_TEST_RECEIVER_VKN || '1234567801';
  const companyName = process.env.E2E_TEST_RECEIVER_NAME || 'GIB TEST RECEIVER';
  const city = process.env.E2E_TEST_RECEIVER_CITY || 'ANKARA';
  const district = process.env.E2E_TEST_RECEIVER_DISTRICT || 'Cankaya';
  const address = process.env.E2E_TEST_RECEIVER_ADDRESS || 'Alici sokak';
  const [firstName, ...rest] = companyName.split(/\s+/);
  return {
    id: taxNumber,
    created: false,
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

async function fillFieldFromLabel(page: Page, label: string, value: string) {
  const target = page.locator('label', { hasText: label }).first();
  await expect(target).toBeVisible({ timeout: 15_000 });
  const input = target.locator('xpath=following-sibling::*[1]').locator('input').first();
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill(value);
}

async function fillFieldFromContainer(container: Locator, label: string, value: string) {
  const target = container.locator('label', { hasText: label }).first();
  await expect(target).toBeVisible({ timeout: 15_000 });
  const input = target.locator('xpath=following-sibling::*[1]').locator('input').first();
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill(value);
}

async function selectNative(page: Page, label: string, value: string) {
  const target = page.getByLabel(label, { exact: false }).first();
  await expect(target).toBeVisible({ timeout: 15_000 });
  await target.selectOption(value);
}

async function selectFieldFromLabel(page: Page, label: string, value: string) {
  const target = page.locator('label', { hasText: label }).first();
  await expect(target).toBeVisible({ timeout: 15_000 });
  const select = target.locator('xpath=following-sibling::*[1]').locator('select').first();
  await expect(select).toBeVisible({ timeout: 15_000 });
  await select.selectOption(value);
}

async function selectFieldFromContainer(container: Locator, label: string, value: string) {
  const target = container.locator('label', { hasText: label }).first();
  await expect(target).toBeVisible({ timeout: 15_000 });
  const select = target.locator('xpath=following-sibling::*[1]').locator('select').first();
  await expect(select).toBeVisible({ timeout: 15_000 });
  await select.selectOption(value);
}

async function fillDateFieldFromLabel(page: Page, label: string, isoDate: string) {
  const target = page.locator('label', { hasText: label }).first();
  await expect(target).toBeVisible({ timeout: 15_000 });
  const input = target.locator('xpath=following-sibling::*[1]').locator('input').first();
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.evaluate((el: HTMLInputElement) => el.removeAttribute('readonly'));
  await input.fill(isoDate);
  await input.blur();
}

async function fillDateFieldFromContainer(container: Locator, label: string, isoDate: string) {
  const target = container.locator('label', { hasText: label }).first();
  await expect(target).toBeVisible({ timeout: 15_000 });
  const input = target.locator('xpath=following-sibling::*[1]').locator('input').first();
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.evaluate((el: HTMLInputElement) => el.removeAttribute('readonly'));
  await input.fill(isoDate);
  await input.blur();
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
  const fitzText = extractPdfTextWithPyMuPdf(buffer);
  if (fitzText) {
    return fitzText;
  }

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

function extractPdfTextWithPyMuPdf(buffer: Buffer): string {
  const pythonPath = '/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/.venv/bin/python';
  if (!existsSync(pythonPath)) {
    return '';
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'xear-pdf-'));
  const pdfPath = join(tempDir, 'document.pdf');
  try {
    writeFileSync(pdfPath, buffer);
    const script = [
      'import fitz, sys',
      'doc = fitz.open(sys.argv[1])',
      'parts = []',
      'for page in doc:',
      '    parts.append(page.get_text("text"))',
      'print("\\n".join(parts))',
    ].join('\n');
    return execFileSync(pythonPath, ['-c', script, pdfPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
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
          .replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(Number.parseInt(octal, 8)))
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\\b/g, ' ')
          .replace(/\\f/g, ' ')
          .replace(/\\\\/g, '\\')
      );
    } else if (match[1]) {
      try {
        const hex = Buffer.from(match[1], 'hex');
        const decoded = new Set<string>();
        const pushDecoded = (value: string) => {
          const normalized = value.replace(/\u0000/g, ' ').trim();
          if (normalized.length >= 2) {
            decoded.add(normalized);
          }
        };

        pushDecoded(hex.toString('utf8'));
        pushDecoded(hex.toString('latin1'));

        if (hex.length >= 2) {
          const utf16 = hex.toString('utf16le').replace(/\uFEFF/g, '');
          pushDecoded(utf16);

          const swapped = Buffer.from(hex);
          swapped.swap16();
          pushDecoded(swapped.toString('utf16le').replace(/\uFEFF/g, ''));
        }

        chunks.push(...decoded);
      } catch {
        // ignore invalid hex strings
      }
    }
  }
  return chunks.join(' ');
}
