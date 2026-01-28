import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DesktopReportsPage } from '../DesktopReportsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Router Hooks
vi.mock('@tanstack/react-router', () => ({
    useSearch: () => ({ tab: 'overview' }),
    useNavigate: () => vi.fn(),
    Link: ({ children }: any) => <a>{children}</a>
}));

// Mock Permissions Hook
vi.mock('../../hooks/usePermissions', () => ({
    usePermissions: () => ({
        hasPermission: () => true,
        isLoading: false
    })
}));

// Mock API Hooks
vi.mock('@/api/client/reports.client', () => ({
    useListReportOverview: () => ({
        data: { data: { total_revenue: 1000, total_sales: 50 }, success: true },
        isLoading: false
    }),
    useListReportFinancial: () => ({ data: { data: {} }, isLoading: false }),
    useListReportPatients: () => ({ data: { data: {} }, isLoading: false }),
    useListReportPromissoryNotes: () => ({ data: { data: {} }, isLoading: false }),
    useListReportPromissoryNoteByPatient: () => ({ data: { data: [] }, isLoading: false }),
    useListReportPromissoryNoteList: () => ({ data: { data: [] }, isLoading: false }),
    useListReportRemainingPayments: () => ({ data: { data: [] }, isLoading: false }),
    useListActivityLogs: () => ({ data: { data: [] }, isLoading: false }),
    useListReportPosMovements: () => ({ data: { data: [] }, isLoading: false }),
    useListActivityLogFilterOptions: () => ({ data: { data: {} }, isLoading: false }),
    getListReportOverviewQueryKey: () => ['test'],
    getListReportFinancialQueryKey: () => ['test'],
    getListReportPatientsQueryKey: () => ['test'],
    getListReportPromissoryNoteListQueryKey: () => ['test'],
}));

// Mock UI components
vi.mock('@x-ear/ui-web', async () => {
    return {
        Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
        Input: (props: any) => <input {...props} />,
        Select: (props: any) => <select {...props} />,
        Modal: ({ isOpen, children }: any) => isOpen ? <div>{children}</div> : null,
        Pagination: () => <div>Pagination</div>
    };
});

describe('DesktopReportsPage', () => {
    it('renders without crashing', async () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <DesktopReportsPage />
            </QueryClientProvider>
        );

        // Initial check - title should exist
        expect(await screen.findByText(/Raporlar ve Analizler/i)).toBeInTheDocument();

        // Check for Tabs
        expect(screen.getByText(/Genel Bakış/i)).toBeInTheDocument();
    });
});
