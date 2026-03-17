import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  MessageCircle,
  Mail,
  Send,
  Users,
  Search,
  Plus,
  Settings,
  BarChart3,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { Button, Modal, useModal, Card, Badge, Input, Select, Tabs, Textarea, useToastHelpers } from '@x-ear/ui-web';
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
  campaignId?: string;
  messageType: 'manual' | 'appointment_reminder' | 'campaign' | 'automated';
  createdAt: string;
  updatedAt?: string;
}

interface CommunicationThread {
  key: string;
  type: 'sms' | 'email' | 'whatsapp';
  recipient: string;
  recipientName?: string;
  partyId?: string;
  latestMessage: CommunicationMessage;
  messages: CommunicationMessage[];
}



/*
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
*/

export const CommunicationCenter: React.FC<CommunicationCenterProps> = ({ parties }) => {
  // Offline sync hook
  const {
    syncStatus,
    saveMessage,
    getMessages,
    getTemplates,
    forcSync
  } = useCommunicationOfflineSync();

  const [activeTab, setActiveTab] = useState<'messages' | 'templates' | 'campaigns' | 'analytics'>('messages');
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  // const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  // const [campaigns, setCampaigns] = useState<CommunicationCampaign[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<CommunicationMessage | null>(null);
  const [composeType, setComposeType] = useState<'sms' | 'email' | 'whatsapp'>('sms');
  const [composePartyId, setComposePartyId] = useState<string>('');
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeRecipientName, setComposeRecipientName] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [composeMode, setComposeMode] = useState<'new' | 'reply'>('new');

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'sms' | 'email' | 'whatsapp'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'scheduled' | 'sent' | 'delivered' | 'failed'>('all');
  const [filterMessageType, setFilterMessageType] = useState<'all' | 'manual' | 'appointment_reminder' | 'campaign' | 'automated'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Loading states
  // const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Modals
  const composeModal = useModal();
  const campaignModal = useModal();
  const detailModal = useModal();
  const settingsModal = useModal();

  const { success, error } = useToastHelpers();

  const partyOptions = useMemo(() => parties.map((party) => ({
    value: party.id || '',
    label: `${party.firstName || ''} ${party.lastName || ''}`.trim() || party.email || party.phone || 'İsimsiz Kayıt'
  })), [parties]);

  const getThreadKey = useCallback((message: CommunicationMessage) => (
    `${message.type}:${message.partyId || message.recipient}`
  ), []);

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

  const filteredThreads = useMemo(() => {
    const threadMap = new Map<string, CommunicationThread>();

    filteredMessages.forEach((message) => {
      const key = getThreadKey(message);
      const existing = threadMap.get(key);
      if (!existing) {
        threadMap.set(key, {
          key,
          type: message.type,
          recipient: message.recipient,
          recipientName: message.recipientName,
          partyId: message.partyId,
          latestMessage: message,
          messages: [message],
        });
        return;
      }

      existing.messages.push(message);
      const existingDate = new Date(existing.latestMessage.createdAt).getTime();
      const messageDate = new Date(message.createdAt).getTime();
      if (messageDate > existingDate) {
        existing.latestMessage = message;
        existing.recipient = message.recipient;
        existing.recipientName = message.recipientName;
      }
    });

    return Array.from(threadMap.values())
      .map((thread) => ({
        ...thread,
        messages: [...thread.messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      }))
      .sort((a, b) => new Date(b.latestMessage.createdAt).getTime() - new Date(a.latestMessage.createdAt).getTime());
  }, [filteredMessages, getThreadKey]);

  const selectedThreadMessages = useMemo(() => {
    if (!selectedMessage) {
      return [];
    }
    const targetKey = getThreadKey(selectedMessage);
    return messages
      .filter((message) => getThreadKey(message) === targetKey)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [getThreadKey, messages, selectedMessage]);

  // Durum ikonları
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="w-4 h-4 text-muted-foreground" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-primary" />;
      case 'sent': return <Send className="w-4 h-4 text-yellow-500" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Durum renkleri
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-muted text-foreground';
      case 'scheduled': return 'bg-primary/10 text-blue-800';
      case 'sent': return 'bg-warning/10 text-yellow-800';
      case 'delivered': return 'bg-success/10 text-success';
      case 'failed': return 'bg-destructive/10 text-red-800';
      default: return 'bg-muted text-foreground';
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
    const loadOfflineData = async () => {
      try {
        const _offlineMessages = await getMessages({});
        // const offlineTemplates = await getTemplates({});

        setMessages(_offlineMessages);
      } catch (err: unknown) {
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

    /*
        setIsLoading(true);
    */

    try {
      // Trigger sync if online
      if (syncStatus.isOnline) {
        await forcSync();
      }

      const _offlineMessages = await getMessages({});
      // const offlineTemplates = await getTemplates({});

      // Convert hook's CommunicationTemplate to component's CommunicationTemplate
      /*
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
      */

      setMessages(_offlineMessages);
      // setTemplates(convertedTemplates);

      // In a real implementation, these would be actual API calls
      // const [messagesData, templatesData, campaignsData] = await Promise.all([
      // fetchMessages(),
      // fetchTemplates(),
      // fetchCampaigns()
      // ]);

      success('Veriler başarıyla yüklendi');
    } catch (err) {
      console.error('Failed to fetch data:', err);
      error('Veriler yüklenirken hata oluştu');
      /*
          } finally {
            setIsLoading(false);
          }
      */
    } finally {
      // setIsLoading(false);
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
      setComposePartyId('');
      setComposeRecipient('');
      setComposeRecipientName('');
      setComposeSubject('');
      setComposeContent('');
      setComposeType('sms');

    } catch (err) {
      error('Mesaj gönderme sırasında hata oluştu');
    } finally {
      setIsSending(false);
    }
  }, [success, error, composeModal, saveMessage]);

  const handleComposePartyChange = useCallback((partyId: string) => {
    setComposePartyId(partyId);
    const selectedParty = parties.find((party) => party.id === partyId);
    if (!selectedParty) {
      return;
    }
    const recipient = composeType === 'email' ? (selectedParty.email || '') : (selectedParty.phone || '');
    setComposeRecipient(recipient);
    setComposeRecipientName(`${selectedParty.firstName || ''} ${selectedParty.lastName || ''}`.trim());
  }, [composeType, parties]);

  const handleSubmitCompose = useCallback(async () => {
    if (!composeRecipient.trim()) {
      error('Alıcı bilgisi zorunlu');
      return;
    }
    if (!composeContent.trim()) {
      error('Mesaj içeriği zorunlu');
      return;
    }
    if (composeType === 'email' && !composeSubject.trim()) {
      error('E-posta için konu zorunlu');
      return;
    }

    await sendMessage({
      type: composeType,
      recipient: composeRecipient,
      recipientName: composeRecipientName || undefined,
      partyId: composePartyId || undefined,
      subject: composeType === 'email' ? composeSubject : undefined,
      content: composeContent,
      messageType: 'manual',
    });
  }, [composeContent, composePartyId, composeRecipient, composeRecipientName, composeSubject, composeType, error, sendMessage]);

  const openComposeModal = useCallback(() => {
    setComposeMode('new');
    setComposeType('sms');
    setComposePartyId('');
    setComposeRecipient('');
    setComposeRecipientName('');
    setComposeSubject('');
    setComposeContent('');
    composeModal.openModal();
  }, [composeModal]);

  const openReplyModal = useCallback((message: CommunicationMessage) => {
    setComposeMode('reply');
    setComposeType(message.type);
    setComposePartyId(message.partyId || '');
    setComposeRecipient(message.recipient || '');
    setComposeRecipientName(message.recipientName || '');
    setComposeSubject(message.type === 'email' ? `Re: ${message.subject || ''}`.trim() : '');
    setComposeContent('');
    detailModal.closeModal();
    composeModal.openModal();
  }, [composeModal, detailModal]);

  console.log('sendMessage defined:', !!sendMessage); // Use sendMessage to avoid unused var error

  return (
    <div className="space-y-6">
      {/* Başlık ve Kontroller */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">İletişim Merkezi</h2>
            <p className="text-sm text-muted-foreground mt-1">
              SMS, WhatsApp ve e-posta iletişimlerini yönetin
            </p>
          </div>

          {/* Sync Status Indicator */}
          <div className="flex items-center space-x-2">
            {syncStatus.isOnline ? (
              <div className="flex items-center text-success">
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
              <div className="flex items-center text-primary">
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
            onClick={openComposeModal}
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
            <div className="p-2 bg-primary/10 rounded-2xl">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Toplam</p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-warning/10 rounded-2xl">
              <Send className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gönderilen</p>
              <p className="text-xl font-semibold">{stats.sent}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-success/10 rounded-2xl">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teslim Edilen</p>
              <p className="text-xl font-semibold">{stats.delivered}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-destructive/10 rounded-2xl">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Başarısız</p>
              <p className="text-xl font-semibold">{stats.failed}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-2xl">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Zamanlanmış</p>
              <p className="text-xl font-semibold">{stats.scheduled}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-2xl">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Başarı Oranı</p>
              <p className="text-xl font-semibold">%{stats.successRate}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Sekmeler */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'messages' | 'templates' | 'campaigns' | 'analytics')}>
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
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Arama
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Mesaj ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Tip
                  </label>
                  <Select
                    value={filterType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value as 'all' | 'sms' | 'email' | 'whatsapp')}
                    options={[
                      { value: 'all', label: 'Tümü' },
                      { value: 'sms', label: 'SMS' },
                      { value: 'whatsapp', label: 'WhatsApp' },
                      { value: 'email', label: 'E-posta' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Durum
                  </label>
                  <Select
                    value={filterStatus}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value as 'all' | 'draft' | 'scheduled' | 'sent' | 'delivered' | 'failed')}
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
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Mesaj Tipi
                  </label>
                  <Select
                    value={filterMessageType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterMessageType(e.target.value as 'all' | 'manual' | 'appointment_reminder' | 'campaign' | 'automated')}
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
                  <label className="block text-sm font-medium text-foreground mb-1">
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
            {filteredThreads.length > 0 ? (
              <div className="space-y-3">
                {filteredThreads.map(thread => {
                  const message = thread.latestMessage;
                  return (
                  <Card key={thread.key} className="p-4 hover:shadow-md transition-shadow">
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
                            <span className="text-sm text-muted-foreground">Konuşma:</span>
                            <span className="font-medium">
                              {message.recipientName || message.recipient}
                            </span>
                            {message.recipientName && (
                              <span className="text-sm text-muted-foreground">({message.recipient})</span>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {thread.messages.length} mesaj
                          </div>

                          {message.subject && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground">Konu:</span>
                              <span className="font-medium">{message.subject}</span>
                            </div>
                          )}

                          <div className="text-sm text-foreground line-clamp-2">
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

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMessage(message);
                            detailModal.openModal();
                          }}
                        >
                          Sohbeti Aç
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
                )})}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Mesaj bulunamadı
                </h3>
                <p className="text-muted-foreground mb-4">
                  Henüz gönderilmiş mesaj yok veya filtre kriterlerine uygun mesaj bulunamadı.
                </p>
                <Button onClick={openComposeModal}>
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
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Kampanya bulunamadı
              </h3>
              <p className="text-muted-foreground mb-4">
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
        title={composeMode === 'reply' ? 'Hızlı Yanıt' : 'Yeni Mesaj Oluştur'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Kanal</label>
              <Select
                value={composeType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const nextType = e.target.value as 'sms' | 'email' | 'whatsapp';
                  setComposeType(nextType);
                  if (composePartyId) {
                    const selectedParty = parties.find((party) => party.id === composePartyId);
                    if (selectedParty) {
                      setComposeRecipient(nextType === 'email' ? (selectedParty.email || '') : (selectedParty.phone || ''));
                    }
                  }
                }}
                options={[
                  { value: 'sms', label: 'SMS' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'email', label: 'E-posta' }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Hasta Seç</label>
              <Select
                value={composePartyId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleComposePartyChange(e.target.value)}
                options={[{ value: '', label: 'Manuel alıcı' }, ...partyOptions]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {composeType === 'email' ? 'E-posta Adresi' : 'Telefon / WhatsApp Numarası'}
              </label>
              <Input
                value={composeRecipient}
                onChange={(e) => setComposeRecipient(e.target.value)}
                placeholder={composeType === 'email' ? 'ornek@site.com' : '905xxxxxxxxx'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Alıcı Adı</label>
              <Input
                value={composeRecipientName}
                onChange={(e) => setComposeRecipientName(e.target.value)}
                placeholder="Alıcı adı"
              />
            </div>
          </div>

          {composeType === 'email' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Konu</label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="E-posta konusu"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Mesaj</label>
            <Textarea
              value={composeContent}
              onChange={(e) => setComposeContent(e.target.value)}
              placeholder={composeType === 'email' ? 'E-posta içeriği' : composeType === 'whatsapp' ? 'WhatsApp mesajı' : 'SMS içeriği'}
              rows={composeType === 'email' ? 8 : 5}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={composeModal.closeModal}
            >
              İptal
            </Button>
            <Button
              onClick={() => void handleSubmitCompose()}
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
        title="Konuşma Akışı"
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

            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
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

            <div className="rounded-2xl border bg-muted p-4 max-h-[420px] overflow-y-auto space-y-3">
              {selectedThreadMessages.map((message) => {
                const isOutbound = message.messageType !== 'automated';
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        isOutbound
                          ? 'bg-emerald-600 text-white'
                          : 'bg-card text-foreground border'
                      }`}
                    >
                      <div className="text-xs opacity-80 mb-1">
                        {isOutbound ? 'Giden' : 'Gelen'} • {new Date(message.createdAt).toLocaleString('tr-TR')}
                      </div>
                      {message.subject ? <div className="text-sm font-medium mb-1">{message.subject}</div> : null}
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => openReplyModal(selectedMessage)}>
                <Send className="w-4 h-4 mr-2" />
                Hızlı Yanıtla
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CommunicationCenter;
