// Ported from legacy/admin-panel/frontend/src/types/index.ts

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        fields?: Record<string, string>;
    };
    request_id?: string;
    timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export enum TenantStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    CANCELLED = 'cancelled',
    TRIAL = 'trial'
}

export interface Tenant {
    id: string;
    name: string;
    company_name?: string;
    slug: string;
    owner_user_id: string;
    status: TenantStatus;
    billing_email: string;
    current_plan?: string;
    seat_limit?: number;
    user_count?: number;
    created_at: string;
    updated_at: string;
}

export interface DashboardMetrics {
    overview: {
        total_tenants: number;
        active_tenants: number;
        total_users: number;
        active_users: number;
        total_memberships: number;
        active_memberships: number;
        total_plans: number;
    };
    recent_activity: {
        new_tenants_7d: number;
        new_users_7d: number;
        new_memberships_7d: number;
        expiring_memberships_30d: number;
    };
    revenue: {
        monthly_recurring_revenue: number;
        annual_recurring_revenue: number;
    };
    health_metrics: {
        churn_rate_percent: number;
        avg_seat_utilization_percent: number;
        tenant_growth_rate: number;
        user_growth_rate: number;
    };
    alerts: {
        expiring_soon: number;
        high_churn: number;
        low_utilization: number;
    };
}

export enum AdminRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    STAFF = 'STAFF',
    VIEWER = 'VIEWER'
}

export interface AdminUser {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    name?: string; // Keep for backward compatibility if needed
    role: AdminRole;
    is_active: boolean;
    status?: 'active' | 'inactive'; // Keep for backward compatibility
    last_login?: string;
    created_at: string;
}

export enum InvoiceStatus {
    DRAFT = 'draft',
    OPEN = 'open',
    PAID = 'paid',
    VOID = 'void',
    OVERDUE = 'overdue',
    PENDING = 'pending', // Keep if needed
    CANCELLED = 'cancelled' // Keep if needed
}

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

export interface Invoice {
    id: string;
    tenant_id: string;
    tenant_name: string;
    invoice_number: string;
    amount?: number; // Legacy?
    subtotal: number;
    tax_total: number;
    total: number;
    currency: string;
    status: InvoiceStatus | string; // Allow string to match legacy 'draft' | 'open' etc.
    issue_date: string;
    due_date: string;
    paid_amount: number;
    paid_at?: string;
    paid_date?: string;
    created_at: string;
    updated_at: string;
    pdf_url?: string;
    items?: InvoiceItem[];
}

export interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    billing_cycle: 'monthly' | 'yearly';
    features: string[];
    is_active: boolean;
    created_at: string;
}

export enum TicketStatus {
    OPEN = 'open',
    IN_PROGRESS = 'in_progress',
    RESOLVED = 'resolved',
    CLOSED = 'closed'
}

export enum TicketPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export interface SupportTicket {
    id: string;
    subject: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    user_id: string;
    user_name: string;
    tenant_id: string;
    tenant_name: string;
    created_at: string;
    updated_at: string;
    messages?: TicketMessage[];
}

export interface TicketMessage {
    id: string;
    ticket_id: string;
    user_id: string;
    user_name: string;
    message: string;
    is_staff: boolean;
    created_at: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
    remember?: boolean;
}

export interface UsersResponse {
    users: AdminUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface InvoicesResponse {
    invoices: Invoice[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
