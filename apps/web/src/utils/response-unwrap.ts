/**
 * Utility functions for unwrapping API responses with flexible structure handling
 * 
 * Handles multiple response patterns:
 * - Direct data: [item1, item2] or { key: value }
 * - Wrapped once: { data: [...] } or { data: {...} }
 * - Wrapped twice: { data: { data: [...] } }
 */

/**
 * Unwrap array response from API
 * @param response - API response that may be wrapped in various structures
 * @returns Unwrapped array
 */
export function unwrapArray<T>(response: unknown): T[] {
  if (!response) return [];
  
  // Direct array
  if (Array.isArray(response)) {
    return response as T[];
  }
  
  const anyResponse = response as any;
  
  // Check for data property
  if (anyResponse.data !== undefined) {
    const innerData = anyResponse.data;
    
    // data is array
    if (Array.isArray(innerData)) {
      return innerData as T[];
    }
    
    // data.data is array (double wrapped)
    if (innerData?.data && Array.isArray(innerData.data)) {
      return innerData.data as T[];
    }
    
    // data.items is array (alternative field name)
    if (innerData?.items && Array.isArray(innerData.items)) {
      return innerData.items as T[];
    }
  }
  
  // Check for items property directly
  if (anyResponse.items && Array.isArray(anyResponse.items)) {
    return anyResponse.items as T[];
  }
  
  return [];
}

/**
 * Unwrap object response from API
 * @param response - API response that may be wrapped in various structures
 * @returns Unwrapped object or null
 */
export function unwrapObject<T>(response: unknown): T | null {
  if (!response) return null;
  
  // Check if already an object with expected properties (not wrapper)
  const anyResponse = response as any;
  
  // If has data property, unwrap it
  if (anyResponse.data !== undefined) {
    const innerData = anyResponse.data;
    
    // data.data exists (double wrapped)
    if (innerData?.data !== undefined && typeof innerData.data === 'object') {
      return innerData.data as T;
    }
    
    // data is the object
    if (typeof innerData === 'object' && innerData !== null && !Array.isArray(innerData)) {
      return innerData as T;
    }
  }
  
  // Direct object
  if (typeof anyResponse === 'object' && anyResponse !== null && !Array.isArray(anyResponse)) {
    return anyResponse as T;
  }
  
  return null;
}

/**
 * Unwrap primitive value (number, string, boolean) from API response
 * @param response - API response that may be wrapped
 * @param fallback - Fallback value if unwrapping fails
 * @returns Unwrapped primitive value or fallback
 */
export function unwrapPrimitive<T extends string | number | boolean>(
  response: unknown,
  fallback: T
): T {
  if (response === null || response === undefined) return fallback;
  
  // Direct primitive
  if (typeof response === typeof fallback) {
    return response as T;
  }
  
  const anyResponse = response as any;
  
  // Wrapped in data
  if (anyResponse.data !== undefined) {
    const innerData = anyResponse.data;
    
    // Direct primitive in data
    if (typeof innerData === typeof fallback) {
      return innerData as T;
    }
    
    // Double wrapped
    if (innerData?.data !== undefined && typeof innerData.data === typeof fallback) {
      return innerData.data as T;
    }
  }
  
  return fallback;
}

/**
 * Unwrap specific property from response (e.g., balance, total, etc.)
 * @param response - API response
 * @param propertyName - Name of property to extract
 * @param fallback - Fallback value if property not found
 * @returns Property value or fallback
 */
export function unwrapProperty<T>(
  response: unknown,
  propertyName: string,
  fallback: T
): T {
  if (!response) return fallback;
  
  const anyResponse = response as any;
  
  // Direct property access
  if (anyResponse[propertyName] !== undefined) {
    return anyResponse[propertyName] as T;
  }
  
  // Check in data
  if (anyResponse.data !== undefined) {
    const innerData = anyResponse.data;
    
    // data.propertyName
    if (innerData[propertyName] !== undefined) {
      return innerData[propertyName] as T;
    }
    
    // data.data.propertyName
    if (innerData?.data?.[propertyName] !== undefined) {
      return innerData.data[propertyName] as T;
    }
  }
  
  return fallback;
}

/**
 * Unwrap paginated response with meta/pagination info
 * @param response - API response
 * @returns Object with data array and metadata
 */
export function unwrapPaginated<T>(response: unknown): {
  data: T[];
  meta?: any;
  pagination?: any;
  total?: number;
} {
  const data = unwrapArray<T>(response);
  const anyResponse = response as any;
  
  let meta: any = undefined;
  let pagination: any = undefined;
  let total: number | undefined = undefined;
  
  // Try to extract meta/pagination from various locations
  if (anyResponse?.meta) {
    meta = anyResponse.meta;
  } else if (anyResponse?.data?.meta) {
    meta = anyResponse.data.meta;
  }
  
  if (anyResponse?.pagination) {
    pagination = anyResponse.pagination;
  } else if (anyResponse?.data?.pagination) {
    pagination = anyResponse.data.pagination;
  }
  
  if (anyResponse?.total !== undefined) {
    total = anyResponse.total;
  } else if (anyResponse?.data?.total !== undefined) {
    total = anyResponse.data.total;
  } else if (meta?.total !== undefined) {
    total = meta.total;
  } else if (pagination?.total !== undefined) {
    total = pagination.total;
  }
  
  return { data, meta, pagination, total };
}

/**
 * Check if response indicates success
 * @param response - API response
 * @returns true if response indicates success
 */
export function isSuccessResponse(response: unknown): boolean {
  if (!response) return false;
  
  const anyResponse = response as any;
  
  // Check success field at various levels
  if (anyResponse.success === true) return true;
  if (anyResponse.data?.success === true) return true;
  if (anyResponse.data?.data?.success === true) return true;
  
  // No explicit failure
  if (anyResponse.error || anyResponse.data?.error) return false;
  
  // Has data, assume success
  if (anyResponse.data !== undefined || Array.isArray(anyResponse)) return true;
  
  return false;
}
