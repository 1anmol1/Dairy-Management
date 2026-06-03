import React from 'react';
import { useMarathi } from './MarathiContext';

const LanguageToggle = ({ style = {} }) => {
  const { isMarathi, toggle } = useMarathi();
  const [hovered, setHovered] = React.useState(false);

  const baseBg = style.backgroundColor !== undefined ? style.backgroundColor : (isMarathi ? '#EDF5FF' : '#FFFFFF');
  const baseBorder = style.borderColor !== undefined ? style.borderColor : '#E0E0E0';
  const baseColor = style.color !== undefined ? style.color : (isMarathi ? '#0F62FE' : '#525252');

  const isDarkTheme = baseBg === 'transparent' || baseBg === 'none' || baseColor === '#C6C6C6';
  
  const hoverBg = isDarkTheme
    ? 'rgba(255, 255, 255, 0.08)'
    : (isMarathi ? '#D0E8FF' : '#F4F4F4');
    
  const hoverBorder = isDarkTheme
    ? '#8D8D8D'
    : '#0F62FE';
    
  const hoverColor = isDarkTheme
    ? '#FFFFFF'
    : (isMarathi ? '#0F62FE' : '#161616');

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
        cursor: 'pointer',
        borderRadius: '2px',
        transition: 'all 0.15s',
        letterSpacing: isMarathi ? '0' : '0.2px',
        ...style,
        backgroundColor: hovered ? hoverBg : baseBg,
        borderColor: hovered ? hoverBorder : baseBorder,
        color: hovered ? hoverColor : baseColor
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
