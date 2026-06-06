import React, { useState, useEffect } from 'react';
import { MessageSquare, PhoneCall, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SiteFooter from '../../components/SiteFooter';
import { useMarathi } from '../../i18n/marathi';
import { getFaqSections } from './faqData';

// Click-to-copy for the contact cards
const CopyContact = ({ value, display, color = '#525252' }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <span onClick={handleCopy} title="Click to copy"
      style={{ color, cursor: 'pointer', borderBottom: `1px dashed ${color}` }}>
      {copied ? '✓ Copied!' : display}
    </span>
  );
};

const FAQSection = ({ title, items, openIndex, setOpenIndex, offset }) => (
  <div style={{ marginBottom: '40px' }}>
    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#161616', marginBottom: '4px', paddingBottom: '10px', borderBottom: '2px solid #0F62FE', display: 'inline-block' }}>
      {title}
    </h2>
    <div style={{ marginTop: '16px' }}>
      {items.map((item, i) => {
        const globalIndex = offset + i;
        const isOpen = openIndex === globalIndex;
        return (
          <div key={i} style={{ borderBottom: '1px solid #E0E0E0' }}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
              style={{ width: '100%', padding: '16px 0', border: 'none', background: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', gap: '16px' }}
            >
              <span style={{ fontSize: '15px', fontWeight: 600, color: isOpen ? '#0F62FE' : '#161616', lineHeight: 1.4 }}>
                {item.q}
              </span>
              <span style={{ flexShrink: 0, transition: 'transform 0.25s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'flex' }}>
                <ChevronDown size={18} color={isOpen ? '#0F62FE' : '#8D8D8D'} />
              </span>
            </button>
            <div style={{ maxHeight: isOpen ? '600px' : '0', overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
              <div style={{ paddingBottom: '16px', fontSize: '14px', color: '#525252', lineHeight: 1.65 }}>
                {item.a}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const { t, isMarathi } = useMarathi();

  useEffect(() => {
    document.title = isMarathi 
      ? "वारंवार विचारले जाणारे प्रश्न | डेअरी सॉफ्टवेअर FAQ | Amrit Manage" 
      : "FAQ | Common Questions & Help | Amrit Manage";
  }, [isMarathi]);

  // All Q&A content lives in faqData.js with full Marathi translations
  const rawSections = getFaqSections(isMarathi);

  let offset = 0;
  const sectionsWithOffset = rawSections.map(s => {
    const result = {
      title: isMarathi ? s.titleMr : s.titleEn,
      items: s.items,
      offset,
    };
    offset += s.items.length;
    return result;
  });

  return (
    <div style={{
      backgroundColor: '#FFFFFF', color: '#161616',
      fontFamily: isMarathi ? '"Noto Sans Devanagari", sans-serif' : 'Inter, sans-serif',
      minHeight: '100vh'
    }}>
      <Navbar />

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '56px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 700, marginBottom: '16px' }}>
            {isMarathi ? 'वारंवार विचारले जाणारे प्रश्न' : 'Frequently Asked Questions'}
          </h1>
          <p style={{ color: '#525252', fontSize: '16px', maxWidth: '560px', margin: '0 auto' }}>
            {isMarathi
              ? 'अमृत मॅनेजबद्दल सर्व काही. उत्तर सापडले नाही? खाली संपर्क करा.'
              : 'Everything you need to know about Amrit Manage. Can not find your answer? Contact us below.'}
          </p>
        </div>

        {sectionsWithOffset.map((section, si) => (
          <FAQSection
            key={si}
            title={section.title}
            items={section.items}
            openIndex={openIndex}
            setOpenIndex={setOpenIndex}
            offset={section.offset}
          />
        ))}

        {/* Contact */}
        <div style={{ backgroundColor: '#F4F4F4', padding: '40px', textAlign: 'center', marginTop: '16px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
            {isMarathi ? 'अजून प्रश्न आहेत?' : 'Still have questions?'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '24px', border: '1px solid #E0E0E0' }}>
              <MessageSquare size={28} color="#0F62FE" style={{ marginBottom: '12px' }} />
              <h4 style={{ fontWeight: 700, marginBottom: '6px', fontSize: '15px' }}>
                {isMarathi ? 'ईमेल करा' : 'Email Us'}
              </h4>
              <p style={{ color: '#525252', fontSize: '13px' }}>
                <CopyContact value="business@brandkrit.com" display="business@brandkrit.com" />
              </p>
              <p style={{ color: '#8D8D8D', fontSize: '12px', marginTop: '4px' }}>
                {isMarathi ? '२४ तासांत उत्तर मिळते' : 'We reply within 24 hours'}
              </p>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '24px', border: '1px solid #E0E0E0' }}>
              <PhoneCall size={28} color="#0F62FE" style={{ marginBottom: '12px' }} />
              <h4 style={{ fontWeight: 700, marginBottom: '6px', fontSize: '15px' }}>
                {isMarathi ? 'सपोर्टला कॉल करा' : 'Call Support'}
              </h4>
              <p style={{ color: '#525252', fontSize: '13px' }}>
                <CopyContact value="+919022553343" display="+91 90225 53343" />
              </p>
              <p style={{ color: '#8D8D8D', fontSize: '12px', marginTop: '4px' }}>
                {isMarathi ? 'सोम ते शनि, सकाळी ९ ते संध्याकाळी ६' : 'Mon to Sat, 9am to 6pm'}
              </p>
            </div>
          </div>
          <Link to="/start" style={{
            backgroundColor: '#0F62FE', color: '#FFFFFF', padding: '14px 36px',
            textDecoration: 'none', fontWeight: 700, fontSize: '15px', display: 'inline-block',
            transition: 'background-color 0.15s'
          }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0353E9'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0F62FE'; }}
          >
            {isMarathi ? 'अमृत मॅनेज मोफत वापरून पाहा' : 'Try Amrit Manage for Free'}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default FAQPage;
