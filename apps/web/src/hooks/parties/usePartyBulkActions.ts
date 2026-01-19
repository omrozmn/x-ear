import { useState, useCallback, useEffect } from 'react'
import { Party } from '@/types/party'
import { PARTY_BULK_ACTIONS_STATE } from '@/constants/storage-keys'

export interface BulkActionState {
  selectedParties: string[]
  isAllSelected: boolean
  lastAction?: string
}

export const usePartyBulkActions = () => {
  const [bulkState, setBulkState] = useState<BulkActionState>(() => {
    try {
      const saved = localStorage.getItem(PARTY_BULK_ACTIONS_STATE)
      return saved ? JSON.parse(saved) : {
        selectedParties: [],
        isAllSelected: false
      }
    } catch {
      return {
        selectedParties: [],
        isAllSelected: false
      }
    }
  })

  // Save bulk state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(PARTY_BULK_ACTIONS_STATE, JSON.stringify(bulkState))
  }, [bulkState])

  const selectParty = useCallback((partyId: string) => {
    setBulkState(prev => ({
      ...prev,
      selectedParties: [...prev.selectedParties, partyId],
      isAllSelected: false
    }))
  }, [])

  const deselectParty = useCallback((partyId: string) => {
    setBulkState(prev => ({
      ...prev,
      selectedParties: prev.selectedParties.filter(id => id !== partyId),
      isAllSelected: false
    }))
  }, [])

  const toggleParty = useCallback((partyId: string) => {
    setBulkState(prev => {
      const isSelected = prev.selectedParties.includes(partyId)
      return {
        ...prev,
        selectedParties: isSelected
          ? prev.selectedParties.filter(id => id !== partyId)
          : [...prev.selectedParties, partyId],
        isAllSelected: false
      }
    })
  }, [])

  const selectAll = useCallback((parties: Party[]) => {
    setBulkState(prev => ({
      ...prev,
      selectedParties: parties.map(p => p.id!),
      isAllSelected: true
    }))
  }, [])

  const clearSelection = useCallback(() => {
    setBulkState(prev => ({
      ...prev,
      selectedParties: [],
      isAllSelected: false
    }))
  }, [])

  const executeAction = useCallback(async (action: string, onAction?: (selectedIds: string[]) => Promise<void>) => {
    if (bulkState.selectedParties.length === 0) return

    setBulkState(prev => ({ ...prev, lastAction: action }))
    
    if (onAction) {
      await onAction(bulkState.selectedParties)
    }

    // Clear selection after action
    clearSelection()
  }, [bulkState.selectedParties, clearSelection])

  const exportSelected = useCallback(async () => {
    await executeAction('export')
  }, [executeAction])

  const deleteSelected = useCallback(async (onDelete?: (selectedIds: string[]) => Promise<void>) => {
    await executeAction('delete', onDelete)
  }, [executeAction])

  const archiveSelected = useCallback(async (onArchive?: (selectedIds: string[]) => Promise<void>) => {
    await executeAction('archive', onArchive)
  }, [executeAction])

  const handleBulkAction = useCallback(async (action: string) => {
    if (bulkState.selectedParties.length === 0) {
      console.warn('No parties selected for bulk action:', action)
      return
    }

    try {
      switch (action) {
        case 'export':
          await exportSelected()
          break
        case 'delete':
          await deleteSelected()
          break
        case 'archive':
          await archiveSelected()
          break
        case 'edit':
          // TODO: Implement bulk edit
          console.log('Bulk edit for parties:', bulkState.selectedParties)
          break
        case 'email':
          // TODO: Implement bulk email
          console.log('Bulk email for parties:', bulkState.selectedParties)
          break
        default:
          console.warn('Unknown bulk action:', action)
      }
    } catch (error) {
      console.error('Bulk action failed:', error)
    }
  }, [bulkState.selectedParties, exportSelected, deleteSelected, archiveSelected])

  return {
    selectedParties: bulkState.selectedParties,
    isAllSelected: bulkState.isAllSelected,
    selectedCount: bulkState.selectedParties.length,
    selectParty,
    deselectParty,
    toggleParty,
    selectAll,
    clearSelection,
    executeAction,
    exportSelected,
    deleteSelected,
    archiveSelected,
    handleBulkAction
  }
}