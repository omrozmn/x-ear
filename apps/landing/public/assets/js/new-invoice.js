// New Invoice Management System
import { EFaturaDataService } from './domain/efatura/data-service.js';

class NewInvoiceManager {
  constructor() {
    this.dataService = new EFaturaDataService();
    this.customers = [];
    this.products = [];
    this.currentInvoice = {
      items: [],
      totals: {
        subtotal: 0,
        totalTax: 0,
        grandTotal: 0,
        taxBreakdown: { 0: 0, 1: 0, 8: 0, 18: 0 }
      }
    };
    this.itemCounter = 1;
    
    // CRITICAL: Arrays from design-examples analysis
    this.tevkifatTipleri = [11, 15, 46, 47, 48, 61, 63];
    this.ozelMatrahTipleri = [12, 38, 62, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100];
    this.sgk = [14];
    this.ihracKayitliTipler = [13, 20, 26, 34, 51];
    this.otomatikTemelTipler = [14, 15, 35];
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeDateFields();
    this.loadInitialData();
    this.generateInvoiceNumber();
    
    // Debug: Log arrays for verification
    console.log('🔍 Conditional Logic Arrays Loaded:');
    console.log('Tevkifat types:', this.tevkifatTipleri);
    console.log('Özel Matrah types:', this.ozelMatrahTipleri); 
    console.log('SGK types:', this.sgk);
    console.log('İhraç Kayıtlı types:', this.ihracKayitliTipler);
    console.log('✅ Ready for conditional field visibility testing');
  }

  setupEventListeners() {
    // Form submission
    document.getElementById('invoiceForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.createInvoice();
    });

    // Customer search
    const customerSearch = document.getElementById('customerSearch');
    if (customerSearch) {
      customerSearch.addEventListener('input', this.debounce(() => {
        this.searchCustomers(customerSearch.value);
      }, 300));
    }

    // CRITICAL FIX: Customer type detection by input length (not dropdown)
    const customerTaxIdInput = document.getElementById('customerTaxId');
    if (customerTaxIdInput) {
      customerTaxIdInput.addEventListener('input', (e) => {
        this.handleCustomerTaxIdChange(e.target.value);
      });
    }

    // Customer type change (keep for manual changes)
    const customerTypeSelect = document.getElementById('customerType');
    if (customerTypeSelect) {
      customerTypeSelect.addEventListener('change', (e) => {
        this.handleCustomerTypeChange(e.target.value);
      });
    }

    // Scenario change (using correct ID from design-examples)
    const drpSenaryo = document.getElementById('drpSenaryo');
    if (drpSenaryo) {
      drpSenaryo.addEventListener('change', (e) => {
        this.handleScenarioChange(e.target.value);
      });
    }

    // Invoice type change (using correct ID from design-examples)  
    const drpFaturaTipi = document.getElementById('drpFaturaTipi');
    if (drpFaturaTipi) {
      drpFaturaTipi.addEventListener('change', (e) => {
        this.handleInvoiceTypeChange(e.target.value);
      });
    }

    // Series change
    const invoiceSeries = document.getElementById('invoiceSeries');
    if (invoiceSeries) {
      invoiceSeries.addEventListener('change', () => {
        this.generateInvoiceNumber();
      });
    }

    // City change
    const customerCity = document.getElementById('customerCity');
    if (customerCity) {
      customerCity.addEventListener('change', (e) => {
        this.loadDistricts(e.target.value);
      });
    }

    // Payment term change
    const paymentTerm = document.getElementById('paymentTerm');
    if (paymentTerm) {
      paymentTerm.addEventListener('change', (e) => {
        this.calculateDueDate(e.target.value);
      });
    }

    // Invoice items calculations
    document.addEventListener('input', (e) => {
      if (e.target.classList.contains('item-quantity') || 
          e.target.classList.contains('item-unit-price') || 
          e.target.classList.contains('item-tax-rate')) {
        this.calculateItemTotals(e.target.closest('tr'));
      }
    });

