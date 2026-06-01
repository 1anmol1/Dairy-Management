/**
 * SiteFooter — shared full footer used across all landing pages.
 * Supports English / Marathi live switching via useMarathi().
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BrandkritAttribution from './BrandkritAttribution';
import { useMarathi } from '../i18n/marathi';
import LanguageToggle from '../i18n/marathi/LanguageToggle';
import amritLogo from '../assets/Amritmanagelogo.png';

// Click-to-copy contact helper
const CopyContact = ({ value, display }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <span
      onClick={handleCopy}
      title="Click to copy"
      style={{
        color: '#8D8D8D',
        cursor: 'pointer',
        borderBottom: '1px dashed #525252',
        transition: 'color 0.15s'
      }}
      onMouseOver={e => { e.currentTarget.style.color = '#FFFFFF'; }}
      onMouseOut={e => { e.currentTarget.style.color = copied ? '#24A148' : '#8D8D8D'; }}
    >
      {copied ? '✓ Copied!' : display}
    </span>
  );
};

const SiteFooter = () => {
  const { t, isMarathi } = useMarathi();

  const productLinks = [
    { to: '/features',     l: t('footer.links.features',   'Features') },
    { to: '/pricing',      l: t('footer.links.pricing',    'Pricing') },
    { to: '/how-it-works', l: t('footer.links.howItWorks', 'How It Works') },
    { to: '/start',        l: t('footer.links.getStarted', 'Get Started') }
  ];

  const supportLinks = [
    { to: '/promote', l: t('footer.links.promote', 'Promote & Earn') },
    { to: '/faq',     l: t('footer.links.faq',     'FAQ') },
    { to: '/privacy', l: t('footer.links.privacy',  'Privacy Policy') },
    { to: '/terms',   l: t('footer.links.terms',    'Terms of Service') }
  ];

  return (
    <footer style={{
      backgroundColor: '#161616',
      padding: '64px 24px 32px',
      fontFamily: isMarathi ? '"Noto Sans Devanagari", sans-serif' : 'Inter, sans-serif'
    }}>
      {/* Main columns */}
      <div style={{
        maxWidth: '1120px', margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '48px',
        marginBottom: '48px'
      }}>
        {/* Brand column */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <img src={amritLogo} alt="Amrit Manage" style={{ height: '38px', width: 'auto', display: 'block', filter: 'brightness(0) invert(1)' }} />
          </div>
          <p style={{ fontSize: '13px', color: '#8D8D8D', lineHeight: 1.6, marginBottom: '8px' }}>
            {t('footer.tagline', 'Milk business management for Indian milk vendors.')}
          </p>
          <p style={{ fontSize: '12px', color: '#525252', lineHeight: 1.6, marginBottom: '10px' }}>
            {t('footer.developed', 'Amrit Manage is developed and owned by Brandkrit Technologies.')}
          </p>
          <div style={{ fontSize: '13px', marginBottom: '4px' }}>
            <CopyContact value="business@brandkrit.com" display="business@brandkrit.com" />
          </div>
          <div style={{ fontSize: '13px' }}>
            <CopyContact value="+919022553343" display="+91 90225 53343" />
          </div>
        </div>

        {/* Product column */}
        <div>
          <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
            {t('footer.product', 'Product')}
          </h4>
          {productLinks.map(i => (
            <Link key={i.to} to={i.to} style={{
              display: 'block', fontSize: '13px', color: '#8D8D8D',
              textDecoration: 'none', marginBottom: '10px'
            }}
              onMouseOver={e => { e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseOut={e => { e.currentTarget.style.color = '#8D8D8D'; }}
            >
              {i.l}
            </Link>
          ))}
        </div>

        {/* Support column */}
        <div>
          <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
            {t('footer.support', 'Support')}
          </h4>
          {supportLinks.map(i => (
            <Link key={i.to} to={i.to} style={{
              display: 'block', fontSize: '13px', color: '#8D8D8D',
              textDecoration: 'none', marginBottom: '10px'
            }}
              onMouseOver={e => { e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseOut={e => { e.currentTarget.style.color = '#8D8D8D'; }}
            >
              {i.l}
            </Link>
          ))}
          <span style={{ display: 'block', fontSize: '13px', marginBottom: '10px' }}>
            <Link to="/start" style={{ color: '#8D8D8D', textDecoration: 'none' }}
              onMouseOver={e => { e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseOut={e => { e.currentTarget.style.color = '#8D8D8D'; }}
            >
              {t('footer.links.contact', 'Contact Us')}
            </Link>
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        maxWidth: '1120px', margin: '0 auto',
        borderTop: '1px solid #333', paddingTop: '20px',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: '12px'
      }}>
        <span style={{ color: '#525252', fontSize: '12px' }}>
          {t('footer.copyright', '© 2026 Amrit Manage. All rights reserved.')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <LanguageToggle />
          <BrandkritAttribution color="white" />
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
