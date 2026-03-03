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

  // Turkish label mapping
  const segmentLabels: Record<string, string> = {
    'lead': 'Potansiyel Müşteri',
    'trial': 'Deneme Aşamasında',
    'control': 'Kontrol Hastası',
    'purchased': 'Mevcut Hasta',
    'vip': 'VIP',
    'premium': 'Premium',
    'standard': 'Standart',
    'new': 'Yeni',
    'churned': 'Kayıp'
  };

  const normalizedSegment = segment.toLowerCase();
  const label = segmentLabels[normalizedSegment] || segment;

  switch (segment.toUpperCase()) {
    case 'VIP':
    case 'PREMIUM':
      return <Badge variant="success" size="sm">{label}</Badge>;
    case 'PURCHASED':
    case 'STANDARD':
      return <Badge variant="default" size="sm">{label}</Badge>;
    case 'NEW':
    case 'LEAD':
    case 'TRIAL':
      return <Badge variant="primary" size="sm">{label}</Badge>;
    case 'CHURNED':
      return <Badge variant="danger" size="sm">{label}</Badge>;
    case 'CONTROL':
      return <Badge variant="warning" size="sm">{label}</Badge>;
    default:
      return <Badge variant="secondary" size="sm">{label}</Badge>;
  }
};

export const AcquisitionStatusBadge = ({ acquisitionType }: { acquisitionType?: string }) => {
  if (!acquisitionType) return <Badge variant="secondary" size="sm">-</Badge>;

  // Turkish label mapping
  const acquisitionLabels: Record<string, string> = {
    'referral': 'Referans',
    'online': 'Online',
    'walk-in': 'Ziyaret',
    'walk_in': 'Ziyaret',
    'social-media': 'Sosyal Medya',
    'social_media': 'Sosyal Medya',
    'advertisement': 'Reklam',
    'tabela': 'Tabela'
  };

  const normalizedType = acquisitionType.toLowerCase().replace('_', '-');
  const label = acquisitionLabels[normalizedType] || acquisitionType;
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
