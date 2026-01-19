import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { apiClient } from '../api/orval-mutator';
import {
  ListCommunicationMessagesParams,
  ListCommunicationTemplatesParams
} from '@/api/generated/schemas';

// Database schema interfaces
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

interface OutboxItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entityType: 'message' | 'template';
  entityId: string;
  data: unknown;
  createdAt: string;
  retryCount: number;
  lastRetryAt?: string;
  error?: string;
}

interface SyncMetadata {
  id: string;
  entityType: 'messages' | 'templates';
  lastSyncTimestamp: string;
  lastSyncId?: string;
}

// IndexedDB Schema
interface CommunicationDB extends DBSchema {
  messages: {
    key: string;
    value: CommunicationMessage;
    indexes: {
      'by-type': string;
      'by-status': string;
      'by-sync-status': string;
      'by-created-at': string;
      'by-party-id': string;
    };
  };
  templates: {
    key: string;
    value: CommunicationTemplate;
    indexes: {
      'by-type': string;
      'by-category': string;
      'by-sync-status': string;
      'by-active': string;
    };
  };
  outbox: {
    key: string;
    value: OutboxItem;
    indexes: {
      'by-entity-type': string;
      'by-created-at': string;
      'by-retry-count': number;
    };
  };
  syncMetadata: {
    key: string;
    value: SyncMetadata;
  };
}

class CommunicationOfflineSync {
  private db: IDBPDatabase<CommunicationDB> | null = null;
  private readonly dbName = 'CommunicationDB';
  private readonly dbVersion = 1;
  private syncInProgress = false;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  async initialize(): Promise<void> {
    try {
      this.db = await openDB<CommunicationDB>(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Messages store
          if (!db.objectStoreNames.contains('messages')) {
            const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
            messagesStore.createIndex('by-type', 'type');
            messagesStore.createIndex('by-status', 'status');
            messagesStore.createIndex('by-sync-status', 'syncStatus');
            messagesStore.createIndex('by-created-at', 'createdAt');
            messagesStore.createIndex('by-party-id', 'partyId');
          }

          // Templates store
          if (!db.objectStoreNames.contains('templates')) {
            const templatesStore = db.createObjectStore('templates', { keyPath: 'id' });
            templatesStore.createIndex('by-type', 'templateType');
            templatesStore.createIndex('by-category', 'category');
            templatesStore.createIndex('by-sync-status', 'syncStatus');
            templatesStore.createIndex('by-active', 'isActive');
          }

          // Outbox store
          if (!db.objectStoreNames.contains('outbox')) {
            const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' });
            outboxStore.createIndex('by-entity-type', 'entityType');
            outboxStore.createIndex('by-created-at', 'createdAt');
            outboxStore.createIndex('by-retry-count', 'retryCount');
          }

          // Sync metadata store
          if (!db.objectStoreNames.contains('syncMetadata')) {
            db.createObjectStore('syncMetadata', { keyPath: 'id' });
          }
        },
      });

      // Start periodic sync
      this.startPeriodicSync();

