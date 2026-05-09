import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import amritLogo from '../assets/Amritmanagelogo.png';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F4F4F4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <img src={amritLogo} alt="Amrit Manage" style={{ height: '40px', width: 'auto' }} />
        </div>

        <div style={{
          fontSize: '120px', fontWeight: 900, color: '#0F62FE',
          lineHeight: 1, letterSpacing: '-4px', marginBottom: '16px'
        }}>
          404
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#161616', marginBottom: '12px' }}>
          Page Not Found
        </h2>
        <p style={{ fontSize: '15px', color: '#525252', lineHeight: 1.6, marginBottom: '40px' }}>
          The page you are looking for does not exist or has been moved.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#0F62FE', color: '#FFFFFF',
            padding: '12px 24px', textDecoration: 'none', fontWeight: 600, fontSize: '14px',
            transition: 'background-color 0.15s'
          }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0353E9'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0F62FE'; }}
          >
            <Home size={16} /> Back to Home
          </Link>

          <button onClick={() => navigate(-1)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#FFFFFF', color: '#161616',
            padding: '12px 24px', border: '1px solid #E0E0E0',
            cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit',
            transition: 'background-color 0.15s'
          }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#F4F4F4'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
          >
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
