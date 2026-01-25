import { useState, useEffect, useCallback } from 'react';
import {
  COMMUNICATION_SYNC_METADATA
} from '../constants/storage-keys';
import {
  listCommunicationTemplates,
  listCommunicationMessages
} from '@/api/client/communications.client';
import { indexedDBManager } from '../utils/indexeddb';
import { outbox } from '../utils/outbox';
import { IndexedDBManager } from '../utils/indexeddb';

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

// IndexedDB-based implementation
class CommunicationSyncManager {
  private readonly STORES = IndexedDBManager.STORES;
  private readonly METADATA_KEY = COMMUNICATION_SYNC_METADATA;

  private syncInProgress = false;
  private listeners: Set<() => void> = new Set();

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
    const messageWithSync: CommunicationMessage = {
      ...message,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString()
    };

    await indexedDBManager.put(this.STORES.MESSAGES, messageWithSync);

    // Add to general outbox
    const endpoint = message.type === 'sms' 
      ? '/communications/messages/send-sms' 
      : '/communications/messages/send-email';
    
    const payload = message.type === 'sms'
      ? { phoneNumber: message.recipient, message: message.content, partyId: message.partyId }
      : { toEmail: message.recipient, subject: message.subject || 'No Subject', bodyText: message.content, partyId: message.partyId };

    await outbox.addOperation({
      method: 'POST',
      endpoint,
      data: payload,
      meta: { entityType: 'message', entityId: message.id }
    });

