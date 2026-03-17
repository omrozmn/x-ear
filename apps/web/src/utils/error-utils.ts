/**
 * Error Extraction Utility
 * 
 * Extracts user-friendly error messages from various error response structures
 * to prevent "Objects are not valid as a React child" errors in toast notifications.
 */

export const extractErrorMessage = (
  error: unknown,
  defaultMessage = 'İşlem başarısız oldu'
): string => {
  // Handle axios error structure
  const axiosError = error as {
    response?: {
      data?: {
        error?: { message?: string } | string;
        message?: string;
      };
    };
    message?: string;
  };

  // Try response.data.error (can be string or object)
  const errorData = axiosError?.response?.data?.error;
  if (typeof errorData === 'string') {
    return errorData;
  }
  if (
    errorData &&
    typeof errorData === 'object' &&
    'message' in errorData &&
    typeof errorData.message === 'string'
  ) {
    return errorData.message;
  }

  // Try response.data.message
  if (
    axiosError?.response?.data?.message &&
    typeof axiosError.response.data.message === 'string'
  ) {
    return axiosError.response.data.message;
  }

  // Try error.message
  if (axiosError?.message && typeof axiosError.message === 'string') {
    return axiosError.message;
  }

  // Fallback to default message
  return defaultMessage;
};
