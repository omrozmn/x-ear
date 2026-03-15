import { useState, useEffect, useCallback, useMemo } from 'react';
import { PartyApiService } from '../../services/party/party-api.service';
import { customInstance } from '../../api/orval-mutator';

export interface PartyHearingTest {
  id: string;
  partyId: string;
  testDate: string;
  testType: string;
  conductedBy?: string;
  results?: Record<string, unknown>;
  notes?: string;
}

export interface CreateHearingTestPayload {
  testDate?: string;
  testType?: string;
  conductedBy?: string;
  results?: Record<string, unknown>;
  notes?: string;
}

export interface DeviceRecommendation {
  inventoryId: string;
  name: string;
  brand: string;
  model: string;
  deviceType: string;
  deviceTypeLabel: string;
  maxOutputSpl?: number;
  maxGain?: number;
  fittingRangeMin?: number;
  fittingRangeMax?: number;
  price?: number;
  availableStock: number;
  matchQuality: 'exact' | 'style';
  suitability?: 'recommended' | 'suitable';
  suitabilityTr?: string;
}

export interface CouplingDome {
  type: string;
  labelTr: string;
  priority: number;
}

export interface CouplingVent {
  sizeMm: string;
  labelTr: string;
  description: string;
}

export interface CouplingRecommendation {
  domes: CouplingDome[];
  earmold?: { type: string; labelTr: string } | null;
  vent: CouplingVent;
  notes: string;
  configNote?: string;
}

export interface AudiogramConfig {
  config: string;
  configTr: string;
  slopeDb: number;
}

export interface DeviceRecommendationResult {
  rightPta?: number;
  leftPta?: number;
  worsePta?: number;
  betterPta?: number;
  lossLevel?: { min: number; max: number; label: string; labelTr: string };
  audiogramConfig?: AudiogramConfig;
  suitableStyles?: Array<{ type: string; label: string; suitability: string; suitabilityTr: string }>;
  coupling?: CouplingRecommendation;
  recommendations: DeviceRecommendation[];
  totalInStock: number;
  guidelines?: string;
}

export interface RemFrequencyTarget {
  targetGain: number;
  targetRear: number;
  hearingThreshold: number;
  frequencyFactor: number;
}

export interface RemTargetsResult {
  inputLevel: number;
  experienced: boolean;
  formula: string;
  rightTargets?: Record<string, RemFrequencyTarget>;
  leftTargets?: Record<string, RemFrequencyTarget>;
}

export interface RemFrequencyVerification {
  target: number;
  measured: number;
  deviation: number;
  pass: boolean;
}

export interface RemEarVerification {
  frequencies: Record<string, RemFrequencyVerification>;
  passCount: number;
  totalCount: number;
  overallPass: boolean;
  passRate: number;
}

export interface RemMeasurementResult {
  message: string;
  verification: Record<string, RemEarVerification>;
  rem: {
    right?: { rear: Record<string, number> };
    left?: { rear: Record<string, number> };
    inputLevel: number;
    experienced: boolean;
    equipment?: string;
    measuredAt: string;
    verification: Record<string, RemEarVerification>;
  };
}

export interface RemSavePayload {
  rem: {
    right?: { rear: Record<string, number> };
    left?: { rear: Record<string, number> };
    inputLevel?: number;
    experienced?: boolean;
    equipment?: string;
    measuredAt?: string;
  };
}

/**
 * Hook for fetching and managing party hearing tests
 */
export function usePartyHearingTests(partyId?: string) {
  const [hearingTests, setHearingTests] = useState<PartyHearingTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  const apiService = useMemo(() => new PartyApiService(), []);

  const fetchHearingTests = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getHearingTests(id);
      setHearingTests((result?.data || []) as PartyHearingTest[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setHearingTests([]);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  const createHearingTest = useCallback(async (payload: CreateHearingTestPayload) => {
    if (!partyId) return null;
    setSaving(true);
    setError(null);

    try {
      const response = await customInstance<{ data: PartyHearingTest }>({
        url: `/api/parties/${partyId}/hearing-tests`,
        method: 'POST',
        data: payload,
      });
      // Refresh list after creation
      await fetchHearingTests(partyId);
      return (response as unknown as { data: PartyHearingTest })?.data ?? response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setSaving(false);
    }
  }, [partyId, fetchHearingTests]);

  const fetchRecommendations = useCallback(async (testId: string) => {
    if (!partyId) return null;
    try {
      const response = await customInstance<{ data: DeviceRecommendationResult }>({
        url: `/api/parties/${partyId}/hearing-tests/${testId}/recommendations`,
        method: 'GET',
      });
      return (response as unknown as { data: DeviceRecommendationResult })?.data ?? response;
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      return null;
    }
  }, [partyId]);

  const fetchRemTargets = useCallback(async (testId: string, inputLevel = 65, experienced = true): Promise<RemTargetsResult | null> => {
    if (!partyId) return null;
    try {
      const response = await customInstance<Record<string, unknown>>({
        url: `/api/parties/${partyId}/hearing-tests/${testId}/rem-targets`,
        method: 'GET',
        params: { input_level: inputLevel, experienced },
      });
      // customInstance returns the ResponseEnvelope body
      // Extract .data from the envelope, handle both wrapped and unwrapped forms
      const envelope = response as Record<string, unknown>;
      const data = envelope?.data ?? envelope;
      if (data && typeof data === 'object' && ('rightTargets' in data || 'leftTargets' in data || 'formula' in data)) {
        return data as unknown as RemTargetsResult;
      }
      console.warn('Unexpected REM targets response format:', response);
      return null;
    } catch (err) {
      console.error('Failed to fetch REM targets:', err);
      return null;
    }
  }, [partyId]);

  const saveRemMeasurement = useCallback(async (testId: string, payload: RemSavePayload) => {
    if (!partyId) return null;
    try {
      const response = await customInstance<Record<string, unknown>>({
        url: `/api/parties/${partyId}/hearing-tests/${testId}/rem`,
        method: 'POST',
        data: payload,
      });
      // customInstance returns ResponseEnvelope body
      const envelope = response as Record<string, unknown>;
      const data = envelope?.data ?? envelope;
      if (data && typeof data === 'object' && 'verification' in data) {
        return data as unknown as RemMeasurementResult;
      }
      console.warn('Unexpected REM save response format:', response);
      return response as unknown as RemMeasurementResult;
    } catch (err) {
      console.error('Failed to save REM measurement:', err);
      return null;
    }
  }, [partyId]);

  const fetchRemData = useCallback(async (testId: string): Promise<RemMeasurementResult['rem'] | null> => {
    if (!partyId) return null;
    try {
      const response = await customInstance<Record<string, unknown>>({
        url: `/api/parties/${partyId}/hearing-tests/${testId}/rem`,
        method: 'GET',
      });
      const envelope = response as Record<string, unknown>;
      const data = envelope?.data ?? null;
      return data as RemMeasurementResult['rem'] | null;
    } catch (err) {
      console.error('Failed to fetch REM data:', err);
      return null;
    }
  }, [partyId]);

  useEffect(() => {
    if (partyId) {
      fetchHearingTests(partyId);
    } else {
      setHearingTests([]);
    }
  }, [partyId, fetchHearingTests]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    hearingTests,
    data: hearingTests,
    loading,
    isLoading: loading,
    saving,
    error,
    fetchHearingTests,
    createHearingTest,
    fetchRecommendations,
    fetchRemTargets,
    saveRemMeasurement,
    fetchRemData,
    clearError,
  };
}