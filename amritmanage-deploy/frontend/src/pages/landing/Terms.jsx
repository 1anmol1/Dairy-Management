import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SiteFooter from '../../components/SiteFooter';
import { useMarathi } from '../../i18n/marathi';

const TERMS_CONTENT = {
  title:   { en: 'Terms of Service',                                                  mr: 'सेवा अटी' },
  updated: { en: 'Last Updated: May 2, 2026. These terms govern your use of Amrit Manage.', mr: 'शेवटचे अपडेट: २ मे २०२६. या अटी अमृत मॅनेजच्या तुमच्या वापरावर लागू होतात.' },
  sections: [
    {
      title: { en: '1. Acceptance of Terms', mr: '१. अटींची स्वीकृती' },
      paras: [
        { en: 'By accessing or using Amrit Manage ("the Service"), you agree to be bound by these Terms of Service ("Terms"). These Terms form a legally binding agreement between you and Brandkrit Technologies ("we", "our", "us"), the developer and owner of Amrit Manage.', mr: 'अमृत मॅनेज ("सेवा") वापरून तुम्ही या सेवा अटींशी ("अटी") बांधील होण्यास सहमती देता. या अटी तुमच्या आणि ब्रँडक्रिट टेक्नॉलॉजीज ("आम्ही") यांच्यातील कायदेशीर करार आहेत.' },
        { en: 'We may update these Terms from time to time. Continued use of the Service after changes are posted constitutes acceptance of the updated Terms.', mr: 'आम्ही वेळोवेळी या अटी अपडेट करू शकतो. बदल प्रकाशित झाल्यानंतर सेवा सुरू ठेवणे म्हणजे अपडेट केलेल्या अटींची स्वीकृती.' },
      ]
    },
    {
      title: { en: '2. Description of Service', mr: '२. सेवेचे वर्णन' },
      paras: [
        { en: 'Amrit Manage is a cloud-based dairy business management platform that allows dairy vendors to record daily milk deliveries, generate monthly bills, track customer payments, and manage delivery staff. The Service is provided as a subscription-based SaaS product.', mr: 'अमृत मॅनेज हे क्लाउड-आधारित डेअरी व्यवसाय व्यवस्थापन प्लॅटफॉर्म आहे जे दूध विक्रेत्यांना रोजचे वितरण नोंदवणे, मासिक बिले तयार करणे, ग्राहकांची देयके ट्रॅक करणे आणि कर्मचारी व्यवस्थापन करण्यास अनुमती देते.' },
      ]
    },
    {
      title: { en: '3. Account Registration and Security', mr: '३. खाते नोंदणी आणि सुरक्षा' },
      paras: [
        { en: 'To use the Service, you must create an account by providing accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and all activities that occur under your account.', mr: 'सेवा वापरण्यासाठी तुम्हाला अचूक आणि पूर्ण माहिती देऊन खाते तयार करावे लागेल. तुम्ही तुमच्या खाते क्रेडेन्शियल्सची गोपनीयता राखण्यासाठी जबाबदार आहात.' },
        { en: 'You may not share your account credentials with others. Each staff member must have their own login created through the Staff management feature.', mr: 'तुम्ही तुमचे खाते क्रेडेन्शियल्स इतरांसोबत शेअर करू शकत नाही. प्रत्येक कर्मचाऱ्याचे स्वतःचे लॉगिन असणे आवश्यक आहे.' },
      ]
    },
    {
      title: { en: '4. Acceptable Use', mr: '४. स्वीकार्य वापर' },
      paras: [
        { en: 'You agree to use the Service only for lawful purposes. You must not use the Service to store or transmit unlawful content, attempt to gain unauthorised access, reverse engineer the Service, use automated tools to scrape data, or impersonate any person or entity.', mr: 'तुम्ही सेवा फक्त कायदेशीर हेतूंसाठी वापरण्यास सहमती देता. बेकायदेशीर सामग्री साठवणे, अनधिकृत प्रवेश मिळवण्याचा प्रयत्न करणे, सेवा रिव्हर्स इंजिनियर करणे किंवा कोणाची तोतयागिरी करणे यास मनाई आहे.' },
      ]
    },
    {
      title: { en: '5. Trial Period', mr: '५. ट्रायल कालावधी' },
      paras: [
        { en: 'We offer a free trial for new accounts. The trial provides full access to Amrit Gold features and is activated after a brief discussion with our team. No payment is required to start the trial.', mr: 'आम्ही नवीन खात्यांसाठी मोफत ट्रायल देतो. ट्रायल आमच्या टीमशी थोडक्या चर्चेनंतर सक्रिय होते. ट्रायल सुरू करण्यासाठी कोणतेही पेमेंट आवश्यक नाही.' },
        { en: 'After the trial period ends, your account will enter read-only mode. You will be able to view existing data but will not be able to add new entries or generate bills until you activate a paid subscription.', mr: 'ट्रायल कालावधी संपल्यानंतर तुमचे खाते रीड-ओन्ली मोडमध्ये जाईल. तुम्ही जुना डेटा पाहू शकता पण पेड सदस्यता सक्रिय करेपर्यंत नवीन नोंदी करता येणार नाहीत.' },
      ]
    },
    {
      title: { en: '6. Subscriptions and Billing', mr: '६. सदस्यता आणि बिलिंग' },
      paras: [
        { en: 'After the trial, continued use of the Service requires a paid subscription. Payments are collected manually by our team after you submit a subscription request. Our team will contact you to confirm your details and collect payment.', mr: 'ट्रायलनंतर सेवा सुरू ठेवण्यासाठी पेड सदस्यता आवश्यक आहे. सदस्यता विनंती सादर केल्यानंतर आमची टीम तुमच्याशी संपर्क करून पेमेंट घेते.' },
        { en: 'Subscriptions are billed in advance for the selected period. A one-time setup fee applies to your first activation on a paid plan. We do not offer refunds for subscription fees already paid, except where required by applicable law.', mr: 'सदस्यता निवडलेल्या कालावधीसाठी आगाऊ आकारली जाते. पेड योजनेवर पहिल्यांदा सक्रिय करताना एकवेळ सेटअप फी लागते. आधीच भरलेल्या सदस्यता शुल्काचा परतावा दिला जात नाही.' },
      ]
    },
    {
      title: { en: '7. Your Data and Content', mr: '७. तुमचा डेटा आणि सामग्री' },
      paras: [
        { en: 'You retain ownership of all data you enter into the Service. By using the Service, you grant us a limited licence to store, process, and display your content solely for the purpose of providing the Service to you.', mr: 'तुम्ही सेवेत प्रविष्ट केलेल्या सर्व डेटाची मालकी तुमच्याकडे राहते. सेवा वापरून तुम्ही आम्हाला फक्त सेवा पुरवण्याच्या उद्देशाने तुमची सामग्री साठवण्याचा, प्रक्रिया करण्याचा आणि प्रदर्शित करण्याचा मर्यादित परवाना देता.' },
      ]
    },
    {
      title: { en: '8. Limitation of Liability', mr: '८. दायित्वाची मर्यादा' },
      paras: [
        { en: 'To the maximum extent permitted by applicable law, Amrit Manage Technologies shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service.', mr: 'लागू कायद्याने परवानगी दिलेल्या कमाल मर्यादेपर्यंत, अमृत मॅनेज टेक्नॉलॉजीज सेवा वापरण्यामुळे किंवा वापरण्यास असमर्थतेमुळे होणाऱ्या कोणत्याही अप्रत्यक्ष, आकस्मिक, विशेष किंवा परिणामी नुकसानासाठी जबाबदार नाही.' },
      ]
    },
    {
      title: { en: '9. Termination', mr: '९. समाप्ती' },
      paras: [
        { en: 'You may terminate your account at any time by contacting us at business@brandkrit.com. Upon termination, your access to the Service will end and your data will be retained for 90 days before deletion.', mr: 'तुम्ही कधीही business@brandkrit.com वर संपर्क करून तुमचे खाते बंद करू शकता. समाप्तीनंतर सेवेचा प्रवेश संपेल आणि डेटा डिलीट होण्यापूर्वी ९० दिवस ठेवला जाईल.' },
      ]
    },
    {
      title: { en: '10. Governing Law', mr: '१०. शासकीय कायदा' },
      paras: [
        { en: 'These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Pune, Maharashtra, India.', mr: 'या अटी भारताच्या कायद्यांद्वारे शासित आहेत. कोणतेही विवाद पुणे, महाराष्ट्र, भारत येथील न्यायालयांच्या अनन्य अधिकारक्षेत्राच्या अधीन असतील.' },
      ]
    },
    {
      title: { en: '11. Contact Information', mr: '११. संपर्क माहिती' },
      paras: [
        { en: 'Email: business@brandkrit.com | Phone: +91 90225 53343 (Mon to Sat, 9am to 6pm) | Amrit Manage is developed and owned by Brandkrit Technologies.', mr: 'ईमेल: business@brandkrit.com | फोन: +91 90225 53343 (सोम ते शनि, सकाळी ९ ते संध्याकाळी ६) | अमृत मॅनेज ब्रँडक्रिट टेक्नॉलॉजीजने विकसित आणि मालकीचे आहे.' },
      ]
    },
  ]
};

