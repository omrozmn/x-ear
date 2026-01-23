import { useState, useEffect, useCallback } from 'react';
import { Party, PartyDevice, PartyNote, PartyCommunication } from '../types/party';


export interface UsePartyOptions {
  enableRealTimeSync?: boolean;
  cacheEnabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UsePartyReturn {
  // Core state
  party: Party | null;
  isLoading: boolean;
  isSaving: boolean;
  isSyncing: boolean;
  error: string | null;

  // Core operations
  updateParty: (updates: Partial<Party>) => Promise<Party>;
  deleteParty: () => Promise<void>;

  // Device operations
  addDevice: (device: Omit<PartyDevice, 'id'>) => Promise<PartyDevice>;
  updateDevice: (deviceId: string, updates: Partial<PartyDevice>) => Promise<PartyDevice>;
  removeDevice: (deviceId: string) => Promise<void>;

  // Note operations
  addNote: (noteText: string, type?: PartyNote['type']) => Promise<PartyNote>;
  updateNote: (noteId: string, updates: Partial<PartyNote>) => Promise<PartyNote>;
  removeNote: (noteId: string) => Promise<void>;

  // Communication operations
  addCommunication: (communication: Omit<PartyCommunication, 'id'>) => Promise<PartyCommunication>;

  // Utility operations
  refreshParty: () => Promise<void>;
  syncParty: () => Promise<void>;

  // Validation and scoring
  validateParty: (partyData?: Partial<Party>) => { isValid: boolean; errors: string[] };
  calculatePriorityScore: () => number;
}

export const useParty = (
  partyId: string | null,
  _options: UsePartyOptions = {}
): UsePartyReturn => {
  const [party, setParty] = useState<Party | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load party data
  useEffect(() => {
    if (!partyId) {
      setParty(null);
      return;
    }

    const loadParty = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const mockParty: Party = {
          id: partyId,
          email: 'mock@example.com',
          phone: '555-0123',
          birthDate: '1990-01-01',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tcNumber: '12345678901',
          firstName: 'Mock',
          lastName: 'Party',
          devices: []
        };
        setParty(mockParty);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load party');
      } finally {
        setIsLoading(false);
      }
    };

    loadParty();
  }, [partyId]);

  // Update party
  const updateParty = useCallback(async (updates: Partial<Party>): Promise<Party> => {
    if (!party) throw new Error('No party loaded');

    setIsSaving(true);
    setError(null);

    try {
      const updatedParty = { ...party, ...updates };
      setParty(updatedParty);
      return updatedParty;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update party');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [party]);

  // Delete party
  const deleteParty = useCallback(async (): Promise<void> => {
    if (!party) throw new Error('No party loaded');

    setIsSaving(true);
    setError(null);

    try {
      setParty(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete party');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [party]);

  // Add device
  const addDevice = useCallback(async (device: Omit<PartyDevice, 'id'>): Promise<PartyDevice> => {
    if (!party) throw new Error('No party loaded');

    const newDevice: PartyDevice = {
      ...device,
      id: Date.now().toString()
    };

    const updatedParty = {
      ...party,
      devices: [...(party.devices || []), newDevice]
    };

    setParty(updatedParty);
    return newDevice;
  }, [party]);

  // Update device
  const updateDevice = useCallback(async (deviceId: string, updates: Partial<PartyDevice>): Promise<PartyDevice> => {
    if (!party) throw new Error('No party loaded');

    const devices = party.devices || [];
    const deviceIndex = devices.findIndex(d => d.id === deviceId);

    if (deviceIndex === -1) throw new Error('Device not found');

    const updatedDevice = { ...devices[deviceIndex], ...updates };
    const updatedDevices = [...devices];
    updatedDevices[deviceIndex] = updatedDevice;

    setParty({ ...party, devices: updatedDevices });
    return updatedDevice;
  }, [party]);

  // Remove device
  const removeDevice = useCallback(async (deviceId: string): Promise<void> => {
    if (!party) throw new Error('No party loaded');

    const updatedDevices = (party.devices || []).filter(d => d.id !== deviceId);
    setParty({ ...party, devices: updatedDevices });
  }, [party]);

  // Add note
  const addNote = useCallback(async (noteText: string, type: PartyNote['type'] = 'general'): Promise<PartyNote> => {
    const newNote: PartyNote = {
      id: Date.now().toString(),
      text: noteText,
      date: new Date().toISOString(),
      author: 'Current User',
      type,
      createdAt: new Date().toISOString()
    };

    return newNote;
  }, []);

  // Update note
  const updateNote = useCallback(async (noteId: string, updates: Partial<PartyNote>): Promise<PartyNote> => {
    const updatedNote: PartyNote = {
      id: noteId,
      text: updates.text || '',
      date: updates.date || new Date().toISOString(),
      author: updates.author || 'Current User',
      type: updates.type || 'general',
      createdAt: updates.createdAt || new Date().toISOString()
    };

    return updatedNote;
  }, []);

  // Remove note
  const removeNote = useCallback(async (_noteId: string): Promise<void> => {
    // Mock implementation
  }, []);

  // Add communication
  const addCommunication = useCallback(async (communication: Omit<PartyCommunication, 'id'>): Promise<PartyCommunication> => {
    const newCommunication: PartyCommunication = {
      ...communication,
      id: Date.now().toString()
    };

    return newCommunication;
  }, []);

  // Refresh party
  const refreshParty = useCallback(async (): Promise<void> => {
    if (!partyId) return;

    setIsLoading(true);
    try {
      // Mock refresh
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsLoading(false);
    }
  }, [partyId]);

  // Sync party
  const syncParty = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    try {
      // Mock sync
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Validate party
  const validateParty = useCallback((partyData?: Partial<Party>) => {
    const data = partyData || party;
    const errors: string[] = [];

    if (!data?.firstName) errors.push('First name is required');
    if (!data?.lastName) errors.push('Last name is required');
    if (!data?.email) errors.push('Email is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [party]);

  // Calculate priority score
  const calculatePriorityScore = useCallback((): number => {
    if (!party) return 0;

    let score = 0;
    // Use priorityScore if available, otherwise calculate based on other factors
    if (party.priorityScore) {
      score = party.priorityScore;
    } else {
      // Calculate based on status or other available properties
      if (party.status === 'LEAD') score += 1;
      else if (party.status === 'TRIAL') score += 2;
      else if (party.status === 'CUSTOMER') score += 3;
    }

    return score;
  }, [party]);

  return {
    party,
    isLoading,
    isSaving,
    isSyncing,
    error,
    updateParty,
    deleteParty,
    addDevice,
    updateDevice,
    removeDevice,
    addNote,
    updateNote,
    removeNote,
    addCommunication,
    refreshParty,
    syncParty,
    validateParty,
    calculatePriorityScore
  };
};