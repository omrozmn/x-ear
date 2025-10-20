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
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      user: null,
      logout: vi.fn(),
      initializeAuth: vi.fn(),
    });
  });

  it('renders login form correctly', () => {
    customRender(<LoginForm />);
    
    expect(screen.getByText('X-EAR CRM\'e Giriş Yapın')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Kullanıcı Adı')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Şifre')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giriş Yap' })).toBeInTheDocument();
  });

  it('shows password when eye icon is clicked', async () => {
    const user = userEvent.setup();
    customRender(<LoginForm />);
    
    const passwordInput = screen.getByPlaceholderText('Şifre');
    const eyeButton = screen.getByRole('button', { name: '' }); // Eye icon button
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(eyeButton);
    
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('calls login function with correct credentials', async () => {
    const user = userEvent.setup();
    customRender(<LoginForm />);
    
    const usernameInput = screen.getByPlaceholderText('Kullanıcı Adı');
    const passwordInput = screen.getByPlaceholderText('Şifre');
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
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
      isAuthenticated: false,
      user: null,
      logout: vi.fn(),
      initializeAuth: vi.fn(),
    });
    
    customRender(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Giriş yapılıyor...' });
    expect(submitButton).toBeDisabled();
  });

  it('displays error message when login fails', () => {
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: 'Invalid credentials',
      isAuthenticated: false,
      user: null,
      logout: vi.fn(),
      initializeAuth: vi.fn(),
    });
    
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
    
    const usernameInput = screen.getByPlaceholderText('Kullanıcı Adı');
    const passwordInput = screen.getByPlaceholderText('Şifre');
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