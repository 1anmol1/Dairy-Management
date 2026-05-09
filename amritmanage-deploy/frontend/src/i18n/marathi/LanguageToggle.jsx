import React from 'react';
import { useMarathi } from './MarathiContext';

const LanguageToggle = ({ style = {} }) => {
  const { isMarathi, toggle } = useMarathi();

  return (
    <button
      onClick={toggle}
      title={isMarathi ? 'Switch to English' : 'मराठीत बदला'}
      aria-label={isMarathi ? 'Switch to English' : 'Switch to Marathi'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 12px',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: isMarathi ? '"Noto Sans Devanagari", sans-serif' : 'Inter, sans-serif',
        border: '1px solid #E0E0E0',
        backgroundColor: isMarathi ? '#EDF5FF' : '#FFFFFF',
        color: isMarathi ? '#0F62FE' : '#525252',
        cursor: 'pointer',
        borderRadius: '2px',
        transition: 'all 0.15s',
        letterSpacing: isMarathi ? '0' : '0.2px',
        ...style
      }}
      onMouseOver={e => {
        e.currentTarget.style.backgroundColor = isMarathi ? '#D0E8FF' : '#F4F4F4';
        e.currentTarget.style.borderColor = '#0F62FE';
      }}
      onMouseOut={e => {
        e.currentTarget.style.backgroundColor = isMarathi ? '#EDF5FF' : '#FFFFFF';
        e.currentTarget.style.borderColor = '#E0E0E0';
      }}
    >
      {/* Globe icon */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      {isMarathi ? 'English' : 'मराठी'}
    </button>
  );
};

export default LanguageToggle;
