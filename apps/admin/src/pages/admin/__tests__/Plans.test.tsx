import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Plans from '../Plans';
import { useQueryClient } from '@tanstack/react-query';
import * as ApiClient from '@/lib/api-client';
import type { ReactNode } from 'react';

type UseQueryClientMock = typeof useQueryClient & {
    mockReturnValue: (value: unknown) => void;
};

type UseListAdminPlansResult = ReturnType<typeof ApiClient.useListAdminPlans>;
type UseCreateAdminPlanResult = ReturnType<typeof ApiClient.useCreateAdminPlan>;
type UseUpdateAdminPlanResult = ReturnType<typeof ApiClient.useUpdateAdminPlan>;
type UseDeleteAdminPlanResult = ReturnType<typeof ApiClient.useDeleteAdminPlan>;

function createListAdminPlansResult(overrides: Partial<UseListAdminPlansResult>): UseListAdminPlansResult {
    return {
        data: undefined,
        error: null,
        isLoading: false,
        ...overrides,
    } as unknown as UseListAdminPlansResult;
}

function createMutationResult<T>(overrides: Partial<T>): T {
    return {
        mutateAsync: vi.fn(),
        ...overrides,
    } as T;
}

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
    Root: ({ children, open }: { children: ReactNode; open?: boolean }) => open ? <div>{children}</div> : null,
    Portal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Overlay: () => <div />,
    Content: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div>,
    Title: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
    Close: ({ children }: { children: ReactNode }) => <button>{children}</button>,
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
            planType: 'BASIC',
            billingInterval: 'MONTHLY',
            maxUsers: 5,
            isActive: true,
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
        (useQueryClient as UseQueryClientMock).mockReturnValue(mockQueryClient);
        // Orval mutator already unwraps ResponseEnvelope, so hook returns inner data directly
        vi.mocked(ApiClient.useListAdminPlans).mockReturnValue(createListAdminPlansResult({
            data: { plans: mockPlans } as unknown as ReturnType<typeof ApiClient.useListAdminPlans>['data'],
            isLoading: false,
            error: null,
        }));
        vi.mocked(ApiClient.useListAdminSettings).mockReturnValue({
            data: mockSettings,
        } as ReturnType<typeof ApiClient.useListAdminSettings>);
        vi.mocked(ApiClient.useCreateAdminPlan).mockReturnValue(createMutationResult<UseCreateAdminPlanResult>({}));
        vi.mocked(ApiClient.useUpdateAdminPlan).mockReturnValue(createMutationResult<UseUpdateAdminPlanResult>({}));
        vi.mocked(ApiClient.useDeleteAdminPlan).mockReturnValue(createMutationResult<UseDeleteAdminPlanResult>({}));
    });

    it('renders plans list correctly', () => {
        render(<Plans />);

        expect(screen.getByText('Planlar')).toBeInTheDocument();
        expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        expect(screen.getByText(/100\s*₺/)).toBeInTheDocument();
        expect(screen.getByText('BASIC')).toBeInTheDocument();
        expect(screen.getByText('MONTHLY')).toBeInTheDocument();
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
        vi.mocked(ApiClient.useCreateAdminPlan).mockReturnValue(
            createMutationResult<UseCreateAdminPlanResult>({ mutateAsync })
        );

        render(<Plans />);

        // Open modal
        fireEvent.click(screen.getByText('Plan Ekle'));

        // Fill form - labels don't use htmlFor, so find inputs via their parent label text
        const nameInput = screen.getByText('Plan Adı').closest('div')!.querySelector('input')!;
        const priceInput = screen.getByText('Fiyat (TRY)').closest('div')!.querySelector('input')!;
        fireEvent.change(nameInput, { target: { value: 'Pro Plan' } });
        fireEvent.change(priceInput, { target: { value: '200' } });

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
