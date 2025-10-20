// Invoice Form Schema Data
// Based on legacy DynamicInvoiceForm configuration

import { InvoiceFormSchema } from '../types/invoice-schema';

export const INVOICE_FORM_SCHEMA: InvoiceFormSchema = {
  version: '1.0.0',
  
  invoiceTypes: {
    individual: {
      name: 'Bireysel Fatura',
      description: 'Bireysel müşteriler için fatura',
      requiredFields: ['customer_info', 'invoice_details', 'items'],
      conditionalFields: ['device_info', 'sgk_info']
    },
    corporate: {
      name: 'Kurumsal Fatura',
      description: 'Kurumsal müşteriler için fatura',
      requiredFields: ['company_info', 'invoice_details', 'items'],
      conditionalFields: ['device_info', 'sgk_info']
    },
    export: {
      name: 'İhracat Faturası',
      description: 'Yurt dışı satışlar için fatura',
      requiredFields: ['export_info', 'invoice_details', 'items'],
      conditionalFields: ['device_info']
    }
  },

  scenarios: {
    device_sale: {
      name: 'Cihaz Satışı',
      description: 'İşitme cihazı satış faturası',
      applicableTypes: ['individual', 'corporate']
    },
    service: {
      name: 'Hizmet Faturası',
      description: 'Bakım, onarım ve diğer hizmetler',
      applicableTypes: ['individual', 'corporate']
    },
    export_device: {
      name: 'Cihaz İhracatı',
      description: 'Yurt dışı cihaz satışı',
      applicableTypes: ['export']
    }
  },

  fieldDefinitions: {
    customer_info: {
      name: 'customer_info',
      title: 'Müşteri Bilgileri',
      description: 'Bireysel müşteri bilgileri',
      fields: {
        first_name: {
          id: 'first_name',
          label: 'Ad',
          type: 'text',
          required: true,
          validation: {
            minLength: 2,
            maxLength: 50
          }
        },
        last_name: {
          id: 'last_name',
          label: 'Soyad',
          type: 'text',
          required: true,
          validation: {
            minLength: 2,
            maxLength: 50
          }
        },
        tc_number: {
          id: 'tc_number',
          label: 'T.C. Kimlik No',
          type: 'text',
          required: true,
          placeholder: '12345678901',
          validation: {
            pattern: '^[0-9]{11}$',
            minLength: 11,
            maxLength: 11
          },
          helpText: '11 haneli T.C. Kimlik Numarası'
        },
        email: {
          id: 'email',
          label: 'E-posta',
          type: 'email',
          required: false,
          placeholder: 'ornek@email.com'
        },
        phone: {
          id: 'phone',
          label: 'Telefon',
          type: 'tel',
          required: true,
          placeholder: '0532 123 45 67'
        },
        address: {
          id: 'address',
          label: 'Adres',
          type: 'textarea',
          required: true,
          validation: {
            minLength: 10,
            maxLength: 200
          }
        },
        city: {
          id: 'city',
          label: 'İl',
          type: 'select',
          required: true,
          options: [
            { value: 'istanbul', text: 'İstanbul' },
            { value: 'ankara', text: 'Ankara' },
            { value: 'izmir', text: 'İzmir' },
            { value: 'bursa', text: 'Bursa' },
            { value: 'antalya', text: 'Antalya' }
          ]
        },
        postal_code: {
          id: 'postal_code',
          label: 'Posta Kodu',
          type: 'text',
          required: true,
          placeholder: '34000',
          validation: {
            pattern: '^[0-9]{5}$'
          }
        }
      }
    },

    company_info: {
      name: 'company_info',
      title: 'Şirket Bilgileri',
      description: 'Kurumsal müşteri bilgileri',
      fields: {
        company_name: {
          id: 'company_name',
          label: 'Şirket Adı',
          type: 'text',
          required: true,
          validation: {
            minLength: 2,
            maxLength: 100
          }
        },
        tax_number: {
          id: 'tax_number',
          label: 'Vergi Numarası',
          type: 'text',
          required: true,
          placeholder: '1234567890',
          validation: {
            pattern: '^[0-9]{10}$',
            minLength: 10,
            maxLength: 10
          },
          helpText: '10 haneli Vergi Kimlik Numarası'
        },
        tax_office: {
          id: 'tax_office',
          label: 'Vergi Dairesi',
          type: 'text',
          required: true,
          validation: {
            minLength: 2,
            maxLength: 50
          }
        },
        contact_person: {
          id: 'contact_person',
          label: 'Yetkili Kişi',
          type: 'text',
          required: false,
          validation: {
            maxLength: 100
          }
        },
        email: {
          id: 'email',
          label: 'E-posta',
          type: 'email',
          required: false,
          placeholder: 'info@sirket.com'
        },
        phone: {
          id: 'phone',
          label: 'Telefon',
          type: 'tel',
          required: true,
          placeholder: '0212 123 45 67'
        },
        address: {
          id: 'address',
          label: 'Adres',
          type: 'textarea',
          required: true,
          validation: {
            minLength: 10,
            maxLength: 200
          }
        },
        city: {
          id: 'city',
          label: 'İl',
          type: 'select',
          required: true,
          options: [
            { value: 'istanbul', text: 'İstanbul' },
            { value: 'ankara', text: 'Ankara' },
            { value: 'izmir', text: 'İzmir' },
            { value: 'bursa', text: 'Bursa' },
            { value: 'antalya', text: 'Antalya' }
          ]
        },
        postal_code: {
          id: 'postal_code',
          label: 'Posta Kodu',
          type: 'text',
          required: true,
          placeholder: '34000',
          validation: {
            pattern: '^[0-9]{5}$'
          }
        }
      }
    },

    export_info: {
      name: 'export_info',
      title: 'İhracat Bilgileri',
      description: 'Yurt dışı satış bilgileri',
      fields: {
        company_name: {
          id: 'company_name',
          label: 'Şirket Adı',
          type: 'text',
          required: true,
          validation: {
            minLength: 2,
            maxLength: 100
          }
        },
        country: {
          id: 'country',
          label: 'Ülke',
          type: 'select',
          required: true,
          options: [
            { value: 'DE', text: 'Almanya' },
            { value: 'FR', text: 'Fransa' },
            { value: 'UK', text: 'İngiltere' },
            { value: 'US', text: 'Amerika' },
            { value: 'NL', text: 'Hollanda' }
          ]
        },
        currency: {
          id: 'currency',
          label: 'Para Birimi',
          type: 'select',
          required: true,
          defaultValue: 'EUR',
          options: [
            { value: 'EUR', text: 'Euro (EUR)' },
            { value: 'USD', text: 'Dolar (USD)' },
            { value: 'GBP', text: 'Sterlin (GBP)' }
          ]
        },
        exchange_rate: {
          id: 'exchange_rate',
          label: 'Döviz Kuru',
          type: 'number',
          required: true,
          validation: {
            min: 0.01,
            max: 1000
          },
          helpText: '1 TRY = ? Yabancı Para'
        },
        address: {
          id: 'address',
          label: 'Adres',
          type: 'textarea',
          required: true,
          validation: {
            minLength: 10,
            maxLength: 200
          }
        }
      }
    },

    invoice_details: {
      name: 'invoice_details',
      title: 'Fatura Detayları',
      description: 'Fatura tarih ve ödeme bilgileri',
      fields: {
        invoice_date: {
          id: 'invoice_date',
          label: 'Fatura Tarihi',
          type: 'date',
          required: true,
          defaultValue: new Date().toISOString().split('T')[0]
        },
        due_date: {
          id: 'due_date',
          label: 'Vade Tarihi',
          type: 'date',
          required: true
        },
        payment_method: {
          id: 'payment_method',
          label: 'Ödeme Yöntemi',
          type: 'select',
          required: true,
          defaultValue: 'cash',
          options: [
            { value: 'cash', text: 'Nakit' },
            { value: 'credit_card', text: 'Kredi Kartı' },
            { value: 'bank_transfer', text: 'Havale/EFT' },
            { value: 'check', text: 'Çek' },
            { value: 'installment', text: 'Taksit' }
          ]
        },
        notes: {
          id: 'notes',
          label: 'Notlar',
          type: 'textarea',
          required: false,
          validation: {
            maxLength: 500
          },
          placeholder: 'Fatura ile ilgili ek notlar...'
        }
      }
    },

    items: {
      name: 'items',
      title: 'Fatura Kalemleri',
      description: 'Satılan ürün ve hizmetler',
      fields: {
        items_list: {
          id: 'items_list',
          label: 'Kalemler',
          type: 'text', // This will be handled specially in the component
          required: true,
          helpText: 'En az bir kalem eklemelisiniz'
        }
      }
    },

    device_info: {
      name: 'device_info',
      title: 'Cihaz Bilgileri',
      description: 'İşitme cihazı detayları',
      conditional: {
        dependsOn: 'scenario',
        condition: 'equals',
        value: 'device_sale'
      },
      fields: {
        device_brand: {
          id: 'device_brand',
          label: 'Cihaz Markası',
          type: 'select',
          required: true,
          options: [
            { value: 'phonak', text: 'Phonak' },
            { value: 'oticon', text: 'Oticon' },
            { value: 'widex', text: 'Widex' },
            { value: 'resound', text: 'ReSound' },
            { value: 'signia', text: 'Signia' }
          ]
        },
        device_model: {
          id: 'device_model',
          label: 'Cihaz Modeli',
          type: 'text',
          required: true,
          validation: {
            minLength: 2,
            maxLength: 50
          }
        },
        device_serial: {
          id: 'device_serial',
          label: 'Seri Numarası',
          type: 'text',
          required: true,
          validation: {
            minLength: 5,
            maxLength: 20
          }
        },
        device_side: {
          id: 'device_side',
          label: 'Kulak',
          type: 'select',
          required: true,
          options: [
            { value: 'left', text: 'Sol' },
            { value: 'right', text: 'Sağ' },
            { value: 'both', text: 'Çift' }
          ]
        },
        warranty_period: {
          id: 'warranty_period',
          label: 'Garanti Süresi (Ay)',
          type: 'number',
          required: true,
          defaultValue: 24,
          validation: {
            min: 1,
            max: 60
          }
        }
      }
    },

    sgk_info: {
      name: 'sgk_info',
      title: 'SGK Bilgileri',
      description: 'Sosyal Güvenlik Kurumu bilgileri',
      conditional: {
        dependsOn: 'has_sgk_coverage',
        condition: 'equals',
        value: true
      },
      fields: {
        has_sgk_coverage: {
          id: 'has_sgk_coverage',
          label: 'SGK Kapsamında',
          type: 'checkbox',
          required: false,
          defaultValue: false
        },
        sgk_number: {
          id: 'sgk_number',
          label: 'SGK Sicil No',
          type: 'text',
          required: false,
          conditional: {
            dependsOn: 'has_sgk_coverage',
            condition: 'equals',
            value: true
          },
          validation: {
            minLength: 10,
            maxLength: 15
          }
        },
        sgk_institution: {
          id: 'sgk_institution',
          label: 'SGK Kurumu',
          type: 'text',
          required: false,
          conditional: {
            dependsOn: 'has_sgk_coverage',
            condition: 'equals',
            value: true
          },
          validation: {
            maxLength: 100
          }
        },
        sgk_coverage_rate: {
          id: 'sgk_coverage_rate',
          label: 'Karşılama Oranı (%)',
          type: 'number',
          required: false,
          conditional: {
            dependsOn: 'has_sgk_coverage',
            condition: 'equals',
            value: true
          },
          defaultValue: 80,
          validation: {
            min: 0,
            max: 100
          }
        }
      }
    }
  }
};