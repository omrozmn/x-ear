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

export class InvoiceService {
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
    const types: InvoiceType[] = ['standard', 'proforma', 'credit_note', 'debit_note'];
    
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
        notes: `Örnek fatura ${i} notları`
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
    const invoices = await this.loadInvoices();
    
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceData.invoiceNumber || `2024-${(invoices.length + 1).toString().padStart(4, '0')}`,
      customerId: invoiceData.customerId,
      customerName: invoiceData.customerName,
      customerTaxNumber: invoiceData.customerTaxNumber,
      customerAddress: invoiceData.customerAddress,
      items: invoiceData.items,
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
      templateId: invoiceData.templateId
    };

    invoices.push(newInvoice);
    await this.saveInvoices(invoices);

    // Add to outbox for sync
    await outbox.addOperation({
      method: 'POST',
      endpoint: '/api/invoices',
      data: invoiceData,
      priority: 'high'
    });

    return newInvoice;
  }

  async updateInvoice(id: string, updates: Partial<UpdateInvoiceData>): Promise<Invoice> {
    const invoices = await this.loadInvoices();
    const index = invoices.findIndex(inv => inv.id === id);
    
    if (index === -1) {
      throw new Error('Fatura bulunamadı');
    }

    const updatedInvoice = {
      ...invoices[index],
      ...updates,
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
    const invoices = await this.loadInvoices();
    const filteredInvoices = invoices.filter(inv => inv.id !== id);
    
    if (filteredInvoices.length === invoices.length) {
      throw new Error('Fatura bulunamadı');
    }

    await this.saveInvoices(filteredInvoices);

    // Add to outbox for sync
    await outbox.addOperation({
      method: 'DELETE',
      endpoint: `/api/invoices/${id}`,
      priority: 'normal'
    });
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    const invoices = await this.loadInvoices();
    return invoices.find(inv => inv.id === id) || null;
  }

  async getInvoices(filters?: InvoiceFilters): Promise<InvoiceSearchResult> {
    let invoices = await this.loadInvoices();

    // Apply filters
    if (filters) {
      if (filters.status) {
        invoices = invoices.filter(inv => inv.status === filters.status);
      }
      if (filters.type) {
        invoices = invoices.filter(inv => inv.type === filters.type);
      }
      if (filters.customerId) {
        invoices = invoices.filter(inv => inv.customerId === filters.customerId);
      }
      if (filters.dateFrom) {
        invoices = invoices.filter(inv => new Date(inv.createdAt) >= new Date(filters.dateFrom!));
      }
      if (filters.dateTo) {
        invoices = invoices.filter(inv => new Date(inv.createdAt) <= new Date(filters.dateTo!));
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        invoices = invoices.filter(inv => 
          inv.invoiceNumber.toLowerCase().includes(searchLower) ||
          inv.customerName.toLowerCase().includes(searchLower) ||
          inv.customerTaxNumber?.includes(searchLower)
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
      totalPages: Math.ceil(invoices.length / limit)
    };
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
      totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      paidAmount: invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.totalAmount, 0),
      pendingAmount: invoices
        .filter(inv => ['sent', 'overdue'].includes(inv.status))
        .reduce((sum, inv) => sum + inv.totalAmount, 0)
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

    return this.updateInvoice(id, {
      id,
      status: 'sent' as InvoiceStatus,
      gibSentDate: new Date().toISOString()
    });
  }

  async cancelInvoice(id: string, reason?: string): Promise<Invoice> {
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
      const results = [];
      
      for (const invoiceId of submission.invoiceIds) {
        const result = await this.submitEFatura({
          invoiceId,
          ettn: `ETTN-${Date.now()}-${invoiceId}`,
          submissionDate: submission.submissionDate
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
    // Mock templates for now
    return [
      {
        id: 'template-1',
        name: 'Standart Fatura',
        description: 'Genel kullanım için standart fatura şablonu',
        isDefault: true,
        fields: ['customerName', 'items', 'totalAmount'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'template-2',
        name: 'Proforma Fatura',
        description: 'Proforma fatura şablonu',
        isDefault: false,
        fields: ['customerName', 'items', 'totalAmount', 'validUntil'],
        createdAt: new Date().toISOString()
      }
    ];
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
      totalAmount: subtotal + totalTax
    };
  }

  // Validation
  validateInvoice(invoice: Partial<CreateInvoiceData>): InvoiceValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!invoice.customerName?.trim()) {
      errors.push('Müşteri adı gereklidir');
    }

    if (!invoice.items || invoice.items.length === 0) {
      errors.push('En az bir kalem gereklidir');
    }

    if (invoice.items) {
      invoice.items.forEach((item, index) => {
        if (!item.description?.trim()) {
          errors.push(`${index + 1}. kalem açıklaması gereklidir`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`${index + 1}. kalem miktarı geçerli olmalıdır`);
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          errors.push(`${index + 1}. kalem birim fiyatı geçerli olmalıdır`);
        }
      });
    }

    if (!invoice.dueDate) {
      warnings.push('Vade tarihi belirtilmemiş');
    } else if (new Date(invoice.dueDate) < new Date()) {
      warnings.push('Vade tarihi geçmişte');
    }

    return {
      isValid: errors.length === 0,
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
}

export const invoiceService = new InvoiceService();