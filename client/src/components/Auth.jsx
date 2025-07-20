import React, { useState } from 'react';
import axios from 'axios';

const Auth = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const url = `${API_BASE_URL}${isLogin ? '/api/auth/login' : '/api/auth/register'}`;
    try {
      const res = await axios.post(url, { username, password });
      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        onLoginSuccess();
      } else {
        setError('Registration successful! Please log in.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred.');
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>{isLogin ? 'Welcome Back!' : 'Create Account'}</h1>
        {error && <p style={{ color: isLogin ? 'red' : 'green', textAlign: 'center' }}>{error}</p>}
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
        <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setError(''); }}>
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </a>
      </form>
    </div>
  );
};

export default Auth;