      // Listen for online/offline events
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());

    } catch (error) {
      console.error('Failed to initialize CommunicationOfflineSync:', error);
      throw error;
    }
  }

  // Messages CRUD operations
  async saveMessage(message: Omit<CommunicationMessage, 'syncStatus'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const messageWithSync: CommunicationMessage = {
      ...message,
      syncStatus: navigator.onLine ? 'pending' : 'pending',
      updatedAt: new Date().toISOString()
    };

    await this.db.put('messages', messageWithSync);

    // Add to outbox for sync
    await this.addToOutbox('create', 'message', message.id, messageWithSync);

    // Attempt immediate sync if online
    if (navigator.onLine) {
      this.syncOutbox();
    }
  }

  async updateMessage(id: string, updates: Partial<CommunicationMessage>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.db.get('messages', id);
    if (!existing) throw new Error('Message not found');

    const updated: CommunicationMessage = {
      ...existing,
      ...updates,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString()
    };

    await this.db.put('messages', updated);

    // Add to outbox for sync
    await this.addToOutbox('update', 'message', id, updates);

    // Attempt immediate sync if online
    if (navigator.onLine) {
      this.syncOutbox();
    }
  }

  async getMessage(id: string): Promise<CommunicationMessage | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.get('messages', id);
  }

  async getMessages(filters?: {
    type?: 'sms' | 'email';
    status?: string;
    partyId?: string;
    limit?: number;
    offset?: number;
  }): Promise<CommunicationMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    let messages = await this.db.getAll('messages');

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

  // Templates CRUD operations
  async saveTemplate(template: Omit<CommunicationTemplate, 'syncStatus'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const templateWithSync: CommunicationTemplate = {
      ...template,
      syncStatus: 'pending'
    };

    await this.db.put('templates', templateWithSync);

    // Add to outbox for sync
    await this.addToOutbox('create', 'template', template.id, templateWithSync);

    // Attempt immediate sync if online
    if (navigator.onLine) {
      this.syncOutbox();
    }
  }

  async updateCommunicationTemplate(id: string, updates: Partial<CommunicationTemplate>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.db.get('templates', id);
    if (!existing) throw new Error('Template not found');

    const updated: CommunicationTemplate = {
      ...existing,
      ...updates,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString()
    };

    await this.db.put('templates', updated);

    // Add to outbox for sync
    await this.addToOutbox('update', 'template', id, updates);

    // Attempt immediate sync if online
    if (navigator.onLine) {
      this.syncOutbox();
    }
  }

  async deleteCommunicationTemplate(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.delete('templates', id);

    // Add to outbox for sync
    await this.addToOutbox('delete', 'template', id, null);

    // Attempt immediate sync if online
    if (navigator.onLine) {
      this.syncOutbox();
    }
  }

  async getTemplate(id: string): Promise<CommunicationTemplate | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.get('templates', id);
  }

  async getTemplates(filters?: {
    type?: 'sms' | 'email';
    category?: string;
    active?: boolean;
  }): Promise<CommunicationTemplate[]> {
    if (!this.db) throw new Error('Database not initialized');

    let templates = await this.db.getAll('templates');

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
  private async addToOutbox(
    action: 'create' | 'update' | 'delete',
    entityType: 'message' | 'template',
    entityId: string,
    data: unknown
  ): Promise<void> {
    if (!this.db) return;

    const outboxItem: OutboxItem = {
      id: `${entityType}_${action}_${entityId}_${Date.now()}`,
      action,
      entityType,
      entityId,
      data,
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    await this.db.put('outbox', outboxItem);
  }

  // Sync operations
  async syncOutbox(): Promise<void> {
    if (!this.db || this.syncInProgress || !navigator.onLine) return;

    this.syncInProgress = true;

    try {
      const outboxItems = await this.db.getAll('outbox');

      for (const item of outboxItems) {
        try {
          await this.syncOutboxItem(item);
          await this.db.delete('outbox', item.id);
        } catch (error) {
          console.error('Failed to sync outbox item:', item.id, error);

          // Update retry count and schedule retry
          item.retryCount++;
          item.lastRetryAt = new Date().toISOString();
          item.error = error instanceof Error ? error.message : 'Unknown error';

          await this.db.put('outbox', item);

          // Schedule retry with exponential backoff
          this.scheduleRetry(item);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncOutboxItem(item: OutboxItem): Promise<void> {
    const baseUrl = '/api/communications';

    switch (item.entityType) {
      case 'message':
        await this.syncMessageItem(item, baseUrl);
        break;
      case 'template':
        await this.syncTemplateItem(item, baseUrl);
        break;
    }
  }

  private async syncMessageItem(item: OutboxItem, baseUrl: string): Promise<void> {
    const url = item.action === 'create'
      ? `${baseUrl}/messages`
      : `${baseUrl}/messages/${item.entityId}`;

    const method = item.action === 'create' ? 'POST' :
      item.action === 'update' ? 'PUT' : 'DELETE';

    const response = await apiClient.request({
      url,
      method,
      headers: {
        'Idempotency-Key': `offline_${item.id}`
      },
      data: item.action !== 'delete' ? item.data : undefined
    }) as unknown as { data?: unknown; success?: boolean; Success?: boolean; status: number };

    if (!response.data && !response.Success && !response.success && response.status >= 400) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    // Update local sync status
    if (this.db && item.action !== 'delete') {
      const entity = await this.db.get('messages', item.entityId);
      if (entity) {
        entity.syncStatus = 'synced';
        await this.db.put('messages', entity);
      }
    }
  }

  private async syncTemplateItem(item: OutboxItem, baseUrl: string): Promise<void> {
    const url = item.action === 'create'
      ? `${baseUrl}/templates`
      : `${baseUrl}/templates/${item.entityId}`;

    const method = item.action === 'create' ? 'POST' :
      item.action === 'update' ? 'PUT' : 'DELETE';

    const response = await apiClient.request({
      url,
      method,
      headers: {
        'Idempotency-Key': `offline_${item.id}`
      },
      data: item.action !== 'delete' ? item.data : undefined
    }) as unknown as { data?: unknown; success?: boolean; Success?: boolean; status: number };

    if (!response.data && !response.Success && !response.success && response.status >= 400) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    // Update local sync status
    if (this.db && item.action !== 'delete') {
      const entity = await this.db.get('templates', item.entityId);
      if (entity) {
        entity.syncStatus = 'synced';
        await this.db.put('templates', entity);
      }
    }
  }

  // Sync from server
  async syncFromServer(): Promise<void> {
    if (!this.db || !navigator.onLine) return;

    try {
      await Promise.all([
        this.syncMessagesFromServer(),
        this.syncTemplatesFromServer()
      ]);
    } catch (error) {
      console.error('Failed to sync from server:', error);
    }
  }

  private async syncMessagesFromServer(): Promise<void> {
    if (!this.db) return;

    const metadata = await this.db.get('syncMetadata', 'messages');
    const since = metadata?.lastSyncTimestamp || new Date(0).toISOString();

    const { listCommunicationMessages } = await import('@/api/generated/communications/communications');
    // Using date_from instead of since as supported by the schema
    const response = await listCommunicationMessages({
      date_from: since,
      per_page: 100
    } as ListCommunicationMessagesParams);

    // Orval response structure handling
    const result = response as unknown as { data?: unknown; success?: boolean };
    // Check if result has 'data' property (standard response envelope) or is the array itself
    const dataList = Array.isArray(result) ? result : ((result as Record<string, unknown>).data || []);

    // If wrapped in success/message envelope
    if (result.success === false) return;

    const messages: CommunicationMessage[] = (dataList as Record<string, unknown>[]).map((msg: Record<string, unknown>) => ({
      ...msg,
      id: msg.id as string,
      type: msg.type as 'sms' | 'email',
      recipient: msg.recipient as string,
      content: msg.content as string,
      status: msg.status as 'draft' | 'scheduled' | 'sent' | 'delivered' | 'failed',
      messageType: msg.messageType as 'manual' | 'appointment_reminder' | 'campaign' | 'automated',
      createdAt: msg.createdAt as string,
      syncStatus: 'synced' as const
    })) as unknown as CommunicationMessage[];

    // Update local storage
    for (const message of messages) {
      await this.db.put('messages', message);
    }

    // Update sync metadata
    await this.db.put('syncMetadata', {
      id: 'messages',
      entityType: 'messages',
      lastSyncTimestamp: new Date().toISOString()
    });
  }

  private async syncTemplatesFromServer(): Promise<void> {
    if (!this.db) return;

    const metadata = await this.db.get('syncMetadata', 'templates');
    const since = metadata?.lastSyncTimestamp || new Date(0).toISOString();

    const { listCommunicationTemplates } = await import('@/api/generated/communications/communications');
    const response = await listCommunicationTemplates({
      per_page: 100
    } as ListCommunicationTemplatesParams);

    // Orval response structure handling
    const result = response as unknown as { data?: unknown; success?: boolean };
    const dataList = Array.isArray(result) ? result : ((result as Record<string, unknown>).data || []);

    if (result.success === false) return;

    const templates: CommunicationTemplate[] = (dataList as Record<string, unknown>[]).map((tpl: Record<string, unknown>) => ({
      ...tpl,
      id: tpl.id as string,
      name: tpl.name as string,
      templateType: tpl.templateType as 'sms' | 'email',
      bodyText: tpl.bodyText as string,
      isActive: tpl.isActive as boolean,
      isSystem: tpl.isSystem as boolean,
      usageCount: tpl.usageCount as number,
      createdAt: tpl.createdAt as string,
      updatedAt: tpl.updatedAt as string,
      variables: (tpl.variables as string[]) || [],
      syncStatus: 'synced' as const
    })) as unknown as CommunicationTemplate[];

    // Update local storage
    for (const template of templates) {
      await this.db.put('templates', template);
    }

    // Update sync metadata
    await this.db.put('syncMetadata', {
      id: 'templates',
      entityType: 'templates',
      lastSyncTimestamp: new Date().toISOString()
    });
  }

  // Retry management
  private scheduleRetry(item: OutboxItem): void {
    const delay = Math.min(1000 * Math.pow(2, item.retryCount), 300000); // Max 5 minutes

    const timeoutId = setTimeout(() => {
      this.syncOutbox();
      this.retryTimeouts.delete(item.id);
    }, delay);

    this.retryTimeouts.set(item.id, timeoutId);
  }

  // Event handlers
  private handleOnline(): void {
    console.log('Connection restored, syncing...');
    this.syncOutbox();
    this.syncFromServer();
  }

  private handleOffline(): void {
    console.log('Connection lost, switching to offline mode');
    // Clear retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  // Periodic sync
  private startPeriodicSync(): void {
    setInterval(() => {
      if (navigator.onLine) {
        this.syncOutbox();
        this.syncFromServer();
      }
    }, 30000); // Sync every 30 seconds when online
  }

  // Utility methods
  async getPendingSyncCount(): Promise<{ messages: number; templates: number; outbox: number }> {
    if (!this.db) return { messages: 0, templates: 0, outbox: 0 };

    const [pendingMessages, pendingTemplates, outboxItems] = await Promise.all([
      this.db.getAllFromIndex('messages', 'by-sync-status', 'pending'),
      this.db.getAllFromIndex('templates', 'by-sync-status', 'pending'),
      this.db.getAll('outbox')
    ]);

    return {
      messages: pendingMessages.length,
      templates: pendingTemplates.length,
      outbox: outboxItems.length
    };
  }

  async clearAllData(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(['messages', 'templates', 'outbox', 'syncMetadata'], 'readwrite');
    await Promise.all([
      tx.objectStore('messages').clear(),
      tx.objectStore('templates').clear(),
      tx.objectStore('outbox').clear(),
      tx.objectStore('syncMetadata').clear()
    ]);
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }
}

// Export singleton instance
export const communicationOfflineSync = new CommunicationOfflineSync();