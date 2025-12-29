import React, { useState } from 'react';
import { loginAffiliate } from '../../../public/assets/api/affiliate';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginAffiliate({ email, password });
      setResult('Giriş başarılı!');
    } catch (err: any) {
      setResult('Hata: ' + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      <h1>Affiliate Giriş</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Giriş Yap</button>
      </form>
      {result && <p>{result}</p>}
    </div>
  );
};

export default LoginPage;