    // Close modals on background click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal(e.target.id);
      }
    });
  }

  // CRITICAL FIX: Customer type detection by TC/VKN length
  handleCustomerTaxIdChange(taxId) {
    const cleanTaxId = taxId.replace(/\D/g, ''); // Remove non-digits
    const customerTypeSelect = document.getElementById('customerType');
    const taxOfficeField = document.getElementById('customerTaxOffice');
    const taxIdField = document.getElementById('customerTaxId');
    
    if (cleanTaxId.length === 11) {
      // TC Kimlik No (Individual)
      if (customerTypeSelect) customerTypeSelect.value = 'bireysel';
      if (taxIdField) {
        taxIdField.placeholder = 'TC Kimlik No (11 haneli)';
        taxIdField.maxLength = 11;
      }
      if (taxOfficeField) {
        taxOfficeField.style.display = 'none';
        taxOfficeField.required = false;
      }
      this.handleCustomerTypeChange('bireysel');
    } else if (cleanTaxId.length === 10) {
      // Vergi Kimlik No (Corporate)
      if (customerTypeSelect) customerTypeSelect.value = 'kurumsal';
      if (taxIdField) {
        taxIdField.placeholder = 'Vergi Kimlik No (10 haneli)';
        taxIdField.maxLength = 10;
      }
      if (taxOfficeField) {
        taxOfficeField.style.display = 'block';
        taxOfficeField.required = true;
      }
      this.handleCustomerTypeChange('kurumsal');
    }
  }

  initializeDateFields() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    document.getElementById('invoiceDate').value = todayStr;
    
    // Initialize date pickers with Turkish locale
    flatpickr('#invoiceDate', {
      locale: 'tr',
      dateFormat: 'd.m.Y',
      defaultDate: today,
      onChange: () => this.calculateDueDate()
    });
    
    flatpickr('#dueDate', {
      locale: 'tr',
      dateFormat: 'd.m.Y'
    });
  }

  async loadInitialData() {
    try {
      // Load customers, products, cities etc.
      await Promise.all([
        this.loadCustomers(),
        this.loadProducts(),
        this.loadCities()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.showNotification('Veriler yüklenirken hata oluştu', 'error');
    }
  }

  async loadCustomers() {
    try {
      // Mock data - replace with actual API call
      this.customers = [
        {
          id: 1,
          name: 'Ahmet Yılmaz',
          taxId: '12345678901',
          type: 'bireysel',
          email: 'ahmet@example.com',
          phone: '0532 123 45 67',
          city: 'ANKARA',
          district: 'ÇANKAYA',
          address: 'Atatürk Cad. No:123',
          taxOffice: 'Çankaya VD'
        },
        {
          id: 2,
          name: 'Sosyal Güvenlik Kurumu',
          taxId: '7750409379',
          type: 'kurumsal',
          email: 'sgk@sgk.gov.tr',
          phone: '0312 555 00 00',
          city: 'ANKARA',
          district: 'ALTINDAĞ',
          address: 'Söğütözü Mah. 2176. Sokak No:1',
          taxOffice: 'Ankara VD'
        }
      ];
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }

  async loadProducts() {
    try {
      // Mock data - replace with actual API call
      this.products = [
        { id: 1, name: 'İşitme Cihazı Bakımı', price: 850, taxRate: 18, unit: 'Adet' },
        { id: 2, name: 'İşitme Testi', price: 150, taxRate: 18, unit: 'Adet' },
        { id: 3, name: 'Kulak Kalıbı', price: 250, taxRate: 18, unit: 'Adet' }
      ];
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  async loadCities() {
    const cities = [
      'ADANA', 'ADIYAMAN', 'AFYONKARAHİSAR', 'AĞRI', 'AMASYA', 'ANKARA', 
      'ANTALYA', 'ARTVİN', 'AYDIN', 'BALIKESİR', 'BİLECİK', 'BİNGÖL',
      'BİTLİS', 'BOLU', 'BURDUR', 'BURSA', 'ÇANAKKALE', 'ÇANKIRI',
      'ÇORUM', 'DENİZLİ', 'DİYARBAKIR', 'EDİRNE', 'ELAZIĞ', 'ERZİNCAN',
      'ERZURUM', 'ESKİŞEHİR', 'GAZİANTEP', 'GİRESUN', 'GÜMÜŞHANE',
      'HAKKARİ', 'HATAY', 'ISPARTA', 'MERSİN', 'İSTANBUL', 'İZMİR',
      'KARS', 'KASTAMONU', 'KAYSERİ', 'KIRKLARELİ', 'KIRŞEHİR',
      'KOCAELİ', 'KONYA', 'KÜTAHYA', 'MALATYA', 'MANİSA', 'KAHRAMANMARAŞ',
      'MARDİN', 'MUĞLA', 'MUŞ', 'NEVŞEHİR', 'NİĞDE', 'ORDU',
      'RİZE', 'SAKARYA', 'SAMSUN', 'SİİRT', 'SİNOP', 'SİVAS',
      'TEKİRDAĞ', 'TOKAT', 'TRABZON', 'TUNCELİ', 'ŞANLIURFA',
      'UŞAK', 'VAN', 'YOZGAT', 'ZONGULDAK', 'AKSARAY', 'BAYBURT',
      'KARAMAN', 'KIRIKKALE', 'BATMAN', 'ŞIRNAK', 'BARTIN', 'ARDAHAN',
      'IĞDIR', 'YALOVA', 'KARABÜK', 'KİLİS', 'OSMANİYE', 'DÜZCE'
    ];
    
    const citySelect = document.getElementById('customerCity');
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      citySelect.appendChild(option);
    });
  }

  searchCustomers(query) {
    if (query.length < 2) {
      this.hideCustomerSuggestions();
      return;
    }

    const filtered = this.customers.filter(customer => 
      customer.name.toLowerCase().includes(query.toLowerCase()) ||
      customer.taxId.includes(query) ||
      (customer.email && customer.email.toLowerCase().includes(query.toLowerCase()))
    );

    this.showCustomerSuggestions(filtered);
  }

  showCustomerSuggestions(customers) {
    const suggestions = document.getElementById('customerSuggestions');
    suggestions.innerHTML = '';

    customers.forEach(customer => {
      const div = document.createElement('div');
      div.className = 'customer-suggestion';
      div.innerHTML = `
        <strong>${customer.name}</strong><br>
        <small>${customer.taxId} - ${customer.type === 'bireysel' ? 'Bireysel' : 'Kurumsal'}</small>
      `;
      div.onclick = () => this.selectCustomer(customer);
      suggestions.appendChild(div);
    });

    suggestions.style.display = customers.length > 0 ? 'block' : 'none';
  }

  hideCustomerSuggestions() {
    document.getElementById('customerSuggestions').style.display = 'none';
  }

  selectCustomer(customer) {
    document.getElementById('customerSearch').value = customer.name;
    document.getElementById('customerType').value = customer.type;
    document.getElementById('customerTaxId').value = customer.taxId;
    document.getElementById('customerName').value = customer.name;
    document.getElementById('customerEmail').value = customer.email || '';
    document.getElementById('customerPhone').value = customer.phone || '';
    document.getElementById('customerCity').value = customer.city || '';
    document.getElementById('customerAddress').value = customer.address || '';
    document.getElementById('customerTaxOffice').value = customer.taxOffice || '';
    
    if (customer.city) {
      this.loadDistricts(customer.city).then(() => {
        document.getElementById('customerDistrict').value = customer.district || '';
      });
    }

    this.hideCustomerSuggestions();
    this.handleCustomerTypeChange(customer.type);
  }

  handleCustomerTypeChange(type) {
    const taxIdField = document.getElementById('customerTaxId');
    const taxOfficeField = document.getElementById('customerTaxOffice');
    
    if (type === 'bireysel') {
      taxIdField.placeholder = 'TC Kimlik No (11 haneli)';
      taxIdField.maxLength = 11;
      taxOfficeField.style.display = 'none';
    } else {
      taxIdField.placeholder = 'Vergi Kimlik No (10 haneli)';
      taxIdField.maxLength = 10;
      taxOfficeField.style.display = 'block';
    }
  }

  handleScenarioChange(scenarioValue) {
    console.log('Scenario changed to:', scenarioValue);
    
    // Universal reset when any scenario selected (matching design-examples)
    this.resetAllConditionalFields();
    
    // Show relevant sections based on scenario
    switch(scenarioValue) {
      case '36': // Diğer - Shows SGK option in invoice type
        this.showElement('#divMevcutSenaryo');
        this.setElementValue('#drpParaBirimi', '1');
        this.enableSGKInvoiceType();
        break;
        
      case '5': // İhracat
        this.setFlag('#hdnIhracatMi', true);
        this.showElements(['.IhracatDetay', '#btnIhracatDetay']);
        this.hideElements(['#btnIhracKayitli', '.IhracKayitliDetay']);
        this.showElement('#btnDonemBilgisi');
        break;
        
      case '7': // Kamu
        this.showElement('#kamuOdemeYapacakAlici');
        this.hideElements(['#btnOdemeBilgisi', '#OdemeBilgisiKapat']);
        this.setElementValue('#drpParaBirimi', '1');
        this.setElementValue('#drpOdemeParaBirimi', '1');
        this.showElement('#btnDonemBilgisi');
        break;
        
      case '45': // İlaç ve Tıbbi Cihaz
        this.setFlag('#hdnIlacTibbiCihazMi', true);
        this.showElements(['.IlacTibbiCihazDetay', '#tdIlacTibbiCihazMi']);
        break;
        
      default:
        // Default scenario handling
        break;
    }
  }

  handleInvoiceTypeChange(typeValue) {
    console.log('Invoice type changed to:', typeValue);
    const typeNum = parseInt(typeValue);
    
    // Universal reset for invoice type change
    this.resetInvoiceTypeFields();
    
    // CRITICAL FIX: Use correct array membership checks
    if (this.tevkifatTipleri.includes(typeNum)) {
      // Tevkifat invoice types
      this.showElements(['.tevkifat', '.kdv']);
      this.hideElements(['#OzelMatrahBilgisi', '.ozelMatrah', '.iade-kdvler', '.tevkifat-iade']);
      console.log('Showing tevkifat fields for type:', typeNum);
      
    } else if (this.ozelMatrahTipleri.includes(typeNum)) {
      // Özel Matrah invoice types
      this.showElements(['#btnOzelMatrahBilgisi', '.ozelMatrah', '.kdv']);
      this.hideElements(['.tevkifat', '.iade-kdvler', '.tevkifat-iade']);
      console.log('Showing özel matrah fields for type:', typeNum);
      
    } else if (this.sgk.includes(typeNum)) {
      // SGK invoice types - CUSTOMER SWAP
      this.performSGKCustomerSwap();
      this.showElements(['#txtSGKAlici', '#SGKFaturasiBilgisi', '#btnDonemBilgisi', '#btnOdenecekTutarDuzenle']);
      this.hideElements(['#txtFaturaMusteri', '#divFaturaAdresler', '#btnYeniMusteriEkleManuelEFatura']);
      this.setElementValue('#drpParaBirimi', '1');
      this.setFlag('#btnSGKFaturasiBilgisiHdn', true);
      this.setFlag('#hdnMusteriID1', 0);
      console.log('Showing SGK fields and swapping customer for type:', typeNum);
      
    } else if (typeNum === 15 || typeNum === 49) {
      // CRITICAL FIX: Refund logic (AND not OR)
      this.showElements(['#btnIadeBilgisi', '#IadeBilgisi', '.tevkifat-iade', '.iade-kdvler']);
      this.hideElements(['.kdv']);
      this.setElementValue('.kdv select', 0);
      console.log('Showing refund fields for type:', typeNum);
      
    } else if (typeNum === 50) {
      // Type 50 refund (different handling)
      this.showElements(['#btnIadeBilgisi', '#IadeBilgisi', '.kdv']);
      this.hideElements(['.tevkifat-iade', '.iade-kdvler']);
      console.log('Showing type 50 refund fields');
      
    } else if (typeNum === 31) {
      // Government exception
      this.showElement('#divKamuIstinaSebep');
      this.callFunction('DropDoldurKamuFaturasi', ['drpKamuIstisnaFaturaSebep', 1]);
      console.log('Showing government exception fields');
      
    } else if (this.ihracKayitliTipler.includes(typeNum)) {
      // Export registered types
      this.showElement('#divKamuIhracKayitliSebep');
      this.callFunction('DropDoldurKamuFaturasi', ['drpIhracKayitliFaturaSebep', 3]);
      console.log('Showing export registered fields for type:', typeNum);
      
    } else if (typeNum === 35) {
      // Technology support
      this.setFlag('#hdnTeknolojiDestekMi', true);
      this.showElements(['.TeknolojiDestekDetay', '#tdIteknolojiDestekMi']);
      console.log('Showing technology support fields');
      
    } else {
      // Default/standard invoice type
      this.showElements(['.kdv']);
      this.hideElements(['#divKamuIstinaSebep', '#divKamuIhracKayitliSebep', '#btnIadeBilgisi', '#IadeBilgisi', '.tevkifat-iade', '.iade-kdvler']);
      this.setFlag('#hdnIhracKayitliMi', false);
      console.log('Showing standard fields for type:', typeNum);
    }
  }

  // CRITICAL: SGK Customer Swap Logic
  performSGKCustomerSwap() {
    const sgkDiv = document.getElementById('sgkCustomerDiv');
    const regularDiv = document.getElementById('customerSearch')?.parentElement;
    const sgkInput = document.getElementById('txtSGKAlici');
    
    if (sgkDiv) sgkDiv.style.display = 'block';
    if (regularDiv) regularDiv.style.display = 'none';
    
    // Fill SGK customer data exactly like design-examples
    if (sgkInput) {
      sgkInput.value = 'Sosyal Güvenlik Kurumu - 7750409379 Çankaya/ ANKARA - TÜRKİYE V.D ÇANKAYA VERGİ DAİRESİ (6257)';
    }
    
    console.log('SGK customer swap completed');
  }

  // Universal reset function matching design-examples
  resetAllConditionalFields() {
    this.hideElements([
      '#kamuOdemeYapacakAlici',
      '#divKamuIhracKayitliSebep',
      '#SGKFaturasiBilgisi',
      '.tevkifat',
      '#ozelMatrah',
      '#btnOzelMatrahBilgisi',
      '#btnIadeBilgisi',
      '#IadeBilgisi',
      '.tevkifat-iade',
      '.iade-kdvler'
    ]);
    
    this.showElements([
      '#btnOdemeBilgisi', 
      '#OdemeBilgisiKapat',
      '#txtFaturaMusteri'
    ]);
    
    this.hideElement('#txtSGKAlici');
    
    // Show regular customer, hide SGK customer
    const sgkDiv = document.getElementById('sgkCustomerDiv');
    const regularDiv = document.getElementById('customerSearch')?.parentElement;
    if (sgkDiv) sgkDiv.style.display = 'none';
    if (regularDiv) regularDiv.style.display = 'block';
  }

  resetInvoiceTypeFields() {
    // Reset all invoice-type specific fields
    this.hideElements([
      '#divKamuIstinaSebep',
      '#divKamuIhracKayitliSebep', 
      '#btnIadeBilgisi',
      '#IadeBilgisi',
      '.tevkifat-iade',
      '.iade-kdvler',
      '.tevkifat',
      '.ozelMatrah',
      '#btnOzelMatrahBilgisi'
    ]);
    
    this.showElements(['.kdv']);
  }

  // Utility functions for DOM manipulation
  showElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = 'block';
    }
  }

  hideElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = 'none';
    }
  }

  showElements(selectors) {
    selectors.forEach(selector => this.showElement(selector));
  }

  hideElements(selectors) {
    selectors.forEach(selector => this.hideElement(selector));
  }

  setElementValue(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.value = value;
    }
  }

  setFlag(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.value = value;
      // Also set as data attribute for reference
      element.setAttribute('data-flag', value);
    }
  }

  callFunction(functionName, args = []) {
    // For calling external functions like DropDoldurKamuFaturasi
    if (typeof window[functionName] === 'function') {
      window[functionName](...args);
    } else {
      console.warn(`Function ${functionName} not found`);
    }
  }

  showSGKCustomer() {
    // Show SGK customer field and hide regular customer search
    const sgkDiv = document.getElementById('sgkCustomerDiv');
    const regularSearch = document.getElementById('customerSearch');
    
    if (sgkDiv && regularSearch) {
      sgkDiv.style.display = 'block';
      regularSearch.parentElement.style.display = 'none';
      
      // Fill SGK customer data
      const sgkInput = document.getElementById('txtSGKAlici');
      if (sgkInput) {
        sgkInput.value = 'Sosyal Güvenlik Kurumu - 7750409379 Çankaya/ ANKARA - TÜRKİYE V.D ÇANKAYA VERGİ DAİRESİ (6257)';
      }
    }
  }

  showRegularCustomer() {
    // Show regular customer search and hide SGK field
    const sgkDiv = document.getElementById('sgkCustomerDiv');
    const regularSearch = document.getElementById('customerSearch');
    
    if (sgkDiv && regularSearch) {
      sgkDiv.style.display = 'none';
      regularSearch.parentElement.style.display = 'block';
    }
  }

  hideAllCustomerFields() {
    this.showRegularCustomer(); // Default to regular customer
  }

  enableSGKInvoiceType() {
    // This makes SGK option available in invoice type dropdown
    // In real implementation, this would populate the dropdown dynamically
    console.log('SGK option enabled in invoice type');
  }

  showExportFields() {
    console.log('Showing export fields');
    // Show export-specific fields
  }

  showGovernmentFields() {
    console.log('Showing government fields');
    // Show government-specific fields
  }

  showMedicalFields() {
    console.log('Showing medical fields');
    // Show medical device specific fields
  }

  showTevkifatFields() {
    console.log('Showing tevkifat fields');
    // Show tevkifat specific fields
  }

  showSpecialTaxFields() {
    console.log('Showing special tax fields');
    // Show special tax fields
  }

  hideAllSpecialSections() {
    const sections = [
      'tevkifat-fields',
      'ozel-matrah-fields', 
      'sgk-fields',
      'ihracat-fields',
      'government-fields'
    ];
    
    sections.forEach(sectionClass => {
      this.hideSection(sectionClass);
    });
    
    // Hide all conditional buttons
    const buttons = [
      'btnOzelMatrahBilgisi',
      'btnIadeBilgisi', 
      'btnDonemBilgisi'
    ];
    
    buttons.forEach(buttonId => {
      this.hideButton(buttonId);
    });
  }

  showSection(className) {
    const elements = document.getElementsByClassName(className);
    for (let element of elements) {
      element.classList.add('visible');
    }
  }

  hideSection(className) {
    const elements = document.getElementsByClassName(className);
    for (let element of elements) {
      element.classList.remove('visible');
    }
  }

  showButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.style.display = 'block';
    }
  }

  hideButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.style.display = 'none';
    }
  }

  async loadDistricts(cityName) {
    // Mock districts data - replace with actual API call
    const districts = {
      'ANKARA': ['ALTINDAĞ', 'AKYURT', 'AYAŞ', 'BALA', 'BEYPAZARI', 'ÇAMLIDERENRE', 'ÇANKAYA', 'ÇUBUK', 'ELMADAĞ', 'ETIMESGUT', 'EVREN', 'GÖLBAŞI', 'GÜDÜL', 'HAYMANA', 'KAHRAMANKAZAN', 'KALECIK', 'KEÇIÖREN', 'KIZILCAHAMAM', 'MAMAK', 'NALLIHAN', 'POLATLԻ', 'PURSAKLAR', 'SİNCAN', 'ŞEREFLİKOÇHİSAR', 'YENİMAHALLE'],
      'İSTANBUL': ['ADALAR', 'ARNAVUTKÖY', 'ATAŞEHİR', 'AVCILAR', 'BAĞCILAR', 'BAHÇELİEVLER', 'BAKIRKÖY', 'BEŞİKTAŞ', 'BEYKOZ', 'BEYLİKDÜZÜ', 'BEYOĞLU', 'BÜYÜKÇEKMECE', 'ÇATALCA', 'ÇEKMEKÖY', 'ESENLER', 'ESENYURT', 'EYÜPSULTAN', 'FATİH', 'GAZİOSMANPAŞA', 'GÜNGÖREN', 'KADИKÖY', 'KAĞITHANE', 'KARTAL', 'KÜÇÜKÇEKMECE', 'MALTEPE', 'PENDİK', 'SANCAKTEPE', 'SARIYERч', 'SİLİVRİ', 'SULTANBEYLİ', 'SULTANGAZİ', 'ŞİLE', 'ŞİŞLİ', 'TUZLA', 'ÜMRANİYE', 'ÜSKÜDAR', 'ZEYTİNBURNU'],
      'İZMİR': ['ALİAĞA', 'BALÇOVA', 'BAYINDIR', 'BAYRAKLI', 'BERGAMA', 'BEYDAĞ', 'BORNOVA', 'BUCA', 'ÇEŞME', 'ÇIĞLI', 'DİKİLİ', 'FOÇA', 'GAZİEMİR', 'GÜZELBAHÇE', 'KARABAĞLAR', 'KARABURUN', 'KARŞIYAKA', 'KEMALPAŞA', 'KINIK', 'KİRAZ', 'KONAK', 'MENDERES', 'MENEMEN', 'NARLІDERE', 'ÖDEMİŞ', 'SEFERİHİSAR', 'SELÇUK', 'TİRE', 'TORBALI', 'URLA']
    };

    const districtSelect = document.getElementById('customerDistrict');
    districtSelect.innerHTML = '<option value="">Seçiniz</option>';

    const cityDistricts = districts[cityName] || [];
    cityDistricts.forEach(district => {
      const option = document.createElement('option');
      option.value = district;
      option.textContent = district;
      districtSelect.appendChild(option);
    });
  }

  generateInvoiceNumber() {
    const series = document.getElementById('invoiceSeries').value;
    if (!series) return;

    // Generate next number based on series
    const year = new Date().getFullYear();
    const nextNumber = this.getNextInvoiceNumber(series, year);
    document.getElementById('invoiceNumber').value = `${series}${year}${nextNumber.toString().padStart(6, '0')}`;
  }

  getNextInvoiceNumber(series, year) {
    // Mock - in real app, this would query the database
    const mockCounters = {
      'EAR': 1,
      'ISM': 1,
      'SRV': 1
    };
    return mockCounters[series] || 1;
  }

  calculateDueDate(termDays = null) {
    const invoiceDate = new Date(document.getElementById('invoiceDate').value);
    const paymentTerm = termDays || parseInt(document.getElementById('paymentTerm').value) || 0;
    
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + paymentTerm);
    
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
  }

  addInvoiceItem() {
    this.itemCounter++;
    const tbody = document.getElementById('invoiceItemsBody');
    
    const row = document.createElement('tr');
    row.dataset.row = this.itemCounter;
    row.innerHTML = `
      <td>${this.itemCounter}</td>
      <td>
        <input type="text" name="items[${this.itemCounter}][description]" class="item-description" 
               placeholder="Ürün/hizmet açıklaması" required>
      </td>
      <td>
        <input type="number" name="items[${this.itemCounter}][quantity]" class="item-quantity" 
               min="0" step="0.01" value="1" required>
      </td>
      <td>
        <select name="items[${this.itemCounter}][unit]" class="item-unit">
          <option value="Adet">Adet</option>
          <option value="Kg">Kg</option>
          <option value="Lt">Lt</option>
          <option value="M">M</option>
          <option value="M2">M²</option>
          <option value="Saat">Saat</option>
          <option value="Gün">Gün</option>
        </select>
      </td>
      <td>
        <input type="number" name="items[${this.itemCounter}][unitPrice]" class="item-unit-price" 
               min="0" step="0.01" placeholder="0,00" required>
      </td>
      <td>
        <select name="items[${this.itemCounter}][taxRate]" class="item-tax-rate">
          <option value="0">%0</option>
          <option value="1">%1</option>
          <option value="8">%8</option>
          <option value="18" selected>%18</option>
        </select>
      </td>
      <td class="item-subtotal">₺0,00</td>
      <td class="item-tax-amount">₺0,00</td>
      <td class="item-total">₺0,00</td>
      <td>
        <button type="button" class="btn btn-xs btn-danger remove-item" onclick="removeInvoiceItem(${this.itemCounter})">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  }

  removeInvoiceItem(rowNumber) {
    const row = document.querySelector(`tr[data-row="${rowNumber}"]`);
    if (row) {
      row.remove();
      this.recalculateTotals();
      this.renumberItems();
    }
  }

  renumberItems() {
    const rows = document.querySelectorAll('#invoiceItemsBody tr');
    rows.forEach((row, index) => {
      const numberCell = row.querySelector('td:first-child');
      numberCell.textContent = index + 1;
      row.dataset.row = index + 1;
    });
    this.itemCounter = rows.length;
  }

  calculateItemTotals(row) {
    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
    const unitPrice = parseFloat(row.querySelector('.item-unit-price').value) || 0;
    const taxRate = parseFloat(row.querySelector('.item-tax-rate').value) || 0;
    
    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    
    row.querySelector('.item-subtotal').textContent = this.formatCurrency(subtotal);
    row.querySelector('.item-tax-amount').textContent = this.formatCurrency(taxAmount);
    row.querySelector('.item-total').textContent = this.formatCurrency(total);
    
    this.recalculateTotals();
  }

  recalculateTotals() {
    let subtotal = 0;
    let totalTax = 0;
    const taxBreakdown = { 0: 0, 1: 0, 8: 0, 18: 0 };
    
    document.querySelectorAll('#invoiceItemsBody tr').forEach(row => {
      const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
      const unitPrice = parseFloat(row.querySelector('.item-unit-price').value) || 0;
      const taxRate = parseFloat(row.querySelector('.item-tax-rate').value) || 0;
      
      const itemSubtotal = quantity * unitPrice;
      const itemTax = itemSubtotal * (taxRate / 100);
      
      subtotal += itemSubtotal;
      totalTax += itemTax;
      taxBreakdown[taxRate] += itemTax;
    });
    
    const grandTotal = subtotal + totalTax;
    
    // Update display
    document.getElementById('subtotalAmount').textContent = this.formatCurrency(subtotal);
    document.getElementById('tax0Amount').textContent = this.formatCurrency(taxBreakdown[0]);
    document.getElementById('tax1Amount').textContent = this.formatCurrency(taxBreakdown[1]);
    document.getElementById('tax8Amount').textContent = this.formatCurrency(taxBreakdown[8]);
    document.getElementById('tax18Amount').textContent = this.formatCurrency(taxBreakdown[18]);
    document.getElementById('totalTaxAmount').textContent = this.formatCurrency(totalTax);
    document.getElementById('grandTotalAmount').textContent = this.formatCurrency(grandTotal);
    
    // Update current invoice object
    this.currentInvoice.totals = {
      subtotal,
      totalTax,
      grandTotal,
      taxBreakdown
    };
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  }

  previewInvoice() {
    const formData = this.collectFormData();
    if (!this.validateForm(formData)) return;
    
    this.generatePreviewContent(formData);
    document.getElementById('previewModal').style.display = 'block';
  }

  generatePreviewContent(formData) {
    const content = document.getElementById('previewContent');
    content.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2>X-EAR İŞİTME MERKEZİ</h2>
          <p>İşitme Cihazları Satış ve Teknik Servisi</p>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <strong>FATURA BİLGİLERİ</strong><br>
            Fatura No: ${formData.invoiceNumber}<br>
            Tarih: ${formData.invoiceDate}<br>
            Vade: ${formData.dueDate}<br>
            Tip: ${this.getInvoiceTypeText(formData.invoiceType)}
          </div>
          <div>
            <strong>MÜŞTERİ BİLGİLERİ</strong><br>
            ${formData.customerName}<br>
            ${formData.customerTaxId}<br>
            ${formData.customerAddress}<br>
            ${formData.customerCity} / ${formData.customerDistrict}
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Açıklama</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Miktar</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Birim Fiyat</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">KDV %</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Toplam</th>
            </tr>
          </thead>
          <tbody>
            ${this.generatePreviewItems()}
          </tbody>
        </table>
        
        <div style="text-align: right;">
          <p>Ara Toplam: ${this.formatCurrency(this.currentInvoice.totals.subtotal)}</p>
          <p>KDV: ${this.formatCurrency(this.currentInvoice.totals.totalTax)}</p>
          <p><strong>GENEL TOPLAM: ${this.formatCurrency(this.currentInvoice.totals.grandTotal)}</strong></p>
        </div>
        
        ${formData.invoiceNotes ? `<div style="margin-top: 20px;"><strong>Notlar:</strong><br>${formData.invoiceNotes}</div>` : ''}
      </div>
    `;
  }

  generatePreviewItems() {
    let html = '';
    document.querySelectorAll('#invoiceItemsBody tr').forEach(row => {
      const description = row.querySelector('.item-description').value;
      const quantity = row.querySelector('.item-quantity').value;
      const unitPrice = row.querySelector('.item-unit-price').value;
      const taxRate = row.querySelector('.item-tax-rate').value;
      const total = row.querySelector('.item-total').textContent;
      
      if (description && quantity && unitPrice) {
        html += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${description}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${quantity}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(parseFloat(unitPrice))}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">%${taxRate}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${total}</td>
          </tr>
        `;
      }
    });
    return html;
  }

  getInvoiceTypeText(type) {
    const types = {
      'satis': 'Satış Faturası',
      'iade': 'İade Faturası',
      'istisna': 'İstisna Faturası',
      'tevkifat': 'Tevkifat Faturası',
      'ozelmatrah': 'Özel Matrah',
      'ihrac': 'İhraç Kayıtlı'
    };
    return types[type] || type;
  }

  collectFormData() {
    const form = document.getElementById('invoiceForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Collect items
    data.items = [];
    document.querySelectorAll('#invoiceItemsBody tr').forEach(row => {
      const description = row.querySelector('.item-description').value;
      const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
      const unitPrice = parseFloat(row.querySelector('.item-unit-price').value) || 0;
      
      if (description && quantity > 0 && unitPrice > 0) {
        data.items.push({
          description,
          quantity,
          unitPrice,
          unit: row.querySelector('.item-unit').value,
          taxRate: parseFloat(row.querySelector('.item-tax-rate').value)
        });
      }
    });
    
    return data;
  }

  validateForm(data) {
    const errors = [];
    
    // Required fields validation
    if (!data.invoiceType) errors.push('Fatura tipi seçiniz');
    if (!data.invoiceSeries) errors.push('Fatura serisi seçiniz');
    if (!data.invoiceDate) errors.push('Fatura tarihi giriniz');
    if (!data.customerName) errors.push('Müşteri adı giriniz');
    if (!data.customerTaxId) errors.push('TC/VKN giriniz');
    if (data.items.length === 0) errors.push('En az bir kalem ekleyiniz');
    
    // TC/VKN validation
    if (data.customerTaxId) {
      const taxId = data.customerTaxId.replace(/\D/g, '');
      if (data.customerType === 'bireysel' && taxId.length !== 11) {
        errors.push('TC Kimlik No 11 haneli olmalıdır');
      } else if (data.customerType === 'kurumsal' && taxId.length !== 10) {
        errors.push('Vergi Kimlik No 10 haneli olmalıdır');
      }
    }
    
    if (errors.length > 0) {
      this.showNotification(errors.join('<br>'), 'error');
      return false;
    }
    
    return true;
  }

  async createInvoice() {
    const formData = this.collectFormData();
    if (!this.validateForm(formData)) return;
    
    this.showLoading(true);
    
    try {
      // Prepare invoice data
      const invoiceData = {
        ...formData,
        totals: this.currentInvoice.totals,
        createdAt: new Date().toISOString(),
        status: 'draft'
      };
      
      // Save invoice
      const result = await this.dataService.createInvoice(invoiceData);
      
      this.showLoading(false);
      this.showNotification('Fatura başarıyla oluşturuldu!', 'success');
      
      // Handle post-creation actions
      if (document.getElementById('sendEmail').checked) {
        await this.sendInvoiceEmail(result.id);
      }
      
      if (document.getElementById('printAfterCreate').checked) {
        this.printInvoice(result.id);
      }
      
      // Redirect to invoice list or view
      setTimeout(() => {
        window.location.href = `invoices.html?view=${result.id}`;
      }, 2000);
      
    } catch (error) {
      this.showLoading(false);
      console.error('Error creating invoice:', error);
      this.showNotification('Fatura oluşturulurken hata oluştu', 'error');
    }
  }

  async saveAsDraft() {
    const formData = this.collectFormData();
    
    // Basic validation for draft
    if (!formData.invoiceType || !formData.invoiceSeries) {
      this.showNotification('Fatura tipi ve serisi seçilmelidir', 'error');
      return;
    }
    
    this.showLoading(true);
    
    try {
      const draftData = {
        ...formData,
        totals: this.currentInvoice.totals,
        status: 'draft',
        createdAt: new Date().toISOString()
      };
      
      await this.dataService.saveDraft(draftData);
      
      this.showLoading(false);
      this.showNotification('Taslak kaydedildi!', 'success');
      
    } catch (error) {
      this.showLoading(false);
      console.error('Error saving draft:', error);
      this.showNotification('Taslak kaydedilirken hata oluştu', 'error');
    }
  }

  resetForm() {
    if (confirm('Formdaki tüm veriler silinecek. Devam etmek istiyor musunuz?')) {
      document.getElementById('invoiceForm').reset();
      document.getElementById('invoiceItemsBody').innerHTML = '';
      this.itemCounter = 0;
      this.addInvoiceItem();
      this.initializeDateFields();
      this.generateInvoiceNumber();
      this.recalculateTotals();
    }
  }

  closePreview() {
    document.getElementById('previewModal').style.display = 'none';
  }

  printPreview() {
    const content = document.getElementById('previewContent').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Fatura Önizleme</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  createFromPreview() {
    this.closePreview();
    this.createInvoice();
  }

  showLoading(show = true) {
    document.getElementById('loadingModal').style.display = show ? 'block' : 'none';
  }

  showNotification(message, type = 'info') {
    // Create or update notification
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        color: white;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      document.body.appendChild(notification);
    }
    
    // Set colors based on type
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
      </div>
    `;
    
    notification.style.display = 'block';
    notification.style.opacity = '1';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        notification.style.display = 'none';
      }, 300);
    }, 5000);
  }

  closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Global toggle function for collapsible sections
