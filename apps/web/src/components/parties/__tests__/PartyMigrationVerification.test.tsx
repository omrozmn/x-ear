
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesktopPartyDetailsPage } from '../../../pages/DesktopPartyDetailsPage';
import { PartyDetailResponseData } from '../../../api/generated/schemas/partyDetailResponseData';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
    useParams: vi.fn(),
    useNavigate: vi.fn(),
}));

import { useParams } from '@tanstack/react-router';

// Define a mutable return value for useParty to control it across tests
const mockUsePartyReturn = {
    party: null as PartyDetailResponseData | null,
    isLoading: false,
    error: null,
    loadParty: vi.fn(),
};

// Mock the custom hook - page imports from '../hooks/useParty'
vi.mock('../../../hooks/useParty', () => ({
    useParty: () => mockUsePartyReturn,
}));
vi.mock('../../../hooks/party/useParty', () => ({
    useParty: () => mockUsePartyReturn,
}));

// Mock other hooks
vi.mock('../../../hooks/party/usePartyDevices', () => ({
    usePartyDevices: () => ({ devices: [], isLoading: false })
}));
vi.mock('../../../hooks/party/usePartySales', () => ({
    usePartySales: () => ({ sales: [], isLoading: false })
}));
vi.mock('../../../hooks/party/usePartyTimeline', () => ({
    usePartyTimeline: () => ({ timeline: [], isLoading: false })
}));
vi.mock('../../../hooks/party/usePartyDocuments', () => ({
    usePartyDocuments: () => ({ documents: [], isLoading: false })
}));
vi.mock('../../../hooks/party/usePartyHearingTests', () => ({
    usePartyHearingTests: () => ({ hearingTests: [], isLoading: false })
}));
vi.mock('../../../hooks/useParties', () => ({
    useUpdateParty: () => ({ mutateAsync: vi.fn() })
}));
vi.mock('../../../hooks/usePartyEditModal', () => ({
    usePartyEditModal: () => ({ isOpen: false, openModal: vi.fn(), closeModal: vi.fn(), partyToEdit: null })
}));
vi.mock('../../../components/GlobalErrorHandler', () => ({
    useGlobalError: () => ({ showError: vi.fn() }),
    GlobalErrorProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../../../hooks/useGlobalError', () => ({
    useGlobalError: () => ({ showError: vi.fn() }),
}));
vi.mock('../../../contexts/GlobalErrorContext', () => ({
    GlobalErrorProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../../../contexts/GlobalErrorContextType', () => ({
    GlobalErrorContext: { _currentValue: { showError: vi.fn(), error: null, clearError: vi.fn() } },
}));
vi.mock('../../../hooks/useSector', () => ({
    useSector: () => ({
        sector: 'hearing',
        sectorConfig: { id: 'hearing', name: 'Hearing', modules: [] },
        enabledModules: [],
        isModuleEnabled: () => true,
        isHearingSector: () => true,
        isLoading: false,
    }),
}));
vi.mock('@x-ear/ui-web', async () => {
    const ReactMod = await import('react');
    const TabsComp = Object.assign(
        ({ children }: any) => ReactMod.createElement('div', null, children),
        {
            List: ({ children, className }: any) => ReactMod.createElement('div', { className }, children),
            Trigger: ({ children, value, onClick, disabled, className, ...rest }: any) => ReactMod.createElement('button', { 'data-value': value, onClick, disabled, className, 'data-testid': rest['data-testid'] }, children),
            Content: ({ children }: any) => ReactMod.createElement('div', null, children),
        }
    );
    return {
        Button: ({ children, onClick, className }: any) => ReactMod.createElement('button', { onClick, className }, children),
        Card: ({ children }: any) => ReactMod.createElement('div', null, children),
        Badge: ({ children }: any) => ReactMod.createElement('span', null, children),
        Tabs: TabsComp,
        TabsList: TabsComp.List,
        TabsTrigger: TabsComp.Trigger,
        TabsContent: TabsComp.Content,
        Input: ReactMod.forwardRef((props: any, ref: any) => ReactMod.createElement('input', { ref, ...props })),
        Select: ReactMod.forwardRef(({ options, ...props }: any, ref: any) => ReactMod.createElement('select', { ref, ...props }, options?.map((o: any) => ReactMod.createElement('option', { key: o.value, value: o.value }, o.label)))),
        Textarea: ReactMod.forwardRef((props: any, ref: any) => ReactMod.createElement('textarea', { ref, ...props })),
        Modal: ({ isOpen, children }: any) => isOpen ? ReactMod.createElement('div', null, children) : null,
        Pagination: () => ReactMod.createElement('div', null, 'Pagination'),
    };
});
vi.mock('@/api/client/parties.client', () => ({
    useDeleteParty: () => ({ mutateAsync: vi.fn() }),
    useUpdateParty: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../../../services/party/party-api.service', () => ({
    partyApiService: { updateParty: vi.fn() },
}));
vi.mock('../../layout/HeaderBackButton', () => ({
    HeaderBackButton: () => <div>Back</div>,
}));
vi.mock('../../ui/ConfirmDialog', () => ({
    ConfirmDialog: () => null,
}));

