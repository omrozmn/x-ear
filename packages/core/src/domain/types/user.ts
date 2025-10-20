import { BaseEntity, ContactInfo } from './common';

export interface User extends BaseEntity {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  status: UserStatus;
  lastLoginAt?: string;
  contactInfo?: ContactInfo;
  preferences?: UserPreferences;
}

export type UserRole = 
  | 'admin'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'manager'
  | 'technician';

export type UserStatus = 
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'pending-verification';

export interface Permission {
  resource: string;
  actions: PermissionAction[];
}

export type PermissionAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'export';

export interface UserPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  notifications: NotificationSettings;
  dashboard?: DashboardSettings;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  appointmentReminders: boolean;
  systemAlerts: boolean;
}

export interface DashboardSettings {
  widgets: string[];
  layout: 'grid' | 'list';
  refreshInterval: number;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions?: Permission[];
  contactInfo?: ContactInfo;
  temporaryPassword?: string;
}

export interface UserUpdateRequest extends Partial<UserCreateRequest> {
  id: string;
  status?: UserStatus;
  preferences?: UserPreferences;
}

export interface UserSearchFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  lastLoginFrom?: string;
  lastLoginTo?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  token: string;
  refreshToken?: string;
  expiresAt: string;
}