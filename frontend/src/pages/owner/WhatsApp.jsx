import React, { useEffect, useState, useCallback } from 'react';
import { MessageSquare, RefreshCw, Send, CheckCircle, Lock, ArrowRight, User, Users, Smartphone, FileText, Check, Loader } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useMarathi } from '../../i18n/marathi';
import { useNavigate } from 'react-router-dom';
import useThrottle from '../../hooks/useThrottle';

// ── Default templates cache ──────────────────────────────────
const defaultTemplates = {
  customer: [
    {
      id: 'cust_delivery_mr',
      name: 'दैनिक दूध वितरण (मराठी)',
      language: 'mr',
      type: 'delivery',
      body: '✅ *दूध वितरण* — {{date}}\nप्रिय {{customerName}},\nआजचे प्रमाण: *{{quantity}}*\nवेळ: *{{slot}}*\nडेअरी मॅनेजमेंट निवडल्याबद्दल धन्यवाद!'
    },
    {
      id: 'cust_delivery_en',
      name: 'Daily Milk Delivery (English)',
      language: 'en',
      type: 'delivery',
      body: '✅ *Milk Delivered* — {{date}}\nDear {{customerName}},\nQuantity: *{{quantity}}*\nSlot: *{{slot}}*\nThank you for choosing Dairy Management!'
    },
    {
      id: 'cust_extra_mr',
      name: 'अतिरिक्त दूध वितरण (मराठी)',
      language: 'mr',
      type: 'extra_delivery',
      body: '✅ *दूध वितरण (अतिरिक्तसह)* — {{date}}\nप्रिय {{customerName}},\nमूळ प्रमाण: *{{quantity}}*\nअतिरिक्त प्रमाण: *{{extraQty}}*\nवेळ: *{{slot}}*\nधन्यवाद!'
    },
    {
      id: 'cust_extra_en',
      name: 'Extra Qty Delivery (English)',
      language: 'en',
      type: 'extra_delivery',
      body: '✅ *Milk Delivered (with Extra)* — {{date}}\nDear {{customerName}},\nBase Qty: *{{quantity}}*\nExtra Qty: *{{extraQty}}*\nSlot: *{{slot}}*\nThank you!'
    },
    {
      id: 'cust_payment_mr',
      name: 'थकीत पेमेंट आठवण (मराठी)',
      language: 'mr',
      type: 'payment_reminder',
      body: '⚠️ *पेमेंट आठवण* — {{date}}\nप्रिय {{customerName}},\nतुमची थकीत रक्कम *{{balance}}* आहे.\nकृपया लवकरच पेमेंट करावे. धन्यवाद!'
    },
    {
      id: 'cust_payment_en',
      name: 'Pending Payment Reminder (English)',
      language: 'en',
      type: 'payment_reminder',
      body: '⚠️ *Payment Reminder* — {{date}}\nDear {{customerName}},\nYour outstanding balance is *{{balance}}*.\nPlease pay at your earliest convenience. Thank you!'
    },
    {
      id: 'cust_confirm_mr',
      name: 'पेमेंट पावती सूचना (मराठी)',
      language: 'mr',
      type: 'payment_confirmation',
      body: '✅ *पेमेंट प्राप्त झाले* — {{date}}\nप्रिय {{customerName}},\nआम्हाला *{{totalPaid}}* मिळाले आहेत.\nतुमची उर्वरित रक्कम *{{balance}}* आहे.\nधन्यवाद!'
    },
    {
      id: 'cust_confirm_en',
      name: 'Payment Confirmation (English)',
      language: 'en',
      type: 'payment_confirmation',
      body: '✅ *Payment Received* — {{date}}\nDear {{customerName}},\nWe have received *{{totalPaid}}*.\nYour remaining balance is *{{balance}}*.\nThank you!'
    }
  ],
  farmer: [
    {
      id: 'farm_collection_mr',
      name: 'दैनिक दूध संकलन नोंद (मराठी)',
      language: 'mr',
      type: 'collection',
      body: '🥛 *दूध संकलन नोंद* — {{date}}\nप्रिय शेतकरी {{customerName}},\nवेळ: *{{slot}}*\nप्रमाण: *{{quantity}}*\nफॅट: *{{fat}}%* | एसएनएफ: *{{snf}}%*\nदर: *₹{{rate}}/ली.*\nएकूण रक्कम: *₹{{amount}}*\nधन्यवाद!'
    },
    {
      id: 'farm_collection_en',
      name: 'Daily Milk Collection (English)',
      language: 'en',
      type: 'collection',
      body: '🥛 *Milk Collection Entry* — {{date}}\nDear {{customerName}},\nShift: *{{slot}}*\nQuantity: *{{quantity}}*\nFat: *{{fat}}%* | SNF: *{{snf}}%*\nRate: *₹{{rate}}/L*\nTotal Amount: *₹{{amount}}*\nThank you!'
    },
    {
      id: 'farm_payment_mr',
      name: 'शेतकरी पेमेंट जमा सूचना (मराठी)',
      language: 'mr',
      type: 'payment_alert',
      body: '💸 *शेतकरी पेमेंट जमा* — {{date}}\nप्रिय शेतकरी {{customerName}},\nतुमच्या दुधाचे पेमेंट *₹{{totalPaid}}* बिलिंग सायकलसाठी जमा झाले आहे.\nउर्वरित रक्कम: *{{balance}}*.\nधन्यवाद, डेअरी मॅनेजमेंट!'
    },
    {
      id: 'farm_payment_en',
      name: 'Farmer Payment Alert (English)',
      language: 'en',
      type: 'payment_alert',
      body: '💸 *Farmer Payment Alert* — {{date}}\nDear {{customerName}},\nYour milk payment of *₹{{totalPaid}}* has been credited for the billing cycle.\nRemaining Balance: *{{balance}}*.\nThank you, Dairy Management!'
    },
    {
      id: 'farm_deduction_mr',
      name: 'ॲडव्हान्स किंवा पशुखाद्य कपात (मराठी)',
      language: 'mr',
      type: 'deduction',
      body: '🌾 *कपात सूचना* — {{date}}\nप्रिय शेतकरी {{customerName}},\nतुमच्या खात्यावर *₹{{amount}}* ची पशुखाद्य/ॲडव्हान्स कपात करण्यात आली आहे.\nकारण: *{{notes}}*\nउर्वरित शिल्लक: *{{balance}}*.'
    },
    {
      id: 'farm_deduction_en',
      name: 'Deduction Notification (English)',
      language: 'en',
      type: 'deduction',
      body: '🌾 *Deduction Notification* — {{date}}\nDear {{customerName}},\nAn advance/feed deduction of *₹{{amount}}* has been applied to your account.\nReason: *{{notes}}*\nUpdated Balance: *{{balance}}*.'
    },
    {
      id: 'farm_notice_mr',
      name: 'दूध संकलन वेळ बदल सूचना (मराठी)',
      language: 'mr',
      type: 'announcement',
      body: '📢 *शेतकरी सूचना* — {{date}}\nप्रिय शेतकरी बंधूंनो,\nउद्याचे दूध संकलन वेळ बदलून सकाळी *{{slot}}* वाजता असेल.\nकृपया वेळेवर ताजे दूध आणावे. धन्यवाद!'
    },
    {
      id: 'farm_notice_en',
      name: 'Farmer Collection Notice (English)',
      language: 'en',
      type: 'announcement',
      body: '📢 *Farmer Notice* — {{date}}\nDear Farmers,\nPlease note that tomorrow\'s milk collection timing will be shifted. Morning slot: *{{slot}}*.\nPlease bring fresh milk on time. Thank you!'
    }
  ]
};

