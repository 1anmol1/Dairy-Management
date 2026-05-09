import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SiteFooter from '../../components/SiteFooter';
import { useMarathi } from '../../i18n/marathi';

// ── Bilingual content data ────────────────────────────────────
const PRIVACY_CONTENT = {
  title:    { en: 'Privacy Policy',                                                    mr: 'गोपनीयता धोरण' },
  updated:  { en: 'Last Updated: May 2, 2026. Effective immediately for all users.',   mr: 'शेवटचे अपडेट: २ मे २०२६. सर्व वापरकर्त्यांसाठी तत्काळ लागू.' },
  sections: [
    {
      title: { en: '1. Introduction and Scope', mr: '१. परिचय आणि व्याप्ती' },
      paras: [
        { en: 'Amrit Manage ("we", "our", "us") is a dairy business management platform developed and owned by Brandkrit Technologies. This Privacy Policy explains how we collect, use, store, share, and protect information about you when you use our platform, website, and related services (collectively, the "Service").', mr: 'अमृत मॅनेज ("आम्ही", "आमचे") हे ब्रँडक्रिट टेक्नॉलॉजीजने विकसित आणि मालकीचे डेअरी व्यवसाय व्यवस्थापन प्लॅटफॉर्म आहे. हे गोपनीयता धोरण आम्ही तुमची माहिती कशी गोळा करतो, वापरतो, साठवतो, शेअर करतो आणि संरक्षित करतो हे स्पष्ट करते.' },
        { en: 'This policy applies to all users of the Service, including dairy vendors (account owners), their delivery staff, and any other individuals whose data is entered into the platform. By using the Service, you agree to the practices described in this policy.', mr: 'हे धोरण सेवेच्या सर्व वापरकर्त्यांना लागू होते, ज्यात दूध विक्रेते (खाते मालक), त्यांचे कर्मचारी आणि प्लॅटफॉर्मवर डेटा प्रविष्ट केलेल्या इतर व्यक्तींचा समावेश आहे.' },
        { en: 'If you do not agree with this policy, please do not use the Service. For questions, contact us at business@brandkrit.com.', mr: 'जर तुम्ही या धोरणाशी सहमत नसाल तर कृपया सेवा वापरू नका. प्रश्नांसाठी business@brandkrit.com वर संपर्क करा.' },
      ]
    },
    {
      title: { en: '2. Information We Collect', mr: '२. आम्ही गोळा करतो ती माहिती' },
      paras: [
        { en: 'Account Information: When you register, we collect your name, phone number, email address, and business name.', mr: 'खाते माहिती: नोंदणी करताना आम्ही तुमचे नाव, फोन नंबर, ईमेल पत्ता आणि व्यवसायाचे नाव गोळा करतो.' },
        { en: 'Customer Data: You enter information about your milk customers, including their names, phone numbers, delivery addresses, milk quantities, and rates per litre. This data belongs to you and is stored on our servers on your behalf.', mr: 'ग्राहक डेटा: तुम्ही तुमच्या दूध ग्राहकांची माहिती प्रविष्ट करता. हा डेटा तुमचा आहे आणि तुमच्यावतीने आमच्या सर्व्हरवर साठवला जातो.' },
        { en: 'Delivery and Transaction Records: We store all delivery logs, billing records, and payment entries that you or your staff create.', mr: 'वितरण आणि व्यवहार नोंदी: तुम्ही किंवा तुमचे कर्मचारी तयार केलेल्या सर्व वितरण लॉग्स, बिलिंग नोंदी आणि देयक नोंदी आम्ही साठवतो.' },
        { en: 'Usage Data: We automatically collect information about how you use the Service, including pages visited, features used, device type, browser type, IP address, and timestamps.', mr: 'वापर डेटा: तुम्ही सेवा कशी वापरता याबद्दल आम्ही आपोआप माहिती गोळा करतो, ज्यात भेट दिलेली पृष्ठे, वापरलेली वैशिष्ट्ये, डिव्हाइस प्रकार, IP पत्ता यांचा समावेश आहे.' },
      ]
    },
    {
      title: { en: '3. How We Use Your Information', mr: '३. आम्ही तुमची माहिती कशी वापरतो' },
      paras: [
        { en: 'We use the information we collect to create and manage your account, enable delivery recording and billing features, send service-related communications, process subscription requests, improve and secure the Service, detect fraud, and comply with applicable laws.', mr: 'आम्ही गोळा केलेली माहिती खाते तयार करण्यासाठी, वितरण नोंद आणि बिलिंग वैशिष्ट्ये सक्षम करण्यासाठी, सेवा-संबंधित संप्रेषण पाठवण्यासाठी, सदस्यता विनंती प्रक्रिया करण्यासाठी, सेवा सुधारण्यासाठी आणि कायद्यांचे पालन करण्यासाठी वापरतो.' },
        { en: 'We do not use your data for advertising purposes. We do not build advertising profiles based on your usage.', mr: 'आम्ही तुमचा डेटा जाहिरात हेतूंसाठी वापरत नाही. आम्ही तुमच्या वापरावर आधारित जाहिरात प्रोफाइल तयार करत नाही.' },
      ]
    },
    {
      title: { en: '4. Data Storage and Security', mr: '४. डेटा साठवण आणि सुरक्षा' },
      paras: [
        { en: 'All data is stored on secure cloud servers with encryption at rest and in transit. We use industry-standard security measures including HTTPS, encrypted database storage, and access controls to protect your information.', mr: 'सर्व डेटा विश्रांती आणि संक्रमणात एन्क्रिप्शनसह सुरक्षित क्लाउड सर्व्हरवर साठवला जातो. आम्ही HTTPS, एन्क्रिप्टेड डेटाबेस स्टोरेज आणि प्रवेश नियंत्रणांसह उद्योग-मानक सुरक्षा उपाय वापरतो.' },
        { en: 'Your data is stored in India on servers compliant with applicable data protection standards.', mr: 'तुमचा डेटा भारतात लागू डेटा संरक्षण मानकांचे पालन करणाऱ्या सर्व्हरवर साठवला जातो.' },
      ]
    },
    {
      title: { en: '5. Data Sharing and Third Parties', mr: '५. डेटा शेअरिंग आणि तृतीय पक्ष' },
      paras: [
        { en: 'We do not sell, rent, or trade your personal information or your customers\' data to any third party for commercial purposes.', mr: 'आम्ही तुमची वैयक्तिक माहिती किंवा तुमच्या ग्राहकांचा डेटा व्यावसायिक हेतूंसाठी कोणत्याही तृतीय पक्षाला विकत नाही, भाड्याने देत नाही किंवा व्यापार करत नाही.' },
        { en: 'We may share data with service providers who help us operate the platform, with law enforcement when required by law, or in the event of a merger or acquisition.', mr: 'आम्ही प्लॅटफॉर्म चालवण्यास मदत करणाऱ्या सेवा प्रदात्यांसह, कायद्याने आवश्यक असल्यास कायद्याची अंमलबजावणी करणाऱ्यांसह डेटा शेअर करू शकतो.' },
      ]
    },
    {
      title: { en: '6. Data Retention', mr: '६. डेटा धारणा' },
      paras: [
        { en: 'We retain your account data and business records for as long as your account is active. If you cancel your subscription, your data is retained for 90 days to allow reactivation. After 90 days, data is permanently deleted from our systems.', mr: 'तुमचे खाते सक्रिय असेपर्यंत आम्ही तुमचा खाते डेटा आणि व्यवसाय नोंदी ठेवतो. सदस्यता रद्द केल्यास, पुनर्सक्रियतेसाठी ९० दिवस डेटा ठेवला जातो. ९० दिवसांनंतर डेटा कायमचा डिलीट होतो.' },
        { en: 'You can request deletion of your account and all associated data at any time by contacting us at business@brandkrit.com.', mr: 'तुम्ही कधीही business@brandkrit.com वर संपर्क करून तुमचे खाते आणि सर्व संबंधित डेटा डिलीट करण्याची विनंती करू शकता.' },
      ]
    },
    {
      title: { en: '7. Your Rights', mr: '७. तुमचे अधिकार' },
      paras: [
        { en: 'You have the right to access, correct, delete, and export your data. You can view all data through the dashboard. To exercise any rights, contact us at business@brandkrit.com. We will respond within 30 days.', mr: 'तुम्हाला तुमचा डेटा पाहण्याचा, दुरुस्त करण्याचा, डिलीट करण्याचा आणि एक्सपोर्ट करण्याचा अधिकार आहे. कोणतेही अधिकार वापरण्यासाठी business@brandkrit.com वर संपर्क करा. आम्ही ३० दिवसांत उत्तर देऊ.' },
      ]
    },
    {
      title: { en: '8. Cookies and Tracking', mr: '८. कुकीज आणि ट्रॅकिंग' },
      paras: [
        { en: 'We use minimal cookies and local storage to maintain your login session and remember your preferences. We do not use third-party advertising cookies or tracking pixels.', mr: 'आम्ही तुमचे लॉगिन सत्र राखण्यासाठी आणि प्राधान्ये लक्षात ठेवण्यासाठी किमान कुकीज आणि लोकल स्टोरेज वापरतो. आम्ही तृतीय-पक्ष जाहिरात कुकीज किंवा ट्रॅकिंग पिक्सेल वापरत नाही.' },
      ]
    },
    {
      title: { en: '9. Changes to This Policy', mr: '९. या धोरणातील बदल' },
      paras: [
        { en: 'We may update this Privacy Policy from time to time. When we make significant changes, we will notify you by email or through a notice in the Service. Continued use of the Service after changes are posted constitutes your acceptance of the updated policy.', mr: 'आम्ही वेळोवेळी हे गोपनीयता धोरण अपडेट करू शकतो. महत्त्वपूर्ण बदल केल्यावर आम्ही तुम्हाला ईमेलद्वारे किंवा सेवेतील सूचनेद्वारे कळवू.' },
      ]
    },
    {
      title: { en: '10. Contact Us', mr: '१०. आमच्याशी संपर्क करा' },
      paras: [
        { en: 'Email: business@brandkrit.com | Phone: +91 90225 53343 (Mon to Sat, 9am to 6pm) | Amrit Manage is developed and owned by Brandkrit Technologies.', mr: 'ईमेल: business@brandkrit.com | फोन: +91 90225 53343 (सोम ते शनि, सकाळी ९ ते संध्याकाळी ६) | अमृत मॅनेज ब्रँडक्रिट टेक्नॉलॉजीजने विकसित आणि मालकीचे आहे.' },
      ]
    },
  ]
};

const PrivacyPage = () => {
  const { isMarathi } = useMarathi();
  const d = PRIVACY_CONTENT;
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
          <Link to="/start" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#0F62FE', color: '#FFFFFF', padding: '12px 28px',
            textDecoration: 'none', fontWeight: 600, fontSize: '14px', transition: 'background-color 0.15s'
          }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0353E9'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0F62FE'; }}
          >
            {isMarathi ? 'सुरू करा' : 'Get Started'}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default PrivacyPage;
