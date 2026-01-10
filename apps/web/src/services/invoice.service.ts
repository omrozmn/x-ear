import {
  Invoice,
  InvoiceFilters,
  InvoiceSearchResult,
  InvoiceStats,
  InvoiceItem,
  InvoiceTemplate,
  CreateInvoiceData,
  UpdateInvoiceData,
  InvoiceCalculation,
  InvoiceValidation,
  InvoicePayment,
  InvoicePaymentPlan,
  EFaturaSubmission,
  EFaturaBulkSubmission,
  InvoiceExportOptions,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod
} from '../types/invoice';
import { INVOICES_DATA } from '../constants/storage-keys';
import { outbox } from '../utils/outbox';
import { unwrapObject, unwrapArray } from '../utils/response-unwrap';
import {
  createInvoices,
  getInvoice,
  listInvoices
} from '@/api/generated/invoices/invoices';
import {
  createInvoiceIssue,
  listInvoicePdf
} from '@/api/generated/invoice-actions/invoice-actions';
import {
  getInvoiceTemplates as getInvoiceTemplatesApi,
  getPrintQueue as getPrintQueueApi,
  addToPrintQueue as addToPrintQueueApi,
  bulkUploadInvoices as bulkUploadInvoicesApi,
  createInvoiceSendToGib
} from '@/api/generated/invoices/invoices';
import {
  getAdminInvoicesApiAdminInvoicesGet
} from '@/api/generated/admin-invoices/admin-invoices';
import { apiClient } from '../api/orval-mutator';


export class InvoiceService {
  /**
   * Resolve a server numeric id for an invoice identifier.
   * - If caller passes a numeric id string, returns that number.
   * - If caller passes a local temp id (eg. 'inv-001'), looks up local storage
   *   for an invoice with that id and returns its `serverId` if present.
   * - Returns null when no server id is available.
   */
  private async resolveServerId(invoiceId: string): Promise<number | null> {
    // If the id is already numeric, return it
    if (/^[0-9]+$/.test(String(invoiceId))) return Number(invoiceId);

    const invoices = await this.loadInvoices();
    const found = invoices.find(inv => inv.id === invoiceId);
    if (!found) return null;
    // Prefer explicit serverId field when available
    if ((found as any).serverId) return (found as any).serverId as number;

    // If invoice id is numeric-like string (unlikely here), coerce
    if (/^[0-9]+$/.test(String(found.id))) return Number(found.id);

    return null;
  }

  /**
   * Map a server invoice object (from API) into the local `Invoice` shape
   * and persist it into local storage replacing the provided temporary id
   * if any.
   */
  private async persistServerInvoice(serverInv: any, tempId?: string): Promise<Invoice> {
    const invoices = await this.loadInvoices();

    const mapped: Invoice = {
      id: String(serverInv.id),
      serverId: serverInv.id,
      invoiceNumber: serverInv.invoiceNumber || serverInv.id && `INV-${serverInv.id}`,
      type: (serverInv.type as any) || 'sale',
      status: (serverInv.status as any) || 'draft',
      patientName: serverInv.patientName || serverInv.customerName || '',
      patientId: serverInv.patientId || serverInv.customerId,
      customerId: serverInv.customerId,
      customerName: serverInv.customerName,
      customerTaxNumber: serverInv.customerTaxNumber,
      customerAddress: serverInv.customerAddress,
      items: serverInv.items || [],
      billingAddress: serverInv.billingAddress,
      shippingAddress: serverInv.shippingAddress,
      issueDate: serverInv.issueDate,
      dueDate: serverInv.dueDate,
      paymentDate: serverInv.paymentDate,
      paymentMethod: serverInv.paymentMethod,
      subtotal: serverInv.subtotal,
      totalDiscount: serverInv.totalDiscount,
      taxes: serverInv.taxes,
      totalTax: serverInv.totalTax,
      totalAmount: serverInv.totalAmount || serverInv.grandTotal,
      grandTotal: serverInv.grandTotal || serverInv.totalAmount,
      currency: serverInv.currency || 'TRY',
      notes: serverInv.notes,
      ettn: serverInv.ettn,
      gibStatus: serverInv.gibStatus,
      createdAt: serverInv.createdAt || new Date().toISOString(),
      updatedAt: serverInv.updatedAt || new Date().toISOString(),
      attachments: serverInv.attachments || []
    } as Invoice;

    if (tempId) {
      const idx = invoices.findIndex(i => i.id === tempId);
      if (idx !== -1) {
        invoices[idx] = mapped;
      } else {
        invoices.unshift(mapped);
      }
    } else {
      invoices.unshift(mapped);
    }

    await this.saveInvoices(invoices);
    return mapped;
  }

