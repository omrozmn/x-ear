import { InvoiceTemplate, CreateInvoiceTemplateData, UpdateInvoiceTemplateData } from '../types/invoice';

export class InvoiceTemplateService {
  private static baseUrl = '/api/invoice-templates';

  static async getTemplates(): Promise<InvoiceTemplate[]> {
    try {
      // Mock data for now - replace with actual API call
      const mockTemplates: InvoiceTemplate[] = [
        {
          id: '1',
          name: 'Genel Muayene Şablonu',
          type: 'service',
          description: 'Standart genel muayene faturası şablonu',
          category: 'medical',
          isDefault: true,
          isActive: true,
          usageCount: 45,
          templateData: {
            type: 'service',
            patientName: '',
            items: [
              {
                name: 'Genel Muayene',
                quantity: 1,
                unitPrice: 150,
                taxRate: 18
              }
            ],
            notes: 'Genel muayene hizmeti'
          },
          items: [],
          defaultPaymentMethod: 'cash',
          defaultDueDays: 30,
          autoCalculateTax: true,
          requireApproval: false,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
          createdBy: 'admin'
        },
        {
          id: '2',
          name: 'Diş Tedavisi Şablonu',
          type: 'service',
          description: 'Diş tedavi hizmetleri için şablon',
          category: 'dental',
          isDefault: false,
          isActive: true,
          usageCount: 23,
          templateData: {
            type: 'service',
            patientName: '',
            items: [
              {
                name: 'Diş Tedavisi',
                quantity: 1,
                unitPrice: 300,
                taxRate: 18
              }
            ],
            notes: 'Diş tedavi hizmeti'
          },
          items: [],
          defaultPaymentMethod: 'credit_card',
          defaultDueDays: 15,
          autoCalculateTax: true,
          requireApproval: false,
          createdAt: '2024-01-10T14:30:00Z',
          updatedAt: '2024-01-10T14:30:00Z',
          createdBy: 'admin'
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return mockTemplates;
    } catch (error) {
      throw new Error('Şablonlar yüklenirken hata oluştu');
    }
  }

  static async getTemplate(id: string): Promise<InvoiceTemplate> {
    try {
      const templates = await this.getTemplates();
      const template = templates.find(t => t.id === id);
      
      if (!template) {
        throw new Error('Şablon bulunamadı');
      }
      
      return template;
    } catch (error) {
      throw new Error('Şablon yüklenirken hata oluştu');
    }
  }

  static async createCommunicationTemplates(data: CreateInvoiceTemplateData): Promise<InvoiceTemplate> {
    try {
      // Mock API call - replace with actual implementation
      const newTemplate: InvoiceTemplate = {
        id: Date.now().toString(),
        name: data.name,
        type: 'service', // Default type
        description: data.description,
        category: data.category,
        isDefault: false,
        isActive: data.isActive ?? true,
        usageCount: 0,
        templateData: data.templateData,
        items: [],
        autoCalculateTax: true,
        requireApproval: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'current-user' // Replace with actual user
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return newTemplate;
    } catch (error) {
      throw new Error('Şablon oluşturulurken hata oluştu');
    }
  }

  static async updateCommunicationTemplate(id: string, data: UpdateInvoiceTemplateData): Promise<InvoiceTemplate> {
    try {
      const existingTemplate = await this.getTemplate(id);
      
      // Mock API call - replace with actual implementation
      const updatedTemplate: InvoiceTemplate = {
        ...existingTemplate,
        name: data.name ?? existingTemplate.name,
        description: data.description ?? existingTemplate.description,
        category: data.category ?? existingTemplate.category,
        templateData: data.templateData ?? existingTemplate.templateData,
        isActive: data.isActive ?? existingTemplate.isActive,
        updatedAt: new Date().toISOString()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return updatedTemplate;
    } catch (error) {
      throw new Error('Şablon güncellenirken hata oluştu');
    }
  }

  static async deleteCommunicationTemplate(id: string): Promise<void> {
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In real implementation, make DELETE request to API
      console.log(`Template ${id} deleted`);
    } catch (error) {
      throw new Error('Şablon silinirken hata oluştu');
    }
  }

  static async duplicateTemplate(id: string): Promise<InvoiceTemplate> {
    try {
      const originalTemplate = await this.getTemplate(id);
      
      const duplicatedTemplate: InvoiceTemplate = {
        ...originalTemplate,
        id: Date.now().toString(),
        name: `${originalTemplate.name} (Kopya)`,
        isDefault: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return duplicatedTemplate;
    } catch (error) {
      throw new Error('Şablon kopyalanırken hata oluştu');
    }
  }

  static async getTemplatesByCategory(category: string): Promise<InvoiceTemplate[]> {
    try {
      const templates = await this.getTemplates();
      return templates.filter(template => template.category === category);
    } catch (error) {
      throw new Error('Kategori şablonları yüklenirken hata oluştu');
    }
  }

  static async searchTemplates(query: string): Promise<InvoiceTemplate[]> {
    try {
      const templates = await this.getTemplates();
      const searchQuery = query.toLowerCase();
      
      return templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery) ||
        template.description?.toLowerCase().includes(searchQuery) ||
        template.category.toLowerCase().includes(searchQuery)
      );
    } catch (error) {
      throw new Error('Şablon arama sırasında hata oluştu');
    }
  }

  static async incrementUsageCount(id: string): Promise<void> {
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // In real implementation, make PATCH request to increment usage count
      console.log(`Template ${id} usage count incremented`);
    } catch (error) {
      throw new Error('Kullanım sayısı güncellenirken hata oluştu');
    }
  }

  static async setDefaultTemplate(id: string, category: string): Promise<void> {
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // In real implementation, make PATCH request to set as default
      console.log(`Template ${id} set as default for category ${category}`);
    } catch (error) {
      throw new Error('Varsayılan şablon ayarlanırken hata oluştu');
    }
  }

  static async getDefaultTemplate(category: string): Promise<InvoiceTemplate | null> {
    try {
      const templates = await this.getTemplates();
      return templates.find(template => 
        template.category === category && template.isDefault
      ) || null;
    } catch (error) {
      throw new Error('Varsayılan şablon yüklenirken hata oluştu');
    }
  }

  static async exportTemplate(id: string): Promise<Blob> {
    try {
      const template = await this.getTemplate(id);
      
      // Convert template to JSON and create blob
      const templateJson = JSON.stringify(template, null, 2);
      const blob = new Blob([templateJson], { type: 'application/json' });
      
      return blob;
    } catch (error) {
      throw new Error('Şablon dışa aktarılırken hata oluştu');
    }
  }

  static async importTemplate(file: File): Promise<InvoiceTemplate> {
    try {
      const text = await file.text();
      const templateData = JSON.parse(text);
      
      // Validate template structure
      if (!templateData.name || !templateData.category || !templateData.templateData) {
        throw new Error('Geçersiz şablon formatı');
      }
      
      // Create new template from imported data
      const createData: CreateInvoiceTemplateData = {
        name: `${templateData.name} (İçe Aktarılan)`,
        description: templateData.description,
        category: templateData.category,
        templateData: templateData.templateData,
        isActive: true
      };
      
      return await this.createCommunicationTemplates(createData);
    } catch (error) {
      throw new Error('Şablon içe aktarılırken hata oluştu');
    }
  }
}

export default InvoiceTemplateService;