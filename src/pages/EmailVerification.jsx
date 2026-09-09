import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import navLogo from '../assets/navLOGO.png';

const styles = `
  .auth-wrapper {
    min-height: 100vh;
    background: #0A0D13;
    color: #F3F4F6;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 32px 16px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .auth-card-modern {
    width: 100%;
    max-width: 440px;
    background: rgba(18, 21, 28, 0.75);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 40px 32px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    text-align: center;
  }
  .btn-submit, .btn-google {
    width: 100%;
    padding: 14px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    font-size: 16px;
    transition: all 0.2s ease;
    margin-top: 12px;
    border: none;
  }
  .btn-submit {
    background: #F59E0B;
    color: #0A0D13;
  }
  .btn-submit:hover:not(:disabled) {
    background: #fbbf24;
    transform: translateY(-1px);
  }
  .btn-google {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    color: #F3F4F6;
  }
  .error-banner {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #FCA5A5;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(10, 13, 19, 0.2);
    border-top-color: #0A0D13;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export default function EmailVerification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      if (user) await sendEmailVerification(user);
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleVerifiedClick = () => {
    // Force a full page reload.
    // On reload, AuthContext will load the latest user (with emailVerified)
    // and the route guard will automatically redirect to /dashboard.
    window.location.reload();
  };

  return (
    <div className="auth-wrapper">
      <style>{styles}</style>
      <div className="auth-card-modern">
        <img src={navLogo} alt="Logo" style={{ height: '42px', marginBottom: '20px' }} />
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: '0 0 8px' }}>
          Verify Your Email
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: '0.95rem', margin: '0 0 24px' }}>
          We've sent a verification link to <strong style={{ color: '#F3F4F6' }}>{user?.email}</strong>.
          Please click the link in the email to activate your account.
        </p>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
          </div>
        )}

        <button className="btn-submit" onClick={handleVerifiedClick}>
          I've Verified – Continue
        </button>
        <button className="btn-google" onClick={handleResend} disabled={resending}>
          {resending ? 'Resending...' : 'Resend verification email'}
        </button>
        <button className="btn-google" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}