  /**
   * Attempt to synchronously push a local invoice to the server and persist
   * the returned server invoice locally (replacing temp id). Returns the
   * persisted Invoice or throws on fatal errors.
   */
  async syncInvoice(tempId: string): Promise<Invoice> {
    const invoices = await this.loadInvoices();
    const local = invoices.find(i => i.id === tempId || String(i.serverId) === tempId);
    if (!local) throw new Error('Local invoice not found for sync');

    // Build payload from local invoice shape, keeping it minimal to avoid
    // sending internal-only fields.
    const payload: any = {
      invoiceNumber: local.invoiceNumber,
      type: local.type,
      status: local.status,
      patientId: local.patientId || local.customerId,
      patientName: local.patientName || local.customerName,
      customerName: local.customerName,
      customerTaxNumber: local.customerTaxNumber,
      customerAddress: local.customerAddress,
      billingAddress: local.billingAddress,
      shippingAddress: local.shippingAddress,
      issueDate: local.issueDate,
      dueDate: local.dueDate,
      paymentMethod: local.paymentMethod,
      items: local.items || [],
      subtotal: local.subtotal,
      taxes: local.taxes,
      totalAmount: local.totalAmount || local.grandTotal,
      notes: local.notes,
      currency: local.currency || 'TRY'
    };

    const response = await createInvoices(payload);
    const serverInv = unwrapObject<any>(response);

    if (serverInv && typeof serverInv === 'object' && serverInv.id) {
      return this.persistServerInvoice(serverInv, tempId);
    }

    throw new Error('Server did not return created invoice');
  }
  // Load invoices from localStorage
  private async loadInvoices(): Promise<Invoice[]> {
    try {
      const data = localStorage.getItem(INVOICES_DATA);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading invoices:', error);
      return [];
    }
  }

  // Save invoices to localStorage
  private async saveInvoices(invoices: Invoice[]): Promise<void> {
    try {
      localStorage.setItem(INVOICES_DATA, JSON.stringify(invoices));
    } catch (error) {
      console.error('Error saving invoices:', error);
      throw new Error('Faturalar kaydedilemedi');
    }
  }

