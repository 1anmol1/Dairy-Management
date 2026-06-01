import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import SiteFooter from '../../components/SiteFooter';
import { useMarathi } from '../../i18n/marathi';
import { Share2, IndianRupee, ShieldCheck, HelpCircle, Gift, AlertCircle, Users, CheckCircle2, ChevronRight } from 'lucide-react';

const PromotePage = () => {
  const { isMarathi } = useMarathi();
  
  // Calculator state
  const [userCount, setUserCount] = useState(5);
  const [selectedPlan, setSelectedPlan] = useState('gold'); // silver (99), gold (199), platinum (399)
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly, yearly

  const plans = {
    silver: {
      name: 'Amrit Silver',
      monthly: 99,
      yearly: 999,
      labelEn: 'Silver',
      labelMr: 'सिल्व्हर'
    },
    gold: {
      name: 'Amrit Gold',
      monthly: 199,
      yearly: 1999,
      labelEn: 'Gold',
      labelMr: 'गोल्ड'
    },
    platinum: {
      name: 'Amrit Platinum',
      monthly: 399,
      yearly: 3999,
      labelEn: 'Platinum',
      labelMr: 'प्लॅटिनम'
    }
  };

  const currentPrice = billingCycle === 'yearly' ? plans[selectedPlan].yearly : plans[selectedPlan].monthly;
  const totalSubValue = currentPrice * userCount;
  const rewardRate = 0.40; // 40% reward rate
  const calculatedRewards = totalSubValue * rewardRate;
  const perUserReward = Math.round(currentPrice * rewardRate);

  const font = isMarathi ? '"Noto Sans Devanagari", sans-serif' : 'Inter, sans-serif';

  return (
    <div style={{
      backgroundColor: '#FAFAFB',
      color: '#161616',
      fontFamily: font,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #0A1C40 0%, #0F62FE 100%)',
        color: '#FFFFFF',
        padding: '100px 24px 120px',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        {/* Decorative subtle abstract elements */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(15,98,254,0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-5%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '840px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#FFFFFF',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(8px)',
            padding: '8px 18px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '28px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <Gift size={13} style={{ color: '#F1C40F' }} />
            {isMarathi ? 'मर्यादित कालावधीची विशेष मोहीम' : 'Special Partner Program Campaign'}
          </span>
          <h1 style={{
            fontSize: '46px',
            fontWeight: 800,
            lineHeight: 1.25,
            marginBottom: '24px',
            letterSpacing: '-0.8px',
            textShadow: '0 2px 10px rgba(0,0,0,0.15)'
          }}>
            {isMarathi ? 'अम्रीत मॅनेजचा प्रचार करा आणि थेट कमवा' : 'Promote Amrit Manage & Earn Rewards'}
          </h1>
          <p style={{
            fontSize: '18px',
            opacity: 0.9,
            lineHeight: 1.6,
            maxWidth: '640px',
            margin: '0 auto',
            fontWeight: 400
          }}>
            {isMarathi 
              ? 'इतर दुग्ध व्यवसाय मालकांना जोडण्यासाठी मदत करा आणि पहिल्या सबस्क्रिप्शन मूल्यावर मिळवा थेट ४०% बक्षीस.'
              : 'Help us reach more dairy business owners and vendors. Refer them and earn a one-time 40% reward on their initial subscription.'}
          </p>
        </div>
      </section>

      {/* Details & Calculator Section */}
      <section style={{ 
        maxWidth: '1120px', 
        margin: '-60px auto 0', 
        padding: '0 24px 80px',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          alignItems: 'start'
        }}>
          {/* Instructions Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAEAEA',
            padding: '40px 36px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.03)',
            borderRadius: '8px'
          }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: 700, 
              color: '#0F62FE', 
              marginBottom: '32px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              borderBottom: '1px solid #F4F4F4',
              paddingBottom: '16px'
            }}>
              <Share2 size={22} />
              {isMarathi ? 'प्रचार कसा करावा?' : 'How It Works'}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#EDF5FF', color: '#0F62FE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0
                }}>1</div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '16px', color: '#161616', marginBottom: '6px' }}>
                    {isMarathi ? 'माहिती शेअर करा' : 'Spread the Word'}
                  </h4>
                  <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.55 }}>
                    {isMarathi 
                      ? 'तुमच्या ओळखीच्या डेअरी व्यवसाय मालकांना, दूध विक्रेत्यांना किंवा पुरवठादारांना अम्रीत मॅनेजबद्दल सांगा.'
                      : 'Tell dairy vendors, owners, and operators about how Amrit Manage simplifies business.'}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#EDF5FF', color: '#0F62FE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0
                }}>2</div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '16px', color: '#161616', marginBottom: '6px' }}>
                    {isMarathi ? 'थेट बँक खात्यात पैसे मिळवा' : 'Direct Bank Payout'}
                  </h4>
                  <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.55 }}>
                    {isMarathi 
                      ? 'त्यांच्या पहिल्या सबस्क्रिप्शन मूल्याच्या ४०% रक्कम थेट तुमच्या बँक खात्यात पाठवली जाईल (एकवेळ पेमेंट).'
                      : 'Earn a massive 40% of their initial subscription value transferred directly into your bank account.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#EDF5FF', color: '#0F62FE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0
                }}>3</div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '16px', color: '#161616', marginBottom: '6px' }}>
                    {isMarathi ? 'नोंद कशी करावी?' : 'How to Claim Credit'}
                  </h4>
                  <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.55 }}>
                    {isMarathi 
                      ? 'कोणत्याही लिंक किंवा कठीण कूपन कोडची गरज नाही! फक्त तुम्ही संदर्भित केलेल्या व्यक्तीला त्यांच्या ऑनबोर्डिंग दरम्यान तुमचे नाव किंवा फोन नंबर नोंदवण्यास सांगा.'
                      : 'No referral links or complicated promo codes required. Just have your referred contact mention your name or phone number during onboarding.'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '40px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '6px',
              padding: '20px',
              fontSize: '13.5px',
              color: '#92400E',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              lineHeight: 1.6
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#D97706' }} />
              {isMarathi ? (
                <span>महत्त्वाची अट: प्रमोटर लाभ मिळवण्यासाठी <strong>किमान दोन युजर्सनी सबस्क्राइब करणे आवश्यक आहे</strong>.</span>
              ) : (
                <span>Note: To qualify for rewards, <strong>at least two referred users must subscribe</strong> to any paid plan.</span>
              )}
            </div>
          </div>

          {/* Calculator Card */}
          <div style={{
            border: '1px solid #EAEAEA',
            padding: '40px 36px',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.03)'
          }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: 700, 
              color: '#24A148', 
              marginBottom: '32px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              borderBottom: '1px solid #F4F4F4',
              paddingBottom: '16px'
            }}>
              <IndianRupee size={22} />
              {isMarathi ? 'बक्षीस कॅल्क्युलेटर' : 'Reward Estimator'}
            </h2>

            {/* Plan selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                {isMarathi ? '१. प्लॅन निवडा' : '1. Select Plan'}
              </label>
              <div style={{ display: 'flex', border: '1px solid #EAEAEA', padding: '4px', backgroundColor: '#FAFAFB', borderRadius: '4px' }}>
                {Object.keys(plans).map(key => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    style={{
                      flex: 1,
                      padding: '10px 6px',
                      fontSize: '13px',
                      fontWeight: selectedPlan === key ? 700 : 500,
                      backgroundColor: selectedPlan === key ? '#FFFFFF' : 'transparent',
                      color: selectedPlan === key ? '#0F62FE' : '#525252',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: selectedPlan === key ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {isMarathi ? plans[key].labelMr : plans[key].labelEn} (₹{billingCycle === 'yearly' ? plans[key].yearly : plans[key].monthly})
                  </button>
                ))}
              </div>
            </div>

            {/* Billing Cycle */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                {isMarathi ? '२. पेमेंट सायकल' : '2. Billing Cycle'}
              </label>
              <div style={{ display: 'flex', border: '1px solid #EAEAEA', padding: '4px', backgroundColor: '#FAFAFB', borderRadius: '4px' }}>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    flex: 1,
                    padding: '10px 6px',
                    fontSize: '13px',
                    fontWeight: billingCycle === 'monthly' ? 700 : 500,
                    backgroundColor: billingCycle === 'monthly' ? '#FFFFFF' : 'transparent',
                    color: billingCycle === 'monthly' ? '#0F62FE' : '#525252',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    boxShadow: billingCycle === 'monthly' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  {isMarathi ? 'मासिक' : 'Monthly'}
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  style={{
                    flex: 1,
                    padding: '10px 6px',
                    fontSize: '13px',
                    fontWeight: billingCycle === 'yearly' ? 700 : 500,
                    backgroundColor: billingCycle === 'yearly' ? '#FFFFFF' : 'transparent',
                    color: billingCycle === 'yearly' ? '#0F62FE' : '#525252',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    boxShadow: billingCycle === 'yearly' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  {isMarathi ? 'वार्षिक (२ महिने मोफत)' : 'Yearly'}
                </button>
              </div>
            </div>

            {/* User count slider */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {isMarathi ? '३. संदर्भित युजर्स संख्या' : '3. Referred Users'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={userCount}
                    onChange={e => {
                      let val = parseInt(e.target.value) || 2;
                      if (val < 2) val = 2;
                      if (val > 100) val = 100;
                      setUserCount(val);
                    }}
                    style={{
                      width: '60px',
                      padding: '4px 6px',
                      border: '1px solid #EAEAEA',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#0F62FE',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#525252', fontWeight: 500 }}>
                    {isMarathi ? 'युजर्स' : 'users'}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                value={userCount}
                onChange={e => setUserCount(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#0F62FE', cursor: 'pointer', height: '6px', borderRadius: '3px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8D8D8D', marginTop: '6px' }}>
                <span>2</span>
                <span>100</span>
              </div>
            </div>

            {/* Result display with stable layout (no shaking) */}
            <div style={{
              background: 'linear-gradient(135deg, #F8FAFC 0%, #EDF5FF 100%)',
              padding: '28px 24px',
              border: '1px dashed #B2CFFF',
              borderRadius: '6px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              boxSizing: 'border-box'
            }}>
              <div style={{ fontSize: '12px', color: '#525252', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                {isMarathi ? 'तुमचे अंदाजे उत्पन्न' : 'Your Estimated Reward'}
              </div>
              
              <div style={{ 
                fontSize: '44px', 
                fontWeight: 900, 
                color: '#24A148', 
                marginBottom: '10px', 
                lineHeight: 1,
                letterSpacing: '-1px'
              }}>
                ₹{calculatedRewards.toFixed(0)}
              </div>
              
              {/* Stable height container to prevent layout shifting during drag */}
              <div style={{ 
                minHeight: '42px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#4B5563', 
                  whiteSpace: 'nowrap', 
                  textOverflow: 'ellipsis', 
                  width: '100%', 
                  textAlign: 'center' 
                }}>
                  {isMarathi 
                    ? `प्रति युझर ₹${perUserReward} बक्षीस वर आधारित`
                    : `Based on ₹${perUserReward} reward per user`}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#6B7280', 
                  marginTop: '2px', 
                  whiteSpace: 'nowrap', 
                  textOverflow: 'ellipsis', 
                  width: '100%', 
                  textAlign: 'center' 
                }}>
                  {isMarathi 
                    ? `(${userCount} युजर्स × ₹${perUserReward})`
                    : `(${userCount} users × ₹${perUserReward})`}
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#8D8D8D' }}>
              <CheckCircle2 size={12} color="#24A148" style={{ flexShrink: 0 }} />
              <span>
                {isMarathi 
                  ? 'बक्षीस फक्त पहिल्या सबस्क्रिप्शन मूल्यावर लागू होते, नूतनीकरणावर नाही.' 
                  : 'Reward is paid one-time on the initial subscription payment only.'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Banner */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '80px 24px', borderTop: '1px solid #EAEAEA' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '44px', textAlign: 'center', color: '#161616', letterSpacing: '-0.5px' }}>
            {isMarathi ? 'वारंवार विचारले जाणारे प्रश्न' : 'Frequently Asked Questions'}
          </h3>
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '36px' }}>
            <div style={{ borderBottom: '1px solid #F4F4F4', paddingBottom: '20px' }}>
              <h5 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: '#161616' }}>
                {isMarathi ? 'माझे पैसे कधी मिळतील?' : 'When will I get my payout?'}
              </h5>
              <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6 }}>
                {isMarathi 
                  ? 'तुम्ही संदर्भित केलेल्या युजर्सनी त्यांची विनामूल्य चाचणी संपवून पेड सबस्क्रिप्शन सुरू केल्यानंतर, ३० दिवसांच्या आत तुमच्या बँक खात्यात थेट ट्रान्सफर केले जातील.'
                  : 'Payouts are processed directly into your registered bank account within 30 days after your referred users successfully start their active paid subscription.'}
              </p>
            </div>
            <div style={{ borderBottom: '1px solid #F4F4F4', paddingBottom: '20px' }}>
              <h5 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: '#161616' }}>
                {isMarathi ? 'माझे बँक डिटेल्स कसे द्यायचे?' : 'How do I submit my bank account details?'}
              </h5>
              <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6 }}>
                {isMarathi 
                  ? 'तुमचे किमान २ संदर्भित युजर्स सबस्क्राइब झाल्यावर, आमची टीम बँक डिटेल्स विचारण्यासाठी तुमच्याशी थेट संपर्क साधेल.'
                  : 'Once your minimum of 2 referred users successfully subscribe, our support team will reach out to you directly to safely collect your bank account details for direct deposit.'}
              </p>
            </div>
            <div style={{ borderBottom: '1px solid #F4F4F4', paddingBottom: '20px' }}>
              <h5 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: '#161616' }}>
                {isMarathi ? 'बक्षीस वारंवार (recurring) मिळते की एकवेळच?' : 'Is the reward recurring on subsequent renewals?'}
              </h5>
              <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6 }}>
                {isMarathi 
                  ? 'नाही. बक्षीस हे नवीन युझरच्या पहिल्या सबस्क्रिप्शन पेमेंटवर एकवेळ (one-time) ४०% मोजून दिले जाते. ते पुढील महिन्यांच्या किंवा वर्षांच्या नूतनीकरणाच्या वेळी पुन्हा दिले जात नाही.'
                  : 'No. The 40% reward is a one-time payment calculated and paid on the user\'s initial subscription payment. It does not repeat on renewals.'}
              </p>
            </div>
            <div style={{ borderBottom: '1px solid #F4F4F4', paddingBottom: '20px' }}>
              <h5 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: '#161616' }}>
                {isMarathi ? 'मी किती जणांना संदर्भित करू शकतो?' : 'Is there a limit on how many referrals I can make?'}
              </h5>
              <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6 }}>
                {isMarathi 
                  ? 'नाही, कोणतीही मर्यादा नाही! तुम्ही अमर्यादित डेअरी मालक, दूध संकलन केंद्र किंवा पुरवठादारांना संदर्भित करू शकता आणि प्रत्येक यशस्वी सबस्क्रिप्शनवर बक्षीस मिळवू शकता.'
                  : 'No, there is absolutely no limit. You can refer as many dairy vendors, owners, or operators as you like, and earn on each successful subscription.'}
              </p>
            </div>
            <div>
              <h5 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: '#161616' }}>
                {isMarathi ? 'या प्रचार मोहिमेत कोण भाग घेऊ शकते?' : 'Who can participate in this program?'}
              </h5>
              <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6 }}>
                {isMarathi 
                  ? 'कोणीही! तुम्ही स्वतः अम्रीत मॅनेज वापरत नसलात तरीही तुम्ही या मोहिमेत सहभागी होऊन इतर डेअरी व्यवसायांना अम्रीत मॅनेज सुचवून उत्पन्न मिळवू शकता.'
                  : 'Anyone can participate. You do not need to be an active user of Amrit Manage to refer others and earn rewards. If you know dairy owners or operators, you can refer them.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default PromotePage;
