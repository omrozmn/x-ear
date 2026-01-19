import { useState, useCallback, useEffect } from 'react'
import { PARTY_SEARCH_FILTERS } from '@/constants/storage-keys'

export interface PartyFilters {
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

export const usePartyFilters = () => {
  const [filters, setFilters] = useState<PartyFilters>(() => {
    try {
      const saved = localStorage.getItem(PARTY_SEARCH_FILTERS)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(PARTY_SEARCH_FILTERS, JSON.stringify(filters))
  }, [filters])

  const updateFilter = useCallback(<K extends keyof PartyFilters>(
    key: K,
    value: PartyFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilter = useCallback((key: keyof PartyFilters) => {
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