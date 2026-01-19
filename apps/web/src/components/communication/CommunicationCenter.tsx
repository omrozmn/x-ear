import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Mail,
  Send,
  Users,
  Calendar,
  Filter,
  Search,
  Plus,
  Settings,
  History,
  BarChart3,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { Button, Modal, useModal, Card, Badge, Input, Select, Tabs, useToastHelpers } from '@x-ear/ui-web';
import { Party } from '../../types/party';
import CommunicationTemplates from './CommunicationTemplates';
import CommunicationAnalytics from './CommunicationAnalytics';
import { useCommunicationOfflineSync } from '../../hooks/useCommunicationOfflineSync';

interface CommunicationCenterProps {
  parties: Party[];
  onRefresh: () => void;
}

interface CommunicationMessage {
  id: string;
  type: 'sms' | 'email';
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
  campaignId?: string;
  messageType: 'manual' | 'appointment_reminder' | 'campaign' | 'automated';
  createdAt: string;
  updatedAt?: string;
}

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

interface CommunicationCampaign {
  id: string;
  name: string;
  type: 'sms' | 'email';
  templateId: string;
  targetParties: string[];
  scheduledAt?: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'cancelled';
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt?: string;
}

export const CommunicationCenter: React.FC<CommunicationCenterProps> = ({
  parties,
  onRefresh
}) => {
  // Offline sync hook
  const {
    syncStatus,
    saveMessage,
    updateMessage,
    getMessages,
    saveTemplate,
    updateCommunicationTemplate,
    deleteCommunicationTemplate,
    getTemplates,
    forcSync
  } = useCommunicationOfflineSync();

  const [activeTab, setActiveTab] = useState<'messages' | 'templates' | 'campaigns' | 'analytics'>('messages');
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<CommunicationCampaign[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<CommunicationMessage | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CommunicationCampaign | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'sms' | 'email'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'scheduled' | 'sent' | 'delivered' | 'failed'>('all');
  const [filterMessageType, setFilterMessageType] = useState<'all' | 'manual' | 'appointment_reminder' | 'campaign' | 'automated'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Modals
  const composeModal = useModal();
  const campaignModal = useModal();
  const detailModal = useModal();
  const settingsModal = useModal();

  const { success, error } = useToastHelpers();

  // Filtrelenmiş mesajlar
  const filteredMessages = useMemo(() => {
    return messages.filter(message => {
      // Tip filtresi
      if (filterType !== 'all' && message.type !== filterType) return false;

      // Durum filtresi
      if (filterStatus !== 'all' && message.status !== filterStatus) return false;

      // Mesaj tipi filtresi
      if (filterMessageType !== 'all' && message.messageType !== filterMessageType) return false;

      // Arama filtresi
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          message.recipient?.toLowerCase().includes(searchLower) ||
          message.recipientName?.toLowerCase().includes(searchLower) ||
          message.content?.toLowerCase().includes(searchLower) ||
          message.subject?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Tarih aralığı filtresi
      if (dateRange.start && message.createdAt < dateRange.start) return false;
      if (dateRange.end && message.createdAt > dateRange.end) return false;

      return true;
    });
  }, [messages, filterType, filterStatus, filterMessageType, searchTerm, dateRange]);

  // Durum ikonları
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="w-4 h-4 text-gray-500" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'sent': return <Send className="w-4 h-4 text-yellow-500" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Durum renkleri
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'sent': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Durum etiketleri
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Taslak';
      case 'scheduled': return 'Zamanlandı';
      case 'sent': return 'Gönderildi';
      case 'delivered': return 'Teslim Edildi';
      case 'failed': return 'Başarısız';
      default: return 'Bilinmeyen';
    }
  };

  // Mesaj tipi etiketleri
  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'manual': return 'Manuel';
      case 'appointment_reminder': return 'Randevu Hatırlatması';
      case 'campaign': return 'Kampanya';
      case 'automated': return 'Otomatik';
      default: return 'Bilinmeyen';
    }
  };

  // İstatistikler
  const stats = useMemo(() => {
    const total = messages.length;
    const sent = messages.filter(m => m.status === 'sent' || m.status === 'delivered').length;
    const delivered = messages.filter(m => m.status === 'delivered').length;
    const failed = messages.filter(m => m.status === 'failed').length;
    const scheduled = messages.filter(m => m.status === 'scheduled').length;

    return {
      total,
      sent,
      delivered,
      failed,
      scheduled,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      successRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0
    };
  }, [messages]);

  // Load data from offline storage on component mount
  useEffect(() => {
    const loadOfflineData = () => {
      try {
        const offlineMessages = getMessages({});
        const offlineTemplates = getTemplates({});

        // Convert hook's CommunicationTemplate to component's CommunicationTemplate
        const convertedTemplates: CommunicationTemplate[] = offlineTemplates.map(template => ({
          id: template.id,
          name: template.name,
          type: template.templateType,
          subject: template.subject,
          content: template.bodyText,
          variables: template.variables,
          category: template.category as 'appointment' | 'reminder' | 'marketing' | 'notification' | 'custom',
          isActive: template.isActive,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt
        }));

        setMessages(offlineMessages);
        setTemplates(convertedTemplates);
      } catch (err) {
        console.error('Failed to load offline data:', err);
        error('Çevrimdışı veriler yüklenirken hata oluştu');
      }
    };

    loadOfflineData();
  }, [getMessages, getTemplates, error]);

  // Fetch data from API
  const fetchData = async () => {
    if (!syncStatus.isOnline) {
      // Use offline data when offline
      return;
    }

    setIsLoading(true);

    try {
      // Trigger sync if online
      if (syncStatus.isOnline) {
        await forcSync();
      }

      const offlineMessages = getMessages({});
      const offlineTemplates = getTemplates({});

      // Convert hook's CommunicationTemplate to component's CommunicationTemplate
      const convertedTemplates: CommunicationTemplate[] = offlineTemplates.map(template => ({
        id: template.id,
        name: template.name,
        type: template.templateType,
        subject: template.subject,
        content: template.bodyText,
        variables: template.variables,
        category: template.category as 'appointment' | 'reminder' | 'marketing' | 'notification' | 'custom',
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }));

      setMessages(offlineMessages);
      setTemplates(convertedTemplates);

      // In a real implementation, these would be actual API calls
      // const [messagesData, templatesData, campaignsData] = await Promise.all([
      //   fetchMessages(),
      //   fetchTemplates(),
      //   fetchCampaigns()
      // ]);

      success('Veriler başarıyla yüklendi');
    } catch (err) {
      console.error('Failed to fetch data:', err);
      error('Veriler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Mesaj gönder
  const sendMessage = useCallback(async (messageData: Partial<CommunicationMessage>) => {
    setIsSending(true);

    try {
      const newMessage: CommunicationMessage = {
        id: Date.now().toString(),
        type: messageData.type || 'sms',
        recipient: messageData.recipient || '',
        recipientName: messageData.recipientName,
        partyId: messageData.partyId,
        subject: messageData.subject,
        content: messageData.content || '',
        templateId: messageData.templateId,
        scheduledAt: messageData.scheduledAt,
        status: messageData.scheduledAt ? 'scheduled' : 'sent',
        messageType: messageData.messageType || 'manual',
        createdAt: new Date().toISOString(),
        sentAt: messageData.scheduledAt ? undefined : new Date().toISOString()
      };

      // Save to offline storage
      await saveMessage(newMessage);

      setMessages(prev => [newMessage, ...prev]);
      success('Mesaj başarıyla gönderildi');
      composeModal.closeModal();

    } catch (err) {
      error('Mesaj gönderme sırasında hata oluştu');
    } finally {
      setIsSending(false);
    }
  }, [success, error, composeModal, saveMessage]);

  return (
    <div className="space-y-6">
      {/* Başlık ve Kontroller */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">İletişim Merkezi</h2>
            <p className="text-sm text-gray-600 mt-1">
              SMS ve e-posta iletişimlerini yönetin
            </p>
          </div>

          {/* Sync Status Indicator */}
          <div className="flex items-center space-x-2">
            {syncStatus.isOnline ? (
              <div className="flex items-center text-green-600">
                <Wifi className="h-4 w-4 mr-1" />
                <span className="text-sm">Çevrimiçi</span>
              </div>
            ) : (
              <div className="flex items-center text-orange-600">
                <WifiOff className="h-4 w-4 mr-1" />
                <span className="text-sm">Çevrimdışı</span>
              </div>
            )}

            {syncStatus.isSyncing && (
              <div className="flex items-center text-blue-600">
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                <span className="text-sm">Senkronize ediliyor...</span>
              </div>
            )}

            {(syncStatus.pendingCount.messages > 0 ||
              syncStatus.pendingCount.templates > 0 ||
              syncStatus.pendingCount.outbox > 0) && (
                <div className="flex items-center text-amber-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    {syncStatus.pendingCount.messages + syncStatus.pendingCount.templates + syncStatus.pendingCount.outbox} bekleyen değişiklik
                  </span>
                </div>
              )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Force Sync Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={forcSync}
            disabled={syncStatus.isSyncing || !syncStatus.isOnline}
            className="flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
            Senkronize Et
          </Button>

          <Button
            variant="outline"
            onClick={() => settingsModal.openModal()}
          >
            <Settings className="w-4 h-4 mr-2" />
            Ayarlar
          </Button>

          <Button
            onClick={() => composeModal.openModal()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Mesaj
          </Button>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Toplam</p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Send className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Gönderilen</p>
              <p className="text-xl font-semibold">{stats.sent}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Teslim Edilen</p>
              <p className="text-xl font-semibold">{stats.delivered}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Başarısız</p>
              <p className="text-xl font-semibold">{stats.failed}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Zamanlanmış</p>
              <p className="text-xl font-semibold">{stats.scheduled}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Başarı Oranı</p>
              <p className="text-xl font-semibold">%{stats.successRate}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Sekmeler */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <Tabs.List>
          <Tabs.Trigger value="messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Mesajlar
          </Tabs.Trigger>
          <Tabs.Trigger value="templates">
            <FileText className="w-4 h-4 mr-2" />
            Şablonlar
          </Tabs.Trigger>
          <Tabs.Trigger value="campaigns">
            <Users className="w-4 h-4 mr-2" />
            Kampanyalar
          </Tabs.Trigger>
          <Tabs.Trigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analitik
          </Tabs.Trigger>
        </Tabs.List>

        {/* Mesajlar Sekmesi */}
        <Tabs.Content value="messages">
          <div className="space-y-4">
            {/* Filtreler */}
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arama
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Mesaj ara..."
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
                    onChange={(value) => setFilterType(value as any)}
                    options={[
                      { value: 'all', label: 'Tümü' },
                      { value: 'sms', label: 'SMS' },
                      { value: 'email', label: 'E-posta' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durum
                  </label>
                  <Select
                    value={filterStatus}
                    onChange={(value) => setFilterStatus(value as any)}
                    options={[
                      { value: 'all', label: 'Tümü' },
                      { value: 'draft', label: 'Taslak' },
                      { value: 'scheduled', label: 'Zamanlandı' },
                      { value: 'sent', label: 'Gönderildi' },
                      { value: 'delivered', label: 'Teslim Edildi' },
                      { value: 'failed', label: 'Başarısız' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mesaj Tipi
                  </label>
                  <Select
                    value={filterMessageType}
                    onChange={(value) => setFilterMessageType(value as any)}
                    options={[
                      { value: 'all', label: 'Tümü' },
                      { value: 'manual', label: 'Manuel' },
                      { value: 'appointment_reminder', label: 'Randevu Hatırlatması' },
                      { value: 'campaign', label: 'Kampanya' },
                      { value: 'automated', label: 'Otomatik' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tarih Aralığı
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="text-sm"
                    />
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Mesaj Listesi */}
            {filteredMessages.length > 0 ? (
              <div className="space-y-3">
                {filteredMessages.map(message => (
                  <Card key={message.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center space-x-2">
                            {message.type === 'sms' ? (
                              <MessageSquare className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Mail className="w-4 h-4 text-green-500" />
                            )}
                            <span className="font-medium">{message.type.toUpperCase()}</span>
                          </div>

                          <Badge className={getStatusColor(message.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(message.status)}
                              <span>{getStatusLabel(message.status)}</span>
                            </div>
                          </Badge>

                          <Badge variant="secondary">
                            {getMessageTypeLabel(message.messageType)}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Alıcı:</span>
                            <span className="font-medium">
                              {message.recipientName || message.recipient}
                            </span>
                            {message.recipientName && (
                              <span className="text-sm text-gray-500">({message.recipient})</span>
                            )}
                          </div>

                          {message.subject && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">Konu:</span>
                              <span className="font-medium">{message.subject}</span>
                            </div>
                          )}

                          <div className="text-sm text-gray-700 line-clamp-2">
                            {message.content}
                          </div>

                          <div className="flex items-center space-x-4 text-xs text-gray-500">
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

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMessage(message);
                            detailModal.openModal();
                          }}
                        >
                          Detay
                        </Button>

                        {message.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Yeniden gönder
                            }}
                          >
                            Yeniden Gönder
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Mesaj bulunamadı
                </h3>
                <p className="text-gray-600 mb-4">
                  Henüz gönderilmiş mesaj yok veya filtre kriterlerine uygun mesaj bulunamadı.
                </p>
                <Button onClick={() => composeModal.openModal()}>
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Mesajı Gönder
                </Button>
              </Card>
            )}
          </div>
        </Tabs.Content>

        {/* Şablonlar Sekmesi */}
        <Tabs.Content value="templates">
          <CommunicationTemplates />
        </Tabs.Content>

        {/* Kampanyalar Sekmesi */}
        <Tabs.Content value="campaigns">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => campaignModal.openModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Kampanya
              </Button>
            </div>

            <Card className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Kampanya bulunamadı
              </h3>
              <p className="text-gray-600 mb-4">
                Henüz oluşturulmuş kampanya yok.
              </p>
              <Button onClick={() => campaignModal.openModal()}>
                <Plus className="w-4 h-4 mr-2" />
                İlk Kampanyayı Oluştur
              </Button>
            </Card>
          </div>
        </Tabs.Content>

        {/* Analitik Sekmesi */}
        <Tabs.Content value="analytics">
          <CommunicationAnalytics
            dateRange={{
              startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date().toISOString()
            }}
            onRefresh={fetchData}
          />
        </Tabs.Content>
      </Tabs>

      {/* Mesaj Oluştur Modal */}
      <Modal
        isOpen={composeModal.isOpen}
        onClose={composeModal.closeModal}
        title="Yeni Mesaj Oluştur"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Mesaj oluşturma formu yakında eklenecek.
          </p>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={composeModal.closeModal}
            >
              İptal
            </Button>
            <Button
              onClick={() => composeModal.closeModal()}
              loading={isSending}
            >
              Gönder
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detay Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        title="Mesaj Detayları"
        size="lg"
      >
        {selectedMessage && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Tip:</strong> {selectedMessage.type.toUpperCase()}</div>
              <div><strong>Durum:</strong> {getStatusLabel(selectedMessage.status)}</div>
              <div><strong>Alıcı:</strong> {selectedMessage.recipientName || selectedMessage.recipient}</div>
              <div><strong>Mesaj Tipi:</strong> {getMessageTypeLabel(selectedMessage.messageType)}</div>
            </div>

            {selectedMessage.subject && (
              <div>
                <strong>Konu:</strong>
                <p className="mt-1">{selectedMessage.subject}</p>
              </div>
            )}

            <div>
              <strong>İçerik:</strong>
              <p className="mt-1 whitespace-pre-wrap">{selectedMessage.content}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div><strong>Oluşturulma:</strong> {new Date(selectedMessage.createdAt).toLocaleString('tr-TR')}</div>
              {selectedMessage.sentAt && (
                <div><strong>Gönderilme:</strong> {new Date(selectedMessage.sentAt).toLocaleString('tr-TR')}</div>
              )}
              {selectedMessage.deliveredAt && (
                <div><strong>Teslim:</strong> {new Date(selectedMessage.deliveredAt).toLocaleString('tr-TR')}</div>
              )}
              {selectedMessage.errorMessage && (
                <div className="col-span-2"><strong>Hata:</strong> {selectedMessage.errorMessage}</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CommunicationCenter;