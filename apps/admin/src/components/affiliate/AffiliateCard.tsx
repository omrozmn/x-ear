import React from 'react';
import { AffiliateRead } from '@/lib/api-client';

// Local type alias
type Affiliate = AffiliateRead;

interface AffiliateCardProps {
  affiliate: Affiliate;
}

const AffiliateCard: React.FC<AffiliateCardProps> = ({ affiliate }) => (
  <div className="affiliate-card">
    <h3>{affiliate.email}</h3>
    <p>IBAN: {affiliate.iban}</p>
    <p>Aktif: {(affiliate as any).isActive ? 'Evet' : 'Hayır'}</p>
    <p>Oluşturulma: {(affiliate as any).createdAt}</p>
  </div>
);

export default AffiliateCard;

