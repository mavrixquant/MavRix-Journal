import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import navLogo from '../assets/navLOGO.png';

// Injected CSS for smooth animations and hover effects without needing external libraries
const injectedStyles = `
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-15px); }
    100% { transform: translateY(0px); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes glow {
    0% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.1); }
    50% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.3); }
    100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.1); }
  }
  .glass-nav {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition: all 0.3s ease;
  }
  .nav-scrolled {
    background: rgba(10, 13, 19, 0.85);
    border-bottom: 1px solid var(--border-soft, rgba(255,255,255,0.1));
  }
  .nav-top {
    background: transparent;
    border-bottom: 1px solid transparent;
  }
  .text-gradient {
    background: linear-gradient(90deg, var(--amber, #F59E0B) 0%, #FDE68A 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .feature-card {
    background: var(--panel, #12151C);
    border: 1px solid var(--border-soft, #2A2D35);
    border-radius: 16px;
    padding: 32px;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: hidden;
  }
  .feature-card::before {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 50%; height: 100%;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.03), transparent);
    transform: skewX(-20deg);
    transition: 0.5s;
  }
  .feature-card:hover::before {
    left: 150%;
  }
  .feature-card:hover {
    transform: translateY(-10px);
    border-color: var(--amber, #F59E0B);
    box-shadow: 0 15px 30px -10px rgba(245, 158, 11, 0.15);
  }
  .hero-graphic {
    animation: float 6s ease-in-out infinite;
  }
  .btn-primary {
    background: var(--amber, #F59E0B);
    color: #0A0D13;
    transition: all 0.2s ease;
  }
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
    background: #fbbf24;
  }
  .btn-secondary {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border-soft, #2A2D35);
    color: var(--text, #fff);
    transition: all 0.2s ease;
  }
  .btn-secondary:hover {
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.2);
  }
`;

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  // Handle Navbar background change on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg, #0A0D13)',
      color: 'var(--text, #F3F4F6)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflowX: 'hidden'
    }}>
      <style>{injectedStyles}</style>

      {/* Interactive Sticky Header */}
      <header className={`glass-nav ${scrolled ? 'nav-scrolled' : 'nav-top'}`} style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 5%',
        zIndex: 100,
      }}>
        <img src={navLogo} alt="Logo" style={{ height: '40px', cursor: 'pointer' }} onClick={() => window.scrollTo(0,0)} />
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link to="/login" style={{
            color: 'var(--text-dim, #9CA3AF)',
            textDecoration: 'none',
            fontSize: '15px',
            fontWeight: '500',
            transition: 'color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.color = '#fff'}
          onMouseOut={(e) => e.target.style.color = 'var(--text-dim, #9CA3AF)'}
          >
            Login
          </Link>
          <Link to="/signup" className="btn-primary" style={{
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            Sign Up Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '180px 5% 100px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
      }}>
        {/* Abstract Background Glow */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, rgba(10,13,19,0) 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        <div style={{
          fontFamily: 'var(--mono, monospace)',
          fontSize: '13px',
          color: 'var(--amber, #F59E0B)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: '24px',
          padding: '8px 16px',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '100px',
          background: 'rgba(245,158,11,0.05)',
          animation: 'fadeUp 0.8s ease-out forwards',
          position: 'relative',
          zIndex: 1
        }}>
          Next-Gen Trading Analytics
        </div>
        
        <h1 style={{
          fontFamily: 'var(--disp, sans-serif)',
          fontSize: 'clamp(3rem, 7vw, 5rem)',
          fontWeight: '800',
          lineHeight: '1.05',
          marginBottom: '24px',
          maxWidth: '900px',
          animation: 'fadeUp 1s ease-out forwards',
          position: 'relative',
          zIndex: 1
        }}>
          Find Your Edge & <br/>
          <span className="text-gradient">Master the Markets</span>
        </h1>
        
        <p style={{
          fontSize: '1.25rem',
          color: 'var(--text-dim, #9CA3AF)',
          maxWidth: '650px',
          marginBottom: '48px',
          lineHeight: '1.6',
          animation: 'fadeUp 1.2s ease-out forwards',
          position: 'relative',
          zIndex: 1
        }}>
          Stop guessing. Track, analyze, and optimize your trades with institutional-grade backtesting and real-time performance dashboards.
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          flexWrap: 'wrap', 
          justifyContent: 'center',
          animation: 'fadeUp 1.4s ease-out forwards',
          position: 'relative',
          zIndex: 1
        }}>
          <Link to="/signup" className="btn-primary" style={{
            fontFamily: 'var(--mono, monospace)',
            fontSize: '16px',
            fontWeight: '600',
            padding: '16px 32px',
            borderRadius: '12px',
            textDecoration: 'none',
          }}>
            Start Free Today
          </Link>
          <Link to="/login" className="btn-secondary" style={{
            fontFamily: 'var(--mono, monospace)',
            fontSize: '16px',
            padding: '16px 32px',
            borderRadius: '12px',
            textDecoration: 'none',
          }}>
            Explore Dashboard
          </Link>
        </div>

        {/* Floating Mockup Graphic */}
        <div className="hero-graphic" style={{
          marginTop: '80px',
          width: '100%',
          maxWidth: '1000px',
          height: '400px',
          background: 'var(--panel, #12151C)',
          borderRadius: '24px',
          border: '1px solid var(--border-soft, #2A2D35)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Mockup Header */}
          <div style={{ height: '40px', borderBottom: '1px solid var(--border-soft, #2A2D35)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '8px' }}>
             <div style={{width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444'}}></div>
             <div style={{width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B'}}></div>
             <div style={{width: '12px', height: '12px', borderRadius: '50%', background: '#10B981'}}></div>
          </div>
          {/* Mockup Body (Abstract Chart) */}
          <div style={{ flex: 1, padding: '40px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--amber, #F59E0B)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--amber, #F59E0B)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,300 L0,150 Q100,200 200,100 T400,120 T600,40 T800,80 L800,300 Z" fill="url(#chartGrad)" />
              <path d="M0,150 Q100,200 200,100 T400,120 T600,40 T800,80" fill="none" stroke="var(--amber, #F59E0B)" strokeWidth="4" />
            </svg>
          </div>
        </div>
      </section>

      {/* Interactive Features */}
      <section style={{
        padding: '60px 5% 100px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Everything you need to <span style={{ color: 'var(--amber, #F59E0B)'}}>scale</span></h2>
          <p style={{ color: 'var(--text-dim, #9CA3AF)', fontSize: '1.1rem' }}>Built by traders, for traders. No more messy spreadsheets.</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
        }}>
          {/* Feature 1 */}
          <div className="feature-card">
            <div style={{ fontSize: '32px', marginBottom: '20px', background: 'rgba(245,158,11,0.1)', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
              📊
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', fontWeight: '700' }}>Live Dashboards</h3>
            <p style={{ color: 'var(--text-dim, #9CA3AF)', lineHeight: '1.6' }}>
              Visualize your equity curve, win rate, and expectancy in real-time. Instantly see which setups are making you money.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="feature-card">
            <div style={{ fontSize: '32px', marginBottom: '20px', background: 'rgba(245,158,11,0.1)', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
              🔬
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', fontWeight: '700' }}>Deep Backtesting</h3>
            <p style={{ color: 'var(--text-dim, #9CA3AF)', lineHeight: '1.6' }}>
              Test different R:R targets, session times, and confluence combinations to mathematically prove your edge.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="feature-card">
            <div style={{ fontSize: '32px', marginBottom: '20px', background: 'rgba(245,158,11,0.1)', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
              📓
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', fontWeight: '700' }}>Smart Journaling</h3>
            <p style={{ color: 'var(--text-dim, #9CA3AF)', lineHeight: '1.6' }}>
              Upload your broker data directly. Keep a detailed log with custom tags, trade screenshots, and emotional tracking.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '80px 5%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(245,158,11,0.05) 100%)',
        textAlign: 'center',
        borderTop: '1px solid var(--border-soft, #2A2D35)'
      }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>Ready to optimize your trading?</h2>
        <p style={{ color: 'var(--text-dim, #9CA3AF)', marginBottom: '40px', fontSize: '1.2rem' }}>
          Join thousands of traders treating their trading like a business.
        </p>
        <Link to="/signup" className="btn-primary" style={{
          fontSize: '18px',
          fontWeight: '700',
          padding: '18px 40px',
          borderRadius: '12px',
          textDecoration: 'none',
          boxShadow: '0 0 30px rgba(245, 158, 11, 0.2)'
        }}>
          Create Your Free Account
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-soft, #2A2D35)',
        padding: '40px 5%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        color: 'var(--text-faint, #6B7280)',
        fontFamily: 'var(--mono, monospace)',
        fontSize: '14px',
        background: 'var(--panel, #12151C)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={navLogo} alt="Logo" style={{ height: '24px', opacity: 0.5 }} />
          <span>© {new Date().getFullYear()} Trading Analytics. All rights reserved.</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
          <span style={{ cursor: 'pointer' }}>Terms of Service</span>
          <span style={{ cursor: 'pointer' }}>Support</span>
        </div>
      </footer>
    </div>
  );
}