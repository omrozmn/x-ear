/**
 * BirFatura API Service
 * 
 * BirFatura aracı entegratör sistemi ile iletişim için servis.
 * NOT: Faturalar GİB'e direkt gönderilmez, BirFatura üzerinden gönderilir.
 */

import { InvoiceFormData } from '../types/invoice';

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

class BirFaturaService {
  private baseURL = '/api/EFatura';

  /**
   * Fatura oluştur ve BirFatura'ya gönder
   */
  async createAndSend(invoiceData: InvoiceFormData): Promise<BirFaturaResponse> {
    try {
      // 1. Önce faturayı oluştur
      const createResponse = await fetch(`${this.baseURL}/Create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (!createResponse.ok) {
        throw new Error('Fatura oluşturulamadı');
      }

      const createData = await createResponse.json();
      const invoiceId = createData.id || createData.invoiceId;

      // 2. BirFatura'ya gönder
      const sendResponse = await fetch(`${this.baseURL}/SendToBirFatura/${invoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!sendResponse.ok) {
        return {
          success: false,
          invoiceId,
          error: 'BirFatura\'ya gönderilemedi',
        };
      }

      const sendData = await sendResponse.json();

      return {
        success: true,
        invoiceId,
        birfaturaId: sendData.birfaturaId,
        uuid: sendData.uuid,
        message: 'Fatura başarıyla oluşturuldu ve BirFatura\'ya gönderildi',
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
      const response = await fetch(`${this.baseURL}/SendToBirFatura/${invoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('BirFatura\'ya gönderilemedi');
      }

      const data = await response.json();

      return {
        success: true,
        invoiceId,
        birfaturaId: data.birfaturaId,
        uuid: data.uuid,
        message: 'Fatura BirFatura\'ya gönderildi',
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
      const response = await fetch(`${this.baseURL}/GetStatus/${invoiceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Durum sorgulanamadı');
      }

      const data = await response.json();

      return {
        status: data.status || 'pending',
        gibStatus: data.gibStatus,
        gibResponse: data.gibResponse,
        birfaturaStatus: data.birfaturaStatus,
        lastUpdated: data.lastUpdated,
        message: data.message,
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
      const response = await fetch(`${this.baseURL}/GetXML/${invoiceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('XML indirilemedi');
      }

      const data = await response.json();

      return {
        xml: data.xml,
        format: data.format || 'UBL-TR',
        encoding: data.encoding || 'UTF-8',
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
