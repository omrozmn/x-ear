import { createRootRoute, Outlet, redirect } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { MainLayout } from '../components/layout/MainLayout'

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password', '/register']

// Auth check function
function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const authStorage = localStorage.getItem('x-ear.auth.auth-storage-persist@v1');
    if (!authStorage) return false;
    
    const parsed = JSON.parse(authStorage);
    // Check for token (not accessToken) and isAuthenticated
    return !!(parsed?.state?.token && parsed?.state?.isAuthenticated);
  } catch {
    return false;
  }
}

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    // Skip auth check for public routes
    const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));
    if (isPublicRoute) return;
    
    // Check authentication
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
      });
    }
  },
  component: RootComponent,
  notFoundComponent: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-border max-w-md w-full text-center">
        <div className="text-muted-foreground mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sayfa Bulunamadı</h2>
        <p className="text-muted-foreground mb-6">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white premium-gradient tactile-press focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
        >
          Ana Sayfaya Dön
        </a>
      </div>
    </div>
  )
})

function RootComponent() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  // Public routes render without MainLayout
  if (isPublicRoute) {
    return (
      <>
        <Outlet />
        <TanStackRouterDevtools />
      </>
    )
  }

  // Protected routes render with MainLayout
  return (
    <>
      <MainLayout>
        <Outlet />
      </MainLayout>
      <TanStackRouterDevtools />
    </>
  )
}
