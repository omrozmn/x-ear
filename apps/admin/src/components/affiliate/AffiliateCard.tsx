import React from 'react';
import { Affiliate } from 'x-ear/packages/types/affiliate';

interface AffiliateCardProps {
  affiliate: Affiliate;
}

const AffiliateCard: React.FC<AffiliateCardProps> = ({ affiliate }) => (
  <div className="affiliate-card">
    <h3>{affiliate.email}</h3>
    <p>IBAN: {affiliate.iban}</p>
    <p>Aktif: {affiliate.is_active ? 'Evet' : 'Hayır'}</p>
    <p>Oluşturulma: {affiliate.created_at}</p>
  </div>
);

export default AffiliateCard;
