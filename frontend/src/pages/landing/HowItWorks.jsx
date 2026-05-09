import React from 'react';
import { UserPlus, Bike, Receipt, ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SiteFooter from '../../components/SiteFooter';
import { useMarathi } from '../../i18n/marathi';

const HowItWorksPage = () => {
  const { t, isMarathi } = useMarathi();

  const steps = [
    {
      icon: UserPlus,
      title: t('howItWorks.step1.title', '1. Create your account'),
      desc:  t('howItWorks.step1.desc',  'Sign up in 2 minutes with your phone number and business name. No technical skills required. Trial starts upon discussion with our team.')
    },
    {
      icon: Bike,
      title: t('howItWorks.step2.title', '2. Set up your team'),
      desc:  t('howItWorks.step2.desc',  'Add your customers and delivery staff. Set their default milk quantity (Morning/Evening) and your custom milk rates.')
    },
    {
      icon: Play,
      title: t('howItWorks.step3.title', '3. Start recording'),
      desc:  t('howItWorks.step3.desc',  'You or your staff can log daily milk deliveries with one tap. The app remembers everything securely in the cloud.')
    },
    {
      icon: Receipt,
      title: t('howItWorks.step4.title', '4. Get automatic bills'),
      desc:  t('howItWorks.step4.desc',  "At the end of the month, review your auto-generated bills and share them with customers via WhatsApp or SMS. It's that simple.")
    }
  ];

  return (
    <div style={{
      backgroundColor: '#FFFFFF', color: '#161616',
      fontFamily: isMarathi ? '"Noto Sans Devanagari", sans-serif' : 'Inter, sans-serif',
      minHeight: '100vh'
    }}>
      <Navbar />

      <main style={{ maxWidth: '1120px', margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '24px' }}>
            {t('howItWorks.heading', 'How Amrit Manage Works')}
          </h1>
          <p style={{ color: '#525252', fontSize: '18px', maxWidth: '700px', margin: '0 auto' }}>
            {t('howItWorks.subtext', 'A simple, 4-step process to transform your traditional milk business into a modern digital operation.')}
          </p>
        </div>

        <div style={{ position: 'relative', marginBottom: '80px' }}>
          {/* Vertical line for desktop */}
          <div className="desktop-only" style={{ 
            position: 'absolute', left: '48px', top: '0', bottom: '0', width: '2px', 
            backgroundColor: '#EDF5FF', zIndex: -1 
          }} />

          <div style={{ display: 'grid', gap: '64px' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '32px', alignItems: 'start' }}>
                <div style={{ 
                  backgroundColor: '#0F62FE', color: '#FFFFFF', width: '96px', height: '96px', 
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <s.icon size={40} />
                </div>
                <div>
                  <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>{s.title}</h3>
                  <p style={{ color: '#525252', fontSize: '18px', lineHeight: 1.6, maxWidth: '600px' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', color: '#161616', padding: '64px', textAlign: 'center', marginBottom: '80px', border: '1px solid #E0E0E0' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '24px' }}>
            {t('', 'Ready to see it in action?')}
          </h2>
          <Link to="/start" style={{
            display: 'inline-flex', alignItems: 'center', gap: '12px',
            backgroundColor: '#0F62FE', color: '#FFFFFF', padding: '16px 40px',
            textDecoration: 'none', fontWeight: 700, fontSize: '18px', transition: 'background-color 0.15s'
          }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0353E9'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0F62FE'; }}
          >
            {t('howItWorks.cta', 'Get Started')}
            <ArrowRight size={20} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '80px' }}>
          <div style={{ padding: '32px', border: '1px solid #E0E0E0' }}>
            <h4 style={{ fontWeight: 700, marginBottom: '16px' }}>{t('howItWorks.benefit1.title', 'Zero Paperwork')}</h4>
            <p style={{ color: '#525252', fontSize: '15px' }}>{t('howItWorks.benefit1.desc', 'Stop carrying notebooks. Everything is recorded on your phone and accessible from anywhere.')}</p>
          </div>
          <div style={{ padding: '32px', border: '1px solid #E0E0E0' }}>
            <h4 style={{ fontWeight: 700, marginBottom: '16px' }}>{t('howItWorks.benefit2.title', 'Reduce Disputes')}</h4>
            <p style={{ color: '#525252', fontSize: '15px' }}>{t('howItWorks.benefit2.desc', 'With a digital record of every liter delivered, there is no confusion with customers at the end of the month.')}</p>
          </div>
          <div style={{ padding: '32px', border: '1px solid #E0E0E0' }}>
            <h4 style={{ fontWeight: 700, marginBottom: '16px' }}>{t('howItWorks.benefit3.title', 'Better Staff Control')}</h4>
            <p style={{ color: '#525252', fontSize: '15px' }}>{t('howItWorks.benefit3.desc', 'See exactly when and where your delivery staff recorded milk entries for each customer.')}</p>
          </div>
        </div>
      </main>

      <SiteFooter />

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .desktop-only { display: none; }
        }
      `}} />
    </div>
  );
};

export default HowItWorksPage;
