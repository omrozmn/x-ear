/**
 * BirFatura API Service
 * 
 * BirFatura aracı entegratör sistemi ile iletişim için servis.
 * NOT: Faturalar GİB'e direkt gönderilmez, BirFatura üzerinden gönderilir.
 */

import { InvoiceFormData } from '../types/invoice';
import { apiClient } from '../api/orval-mutator';
import {
  createEfaturaRetry,
  createEfaturaCancel
} from '@/api/client/bir-fatura.client';
import {
  getOutEBelgeV2API,
  GetInBoxDocumentsRequestData,
  UpdateUnreadedStatusRequestData,
  SendDocumentAnswerRequestData,
  SendBasicInvoiceFromModelRequestData
} from '../generated/birfatura/outEBelgeV2API';
import { unwrapObject } from '../utils/response-unwrap';

export interface BirFaturaResponse {
  success: boolean;
  invoiceId?: string;
  birfaturaId?: string;
  uuid?: string;
  error?: string;
  message?: string;
}

export interface InvoiceStatus {
  status: 'draft' | 'pending' | 'sent' | 'approved' | 'rejected' | 'cancelled';
  gibStatus?: 'pending' | 'approved' | 'rejected';
  gibResponse?: Record<string, unknown>;
  birfaturaStatus?: string;
  lastUpdated?: string;
  error?: string;
  message?: string;
}

export interface XMLResponse {
  xml: string;
  format: 'UBL-TR' | 'UBL-TR-2.1';
  encoding: string;
}

/**
 * Gelen fatura (InBox) tipi - Birfatura API'den gelen yapı
 */
export interface InBoxInvoice {
  uuid: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceTypeCode: string;
  profileId: string;
  senderName: string;
  senderTaxNo: string;
  receiverName: string;
  receiverTaxNo: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  isRead: boolean;
  createTime: string;
  filename?: string;
  lineCount?: number;
  notes?: string[];
  accountingCost?: string;
  jsonData?: string; // Base64 encoded XML (only in WithDetail response)
}

/**
 * Gelen fatura listesi yanıtı
 */
export interface InBoxDocumentsResponse {
  Success: boolean;
  Message?: string;
  Result?: {
    InBoxInvoices?: {
      total: number;
      limit: number;
      page: number;
      objects: InBoxInvoice[];
    };
    InBoxReceiptAdvice?: {
      total: number;
      limit: number;
      page: number;
      objects: Record<string, unknown>[];
    };
  };
}

/**
 * Gelen fatura sorgulama parametreleri
 */
export interface InBoxDocumentsRequest {
  systemType: 'EFATURA' | 'EARSIV' | 'EIRSALIYE';
  startDateTime: string;
  endDateTime: string;
  documentType: 'INVOICE' | 'DESPATCHADVICE' | 'RECEIPTADVICE' | 'DOCUMENT';
  readUnReadStatus?: 'UNREADED' | 'READED' | 'ALL';
  pageNumber: number;
}

class BirFaturaService {
  private baseURL = '/api/EFatura';

  // ============================================
  // GELEN FATURALAR (INBOX) - Alış Faturaları
  // ============================================

  /**
   * Gelen faturaları listele (XML olmadan)
   */
  async getInBoxDocuments(params: InBoxDocumentsRequest): Promise<InBoxDocumentsResponse> {
    try {
      const api = getOutEBelgeV2API();
      const resp = await api.postApiOutEBelgeV2GetInBoxDocuments(params as unknown as GetInBoxDocumentsRequestData);
      return resp?.data as InBoxDocumentsResponse || { Success: false };
    } catch (error) {
      console.error('BirFatura getInBoxDocuments error:', error);
      return { Success: false, Message: error instanceof Error ? error.message : 'Bilinmeyen hata' };
    }
  }

  /**
   * Gelen faturaları detaylı listele (XML içerikli)
   */
  async getInBoxDocumentsWithDetail(params: InBoxDocumentsRequest): Promise<InBoxDocumentsResponse> {
    try {
      const api = getOutEBelgeV2API();
      const resp = await api.postApiOutEBelgeV2GetInBoxDocumentsWithDetail(params as unknown as GetInBoxDocumentsRequestData);
      return resp?.data as InBoxDocumentsResponse || { Success: false };
    } catch (error) {
      console.error('BirFatura getInBoxDocumentsWithDetail error:', error);
      return { Success: false, Message: error instanceof Error ? error.message : 'Bilinmeyen hata' };
    }
  }

