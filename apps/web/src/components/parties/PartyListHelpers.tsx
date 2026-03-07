/**
 * Party List Helper Components and Functions
 * 
 * This file contains helper components and utility functions for the PartyList component.
 * It intentionally exports both components and helper functions to keep them co-located.
 * 
 * Note: This file triggers react-refresh/only-export-components warning because it exports
 * both React components (StatusBadge, SegmentBadge, etc.) and utility functions (formatDate, formatPhone).
 * This is an intentional design decision to keep related helpers together.
 * 
 * Alternative approaches considered:
 * 1. Split into separate files (components/ and utils/) - rejected due to tight coupling
 * 2. Convert all utilities to components - rejected as some are pure functions
 * 3. Accept the warning - chosen as the pragmatic solution
 */

import React from 'react';
import { Badge } from '@x-ear/ui-web';
import { getSegmentLabel, getAcquisitionLabel } from '../../utils/party-segments';

// Component wrapper for Status Badge
export const StatusBadge = ({ status }: { status?: string }) => {

  const normalizedStatus = (status || '').toUpperCase();
  
  // Turkish label mapping
  const statusLabels: Record<string, string> = {
    'ACTIVE': 'Aktif',
    'INACTIVE': 'Pasif',
    'TRIAL': 'Deneme',
    'BLOCKED': 'Engelli'
  };
  
  const label = statusLabels[normalizedStatus] || 'Bilinmiyor';
  
  switch (normalizedStatus) {
    case 'ACTIVE':
      return <Badge variant="success" size="sm">{label}</Badge>;
    case 'INACTIVE':
      return <Badge variant="warning" size="sm">{label}</Badge>;
    case 'TRIAL':
      return <Badge variant="primary" size="sm">{label}</Badge>;
    case 'BLOCKED':
      return <Badge variant="danger" size="sm">{label}</Badge>;
    default:
      return <Badge variant="secondary" size="sm">{label}</Badge>;
  }
};

export const SegmentBadge = ({ segment }: { segment?: string }) => {
  if (!segment) return <Badge variant="secondary" size="sm">-</Badge>;

  // Use dynamic label from settings
  const label = getSegmentLabel(segment);

  switch (segment.toLowerCase()) {
    case 'vip':
    case 'premium':
      return <Badge variant="success" size="sm">{label}</Badge>;
    case 'customer':
    case 'existing':
    case 'purchased':
      return <Badge variant="default" size="sm">{label}</Badge>;
    case 'new':
    case 'lead':
    case 'trial':
      return <Badge variant="primary" size="sm">{label}</Badge>;
    case 'churned':
      return <Badge variant="danger" size="sm">{label}</Badge>;
    case 'control':
      return <Badge variant="warning" size="sm">{label}</Badge>;
    default:
      return <Badge variant="secondary" size="sm">{label}</Badge>;
  }
};

export const AcquisitionStatusBadge = ({ acquisitionType }: { acquisitionType?: string }) => {
  if (!acquisitionType) return <Badge variant="secondary" size="sm">-</Badge>;

  // Use dynamic label from settings
  const label = getAcquisitionLabel(acquisitionType);

  switch (acquisitionType.toLowerCase().replace('_', '-')) {
    case 'referral':
      return <Badge variant="primary" size="sm">{label}</Badge>;
    case 'online':
      return <Badge variant="success" size="sm">{label}</Badge>;
    case 'social-media':
    case 'advertisement':
      return <Badge variant="default" size="sm">{label}</Badge>;
    case 'walk-in':
    case 'tabela':
      return <Badge variant="secondary" size="sm">{label}</Badge>;
    default:
      return <Badge variant="secondary" size="sm">{label}</Badge>;
  }
};

export const BranchBadge = ({ branchId, branchName }: { branchId?: string, branchName?: string }) => {
  if (!branchId && !branchName) return <Badge variant="secondary" size="sm">-</Badge>;

  const branchLabels: Record<string, string> = {
    'branch-1': 'Merkez Şube',
    'branch-2': 'Kadıköy Şube',
    'branch-3': 'Beşiktaş Şube'
  };

  const label = branchId ? (branchLabels[branchId] || branchName || branchId) : branchName || '-';

  return <Badge variant="default" size="sm">{label}</Badge>;
};

// Deprecated wrapper functions - removed as they trigger Fast Refresh warnings and are unused.
// Use components <StatusBadge />, <SegmentBadge />, etc. directly.