// ── Resolve template variables ────────────────────────────────
const resolveTemplate = (body, variables) => {
  if (!body) return '';
  let res = body;
  Object.keys(variables).forEach(key => {
    const val = variables[key] !== undefined && variables[key] !== null ? variables[key] : '';
    const regex = new RegExp(`{{${key}}}`, 'g');
    res = res.replace(regex, val);
  });
  // fallback for undefined variables
  res = res
    .replace(/{{date}}/g, new Date().toLocaleDateString('en-IN'))
    .replace(/{{customerName}}/g, '')
    .replace(/{{quantity}}/g, '')
    .replace(/{{extraQty}}/g, '')
    .replace(/{{slot}}/g, '')
    .replace(/{{balance}}/g, '')
    .replace(/{{totalPaid}}/g, '')
    .replace(/{{grandTotal}}/g, '')
    .replace(/{{amountDue}}/g, '')
    .replace(/{{fat}}/g, '')
    .replace(/{{snf}}/g, '')
    .replace(/{{rate}}/g, '')
    .replace(/{{amount}}/g, '')
    .replace(/{{notes}}/g, '')
    .replace(/{{ownerPhone}}/g, '');
  return res;
};

// ── Format plain text with WhatsApp bold/italics markers to html ──
const formatWhatsAppMessage = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/~([^~]+)~/g, '<del>$1</del>')
    .replace(/\n/g, '<br />');
};

