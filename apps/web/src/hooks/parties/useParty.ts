import { useQuery } from '@tanstack/react-query'
import { partyApiService } from '@/services/party/party-api.service'

export const useParty = (partyId?: string) => {
  const query = useQuery({
    queryKey: ['party', partyId],
    queryFn: async () => {
      if (!partyId) {
        throw new Error('Party ID is required')
      }
      
      // Use our cached party API service instead of direct API calls
      const party = await partyApiService.fetchParty(partyId)
      
      if (!party) {
        throw new Error('Party not found')
      }
      
      return party
    },
    enabled: !!partyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    party: query.data,
    loading: query.isLoading,
    error: query.error,
    isOnline: navigator.onLine,
    refresh: query.refetch,
    isSuccess: query.isSuccess,
    isError: query.isError
  }
}