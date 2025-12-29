import React from 'react';
import { Affiliate } from 'x-ear/packages/types/affiliate';

interface AffiliateDetailPageProps {
  affiliate: Affiliate;
}

const AffiliateDetailPage: React.FC<AffiliateDetailPageProps> = ({ affiliate }) => {
  return (
    <div>
      <h1>Affiliate Detayı</h1>
      <ul>
        <li><b>ID:</b> {affiliate.id}</li>
        <li><b>Email:</b> {affiliate.email}</li>
        <li><b>IBAN:</b> {affiliate.iban}</li>
        <li><b>Aktif:</b> {affiliate.is_active ? 'Evet' : 'Hayır'}</li>
        <li><b>Oluşturulma:</b> {affiliate.created_at}</li>
      </ul>
    </div>
  );
};

export default AffiliateDetailPage;
