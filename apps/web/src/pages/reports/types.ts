import {
    ReportPromissoryNotesResponse,
    PromissoryNotePatientItem,
    PromissoryNoteListItem,
    PosMovementItem
} from '@/api/generated/schemas';

export type TabId = 'overview' | 'sales' | 'parties' | 'promissory' | 'remaining' | 'activity' | 'pos_movements';

export interface FilterState {
    dateRange: {
        start: string;
        end: string;
    };
    branch?: string;
    days: number;
}

export interface ReportOverview {
    total_revenue?: number;
    total_sales?: number;
    appointment_rate?: number;
    conversion_rate?: number;
    total_parties?: number;
    new_parties?: number;
    total_appointments?: number;
}

export interface ReportFinancial {
    payment_methods?: Record<string, { amount: number }>;
    revenue_trend?: Record<string, number>;
    product_sales?: Record<string, { sales: number; revenue: number }>;
}

export interface ReportParties {
    party_segments?: {
        new: number;
        active: number;
        trial: number;
        inactive: number;
    };
    status_distribution?: Record<string, number>;
}

// Use generated types
export type ReportPromissoryNotes = ReportPromissoryNotesResponse;
export type ReportPromissoryNoteByParty = PromissoryNotePatientItem;
export type ReportPromissoryNoteListItem = PromissoryNoteListItem;
export type ReportPosMovementItem = PosMovementItem;
