/**
 * AI Components Higher-Order Components (HOCs)
 * 
 * HOCs for wrapping components with AI feature availability checks.
 * 
 * @module ai/components/hocs
 */

import React from 'react';
import { AIFeatureWrapper, type AIFeatureWrapperProps } from './AIFeatureWrapper';

/**
 * Higher-order component that wraps a component with AI feature availability check
 * 
 * @param Component - The component to wrap
 * @param wrapperProps - Props to pass to AIFeatureWrapper
 * @returns Wrapped component with AI availability check
 * 
 * @example
 * ```tsx
 * const AIChatButton = withAIFeature(
 *   ChatButton,
 *   { capability: 'chat', hideWhenUnavailable: true }
 * );
 * ```
 */
export function withAIFeature<P extends object>(
  Component: React.ComponentType<P>,
  wrapperProps?: Omit<AIFeatureWrapperProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => {
    return (
      <AIFeatureWrapper {...wrapperProps}>
        <Component {...props} />
      </AIFeatureWrapper>
    );
  };

  // Set display name for debugging
  WrappedComponent.displayName = `withAIFeature(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}
