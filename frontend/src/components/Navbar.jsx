import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import LanguageToggle from '../i18n/marathi/LanguageToggle';
import { useMarathi } from '../i18n/marathi';
import amritLogo from '../assets/Amritmanagelogo.png';

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { t, isMarathi } = useMarathi();

  const links = [
    { to: '/features',     label: t('nav.features',   'Features') },
    { to: '/pricing',      label: t('nav.pricing',    'Pricing') },
    { to: '/how-it-works', label: t('nav.howItWorks', 'How It Works') },
    { to: '/faq',          label: t('nav.faq',        'FAQ') }
  ];

  const isActive = (to) => pathname === to;

  return (
    <nav style={{
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E0E0E0',
      position: 'sticky', top: 0, zIndex: 1000,
      width: '100%'
    }}>
      <div style={{
        width: '100%',
        padding: '0 32px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: isMarathi ? '"Noto Sans Devanagari", sans-serif' : 'Inter, sans-serif',
        boxSizing: 'border-box'
      }}>
        <Link to="/" style={{
          display: 'flex', alignItems: 'center',
          textDecoration: 'none', flexShrink: 0,
          minWidth: '180px'
        }}>
          <img src={amritLogo} alt="Amrit Manage" style={{ height: '36px', width: 'auto', display: 'block' }} />
        </Link>

        {/* Desktop nav links — centred, fixed min-width to prevent layout shift on toggle */}
        <div
          className="nav-desktop"
          style={{
            display: 'flex', alignItems: 'center', gap: '0',
            flex: 1, justifyContent: 'center',
            /* Reserve enough space for the longest possible label set so nothing shifts */
            minWidth: 0
          }}
        >
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              style={{
                padding: '0 14px',
                height: '64px',
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 500,
                color: isActive(l.to) ? '#0F62FE' : '#525252',
                textDecoration: 'none',
                borderBottom: isActive(l.to) ? '2px solid #0F62FE' : '2px solid transparent',
                transition: 'color 0.1s',
                whiteSpace: 'nowrap',
                /* Fixed width per link prevents reflow when text changes */
                minWidth: isMarathi ? '120px' : '80px',
                justifyContent: 'center'
              }}
              onMouseOver={e => { if (!isActive(l.to)) e.currentTarget.style.color = '#161616'; }}
              onMouseOut={e => { if (!isActive(l.to)) e.currentTarget.style.color = '#525252'; }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop right — language toggle left of CTA */}
        <div
          className="nav-desktop"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            flexShrink: 0, minWidth: '180px', justifyContent: 'flex-end'
          }}
        >
          <LanguageToggle />
          <Link to="/start" style={{
            backgroundColor: '#0F62FE', color: '#FFFFFF',
            padding: '0 20px', height: '40px',
            display: 'inline-flex', alignItems: 'center',
            fontSize: '14px', fontWeight: 600, textDecoration: 'none',
            transition: 'background-color 0.15s',
            whiteSpace: 'nowrap'
          }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0353E9'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0F62FE'; }}
          >
            {t('nav.getStarted', 'Get Started')}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(o => !o)}
          className="nav-mobile"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          {open ? <X size={24} color="#161616" /> : <Menu size={24} color="#161616" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="nav-mobile" style={{
          backgroundColor: '#FFFFFF', borderTop: '1px solid #E0E0E0',
          padding: '16px 24px 24px'
        }}>
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} style={{
              display: 'block', padding: '12px 0',
              fontSize: '16px', fontWeight: 500,
              color: isActive(l.to) ? '#0F62FE' : '#161616',
              textDecoration: 'none',
              borderBottom: '1px solid #F4F4F4'
            }}>
              {l.label}
            </Link>
          ))}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <LanguageToggle style={{ alignSelf: 'flex-start' }} />
            <Link to="/start" onClick={() => setOpen(false)} style={{
              display: 'block', textAlign: 'center', padding: '12px',
              backgroundColor: '#0F62FE', fontSize: '15px', fontWeight: 600,
              color: '#FFFFFF', textDecoration: 'none', transition: 'background-color 0.15s'
            }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0353E9'; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0F62FE'; }}
            >
              {t('nav.getStarted', 'Get Started')}
            </Link>
          </div>
        </div>
      )}

      <style>{`
        .nav-desktop { display: flex !important; }
        .nav-mobile  { display: none  !important; }
        @media (max-width: 768px) {
          .nav-desktop { display: none  !important; }
          .nav-mobile  { display: block !important; }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
