/**
 * Storage utility functions for localStorage and sessionStorage
 */

export type StorageType = 'localStorage' | 'sessionStorage';

/**
 * Safely gets an item from storage
 */
export const getStorageItem = <T = string>(
  key: string, 
  storageType: StorageType = 'localStorage',
  defaultValue?: T
): T | null => {
  try {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    const item = storage.getItem(key);
    
    if (item === null) {
      return defaultValue ?? null;
    }
    
    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(item);
    } catch {
      return item as T;
    }
  } catch (error) {
    console.warn(`Failed to get item from ${storageType}:`, error);
    return defaultValue ?? null;
  }
};

/**
 * Safely sets an item in storage
 */
export const setStorageItem = (
  key: string, 
  value: any, 
  storageType: StorageType = 'localStorage'
): boolean => {
  try {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    storage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.warn(`Failed to set item in ${storageType}:`, error);
    return false;
  }
};

/**
 * Safely removes an item from storage
 */
export const removeStorageItem = (
  key: string, 
  storageType: StorageType = 'localStorage'
): boolean => {
  try {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    storage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove item from ${storageType}:`, error);
    return false;
  }
};

/**
 * Clears all items from storage
 */
export const clearStorage = (storageType: StorageType = 'localStorage'): boolean => {
  try {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    storage.clear();
    return true;
  } catch (error) {
    console.warn(`Failed to clear ${storageType}:`, error);
    return false;
  }
};

/**
 * Gets all keys from storage
 */
export const getStorageKeys = (storageType: StorageType = 'localStorage'): string[] => {
  try {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    return Object.keys(storage);
  } catch (error) {
    console.warn(`Failed to get keys from ${storageType}:`, error);
    return [];
  }
};

/**
 * Checks if storage is available
 */
export const isStorageAvailable = (storageType: StorageType = 'localStorage'): boolean => {
  try {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets storage usage information
 */
export const getStorageUsage = (storageType: StorageType = 'localStorage'): {
  used: number;
  total: number;
  available: number;
  percentage: number;
} => {
  try {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    let used = 0;
    
    for (let key in storage) {
      if (storage.hasOwnProperty(key)) {
        used += storage[key].length + key.length;
      }
    }
    
    // Estimate total storage (usually 5-10MB for localStorage)
    const total = 5 * 1024 * 1024; // 5MB estimate
    const available = total - used;
    const percentage = (used / total) * 100;
    
    return {
      used,
      total,
      available,
      percentage: Math.round(percentage * 100) / 100
    };
  } catch (error) {
    console.warn(`Failed to get storage usage for ${storageType}:`, error);
    return { used: 0, total: 0, available: 0, percentage: 0 };
  }
};

/**
 * Creates a storage manager for a specific prefix
 */
export const createStorageManager = (prefix: string, storageType: StorageType = 'localStorage') => {
  const prefixedKey = (key: string) => `${prefix}_${key}`;
  
  return {
    get: <T = string>(key: string, defaultValue?: T) => 
      getStorageItem<T>(prefixedKey(key), storageType, defaultValue),
    
    set: (key: string, value: any) => 
      setStorageItem(prefixedKey(key), value, storageType),
    
    remove: (key: string) => 
      removeStorageItem(prefixedKey(key), storageType),
    
    clear: () => {
      const keys = getStorageKeys(storageType);
      const prefixedKeys = keys.filter(key => key.startsWith(`${prefix}_`));
      return prefixedKeys.every(key => removeStorageItem(key, storageType));
    },
    
    getKeys: () => {
      const keys = getStorageKeys(storageType);
      return keys
        .filter(key => key.startsWith(`${prefix}_`))
        .map(key => key.replace(`${prefix}_`, ''));
    }
  };
};