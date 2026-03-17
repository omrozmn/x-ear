/**
 * Party Communication Integration Component
 * Integrates party management with communication center
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  MessageCircle,
  Mail,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  History,
  User,
  Phone,
  AtSign
} from 'lucide-react';
import { Button, Card, Badge, Input, Select, Textarea, Checkbox, useToastHelpers } from '@x-ear/ui-web';
import { Party } from '../../types/party';
import { useCommunicationOfflineSync } from '../../hooks/useCommunicationOfflineSync';

interface PartyCommunicationIntegrationProps {
  party: Party;
  onClose?: () => void;
}

interface CommunicationMessage {
  id: string;
  type: 'sms' | 'email' | 'whatsapp';
  recipient: string;
  recipientName?: string;
  partyId?: string;
  subject?: string;
  content: string;
  templateId?: string;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'delivered' | 'failed';
  errorMessage?: string;
  messageType: 'manual' | 'appointment_reminder' | 'campaign' | 'automated';
  createdAt: string;
  updatedAt?: string;
}

interface QuickMessageTemplate {
  id: string;
  name: string;
  type: 'sms' | 'email' | 'whatsapp';
  content: string;
  subject?: string;
  category: 'appointment' | 'reminder' | 'follow_up' | 'general';
}

const QUICK_TEMPLATES: QuickMessageTemplate[] = [
  {
    id: 'appointment_reminder',
    name: 'Randevu Hatırlatması',
    type: 'sms',
    content: 'Sayın {{partyName}}, {{appointmentDate}} tarihinde saat {{appointmentTime}}\'da randevunuz bulunmaktadır. Teşekkürler.',
    category: 'appointment'
  },
  {
    id: 'follow_up',
    name: 'Tedavi Sonrası Takip',
    type: 'whatsapp',
    content: 'Sayın {{partyName}}, tedaviniz sonrası durumunuz nasıl? Herhangi bir sorunuz varsa bize ulaşabilirsiniz.',
    category: 'follow_up'
  },
  {
    id: 'payment_reminder',
    name: 'Ödeme Hatırlatması',
    type: 'sms',
    content: 'Sayın {{partyName}}, {{amount}} TL tutarındaki ödemenizin son tarihi {{dueDate}}\'dir. Teşekkürler.',
    category: 'reminder'
  },
  {
    id: 'welcome_email',
    name: 'Hoş Geldiniz E-postası',
    type: 'email',
    subject: 'Kliniğimize Hoş Geldiniz',
    content: 'Sayın {{partyName}},\n\nKliniğimizi tercih ettiğiniz için teşekkür ederiz. Size en iyi hizmeti sunmak için buradayız.\n\nSaygılarımızla,\nKlinik Ekibi',
    category: 'general'
  }
];

export const PartyCommunicationIntegration: React.FC<PartyCommunicationIntegrationProps> = ({
  party,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [messageType, setMessageType] = useState<'sms' | 'email' | 'whatsapp'>('sms');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [messageContent, setMessageContent] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const {
    getMessages,
    // getTemplates, // Available but using local QUICK_TEMPLATES
    saveMessage,
    syncStatus
  } = useCommunicationOfflineSync();

  const { success, error } = useToastHelpers();

  // State for party messages
  const [partyMessages, setPartyMessages] = useState<CommunicationMessage[]>([]);

  // Load party messages
  useEffect(() => {
    const loadPartyMessages = async () => {
      const allMessages = await getMessages();
      const filtered = allMessages.filter((message: CommunicationMessage) =>
        message.partyId === party.id ||
        message.recipient === party.phone ||
        message.recipient === party.email
      );
      setPartyMessages(filtered);
    };
    loadPartyMessages();
  }, [getMessages, party.id, party.phone, party.email]);

  // Filtrelenmiş mesajlar
  const filteredMessages = useMemo(() => {
    return partyMessages.filter(message => {
      // Durum filtresi
      if (statusFilter !== 'all' && message.status !== statusFilter) return false;

      // Arama filtresi
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          message.content?.toLowerCase().includes(searchLower) ||
          message.subject?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [partyMessages, statusFilter, searchTerm]);

  // Template seçildiğinde içeriği doldur
  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);

    const template = QUICK_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      // Template değişkenlerini hasta bilgileriyle değiştir
      let content = template.content;
      const partyFullName = `${party.firstName || ''} ${party.lastName || ''}`.trim();
      content = content.replace(/\{\{partyName\}\}/g, partyFullName || '');
      content = content.replace(/\{\{partyPhone\}\}/g, party.phone || '');
      content = content.replace(/\{\{partyEmail\}\}/g, party.email || '');

      setMessageContent(content);
      setMessageSubject(template.subject || '');
      setMessageType(template.type);
    }
  }, [party]);

  // Mesaj gönder
  const handleSendMessage = useCallback(async () => {
    if (!messageContent.trim()) {
      error('Mesaj içeriği boş olamaz');
      return;
    }

    const recipient = messageType === 'email' ? party.email : party.phone;
    if (!recipient) {
      error(`Hasta ${messageType === 'email' ? 'e-posta adresi' : 'telefon numarası'} bulunamadı`);
      return;
    }

    setIsLoading(true);

    try {
      const scheduledAt = isScheduled && scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : undefined;

      const messageData: Omit<CommunicationMessage, 'id' | 'createdAt'> = {
        type: messageType,
        recipient,
        recipientName: `${party.firstName || ''} ${party.lastName || ''}`.trim() || 'İsimsiz Hasta',
        partyId: party.id,
        subject: messageType === 'email' ? messageSubject : undefined,
        content: messageContent,
        templateId: selectedTemplate || undefined,
        scheduledAt,
        status: scheduledAt ? 'scheduled' : 'sent',
        messageType: 'manual',
        sentAt: scheduledAt ? undefined : new Date().toISOString()
      };

      await saveMessage({
        ...messageData,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      });

      success(scheduledAt ? 'Mesaj zamanlandı' : 'Mesaj gönderildi');

      // Form'u temizle
      setMessageContent('');
      setMessageSubject('');
      setSelectedTemplate('');
      setIsScheduled(false);
      setScheduleDate('');
      setScheduleTime('');

    } catch (err) {
      error('Mesaj gönderme sırasında hata oluştu: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setIsLoading(false);
    }
  }, [
    messageContent,
    messageType,
    party,
    messageSubject,
    isScheduled,
    scheduleDate,
    scheduleTime,
    selectedTemplate,
    saveMessage,
    success,
    error
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="w-4 h-4 text-primary" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Gönderildi';
      case 'delivered': return 'Teslim Edildi';
      case 'failed': return 'Başarısız';
      case 'scheduled': return 'Zamanlandı';
      case 'draft': return 'Taslak';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-primary/10 text-blue-800';
      case 'delivered': return 'bg-success/10 text-success';
      case 'failed': return 'bg-destructive/10 text-red-800';
      case 'scheduled': return 'bg-warning/10 text-yellow-800';
      case 'draft': return 'bg-muted text-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  if (!syncStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">İletişim sistemi yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hasta Bilgileri */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{`${party.firstName || ''} ${party.lastName || ''}`.trim() || 'İsimsiz Hasta'}</h3>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
              {party.phone && (
                <div className="flex items-center space-x-1">
                  <Phone className="w-4 h-4" />
                  <span>{party.phone}</span>
                </div>
              )}
              {party.email && (
                <div className="flex items-center space-x-1">
                  <AtSign className="w-4 h-4" />
                  <span>{party.email}</span>
                </div>
              )}
            </div>
          </div>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Kapat
            </Button>
          )}
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          <button
            data-allow-raw="true"
            onClick={() => setActiveTab('send')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'send'
                ? 'border-blue-500 text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
          >
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4" />
              <span>Mesaj Gönder</span>
            </div>
          </button>
          <button
            data-allow-raw="true"
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                ? 'border-blue-500 text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
          >
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Mesaj Geçmişi ({partyMessages.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Send Message Tab */}
      {activeTab === 'send' && (
        <div className="space-y-6">
          {/* Message Type Selection */}
          <Card className="p-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Mesaj Türü</h4>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  data-allow-raw="true"
                  type="radio"
                  name="messageType"
                  value="sms"
                  checked={messageType === 'sms'}
                  onChange={(e) => setMessageType(e.target.value as 'sms' | 'email' | 'whatsapp')}
                  className="mr-2"
                />
                <MessageSquare className="w-4 h-4 mr-1" />
                SMS
              </label>
              <label className="flex items-center">
                <input
                  data-allow-raw="true"
                  type="radio"
                  name="messageType"
                  value="email"
                  checked={messageType === 'email'}
                  onChange={(e) => setMessageType(e.target.value as 'sms' | 'email' | 'whatsapp')}
                  className="mr-2"
                />
                <Mail className="w-4 h-4 mr-1" />
                E-posta
              </label>
              <label className="flex items-center">
                <input
                  data-allow-raw="true"
                  type="radio"
                  name="messageType"
                  value="whatsapp"
                  checked={messageType === 'whatsapp'}
                  onChange={(e) => setMessageType(e.target.value as 'sms' | 'email' | 'whatsapp')}
                  className="mr-2"
                />
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </label>
            </div>
          </Card>

          {/* Quick Templates */}
          <Card className="p-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Hızlı Şablonlar</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {QUICK_TEMPLATES
                .filter(template => template.type === messageType)
                .map(template => (
                  <button
                    data-allow-raw="true"
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`p-3 text-left border rounded-2xl hover:bg-muted transition-colors ${selectedTemplate === template.id ? 'border-blue-500 bg-primary/10' : 'border-border'
                      }`}
                  >
                    <div className="font-medium text-sm text-foreground">{template.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.content}</div>
                  </button>
                ))}
            </div>
          </Card>

          {/* Message Compose */}
          <Card className="p-4">
            <div className="space-y-4">
              {messageType === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Konu
                  </label>
                  <Input
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="E-posta konusu"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Mesaj İçeriği
                </label>
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder={`${messageType === 'sms' ? 'SMS' : messageType === 'whatsapp' ? 'WhatsApp' : 'E-posta'} içeriğini yazın...`}
                  rows={messageType === 'email' ? 8 : 4}
                  className="resize-none"
                />
                {messageType !== 'email' && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {messageContent.length}/160 karakter
                  </div>
                )}
              </div>

              {/* Schedule Options */}
              <div>
                <label className="flex items-center">
                  <Checkbox
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-foreground">Mesajı zamanla</span>
                </label>

                {isScheduled && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Tarih
                      </label>
                      <Input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Saat
                      </label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Send Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !messageContent.trim()}
                  className="flex items-center space-x-2"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isScheduled ? 'Zamanla' : 'Gönder'}</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Message History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Mesajlarda ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Tüm Durumlar' },
                  { value: 'sent', label: 'Gönderildi' },
                  { value: 'delivered', label: 'Teslim Edildi' },
                  { value: 'failed', label: 'Başarısız' },
                  { value: 'scheduled', label: 'Zamanlandı' }
                ]}
              />
            </div>
          </Card>

          {/* Messages List */}
          {filteredMessages.length > 0 ? (
            <div className="space-y-3">
              {filteredMessages.map(message => (
                <Card key={message.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          {message.type === 'sms' ? (
                            <MessageSquare className="w-4 h-4 text-primary" />
                          ) : message.type === 'whatsapp' ? (
                            <MessageCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Mail className="w-4 h-4 text-success" />
                          )}
                          <span className="font-medium text-sm">{message.type.toUpperCase()}</span>
                        </div>

                        <Badge className={getStatusColor(message.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(message.status)}
                            <span>{getStatusLabel(message.status)}</span>
                          </div>
                        </Badge>
                      </div>

                      {message.subject && (
                        <div className="font-medium text-foreground mb-1">{message.subject}</div>
                      )}

                      <div className="text-sm text-foreground mb-2 line-clamp-3">
                        {message.content}
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Oluşturulma: {new Date(message.createdAt).toLocaleString('tr-TR')}</span>
                        {message.sentAt && (
                          <span>Gönderilme: {new Date(message.sentAt).toLocaleString('tr-TR')}</span>
                        )}
                        {message.deliveredAt && (
                          <span>Teslim: {new Date(message.deliveredAt).toLocaleString('tr-TR')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Mesaj bulunamadı</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Arama kriterlerinize uygun mesaj bulunamadı.'
                  : 'Bu hasta ile henüz mesaj alışverişi yapılmamış.'
                }
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default PartyCommunicationIntegration;
