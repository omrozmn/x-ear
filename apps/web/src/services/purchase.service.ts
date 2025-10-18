import { Purchase, PurchaseItem, PurchaseStatus, PurchaseType, PurchaseFilters, PurchaseSearchResult, CreatePurchaseData, UpdatePurchaseData, PurchaseStats, PurchaseCalculation, PurchaseValidation } from '../types/purchase';
import { outbox } from '../utils/outbox';
import { PURCHASES_DATA } from '../constants/storage-keys';

export class PurchaseService {
  // Storage methods
  private async loadPurchases(): Promise<Purchase[]> {
    try {
      const data = localStorage.getItem(PURCHASES_DATA);
      if (!data) {
        const samplePurchases = this.createSamplePurchases();
        await this.savePurchases(samplePurchases);
        return samplePurchases;
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading purchases:', error);
      return [];
    }
  }

  private async savePurchases(purchases: Purchase[]): Promise<void> {
    try {
      localStorage.setItem(PURCHASES_DATA, JSON.stringify(purchases));
    } catch (error) {
      console.error('Error saving purchases:', error);
      throw error;
    }
  }

  // Sample data creation
  private createSamplePurchases(): Purchase[] {
    return [
      {
        id: 'purchase-1',
        purchaseNumber: 'AL202401001',
        type: 'standard',
        status: 'approved',
        supplierName: 'ABC Medikal Ltd.',
        supplierTaxNumber: '1234567890',
        supplierAddress: 'İstanbul, Türkiye',
        supplierPhone: '+90 212 123 45 67',
        supplierEmail: 'info@abcmedikal.com',
        issueDate: '2024-01-15',
        dueDate: '2024-02-15',
        paymentMethod: 'Kredi Kartı',
        items: this.createSamplePurchaseItems(),
        subtotal: 8500.00,
        taxTotal: 1530.00,
        grandTotal: 10030.00,
        notes: 'Acil sipariş',
        xmlData: '<xml>sample xml data</xml>',
        xmlFileName: 'AL202401001.xml',
        xmlImportDate: '2024-01-15T10:30:00Z',
        createdAt: '2024-01-15T10:30:00Z'
      }
    ];
  }

  private createSamplePurchaseItems(): PurchaseItem[] {
    return [
      {
        id: 'item-1',
        name: 'Dijital Termometre',
        description: 'Infrared dijital termometre',
        quantity: 10,
        unitPrice: 850.00,
        taxRate: 18,
        taxAmount: 153.00,
        totalPrice: 1003.00,
        unit: 'adet',
        productCode: 'TERM001',
        barcode: '1234567890123'
      }
    ];
  }

  // CRUD Operations
  async createPurchase(data: CreatePurchaseData): Promise<Purchase> {
    try {
      // Calculate purchase items with proper IDs and totals
      const calculatedItems: PurchaseItem[] = data.items.map(item => ({
        ...item,
        id: this.generateId(),
        taxAmount: item.quantity * item.unitPrice * (item.taxRate / 100),
        totalPrice: item.quantity * item.unitPrice * (1 + item.taxRate / 100)
      }));

      // Calculate totals
      const calculation = this.calculatePurchase(calculatedItems);

      const purchase: Purchase = {
        id: this.generateId(),
        purchaseNumber: this.generatePurchaseNumber(),
        status: 'draft' as PurchaseStatus,
        type: data.type,
        supplierName: data.supplierName,
        supplierTaxNumber: data.supplierTaxNumber,
        supplierAddress: data.supplierAddress,
        supplierPhone: data.supplierPhone,
        supplierEmail: data.supplierEmail,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        paymentMethod: data.paymentMethod,
        items: calculatedItems,
        subtotal: calculation.subtotal,
        taxTotal: calculation.totalTax,
        grandTotal: calculation.totalAmount,
        notes: data.notes,
        internalNotes: data.internalNotes,
        referenceNumber: data.referenceNumber,
        orderNumber: data.orderNumber,
        xmlData: data.xmlData,
        xmlFileName: data.xmlFileName,
        xmlImportDate: data.xmlData ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString()
      };

      const purchases = await this.loadPurchases();
      purchases.push(purchase);
      await this.savePurchases(purchases);

      // Add to outbox for sync
      await outbox.addOperation({
        method: 'POST',
        endpoint: '/api/purchases',
        data: purchase
      });

      return purchase;
    } catch (error) {
      console.error('Error creating purchase:', error);
      throw error;
    }
  }

  async updatePurchase(id: string, data: UpdatePurchaseData): Promise<Purchase> {
    try {
      const purchases = await this.loadPurchases();
      const index = purchases.findIndex(p => p.id === id);
      
      if (index === -1) {
        throw new Error('Purchase not found');
      }

      // If items are being updated, calculate them properly
      let calculatedItems = purchases[index].items;
      if (data.items) {
        calculatedItems = data.items.map(item => ({
          ...item,
          id: this.generateId(),
          taxAmount: item.quantity * item.unitPrice * (item.taxRate / 100),
          totalPrice: item.quantity * item.unitPrice * (1 + item.taxRate / 100)
        }));
      }

      const updatedPurchase: Purchase = {
        ...purchases[index],
        ...data,
        items: calculatedItems,
        updatedAt: new Date().toISOString(),
        updatedBy: 'current-user'
      };

      purchases[index] = updatedPurchase;
      await this.savePurchases(purchases);

      // Add to outbox for sync
      await outbox.addOperation({
        method: 'PUT',
        endpoint: `/api/purchases/${id}`,
        data: updatedPurchase
      });

      return updatedPurchase;
    } catch (error) {
      console.error('Error updating purchase:', error);
      throw error;
    }
  }

  async deletePurchase(id: string): Promise<void> {
    try {
      const purchases = await this.loadPurchases();
      const filteredPurchases = purchases.filter(p => p.id !== id);
      await this.savePurchases(filteredPurchases);

      // Add to outbox for sync
      await outbox.addOperation({
        method: 'DELETE',
        endpoint: `/api/purchases/${id}`,
        data: { id }
      });
    } catch (error) {
      console.error('Error deleting purchase:', error);
      throw error;
    }
  }

  // Query methods
  async searchPurchases(filters: PurchaseFilters = {}): Promise<PurchaseSearchResult> {
    try {
      const purchases = await this.loadPurchases();
      let filteredPurchases = [...purchases];

      // Apply filters
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredPurchases = filteredPurchases.filter(p =>
          p.purchaseNumber.toLowerCase().includes(searchLower) ||
          p.supplierName.toLowerCase().includes(searchLower) ||
          p.notes?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.status) {
        filteredPurchases = filteredPurchases.filter(p => p.status === filters.status);
      }

      if (filters.type) {
        filteredPurchases = filteredPurchases.filter(p => p.type === filters.type);
      }

      if (filters.supplierName) {
        filteredPurchases = filteredPurchases.filter(p => 
          p.supplierName.toLowerCase().includes(filters.supplierName!.toLowerCase())
        );
      }

      if (filters.hasXmlData !== undefined) {
        filteredPurchases = filteredPurchases.filter(p => 
          filters.hasXmlData ? !!p.xmlData : !p.xmlData
        );
      }

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPurchases = filteredPurchases.slice(startIndex, endIndex);

      return {
        purchases: paginatedPurchases,
        total: filteredPurchases.length,
        totalPages: Math.ceil(filteredPurchases.length / limit),
        page,
        pageSize: limit,
        limit,
        hasMore: endIndex < filteredPurchases.length,
        filters
      };
    } catch (error) {
      console.error('Error searching purchases:', error);
      throw error;
    }
  }

  async getPurchaseById(id: string): Promise<Purchase | null> {
    try {
      const purchases = await this.loadPurchases();
      return purchases.find(p => p.id === id) || null;
    } catch (error) {
      console.error('Error getting purchase by ID:', error);
      return null;
    }
  }

  async getPurchaseStats(): Promise<PurchaseStats> {
    try {
      const purchases = await this.loadPurchases();
      
      const stats: PurchaseStats = {
        total: purchases.length,
        draft: purchases.filter(p => p.status === 'draft').length,
        sent: purchases.filter(p => p.status === 'sent').length,
        approved: purchases.filter(p => p.status === 'approved').length,
        rejected: purchases.filter(p => p.status === 'rejected').length,
        paid: purchases.filter(p => p.status === 'paid').length,
        cancelled: purchases.filter(p => p.status === 'cancelled').length,
        totalAmount: purchases.reduce((sum, p) => sum + p.grandTotal, 0),
        xmlImported: purchases.filter(p => !!p.xmlData).length
      };

      return stats;
    } catch (error) {
      console.error('Error getting purchase stats:', error);
      throw error;
    }
  }

  // XML Import
  async importFromXML(xmlData: string, fileName: string): Promise<Purchase> {
    try {
      // Parse XML and extract purchase data
      const purchaseData = this.parseXMLToPurchaseData(xmlData, fileName);
      
      // Create purchase with XML data
      const purchase = await this.createPurchase({
        ...purchaseData,
        xmlData,
        xmlFileName: fileName,
        xmlImportDate: new Date().toISOString()
      });

      return purchase;
    } catch (error) {
      console.error('Error importing from XML:', error);
      throw error;
    }
  }

  private parseXMLToPurchaseData(xmlData: string, fileName: string): CreatePurchaseData {
    // Basic XML parsing - in real implementation, use proper XML parser
    return {
      type: 'standard',
      supplierName: 'XML İçe Aktarılan Tedarikçi',
      issueDate: new Date().toISOString().split('T')[0],
      items: [
        {
          name: 'XML İçe Aktarılan Ürün',
          quantity: 1,
          unitPrice: 100,
          taxRate: 18
        }
      ]
    };
  }

  // Calculations
  calculatePurchase(items: PurchaseItem[]): PurchaseCalculation {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal + totalTax;

    return {
      items,
      subtotal,
      totalTax,
      totalAmount
    };
  }

  // Validation
  validatePurchase(data: CreatePurchaseData): PurchaseValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.supplierName?.trim()) {
      errors.push('Tedarikçi adı gereklidir');
    }

    if (!data.issueDate) {
      errors.push('Fatura tarihi gereklidir');
    }

    if (!data.items || data.items.length === 0) {
      errors.push('En az bir kalem gereklidir');
    }

    data.items?.forEach((item, index) => {
      if (!item.name?.trim()) {
        errors.push(`${index + 1}. kalem adı gereklidir`);
      }
      if (item.quantity <= 0) {
        errors.push(`${index + 1}. kalem miktarı 0'dan büyük olmalıdır`);
      }
      if (item.unitPrice <= 0) {
        errors.push(`${index + 1}. kalem birim fiyatı 0'dan büyük olmalıdır`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Utility methods
  private generateId(): string {
    return `purchase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePurchaseNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `AL${year}${month}${day}${random}`;
  }
}

export const purchaseService = new PurchaseService();