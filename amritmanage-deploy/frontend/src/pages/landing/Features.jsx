import React from 'react';
import { Smartphone, Users, Receipt, ShieldCheck, Zap, Bike } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SiteFooter from '../../components/SiteFooter';
import { useMarathi } from '../../i18n/marathi';

const FeaturesPage = () => {
  const { t, isMarathi } = useMarathi();

  const features = [
    {
      icon: Smartphone,
      title: t('features.f1.title', 'Mobile-First Design'),
      desc:  t('features.f1.desc',  'Built specifically for smartphones. No need for a computer. Everything works perfectly on your Android or iPhone browser.')
    },
    {
      icon: Users,
      title: t('features.f2.title', 'Customer Management'),
      desc:  t('features.f2.desc',  'Maintain a clean list of all your customers with their address, phone number, and default milk requirements for morning and evening.')
    },
    {
      icon: Bike,
      title: t('features.f3.title', 'Staff Accounts'),
      desc:  t('features.f3.desc',  'Give your delivery staff their own login. They can only record milk entries, while you maintain full control over the accounts and billing.')
    },
    {
      icon: Receipt,
      title: t('features.f4.title', 'Automatic Billing'),
      desc:  t('features.f4.desc',  'No more manual calculations. The app automatically generates bills at the end of the month based on daily entries and your custom rates.')
    },
    {
      icon: Zap,
      title: t('features.f5.title', 'Daily Milk Entries'),
      desc:  t('features.f5.desc',  'Quickly record milk deliveries in less than 2 seconds per customer. Supports both morning and evening slots with default quantity suggestions.')
    },
    {
      icon: ShieldCheck,
      title: t('features.f6.title', 'Data Security'),
      desc:  t('features.f6.desc',  'Your business data and customer records are backed up securely in the cloud. No risk of losing your records if you lose your notebook.')
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
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '24px' }}>
            {t('features.heading', 'Everything You Need to Manage Your Milk Business')}
          </h1>
          <p style={{ color: '#525252', fontSize: '18px', maxWidth: '700px', margin: '0 auto' }}>
            {t('features.subtext', 'Built specifically for Indian dairy vendors to save time, reduce arguments with customers, and track every liter of milk.')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginBottom: '64px' }}>
          {features.map((f, i) => (
            <div key={i} style={{ border: '1px solid #E0E0E0', padding: '32px' }}>
              <div style={{ backgroundColor: '#EDF5FF', color: '#0F62FE', padding: '12px', width: 'fit-content', marginBottom: '24px' }}>
                <f.icon size={24} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>{f.title}</h3>
              <p style={{ color: '#525252', lineHeight: 1.6, fontSize: '15px' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: '#FFFFFF', color: '#161616', padding: '64px', textAlign: 'center', marginBottom: '64px', border: '1px solid #E0E0E0' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>
            {t('features.readyCta.heading', 'Ready to go digital?')}
          </h2>
          <p style={{ color: '#525252', marginBottom: '32px', fontSize: '18px' }}>
            {t('features.readyCta.subtext', 'Join vendors from across Maharashtra and Gujarat using Amrit Manage.')}
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link to="/start" style={{
              backgroundColor: '#0F62FE', color: '#FFFFFF', padding: '16px 32px',
              textDecoration: 'none', fontWeight: 600, fontSize: '16px', transition: 'background-color 0.15s'
            }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0353E9'; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0F62FE'; }}
            >
              {t('features.readyCta.cta', 'Get Started')}
            </Link>
            <Link to="/pricing" style={{
              border: '1px solid #161616', color: '#161616', padding: '16px 32px',
              textDecoration: 'none', fontWeight: 600, fontSize: '16px', transition: 'background-color 0.15s'
            }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#F4F4F4'; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {t('features.readyCta.pricing', 'View Pricing')}
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default FeaturesPage;
