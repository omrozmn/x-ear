import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { AuthProvider } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalErrorProvider } from './components/GlobalErrorHandler';
import { ToastProvider } from '@x-ear/ui-web';
import { routeTree } from './routeTree.gen';

// Import orval-mutator to configure axios globally
import './api/orval-mutator';

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 10, // Increased to 10 minutes for better caching
        gcTime: 1000 * 60 * 60, // Increased to 60 minutes for longer cache retention
        refetchOnWindowFocus: false, // Prevent unnecessary refetches on window focus
        refetchOnReconnect: true, // Refetch when coming back online
        retry: (failureCount, error: unknown) => {
          // Don't retry on 4xx errors
          if (error && typeof error === 'object' && 'response' in error) {
            const httpError = error as { response?: { status?: number } };
            if (httpError.response?.status && httpError.response.status >= 400 && httpError.response.status < 500) {
              return false;
            }
          }
          // Reduce retry count to prevent resource exhaustion
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff with max 30s
      },
      mutations: {
        retry: (failureCount, error: unknown) => {
          // Don't retry mutations on 4xx errors
          if (error && typeof error === 'object' && 'response' in error) {
            const httpError = error as { response?: { status?: number } };
            if (httpError.response?.status && httpError.response.status >= 400 && httpError.response.status < 500) {
              return false;
            }
          }
          return failureCount < 1; // Only retry once for mutations
        },
      },
    },
  });

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <GlobalErrorProvider>
            <AuthProvider>
              <RouterProvider router={router} />
              <ReactQueryDevtools initialIsOpen={false} />
            </AuthProvider>
          </GlobalErrorProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