  // Generate sample invoice data
  private generateSampleInvoices(): Invoice[] {
    const sampleInvoices: Invoice[] = [];
    const statuses: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    const types: InvoiceType[] = ['standard' as InvoiceType, 'proforma' as InvoiceType, 'credit_note' as InvoiceType, 'debit_note' as InvoiceType];

    for (let i = 1; i <= 20; i++) {
      const createdDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      const dueDate = new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const items = this.generateInvoiceItems(Math.floor(Math.random() * 5) + 1);
      const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
      const totalAmount = subtotal + totalTax;

      sampleInvoices.push({
        id: `inv-${i.toString().padStart(3, '0')}`,
        invoiceNumber: `2024-${i.toString().padStart(4, '0')}`,
        customerId: `cust-${Math.floor(Math.random() * 100) + 1}`,
        customerName: `Müşteri ${i}`,
        patientName: `Hasta ${i}`,
        customerTaxNumber: `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        customerAddress: {
          street: `Test Sokak No: ${i}`,
          city: 'İstanbul',
          postalCode: '34000',
          country: 'Türkiye'
        },
        billingAddress: {
          name: `Müşteri ${i}`,
          address: `Fatura Sokak No: ${i}`,
          city: 'İstanbul',
          postalCode: '34000',
          country: 'Türkiye',
          taxNumber: `${Math.floor(Math.random() * 9000000000) + 1000000000}`
        },
        items,
        subtotal,
        taxes: [{
          type: 'vat',
          rate: 0.18,
          amount: totalTax
        }],
        totalAmount,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        type: types[Math.floor(Math.random() * types.length)],
        paymentMethod: 'cash',
        dueDate: dueDate.toISOString(),
        createdAt: createdDate.toISOString(),
        updatedAt: createdDate.toISOString(),
        notes: `Örnek fatura ${i} notları`,
        currency: 'TRY'
      });
    }

    return sampleInvoices;
  }

  private generateInvoiceItems(count: number = 3): InvoiceItem[] {
    const items: InvoiceItem[] = [];
    const sampleProducts = [
      { name: 'İşitme Cihazı Bakımı', price: 150 },
      { name: 'Kulak Kalıbı', price: 200 },
      { name: 'İşitme Testi', price: 100 },
      { name: 'Cihaz Ayarı', price: 75 },
      { name: 'Pil Değişimi', price: 25 }
    ];

    for (let i = 0; i < count; i++) {
      const product = sampleProducts[i % sampleProducts.length];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const unitPrice = product.price;
      const taxRate = 0.18; // %18 KDV
      const taxAmount = unitPrice * quantity * taxRate;
      const totalPrice = (unitPrice * quantity) + taxAmount;

      items.push({
        id: `item-${Date.now()}-${i}`,
        name: product.name,
        description: product.name,
        quantity,
        unitPrice,
        taxRate,
        taxAmount,
        totalPrice,
        sgkCode: `SGK${1000 + i}`,
        category: 'service'
      });
    }

    return items;
  }

  // Initialize with sample data if empty
  async initializeData(): Promise<void> {
    const invoices = await this.loadInvoices();
    if (invoices.length === 0) {
      const sampleInvoices = this.generateSampleInvoices();
      await this.saveInvoices(sampleInvoices);
    }
  }

  // CRUD Operations
  async createInvoice(invoiceData: CreateInvoiceData): Promise<Invoice> {
    // First try to create the invoice on the server synchronously. If that
    // succeeds we persist the server version locally and return it. If the
    // server call fails (offline or validation) fall back to local-only
    // creation and enqueue an outbox operation for later sync.
    const payload: any = {
      ...invoiceData,
      // ensure items are in the shape the API expects
      items: invoiceData.items || []
    };

    try {
      const response = await createInvoices(payload);
      const serverInv = unwrapObject<any>(response);

      if (serverInv && typeof serverInv === 'object' && serverInv.id) {
        return await this.persistServerInvoice(serverInv);
      }
    } catch (err) {
      // If server create fails, we'll create locally and enqueue outbox
      console.warn('Server create failed, falling back to local-only create:', err instanceof Error ? err.message : err);
    }

    // Fallback local-only creation
    const invoices = await this.loadInvoices();
    const calculatedItems = invoiceData.items ? this.calculateInvoice(invoiceData.items).items : [];

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceData.invoiceNumber || `2024-${(invoices.length + 1).toString().padStart(4, '0')}`,
      customerId: invoiceData.customerId,
      customerName: invoiceData.customerName,
      patientName: (invoiceData as any).patientName || invoiceData.customerName || '',
      customerTaxNumber: invoiceData.customerTaxNumber,
      customerAddress: invoiceData.customerAddress,
      items: calculatedItems,
      subtotal: invoiceData.subtotal,
      taxes: invoiceData.taxes,
      totalAmount: invoiceData.totalAmount,
      status: invoiceData.status || 'draft',
      type: invoiceData.type || 'standard',
      paymentMethod: invoiceData.paymentMethod || 'cash',
      dueDate: invoiceData.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: invoiceData.notes,
      attachments: invoiceData.attachments || [],
      currency: 'TRY'
    };

    invoices.push(newInvoice);
    await this.saveInvoices(invoices);

    // Add to outbox for sync
    await outbox.addOperation({
      method: 'POST',
      endpoint: '/api/invoices',
      data: invoiceData,
      priority: 'high',
      // include temp id so reconciler can match
      meta: { tempId: newInvoice.id }
    });

    return newInvoice;
  }

  /**
   * Create a copy of an existing invoice (draft)
   */
  async copyInvoice(id: string): Promise<Invoice> {
    const existing = await this.getInvoice(id);
    if (!existing) throw new Error('Fatura bulunamadı');

    const payload: any = {
      patientId: existing.customerId,
      customerName: existing.customerName,
      patientName: existing.patientName,
      customerTaxNumber: existing.customerTaxNumber,
      customerAddress: existing.customerAddress,
      items: existing.items?.map(it => ({ description: it.description || it.name, quantity: it.quantity, unitPrice: it.unitPrice, taxRate: it.taxRate })) || [],
      subtotal: existing.subtotal,
      taxes: existing.taxes,
      totalAmount: existing.totalAmount,
      status: 'draft',
      type: existing.type,
      paymentMethod: existing.paymentMethod,
      dueDate: existing.dueDate,
      notes: `Kopya: ${existing.invoiceNumber}\n${existing.notes || ''}`
    };

    try {
      const response = await createInvoices(payload);
      const created = unwrapObject<any>(response);

      if (created && typeof created === 'object' && created.id) {
        const invoices = await this.loadInvoices();
        invoices.unshift(created);
        await this.saveInvoices(invoices);
        return created as Invoice;
      }
    } catch (e) {
      // fallback to local create
    }

    return this.createInvoice(payload as CreateInvoiceData);
  }

  /**
   * Create a copy and a cancellation draft linked to the copy.
   */
  async copyInvoiceWithCancellation(id: string): Promise<{ copy: Invoice; cancellation: Invoice }> {
    const copy = await this.copyInvoice(id);

    const cancelPayload: any = {
      patientId: copy.customerId,
      customerName: copy.customerName,
      patientName: copy.patientName,
      customerTaxNumber: copy.customerTaxNumber,
      customerAddress: copy.customerAddress,
      items: [],
      subtotal: 0,
      taxes: [],
      totalAmount: 0,
      status: 'draft',
      type: 'cancellation',
      paymentMethod: copy.paymentMethod,
      dueDate: copy.dueDate,
      notes: `İptal taslağı (kopya için): ${copy.invoiceNumber}`
    };

    try {
      const response = await createInvoices(cancelPayload);
      const cancellation = unwrapObject<any>(response);
      if (cancellation && typeof cancellation === 'object' && cancellation.id) {
        const invoices = await this.loadInvoices();
        invoices.unshift(cancellation as Invoice);
        await this.saveInvoices(invoices);
        return { copy, cancellation: cancellation as Invoice };
      }
    } catch (e) {
      // fallback
    }

    const cancellation = await this.createInvoice(cancelPayload as CreateInvoiceData);
    return { copy, cancellation };
  }

  async updateInvoice(id: string, updates: Partial<UpdateInvoiceData>): Promise<Invoice> {
    const invoices = await this.loadInvoices();
    const index = invoices.findIndex(inv => inv.id === id);

    if (index === -1) {
      throw new Error('Fatura bulunamadı');
    }

    const existing = invoices[index];

    // If items are provided in updates, recalculate complete item fields and totals
    let items = existing.items;
    let subtotal = existing.subtotal;
    let taxes = existing.taxes;
    let totalAmount = existing.totalAmount;

    if (updates.items) {
      const calc = this.calculateInvoice(updates.items as any);
      items = calc.items as InvoiceItem[];
      subtotal = calc.subtotal;
      // Use calculated taxes if available, otherwise synthesize VAT entry from totalTax
      taxes = calc.taxes && calc.taxes.length
        ? calc.taxes
        : [{ type: 'vat', rate: 0.18, amount: calc.totalTax }];
      totalAmount = calc.grandTotal;
    }

    const updatedInvoice: Invoice = {
      ...existing,
      ...updates,
      items,
      subtotal,
      taxes,
      totalAmount,
      updatedAt: new Date().toISOString()
    };

    invoices[index] = updatedInvoice;
    await this.saveInvoices(invoices);

    // Add to outbox for sync
    await outbox.addOperation({
      method: 'PUT',
      endpoint: `/api/invoices/${id}`,
      data: { id, ...updates },
      priority: 'normal'
    });

    return updatedInvoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    // Resolve server id; if none, treat as local-only deletion and remove locally
    const serverId = await this.resolveServerId(id);
    if (!serverId) {
      const invoices = await this.loadInvoices();
      const filteredInvoices = invoices.filter(inv => inv.id !== id);
      if (filteredInvoices.length === invoices.length) {
        throw new Error('Fatura bulunamadı');
      }
      await this.saveInvoices(filteredInvoices);
      // Add to outbox for sync in case server later gets the invoice
      await outbox.addOperation({
        method: 'DELETE',
        endpoint: `/api/invoices/${encodeURIComponent(id)}`,
        priority: 'normal'
      });
      return;
    }

    try {
      await getInvoice(Number(serverId));
      // ensure local copy removed as well
      const invoices = await this.loadInvoices();
      const filtered = invoices.filter(inv => (inv.serverId ? String(inv.serverId) !== String(serverId) : inv.id !== String(serverId)));
      await this.saveInvoices(filtered);
      return;
    } catch (err) {
      // Fallback to offline/localStorage deletion when API fails
      const invoices = await this.loadInvoices();
      const filteredInvoices = invoices.filter(inv => inv.id !== id && String(inv.serverId || '') !== String(serverId));
      if (filteredInvoices.length === invoices.length) {
        throw new Error('Fatura bulunamadı');
      }
      await this.saveInvoices(filteredInvoices);
      // Add to outbox for sync
      await outbox.addOperation({
        method: 'DELETE',
        endpoint: `/api/invoices/${encodeURIComponent(String(serverId))}`,
        priority: 'normal'
      });
      return;
    }
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    const invoices = await this.loadInvoices();
    return invoices.find(inv => inv.id === id) || null;
  }

  async getInvoices(filters?: InvoiceFilters): Promise<InvoiceSearchResult> {
    try {
      // Build query params
      const params: any = {
        page: filters?.page || 1,
        limit: filters?.limit || 10,
        sort: 'createdAt',
        order: 'desc'
      };

      if (filters?.search) params.search = filters.search;
      if (filters?.status && filters.status.length > 0) params.status = filters.status.join(',');
      if (filters?.type && filters.type.length > 0) params.type = filters.type.join(',');
      if (filters?.customerId) params.customerId = filters.customerId;
      if (filters?.issueDateFrom) params.issueDateFrom = filters.issueDateFrom;
      if (filters?.issueDateTo) params.issueDateTo = filters.issueDateTo;

      // Call API using Orval-generated function
      const response = await getAdminInvoicesApiAdminInvoicesGet(params);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = response as any;

      // Handle various response shapes gracefully using unwrap helpers
      const items = unwrapArray<any>(data);
      const total = data.total ?? data.meta?.total ?? items.length;
      const page = data.page ?? data.meta?.page ?? params.page;
      const limit = data.limit ?? data.meta?.limit ?? params.limit;

      // Map server items to local Invoice type if needed
      const mappedInvoices = items.map((inv: any) => ({
        ...inv,
        id: String(inv.id), // Ensure ID is string
        serverId: inv.id,
        // Ensure critical fields exist
        items: inv.items || [],
        status: inv.status || 'draft',
        type: inv.type || 'sale'
      }));

      // Cache/Sync with local storage (optional, simple merge)
      // For v0 we just trust the server for list view, but we can update our local cache silently
      // this.syncLocalCache(mappedInvoices); // Future TODO

      return {
        invoices: mappedInvoices,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit),
        hasMore: (page * limit) < total,
        filters: filters || {}
      };

    } catch (error) {
      console.warn('Backend fetch failed, falling back to local storage:', error);

      // Fallback to Local Storage implementation
      let invoices = await this.loadInvoices();

      // Apply filters
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          invoices = invoices.filter(inv => filters.status!.includes(inv.status));
        }
        if (filters.type && filters.type.length > 0) {
          invoices = invoices.filter(inv => filters.type!.includes(inv.type as any));
        }
        if (filters.customerId) {
          invoices = invoices.filter(inv => inv.customerId === filters.customerId);
        }
        if (filters.issueDateFrom) {
          const from = new Date(filters.issueDateFrom!);
          invoices = invoices.filter(inv => inv.createdAt ? new Date(inv.createdAt) >= from : false);
        }
        if (filters.issueDateTo) {
          const to = new Date(filters.issueDateTo!);
          invoices = invoices.filter(inv => inv.createdAt ? new Date(inv.createdAt) <= to : false);
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          invoices = invoices.filter(inv =>
            inv.invoiceNumber.toLowerCase().includes(searchLower) ||
            (inv.customerName && inv.customerName.toLowerCase().includes(searchLower)) ||
            (inv.customerTaxNumber && inv.customerTaxNumber.includes(searchLower))
          );
        }
      }

      // Apply pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedInvoices = invoices.slice(startIndex, endIndex);

      return {
        invoices: paginatedInvoices,
        total: invoices.length,
        page,
        limit,
        totalPages: Math.ceil(invoices.length / limit),
        hasMore: (page * limit) < invoices.length,
        filters: filters || {}
      };
    }
  }

  async getInvoiceStats(): Promise<InvoiceStats> {
    const invoices = await this.loadInvoices();

    const stats: InvoiceStats = {
      total: invoices.length,
      draft: invoices.filter(inv => inv.status === 'draft').length,
      sent: invoices.filter(inv => inv.status === 'sent').length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      overdue: invoices.filter(inv => inv.status === 'overdue').length,
      cancelled: invoices.filter(inv => inv.status === 'cancelled').length,
      totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      paidAmount: invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      pendingAmount: invoices
        .filter(inv => ['sent', 'overdue'].includes(inv.status))
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
    };

    return stats;
  }

  // Invoice Actions
  async sendInvoice(id: string): Promise<Invoice> {
    const invoice = await this.getInvoice(id);
    if (!invoice) {
      throw new Error('Fatura bulunamadı');
    }

    if (invoice.status === 'sent') {
      throw new Error('Fatura zaten gönderilmiş');
    }

    try {
      await createInvoiceSendToGib(Number(id));
      // Try to refresh server state
      const response = await getInvoice(Number(id));
      const serverInv = unwrapObject<any>(response);
      if (serverInv && typeof serverInv === 'object' && serverInv.id) {
        // Mirror server state locally
        await this.updateInvoice(id, { status: (serverInv.status as InvoiceStatus) || 'sent' });
        return (await this.getInvoice(id)) as Invoice;
      }
      return this.updateInvoice(id, { id, status: 'sent' as InvoiceStatus, gibSentDate: new Date().toISOString() });
    } catch (err) {
      // Fallback: mark locally and enqueue outbox operation
      const updated = await this.updateInvoice(id, { id, status: 'sent' as InvoiceStatus, gibSentDate: new Date().toISOString() });
      await outbox.addOperation({ method: 'POST', endpoint: `/api/invoices/${id}/send-to-gib`, data: { invoiceId: id }, priority: 'high' });
      return updated;
    }
  }

  /**
   * Issue invoice via backend 'issue' endpoint (copy UBL to integrator outbox).
   * This is used for the explicit "Fatura Kes" action — it will NOT directly send
   * to GİB, integrator will add UUID/signature and handle submission.
   */
  async createInvoiceIssue(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
    // Ensure we have a server id before issuing — issuing requires a server-side
    // invoice record.
    try {
      const serverId = await this.resolveServerId(id);
      if (!serverId) return { success: false, error: 'Fatura henüz sunucuya gönderilmedi; önce senkronize edin.' };

      const response = await createInvoiceIssue(Number(serverId));

      if (!(response as any)?.success) {
        return { success: false, error: 'Issue failed' };
      }

      const body = response;
      // Update local invoice status to 'sent' if successful
      if (body && (body as any).success) {
        try {
          // update local copy to 'sent'
          await this.updateInvoice(id, { id, status: 'sent' as InvoiceStatus });
        } catch (e) {
          // ignore local update failures
        }
        return { success: true, data: body };
      }

      return { success: false, error: body && (body as any).data?.message ? (body as any).data.message : 'Unknown error' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async createEfaturaCancel(id: string, reason?: string): Promise<Invoice> {
    const invoice = await this.getInvoice(id);
    if (!invoice) {
      throw new Error('Fatura bulunamadı');
    }

    if (invoice.status === 'cancelled') {
      throw new Error('Fatura zaten iptal edilmiş');
    }

    return this.updateInvoice(id, {
      id,
      status: 'cancelled' as InvoiceStatus,
      notes: reason ? `${invoice.notes || ''}\nİptal nedeni: ${reason}` : invoice.notes
    });
  }

  async markAsPaid(id: string, paymentMethod?: PaymentMethod): Promise<Invoice> {
    return this.updateInvoice(id, {
      id,
      status: 'paid' as InvoiceStatus,
      paymentDate: new Date().toISOString(),
      paymentMethod
    });
  }

  // E-Fatura Operations
  async submitEFatura(submission: EFaturaSubmission): Promise<{ success: boolean; ettn?: string; error?: string }> {
    try {
      // Update invoice with GIB status
      await this.updateInvoice(submission.invoiceId, {
        id: submission.invoiceId,
        status: 'sent' as InvoiceStatus,
        ettn: submission.ettn,
        gibSentDate: new Date().toISOString()
      });

      // Add to outbox for sync
      await outbox.addOperation({
        method: 'POST',
        endpoint: '/api/invoices/efatura/submit',
        data: submission,
        priority: 'high'
      });

      return { success: true, ettn: submission.ettn };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
    }
  }

  async submitBulkEFatura(submission: EFaturaBulkSubmission): Promise<{ success: boolean; results?: any[]; error?: string }> {
    try {
      const results: Array<{ invoiceId: string; success: boolean; ettn?: string; error?: string }> = [];

      for (const invoiceId of submission.invoiceIds) {
        const result = await this.submitEFatura({
          invoiceId,
          ettn: `ETTN-${Date.now()}-${invoiceId}`,
          submissionDate: submission.submissionDate,
          status: 'pending'
        });
        results.push({ invoiceId, ...result });
      }

      return { success: true, results };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Toplu gönderim hatası' };
    }
  }

  // Template Operations
  async getTemplates(): Promise<InvoiceTemplate[]> {
    try {
      const response = await getInvoiceTemplatesApi();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = response as any;
      const templates = Array.isArray(data) ? data : (data?.data || []);
      return templates as InvoiceTemplate[];
    } catch (error) {
      console.warn('Failed to fetch templates from API:', error);
      return [];
    }
  }

  // New P1 Features
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async bulkUploadInvoices(file: File): Promise<{ processed: number; success: number; errors: any[] }> {
    try {
      const response = await bulkUploadInvoicesApi({ file });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = response as any;
      return {
        processed: result?.data?.processed || 0,
        success: result?.data?.success || 0,
        errors: result?.data?.errors || []
      };
    } catch (error) {
      console.error('Invoice bulk upload failed:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPrintQueue(): Promise<any[]> {
    try {
      const response = await getPrintQueueApi();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = response as any;
      return Array.isArray(data) ? data : (data?.data || []);
    } catch (error) {
      console.error('Failed to get print queue:', error);
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async addToPrintQueue(invoiceIds: string | string[]): Promise<any> {
    try {
      const ids = Array.isArray(invoiceIds) ? invoiceIds : [invoiceIds];
      // Convert string IDs to numbers as backend expects number[]
      const numericIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      const response = await addToPrintQueueApi({ invoiceIds: numericIds });
      return response;
    } catch (error) {
      console.error('Failed to add to print queue:', error);
      throw error;
    }
  }

  // Calculation Helpers
  calculateInvoice(items: Omit<InvoiceItem, 'id' | 'taxAmount' | 'totalPrice'>[]): InvoiceCalculation {
    let subtotal = 0;
    let totalTax = 0;

    const calculatedItems = items.map(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const taxAmount = lineTotal * (item.taxRate || 0);
      const totalPrice = lineTotal + taxAmount;

      subtotal += lineTotal;
      totalTax += taxAmount;

      return {
        ...item,
        id: `temp-${Date.now()}-${Math.random()}`,
        taxAmount,
        totalPrice
      };
    });

    return {
      items: calculatedItems,
      subtotal,
      totalTax,
      totalDiscount: 0,
      grandTotal: subtotal + totalTax,
      taxes: []
    };
  }

  // Validation
  validateInvoice(invoice: Partial<CreateInvoiceData>): InvoiceValidation {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};
    let errorIndex = 0;
    let warningIndex = 0;

    if (!invoice.customerName?.trim()) {
      errors[`error_${errorIndex++}`] = 'Müşteri adı gereklidir';
    }

    if (!invoice.items || invoice.items.length === 0) {
      errors[`error_${errorIndex++}`] = 'En az bir kalem gereklidir';
    }

    if (invoice.items) {
      invoice.items.forEach((item, index) => {
        if (!item.description?.trim()) {
          errors[`error_${errorIndex++}`] = `${index + 1}. kalem açıklaması gereklidir`;
        }
        if (!item.quantity || item.quantity <= 0) {
          errors[`error_${errorIndex++}`] = `${index + 1}. kalem miktarı geçerli olmalıdır`;
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          errors[`error_${errorIndex++}`] = `${index + 1}. kalem birim fiyatı geçerli olmalıdır`;
        }
      });
    }

    if (!invoice.dueDate) {
      warnings[`warning_${warningIndex++}`] = 'Vade tarihi belirtilmemiş';
    } else if (new Date(invoice.dueDate) < new Date()) {
      warnings[`warning_${warningIndex++}`] = 'Vade tarihi geçmişte';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  // Payment Operations
  async addPayment(invoiceId: string, payment: Omit<InvoicePayment, 'id' | 'createdAt'>): Promise<InvoicePayment> {
    const newPayment: InvoicePayment = {
      ...payment,
      id: `payment-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    // In a real app, this would be stored separately
    // For now, we'll just return the payment object
    return newPayment;
  }

  async createPaymentPlan(invoiceId: string, plan: Omit<InvoicePaymentPlan, 'id' | 'createdAt'>): Promise<InvoicePaymentPlan> {
    const newPlan: InvoicePaymentPlan = {
      ...plan,
      id: `plan-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    return newPlan;
  }

  // Export Operations
  async exportInvoices(options: InvoiceExportOptions): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.getInvoices(options.filters);

      // Mock export logic
      const exportData = {
        invoices: result.invoices,
        format: options.format,
        exportedAt: new Date().toISOString(),
        total: result.total
      };

      return { success: true, data: exportData };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Dışa aktarım hatası' };
    }
  }

  /**
   * Generate PDF for an invoice
   */
  async generateInvoicePdf(invoiceId: string): Promise<{ success: boolean; data?: Blob; error?: string }> {
    // Resolve a numeric server id for the invoice. If not available, attempt
    // to synchronously push the local invoice to the server and retry once.
    let serverId = await this.resolveServerId(invoiceId);
    if (!serverId) {
      try {
        const persisted = await this.syncInvoice(invoiceId);
        serverId = persisted.serverId || Number(persisted.id);
      } catch (syncErr) {
        // If sync fails, return a clear error (do not throw)
        const message = syncErr instanceof Error ? syncErr.message : String(syncErr);
        return { success: false, error: `Fatura sunucuya gönderilemedi: ${message}` };
      }
    }

    try {
      const response = await listInvoicePdf(Number(serverId)) as unknown as Blob;
      return { success: true, data: response };
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF oluşturulurken bir hata oluştu'
      };
    }
  }

  /**
   * Generate PDF for a sale invoice
   */
  async generateSaleInvoicePdf(saleId: string): Promise<{ success: boolean; data?: Blob; error?: string }> {
    try {
      // Endpoint doesn't exist yet. Return error for now.
      // const response = await invoicesGenerateSaleInvoicePdf(saleId) as any;
      console.warn('generateSaleInvoicePdf not implemented for saleId:', saleId);

      return {
        success: false,
        error: 'Satış faturası PDF oluşturma henüz desteklenmiyor.'
      };

      /*
      if (response instanceof Blob) {
        return {
          success: true,
          data: response
        };
      }
  
      return {
        success: false,
        error: response?.message || 'PDF verisi geçerli değil'
      };
      */
    } catch (error) {
      console.error('Error generating sale invoice PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Satış faturası PDF\'i oluşturulurken bir hata oluştu'
      };
    }
  }

  /**
   * Fetch PDF blob for invoice and return it (useful for modal preview)
   */
  async getInvoicePdfBlob(invoiceId: string): Promise<Blob | null> {
    const res = await this.generateInvoicePdf(invoiceId);
    if (res.success && res.data) return res.data as Blob;
    return null;
  }

  /**
   * Open invoice PDF in a new browser tab.
   * Uses backend PDF endpoint and opens blob URL in a new tab so the user can view/download.
   */
  async openInvoicePdfInNewTab(invoiceId: string): Promise<boolean> {
    try {
      const blob = await this.getInvoicePdfBlob(invoiceId);
      if (!blob) return false;
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Do not revoke immediately, let the browser keep it for viewing/download
      return true;
    } catch (err) {
      console.error('Failed to open invoice PDF in new tab', err);
      return false;
    }
  }

  /**
   * Download PDF as file
   */
  downloadPdfBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Open PDF in new tab for preview
   */
  previewPdfBlob(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}

export const invoiceService = new InvoiceService();