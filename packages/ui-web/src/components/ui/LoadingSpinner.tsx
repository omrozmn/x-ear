import React from 'react';
import { clsx } from 'clsx';

export type LoadingSpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
export type LoadingSpinnerVariant = 'default' | 'button' | 'page';

export interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize;
  variant?: LoadingSpinnerVariant;
  className?: string;
  label?: string;
  'data-testid'?: string;
}

const sizeClasses: Record<LoadingSpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const borderSizeClasses: Record<LoadingSpinnerSize, string> = {
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-3',
  xl: 'border-4'
};

/**
 * LoadingSpinner Component
 * 
 * A reusable loading spinner with multiple sizes and variants
 * 
 * @example
 * // Default spinner
 * <LoadingSpinner />
 * 
 * @example
 * // Button spinner
 * <LoadingSpinner variant="button" size="sm" />
 * 
 * @example
 * // Page spinner with label
 * <LoadingSpinner variant="page" size="xl" label="Loading..." />
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className,
  label,
  'data-testid': testId
}) => {
  const getTestId = () => {
    if (testId) return testId;
    if (variant === 'button') return 'button-loading-spinner';
    if (variant === 'page') return 'page-loading-spinner';
    return 'loading-spinner';
  };

  const spinnerClasses = clsx(
    'animate-spin rounded-full border-t-transparent',
    sizeClasses[size],
    borderSizeClasses[size],
    {
      // Default and page variants - blue spinner
      'border-blue-600 dark:border-blue-400': variant === 'default' || variant === 'page',
      // Button variant - white spinner (for use in buttons)
      'border-white': variant === 'button'
    },
    className
  );

  // Page variant with centered layout and label
  if (variant === 'page') {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[200px] space-y-4"
        data-testid={getTestId()}
      >
        <div className={spinnerClasses} />
        {label && (
          <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
            {label}
          </p>
        )}
      </div>
    );
  }

  // Default and button variants - just the spinner
  return (
    <div className={spinnerClasses} data-testid={getTestId()} />
  );
};

/**
 * ButtonLoadingSpinner Component
 * 
 * A convenience component for button loading states
 * 
 * @example
 * <Button disabled={isLoading}>
 *   {isLoading && <ButtonLoadingSpinner />}
 *   Submit
 * </Button>
 */
export const ButtonLoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <LoadingSpinner
    variant="button"
    size="sm"
    className={clsx('mr-2', className)}
    data-testid="button-loading-spinner"
  />
);

/**
 * PageLoadingSpinner Component
 * 
 * A convenience component for full page loading states
 * 
 * @example
 * {isLoading && <PageLoadingSpinner label="Loading data..." />}
 */
export const PageLoadingSpinner: React.FC<{ label?: string; className?: string }> = ({
  label = 'Loading...',
  className
}) => (
  <LoadingSpinner
    variant="page"
    size="xl"
    label={label}
    className={className}
    data-testid="page-loading-spinner"
  />
);

export default LoadingSpinner;
