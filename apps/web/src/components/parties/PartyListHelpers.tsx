import React from 'react';
import { Badge } from '@x-ear/ui-web';

/**
 * Helper functions for PartyList component
 * Keeps main component under 500 LOC
 */

export const getStatusBadge = (status?: string) => {
  const normalizedStatus = (status || '').toUpperCase();
  switch (normalizedStatus) {
    case 'ACTIVE':
      return <Badge variant="success" size="sm">Aktif</Badge>;
    case 'INACTIVE':
      return <Badge variant="warning" size="sm">Pasif</Badge>;
    case 'TRIAL':
      return <Badge variant="primary" size="sm">Deneme</Badge>;
    case 'BLOCKED':
      return <Badge variant="danger" size="sm">Engelli</Badge>;
    default:
      return <Badge variant="secondary" size="sm">Bilinmiyor</Badge>;
  }
};

export const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('tr-TR');
  } catch {
    return '-';
  }
};

export const formatPhone = (phone?: string) => {
  if (!phone) return '-';
  // Format Turkish phone number
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
  }
  return phone;
};

export const getSegmentBadge = (segment?: string) => {
  if (!segment) return <Badge variant="secondary" size="sm">-</Badge>;
  
  const segmentLabels: Record<string, string> = {
    'NEW': 'Yeni',
    'LEAD': 'Potansiyel',
    'TRIAL': 'Deneme',
    'PURCHASED': 'Satın Alınmış',
    'CONTROL': 'Kontrol',
    'RENEWAL': 'Yenileme',
    'EXISTING': 'Mevcut',
    'VIP': 'VIP',
    'PREMIUM': 'Premium',
    'STANDARD': 'Standart',
    'BASIC': 'Temel',
    'CHURNED': 'Kayıp'
  };
  
  const label = segmentLabels[segment.toUpperCase()] || segment;
  
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

export const getAcquisitionStatusBadge = (acquisitionType?: string) => {
  if (!acquisitionType) return <Badge variant="secondary" size="sm">-</Badge>;
  
  const acquisitionLabels: Record<string, string> = {
    // Lowercase variants (backend format)
    'referral': 'Referans',
    'online': 'Online',
    'walk-in': 'Ziyaret',
    'social-media': 'Sosyal Medya',
    'advertisement': 'Reklam',
    'tabela': 'Tabela',
    'other': 'Diğer',
    // Uppercase variants (for compatibility)
    'REFERRAL': 'Referans',
    'ONLINE': 'Online',
    'WALK_IN': 'Ziyaret',
    'SOCIAL': 'Sosyal Medya',
    'SOCIAL-MEDIA': 'Sosyal Medya',
    'ADVERTISEMENT': 'Reklam',
    'TABELA': 'Tabela',
    'OTHER': 'Diğer'
  };
  
  const label = acquisitionLabels[acquisitionType] || acquisitionType;
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

export const getBranchBadge = (branchId?: string, branchName?: string) => {
  if (!branchId && !branchName) return <Badge variant="secondary" size="sm">-</Badge>;
  
  const branchLabels: Record<string, string> = {
    'branch-1': 'Merkez Şube',
    'branch-2': 'Kadıköy Şube',
    'branch-3': 'Beşiktaş Şube'
  };
  
  const label = branchId ? (branchLabels[branchId] || branchName || branchId) : branchName || '-';
  
  return <Badge variant="default" size="sm">{label}</Badge>;
};
