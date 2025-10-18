// Common domain types
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Address {
  street: string;
  city: string;
  district: string;
  postalCode: string;
  country: string;
}

export interface ContactInfo {
  phone: string;
  email?: string;
  address?: Address;
}

export interface Money {
  amount: number;
  currency: string;
}

export type Status = 'active' | 'inactive' | 'pending' | 'cancelled' | 'completed';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FilterOptions {
  search?: string;
  status?: Status;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}