import { useState, useEffect, useCallback } from 'react';
import {
  createCommunicationTemplates,
  updateCommunicationTemplate,
  deleteCommunicationTemplate,
  listCommunicationTemplates,
  listCommunicationMessages,
  createCommunicationMessageSendSms,
  createCommunicationMessageSendEmail
} from '@/api/client/communications.client';

// Simplified types without idb dependency for now
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
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncAttempt?: string;
}

interface CommunicationTemplate {
  id: string;
  name: string;
  description?: string;
  templateType: 'sms' | 'email';
  category?: string;
  subject?: string;
  bodyText: string;
  bodyHtml?: string;
  variables: string[];
  isActive: boolean;
  isSystem: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncAttempt?: string;
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: {
    messages: number;
    templates: number;
    outbox: number;
  };
  lastSyncTime?: Date;
  error?: string;
}

// Simple localStorage-based implementation for now
class SimpleCommunicationSync {
  private readonly STORAGE_KEYS = {
    messages: 'communication_messages',
    templates: 'communication_templates',
    outbox: 'communication_outbox',
    syncMetadata: 'communication_sync_metadata'
  };

  private syncInProgress = false;
  private listeners: Set<() => void> = new Set();

  // Event handling
  addListener(callback: () => void): void {
    this.listeners.add(callback);
  }

