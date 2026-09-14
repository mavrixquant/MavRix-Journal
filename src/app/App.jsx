// src/app/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import Login from '@/features/auth/components/LoginPage';
import Signup from '@/features/auth/components/SignupPage';
import AppLayout from '@/app/AppLayout';
import Landing from '@/features/landing/LandingPage';
import EmailVerification from '@/features/auth/components/EmailVerificationPage';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  const isVerified = user?.emailVerified;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            user ? (
              isVerified ? <Navigate to="/dashboard" /> : <Navigate to="/verify-email" />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/signup"
          element={
            user ? (
              isVerified ? <Navigate to="/dashboard" /> : <Navigate to="/verify-email" />
            ) : (
              <Signup />
            )
          }
        />
        <Route
          path="/verify-email"
          element={
            !user ? (
              <Navigate to="/login" />
            ) : isVerified ? (
              <Navigate to="/dashboard" />
            ) : (
              <EmailVerification />
            )
          }
        />
        <Route
          path="/dashboard/*"
          element={
            user ? (
              isVerified ? <AppLayout /> : <Navigate to="/verify-email" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;