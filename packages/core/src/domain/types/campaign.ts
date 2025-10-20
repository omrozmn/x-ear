import { BaseEntity, Money } from './common';

export interface Campaign extends BaseEntity {
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  targetAudience?: TargetAudience;
  budget?: Money;
  actualSpent?: Money;
  metrics?: CampaignMetrics;
  channels: CampaignChannel[];
}

export type CampaignType = 
  | 'promotional'
  | 'educational'
  | 'awareness'
  | 'seasonal'
  | 'product-launch';

export type CampaignStatus = 
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface TargetAudience {
  ageRange?: {
    min: number;
    max: number;
  };
  gender?: 'male' | 'female' | 'all';
  location?: string[];
  interests?: string[];
  conditions?: string[];
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  clickThroughRate: number;
  conversionRate: number;
  costPerClick?: number;
  costPerConversion?: number;
  roi?: number;
}

export type CampaignChannel = 
  | 'email'
  | 'sms'
  | 'social-media'
  | 'website'
  | 'print'
  | 'radio'
  | 'tv';

export interface CampaignCreateRequest {
  name: string;
  description?: string;
  type: CampaignType;
  startDate: string;
  endDate: string;
  targetAudience?: TargetAudience;
  budget?: Money;
  channels: CampaignChannel[];
}

export interface CampaignUpdateRequest extends Partial<CampaignCreateRequest> {
  id: string;
  status?: CampaignStatus;
}

export interface CampaignSearchFilters {
  search?: string;
  type?: CampaignType;
  status?: CampaignStatus;
  channel?: CampaignChannel;
  dateFrom?: string;
  dateTo?: string;
}