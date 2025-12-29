import React from 'react';
import { Affiliate } from 'x-ear/packages/types/affiliate';

interface AffiliatesPageProps {
  affiliates: Affiliate[];
}

const AffiliatesPage: React.FC<AffiliatesPageProps> = ({ affiliates }) => {
  return (
    <div>
      <h1>Affiliate Listesi</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>IBAN</th>
            <th>Aktif</th>
            <th>Oluşturulma</th>
          </tr>
        </thead>
        <tbody>
          {affiliates.map((a) => (
            <tr key={a.id}>
              <td>{a.id}</td>
              <td>{a.email}</td>
              <td>{a.iban}</td>
              <td>{a.is_active ? 'Evet' : 'Hayır'}</td>
              <td>{a.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AffiliatesPage;
