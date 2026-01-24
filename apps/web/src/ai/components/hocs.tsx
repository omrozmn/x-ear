import React from 'react';
import type { AICapability } from '../types/ai.types';
import { AIFeatureWrapper } from './AIFeatureWrapper';

export type WithAIFeatureOptions = {
  capability?: AICapability;
  requirePartyContext?: boolean;
};

export function withAIFeature<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAIFeatureOptions = {}
): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => {
    return (
      <AIFeatureWrapper
        capability={options.capability}
        requirePartyContext={options.requirePartyContext}
      >
        <Component {...props} />
      </AIFeatureWrapper>
    );
  };

  Wrapped.displayName = `withAIFeature(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
}
