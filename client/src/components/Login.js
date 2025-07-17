import React from 'react';
import api from '../api';

export default function Login({ setToken }){
  const [email, setEmail]=React.useState('');
  const [password, setPassword]=React.useState('');
  const [twoFA, setTwoFA]=React.useState(false);
  const [token2FA, setToken2FA]=React.useState('');
  const handleSubmit = async e => {
    e.preventDefault();
    const res = await api.post('/auth/login',{ email, password, token: twoFA ? token2FA : undefined });
    if(res.data.twoFA) return setTwoFA(true);
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
  };
  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <input type='email' value={email} onChange={e=>setEmail(e.target.value)} placeholder='Email' />
      <input type='password' value={password} onChange={e=>setPassword(e.target.value)} placeholder='Password' />
      {twoFA && <input type='text' value={token2FA} onChange={e=>setToken2FA(e.target.value)} placeholder='2FA Token' />}
      <button type='submit'>{twoFA ? 'Verify 2FA' : 'Login'}</button>
    </form>
  );
}