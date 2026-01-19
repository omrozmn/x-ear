/**
 * AI Configuration Module
 * 
 * Exports AI capability registry and helper functions.
 * 
 * @module ai/config
 */

export {
  AI_CAPABILITIES,
  isCapabilityAvailable,
  canUserAccessCapability,
  meetsPhaseRequirement,
  getCapabilityConfig,
  getAvailableCapabilities,
  requiresApproval,
  isRetryableCapability,
} from './capabilities';
