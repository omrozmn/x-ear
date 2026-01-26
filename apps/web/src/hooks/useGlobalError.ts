/**
 * useGlobalError Hook
 * 
 * Hook for accessing global error context.
 * Must be used within GlobalErrorProvider.
 */

import { useContext } from 'react';
import { GlobalErrorContext } from '../contexts/GlobalErrorContext';

export const useGlobalError = () => {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  }
  return context;
};