    this.notifyListeners();
  }

  async updateMessage(id: string, updates: Partial<CommunicationMessage>): Promise<void> {
    const messages = await this.getMessages();
    const message = messages.find(m => m.id === id);

    if (!message) throw new Error('Message not found');

    const updatedMessage = {
      ...message,
      ...updates,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString()
    };

    await indexedDBManager.put(this.STORES.MESSAGES, updatedMessage);
    // Note: Most message updates (status change etc) happen server-side, 
    // but if we had a local update, we'd add to outbox here.
    
    this.notifyListeners();
  }

  async getMessages(filters?: {
    type?: 'sms' | 'email';
    status?: string;
    partyId?: string;
    limit?: number;
    offset?: number;
  }): Promise<CommunicationMessage[]> {
    let messages = await indexedDBManager.getAll<CommunicationMessage>(this.STORES.MESSAGES);

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
    const templateWithSync: CommunicationTemplate = {
      ...template,
      syncStatus: 'pending'
    };

    await indexedDBManager.put(this.STORES.TEMPLATES, templateWithSync);

    await outbox.addOperation({
      method: 'POST',
      endpoint: '/communications/templates',
      data: template,
      meta: { entityType: 'template', entityId: template.id }
    });

    this.notifyListeners();
  }

  async updateCommunicationTemplate(id: string, updates: Partial<CommunicationTemplate>): Promise<void> {
    const templates = await this.getTemplates();
    const template = templates.find(t => t.id === id);

    if (!template) throw new Error('Template not found');

    const updatedTemplate = {
      ...template,
      ...updates,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString()
    };

    await indexedDBManager.put(this.STORES.TEMPLATES, updatedTemplate);
    
    await outbox.addOperation({
      method: 'PUT',
      endpoint: `/communications/templates/${id}`,
      data: updates,
      meta: { entityType: 'template', entityId: id }
    });

    this.notifyListeners();
  }

  async deleteCommunicationTemplate(id: string): Promise<void> {
    await indexedDBManager.delete(this.STORES.TEMPLATES, id);
    
    await outbox.addOperation({
      method: 'DELETE',
      endpoint: `/communications/templates/${id}`,
      meta: { entityType: 'template', entityId: id }
    });

    this.notifyListeners();
  }

  async getTemplates(filters?: {
    type?: 'sms' | 'email';
    category?: string;
    active?: boolean;
  }): Promise<CommunicationTemplate[]> {
    let templates = await indexedDBManager.getAll<CommunicationTemplate>(this.STORES.TEMPLATES);

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

  // Sync from server
  async syncFromServer(): Promise<void> {
    if (!navigator.onLine || this.syncInProgress) return;

    this.syncInProgress = true;
    this.notifyListeners();

    try {
      await Promise.all([
        this.syncMessagesFromServer(),
        this.syncTemplatesFromServer()
      ]);
      
      localStorage.setItem(this.METADATA_KEY, JSON.stringify({
        lastSyncTime: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to sync from server:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async syncMessagesFromServer(): Promise<void> {
    try {
      const response = await listCommunicationMessages();
      const result = (response as any)?.data || response;

      if (!result.success) return;

      const serverMessages = result.data.map((msg: any) => ({
        ...msg,
        syncStatus: 'synced'
      }));

      // In a real app, we'd do a more sophisticated merge
      // For now, we update local DB with server truth
      for (const msg of serverMessages) {
        await indexedDBManager.put(this.STORES.MESSAGES, msg);
      }
    } catch (error) {
      console.error('Failed to sync messages from server:', error);
    }
  }

  private async syncTemplatesFromServer(): Promise<void> {
    try {
      const response = await listCommunicationTemplates();
      const result = (response as any)?.data || response;

      if (!result.success) return;

      const serverTemplates = result.data.map((tmpl: any) => ({
        ...tmpl,
        syncStatus: 'synced'
      }));

      for (const tmpl of serverTemplates) {
        await indexedDBManager.put(this.STORES.TEMPLATES, tmpl);
      }
    } catch (error) {
      console.error('Failed to sync templates from server:', error);
    }
  }

  // Status methods
  async getPendingSyncCount(): Promise<{ messages: number; templates: number; outbox: number }> {
    const messages = await this.getMessages();
    const templates = await this.getTemplates();
    const stats = await outbox.getStats();

    return {
      messages: messages.filter(m => m.syncStatus === 'pending').length,
      templates: templates.filter(t => t.syncStatus === 'pending').length,
      outbox: stats.pending
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
const communicationSync = new CommunicationSyncManager();

// React hook
export const useCommunicationOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: { messages: 0, templates: 0, outbox: 0 }
  });

  const updateSyncStatus = useCallback(async () => {
    const pendingCount = await communicationSync.getPendingSyncCount();
    setSyncStatus({
      isOnline: communicationSync.isOnline(),
      isSyncing: communicationSync.isSyncInProgress(),
      pendingCount
    });
  }, []);

  useEffect(() => {
    updateSyncStatus();

    const handleOnline = () => {
      updateSyncStatus();
      outbox.syncPendingOperations();
      communicationSync.syncFromServer();
    };

    const handleOffline = () => {
      updateSyncStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    communicationSync.addListener(updateSyncStatus);

    // Initial sync
    if (navigator.onLine) {
      communicationSync.syncFromServer();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      communicationSync.removeListener(updateSyncStatus);
    };
  }, [updateSyncStatus]);

  // API methods
  const saveMessage = useCallback(async (message: Omit<CommunicationMessage, 'syncStatus'>) => {
    await communicationSync.saveMessage(message);
    await updateSyncStatus();
  }, [updateSyncStatus]);

  const updateMessage = useCallback(async (id: string, updates: Partial<CommunicationMessage>) => {
    await communicationSync.updateMessage(id, updates);
    await updateSyncStatus();
  }, [updateSyncStatus]);

  const getMessages = useCallback(async (filters?: {
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
    await updateSyncStatus();
  }, [updateSyncStatus]);

  const updateCommunicationTemplate = useCallback(async (id: string, updates: Partial<CommunicationTemplate>) => {
    await communicationSync.updateCommunicationTemplate(id, updates);
    await updateSyncStatus();
  }, [updateSyncStatus]);

  const deleteCommunicationTemplate = useCallback(async (id: string) => {
    await communicationSync.deleteCommunicationTemplate(id);
    await updateSyncStatus();
  }, [updateSyncStatus]);

  const getTemplates = useCallback(async (filters?: {
    type?: 'sms' | 'email';
    category?: string;
    active?: boolean;
  }) => {
    return communicationSync.getTemplates(filters);
  }, []);

  const forcSync = useCallback(async () => {
    await outbox.syncPendingOperations();
    await communicationSync.syncFromServer();
    await updateSyncStatus();
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