  removeListener(callback: () => void): void {
    this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  // Messages
  async saveMessage(message: Omit<CommunicationMessage, 'syncStatus'>): Promise<void> {
    const messages = this.getMessages();
    const messageWithSync: CommunicationMessage = {
      ...message,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString()
    };

    messages.push(messageWithSync);
    localStorage.setItem(this.STORAGE_KEYS.messages, JSON.stringify(messages));

    // Add to outbox
    this.addToOutbox('create', 'message', message.id, messageWithSync);
    this.notifyListeners();

    // Attempt sync if online
    if (navigator.onLine) {
      this.syncOutbox();
    }
  }

  async updateMessage(id: string, updates: Partial<CommunicationMessage>): Promise<void> {
    const messages = this.getMessages();
    const index = messages.findIndex(m => m.id === id);

    if (index === -1) throw new Error('Message not found');

    messages[index] = {
      ...messages[index],
      ...updates,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(this.STORAGE_KEYS.messages, JSON.stringify(messages));
    this.addToOutbox('update', 'message', id, updates);
    this.notifyListeners();

    if (navigator.onLine) {
      this.syncOutbox();
    }
  }

  getMessages(filters?: {
    type?: 'sms' | 'email';
    status?: string;
    partyId?: string;
    limit?: number;
    offset?: number;
  }): CommunicationMessage[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.messages);
    let messages: CommunicationMessage[] = stored ? JSON.parse(stored) : [];

    // Apply filters
    if (filters?.type) {
      messages = messages.filter(m => m.type === filters.type);
    }
    if (filters?.status) {
      messages = messages.filter(m => m.status === filters.status);
    }
    if (filters?.partyId) {
      messages = messages.filter(m => m.partyId === filters.partyId);
    }

    // Sort by created date (newest first)
    messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    if (filters?.offset || filters?.limit) {
      const start = filters.offset || 0;
      const end = filters.limit ? start + filters.limit : undefined;
      messages = messages.slice(start, end);
    }

    return messages;
  }

  // Templates
  async saveTemplate(template: Omit<CommunicationTemplate, 'syncStatus'>): Promise<void> {
    const templates = this.getTemplates();
    const templateWithSync: CommunicationTemplate = {
      ...template,
      syncStatus: 'pending'
    };

    templates.push(templateWithSync);
    localStorage.setItem(this.STORAGE_KEYS.templates, JSON.stringify(templates));

    this.addToOutbox('create', 'template', template.id, templateWithSync);
    this.notifyListeners();

    if (navigator.onLine) {
      this.syncOutbox();
    }
  }

  async updateCommunicationTemplate(id: string, updates: Partial<CommunicationTemplate>): Promise<void> {
    const templates = this.getTemplates();
    const index = templates.findIndex(t => t.id === id);

    if (index === -1) throw new Error('Template not found');

    templates[index] = {
      ...templates[index],
      ...updates,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(this.STORAGE_KEYS.templates, JSON.stringify(templates));
    this.addToOutbox('update', 'template', id, updates);
    this.notifyListeners();

    if (navigator.onLine) {
      this.syncOutbox();
    }
  }

  async deleteCommunicationTemplate(id: string): Promise<void> {
    const templates = this.getTemplates();
    const filtered = templates.filter(t => t.id !== id);

    localStorage.setItem(this.STORAGE_KEYS.templates, JSON.stringify(filtered));
    this.addToOutbox('delete', 'template', id, null);
    this.notifyListeners();

    if (navigator.onLine) {
      this.syncOutbox();
    }
  }

  getTemplates(filters?: {
    type?: 'sms' | 'email';
    category?: string;
    active?: boolean;
  }): CommunicationTemplate[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.templates);
    let templates: CommunicationTemplate[] = stored ? JSON.parse(stored) : [];

    // Apply filters
    if (filters?.type) {
      templates = templates.filter(t => t.templateType === filters.type);
    }
    if (filters?.category) {
      templates = templates.filter(t => t.category === filters.category);
    }
    if (filters?.active !== undefined) {
      templates = templates.filter(t => t.isActive === filters.active);
    }

    // Sort by name
    templates.sort((a, b) => a.name.localeCompare(b.name));

    return templates;
  }

  // Outbox management
  private addToOutbox(action: string, entityType: string, entityId: string, data: any): void {
    const stored = localStorage.getItem(this.STORAGE_KEYS.outbox);
    const outbox = stored ? JSON.parse(stored) : [];

    outbox.push({
      id: `${entityType}_${action}_${entityId}_${Date.now()}`,
      action,
      entityType,
      entityId,
      data,
      createdAt: new Date().toISOString(),
      retryCount: 0
    });

    localStorage.setItem(this.STORAGE_KEYS.outbox, JSON.stringify(outbox));
  }

  async syncOutbox(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return;

    this.syncInProgress = true;
    this.notifyListeners();

    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.outbox);
      const outbox = stored ? JSON.parse(stored) : [];
      const remaining: any[] = [];

      for (const item of outbox) {
        try {
          await this.syncOutboxItem(item);
          // Successfully synced, don't add to remaining
        } catch (error) {
          console.error('Failed to sync outbox item:', item.id, error);
          item.retryCount++;
          item.lastRetryAt = new Date().toISOString();
          item.error = error instanceof Error ? error.message : 'Unknown error';
          remaining.push(item);
        }
      }

      localStorage.setItem(this.STORAGE_KEYS.outbox, JSON.stringify(remaining));
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async syncOutboxItem(item: any): Promise<void> {
    try {
      if (item.entityType === 'template') {
        if (item.action === 'create') {
          await createCommunicationTemplates(item.data);
        } else if (item.action === 'update') {
          await updateCommunicationTemplate(item.entityId, item.data);
        } else if (item.action === 'delete') {
          await deleteCommunicationTemplate(item.entityId);
        }
      } else if (item.entityType === 'message') {
        if (item.action === 'create') {
          const msgData = item.data;
          if (msgData.type === 'sms') {
            await createCommunicationMessageSendSms({
              phoneNumber: msgData.recipient,
              message: msgData.content,
              partyId: msgData.partyId
            });
          } else if (msgData.type === 'email') {
            await createCommunicationMessageSendEmail({
              toEmail: msgData.recipient,
              subject: msgData.subject || 'No Subject',
              bodyText: msgData.content,
              partyId: msgData.partyId
            });
          }
        }
      }

    } catch (error) {
      throw new Error(`Failed to sync ${item.action} ${item.entityType}: ${error}`);
    }

    // Update local sync status
    if (item.action !== 'delete') {
      if (item.entityType === 'message') {
        const messages = this.getMessages();
        const index = messages.findIndex(m => m.id === item.entityId);
        if (index !== -1) {
          messages[index].syncStatus = 'synced';
          localStorage.setItem(this.STORAGE_KEYS.messages, JSON.stringify(messages));
        }
      } else if (item.entityType === 'template') {
        const templates = this.getTemplates();
        const index = templates.findIndex(t => t.id === item.entityId);
        if (index !== -1) {
          templates[index].syncStatus = 'synced';
          localStorage.setItem(this.STORAGE_KEYS.templates, JSON.stringify(templates));
        }
      }
    }
  }

  // Sync from server
  async syncFromServer(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      await Promise.all([
        this.syncMessagesFromServer(),
        this.syncTemplatesFromServer()
      ]);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to sync from server:', error);
    }
  }

