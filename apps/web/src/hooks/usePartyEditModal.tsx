import { useState } from 'react';
import { Party } from '../types/party';
import { useUpdateParty } from '@/api/client/parties.client';

export function usePartyEditModal(refetch: () => Promise<unknown>) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  const updatePartyMutation = useUpdateParty({
    mutation: {
      onSuccess: async () => {
        // Refetch parties immediately after update and wait for it
        await refetch();
      }
    }
  });

  const openModal = (party: Party) => {
    setEditingParty(party);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditingParty(null);
  };

  const handleSubmit = async (updates: Record<string, unknown>) => {
    try {
      if (!editingParty?.id) return null;
      
      const result = await updatePartyMutation.mutateAsync({
        partyId: editingParty.id,
        data: updates,
      });
      
      // Wait for refetch to complete before closing modal
      await refetch();
      closeModal();
      return result;
    } catch (e) {
      console.error('Failed to update party', e);
      throw e;
    }
  };

  return {
    isOpen,
    editingParty,
    isLoading: updatePartyMutation.isPending,
    openModal,
    closeModal,
    handleSubmit,
  };
}
