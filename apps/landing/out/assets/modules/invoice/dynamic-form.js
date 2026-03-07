class DynamicInvoiceForm {
  constructor(containerId, schemaPath = '/invoice-fields-schema.json') {
    this.containerId = containerId;
    this.schemaPath = schemaPath;
    this.schema = null;
    this.currentInvoiceType = 'TEMEL';
    this.currentScenario = '36';
    this.formData = {};
    this.eventListeners = [];
    
    this.init();
  }

  async init() {
    try {
      await this.loadSchema();
      this.render();
      this.bindEvents();
    } catch (error) {
      console.error('Failed to initialize dynamic invoice form:', error);
      this.renderError('Form yüklenirken hata oluştu.');
    }
  }

  async loadSchema() {
    try {
      // Use generated API client instead of manual fetch
      // Use Orval API from window object
        if (!window.invoicesGetInvoiceSchema) {
            console.warn('⚠️ invoicesGetInvoiceSchema not available on window');
            return;
        }
        const invoicesGetInvoiceSchema = window.invoicesGetInvoiceSchema;
      const response = await invoicesGetInvoiceSchema();
      
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // The Orval response structure includes data property
      this.schema = response.data;
      console.log('Schema loaded successfully:', this.schema);
    } catch (error) {
      console.error('Error loading schema:', error);
      // Fallback to local schema if API fails
      this.schema = this.getDefaultSchema();
    }
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container with id '${this.containerId}' not found`);
      return;
    }

    container.innerHTML = this.generateFormHTML();
    this.applyConditionalLogic();
  }

  generateFormHTML() {
    if (!this.schema) return '<div class="text-red-600">Schema yüklenemedi</div>';

    const invoiceTypeConfig = this.schema.invoiceTypes[this.currentInvoiceType];
    if (!invoiceTypeConfig) return '<div class="text-red-600">Geçersiz fatura tipi</div>';

    let html = `
      <div class="space-y-6">
        <!-- Invoice Type Selection -->
        <div class="bg-white p-6 rounded-lg shadow-sm border">
          <h3 class="text-lg font-semibold mb-4">Fatura Tipi</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="invoiceTypeSelect" class="block text-sm font-medium text-gray-700 mb-2">
                Fatura Tipi <span class="text-red-500">*</span>
              </label>
              <select id="invoiceTypeSelect" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                ${Object.entries(this.schema.invoiceTypes).map(([key, type]) => 
                  `<option value="${key}" ${key === this.currentInvoiceType ? 'selected' : ''}>${type.name}</option>`
                ).join('')}
              </select>
            </div>
            <div>
              <label for="scenarioSelect" class="block text-sm font-medium text-gray-700 mb-2">
                Senaryo <span class="text-red-500">*</span>
              </label>
              <select id="scenarioSelect" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                ${this.schema.fieldDefinitions.invoiceDetails.fields.scenario.options.map(option =>
                  `<option value="${option.value}" ${option.value === this.currentScenario ? 'selected' : ''}>${option.text}</option>`
                ).join('')}
              </select>
            </div>
          </div>
        </div>
    `;

    // Generate sections based on required and conditional fields
    const allSections = [...invoiceTypeConfig.requiredFields, ...invoiceTypeConfig.conditionalFields];
    
    allSections.forEach(sectionKey => {
      const sectionDef = this.schema.fieldDefinitions[sectionKey];
      if (sectionDef) {
        html += this.generateSectionHTML(sectionKey, sectionDef);
      }
    });

    html += `
        <!-- Form Actions -->
        <div class="bg-white p-6 rounded-lg shadow-sm border">
          <div class="flex justify-end space-x-3">
            <button type="button" id="resetFormBtn" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Sıfırla
            </button>
            <button type="button" id="previewInvoiceBtn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Önizleme
            </button>
            <button type="button" id="createInvoiceBtn" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              Fatura Oluştur
            </button>
          </div>
        </div>
      </div>
    `;

    return html;
  }

  generateSectionHTML(sectionKey, sectionDef) {
    const isRequired = this.schema.invoiceTypes[this.currentInvoiceType].requiredFields.includes(sectionKey);
    const isConditional = this.schema.invoiceTypes[this.currentInvoiceType].conditionalFields.includes(sectionKey);
    
    let html = `
      <div class="bg-white p-6 rounded-lg shadow-sm border section-${sectionKey}" 
           data-section="${sectionKey}" 
           data-required="${isRequired}" 
           data-conditional="${isConditional}">
        <h3 class="text-lg font-semibold mb-4">
          ${sectionDef.name}
          ${isRequired ? '<span class="text-red-500 ml-1">*</span>' : ''}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    `;

    Object.entries(sectionDef.fields).forEach(([fieldKey, fieldDef]) => {
      html += this.generateFieldHTML(fieldKey, fieldDef, sectionKey);
    });

    html += `
        </div>
      </div>
    `;

    return html;
  }

  generateFieldHTML(fieldKey, fieldDef, sectionKey) {
    const fieldId = fieldDef.id || `${sectionKey}_${fieldKey}`;
    const isRequired = fieldDef.required;
    const value = this.formData[fieldId] || fieldDef.defaultValue || '';

    let fieldHTML = '';

    switch (fieldDef.type) {
      case 'text':
      case 'email':
      case 'tel':
        fieldHTML = `
          <input type="${fieldDef.type}" 
                 id="${fieldId}" 
                 name="${fieldId}"
                 value="${value}"
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="${fieldDef.placeholder || ''}"
                 ${isRequired ? 'required' : ''}
                 ${fieldDef.readonly ? 'readonly' : ''}>
        `;
        break;

      case 'number':
        fieldHTML = `
          <input type="number" 
                 id="${fieldId}" 
                 name="${fieldId}"
                 value="${value}"
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="${fieldDef.placeholder || ''}"
                 ${fieldDef.min !== undefined ? `min="${fieldDef.min}"` : ''}
                 ${fieldDef.max !== undefined ? `max="${fieldDef.max}"` : ''}
                 ${fieldDef.step !== undefined ? `step="${fieldDef.step}"` : ''}
                 ${isRequired ? 'required' : ''}>
        `;
        break;

      case 'date':
        fieldHTML = `
          <input type="date" 
                 id="${fieldId}" 
                 name="${fieldId}"
                 value="${value}"
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 ${isRequired ? 'required' : ''}>
        `;
        break;

      case 'time':
        fieldHTML = `
          <input type="time" 
                 id="${fieldId}" 
                 name="${fieldId}"
                 value="${value}"
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 ${isRequired ? 'required' : ''}>
        `;
        break;

      case 'select': {
        const options = fieldDef.options || [];
        fieldHTML = `
          <select id="${fieldId}" 
                  name="${fieldId}"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ${isRequired ? 'required' : ''}>
            ${options.map(option => 
              `<option value="${option.value}" ${option.value === value ? 'selected' : ''}>${option.text}</option>`
            ).join('')}
          </select>
        `;
        break;
      }

      case 'textarea':
        fieldHTML = `
          <textarea id="${fieldId}" 
                    name="${fieldId}"
                    rows="${fieldDef.rows || 3}"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="${fieldDef.placeholder || ''}"
                    ${isRequired ? 'required' : ''}>${value}</textarea>
        `;
        break;

      case 'checkbox':
        fieldHTML = `
          <div class="flex items-center">
            <input type="checkbox" 
                   id="${fieldId}" 
                   name="${fieldId}"
                   value="1"
                   class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                   ${value ? 'checked' : ''}>
            <label for="${fieldId}" class="ml-2 text-sm text-gray-700">${fieldDef.checkboxLabel || fieldDef.label}</label>
          </div>
        `;
        break;

      default:
        fieldHTML = `<div class="text-red-500">Unsupported field type: ${fieldDef.type}</div>`;
    }

    return `
      <div class="field-${fieldKey}" data-field="${fieldKey}">
        ${fieldDef.type !== 'checkbox' ? `
          <label for="${fieldId}" class="block text-sm font-medium text-gray-700 mb-2">
            ${fieldDef.label}
            ${isRequired ? '<span class="text-red-500">*</span>' : ''}
          </label>
        ` : ''}
        ${fieldHTML}
        ${fieldDef.helpText ? `<p class="text-xs text-gray-500 mt-1">${fieldDef.helpText}</p>` : ''}
      </div>
    `;
  }

  bindEvents() {
    // Clear existing event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    // Invoice type change
    const invoiceTypeSelect = document.getElementById('invoiceTypeSelect');
    if (invoiceTypeSelect) {
      const handler = (e) => this.handleInvoiceTypeChange(e.target.value);
      invoiceTypeSelect.addEventListener('change', handler);
      this.eventListeners.push({ element: invoiceTypeSelect, event: 'change', handler });
    }

    // Scenario change
    const scenarioSelect = document.getElementById('scenarioSelect');
    if (scenarioSelect) {
      const handler = (e) => this.handleScenarioChange(e.target.value);
      scenarioSelect.addEventListener('change', handler);
      this.eventListeners.push({ element: scenarioSelect, event: 'change', handler });
    }

    // Form actions
    const resetBtn = document.getElementById('resetFormBtn');
    if (resetBtn) {
      const handler = () => this.resetForm();
      resetBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: resetBtn, event: 'click', handler });
    }

    const previewBtn = document.getElementById('previewInvoiceBtn');
    if (previewBtn) {
      const handler = () => this.previewInvoice();
      previewBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: previewBtn, event: 'click', handler });
    }

    const createBtn = document.getElementById('createInvoiceBtn');
    if (createBtn) {
      const handler = () => this.createInvoice();
      createBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: createBtn, event: 'click', handler });
    }

    // Form field changes for validation and conditional logic
    const container = document.getElementById(this.containerId);
    if (container) {
      const handler = (e) => this.handleFieldChange(e);
      container.addEventListener('input', handler);
      container.addEventListener('change', handler);
      this.eventListeners.push({ element: container, event: 'input', handler });
      this.eventListeners.push({ element: container, event: 'change', handler });
    }
  }

  handleInvoiceTypeChange(newType) {
    if (this.currentInvoiceType !== newType) {
      this.currentInvoiceType = newType;
      this.saveFormData();
      this.render();
    }
  }

  handleScenarioChange(newScenario) {
    if (this.currentScenario !== newScenario) {
      this.currentScenario = newScenario;
      this.applyConditionalLogic();
    }
  }

  handleFieldChange(event) {
    const field = event.target;
    if (field.name) {
      if (field.type === 'checkbox') {
        this.formData[field.name] = field.checked;
      } else {
        this.formData[field.name] = field.value;
      }
      
      // Apply conditional logic based on field changes
      this.applyConditionalLogic();
    }
  }

  applyConditionalLogic() {
    if (!this.schema || !this.schema.conditionalLogic) return;

    const logic = this.schema.conditionalLogic;
    
    // Apply invoice type specific logic
    if (logic.invoiceType && logic.invoiceType[this.currentInvoiceType]) {
      const typeLogic = logic.invoiceType[this.currentInvoiceType];
      this.applyVisibilityRules(typeLogic.show, typeLogic.hide);
    }

    // Apply scenario specific logic
    if (logic.scenario && logic.scenario[this.currentScenario]) {
      const scenarioLogic = logic.scenario[this.currentScenario];
      this.applyVisibilityRules(scenarioLogic.show, scenarioLogic.hide);
    }

    // Apply field-based conditional logic
    if (logic.fieldBased) {
      Object.entries(logic.fieldBased).forEach(([fieldId, rules]) => {
        const fieldValue = this.formData[fieldId];
        rules.forEach(rule => {
          if (this.evaluateCondition(rule.condition, fieldValue)) {
            this.applyVisibilityRules(rule.show, rule.hide);
          }
        });
      });
    }
  }

  applyVisibilityRules(showSelectors = [], hideSelectors = []) {
    showSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = 'block';
        el.classList.remove('hidden');
      });
    });

    hideSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = 'none';
        el.classList.add('hidden');
      });
    });
  }

  evaluateCondition(condition, value) {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'in':
        return condition.values.includes(value);
      case 'not_in':
        return !condition.values.includes(value);
      case 'greater_than':
        return parseFloat(value) > parseFloat(condition.value);
      case 'less_than':
        return parseFloat(value) < parseFloat(condition.value);
      case 'empty':
        return !value || value.trim() === '';
      case 'not_empty':
        return value && value.trim() !== '';
      default:
        return false;
    }
  }

  saveFormData() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.name) {
        if (input.type === 'checkbox') {
          this.formData[input.name] = input.checked;
        } else {
          this.formData[input.name] = input.value;
        }
      }
    });
  }

  resetForm() {
    if (confirm('Formdaki tüm veriler silinecek. Emin misiniz?')) {
      this.formData = {};
      this.currentInvoiceType = 'TEMEL';
      this.currentScenario = '36';
      this.render();
    }
  }

  previewInvoice() {
    this.saveFormData();
    console.log('Preview invoice data:', this.formData);
    // TODO: Implement preview functionality
    alert('Önizleme özelliği yakında eklenecek.');
  }

  async createInvoice() {
    this.saveFormData();
    
    if (!this.validateForm()) {
      alert('Lütfen gerekli alanları doldurun.');
      return;
    }

    try {
      const formData = {
        ...this.formData,
        invoiceType: this.currentInvoiceType,
        scenario: this.currentScenario
      };
      
      // Use Orval API from window object
      if (!window.invoicesCreateDynamicInvoice) {
        console.warn('⚠️ invoicesCreateDynamicInvoice not available on window');
        throw new Error('API client not available');
      }
      const invoicesCreateDynamicInvoice = window.invoicesCreateDynamicInvoice;
      
      // Use Orval client with idempotency
      const result = await invoicesCreateDynamicInvoice(formData, {
        headers: {
          'Idempotency-Key': this.generateIdempotencyKey()
        }
      });

      if (!result.success) {
        throw new Error(result.error || 'Fatura oluşturulamadı');
      }

      alert(`Fatura başarıyla oluşturuldu! Fatura No: ${result.data.invoiceNumber}`);
      this.resetForm();
      
      // Optionally redirect to invoice list or details
      if (window.location.pathname.includes('invoices')) {
        window.location.reload();
      }
      
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Fatura oluşturulurken bir hata oluştu: ' + error.message);
    }
  }

  generateIdempotencyKey() {
    return 'invoice-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  getDefaultSchema() {
    // Fallback schema structure
    return {
      invoiceTypes: {
        "TEMEL": {
          name: "Temel Fatura",
          requiredFields: ["recipient", "invoiceDetails"],
          conditionalFields: ["products"]
        },
        "TICARI": {
          name: "Ticari Fatura", 
          requiredFields: ["recipient", "invoiceDetails", "products"],
          conditionalFields: ["discount"]
        }
      },
      fieldDefinitions: {
        recipient: {
          name: "Alıcı Bilgileri",
          fields: {
            name: {
              id: "recipient_name",
              label: "Ad Soyad / Unvan",
              type: "text",
              required: true,
              placeholder: "Müşteri adı"
            },
            taxNumber: {
              id: "recipient_tax_number", 
              label: "VKN/TCKN",
              type: "text",
              required: true,
              placeholder: "Vergi kimlik numarası"
            }
          }
        }
      },
      conditionalLogic: {
        invoiceType: {
          "TEMEL": {
            hide: [".field-discount"]
          },
          "TICARI": {
            show: [".field-discount"]
          }
        }
      }
    };
  }

  validateForm() {
    const errors = [];
    const container = document.getElementById(this.containerId);
    
    if (!container) {
      errors.push('Form container bulunamadı');
      return errors;
    }

    // Get all visible required fields
    const requiredFields = container.querySelectorAll('input[required]:not([style*="display: none"]), select[required]:not([style*="display: none"]), textarea[required]:not([style*="display: none"])');
    
    requiredFields.forEach(field => {
      const value = field.value.trim();
      const label = field.closest('.form-group')?.querySelector('label')?.textContent || field.name || field.id;
      
      if (!value) {
        errors.push(`${label} alanı zorunludur`);
        field.classList.add('is-invalid');
      } else {
        field.classList.remove('is-invalid');
      }
    });

    // Validate email fields
    const emailFields = container.querySelectorAll('input[type="email"]:not([style*="display: none"])');
    emailFields.forEach(field => {
      const value = field.value.trim();
      if (value && !this.isValidEmail(value)) {
        const label = field.closest('.form-group')?.querySelector('label')?.textContent || 'E-posta';
        errors.push(`${label} geçerli bir e-posta adresi olmalıdır`);
        field.classList.add('is-invalid');
      }
    });

    // Validate number fields
    const numberFields = container.querySelectorAll('input[type="number"]:not([style*="display: none"])');
    numberFields.forEach(field => {
      const value = parseFloat(field.value);
      const min = parseFloat(field.min);
      const max = parseFloat(field.max);
      const label = field.closest('.form-group')?.querySelector('label')?.textContent || field.name || field.id;
      
      if (field.value && isNaN(value)) {
        errors.push(`${label} geçerli bir sayı olmalıdır`);
        field.classList.add('is-invalid');
      } else if (!isNaN(min) && value < min) {
        errors.push(`${label} en az ${min} olmalıdır`);
        field.classList.add('is-invalid');
      } else if (!isNaN(max) && value > max) {
        errors.push(`${label} en fazla ${max} olmalıdır`);
        field.classList.add('is-invalid');
      }
    });

    // Validate Turkish tax number (VKN/TCKN)
    const taxNumberField = container.querySelector('#recipient_tax_number');
    if (taxNumberField && taxNumberField.value.trim()) {
      const taxNumber = taxNumberField.value.trim();
      if (!this.isValidTurkishTaxNumber(taxNumber)) {
        errors.push('VKN/TCKN geçerli bir format olmalıdır');
        taxNumberField.classList.add('is-invalid');
      }
    }

    return errors;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidTurkishTaxNumber(taxNumber) {
    // Remove any non-digit characters
    const cleanNumber = taxNumber.replace(/\D/g, '');
    
    // Check if it's 10 digits (VKN) or 11 digits (TCKN)
    if (cleanNumber.length === 10) {
      // VKN validation
      return this.validateVKN(cleanNumber);
    } else if (cleanNumber.length === 11) {
      // TCKN validation
      return this.validateTCKN(cleanNumber);
    }
    
    return false;
  }

  validateVKN(vkn) {
    // Basic VKN validation (10 digits, not all same)
    if (!/^\d{10}$/.test(vkn)) return false;
    if (/^(\d)\1{9}$/.test(vkn)) return false; // All same digits
    return true;
  }

  validateTCKN(tckn) {
    // Turkish Citizenship Number validation algorithm
    if (!/^\d{11}$/.test(tckn)) return false;
    if (tckn[0] === '0') return false; // Cannot start with 0
    if (/^(\d)\1{10}$/.test(tckn)) return false; // All same digits
    
    const digits = tckn.split('').map(Number);
    
    // Check 10th digit
    const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
    const check1 = ((sum1 * 7) - sum2) % 10;
    
    if (check1 !== digits[9]) return false;
    
    // Check 11th digit
    const sum3 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
    const check2 = sum3 % 10;
    
    return check2 === digits[10];
  }

  renderError(message) {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Hata</h3>
              <div class="mt-2 text-sm text-red-700">
                <p>${message}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  destroy() {
    // Clean up event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }
}

// Make DynamicInvoiceForm globally available
window.DynamicInvoiceForm = DynamicInvoiceForm;