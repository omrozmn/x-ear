import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SMTPConfig from '../SMTPConfig';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SmtpHooks from '@/api/generated/smtp-configuration/smtp-configuration';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  EnvelopeIcon: () => <div data-testid="envelope-icon" />,
  CheckCircleIcon: () => <div data-testid="check-icon" />,
  ExclamationTriangleIcon: () => <div data-testid="warning-icon" />,
}));

describe('SMTPConfig Component', () => {
  let queryClient: QueryClient;

  const mockConfig = {
    data: {
      id: 'config_123',
      tenantId: 'tenant_456',
      host: 'mail.example.com',
      port: 587,
      username: 'user@example.com',
      fromEmail: 'noreply@example.com',
      fromName: 'Test Company',
      useTls: true,
      useSsl: false,
      timeout: 30,
      isActive: true,
      createdAt: '2025-01-23T10:00:00Z',
      updatedAt: '2025-01-23T10:00:00Z',
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
        <SMTPConfig />
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    vi.spyOn(SmtpHooks, 'useGetSMTPConfig').mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(SmtpHooks, 'useCreateOrUpdateSMTPConfig').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(SmtpHooks, 'useSendTestEmail').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderComponent();
    // Check for spinner SVG element instead of role
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders form with existing config data', async () => {
    vi.spyOn(SmtpHooks, 'useGetSMTPConfig').mockReturnValue({
      data: mockConfig,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(SmtpHooks, 'useCreateOrUpdateSMTPConfig').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(SmtpHooks, 'useSendTestEmail').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByDisplayValue('mail.example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('587')).toBeInTheDocument();
      expect(screen.getByDisplayValue('user@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('noreply@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
    });
  });

  it('validates form and shows errors for invalid input', async () => {
    vi.spyOn(SmtpHooks, 'useGetSMTPConfig').mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(SmtpHooks, 'useCreateOrUpdateSMTPConfig').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(SmtpHooks, 'useSendTestEmail').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderComponent();

    // Try to submit empty form
    const saveButton = screen.getByRole('button', { name: /Kaydet/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('SMTP sunucusu gerekli')).toBeInTheDocument();
      expect(screen.getByText('Kullanıcı adı gerekli')).toBeInTheDocument();
      expect(screen.getByText('Şifre gerekli')).toBeInTheDocument();
    });
  });

  it('calls API with correct data on form submission', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ data: mockConfig });
    const refetch = vi.fn();

    vi.spyOn(SmtpHooks, 'useGetSMTPConfig').mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch,
    } as any);

    vi.spyOn(SmtpHooks, 'useCreateOrUpdateSMTPConfig').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);

    vi.spyOn(SmtpHooks, 'useSendTestEmail').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderComponent();

    // Fill form
    const hostInput = screen.getByPlaceholderText('mail.example.com');
    const portInput = screen.getByPlaceholderText('587');
    const usernameInput = screen.getByPlaceholderText('user@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const fromEmailInput = screen.getByPlaceholderText('noreply@example.com');
    const fromNameInput = screen.getByPlaceholderText('X-Ear CRM');

    fireEvent.change(hostInput, { target: { value: 'smtp.gmail.com' } });
    fireEvent.change(portInput, { target: { value: '587' } });
    fireEvent.change(usernameInput, { target: { value: 'test@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(fromEmailInput, { target: { value: 'test@gmail.com' } });
    fireEvent.change(fromNameInput, { target: { value: 'Test Sender' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /Kaydet/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        data: expect.objectContaining({
          host: 'smtp.gmail.com',
          port: 587,
          username: 'test@gmail.com',
          password: 'password123',
          fromEmail: 'test@gmail.com',
          fromName: 'Test Sender',
        }),
      });
      expect(refetch).toHaveBeenCalled();
    });
  });

  it('handles API error on form submission', async () => {
    const toast = await import('react-hot-toast');
    const mutateAsync = vi.fn().mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'SMTP connection failed',
          },
        },
      },
    });

    vi.spyOn(SmtpHooks, 'useGetSMTPConfig').mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(SmtpHooks, 'useCreateOrUpdateSMTPConfig').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);

    vi.spyOn(SmtpHooks, 'useSendTestEmail').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderComponent();

    // Fill valid form
    fireEvent.change(screen.getByPlaceholderText('mail.example.com'), { target: { value: 'smtp.test.com' } });
    fireEvent.change(screen.getByPlaceholderText('587'), { target: { value: '587' } });
    fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass123' } });
    fireEvent.change(screen.getByPlaceholderText('noreply@example.com'), { target: { value: 'no@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('X-Ear CRM'), { target: { value: 'Test' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Kaydet/i }));

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('SMTP connection failed');
    });
  });

  it('sends test email when test button is clicked', async () => {
    const sendTestMutateAsync = vi.fn().mockResolvedValue({ data: { success: true } });
    const toast = await import('react-hot-toast');

    vi.spyOn(SmtpHooks, 'useGetSMTPConfig').mockReturnValue({
      data: mockConfig,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(SmtpHooks, 'useCreateOrUpdateSMTPConfig').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(SmtpHooks, 'useSendTestEmail').mockReturnValue({
      mutateAsync: sendTestMutateAsync,
      isPending: false,
    } as any);

    renderComponent();

    // Enter test email
    const testEmailInput = screen.getByPlaceholderText('test@example.com');
    fireEvent.change(testEmailInput, { target: { value: 'recipient@test.com' } });

    // Click test button
    const testButton = screen.getByRole('button', { name: /Test Mail Gönder/i });
    fireEvent.click(testButton);

    // Confirm
    await waitFor(() => {
      expect(screen.getByText(/recipient@test.com/)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /Evet, Gönder/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(sendTestMutateAsync).toHaveBeenCalledWith({
        data: { recipient: 'recipient@test.com' },
      });
      expect(toast.default.success).toHaveBeenCalledWith('Test e-postası gönderildi');
    });
  });

  it('validates test email address', async () => {
    const toast = await import('react-hot-toast');

    vi.spyOn(SmtpHooks, 'useGetSMTPConfig').mockReturnValue({
      data: mockConfig,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(SmtpHooks, 'useCreateOrUpdateSMTPConfig').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(SmtpHooks, 'useSendTestEmail').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderComponent();

    // Enter invalid email
    const testEmailInput = screen.getByPlaceholderText('test@example.com');
    fireEvent.change(testEmailInput, { target: { value: 'invalid-email' } });

    // Click test button
    const testButton = screen.getByRole('button', { name: /Test Mail Gönder/i });
    fireEvent.click(testButton);

    // Confirm
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /Evet, Gönder/i });
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Geçerli bir e-posta adresi girin');
    });
  });

  it('shows port warning for mismatched SSL/TLS settings', async () => {
    vi.spyOn(SmtpHooks, 'useGetSMTPConfig').mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(SmtpHooks, 'useCreateOrUpdateSMTPConfig').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(SmtpHooks, 'useSendTestEmail').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderComponent();

    // Default state has useSsl=true and port=587, which should show warning
    // Wait for component to render and check if warning appears
    await waitFor(() => {
      // The warning should be visible by default since SSL is true and port is 587
      expect(screen.getByText(/uyumsuz/i)).toBeInTheDocument();
    });
  });

  it('resets form to original values', async () => {
    vi.spyOn(SmtpHooks, 'useGetSMTPConfig').mockReturnValue({
      data: mockConfig,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(SmtpHooks, 'useCreateOrUpdateSMTPConfig').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(SmtpHooks, 'useSendTestEmail').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByDisplayValue('mail.example.com')).toBeInTheDocument();
    });

    // Change a value
    const hostInput = screen.getByDisplayValue('mail.example.com');
    fireEvent.change(hostInput, { target: { value: 'changed.com' } });

    expect(screen.getByDisplayValue('changed.com')).toBeInTheDocument();

    // Reset
    const resetButton = screen.getByRole('button', { name: /Sıfırla/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('mail.example.com')).toBeInTheDocument();
    });
  });
});