const TermsPage = () => {
  const { isMarathi } = useMarathi();
  const d = TERMS_CONTENT;
  const font = isMarathi ? '"Noto Sans Devanagari", sans-serif' : 'Inter, sans-serif';

  return (
    <div style={{ backgroundColor: '#FFFFFF', color: '#161616', fontFamily: font, minHeight: '100vh' }}>
      <Navbar />
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
          {isMarathi ? d.title.mr : d.title.en}
        </h1>
        <p style={{ color: '#8D8D8D', fontSize: '12px', marginBottom: '40px' }}>
          {isMarathi ? d.updated.mr : d.updated.en}
        </p>

        {d.sections.map((sec, si) => (
          <section key={si} style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#161616', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #E0E0E0' }}>
              {isMarathi ? sec.title.mr : sec.title.en}
            </h2>
            {sec.paras.map((p, pi) => (
              <p key={pi} style={{ color: '#525252', fontSize: '13px', lineHeight: 1.6, marginBottom: '8px' }}>
                {isMarathi ? p.mr : p.en}
              </p>
            ))}
          </section>
        ))}

        <div style={{ borderTop: '1px solid #E0E0E0', paddingTop: '32px', textAlign: 'center' }}>
          <p style={{ color: '#525252', fontSize: '13px', marginBottom: '20px' }}>
            {isMarathi
              ? 'अटींबद्दल प्रश्न? '
              : 'Questions about our terms? Email us at '}
            <a href="mailto:business@brandkrit.com" style={{ color: '#0F62FE' }}>business@brandkrit.com</a>
          </p>
          <Link to="/start" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#0F62FE', color: '#FFFFFF', padding: '12px 28px',
            textDecoration: 'none', fontWeight: 600, fontSize: '14px', transition: 'background-color 0.15s'
          }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0353E9'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0F62FE'; }}
          >
            {isMarathi ? 'आता सुरू करा' : 'Get Started Now'}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default TermsPage;
