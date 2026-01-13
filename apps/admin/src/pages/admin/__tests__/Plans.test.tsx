import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Plans from '../Plans';
import { useQueryClient } from '@tanstack/react-query';
import * as ApiClient from '@/lib/api-client';

// Mock dependencies
vi.mock('@/components/Layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/lib/api-client', () => ({
    useListAdminPlans: vi.fn(),
    useCreateAdminPlan: vi.fn(),
    useUpdateAdminPlan: vi.fn(),
    useDeleteAdminPlan: vi.fn(),
    useListAdminSettings: vi.fn(),
}));

// Mock Radix UI Dialog
vi.mock('@radix-ui/react-dialog', () => ({
    Root: ({ children, open }: any) => open ? <div>{children}</div> : null,
    Portal: ({ children }: any) => <div>{children}</div>,
    Overlay: () => <div />,
    Content: ({ children }: any) => <div role="dialog">{children}</div>,
    Title: ({ children }: any) => <h2>{children}</h2>,
    Close: ({ children }: any) => <button>{children}</button>,
}));

describe('Plans Component', () => {
    const mockQueryClient = {
        invalidateQueries: vi.fn(),
    };

    const mockPlans = [
        {
            id: '1',
            name: 'Basic Plan',
            price: 100,
            plan_type: 'BASIC',
            billing_interval: 'MONTHLY',
            max_users: 5,
            is_active: true,
            description: 'Basic features',
        },
    ];

    const mockSettings = {
        data: {
            settings: {
                features: {
                    'advanced_reports': { mode: 'visible' }
                }
            }
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useQueryClient as any).mockReturnValue(mockQueryClient);
        (ApiClient.useListAdminPlans as any).mockReturnValue({
            data: { data: { plans: mockPlans } },
            isLoading: false,
            error: null,
        });
        (ApiClient.useListAdminSettings as any).mockReturnValue({
            data: mockSettings,
        });
        (ApiClient.useCreateAdminPlan as any).mockReturnValue({
            mutateAsync: vi.fn(),
        });
        (ApiClient.useUpdateAdminPlan as any).mockReturnValue({
            mutateAsync: vi.fn(),
        });
        (ApiClient.useDeleteAdminPlan as any).mockReturnValue({
            mutateAsync: vi.fn(),
        });
    });

    it('renders plans list correctly', () => {
        render(<Plans />);

        expect(screen.getByText('Planlar')).toBeInTheDocument();
        expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        expect(screen.getByText('100 TRY')).toBeInTheDocument();
        expect(screen.getByText('BASIC / MONTHLY')).toBeInTheDocument();
    });

    it('opens create modal when "Plan Ekle" is clicked', () => {
        render(<Plans />);

        const addButton = screen.getByText('Plan Ekle');
        fireEvent.click(addButton);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Yeni Plan Oluştur')).toBeInTheDocument();
    });

    it('fills form and submits new plan', async () => {
        const mutateAsync = vi.fn().mockResolvedValue({});
        (ApiClient.useCreateAdminPlan as any).mockReturnValue({ mutateAsync });

        render(<Plans />);

        // Open modal
        fireEvent.click(screen.getByText('Plan Ekle'));

        // Fill form
        fireEvent.change(screen.getByLabelText('Plan Adı'), { target: { value: 'Pro Plan' } });
        fireEvent.change(screen.getByLabelText('Fiyat (TRY)'), { target: { value: '200' } });

        // Submit
        fireEvent.click(screen.getByText('Oluştur'));

        await waitFor(() => {
            expect(mutateAsync).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'Pro Plan',
                    price: 200,
                }),
            });
        });
    });
});
