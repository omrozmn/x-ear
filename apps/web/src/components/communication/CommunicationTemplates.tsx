import React, { useState } from 'react';
import { Plus, FileText, Edit, Trash2, Search } from 'lucide-react';
import { Button, Card, Badge, Input, Select } from '@x-ear/ui-web';

interface CommunicationTemplate {
  id: string;
  name: string;
  type: 'sms' | 'email';
  subject?: string;
  content: string;
  variables: string[];
  category: 'appointment' | 'reminder' | 'marketing' | 'notification' | 'custom';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

const CommunicationTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sms' | 'email'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | 'appointment' | 'reminder' | 'marketing' | 'notification' | 'custom'>('all');

  const filteredTemplates = templates.filter(template => {
    if (filterType !== 'all' && template.type !== filterType) return false;
    if (filterCategory !== 'all' && template.category !== filterCategory) return false;
    if (searchTerm && !template.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Başlık ve Yeni Şablon Butonu */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">İletişim Şablonları</h3>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Şablon
        </Button>
      </div>

      {/* Filtreler */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arama
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Şablon ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tip
            </label>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'sms' | 'email')}
              options={[
                { value: 'all', label: 'Tümü' },
                { value: 'sms', label: 'SMS' },
                { value: 'email', label: 'E-posta' }
              ]}
              fullWidth
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as 'all' | 'appointment' | 'reminder' | 'marketing' | 'notification' | 'custom')}
              options={[
                { value: 'all', label: 'Tümü' },
                { value: 'appointment', label: 'Randevu' },
                { value: 'reminder', label: 'Hatırlatma' },
                { value: 'marketing', label: 'Pazarlama' },
                { value: 'notification', label: 'Bildirim' },
                { value: 'custom', label: 'Özel' }
              ]}
              fullWidth
            />
          </div>
        </div>
      </Card>

      {/* Şablonlar Listesi */}
      {filteredTemplates.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Şablon bulunamadı
          </h3>
          <p className="text-gray-600 mb-4">
            Henüz oluşturulmuş şablon yok veya arama kriterlerinize uygun şablon bulunamadı.
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            İlk Şablonu Oluştur
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">{template.name}</h4>
                    <Badge variant={template.type === 'sms' ? 'default' : 'secondary'}>
                      {template.type === 'sms' ? 'SMS' : 'E-posta'}
                    </Badge>
                    <Badge variant="secondary">
                      {template.category}
                    </Badge>
                    {!template.isActive && (
                      <Badge variant="danger">Pasif</Badge>
                    )}
                  </div>
                  
                  {template.subject && (
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Konu:</strong> {template.subject}
                    </p>
                  )}
                  
                  <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                    {template.content}
                  </p>
                  
                  {template.variables.length > 0 && (
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs text-gray-500">Değişkenler:</span>
                      {template.variables.map((variable, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    Oluşturulma: {new Date(template.createdAt).toLocaleString('tr-TR')}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommunicationTemplates;