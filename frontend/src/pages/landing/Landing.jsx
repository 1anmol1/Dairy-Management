import React, { useState } from 'react';
import {
  ArrowRight, ShieldCheck,
  BookX, Calculator, Wallet, Users,
  ClipboardList, FileText, IndianRupee, Smartphone,
  ChevronDown, BookOpen, UserCheck, Receipt
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SiteFooter from '../../components/SiteFooter';
import { useMarathi } from '../../i18n/marathi';

const LandingPage = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const { t, isMarathi } = useMarathi();

  const toggleFaq = (i) => setExpandedFaq(prev => prev === i ? null : i);

  const faqs = [
    {
      q: t('faqShort.q1.q', 'Do I need a computer or can I use my phone?'),
      a: t('faqShort.q1.a', 'Amrit Manage is built for mobile first. You and your staff can do everything from a smartphone, Android or iPhone. Open it in your browser and add it to your home screen. It works like an app.')
    },
    {
      q: t('faqShort.q2.q', 'What happens after the trial ends?'),
      a: t('faqShort.q2.a', 'After the trial, your account goes into read-only mode. You can see your existing data but cannot add new entries or generate bills. To continue, choose a plan. Your data is never deleted.')
    },
    {
      q: t('faqShort.q3.q', 'Can my delivery person use this without seeing my billing information?'),
      a: t('faqShort.q3.a', 'Yes. You create a separate login for your employee. They can only record milk entries. They cannot see billing, payments, reports, or any other section.')
    },
    {
      q: t('faqShort.q4.q', 'What if I have customers with different milk rates?'),
      a: t('faqShort.q4.a', 'Each customer has their own rate per litre. When bills are generated, Amrit Manage uses the correct rate for each customer automatically.')
    },
    {
      q: t('faqShort.q5.q', 'Can I record both morning and evening deliveries?'),
      a: t('faqShort.q5.a', 'Yes. Every entry has a slot: morning or evening. Your monthly bill will show the total quantity combining both slots.')
    },
    {
      q: t('faqShort.q6.q', 'Will my data be safe? What if I lose my phone?'),
      a: t('faqShort.q6.a', 'All data is stored on our secure servers, not on your phone. You can log in from any device. Losing your phone does not affect your data.')
    },
    {
      q: t('faqShort.q7.q', 'How many customers can I add?'),
      a: t('faqShort.q7.a', 'Silver plan allows 50 customers. Gold allows 150. Platinum is unlimited. During the trial you get Gold limits.')
    },
    {
      q: t('faqShort.q8.q', 'Is the setup fee a monthly charge?'),
      a: t('faqShort.q8.a', 'No. The setup fee is a one-time charge when you activate your paid plan. After that you only pay the monthly or yearly subscription.')
    }
  ];

  const problems = [
    {
      icon: BookX,
      title: t('problems.card1.title', 'You forget entries and argue later'),
      body:  t('problems.card1.body',  'You delivered milk to 30 customers this morning. By evening you cannot remember who got 1.5 litres and who got 2. Disputes happen. Trust breaks.')
    },
    {
      icon: Calculator,
      title: t('problems.card2.title', 'Bill calculation takes your whole Sunday'),
      body:  t('problems.card2.body',  'Every month end you sit with a notebook, a calculator, and old WhatsApp messages trying to figure out how much each customer owes.')
    },
    {
      icon: Wallet,
      title: t('problems.card3.title', 'You do not know who has paid'),
      body:  t('problems.card3.body',  'Some customers pay weekly, some monthly, some whenever they feel like it. You have no clear record. You are afraid to ask because you are not sure yourself.')
    },
    {
      icon: Users,
      title: t('problems.card4.title', 'Customers keep their own count'),
      body:  t('problems.card4.body',  'Your customers keep their own record of how much milk was delivered and how much they paid. At the end of the month, your numbers and their numbers never match. You spend more time arguing than collecting.')
    }
  ];

  const solutions = [
    {
      icon: ClipboardList,
      title: t('solution.item1.title', 'Record entries in under 10 seconds'),
      desc:  t('solution.item1.desc',  "Open the app, tap the customer name, enter the quantity. Done. Your delivery staff can do this on their phone right at the customer's door.")
    },
    {
      icon: FileText,
      title: t('solution.item2.title', 'Bills are ready at month end automatically'),
      desc:  t('solution.item2.desc',  "At the end of every month, Amrit Manage calculates each customer's bill based on their daily entries and rate. You review once and share.")
    },
    {
      icon: IndianRupee,
      title: t('solution.item3.title', 'See every payment and every pending balance'),
      desc:  t('solution.item3.desc',  'Record a payment in three taps. See instantly who has paid this month, who is pending, and the total outstanding amount across all customers.')
    },
    {
      icon: Smartphone,
      title: t('solution.item4.title', 'Your staff has their own login'),
      desc:  t('solution.item4.desc',  'Create a login for your delivery employee. They can only record milk entries, nothing else. You get a complete record without trusting a notebook.')
    }
  ];

  const navCards = [
    { to: '/features',     icon: Smartphone, label: t('nav.features',   'Features'),     desc: t('learnMore.navCards.features',   'See everything the platform can do for your business.') },
    { to: '/pricing',      icon: Receipt,    label: t('nav.pricing',    'Pricing'),      desc: t('learnMore.navCards.pricing',    'Simple plans starting at just 99 per month.') },
    { to: '/how-it-works', icon: BookOpen,   label: t('nav.howItWorks', 'How It Works'), desc: t('learnMore.navCards.howItWorks', 'A step-by-step walkthrough of the platform.') },
    { to: '/faq',          icon: UserCheck,  label: t('nav.faq',        'FAQ'),          desc: t('learnMore.navCards.faq',        'Answers to the most common questions.') }
  ];

  return (
    <div style={{
      backgroundColor: '#FFFFFF', color: '#161616',
      fontFamily: isMarathi ? '"Noto Sans Devanagari", sans-serif' : 'Inter, sans-serif'
    }}>
      <Navbar />

      {/* Promotion Announcement Bar */}
      <div style={{
        backgroundColor: '#EDF5FF',
        color: '#0F62FE',
        padding: '10px 24px',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: 600,
        borderBottom: '1px solid #D0E2FF',
        fontFamily: isMarathi ? '"Noto Sans Devanagari", sans-serif' : 'Inter, sans-serif'
      }}>
        {isMarathi ? (
          <span>अम्रित मॅनेजचा प्रचार करा आणि मिळवा ४०% कमिशन! <Link to="/promote" style={{ color: '#0F62FE', textDecoration: 'underline', marginLeft: '6px', fontWeight: 700 }}>अधिक जाणून घ्या →</Link></span>
        ) : (
          <span>Promote Amrit Manage & Earn 40% Commission! <Link to="/promote" style={{ color: '#0F62FE', textDecoration: 'underline', marginLeft: '6px', fontWeight: 700 }}>Learn More →</Link></span>
        )}
      </div>

      {/* Hero */}
      <section style={{ maxWidth: '1120px', margin: '0 auto', padding: '96px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '48px', alignItems: 'center' }} className="hero-grid">
          <div>
            <h1 style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1.2, marginBottom: '16px' }}>
              {t('hero.title', 'Manage Milk Customers, Bills, and Payments From Your Phone')}
            </h1>
            <p style={{ fontSize: '18px', color: '#525252', lineHeight: 1.6, maxWidth: '520px', marginBottom: '40px' }}>
              {t('hero.subtitle', 'Record daily milk deliveries, generate monthly bills, and track customer payments, all from your phone. Built for Indian milk vendors.')}
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <Link to="/start" style={{
                backgroundColor: '#0F62FE', color: '#FFFFFF', padding: '0 24px', height: '48px',
                display: 'flex', alignItems: 'center', fontWeight: 600, textDecoration: 'none', minWidth: '160px', justifyContent: 'center',
                transition: 'background-color 0.15s'
              }}
                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0353E9'; }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0F62FE'; }}
              >
                {t('hero.cta', 'Get Started')}
              </Link>
              <Link to="/how-it-works" style={{
                backgroundColor: '#FFFFFF', border: '1.5px solid #0F62FE', color: '#0F62FE',
                padding: '0 24px', height: '48px', display: 'flex', alignItems: 'center',
                fontWeight: 600, textDecoration: 'none', minWidth: '160px', justifyContent: 'center',
                transition: 'background-color 0.15s, color 0.15s'
              }}
                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#EDF5FF'; }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
              >
                {t('hero.howItWorks', 'How It Works')}
              </Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#8D8D8D' }}>
              <ShieldCheck size={14} />
              {t('hero.badge', 'Trial starts upon discussion with our team.')}
            </div>
          </div>

          <div className="desktop-only">
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F4F4F4', paddingBottom: '12px', marginBottom: '16px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>Amrit Manage</span>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#EDF5FF' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {[{ l: 'Customers', v: '24' }, { l: "Today's Milk", v: '182L' }, { l: 'Pending Bills', v: '4,200' }, { l: 'This Month', v: '28,400' }].map(s => (
                  <div key={s.l} style={{ backgroundColor: '#F4F4F4', padding: '10px', border: '1px solid #E0E0E0' }}>
                    <div style={{ fontSize: '10px', color: '#8D8D8D' }}>{s.l}</div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section style={{ maxWidth: '1120px', margin: '0 auto', padding: '96px 24px' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 700, textAlign: 'center', marginBottom: '16px' }}>
          {t('problems.heading', 'Running a Milk Business Is Harder Than It Looks')}
        </h2>
        <p style={{ fontSize: '16px', color: '#525252', textAlign: 'center', maxWidth: '560px', margin: '0 auto 64px', lineHeight: 1.7 }}>
          {t('problems.subtext', 'Every day you are dealing with problems that your notebook cannot solve anymore.')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {problems.map((item, i) => (
            <div key={i} style={{ backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0', padding: '24px' }}>
              <item.icon size={24} color="#DA1E28" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>{item.title}</h3>
              <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Solution */}
      <section style={{ backgroundColor: '#F4F4F4', padding: '96px 24px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, textAlign: 'center', marginBottom: '16px' }}>
            {t('solution.heading', 'Amrit Manage Solves All of This')}
          </h2>
          <p style={{ fontSize: '16px', color: '#525252', textAlign: 'center', maxWidth: '560px', margin: '0 auto 64px', lineHeight: 1.7 }}>
            {t('solution.subtext', 'One simple app for your whole operation. Your staff records entries. You see everything in real time. Bills generate themselves.')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {solutions.map((item, i) => (
              <div key={i} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '24px', display: 'flex', gap: '20px' }}>
                <div style={{ backgroundColor: '#EDF5FF', padding: '12px', height: 'fit-content' }}>
                  <item.icon size={24} color="#0F62FE" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{item.title}</h3>
                  <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Navigate to other pages */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '80px 24px', borderTop: '1px solid #E0E0E0' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '8px' }}>
            {t('learnMore.heading', 'Learn More About Amrit Manage')}
          </h2>
          <p style={{ fontSize: '15px', color: '#525252', textAlign: 'center', marginBottom: '40px' }}>
            {t('learnMore.subtext', 'Explore features, pricing, and how it all works.')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {navCards.map(card => (
              <Link key={card.to} to={card.to} style={{
                display: 'flex', flexDirection: 'column', gap: '10px',
                backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0',
                padding: '20px', textDecoration: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s'
              }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#0F62FE'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,98,254,0.1)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ width: 36, height: 36, backgroundColor: '#EDF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <card.icon size={18} color="#0F62FE" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#161616', marginBottom: '4px' }}>{card.label}</div>
                  <div style={{ fontSize: '13px', color: '#525252', lineHeight: 1.5 }}>{card.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#0F62FE', fontWeight: 600, marginTop: 'auto' }}>
                  {t('learnMore.learnMore', 'Learn more')} <ArrowRight size={13} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section style={{ backgroundColor: '#F4F4F4', padding: '96px 24px', textAlign: 'center', borderTop: '1px solid #E0E0E0' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '24px' }}>
            {t('pricingCta.heading', 'Simple Plans for Every Milk Vendor')}
          </h2>
          <p style={{ fontSize: '18px', color: '#525252', marginBottom: '48px', lineHeight: 1.6 }}>
            {isMarathi
              ? t('pricingCta.subtext', 'Start with our Amrit Gold plan. Experience automatic billing, employee logins, and payment tracking. Trial starts upon discussion with our team.')
              : <>{t('pricingCta.subtext', 'Start with our ')}<strong style={{ color: '#B8860B' }}>Amrit Gold</strong>{' plan. Experience automatic billing, employee logins, and payment tracking. Trial starts upon discussion with our team.'}</>}
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
            <Link to="/start" style={{ backgroundColor: '#0F62FE', color: '#FFFFFF', padding: '16px 40px', textDecoration: 'none', fontWeight: 700, fontSize: '18px', transition: 'background-color 0.15s' }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0353E9'; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0F62FE'; }}
            >
              {t('pricingCta.getStarted', 'Get Started')}
            </Link>
            <Link to="/pricing" style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #161616', color: '#161616', padding: '16px 40px', textDecoration: 'none', fontWeight: 700, fontSize: '18px', transition: 'background-color 0.15s' }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#F4F4F4'; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
            >
              {t('pricingCta.viewPricing', 'View Full Pricing')}
            </Link>
          </div>
          <div style={{ color: '#8D8D8D', fontSize: '14px' }}>
            {t('pricingCta.badge', 'Trial starts upon discussion with our team.')}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: '1120px', margin: '0 auto', padding: '96px 24px' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 700, textAlign: 'center', marginBottom: '16px' }}>
          {t('faqShort.heading', 'Common Questions')}
        </h2>
        <div style={{ maxWidth: '800px', margin: '0 auto', borderTop: '1px solid #E0E0E0' }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: '1px solid #E0E0E0' }}>
              <button
                onClick={() => toggleFaq(i)}
                style={{ width: '100%', padding: '20px 0', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', gap: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: expandedFaq === i ? '#0F62FE' : '#161616' }}>{faq.q}</span>
                <span style={{ flexShrink: 0, transition: 'transform 0.25s', transform: expandedFaq === i ? 'rotate(180deg)' : 'rotate(0deg)', display: 'flex' }}>
                  <ChevronDown size={18} color={expandedFaq === i ? '#0F62FE' : '#8D8D8D'} />
                </span>
              </button>
              <div style={{ maxHeight: expandedFaq === i ? '400px' : '0', overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
                <div style={{ paddingBottom: '20px', fontSize: '14px', color: '#525252', lineHeight: 1.65 }}>{faq.a}</div>
              </div>
            </div>
          ))}
        </div>
        {/* "More questions" — below the accordion, as a button */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <p style={{ fontSize: '15px', color: '#525252', marginBottom: '16px' }}>
            {isMarathi ? 'अजून प्रश्न आहेत?' : 'Have more questions?'}
          </p>
          <Link to="/faq" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#EDF5FF', color: '#0F62FE',
            border: '1.5px solid #0F62FE',
            padding: '12px 28px', fontWeight: 700, fontSize: '15px',
            textDecoration: 'none', transition: 'background-color 0.15s'
          }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#D0E2FF'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = '#EDF5FF'; }}
          >
            {isMarathi ? 'सर्व प्रश्न पाहा →' : 'View Full FAQ →'}
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '96px 24px', textAlign: 'center', borderTop: '1px solid #E0E0E0' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 700, marginBottom: '16px' }}>
          {t('finalCta.heading', 'Your milk business deserves a better system.')}
        </h2>
        <p style={{ fontSize: '18px', color: '#525252', maxWidth: '560px', margin: '0 auto 48px', lineHeight: 1.6 }}>
          {t('finalCta.subtext', 'Stop relying on notebooks and mental calculations. Get started today.')}
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <Link to="/start" style={{ backgroundColor: '#0F62FE', color: '#FFFFFF', padding: '0 32px', height: '52px', display: 'flex', alignItems: 'center', fontWeight: 600, textDecoration: 'none', minWidth: '160px', justifyContent: 'center', transition: 'background-color 0.15s' }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0353E9'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0F62FE'; }}
          >
            {t('finalCta.cta', 'Get Started')}
          </Link>
          <Link to="/pricing" style={{ backgroundColor: 'transparent', border: '1.5px solid #161616', color: '#161616', padding: '0 32px', height: '52px', display: 'flex', alignItems: 'center', fontWeight: 600, textDecoration: 'none', minWidth: '160px', justifyContent: 'center', transition: 'background-color 0.15s' }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#F4F4F4'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {t('finalCta.pricing', 'View Pricing')}
          </Link>
        </div>
        <div style={{ fontSize: '13px', color: '#8D8D8D' }}>
          {t('finalCta.badge', 'Trial starts upon discussion with our team.')}
        </div>
      </section>

      <SiteFooter />

      <style>{`
        .hero-grid { display: grid; }
        .desktop-only { display: block; }
        @media (max-width: 768px) {
          .desktop-only { display: none; }
          .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
          h1 { font-size: 32px !important; }
          h2 { font-size: 28px !important; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
