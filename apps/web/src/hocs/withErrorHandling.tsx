import React from 'react';
import { useGlobalError } from '../contexts/GlobalErrorContext';

// HOC for wrapping components with error handling
export const withErrorHandling = <P extends object>(
    Component: React.ComponentType<P>
) => {
    const WrappedComponent = (props: P) => {
        const { showError } = useGlobalError();

        // Add error boundary-like behavior
        React.useEffect(() => {
            const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
                showError(event.reason, {
                    title: 'Beklenmeyen Hata',
                    persistent: true
                });
            };

            const handleError = (event: ErrorEvent) => {
                showError(event.error, {
                    title: 'JavaScript Hatası',
                    persistent: true
                });
            };

            window.addEventListener('unhandledrejection', handleUnhandledRejection);
            window.addEventListener('error', handleError);

            return () => {
                window.removeEventListener('unhandledrejection', handleUnhandledRejection);
                window.removeEventListener('error', handleError);
            };
        }, [showError]);

        return <Component {...props} />;
    };

    WrappedComponent.displayName = `withErrorHandling(${Component.displayName || Component.name})`;
    return WrappedComponent;
};
