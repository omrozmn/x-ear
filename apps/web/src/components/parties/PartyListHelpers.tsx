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
import { useTranslation } from 'react-i18next';

// Component wrapper for Status Badge
export const StatusBadge = ({ status }: { status?: string }) => {
  const { t } = useTranslation('constants');

  const normalizedStatus = (status || '').toUpperCase();
  switch (normalizedStatus) {
    case 'ACTIVE':
      return <Badge variant="success" size="sm">{t('party.status.active')}</Badge>;
    case 'INACTIVE':
      return <Badge variant="warning" size="sm">{t('party.status.inactive')}</Badge>;
    case 'TRIAL':
      return <Badge variant="primary" size="sm">{t('party.status.trial')}</Badge>;
    case 'BLOCKED':
      return <Badge variant="danger" size="sm">Engelli</Badge>; // Add translation key if missing
    default:
      return <Badge variant="secondary" size="sm">Bilinmiyor</Badge>;
  }
};

export const SegmentBadge = ({ segment }: { segment?: string }) => {
  const { t } = useTranslation('constants');

  if (!segment) return <Badge variant="secondary" size="sm">-</Badge>;

  const label = t(`party.segment.${segment.toLowerCase()}`, { defaultValue: segment });

  switch (segment.toUpperCase()) {
    case 'VIP':
    case 'PREMIUM':
      return <Badge variant="success" size="sm">{label}</Badge>;
    case 'PURCHASED':
    case 'STANDARD':
      return <Badge variant="default" size="sm">{label}</Badge>;
    case 'NEW':
    case 'LEAD':
      return <Badge variant="primary" size="sm">{label}</Badge>;
    case 'CHURNED':
      return <Badge variant="danger" size="sm">{label}</Badge>;
    default:
      return <Badge variant="secondary" size="sm">{label}</Badge>;
  }
};

export const AcquisitionStatusBadge = ({ acquisitionType }: { acquisitionType?: string }) => {
  if (!acquisitionType) return <Badge variant="secondary" size="sm">-</Badge>;

  const label = acquisitionType;
  const upperType = acquisitionType.toUpperCase().replace('-', '_');

  switch (upperType) {
    case 'REFERRAL':
      return <Badge variant="primary" size="sm">{label}</Badge>;
    case 'ONLINE':
      return <Badge variant="success" size="sm">{label}</Badge>;
    case 'SOCIAL_MEDIA':
    case 'ADVERTISEMENT':
      return <Badge variant="default" size="sm">{label}</Badge>;
    case 'WALK_IN':
    case 'TABELA':
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
