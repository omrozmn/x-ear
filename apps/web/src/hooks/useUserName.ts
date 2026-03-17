import { useState, useEffect } from 'react';

/**
 * Hook to fetch and display user's full name from user ID
 * Falls back to username or user ID if name is not available
 */
export const useUserName = (userId: string | undefined): string => {
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (!userId) {
      setUserName('');
      return;
    }

    // For now, just clean up the user ID display
    // TODO: Implement actual user lookup when user API is available
    // Example: GET /api/users/{userId} -> { firstName, lastName, username }
    
    // Clean display: remove "usr_" prefix and show as is
    const cleanId = userId.replace(/^usr_/, '');
    setUserName(cleanId);

  }, [userId]);

  return userName || userId || '';
};
