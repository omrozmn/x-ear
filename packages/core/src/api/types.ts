// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    requestId: string;
    timestamp: string;
    [key: string]: any;
  };
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: {
    requestId: string;
    timestamp: string;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export interface IdempotencyConfig {
  key?: string;
  ttl?: number;
}
