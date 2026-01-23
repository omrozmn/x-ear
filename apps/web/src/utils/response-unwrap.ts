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

  if (Array.isArray(response)) {
    return response as T[];
  }

  const obj = response as Record<string, unknown>;

  if (obj.data !== undefined) {
    const innerData = obj.data;

    if (Array.isArray(innerData)) {
      return innerData as T[];
    }

    const innerObj = innerData as Record<string, unknown> | null;
    if (innerObj?.data && Array.isArray(innerObj.data)) {
      return innerObj.data as T[];
    }

    if (innerObj?.items && Array.isArray(innerObj.items)) {
      return innerObj.items as T[];
    }
  }

  if (obj.items && Array.isArray(obj.items)) {
    return obj.items as T[];
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

  const obj = response as Record<string, unknown>;

  if (obj.data !== undefined) {
    const innerData = obj.data;

    if (innerData !== null && typeof innerData === 'object') {
      const innerObj = innerData as Record<string, unknown>;
      if (innerObj.data !== undefined && typeof innerObj.data === 'object') {
        return innerObj.data as T;
      }

      if (!Array.isArray(innerData)) {
        return innerData as T;
      }
    }
  }

  if (typeof response === 'object' && response !== null && !Array.isArray(response)) {
    return response as T;
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

  // Direct primitive checked above

  // Handle object structure safely without explicit any cast
  // if response is null/undefined it returned fallback at start


  // Wrapped in data
  if (response && typeof response === 'object' && 'data' in response) {
    const anyResponse = response as Record<string, unknown>;
    const innerData = anyResponse.data;

    // Direct primitive in data
    if (typeof innerData === typeof fallback) {
      return innerData as T;
    }

    // Double wrapped
    if (innerData && typeof innerData === 'object' && 'data' in innerData) {
      const doubleInner = (innerData as Record<string, unknown>).data;
      if (typeof doubleInner === typeof fallback) {
        return doubleInner as T;
      }
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

  const obj = response as Record<string, unknown>;

  if (obj[propertyName] !== undefined) {
    return obj[propertyName] as T;
  }

  if (obj.data !== undefined && obj.data !== null && typeof obj.data === 'object') {
    const innerObj = obj.data as Record<string, unknown>;

    if (innerObj[propertyName] !== undefined) {
      return innerObj[propertyName] as T;
    }

    const doubleInner = innerObj.data as Record<string, unknown> | null;
    if (doubleInner?.[propertyName] !== undefined) {
      return doubleInner[propertyName] as T;
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
  meta?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
  total?: number;
} {
  const data = unwrapArray<T>(response);
  const obj = response as Record<string, unknown>;

  let meta: Record<string, unknown> | undefined = undefined;
  let pagination: Record<string, unknown> | undefined = undefined;
  let total: number | undefined = undefined;

  // Use type guards or safe access for nested properties
  if (obj?.meta) {
    meta = obj.meta as Record<string, unknown>;
  } else if (obj?.data && typeof obj.data === 'object') {
    meta = (obj.data as Record<string, unknown>).meta as Record<string, unknown>;
  }

  if (obj?.pagination) {
    pagination = obj.pagination as Record<string, unknown>;
  } else if (obj?.data && typeof obj.data === 'object') {
    pagination = (obj.data as Record<string, unknown>).pagination as Record<string, unknown>;
  }

  if (typeof obj?.total === 'number') {
    total = obj.total;
  } else if (obj?.data && typeof obj.data === 'object' && typeof (obj.data as Record<string, unknown>).total === 'number') {
    total = (obj.data as Record<string, unknown>).total as number;
  } else if (meta && typeof meta === 'object' && typeof (meta as Record<string, unknown>).total === 'number') {
    total = (meta as Record<string, unknown>).total as number;
  } else if (pagination && typeof pagination === 'object' && typeof (pagination as Record<string, unknown>).total === 'number') {
    total = (pagination as Record<string, unknown>).total as number;
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

  // Check success field at various levels
  if (typeof response === 'object' && response !== null) {
    const r = response as Record<string, unknown>;
    if (r.success === true) return true;

    if (r.data && typeof r.data === 'object') {
      const d = r.data as Record<string, unknown>;
      if (d.success === true) return true;
      if (d.data && typeof d.data === 'object' && (d.data as Record<string, unknown>).success === true) return true;
    }

    // No explicit failure
    if (r.error || (r.data && typeof r.data === 'object' && (r.data as Record<string, unknown>).error)) return false;

    // Has data, assume success
    if (r.data !== undefined || Array.isArray(r)) return true;
  }

  return false;
}
