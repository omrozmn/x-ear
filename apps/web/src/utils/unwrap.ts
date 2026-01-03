/**
 * Unwraps nested data from API responses
 * Backend sometimes returns { data: { ...actual data } } and sometimes just { ...actual data }
 */
export function unwrapObject<T>(response: any): T {
  // If response has a 'data' field, unwrap it
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data as T;
  }
  // Otherwise return as-is
  return response as T;
}