// Extract variables inside curly braces e.g. {{variable}}
const extractVariables = (body) => {
  if (!body) return [];
  const matches = body.match(/{{[a-zA-Z0-9_]+}}/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
};

const WhatsApp = () => {
  const { user } = useAuth();
  const { isMarathi } = useMarathi();
  const navigate = useNavigate();
  const toast = useToast();

  const isDairyOwner = user?.ownerRole === 'dairy_owner';

  // Tabs state
  const [activeTab, setActiveTab] = useState('deliveries'); // 'deliveries' | 'quick'
  
  // Quick message form states
  const [recipientType, setRecipientType] = useState('customer'); // 'customer' | 'farmer'
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState('');
  
  // Custom templates fetched from API
  const [customTemplates, setCustomTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplateBody, setSelectedTemplateBody] = useState('');
  
  // Variable values mapping
  const [variableValues, setVariableValues] = useState({});
  const [customPhoneNumber, setCustomPhoneNumber] = useState('');
  const [customRecipientName, setCustomRecipientName] = useState('');
  const [useCustomContact, setUseCustomContact] = useState(false);

  // Today's delivery logs list (Tab 1)
  const [todayLogs, setTodayLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [sendModal, setSendModal] = useState(null); // { log, template, message }

  const plan = user?.subscription?.plan || 'silver';
  const isTrial = user?.subscription?.status === 'trial';
  const hasWhatsApp = user?.features?.whatsapp_alerts || plan === 'gold' || plan === 'platinum' || isTrial;
  const hasCustomTemplates = user?.features?.custom_message_templates || plan === 'platinum' || isTrial;

  // Fetch list of message templates from server
  const fetchTemplates = useCallback(async () => {
    try {
      const { data } = await api.get('/owner/message-templates');
      setCustomTemplates(data.templates || []);
    } catch { /* ignore */ }
  }, []);

  // Fetch today's delivery logs
  const fetchTodayLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.get('/owner/logs', { params: { date: today } });
      setTodayLogs(data.logs || []);
    } catch { /* ignore */ }
    finally { setLoadingLogs(false); }
  }, []);

  const throttledRefreshLogs = useThrottle(fetchTodayLogs);

  // Fetch contacts list (customers or farmers)
  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      if (recipientType === 'customer') {
        const { data } = await api.get('/owner/customers', { params: { active: 'true', limit: 200 } });
        setContacts(data.customers || []);
      } else {
        const { data } = await api.get('/owner/farmers', { params: { active: 'true', limit: 200 } });
        setContacts(data.customers || []); // returns customers key
      }
    } catch {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, [recipientType]);

  useEffect(() => {
    if (!hasWhatsApp) return;
    fetchTemplates();
    fetchTodayLogs();
  }, [fetchTemplates, fetchTodayLogs, hasWhatsApp]);

  useEffect(() => {
    if (!hasWhatsApp) return;
    fetchContacts();
    setSelectedContactId('');
    setVariableValues({});
  }, [recipientType, fetchContacts, hasWhatsApp]);

  // Combine standard default templates + custom templates
  const getAvailableTemplates = () => {
    const list = [...(defaultTemplates[recipientType] || [])];
    customTemplates.forEach(t => {
      // map type from custom template to standard list
      if (t.type === 'custom' || (recipientType === 'customer' && ['delivery', 'extra_delivery', 'payment_reminder', 'monthly_bill'].includes(t.type))) {
        list.push({
          id: t._id,
          name: `${t.name} (Custom)`,
          language: t.language,
          body: t.body,
          isCustom: true
        });
      }
    });
    return list;
  };

  // Trigger when contact selection changes
  const handleContactChange = (e) => {
    const cid = e.target.value;
    setSelectedContactId(cid);
    if (!cid) return;

    const contact = contacts.find(c => c._id === cid);
    if (contact) {
      setVariableValues(prev => ({
        ...prev,
        customerName: contact.name || '',
        balance: contact.balance !== undefined ? `₹${Math.abs(contact.balance).toFixed(0)}` : '',
        ownerPhone: user?.phone || '',
        date: new Date().toLocaleDateString('en-IN')
      }));
    }
  };

  // Trigger when template changes
  const handleTemplateChange = (e) => {
    const tid = e.target.value;
    setSelectedTemplateId(tid);
    
    const all = getAvailableTemplates();
    const t = all.find(item => item.id === tid);
    if (t) {
      setSelectedTemplateBody(t.body);
      // Pre-populate missing fields
      const vars = extractVariables(t.body);
      const initial = { ...variableValues };
      vars.forEach(v => {
        if (initial[v] === undefined) {
          if (v === 'date') initial[v] = new Date().toLocaleDateString('en-IN');
          else if (v === 'ownerPhone') initial[v] = user?.phone || '';
          else if (v === 'slot') initial[v] = 'Morning';
          else initial[v] = '';
        }
      });
      setVariableValues(initial);
    } else {
      setSelectedTemplateBody('');
    }
  };

  // Direct WhatsApp click confirmation
  const triggerWhatsApp = (phone, text, logId = null) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10)          clean = '91' + clean;
    else if (clean.startsWith('0'))   clean = '91' + clean.slice(1);

    const url = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    if (logId) {
      // optimistic check updates in log lists
      api.patch(`/owner/logs/${logId}`, { whatsappSent: true }).then(() => {
        fetchTodayLogs();
      }).catch(() => {});
    }

    toast.success(isMarathi ? 'व्हॉट्सॲप उघडले गेले.' : 'Direct WhatsApp link opened.');
  };

  // Send from Quick Message tab
  const handleQuickSend = () => {
    let phone = '';
    let name = '';

    if (useCustomContact) {
      phone = customPhoneNumber.trim();
      name = customRecipientName.trim();
      if (!phone) {
        toast.error(isMarathi ? 'कृपया फोन नंबर प्रविष्ट करा.' : 'Please enter a phone number.');
        return;
      }
    } else {
      if (!selectedContactId) {
        toast.error(isMarathi ? 'कृपया एक संपर्क निवडा.' : 'Please select a contact.');
        return;
      }
      const contact = contacts.find(c => c._id === selectedContactId);
      phone = contact?.phone || '';
      name = contact?.name || '';
    }

    const resolved = resolveTemplate(selectedTemplateBody, {
      ...variableValues,
      customerName: name || variableValues.customerName
    });

    triggerWhatsApp(phone, resolved);
  };

  // Open delivery confirmation modal
  const openSendModal = (log) => {
    const customerLang = log.customerId?.language || 'en';
    const hasExtra = log.extra_qty > 0;
    const requiredType = hasExtra ? 'extra_delivery' : 'delivery';
    
    // Choose best template
    const all = [...(defaultTemplates.customer || [])];
    customTemplates.forEach(t => {
      if (t.type === requiredType) {
        all.push({
          id: t._id,
          name: `${t.name} (Custom)`,
          language: t.language,
          body: t.body
        });
      }
    });

    let best = all.find(t => t.type === requiredType && t.language === customerLang && t.isDefault) ||
               all.find(t => t.type === requiredType && t.language === customerLang) ||
               all.find(t => t.type === requiredType);

    if (!best && all.length > 0) {
      best = all.find(t => t.language === customerLang) || all[0];
    }

    const bodyToResolve = best?.body || (hasExtra 
      ? (customerLang === 'mr'
          ? "✅ *दूध वितरण* — {{date}}\nवेळ: *{{slot}}*\nप्रमाण: *{{quantity}}*\n(अतिरिक्त: *+{{extraQty}}*)\n— {{ownerPhone}}"
          : "✅ *Milk Delivered* — {{date}}\nSlot: *{{slot}}*\nQty: *{{quantity}}*\n(Extra: *+{{extraQty}}*)\n— {{ownerPhone}}")
      : (customerLang === 'mr'
          ? "✅ *दूध वितरण* — {{date}}\nवेळ: *{{slot}}*\nप्रमाण: *{{quantity}}*\n— {{ownerPhone}}"
          : "✅ *Milk Delivered* — {{date}}\nSlot: *{{slot}}*\nQty: *{{quantity}}*\n— {{ownerPhone}}")
    );

    const activeLang = best?.language || customerLang;
    const message = resolveTemplate(bodyToResolve, {
      customerName: log.customerId?.name || '',
      quantity: `${log.delivered_qty}${activeLang === 'mr' ? ' ली.' : ' L'}`,
      extraQty: log.extra_qty > 0 ? `${log.extra_qty}${activeLang === 'mr' ? ' ली.' : ' L'}` : '',
      ownerPhone: user?.phone || '',
      slot: log.slot === 'morning' ? (activeLang === 'mr' ? 'सकाळ' : 'Morning') : (activeLang === 'mr' ? 'संध्याकाळ' : 'Evening'),
      date: new Date().toLocaleDateString('en-IN')
    });

    setSendModal({ log, template: best, message, allMatchingTemplates: all.filter(t => t.type === requiredType || !t.type) });
  };

  // Render plan lock gate
  if (!hasWhatsApp) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">{isMarathi ? 'WhatsApp मेसेज' : 'WhatsApp Messaging'}</h1>
        </div>
        <div className="page-body">
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '48px 32px', textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
            <div style={{ width: 64, height: 64, backgroundColor: '#FFF8E1', border: '2px solid #D4AF37', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Lock size={28} color="#D4AF37" />
            </div>
            <h2 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>
              {isMarathi ? 'WhatsApp मेसेज गोल्ड मध्ये उपलब्ध आहे' : 'WhatsApp Alerts available in Gold'}
            </h2>
            <p style={{ color: '#525252', fontSize: '14px', marginBottom: '28px', lineHeight: 1.6 }}>
              {isMarathi
                ? 'ग्राहकांना आणि शेतकऱ्यांना थेट मेसेज पाठवण्यासाठी गोल्ड किंवा प्लॅटिनम योजनेत अपग्रेड करा.'
                : 'Upgrade to Gold or Platinum to send WhatsApp notifications and collection receipt alerts.'}
            </p>
            <button
              className="btn btn-primary"
              style={{ height: '48px', fontSize: '15px', minWidth: '220px' }}
              onClick={() => navigate('/app/owner/upgrade', { state: { selectedPlan: 'gold' } })}
            >
              <ArrowRight size={16} /> {isMarathi ? 'गोल्डमध्ये अपग्रेड करा' : 'Upgrade to Gold'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeTemplateBodyResolved = resolveTemplate(selectedTemplateBody, variableValues);

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isMarathi ? 'WhatsApp मेसेजिंग' : 'WhatsApp Messaging'}</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            {isMarathi ? 'थेट व्हॉट्सॲपवर ग्राहकांना किंवा शेतकऱ्यांना त्वरित अलर्ट पाठवा (क्लिक-टू-चॅट).' : 'Send click-to-chat WhatsApp notifications, bills, and alerts directly from your browser.'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E0E0E0', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('deliveries')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            color: activeTab === 'deliveries' ? '#0F62FE' : '#525252',
            borderBottom: activeTab === 'deliveries' ? '3px solid #0F62FE' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Smartphone size={16} />
          {isMarathi ? 'आजचे वितरण मेसेज' : "Today's Delivery Messages"}
        </button>
        <button
          onClick={() => setActiveTab('quick')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            color: activeTab === 'quick' ? '#0F62FE' : '#525252',
            borderBottom: activeTab === 'quick' ? '3px solid #0F62FE' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <MessageSquare size={16} />
          {isMarathi ? 'त्वरित संदेश (टेम्पलेट)' : 'Quick Message Utility'}
        </button>
      </div>

      <div className="page-body">
        {/* TAB 1: TODAY'S DELIVERIES */}
        {activeTab === 'deliveries' && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '16px' }}>
                  {isMarathi ? 'आजचे दूध वितरण' : "Today's Deliveries"}
                </h3>
                <div style={{ fontSize: '12px', color: '#8D8D8D', marginTop: '2px' }}>
                  {isMarathi ? 'ज्या ग्राहकांना आज दूध दिले आहे त्यांना थेट व्हॉट्सॲपवर पाठवा.' : 'Send direct click-to-chat alerts for today\'s marked deliveries.'}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={throttledRefreshLogs} disabled={loadingLogs}>
                <RefreshCw size={13} />
              </button>
            </div>

            {loadingLogs ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#8D8D8D' }}>
                <Loader size={24} className="spinner" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                {isMarathi ? 'लोड होत आहे...' : 'Loading deliveries...'}
              </div>
            ) : todayLogs.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#8D8D8D', border: '1px dashed #E0E0E0' }}>
                {isMarathi ? 'आज कोणतेही वितरण नोंदवले नाही.' : 'No delivery logs found for today.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {todayLogs.map(log => (
                  <div key={log._id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', border: '1px solid #E0E0E0', backgroundColor: '#FAFAFA',
                    flexWrap: 'wrap', gap: '12px'
                  }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#161616' }}>{log.customerId?.name}</div>
                      <div style={{ fontSize: '12px', color: '#525252', marginTop: '2px' }}>{log.customerId?.phone}</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                        <span className={`badge ${log.slot === 'morning' ? 'badge-yellow' : 'badge-blue'}`} style={{ fontSize: '10px' }}>
                          {log.slot === 'morning' ? (isMarathi ? '☀ सकाळ' : '☀ Morning') : (isMarathi ? '🌙 संध्याकाळ' : '🌙 Evening')}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#161616' }}>
                          {log.delivered_qty}{isMarathi ? ' ली.' : ' L'}
                        </span>
                        {log.extra_qty > 0 && (
                          <span style={{ fontSize: '11px', color: '#FF832B', fontWeight: 500 }}>
                            (+{log.extra_qty}{isMarathi ? ' ली. अतिरिक्त' : ' L extra'})
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {log.whatsappSent ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#24A148', fontWeight: 700, fontSize: '13px' }}>
                          <Check size={16} />
                          {isMarathi ? 'उघडले गेले' : 'Opened'}
                        </div>
                      ) : (
                        <button
                          className="btn btn-sm"
                          style={{ backgroundColor: '#25D366', color: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => openSendModal(log)}
                        >
                          <Send size={12} />
                          {isMarathi ? 'मेसेज पाठवा' : 'Send Alert'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUICK MESSAGE UTILITY */}
        {activeTab === 'quick' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* Form configuration */}
            <div className="card">
              <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '20px', borderBottom: '1px solid #E0E0E0', paddingBottom: '10px' }}>
                {isMarathi ? '१. मेसेज तपशील सेट करा' : '1. Configure Message'}
              </h3>

              {isDairyOwner && (
                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'प्राप्तकर्ता प्रकार' : 'Recipient Type'}</label>
                  <div style={{ display: 'flex', border: '1px solid #E0E0E0', overflow: 'hidden' }}>
                    <button
                      onClick={() => setRecipientType('customer')}
                      style={{
                        flex: 1, height: '40px', border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: '13px',
                        backgroundColor: recipientType === 'customer' ? '#161616' : '#FFFFFF',
                        color: recipientType === 'customer' ? '#FFFFFF' : '#525252'
                      }}
                    >
                      <User size={13} style={{ marginRight: '6px', display: 'inline' }} />
                      {isMarathi ? 'ग्राहक (दूध खरेदीदार)' : 'Customer (Buyer)'}
                    </button>
                    <button
                      onClick={() => setRecipientType('farmer')}
                      style={{
                        flex: 1, height: '40px', border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: '13px',
                        backgroundColor: recipientType === 'farmer' ? '#161616' : '#FFFFFF',
                        color: recipientType === 'farmer' ? '#FFFFFF' : '#525252'
                      }}
                    >
                      <Users size={13} style={{ marginRight: '6px', display: 'inline' }} />
                      {isMarathi ? 'शेतकरी (दूध उत्पादक)' : 'Farmer (Supplier)'}
                    </button>
                  </div>
                </div>
              )}

              {/* Contact choice toggle */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={!useCustomContact}
                    onChange={() => setUseCustomContact(false)}
                  />
                  {isMarathi ? 'नोंदणीकृत संपर्कांमधून निवडा' : 'Select Registered Contact'}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={useCustomContact}
                    onChange={() => setUseCustomContact(true)}
                  />
                  {isMarathi ? 'कस्टम नंबर टाका' : 'Enter Custom Number'}
                </label>
              </div>

              {!useCustomContact ? (
                <div className="input-group">
                  <label className="input-label">
                    {recipientType === 'customer' ? (isMarathi ? 'ग्राहक निवडा' : 'Select Customer') : (isMarathi ? 'शेतकरी निवडा' : 'Select Farmer')}
                  </label>
                  {loadingContacts ? (
                    <div style={{ fontSize: '13px', color: '#8D8D8D' }}>{isMarathi ? 'संपर्क लोड होत आहेत...' : 'Loading contacts...'}</div>
                  ) : (
                    <select className="input" value={selectedContactId} onChange={handleContactChange}>
                      <option value="">-- {isMarathi ? 'निवडा' : 'Choose Contact'} --</option>
                      {contacts.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.phone}) {c.customerCode ? `[#${c.customerCode}]` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">{isMarathi ? 'नाव' : 'Name'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder={isMarathi ? 'उदा. राहुल पाटील' : 'e.g. Rahul Patil'}
                      value={customRecipientName}
                      onChange={e => setCustomRecipientName(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">{isMarathi ? 'फोन नंबर' : 'Phone Number'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="+919876543210"
                      value={customPhoneNumber}
                      onChange={e => setCustomPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Template choice */}
              <div className="input-group">
                <label className="input-label">{isMarathi ? 'संदेश टेम्पलेट निवडा' : 'Select Message Template'}</label>
                <select className="input" value={selectedTemplateId} onChange={handleTemplateChange}>
                  <option value="">-- {isMarathi ? 'निवडा' : 'Choose Template'} --</option>
                  {getAvailableTemplates().map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Variable Fields Inputs dynamically generated */}
              {selectedTemplateId && extractVariables(selectedTemplateBody).length > 0 && (
                <div style={{
                  backgroundColor: '#F4F4F4',
                  padding: '16px',
                  borderLeft: '4px solid #0F62FE',
                  marginTop: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <h4 style={{ fontWeight: 700, fontSize: '13px', color: '#161616', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {isMarathi ? 'टेम्पलेट व्हेरियबल्स भरा:' : 'Fill Template Variables:'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {extractVariables(selectedTemplateBody).map(v => {
                      if (v === 'customerName' && !useCustomContact) return null; // autofilled from contact
                      return (
                        <div key={v} className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                            {v.replace(/([A-Z])/g, ' $1')}
                          </label>
                          <input
                            type="text"
                            className="input"
                            style={{ height: '36px', fontSize: '13px' }}
                            placeholder={`Value for ${v}`}
                            value={variableValues[v] || ''}
                            onChange={e => setVariableValues(prev => ({ ...prev, [v]: e.target.value }))}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Live WhatsApp chat bubble preview */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#efeae2', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}>
              <div>
                <div style={{
                  backgroundColor: '#075e54',
                  color: '#FFFFFF',
                  padding: '12px 16px',
                  margin: '-20px -20px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#128c7e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                    {useCustomContact ? (customRecipientName?.charAt(0)?.toUpperCase() || 'U') : (contacts.find(c => c._id === selectedContactId)?.name?.charAt(0)?.toUpperCase() || 'W')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                      {useCustomContact ? (customRecipientName || 'Custom Recipient') : (contacts.find(c => c._id === selectedContactId)?.name || 'Recipient Name')}
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>online</div>
                  </div>
                </div>

                {selectedTemplateId ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <div style={{
                      backgroundColor: '#dcf8c6',
                      padding: '10px 14px',
                      borderRadius: '8px 0px 8px 8px',
                      maxWidth: '85%',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      color: '#303030'
                    }}>
                      <div dangerouslySetInnerHTML={{ __html: formatWhatsAppMessage(activeTemplateBodyResolved) }} />
                      <div style={{ fontSize: '10px', color: '#7f8c8d', textAlign: 'right', marginTop: '4px' }}>
                        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#7f8c8d', fontSize: '13px', backgroundColor: 'rgba(255, 255, 255, 0.8)', margin: '20px 0', borderRadius: '8px' }}>
                    {isMarathi ? 'टेम्पलेट निवडा आणि मेसेज प्रिव्ह्यू येथे दिसेल.' : 'Select a message template above to view the formatted live preview.'}
                  </div>
                )}
              </div>

              {selectedTemplateId && (
                <button
                  className="btn btn-full"
                  style={{ backgroundColor: '#25D366', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: '15px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={handleQuickSend}
                >
                  <Send size={15} />
                  {isMarathi ? 'व्हॉट्सॲप उघडा' : 'Open WhatsApp to Send'}
                </button>
              )}
            </div>

          </div>
        )}
      </div>

      {/* DELIVERY SEND POPUP MODAL */}
      {sendModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSendModal(null)}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '6px', fontSize: '18px' }}>
              {isMarathi ? 'मेसेज पाठवण्यापूर्वी तपासा' : 'Review before sending'}
            </h2>
            <p style={{ color: '#525252', fontSize: '13px', marginBottom: '20px' }}>
              {isMarathi ? 'खालील संदेश' : 'The following message will be sent to'}{' '}
              <strong>{sendModal.log.customerId?.name}</strong>{' '}
              ({sendModal.log.customerId?.phone})
            </p>

            <div style={{ backgroundColor: '#F4F4F4', padding: '12px 16px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'वेळ: ' : 'Slot: '}</span><strong>{sendModal.log.slot === 'morning' ? (isMarathi ? 'सकाळ' : 'Morning') : (isMarathi ? 'संध्याकाळ' : 'Evening')}</strong></div>
                <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'प्रमाण: ' : 'Qty: '}</span><strong>{sendModal.log.delivered_qty}{isMarathi ? 'ली.' : 'L'}</strong></div>
                {sendModal.log.extra_qty > 0 && <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'अतिरिक्त: ' : 'Extra: '}</span><strong style={{ color: '#FF832B' }}>+{sendModal.log.extra_qty}{isMarathi ? 'ली.' : 'L'}</strong></div>}
              </div>
            </div>

            {sendModal.allMatchingTemplates?.length > 1 && (
              <div className="input-group">
                <label className="input-label">{isMarathi ? 'टेम्पलेट' : 'Template'}</label>
                <select className="input" value={sendModal.template?.id || ''} onChange={e => {
                  const tmpl = sendModal.allMatchingTemplates.find(t => t.id === e.target.value);
                  if (tmpl) {
                    const activeLang = tmpl.language || sendModal.log.customerId?.language || 'en';
                    const msg = resolveTemplate(tmpl.body, {
                      customerName: sendModal.log.customerId?.name || '',
                      quantity: `${sendModal.log.delivered_qty}${activeLang === 'mr' ? ' ली.' : ' L'}`,
                      extraQty: sendModal.log.extra_qty > 0 ? `${sendModal.log.extra_qty}${activeLang === 'mr' ? ' ली.' : ' L'}` : '',
                      ownerPhone: user?.phone || '',
                      slot: sendModal.log.slot === 'morning' ? (activeLang === 'mr' ? 'सकाळ' : 'Morning') : (activeLang === 'mr' ? 'संध्याकाळ' : 'Evening'),
                      date: new Date().toLocaleDateString('en-IN')
                    });
                    setSendModal(prev => ({ ...prev, template: tmpl, message: msg }));
                  }
                }}>
                  {sendModal.allMatchingTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">{isMarathi ? 'संदेश (संपादित करा)' : 'Message (editable)'}</label>
              <textarea
                className="input"
                rows={5}
                style={{ height: 'auto', resize: 'vertical', padding: '10px 12px', lineHeight: 1.6 }}
                value={sendModal.message}
                onChange={e => setSendModal(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn btn-ghost btn-full" onClick={() => setSendModal(null)}>
                {isMarathi ? 'रद्द करा' : 'Cancel'}
              </button>
              <button
                className="btn btn-full"
                style={{ backgroundColor: '#25D366', color: '#FFFFFF', border: 'none' }}
                onClick={() => {
                  triggerWhatsApp(sendModal.log.customerId?.phone, sendModal.message, sendModal.log._id);
                  setSendModal(null);
                }}
                disabled={!sendModal.message.trim()}
              >
                <Send size={14} /> {isMarathi ? 'पाठवा' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Templates Table for Management (Platinum only) */}
      {hasCustomTemplates && customTemplates.length > 0 && activeTab === 'quick' && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FileText size={18} color="#0F62FE" />
            <h3 style={{ fontWeight: 700, fontSize: '16px' }}>
              {isMarathi ? 'कस्टम संदेश टेम्पलेट' : 'Custom Message Templates'}
            </h3>
            <span style={{ fontSize: '12px', color: '#8D8D8D' }}>({customTemplates.length})</span>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            {customTemplates.map(tmpl => (
              <div key={tmpl._id} style={{ backgroundColor: '#F9F9F9', border: '1px solid #E0E0E0', padding: '12px 16px', borderLeft: '3px solid #25D366' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{tmpl.name}</span>
                    {tmpl.isDefault && (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', backgroundColor: '#DEFBE6', color: '#0E6027', textTransform: 'uppercase' }}>
                        {isMarathi ? 'डिफॉल्ट' : 'DEFAULT'}
                      </span>
                    )}
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: '10px' }}>{tmpl.language === 'mr' ? 'Marathi' : 'English'}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#525252', fontFamily: 'monospace', backgroundColor: '#FFFFFF', padding: '8px 10px', border: '1px solid #E0E0E0', whiteSpace: 'pre-wrap' }}>
                  {tmpl.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default WhatsApp;