window.toggleSection = function(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.toggle('visible');
  }
}

// Global function for Internet sales toggle
window.toggleInternetSalesDetails = function() {
  const internetSalesType = document.getElementById('internetSalesType');
  const detailsDiv = document.getElementById('internetSalesDetails');
  
  if (internetSalesType && detailsDiv) {
    const selectedValue = internetSalesType.value;
    
    if (selectedValue && selectedValue !== '') {
      detailsDiv.style.display = 'block';
      
      // Handle specific internet sales scenarios
      switch(selectedValue) {
        case 'site':
          // Show website specific fields
          break;
        case 'eticaret':
          // Show e-commerce platform fields  
          break;
        case 'pazaryeri':
          // Show marketplace fields
          break;
      }
    } else {
      detailsDiv.style.display = 'none';
    }
  }
}

// Global function for special tax toggle
window.toggleOzelMatrahType = function() {
  const matrahType = document.getElementById('ozelMatrahTuru');
  const percentageField = document.getElementById('ozelMatrahYuzde');
  const amountField = document.getElementById('ozelMatrahTutar');
  
  if (matrahType && percentageField && amountField) {
    const selectedType = matrahType.value;
    
    if (selectedType === 'yuzde') {
      percentageField.style.display = 'block';
      amountField.style.display = 'none';
    } else if (selectedType === 'tutar') {
      percentageField.style.display = 'none';
      amountField.style.display = 'block';
    } else {
      percentageField.style.display = 'none';
      amountField.style.display = 'none';
    }
  }
}

