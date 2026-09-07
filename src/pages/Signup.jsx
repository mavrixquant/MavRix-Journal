// src/pages/Signup.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Set display name
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await updateProfile(userCredential.user, { displayName: fullName });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="auth-sub">Start your journey</p>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={{ flex: 1 }}
            />
          </div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-btn">Sign Up</button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}