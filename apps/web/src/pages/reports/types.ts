import {
    ReportPromissoryNotesResponse,
    PromissoryNotePatientItem,
    PromissoryNoteListItem,
    PosMovementItem
} from '@/api/generated/schemas';

export type TabId = 'overview' | 'sales' | 'parties' | 'promissory' | 'remaining' | 'activity' | 'pos_movements' | 'report_tracking';

export interface FilterState {
    dateRange: {
        start: string;
        end: string;
    };
    branch?: string;
    branches?: string[];
    days: number;
}

export interface ReportOverview {
    totalRevenue?: number;
    totalSales?: number;
    appointmentRate?: number;
    conversionRate?: number;
    totalPatients?: number;
    newPatients?: number;
    totalAppointments?: number;
}

export interface ReportFinancial {
    paymentMethods?: Record<string, { amount: number }>;
    revenueTrend?: Record<string, number>;
    productSales?: Record<string, { sales: number; revenue: number }>;
}

export interface ReportParties {
    summary?: {
        totalPatients?: number;
        newPatients?: number;
        patientsWithSales?: number;
        patientsWithUpcomingAppointments?: number;
        highPriorityPatients?: number;
    };
    patientSegments?: {
        new: number;
        active: number;
        trial: number;
        inactive: number;
    };
    statusDistribution?: Record<string, number>;
    ageDistribution?: Record<string, number>;
    acquisitionBreakdown?: Record<string, number>;
    segmentBreakdown?: Record<string, number>;
}

export interface ReportTrackingItem {
    id: string;
    saleId?: string;
    partyId?: string;
    partyName: string;
    branchId?: string;
    branchName?: string;
    brand?: string;
    model?: string;
    deviceName?: string;
    serialNumber?: string;
    ear?: string;
    reportStatus?: string;
    deliveryStatus?: string;
    assignedDate?: string;
    saleDate?: string;
    updatedAt?: string;
}

export type ReportPromissoryNotes = ReportPromissoryNotesResponse;
export type ReportPromissoryNoteByParty = PromissoryNotePatientItem & {
    firstDueDate?: string;
    lastDueDate?: string;
};
export type ReportPromissoryNoteListItem = PromissoryNoteListItem;
export type ReportPosMovementItem = PosMovementItem;
