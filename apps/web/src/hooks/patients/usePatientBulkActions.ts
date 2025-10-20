import { useState, useCallback, useEffect } from 'react'
import { Patient } from '@/types/patient'
import { PATIENT_BULK_ACTIONS_STATE } from '@/constants/storage-keys'

export interface BulkActionState {
  selectedPatients: string[]
  isAllSelected: boolean
  lastAction?: string
}

export const usePatientBulkActions = () => {
  const [bulkState, setBulkState] = useState<BulkActionState>(() => {
    try {
      const saved = localStorage.getItem(PATIENT_BULK_ACTIONS_STATE)
      return saved ? JSON.parse(saved) : {
        selectedPatients: [],
        isAllSelected: false
      }
    } catch {
      return {
        selectedPatients: [],
        isAllSelected: false
      }
    }
  })

  // Save bulk state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(PATIENT_BULK_ACTIONS_STATE, JSON.stringify(bulkState))
  }, [bulkState])

  const selectPatient = useCallback((patientId: string) => {
    setBulkState(prev => ({
      ...prev,
      selectedPatients: [...prev.selectedPatients, patientId],
      isAllSelected: false
    }))
  }, [])

  const deselectPatient = useCallback((patientId: string) => {
    setBulkState(prev => ({
      ...prev,
      selectedPatients: prev.selectedPatients.filter(id => id !== patientId),
      isAllSelected: false
    }))
  }, [])

  const togglePatient = useCallback((patientId: string) => {
    setBulkState(prev => {
      const isSelected = prev.selectedPatients.includes(patientId)
      return {
        ...prev,
        selectedPatients: isSelected
          ? prev.selectedPatients.filter(id => id !== patientId)
          : [...prev.selectedPatients, patientId],
        isAllSelected: false
      }
    })
  }, [])

  const selectAll = useCallback((patients: Patient[]) => {
    setBulkState(prev => ({
      ...prev,
      selectedPatients: patients.map(p => p.id!),
      isAllSelected: true
    }))
  }, [])

  const clearSelection = useCallback(() => {
    setBulkState(prev => ({
      ...prev,
      selectedPatients: [],
      isAllSelected: false
    }))
  }, [])

  const executeAction = useCallback(async (action: string, onAction?: (selectedIds: string[]) => Promise<void>) => {
    if (bulkState.selectedPatients.length === 0) return

    setBulkState(prev => ({ ...prev, lastAction: action }))
    
    if (onAction) {
      await onAction(bulkState.selectedPatients)
    }

    // Clear selection after action
    clearSelection()
  }, [bulkState.selectedPatients, clearSelection])

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
    if (bulkState.selectedPatients.length === 0) {
      console.warn('No patients selected for bulk action:', action)
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
          console.log('Bulk edit for patients:', bulkState.selectedPatients)
          break
        case 'email':
          // TODO: Implement bulk email
          console.log('Bulk email for patients:', bulkState.selectedPatients)
          break
        default:
          console.warn('Unknown bulk action:', action)
      }
    } catch (error) {
      console.error('Bulk action failed:', error)
    }
  }, [bulkState.selectedPatients, exportSelected, deleteSelected, archiveSelected])

  return {
    selectedPatients: bulkState.selectedPatients,
    isAllSelected: bulkState.isAllSelected,
    selectedCount: bulkState.selectedPatients.length,
    selectPatient,
    deselectPatient,
    togglePatient,
    selectAll,
    clearSelection,
    executeAction,
    exportSelected,
    deleteSelected,
    archiveSelected,
    handleBulkAction
  }
}