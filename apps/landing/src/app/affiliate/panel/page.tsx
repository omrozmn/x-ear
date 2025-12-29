import React, { useState } from 'react';
import { getAffiliate } from '../../../public/assets/api/affiliate';

const PanelPage = () => {
  const [affiliateId, setAffiliateId] = useState('');
  const [affiliate, setAffiliate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    try {
      const data = await getAffiliate(Number(affiliateId));
      setAffiliate(data);
      setError(null);
    } catch (err: any) {
      setAffiliate(null);
      setError('Hata: ' + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      <h1>Affiliate Panel</h1>
      <input type="number" placeholder="Affiliate ID" value={affiliateId} onChange={e => setAffiliateId(e.target.value)} />
      <button onClick={handleFetch}>Bilgilerimi Getir</button>
      {affiliate && (
        <ul>
          <li><b>ID:</b> {affiliate.id}</li>
          <li><b>Email:</b> {affiliate.email}</li>
          <li><b>IBAN:</b> {affiliate.iban}</li>
          <li><b>Aktif:</b> {affiliate.is_active ? 'Evet' : 'Hayır'}</li>
        </ul>
      )}
      {error && <p>{error}</p>}
    </div>
  );
};

export default PanelPage;
