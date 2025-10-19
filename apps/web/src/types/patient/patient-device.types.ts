/**
 * Patient Device Types
 * @fileoverview Device management and assignment related types
 * @version 1.0.0
 */

import type { 
  DeviceType, 
  DeviceSide, 
  DeviceStatus 
} from './patient-base.types';

// Extended Device Interface (already declared in base, extending here)
export interface PatientDeviceExtended {
  id: string;
  brand: string;
  model: string;
  serialNumber?: string;
  side: DeviceSide;
  type: DeviceType;
  status: DeviceStatus;
  
  // Purchase Information
  purchaseDate?: string;
  warrantyExpiry?: string;
  lastServiceDate?: string;
  price?: number;
  sgkScheme?: boolean;
  
  // Technical Information
  batteryType?: string;
  batteryLife?: number; // in days
  settings?: DeviceSettings;
  
  // Service History
  serviceHistory?: DeviceServiceRecord[];
  
  // Assignment Information
  assignedDate?: string;
  assignedBy?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  returnDate?: string;
  returnReason?: string;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceSettings {
  volume?: number;
  program?: string;
  frequencyResponse?: FrequencyBand[];
  compressionRatio?: number;
  noiseReduction?: boolean;
  feedbackCancellation?: boolean;
  directionalMicrophone?: boolean;
  customSettings?: Record<string, unknown>;
}

export interface FrequencyBand {
  frequency: number; // Hz
  gain: number; // dB
}

export interface DeviceServiceRecord {
  id: string;
  date: string;
  type: ServiceType;
  description: string;
  technician?: string;
  cost?: number;
  partsReplaced?: string[];
  nextServiceDate?: string;
  notes?: string;
}

export type ServiceType = 
  | 'maintenance' 
  | 'repair' 
  | 'calibration' 
  | 'battery_replacement' 
  | 'cleaning' 
  | 'adjustment' 
  | 'warranty_service';

// Device Assignment Types
export interface DeviceAssignment {
  id: string;
  patientId: string;
  deviceId: string;
  assignmentType: AssignmentType;
  startDate: string;
  endDate?: string;
  status: AssignmentStatus;
  notes?: string;
  assignedBy: string;
  createdAt: string;
}

export type AssignmentType = 'trial' | 'purchase' | 'loaner' | 'replacement';
export type AssignmentStatus = 'active' | 'completed' | 'cancelled' | 'returned';

// Device Inventory Types
export interface DeviceInventoryItem {
  id: string;
  brand: string;
  model: string;
  type: DeviceType;
  serialNumber: string;
  status: InventoryStatus;
  location?: string;
  purchaseDate?: string;
  cost?: number;
  supplier?: string;
  warrantyExpiry?: string;
  lastInventoryCheck?: string;
}

export type InventoryStatus = 
  | 'available' 
  | 'assigned' 
  | 'trial' 
  | 'maintenance' 
  | 'damaged' 
  | 'retired';