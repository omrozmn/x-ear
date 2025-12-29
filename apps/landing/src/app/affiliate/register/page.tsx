import React, { useState } from 'react';
import { registerAffiliate } from '../../../public/assets/api/affiliate';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [iban, setIban] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerAffiliate({ email, password, iban });
      setResult('Kayıt başarılı!');
    } catch (err: any) {
      setResult('Hata: ' + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      <h1>Affiliate Kayıt</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} required />
        <input type="text" placeholder="IBAN" value={iban} onChange={e => setIban(e.target.value)} required />
        <button type="submit">Kayıt Ol</button>
      </form>
      {result && <p>{result}</p>}
    </div>
  );
};

export default RegisterPage;