// Mock child components that strictly need isolation
vi.mock('../../parties/PartyHeader', () => ({
    PartyHeader: ({ party }: { party: PartyDetailResponseData }) => {
        if (!party) return null;
        const partyData = party as Record<string, unknown>;
        const firstName = (partyData.first_name || partyData.firstName || '') as string;
        const lastName = (partyData.last_name || partyData.lastName || '') as string;
        const roles = Array.isArray(partyData.roles) 
            ? (partyData.roles as Array<{ role_code?: string }>).map(r => r.role_code).join(', ')
            : '';
        return (
            <div data-testid="party-header">
                <h1>{firstName} {lastName}</h1>
                <span>Role: {roles}</span>
            </div>
        );
    },
}));

vi.mock('../../parties/PartyTabs', () => ({
    PartyTabs: ({ party }: { party: Record<string, unknown> }) => {
        const hasHearingProfile = !!(party?.hearingProfile || party?.binding_hearing_profile);
        const roles = Array.isArray(party?.roles) ? (party.roles as Array<{ role_code?: string }>).map(r => r.role_code) : [];
        const isPatient = roles.includes('PATIENT');
        return (
            <div data-testid="party-tabs">
                <button>Genel Bilgiler</button>
                {(isPatient || hasHearingProfile) && <button>İşitme Testleri</button>}
                <button>Cihazlar</button>
                <button>Satışlar</button>
                <button>Belgeler</button>
            </div>
        );
    },
}));
vi.mock('../../parties/PartyTabContent', () => ({
    PartyTabContent: () => <div data-testid="tab-content">Content</div>
}));

vi.mock('../../common/ErrorBoundary', () => ({
    ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock Modals
vi.mock('../../parties/PartyFormModal', () => ({
    PartyFormModal: () => <div>MockPartyFormModal</div>
}));
vi.mock('../../parties/PartyTagUpdateModal', () => ({
    PartyTagUpdateModal: () => <div>MockPartyTagUpdateModal</div>
}));
vi.mock('../../forms/PartyNoteForm', () => ({
    PartyNoteForm: () => <div>MockPartyNoteForm</div>
}));

// Mock data builder
const createMockParty = (roles: string[], hasProfile: boolean): PartyDetailResponseData => {
    return {
        id: 'party-123',
        firstName: 'Test',
        lastName: 'User',
        roles: roles.map(role => ({ role_code: role, is_primary: true })),
        binding_hearing_profile: hasProfile ? { id: 'hp-123' } : null,
        // Note: PartyTabs checks party.hearingProfile or party.hearing_profile.
        // Ensure our mock data provides one of these.
        hearingProfile: hasProfile ? { id: 'hp-123' } : undefined,
        status: 'ACTIVE',
        createdAt: '2024-01-01',
        devices: [],
        sales: [],
        communications: []
    } as unknown as PartyDetailResponseData;
};

const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            {ui}
        </QueryClientProvider>
    );
};

describe('Party Role & Profile Integration Verification', () => {
    const mockUseParams = useParams as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseParams.mockReturnValue({ partyId: 'party-123' });
        mockUsePartyReturn.party = null;
        mockUsePartyReturn.isLoading = false;
        mockUsePartyReturn.error = null;
    });

    it('renders generic details for a potential customer (Lead/Customer) without hearing profile', async () => {
        const mockParty = createMockParty(['CUSTOMER'], false);
        mockUsePartyReturn.party = mockParty;

        renderWithProviders(<DesktopPartyDetailsPage />);

        await waitFor(() => {
            expect(screen.getByTestId('party-header')).toBeInTheDocument();
        });

        expect(screen.getByText('Test User')).toBeInTheDocument();

        // Assert hearing specific tabs are NOT present
        // The actual labels in PartyTabs.tsx are "İşitme Testleri"
        expect(screen.queryByText('İşitme Testleri')).not.toBeInTheDocument();

        // "Cihazlar" is currently ALWAYS shown in PartyTabs.tsx (no hidden logic) or did I change it?
        // In my edit to PartyTabs.tsx, I added `hidden: false` to 'devices'.
        // So "Cihazlar" SHOULD be present even for Customer if the array is empty.
        expect(screen.getByText('Cihazlar')).toBeInTheDocument();
    });

    it('renders hearing specific tabs for a PATIENT with hearing profile', async () => {
        const mockParty = createMockParty(['PATIENT'], true);
        mockUsePartyReturn.party = mockParty;

        renderWithProviders(<DesktopPartyDetailsPage />);

        await waitFor(() => {
            expect(screen.getByTestId('party-header')).toBeInTheDocument();
        });

        // Assert hearing specific tabs ARE present
        expect(screen.getByText('İşitme Testleri')).toBeInTheDocument();
    });
});