  /**
   * Gelen fatura PDF'ini indir
   */
  async getInBoxInvoicePDF(uuid: string): Promise<Blob | null> {
    try {
      const api = getOutEBelgeV2API();
      const resp = await api.postApiOutEBelgeV2DocumentDownloadByUUID({
        documentUUID: uuid,
        inOutCode: 'IN',
        systemTypeCodes: 'EFATURA',
        fileExtension: 'XML'
      } as Record<string, unknown>);

      const content = resp?.data?.Result?.content;
      if (!content) return null;

      // Decode base64 and decompress if needed
      const binary = atob(content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Try to decompress (gzip)
      try {
        const ds = new (window as any).DecompressionStream('gzip');
        const decompressed = new Response(new Blob([bytes]).stream().pipeThrough(ds));
        return await decompressed.blob();
      } catch {
        // If not compressed, return as-is
        return new Blob([bytes], { type: 'application/pdf' });
      }
    } catch (error) {
      console.error('BirFatura getInBoxInvoicePDF error:', error);
      return null;
    }
  }

  /**
   * Gelen fatura XML'ini indir
   */
  async getInBoxInvoiceXML(uuid: string): Promise<string | null> {
    try {
      const api = getOutEBelgeV2API();
      const resp = await api.postApiOutEBelgeV2DocumentDownloadByUUID({
        documentUUID: uuid,
        inOutCode: 'IN',
        systemTypeCodes: 'EFATURA',
        fileExtension: 'XML'
      } as Record<string, unknown>);

      const content = resp?.data?.Result?.content;
      if (!content) return null;

      // Decode base64 and decompress
      const binary = atob(content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Try to decompress (gzip)
      try {
        const ds = new (window as any).DecompressionStream('gzip');
        const decompressed = new Response(new Blob([bytes]).stream().pipeThrough(ds));
        return await decompressed.text();
      } catch {
        // If not compressed, decode as text
        return new TextDecoder().decode(bytes);
      }
    } catch (error) {
      console.error('BirFatura getInBoxInvoiceXML error:', error);
      return null;
    }
  }

  /**
   * Gelen faturayı okundu olarak işaretle
   */
  async markInBoxInvoiceAsRead(uuid: string): Promise<boolean> {
    try {
      const api = getOutEBelgeV2API();
      const resp = await api.postApiOutEBelgeV2UpdateUnreadedStatus({
        uuid: uuid,
        systemType: 'EFATURA',
        documentType: 'INVOICE',
        inOutCode: 'IN'
      } as unknown as UpdateUnreadedStatusRequestData);
      return resp?.data?.Success || false;
    } catch (error) {
      console.error('BirFatura markInBoxInvoiceAsRead error:', error);
      return false;
    }
  }

  /**
   * Gelen faturaya yanıt gönder (KABUL/RED/IPTAL)
   */
  async sendInBoxInvoiceAnswer(
    uuid: string,
    answer: 'KABUL' | 'RED' | 'IPTAL',
    reason?: string
  ): Promise<BirFaturaResponse> {
    try {
      const api = getOutEBelgeV2API();
      const resp = await api.postApiOutEBelgeV2SendDocumentAnswer({
        documentUUID: uuid,
        acceptOrRejectCode: answer,
        acceptOrRejectReason: reason,
        systemTypeCodes: 'EFATURA'
      } as unknown as SendDocumentAnswerRequestData);

      const data = resp?.data || {};
      return {
        success: !!(data as any)?.Success,
        message: (data as any)?.Message || (data as any)?.Result?.Description,
      };
    } catch (error) {
      console.error('BirFatura sendInBoxInvoiceAnswer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      };
    }
  }

  // ============================================
  // GİDEN FATURALAR (OUTBOX) - Satış Faturaları
  // ============================================

  /**
   * Fatura oluştur ve BirFatura'ya gönder
   */
  async createAndSend(invoiceData: InvoiceFormData): Promise<BirFaturaResponse> {
    try {
      const api = getOutEBelgeV2API();
      const body = { invoice: invoiceData } as unknown as SendBasicInvoiceFromModelRequestData;
      const resp = await api.postApiOutEBelgeV2SendBasicInvoiceFromModel(body);
      const data = resp?.data || {};
      return {
        success: !!(data as any)?.Success,
        birfaturaId: (data as any)?.Result?.invoiceNo || undefined,
        message: (data as any)?.Message,
      };
    } catch (error) {
      console.error('BirFatura createAndSend error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      };
    }
  }

  /**
   * Sadece fatura oluştur (göndermeden)
   */
  async create(invoiceData: InvoiceFormData): Promise<BirFaturaResponse> {
    throw new Error('createEfaturaCreate fonksiyonu API\'de mevcut değil. createEfaturaRetry kullanın.');
  }

  /**
   * Mevcut faturayı BirFatura'ya gönder
   */
  async send(invoiceId: string): Promise<BirFaturaResponse> {
    try {
      const api = getOutEBelgeV2API();
      const resp = await api.postApiOutEBelgeV2ReEnvelopeAndSend({ uuid: invoiceId });
      const data = resp?.data || {};
      return {
        success: !!(data as any)?.Success,
        message: (data as any)?.Message,
      };
    } catch (error) {
      console.error('BirFatura send error:', error);
      return {
        success: false,
        invoiceId,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      };
    }
  }

  /**
   * Fatura durumunu sorgula
   */
  async getStatus(invoiceId: string): Promise<InvoiceStatus> {
    try {
      const api = getOutEBelgeV2API();
      const resp = await api.postApiOutEBelgeV2GetEnvelopeStatusFromGIB({ envelopeID: invoiceId });
      const data = resp?.data;
      return {
        status: ((data as any)?.Result as InvoiceStatus['status']) || ((data as any)?.status as InvoiceStatus['status']) || 'pending',
        message: ((data as any)?.Message as string) || ((data as any)?.message as string),
      };
    } catch (error) {
      console.error('BirFatura getStatus error:', error);
      return {
        status: 'draft',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      };
    }
  }

  /**
   * Fatura XML'ini indir
   */
  async getXML(invoiceId: string): Promise<XMLResponse | null> {
    try {
      const api = getOutEBelgeV2API();
      const resp = await api.postApiOutEBelgeV2DocumentDownloadByUUID({
        documentUUID: invoiceId,
        inOutCode: 'OUT',
        systemTypeCodes: 'EFATURA',
        fileExtension: 'XML'
      } as unknown as Record<string, unknown>);
      const data = resp?.data as Record<string, unknown> | undefined;
      return {
        xml: (data?.Result as any)?.content || '',
        format: 'UBL-TR',
        encoding: 'UTF-8',
      };
    } catch (error) {
      console.error('BirFatura getXML error:', error);
      return null;
    }
  }

  /**
   * Faturayı yeniden gönder (hata durumunda)
   */
  async retry(invoiceId: string): Promise<BirFaturaResponse> {
    try {
      const response = await createEfaturaRetry(invoiceId);
      const data = unwrapObject<Record<string, unknown>>(response);

      if (!data || !data.Success) {
        throw new Error('Yeniden gönderilemedi');
      }

      return {
        success: true,
        invoiceId,
        message: 'Fatura yeniden gönderildi',
      };
    } catch (error) {
      console.error('BirFatura retry error:', error);
      return {
        success: false,
        invoiceId,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      };
    }
  }

  /**
   * Faturayı iptal et
   */
  async cancel(invoiceId: string, reason?: string): Promise<BirFaturaResponse> {
    try {
      const response = await createEfaturaCancel(invoiceId);
      const data = unwrapObject<Record<string, unknown>>(response);

      if (!data || !data.Success) {
        throw new Error('Fatura iptal edilemedi');
      }

      return {
        success: true,
        invoiceId,
        message: 'Fatura iptal edildi',
      };
    } catch (error) {
      console.error('BirFatura cancel error:', error);
      return {
        success: false,
        invoiceId,
        error: reason || (error instanceof Error ? error.message : 'Bilinmeyen hata'),
      };
    }
  }

  /**
   * Toplu fatura gönderimi
   */
  async bulkSend(invoiceIds: string[]): Promise<{
    success: number;
    failed: number;
    results: BirFaturaResponse[];
  }> {
    const results: BirFaturaResponse[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const invoiceId of invoiceIds) {
      const result = await this.send(invoiceId);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount, results };
  }

  /**
   * Fatura durumunu polling ile takip et
   */
  async pollStatus(
    invoiceId: string,
    onUpdate: (status: InvoiceStatus) => void,
    maxAttempts: number = 30,
    interval: number = 2000
  ): Promise<InvoiceStatus> {
    let attempts = 0;

    return new Promise((resolve) => {
      const poll = setInterval(async () => {
        attempts++;
        const status = await this.getStatus(invoiceId);
        onUpdate(status);

        // Sonuç durumlarında polling'i durdur
        if (
          status.status === 'approved' ||
          status.status === 'rejected' ||
          status.status === 'cancelled' ||
          attempts >= maxAttempts
        ) {
          clearInterval(poll);
          resolve(status);
        }
      }, interval);
    });
  }
}

export const birfaturaService = new BirFaturaService();
export default birfaturaService;