  private async syncMessagesFromServer(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const response = await listCommunicationMessages();
      const result = (response as unknown as { data: unknown })?.data || response;

      if (!(result as Record<string, unknown>).success) return;

      const serverMessages: CommunicationMessage[] = ((result as Record<string, unknown>).data as Record<string, unknown>[])?.map((msg: Record<string, unknown>) => ({
        ...msg,
        // Ensure properties match CommunicationMessage interface
        id: msg.id as string,
        type: msg.type as 'sms' | 'email',
        recipient: msg.recipient as string,
        recipientName: msg.recipientName as string,
        partyId: msg.partyId as string,
        subject: msg.subject as string,
        content: msg.content as string,
        templateId: msg.templateId as string,
        scheduledAt: msg.scheduledAt as string,
        sentAt: msg.sentAt as string,
        deliveredAt: msg.deliveredAt as string,
        status: msg.status as 'draft' | 'scheduled' | 'sent' | 'delivered' | 'failed',
        errorMessage: msg.errorMessage as string,
        campaignId: msg.campaignId as string,
        messageType: msg.messageType as 'manual' | 'appointment_reminder' | 'campaign' | 'automated',
        createdAt: msg.createdAt as string,
        updatedAt: msg.updatedAt as string,
        syncStatus: 'synced' as const
      })) || [];

      // Merge with local messages
      const localMessages = this.getMessages();
      const merged = [...serverMessages];

      localMessages.forEach(local => {
        if (!serverMessages.find(server => server.id === local.id)) {
          merged.push(local);
        }
      });

      localStorage.setItem(this.STORAGE_KEYS.messages, JSON.stringify(merged));
    } catch (error) {
      console.error('Failed to sync messages from server:', error);
    }
  }

  private async syncTemplatesFromServer(): Promise<void> {
    try {
      const response = await listCommunicationTemplates();

      const result = (response as unknown as { data: unknown })?.data || response;
      if (!(result as Record<string, unknown>).success) return;

      const serverTemplates: CommunicationTemplate[] = ((result as Record<string, unknown>).data as Record<string, unknown>[])?.map((tmpl: Record<string, unknown>) => ({
        ...tmpl,
        // Ensure properties match CommunicationTemplate interface
        id: tmpl.id as string,
        name: tmpl.name as string,
        description: tmpl.description as string,
        templateType: tmpl.templateType as 'sms' | 'email',
        category: tmpl.category as string,
        subject: tmpl.subject as string,
        bodyText: tmpl.bodyText as string,
        bodyHtml: tmpl.bodyHtml as string,
        variables: tmpl.variables as string[],
        isActive: tmpl.isActive as boolean,
        isSystem: tmpl.isSystem as boolean,
        usageCount: tmpl.usageCount as number,
        createdAt: tmpl.createdAt as string,
        updatedAt: tmpl.updatedAt as string,
        syncStatus: 'synced' as const
      })) || [];

      // Merge with local templates
      const localTemplates = this.getTemplates();
      const merged = [...serverTemplates];

      // Add local templates that aren't on server
      localTemplates.forEach(local => {
        if (!serverTemplates.find(server => server.id === local.id)) {
          merged.push(local);
        }
      });

      localStorage.setItem(this.STORAGE_KEYS.templates, JSON.stringify(merged));
    } catch (error) {
      console.error('Failed to sync templates from server:', error);
    }
  }

  // Status methods
  getPendingSyncCount(): { messages: number; templates: number; outbox: number } {
    const messages = this.getMessages().filter(m => m.syncStatus === 'pending');
    const templates = this.getTemplates().filter(t => t.syncStatus === 'pending');
    const stored = localStorage.getItem(this.STORAGE_KEYS.outbox);
    const outbox = stored ? JSON.parse(stored) : [];

    return {
      messages: messages.length,
      templates: templates.length,
      outbox: outbox.length
    };
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }
}

