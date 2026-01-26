import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DesktopReportsPage } from '../DesktopReportsPage';
import { createMemoryHistory, createRouter, RouterProvider, createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the API hooks to prevent actual network calls during test
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

        // Create local route tree to avoid importing global broken one
        const rootRoute = createRootRoute({
            component: () => <Outlet />,
        });

        const indexRoute = createRoute({
            getParentRoute: () => rootRoute,
            path: '/',
            component: DesktopReportsPage,
        });

        const routeTree = rootRoute.addChildren([indexRoute]);
        const router = createRouter({ routeTree, history: createMemoryHistory() });

        render(
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        );

        // Initial check - title should exist
        expect(await screen.findByText(/Raporlar ve Analizler/i)).toBeInTheDocument();

        // Check for Tabs
        expect(screen.getByText(/Genel Bakış/i)).toBeInTheDocument();
    });
});
