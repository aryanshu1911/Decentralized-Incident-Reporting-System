import React, { useState } from 'react';
import { loginUser, registerUser } from '../utils/api';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    specializations: []
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSpecializationChange = (e) => {
    const value = e.target.value;
    setFormData(prev => {
      const sp = prev.specializations.includes(value)
        ? prev.specializations.filter(s => s !== value)
        : [...prev.specializations, value];
      return { ...prev, specializations: sp };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let data;
      if (isRegister) {
        data = await registerUser(formData);
      } else {
        data = await loginUser({ username: formData.username, password: formData.password });
      }
      
      // Save token and user basic info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.response?.data?.msg || 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{isRegister ? 'Register' : 'Login'}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username (Pseudo-anonymous ID):</label>
            <input 
              type="text" 
              name="username" 
              value={formData.username} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          {isRegister && (
            <div className="form-group">
              <label>Role:</label>
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="user">User / Whistleblower</option>
                <option value="investigator">Investigator / Admin</option>
              </select>
            </div>
          )}

          {isRegister && formData.role === 'investigator' && (
            <div className="form-group">
              <label>Specializations (Select at least one):</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                {['Theft', 'Assault', 'Vandalism', 'Fraud', 'Harassment', 'Drug Activity', 'Traffic Violation', 'Public Disturbance', 'Cybercrime', 'Missing Person', 'Other'].map(cat => (
                  <label key={cat} style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 'normal', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      value={cat}
                      checked={formData.specializations.includes(cat)}
                      onChange={handleSpecializationChange}
                      style={{ marginRight: '8px', width: 'auto' }}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <button type="submit" className="submit-btn">
            {isRegister ? 'Create Account' : 'Login'}
          </button>
        </form>
        
        <p className="toggle-mode" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account? Login here.' : 'Need an account? Register here.'}
        </p>
      </div>
    </div>
  );
};

export default Login;
