
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesktopPartyDetailsPage } from '../../../pages/DesktopPartyDetailsPage';
import { PartyDetailResponseData } from '../../../api/generated/schemas/partyDetailResponseData';
import React from 'react';

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
    useParams: vi.fn(),
    useNavigate: vi.fn(),
}));

import { useParams } from '@tanstack/react-router';

// Define a mutable return value for useParty to control it across tests
const mockUsePartyReturn = {
    party: null as any,
    isLoading: false,
    error: null,
    loadParty: vi.fn(),
};

// Mock the custom hook
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
vi.mock('../../../hooks/useParties', () => ({
    useUpdateParty: () => ({ mutateAsync: vi.fn() })
}));
vi.mock('../../../components/GlobalErrorHandler', () => ({
    useGlobalError: () => ({ showError: vi.fn() }),
}));

// Mock child components that strictly need isolation
vi.mock('../../parties/PartyHeader', () => ({
    PartyHeader: ({ party }: any) => (
        <div data-testid="party-header">
            <h1>{party.first_name || party.firstName} {party.last_name || party.lastName}</h1>
            <span>Role: {party.roles?.map((r: any) => r.role_code).join(', ')}</span>
        </div>
    ),
}));

vi.mock('../../parties/PartyTabContent', () => ({
    PartyTabContent: () => <div data-testid="tab-content">Content</div>
}));

vi.mock('../../common/ErrorBoundary', () => ({
    ErrorBoundary: ({ children }: any) => <>{children}</>
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
    } as any;
};

describe('Party Role & Profile Integration Verification', () => {
    const mockUseParams = useParams as any;

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

        render(<DesktopPartyDetailsPage />);

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

        render(<DesktopPartyDetailsPage />);

        await waitFor(() => {
            expect(screen.getByTestId('party-header')).toBeInTheDocument();
        });

        // Assert hearing specific tabs ARE present
        expect(screen.getByText('İşitme Testleri')).toBeInTheDocument();
    });
});
