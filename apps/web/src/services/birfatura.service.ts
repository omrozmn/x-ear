/**
 * BirFatura API Service
 * 
 * BirFatura aracı entegratör sistemi ile iletişim için servis.
 * NOT: Faturalar GİB'e direkt gönderilmez, BirFatura üzerinden gönderilir.
 */

import { InvoiceFormData } from '../types/invoice';
import { getOutEBelgeV2API } from '../generated/birfatura/outEBelgeV2API';

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
  gibResponse?: any;
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
      objects: any[];
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
      const resp = await api.postApiOutEBelgeV2GetInBoxDocuments(params as any);
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
      const resp = await api.postApiOutEBelgeV2GetInBoxDocumentsWithDetail(params as any);
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
      } as any);
      
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
        const ds = new DecompressionStream('gzip');
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
      } as any);
      
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
        const ds = new DecompressionStream('gzip');
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
        uuid,
        systemType: 'EFATURA',
        documentType: 'INVOICE',
        inOutCode: 'IN'
      } as any);
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
      } as any);
      
      const data = resp?.data || {};
      return {
        success: !!data?.Success,
        message: data?.Message || data?.Result?.Description,
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
      const body = { invoice: invoiceData } as any;
      const resp = await api.postApiOutEBelgeV2SendBasicInvoiceFromModel(body);
      const data = resp?.data || {};
      return {
        success: !!data?.Success,
        birfaturaId: data?.Result?.invoiceNo || undefined,
        message: data?.Message,
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
    try {
      const response = await fetch(`${this.baseURL}/Create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        throw new Error('Fatura oluşturulamadı');
      }

      const data = await response.json();

      return {
        success: true,
        invoiceId: data.id || data.invoiceId,
        message: 'Fatura başarıyla oluşturuldu',
      };
    } catch (error) {
      console.error('BirFatura create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      };
    }
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
        success: !!data?.Success,
        message: data?.Message,
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
      const data = resp?.data || {};
      return {
        status: ((data?.Result ?? data?.status) as any) || 'pending',
        message: data?.Message || data?.message,
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
      const resp = await api.postApiOutEBelgeV2DocumentDownloadByUUID({ documentUUID: invoiceId, inOutCode: 'OUT', systemTypeCodes: 'EFATURA', fileExtension: 'XML' } as any);
      const data = resp?.data || {};
      return {
        xml: data?.Result?.content || data?.Result?.content || '',
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
      const response = await fetch(`${this.baseURL}/Retry/${invoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Yeniden gönderilemedi');
      }

      const data = await response.json();

      return {
        success: true,
        invoiceId,
        birfaturaId: data.birfaturaId,
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
      const response = await fetch(`${this.baseURL}/Cancel/${invoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
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
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
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
    let success = 0;
    let failed = 0;

    for (const invoiceId of invoiceIds) {
      const result = await this.send(invoiceId);
      results.push(result);
      
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed, results };
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