// Global functions for HTML onclick handlers
window.addInvoiceItem = () => invoiceManager.addInvoiceItem();
window.removeInvoiceItem = (rowNumber) => invoiceManager.removeInvoiceItem(rowNumber);
window.previewInvoice = () => invoiceManager.previewInvoice();
window.saveAsDraft = () => invoiceManager.saveAsDraft();
window.createInvoice = () => invoiceManager.createInvoice();
window.resetForm = () => invoiceManager.resetForm();
window.closePreview = () => invoiceManager.closePreview();
window.printPreview = () => invoiceManager.printPreview();
window.createFromPreview = () => invoiceManager.createFromPreview();

// Test functions for conditional logic verification
window.testConditionalLogic = function() {
  console.log('🧪 Testing Conditional Logic...');
  
  if (!invoiceManager) {
    console.error('❌ Invoice manager not initialized');
    return;
  }
  
  // Test arrays
  console.log('📋 Arrays loaded:');
  console.log('Tevkifat types:', invoiceManager.tevkifatTipleri);
  console.log('SGK types:', invoiceManager.sgk);
  console.log('Özel Matrah types:', invoiceManager.ozelMatrahTipleri.slice(0, 10), '...(truncated)');
  
  // Test scenario change
  console.log('🔄 Testing scenario change to "Diğer" (36)...');
  const scenarioSelect = document.getElementById('drpSenaryo');
  if (scenarioSelect) {
    scenarioSelect.value = '36';
    scenarioSelect.dispatchEvent(new Event('change'));
    console.log('✅ Scenario change triggered');
  } else {
    console.error('❌ drpSenaryo not found');
  }
  
  // Test invoice type change to SGK
  setTimeout(() => {
    console.log('🔄 Testing invoice type change to SGK (14)...');
    const typeSelect = document.getElementById('drpFaturaTipi');
    if (typeSelect) {
      typeSelect.value = '14';
      typeSelect.dispatchEvent(new Event('change'));
      console.log('✅ Invoice type change triggered');
      
      // Check if SGK field is visible
      setTimeout(() => {
        const sgkDiv = document.getElementById('sgkCustomerDiv');
        const sgkInput = document.getElementById('txtSGKAlici');
        console.log('🔍 SGK field visible:', sgkDiv?.style.display !== 'none');
        console.log('🔍 SGK value:', sgkInput?.value.substring(0, 50) + '...');
      }, 100);
    } else {
      console.error('❌ drpFaturaTipi not found');
    }
  }, 100);
};

