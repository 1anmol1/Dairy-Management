import React from 'react';
import brandkritLogo from '../../assets/brandkrit.svg';

/**
 * BrandkritAttribution Component
 * 
 * Displays "Developed by Brandkrit" with the SVG logo using an img tag for accurate rendering.
 * Applies a CSS filter to make the logo white (since original is black).
 */
const BrandkritAttribution = ({ color = "white", width = "90", style = {} }) => {
    // Original is black (#000000). To make it white, we invert it.
    // If color prop is provided and is 'white' or 'var(--text-light)', we apply the white filter.
    // For other colors, we might need a specific filter, but usually white is the requirement here.

    const isWhite = color === 'white' || color === '#fff' || color === '#ffffff' || color.includes('light');

    const filterStyle = isWhite
        ? { filter: 'brightness(0) invert(1)' }
        : { filter: 'none' }; // Default to black if not white (original file is black)

    return (
        <a
            href="https://brandkrit.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Developed by Brandkrit"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                color: color,
                opacity: 0.9,
                transition: 'opacity 0.2s',
                ...style
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.9'}
        >
            <span style={{ fontSize: '0.85rem', fontWeight: 400, opacity: 0.8, fontFamily: 'sans-serif' }}>Developed by</span>
            <img
                src={brandkritLogo}
                alt="Brandkrit Logo"
                width={width}
                height="auto"
                style={{
                    display: 'block',
                    ...filterStyle
                }}
            />
        </a>
    );
};

export default BrandkritAttribution;