// Singleton instance
const communicationSync = new SimpleCommunicationSync();

// React hook
export const useCommunicationOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: { messages: 0, templates: 0, outbox: 0 }
  });

  const updateSyncStatus = useCallback(() => {
    setSyncStatus({
      isOnline: communicationSync.isOnline(),
      isSyncing: communicationSync.isSyncInProgress(),
      pendingCount: communicationSync.getPendingSyncCount()
    });
  }, []);

  useEffect(() => {
    // Initial status
    updateSyncStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      updateSyncStatus();
      communicationSync.syncOutbox();
      communicationSync.syncFromServer();
    };

    const handleOffline = () => {
      updateSyncStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync changes
    communicationSync.addListener(updateSyncStatus);

    // Periodic sync - reduced from 30s to 5 minutes to prevent excessive requests
    const interval = setInterval(() => {
      if (navigator.onLine) {
        communicationSync.syncOutbox();
        communicationSync.syncFromServer();
      }
    }, 300000); // Changed from 30000 (30s) to 300000 (5 minutes)

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      communicationSync.removeListener(updateSyncStatus);
      clearInterval(interval);
    };
  }, [updateSyncStatus]);

  // API methods
  const saveMessage = useCallback(async (message: Omit<CommunicationMessage, 'syncStatus'>) => {
    await communicationSync.saveMessage(message);
    updateSyncStatus();
  }, [updateSyncStatus]);

  const updateMessage = useCallback(async (id: string, updates: Partial<CommunicationMessage>) => {
    await communicationSync.updateMessage(id, updates);
    updateSyncStatus();
  }, [updateSyncStatus]);

  const getMessages = useCallback((filters?: {
    type?: 'sms' | 'email';
    status?: string;
    partyId?: string;
    limit?: number;
    offset?: number;
  }) => {
    return communicationSync.getMessages(filters);
  }, []);

  const saveTemplate = useCallback(async (template: Omit<CommunicationTemplate, 'syncStatus'>) => {
    await communicationSync.saveTemplate(template);
    updateSyncStatus();
  }, [updateSyncStatus]);

  const updateCommunicationTemplate = useCallback(async (id: string, updates: Partial<CommunicationTemplate>) => {
    await communicationSync.updateCommunicationTemplate(id, updates);
    updateSyncStatus();
  }, [updateSyncStatus]);

  const deleteCommunicationTemplate = useCallback(async (id: string) => {
    await communicationSync.deleteCommunicationTemplate(id);
    updateSyncStatus();
  }, [updateSyncStatus]);

  const getTemplates = useCallback((filters?: {
    type?: 'sms' | 'email';
    category?: string;
    active?: boolean;
  }) => {
    return communicationSync.getTemplates(filters);
  }, []);

  const forcSync = useCallback(async () => {
    await communicationSync.syncOutbox();
    await communicationSync.syncFromServer();
    updateSyncStatus();
  }, [updateSyncStatus]);

  return {
    syncStatus,
    saveMessage,
    updateMessage,
    getMessages,
    saveTemplate,
    updateCommunicationTemplate,
    deleteCommunicationTemplate,
    getTemplates,
    forcSync
  };
};