window.testCustomerTypeDetection = function() {
  console.log('🧪 Testing Customer Type Detection...');
  
  const taxIdInput = document.getElementById('customerTaxId');
  if (!taxIdInput) {
    console.error('❌ customerTaxId input not found');
    return;
  }
  
  // Test 11-digit TC
  console.log('🔄 Testing 11-digit TC number...');
  taxIdInput.value = '12345678901';
  taxIdInput.dispatchEvent(new Event('input'));
  
  setTimeout(() => {
    const customerType = document.getElementById('customerType');
    console.log('✅ Customer type changed to:', customerType?.value);
  }, 100);
  
  // Test 10-digit VKN
  setTimeout(() => {
    console.log('🔄 Testing 10-digit VKN...');
    taxIdInput.value = '1234567890';
    taxIdInput.dispatchEvent(new Event('input'));
    
    setTimeout(() => {
      const customerType = document.getElementById('customerType');
      const taxOffice = document.getElementById('customerTaxOffice');
      console.log('✅ Customer type changed to:', customerType?.value);
      console.log('✅ Tax office visible:', taxOffice?.style.display !== 'none');
    }, 100);
  }, 500);
};

// Initialize when DOM is loaded
let invoiceManager;
document.addEventListener('DOMContentLoaded', function() {
  // Load sidebar
  const sidebarContainer = document.getElementById('sidebar');
  if (sidebarContainer && typeof SidebarWidget !== 'undefined') {
    const sidebar = new SidebarWidget('invoices');
    sidebarContainer.innerHTML = sidebar.render();
  }

  // Initialize invoice manager
  try {
    invoiceManager = new NewInvoiceManager();
    console.log('✅ Invoice Manager initialized successfully');
    console.log('🎯 Try running: testConditionalLogic() or testCustomerTypeDetection()');
  } catch (error) {
    console.error('❌ Error initializing invoice manager:', error);
  }
});
