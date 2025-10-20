import { useState, useCallback, useEffect } from 'react'
import { PATIENT_SEARCH_FILTERS } from '@/constants/storage-keys'

export interface PatientFilters {
  search?: string
  status?: 'active' | 'inactive'
  gender?: 'M' | 'F'
  city?: string
  district?: string
  segment?: string
  acquisitionType?: string
  dateRange?: {
    from?: string
    to?: string
  }
}

export const usePatientFilters = () => {
  const [filters, setFilters] = useState<PatientFilters>(() => {
    try {
      const saved = localStorage.getItem(PATIENT_SEARCH_FILTERS)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(PATIENT_SEARCH_FILTERS, JSON.stringify(filters))
  }, [filters])

  const updateFilter = useCallback(<K extends keyof PatientFilters>(
    key: K,
    value: PatientFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilter = useCallback((key: keyof PatientFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters({})
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({})
  }, [])

  return {
    filters,
    updateFilter,
    clearFilter,
    clearAllFilters,
    resetFilters,
    setFilters
  }
}