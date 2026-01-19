import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render as customRender } from '../../test/utils';
import { LoginForm } from '../LoginForm';
import { useAuthStore } from '../../stores/authStore';

// Mock the auth store
vi.mock('../../stores/authStore');

const mockUseAuthStore = vi.mocked(useAuthStore);

describe('LoginForm', () => {
  const mockLogin = vi.fn();

  // Create a base state to be used for both hook and getState
  const baseState = {
    login: mockLogin,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
    initializeAuth: vi.fn(),
    setError: vi.fn(),
    verifyOtp: vi.fn(),
    sendOtp: vi.fn(),
    requiresOtp: false,
    requiresPhone: false,
    maskedPhone: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue(baseState);
    // Mock getState static method
    (useAuthStore as any).getState = vi.fn(() => baseState);
  });

  it('renders login form correctly', () => {
    customRender(<LoginForm />);

    expect(screen.getByText('X-EAR CRM')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Kullanıcı adı/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Şifre/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giriş Yap' })).toBeInTheDocument();
  });

  it('shows password when eye icon is clicked', async () => {
    const user = userEvent.setup();
    customRender(<LoginForm />);

    const passwordInput = screen.getByPlaceholderText(/Şifre/i);
    // Use the new aria-label
    const eyeButton = screen.getByRole('button', { name: /Şifreyi göster/i });

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(eyeButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /Şifreyi gizle/i })).toBeInTheDocument();
  });

  it('calls login function with correct credentials', async () => {
    const user = userEvent.setup();
    customRender(<LoginForm />);

    const usernameInput = screen.getByPlaceholderText(/Kullanıcı adı/i);
    const passwordInput = screen.getByPlaceholderText(/Şifre/i);
    const submitButton = screen.getByRole('button', { name: 'Giriş Yap' });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'testpassword');
    await user.click(submitButton);

    expect(mockLogin).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'testpassword',
    });
  });

  it('disables submit button when loading', () => {
    const loadingState = { ...baseState, isLoading: true };
    mockUseAuthStore.mockReturnValue(loadingState);
    (useAuthStore as any).getState = vi.fn(() => loadingState);

    customRender(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: 'Giriş yapılıyor...' });
    expect(submitButton).toBeDisabled();
  });

  it('displays error message when login fails', () => {
    const errorState = { ...baseState, error: 'Invalid credentials' };
    mockUseAuthStore.mockReturnValue(errorState);
    (useAuthStore as any).getState = vi.fn(() => errorState);

    customRender(<LoginForm />);

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('disables submit button when fields are empty', () => {
    customRender(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: 'Giriş Yap' });
    expect(submitButton).toBeDisabled();
  });

  it('trims whitespace from username', async () => {
    const user = userEvent.setup();
    customRender(<LoginForm />);

    const usernameInput = screen.getByPlaceholderText(/Kullanıcı adı/i);
    const passwordInput = screen.getByPlaceholderText(/Şifre/i);
    const submitButton = screen.getByRole('button', { name: 'Giriş Yap' });

    await user.type(usernameInput, '  testuser  ');
    await user.type(passwordInput, 'testpassword');
    await user.click(submitButton);

    expect(mockLogin).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'testpassword',
    });
  });
});