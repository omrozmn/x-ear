// EFatura Data Service - JavaScript version
export class EFaturaDataService {
  constructor() {
    this.STORAGE_KEY = 'efatura_data';
    this.TEMPLATES_KEY = 'efatura_templates';
    this.initializeDefaultData();
  }

  initializeDefaultData() {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      this.createSampleInvoices();
    }
    if (!localStorage.getItem(this.TEMPLATES_KEY)) {
      this.createSampleTemplates();
    }
  }

  createSampleInvoices() {
    const sampleInvoices = [
      {
        id: '1',
        faturaNo: 'XEAR2024001',
        belgeNo: '2024001',
        tarih: '2024-01-15',
        vadeDate: '2024-02-15',
        patientId: '1',
        patientName: 'Ahmet Yılmaz',
        patientTcNo: '12345678901',
        patientAddress: 'Kadıköy, İstanbul',
        items: [
          {
            id: '1',
            malHizmet: 'İşitme Cihazı - Kulak Arkası',
            miktar: 1,
            birim: 'adet',
            birimFiyat: 8000,
            kdvOrani: 8,
            kdvTutar: 640,
            tutar: 8000,
            inventoryId: '1'
          },
          {
            id: '2',
            malHizmet: 'Kulakiçi Kalıp',
            miktar: 2,
            birim: 'adet',
            birimFiyat: 300,
            kdvOrani: 18,
            kdvTutar: 108,
            tutar: 600
          }
        ],
        toplamTutar: 8600,
        kdvTutar: 748,
        genelToplam: 9348,
        odemeYontemi: 'nakit',
        durum: 'gonderildi',
        gonderimTarihi: '2024-01-15T14:30:00',
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        ettn: 'XEAR-2024-001-001',
        aciklama: 'İşitme kaybı rehabilitasyon hizmetleri',
        createdAt: '2024-01-15T10:00:00',
        updatedAt: '2024-01-15T14:30:00'
      },
      {
        id: '2',
        faturaNo: 'XEAR2024002',
        belgeNo: '2024002',
        tarih: '2024-01-20',
        patientId: '2',
        patientName: 'Ayşe Demir',
        patientTcNo: '23456789012',
        patientAddress: 'Beyoğlu, İstanbul',
        items: [
          {
            id: '3',
            malHizmet: 'İşitme Cihazı Pili',
            miktar: 6,
            birim: 'paket',
            birimFiyat: 25,
            kdvOrani: 18,
            kdvTutar: 27,
            tutar: 150
          }
        ],
        toplamTutar: 150,
        kdvTutar: 27,
        genelToplam: 177,
        odemeYontemi: 'kart',
        durum: 'taslak',
        aciklama: 'Yedek pil temini',
        createdAt: '2024-01-20T11:15:00'
      }
    ];

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sampleInvoices));
  }

  createSampleTemplates() {
    const sampleTemplates = [
      {
        id: '1',
        name: 'İşitme Cihazı Satış Şablonu',
        description: 'Standart işitme cihazı satış faturası şablonu',
        items: [
          {
            malHizmet: 'İşitme Cihazı - Kulak Arkası',
            miktar: 1,
            birim: 'adet',
            birimFiyat: 8000,
            kdvOrani: 8
          }
        ],
        createdAt: new Date().toISOString()
      }
    ];

    localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(sampleTemplates));
  }

  getAll() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  getById(id) {
    const invoices = this.getAll();
    return invoices.find(invoice => invoice.id === id);
  }

  search(filters) {
    let invoices = this.getAll();

    if (filters.faturaNo) {
      invoices = invoices.filter(inv => 
        inv.faturaNo.toLowerCase().includes(filters.faturaNo.toLowerCase())
      );
    }

    if (filters.patientName) {
      invoices = invoices.filter(inv => 
        inv.patientName.toLowerCase().includes(filters.patientName.toLowerCase())
      );
    }

    if (filters.durum) {
      invoices = invoices.filter(inv => inv.durum === filters.durum);
    }

    if (filters.startDate) {
      invoices = invoices.filter(inv => inv.tarih >= filters.startDate);
    }

    if (filters.endDate) {
      invoices = invoices.filter(inv => inv.tarih <= filters.endDate);
    }

    return invoices;
  }

  create(data) {
    try {
      const invoices = this.getAll();
      const newInvoice = {
        ...data,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      invoices.push(newInvoice);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(invoices));

      return {
        success: true,
        data: newInvoice,
        message: 'Fatura başarıyla oluşturuldu'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Fatura oluşturulurken hata oluştu'
      };
    }
  }

  update(id, data) {
    try {
      const invoices = this.getAll();
      const index = invoices.findIndex(inv => inv.id === id);

      if (index === -1) {
        return {
          success: false,
          error: 'Fatura bulunamadı',
          message: 'Güncellenecek fatura bulunamadı'
        };
      }

      invoices[index] = {
        ...invoices[index],
        ...data,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(invoices));

      return {
        success: true,
        data: invoices[index],
        message: 'Fatura başarıyla güncellendi'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Fatura güncellenirken hata oluştu'
      };
    }
  }

  delete(id) {
    try {
      const invoices = this.getAll();
      const filteredInvoices = invoices.filter(inv => inv.id !== id);

      if (invoices.length === filteredInvoices.length) {
        return {
          success: false,
          error: 'Fatura bulunamadı',
          message: 'Silinecek fatura bulunamadı'
        };
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredInvoices));

      return {
        success: true,
        data: true,
        message: 'Fatura başarıyla silindi'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Fatura silinirken hata oluştu'
      };
    }
  }

  getTemplates() {
    const data = localStorage.getItem(this.TEMPLATES_KEY);
    return data ? JSON.parse(data) : [];
  }

  generateInvoiceNumber() {
    const invoices = this.getAll();
    const currentYear = new Date().getFullYear();
    const yearInvoices = invoices.filter(inv => 
      inv.faturaNo.includes(currentYear.toString())
    );
    
    const nextNumber = yearInvoices.length + 1;
    return `XEAR${currentYear}${nextNumber.toString().padStart(3, '0')}`;
  }

  calculateTotals(items) {
    let toplamTutar = 0;
    let kdvTutar = 0;

    items.forEach(item => {
      const itemTotal = item.miktar * item.birimFiyat;
      const itemKdv = (itemTotal * item.kdvOrani) / 100;
      
      toplamTutar += itemTotal;
      kdvTutar += itemKdv;
    });

    return {
      toplamTutar,
      kdvTutar,
      genelToplam: toplamTutar + kdvTutar
    };
  }

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  getStatistics() {
    const invoices = this.getAll();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyInvoices = invoices.filter(inv => {
      const invoiceDate = new Date(inv.tarih);
      return invoiceDate.getMonth() === currentMonth && 
             invoiceDate.getFullYear() === currentYear;
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.genelToplam || 0), 0);
    const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + (inv.genelToplam || 0), 0);

    return {
      totalInvoices: invoices.length,
      monthlyInvoices: monthlyInvoices.length,
      totalRevenue,
      monthlyRevenue,
      pendingInvoices: invoices.filter(inv => inv.durum === 'taslak').length,
      sentInvoices: invoices.filter(inv => inv.durum === 'gonderildi').length
    };
  }
}