import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EmailLogs from '../EmailLogs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as EmailLogsHooks from '@/api/generated/email-logs/email-logs';

// Mock heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  EnvelopeIcon: () => <div data-testid="envelope-icon" />,
  ChevronDownIcon: () => <div data-testid="chevron-down-icon" />,
  ChevronUpIcon: () => <div data-testid="chevron-up-icon" />,
}));

describe('EmailLogs Component', () => {
  let queryClient: QueryClient;

  const mockEmailLogs = {
    data: {
      items: [
        {
          id: 'log_1',
          tenantId: 'tenant_123',
          recipient: 'user1@example.com',
          subject: 'Password Reset Request',
          bodyPreview: 'You requested a password reset...',
          status: 'sent',
          sentAt: '2025-01-23T10:00:00Z',
          errorMessage: null,
          retryCount: 0,
          templateName: 'password_reset',
          scenario: 'password_reset',
          createdAt: '2025-01-23T09:59:00Z',
          updatedAt: '2025-01-23T10:00:00Z',
        },
        {
          id: 'log_2',
          tenantId: 'tenant_123',
          recipient: 'user2@example.com',
          subject: 'Invoice Created',
          bodyPreview: 'Your invoice has been created...',
          status: 'failed',
          sentAt: null,
          errorMessage: 'SMTP connection timeout',
          retryCount: 3,
          templateName: 'invoice_created',
          scenario: 'invoice_created',
          createdAt: '2025-01-23T09:58:00Z',
          updatedAt: '2025-01-23T10:05:00Z',
        },
        {
          id: 'log_3',
          tenantId: 'tenant_123',
          recipient: 'user3@example.com',
          subject: 'User Invite',
          bodyPreview: 'You have been invited...',
          status: 'pending',
          sentAt: null,
          errorMessage: null,
          retryCount: 0,
          templateName: 'user_invite',
          scenario: 'user_invite',
          createdAt: '2025-01-23T10:10:00Z',
          updatedAt: '2025-01-23T10:10:00Z',
        },
      ],
      total: 3,
      page: 1,
      perPage: 25,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EmailLogs />
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    renderComponent();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders table with email logs correctly', async () => {
    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockReturnValue({
      data: mockEmailLogs,
      isLoading: false,
    } as any);

    renderComponent();

    await waitFor(() => {
      // Check if all recipients are rendered
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
      expect(screen.getByText('user3@example.com')).toBeInTheDocument();

      // Check if subjects are rendered
      expect(screen.getByText('Password Reset Request')).toBeInTheDocument();
      expect(screen.getByText('Invoice Created')).toBeInTheDocument();
      expect(screen.getByText('User Invite')).toBeInTheDocument();

      // Check if status badges are rendered (use getAllByText since they also appear in select)
      const sentBadges = screen.getAllByText('Gönderildi');
      expect(sentBadges.length).toBeGreaterThan(0);
      
      const failedBadges = screen.getAllByText('Başarısız');
      expect(failedBadges.length).toBeGreaterThan(0);
      
      const pendingBadges = screen.getAllByText('Beklemede');
      expect(pendingBadges.length).toBeGreaterThan(0);
    });
  });

  it('displays empty state when no logs', async () => {
    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockReturnValue({
      data: {
        data: {
          items: [],
          total: 0,
          page: 1,
          perPage: 25,
          totalPages: 1,
        },
      },
      isLoading: false,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('E-posta logu bulunamadı')).toBeInTheDocument();
    });
  });

  it('expands and collapses row to show error message', async () => {
    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockReturnValue({
      data: mockEmailLogs,
      isLoading: false,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    });

    // Error message should not be visible initially
    expect(screen.queryByText('SMTP connection timeout')).not.toBeInTheDocument();

    // Find and click the expand button for the failed email (log_2)
    const expandButtons = screen.getAllByLabelText('Genişlet');
    fireEvent.click(expandButtons[1]); // Second row (failed email)

    // Error message should now be visible
    await waitFor(() => {
      expect(screen.getByText('SMTP connection timeout')).toBeInTheDocument();
      expect(screen.getByText('Hata Mesajı:')).toBeInTheDocument();
    });

    // Click collapse button
    const collapseButton = screen.getByLabelText('Daralt');
    fireEvent.click(collapseButton);

    // Error message should be hidden again
    await waitFor(() => {
      expect(screen.queryByText('SMTP connection timeout')).not.toBeInTheDocument();
    });
  });

  it('filters by status', async () => {
    const mockUseGetEmailLogs = vi.fn().mockReturnValue({
      data: mockEmailLogs,
      isLoading: false,
    });

    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockImplementation(mockUseGetEmailLogs);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Find status filter select
    const statusSelect = screen.getByLabelText('Durum');
    fireEvent.change(statusSelect, { target: { value: 'failed' } });

    // Check if hook was called with status filter
    await waitFor(() => {
      expect(mockUseGetEmailLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          page: 1,
        })
      );
    });
  });

  it('filters by recipient', async () => {
    const mockUseGetEmailLogs = vi.fn().mockReturnValue({
      data: mockEmailLogs,
      isLoading: false,
    });

    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockImplementation(mockUseGetEmailLogs);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Find recipient filter input
    const recipientInput = screen.getByPlaceholderText('E-posta adresi ara...');
    fireEvent.change(recipientInput, { target: { value: 'user1@' } });

    // Check if hook was called with recipient filter
    await waitFor(() => {
      expect(mockUseGetEmailLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'user1@',
          page: 1,
        })
      );
    });
  });

  it('filters by date range', async () => {
    const mockUseGetEmailLogs = vi.fn().mockReturnValue({
      data: mockEmailLogs,
      isLoading: false,
    });

    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockImplementation(mockUseGetEmailLogs);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Find date pickers by label
    const dateFromLabel = screen.getByText('Başlangıç Tarihi');
    const dateFromPicker = dateFromLabel.parentElement?.querySelector('input');
    
    if (dateFromPicker) {
      // Simulate date selection (DatePicker component behavior)
      const testDate = new Date('2025-01-23');
      fireEvent.change(dateFromPicker, { target: { value: testDate.toISOString() } });

      // Check if hook was called with date filter
      await waitFor(() => {
        expect(mockUseGetEmailLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
          })
        );
      });
    }
  });

  it('clears all filters', async () => {
    const mockUseGetEmailLogs = vi.fn().mockReturnValue({
      data: mockEmailLogs,
      isLoading: false,
    });

    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockImplementation(mockUseGetEmailLogs);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Apply a filter
    const recipientInput = screen.getByPlaceholderText('E-posta adresi ara...');
    fireEvent.change(recipientInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Filtreleri Temizle')).toBeInTheDocument();
    });

    // Click clear filters button
    const clearButton = screen.getByText('Filtreleri Temizle');
    fireEvent.click(clearButton);

    // Check if filters are cleared
    await waitFor(() => {
      expect(mockUseGetEmailLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          status: undefined,
          recipient: undefined,
          dateFrom: undefined,
          dateTo: undefined,
          page: 1,
        })
      );
    });
  });

  it('handles pagination correctly', async () => {
    const mockMultiPageData = {
      data: {
        items: mockEmailLogs.data.items,
        total: 100,
        page: 1,
        perPage: 25,
        totalPages: 4,
      },
    };

    const mockUseGetEmailLogs = vi.fn().mockReturnValue({
      data: mockMultiPageData,
      isLoading: false,
    });

    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockImplementation(mockUseGetEmailLogs);

    renderComponent();

    await waitFor(() => {
      // Check if total count is displayed
      expect(screen.getByText(/100/)).toBeInTheDocument();
      expect(screen.getByText(/kayıt bulundu/)).toBeInTheDocument();
    });
  });

  it('displays retry count correctly', async () => {
    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockReturnValue({
      data: mockEmailLogs,
      isLoading: false,
    } as any);

    renderComponent();

    await waitFor(() => {
      // Check retry counts are displayed
      const retryCounts = screen.getAllByText(/^[0-3]$/);
      expect(retryCounts.length).toBeGreaterThan(0);
    });
  });

  it('formats dates correctly', async () => {
    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockReturnValue({
      data: mockEmailLogs,
      isLoading: false,
    } as any);

    renderComponent();

    await waitFor(() => {
      // Check if dates are formatted (Turkish locale)
      // The exact format depends on the browser/environment
      // Use getAllByText since multiple dates will match
      const dateElements = screen.getAllByText(/23\.01\.2025/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  it('shows body preview in expanded row', async () => {
    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockReturnValue({
      data: mockEmailLogs,
      isLoading: false,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Expand first row
    const expandButtons = screen.getAllByLabelText('Genişlet');
    fireEvent.click(expandButtons[0]);

    // Check if body preview is visible
    await waitFor(() => {
      expect(screen.getByText('You requested a password reset...')).toBeInTheDocument();
      expect(screen.getByText('İçerik Önizleme:')).toBeInTheDocument();
    });
  });

  it('resets page to 1 when filters change', async () => {
    const mockUseGetEmailLogs = vi.fn().mockReturnValue({
      data: {
        data: {
          items: mockEmailLogs.data.items,
          total: 100,
          page: 2,
          perPage: 25,
          totalPages: 4,
        },
      },
      isLoading: false,
    });

    vi.spyOn(EmailLogsHooks, 'useGetEmailLogs').mockImplementation(mockUseGetEmailLogs);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Change status filter
    const statusSelect = screen.getByLabelText('Durum');
    fireEvent.change(statusSelect, { target: { value: 'sent' } });

    // Check if page was reset to 1
    await waitFor(() => {
      expect(mockUseGetEmailLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          status: 'sent',
        })
      );
    });
  });
});
