import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquare, RefreshCw, Wifi, WifiOff, Send, X, Loader, BookOpen, CheckCircle, Lock, ArrowRight, Smartphone, Copy } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useMarathi } from '../../i18n/marathi';
import { useNavigate } from 'react-router-dom';
import useThrottle from '../../hooks/useThrottle';

// ── Resolve template variables ────────────────────────────────
const resolveTemplate = (body, { customerName, quantity, extraQty, ownerPhone, slot, customerLang, balance, grandTotal, totalPaid }) => {
  const isMr = customerLang === 'mr';
  const qtyStr = quantity !== undefined && quantity !== null ? `${quantity}${isMr ? ' लीटर' : ' L'}` : '';
  const extraStr = extraQty !== undefined && extraQty !== null ? `${extraQty}${isMr ? ' लीटर' : ' L'}` : '';

  const formatAmount = (amt) => {
    if (amt === undefined || amt === null) return '';
    return `₹${amt}`;
  };

  const slotStr = slot === 'morning' ? (isMr ? 'सकाळ' : 'Morning') : (isMr ? 'संध्याकाळ' : 'Evening');

  return body
    .replace(/{{customerName}}/g, customerName || '')
    .replace(/{{quantity}}/g, qtyStr)
    .replace(/{{extraQty}}/g, extraStr)
    .replace(/{{ownerPhone}}/g, ownerPhone || '')
    .replace(/{{slot}}/g, slotStr)
    .replace(/{{date}}/g, new Date().toLocaleDateString('en-IN'))
    .replace(/₹?{{balance}}/g, formatAmount(balance))
    .replace(/₹?{{grandTotal}}/g, formatAmount(grandTotal))
    .replace(/₹?{{totalPaid}}/g, formatAmount(totalPaid))
    .replace(/₹?{{amountDue}}/g, formatAmount(balance));
};

const WhatsApp = () => {
  const { user } = useAuth();
  const { isMarathi } = useMarathi();
  const navigate = useNavigate();
  const toast = useToast();

  const [status, setStatus] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('+91');

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('+91')) {
      const suffix = val.replace(/^\+?9?1?/, '').replace(/\D/g, '');
      setPhoneNumber('+91' + suffix);
    } else {
      const suffix = val.substring(3).replace(/\D/g, '');
      setPhoneNumber('+91' + suffix);
    }
  };
  const [pairingCode, setPairingCode] = useState(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const [templates, setTemplates] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [sendModal, setSendModal] = useState(null); // { log, template, message }

  const plan = user?.subscription?.plan || 'silver';
  const isTrial = user?.subscription?.status === 'trial';
  const hasWhatsApp = user?.features?.whatsapp_alerts || plan === 'gold' || plan === 'platinum' || isTrial;
  const hasCustomTemplates = user?.features?.custom_message_templates || plan === 'platinum' || isTrial;

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/whatsapp/status');
      setStatus(data.status);
      if (data.pairingCode) setPairingCode(data.pairingCode);
      if (data.phoneNumber) {
        setPhoneNumber(data.phoneNumber.startsWith('+') ? data.phoneNumber : '+' + data.phoneNumber);
      } else {
        setPhoneNumber('+91');
      }
    } catch {
      setStatus('disconnected');
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data } = await api.get('/owner/message-templates');
      setTemplates(data.templates || []);
    } catch { /* ignore */ }
  }, []);

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

  useEffect(() => {
    if (!hasWhatsApp) return;
    fetchStatus();
    fetchTemplates();
    fetchTodayLogs();

    // SSE connection for real-time status updates
    const token = localStorage.getItem('amrit_token');
    let eventSource = null;
    try {
      eventSource = new EventSource(`/api/whatsapp/status/stream?token=${encodeURIComponent(token || '')}`);
      eventSource.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.status) {
            setStatus(d.status);
            if (d.pairingCode) {
              setPairingCode(d.pairingCode);
            } else {
              setPairingCode(null);
            }
            if (d.phoneNumber) {
              setPhoneNumber(d.phoneNumber.startsWith('+') ? d.phoneNumber : '+' + d.phoneNumber);
            } else {
              setPhoneNumber('+91');
            }
          }
        } catch { /* ignore */ }
      };
      eventSource.onerror = () => { eventSource?.close(); };
    } catch { /* ignore */ }

    return () => { eventSource?.close(); };
  }, [fetchStatus, fetchTemplates, fetchTodayLogs, hasWhatsApp]);

  const handleRequestPairing = async (e) => {
    e.preventDefault();
    if (cooldown > 0) return;
    let submitPhone = phoneNumber.trim();
    if (!submitPhone || submitPhone === '+91') {
      setPairingError(isMarathi ? 'कृपया फोन नंबर प्रविष्ट करा.' : 'Please enter a phone number.');
      return;
    }
    // Clean any spaces/dashes/brackets
    const cleanDigits = submitPhone.replace(/[\s\-\(\)\+]/g, '');
    if (cleanDigits.length === 10) {
      submitPhone = '+91' + cleanDigits;
    } else if (!submitPhone.startsWith('+')) {
      submitPhone = '+' + submitPhone;
    }

    setPairingLoading(true);
    setPairingError(null);
    try {
      const { data } = await api.post('/whatsapp/request-pairing', { phoneNumber: submitPhone });
      if (data.success) {
        setStatus('pairing_requested');
        setCooldown(90);
        toast.success(isMarathi ? 'पेअरिंग विनंती सुरू झाली!' : 'Pairing request initiated!');
      }
    } catch (err) {
      setPairingError(err.response?.data?.error || (isMarathi ? 'कोड जनरेट करण्यात अयशस्वी.' : 'Failed to generate pairing code.'));
    } finally {
      setPairingLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;
    let submitPhone = phoneNumber.trim();
    if (!submitPhone || submitPhone === '+91') {
      setPairingError(isMarathi ? 'कृपया फोन नंबर प्रविष्ट करा.' : 'Please enter a phone number.');
      return;
    }
    const cleanDigits = submitPhone.replace(/[\s\-\(\)\+]/g, '');
    if (cleanDigits.length === 10) {
      submitPhone = '+91' + cleanDigits;
    } else if (!submitPhone.startsWith('+')) {
      submitPhone = '+' + submitPhone;
    }

    setPairingLoading(true);
    setPairingError(null);
    try {
      const { data } = await api.post('/whatsapp/request-pairing', { phoneNumber: submitPhone });
      if (data.success) {
        setStatus('pairing_requested');
        setCooldown(90);
        toast.success(isMarathi ? 'नवीन पेअरिंग कोड विनंती सुरू झाली!' : 'New pairing code request initiated!');
      }
    } catch (err) {
      setPairingError(err.response?.data?.error || (isMarathi ? 'नवीन कोड जनरेट करण्यात अयशस्वी.' : 'Failed to generate new code.'));
      toast.error(err.response?.data?.error || (isMarathi ? 'नवीन कोड जनरेट करण्यात अयशस्वी.' : 'Failed to generate new code.'));
    } finally {
      setPairingLoading(false);
    }
  };

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      await api.post('/whatsapp/disconnect');
      setStatus('disconnected');
      setPairingCode(null);
      setPhoneNumber('+91');
      toast.success(isMarathi ? 'WhatsApp डिस्कनेक्ट झाले.' : 'WhatsApp disconnected.');
    } catch {
      toast.error(isMarathi ? 'डिस्कनेक्ट करण्यात अयशस्वी.' : 'Failed to disconnect.');
    } finally {
      setDisconnecting(false);
      setPairingLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    toast.success(isMarathi ? 'कोड कॉपी केला!' : 'Code copied to clipboard!');
  };

  // Open send modal for a delivery log — auto-select best template
  const openSendModal = (log) => {
    const customerLang = log.customerId?.language || 'en';
    const hasExtra = log.extra_qty > 0;
    const requiredType = hasExtra ? 'extra_delivery' : 'delivery';
    
    let best = templates.find(t => t.type === requiredType && t.language === customerLang && t.isDefault) ||
               templates.find(t => t.type === requiredType && t.language === customerLang) ||
               templates.find(t => t.type === requiredType && t.isDefault) ||
               templates.find(t => t.type === requiredType);

    if (!best && templates.length > 0) {
      best = templates.find(t => t.language === customerLang) || templates[0];
    }

    const bodyToResolve = best?.body || (hasExtra 
      ? (customerLang === 'mr'
          ? "✅ *दूध वितरण* — {{date}}\nवेळ: *{{slot}}*\nप्रमाण: *{{quantity}}*\n(अतिरिक्त: *+{{extraQty}}*)\n— {{ownerPhone}}"
          : "✅ *Milk Delivered* — {{date}}\nSlot: *{{slot}}*\nQty: *{{quantity}}*\n(Extra: *+{{extraQty}}*)\n— {{ownerPhone}}")
      : (customerLang === 'mr'
          ? "✅ *दूध वितरण* — {{date}}\nवेळ: *{{slot}}*\nप्रमाण: *{{quantity}}*\n— {{ownerPhone}}"
          : "✅ *Milk Delivered* — {{date}}\nSlot: *{{slot}}*\nQty: *{{quantity}}*\n— {{ownerPhone}}")
    );

    const message = resolveTemplate(bodyToResolve, {
      customerName: log.customerId?.name || '',
      quantity: log.delivered_qty,
      extraQty: log.extra_qty,
      ownerPhone: user?.phone || '',
      slot: log.slot,
      customerLang
    });

    setSendModal({ log, template: best, message });
  };

  const sendMessage = async () => {
    if (!sendModal) return;
    const phone = sendModal.log.customerId?.phone;
    if (!phone) { toast.error(isMarathi ? 'ग्राहकाचा फोन नंबर उपलब्ध नाही.' : 'Customer phone not available.'); return; }
    
    if (!isConnected) {
      let clean = phone.replace(/\D/g, '');
      if (clean.length === 10)          clean = '91' + clean;
      else if (clean.startsWith('0'))   clean = '91' + clean.slice(1);
      
      const url = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(sendModal.message)}`;
      window.open(url, '_blank');
      
      try {
        await api.patch(`/owner/logs/${sendModal.log._id}`, { whatsappSent: true });
      } catch { /* ignore */ }
      
      toast.success(isMarathi ? `${sendModal.log.customerId?.name} साठी WhatsApp उघडले.` : `Opened WhatsApp for ${sendModal.log.customerId?.name}.`);
      setSendModal(null);
      fetchTodayLogs();
      return;
    }

    try {
      await api.post('/owner/send-whatsapp', {
        customerId: sendModal.log.customerId?._id,
        message: sendModal.message
      });
      toast.success(isMarathi ? `${sendModal.log.customerId?.name} ला संदेश पाठवला.` : `Message sent to ${sendModal.log.customerId?.name}.`);
      setSendModal(null);
      fetchTodayLogs();
    } catch (err) {
      toast.error(err.response?.data?.error || (isMarathi ? 'संदेश पाठवण्यात अयशस्वी.' : 'Failed to send message.'));
    }
  };

  const isConnected = status === 'authenticated';
  const isWaitingForAuth = status === 'pairing_requested' || pairingLoading;
  const isInitializing = status === 'pending' || pairingLoading;

  // ── Not on WhatsApp plan — show upgrade gate ──────────────
  if (!hasWhatsApp) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">{isMarathi ? 'WhatsApp एकत्रीकरण' : 'WhatsApp Integration'}</h1>
        </div>
        <div className="page-body">
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '48px 32px', textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
            <div style={{ width: 64, height: 64, backgroundColor: '#FFF8E1', border: '2px solid #D4AF37', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Lock size={28} color="#D4AF37" />
            </div>
            <h2 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>
              {isMarathi ? 'WhatsApp अलर्ट अमृत गोल्ड मध्ये उपलब्ध आहे' : 'WhatsApp Alerts available in Amrit Gold'}
            </h2>
            <p style={{ color: '#525252', fontSize: '14px', marginBottom: '28px', lineHeight: 1.6 }}>
              {isMarathi
                ? 'ग्राहकांना वितरण सूचना पाठवण्यासाठी अमृत गोल्ड किंवा प्लॅटिनम योजनेत अपग्रेड करा.'
                : 'Upgrade to Amrit Gold or Platinum to send delivery notifications to customers via WhatsApp.'}
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

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header">
        <h1 className="page-title">{isMarathi ? 'WhatsApp एकत्रीकरण' : 'WhatsApp Integration'}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={throttledRefreshLogs} disabled={loadingLogs}>
            <RefreshCw size={14} /> {isMarathi ? 'रिफ्रेश' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Connection status card */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: 48, height: 48, backgroundColor: isConnected ? '#DEFBE6' : isWaitingForAuth ? '#FFF8E1' : isInitializing ? '#EDF5FF' : '#F4F4F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isConnected ? (
                  <Wifi size={24} color="#24A148" />
                ) : isInitializing ? (
                  <Loader size={24} color="#0F62FE" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <WifiOff size={24} color="#8D8D8D" />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>
                  {isConnected ? (
                    isMarathi ? 'जोडलेले (Connected)' : 'Connected'
                  ) : isWaitingForAuth ? (
                    isMarathi ? 'अथॉरिटीची वाट पाहत आहे...' : 'Waiting for Authentication...'
                  ) : isInitializing ? (
                    isMarathi ? 'कोड जनरेट होत आहे...' : 'Generating pairing code...'
                  ) : (
                    isMarathi ? 'जोडलेले नाही' : 'Not Connected'
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#525252', marginTop: '2px' }}>
                  {isConnected ? (
                    isMarathi ? 'वितरण सूचना पाठवण्यास तयार.' : 'Ready to send delivery notifications.'
                  ) : isWaitingForAuth ? (
                    isMarathi ? 'कृपया तुमच्या फोनवर खालील पेअरिंग कोड प्रविष्ट करा.' : 'Please enter the pairing code on your phone.'
                  ) : (
                    isMarathi ? 'लिंक करण्यासाठी आंतरराष्ट्रीय फॉरमॅटमध्ये फोन नंबर प्रविष्ट करा.' : 'Enter phone number with country code to link.'
                  )}
                </div>
              </div>
            </div>
            {isConnected && (
              <button className="btn btn-danger btn-sm" onClick={disconnect} disabled={disconnecting}>
                <X size={13} /> {disconnecting ? (isMarathi ? 'डिस्कनेक्ट होत आहे...' : 'Disconnecting...') : (isMarathi ? 'डिस्कनेक्ट' : 'Disconnect')}
              </button>
            )}
            {isWaitingForAuth && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#DA1E28', borderColor: '#DA1E28' }}
                  onClick={disconnect}
                  disabled={disconnecting}
                >
                  <X size={13} /> {disconnecting ? (isMarathi ? 'रद्द होत आहे...' : 'Canceling...') : (isMarathi ? 'नंबर बदला / रद्द करा' : 'Re-enter / Cancel')}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleResendCode}
                  disabled={disconnecting || cooldown > 0}
                >
                  {pairingLoading ? (
                    <>
                      <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> {isMarathi ? 'लोड होत आहे...' : 'Loading...'}
                    </>
                  ) : cooldown > 0 ? (
                    isMarathi ? `${cooldown} सेकंद थांबा` : `Wait ${cooldown}s`
                  ) : (
                    isMarathi ? 'कोड पुन्हा पाठवा' : 'Resend Code'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pairing Flow Inputs */}
        {!isConnected && !isWaitingForAuth && (
          <div className="card" style={{ marginBottom: '20px', maxWidth: '520px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '16px' }}>
              {isMarathi ? 'फोन नंबरसह लिंक करा' : 'Link with Phone Number'}
            </h3>
            <form onSubmit={handleRequestPairing}>
              <div className="input-group">
                <label className="input-label">{isMarathi ? 'फोन नंबर (देश कोडसह, उदा. +91)' : 'Phone Number (with country code, e.g. +91)'}</label>
                <input
                  type="text"
                  className="input"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  disabled={isInitializing}
                />
              </div>

              {pairingError && (
                <div style={{ color: '#DA1E28', fontSize: '13px', marginBottom: '14px', fontWeight: 500 }}>
                  {pairingError}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isInitializing || cooldown > 0}>
                {isInitializing ? (
                  <>
                    <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> {isMarathi ? 'कोड लोड होत आहे...' : 'Generating pairing code...'}
                  </>
                ) : cooldown > 0 ? (
                  isMarathi ? `कृपया ${cooldown} सेकंद थांबा...` : `Please wait ${cooldown}s...`
                ) : (
                  <>
                    <Smartphone size={15} /> {isMarathi ? 'पेअरिंग कोड मिळवा' : 'Get Pairing Code'}
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Pairing Code Display & Step-by-Step Instructions */}
        {isWaitingForAuth && (
          <div className="card" style={{ marginBottom: '20px', maxWidth: '560px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '4px', fontSize: '16px', textAlign: 'center' }}>
              {isMarathi ? 'तुमचा व्हॉट्सॲप पेअरिंग कोड' : 'Your WhatsApp Pairing Code'}
            </h3>
            <p style={{ fontSize: '13px', color: '#525252', textAlign: 'center', marginBottom: '12px' }}>
              {isMarathi ? 'तुमचा फोन लिंक करण्यासाठी हा कोड प्रविष्ट करा' : 'Enter this code on your phone to link device'}
            </p>

            {pairingCode ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '16px',
                    backgroundColor: '#EDF5FF',
                    border: '1.5px dashed #0F62FE',
                    padding: '12px 24px',
                    borderRadius: '4px'
                  }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '32px',
                      fontWeight: 700,
                      letterSpacing: '4px',
                      color: '#0F62FE'
                    }}>
                      {pairingCode}
                    </span>
                    <button
                      onClick={copyToClipboard}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#0F62FE',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={isMarathi ? 'कोड कॉपी करा' : 'Copy code'}
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #E0E0E0', paddingTop: '20px' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: '#161616' }}>
                    {isMarathi ? 'लिंक कसे करावे:' : 'How to Link your Account:'}
                  </h4>
                  <ol style={{
                    fontSize: '14px',
                    lineHeight: 1.6,
                    paddingLeft: '20px',
                    color: '#525252',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <li>
                      {isMarathi ? (
                        <>तुमच्या फोनवर <strong>WhatsApp</strong> उघडा.</>
                      ) : (
                        <>Open <strong>WhatsApp</strong> on your phone.</>
                      )}
                    </li>
                    <li>
                      {isMarathi ? (
                        <>तळामध्ये <strong>Settings</strong> किंवा उजव्या कोपऱ्यात <strong>पर्याय (तीन ठिपके)</strong> वर टॅप करा.</>
                      ) : (
                        <>Go to <strong>Settings</strong> or tap <strong>More options (three dots)</strong>.</>
                      )}
                    </li>
                    <li>
                      {isMarathi ? (
                        <><strong>लिंक केलेली उपकरणे (Linked Devices)</strong> वर टॅप करा.</>
                      ) : (
                        <>Tap <strong>Linked Devices</strong>.</>
                      )}
                    </li>
                    <li>
                      {isMarathi ? (
                        <><strong>उपकरण लिंक करा (Link a Device)</strong> निवडा.</>
                      ) : (
                        <>Tap <strong>Link a Device</strong>.</>
                      )}
                    </li>
                    <li>
                      {isMarathi ? (
                        <>खाली दिलेला <strong>फोन नंबरसह लिंक करा (Link with phone number instead)</strong> पर्याय निवडा.</>
                      ) : (
                        <>Tap <strong>Link with phone number instead</strong> at the bottom of the screen.</>
                      )}
                    </li>
                    <li>
                      {isMarathi ? (
                        <>वर दिसणारा पेअरिंग कोड <strong>{pairingCode}</strong> तुमच्या फोनवर प्रविष्ट करा.</>
                      ) : (
                        <>Enter the pairing code <strong>{pairingCode}</strong> on your phone.</>
                      )}
                    </li>
                  </ol>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 0', borderTop: '1px solid #E0E0E0' }}>
                <Loader size={32} color="#0F62FE" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#161616' }}>
                  {isMarathi ? 'पेअरिंग कोड जनरेट होत आहे...' : 'Generating pairing code...'}
                </div>
                <div style={{ fontSize: '12px', color: '#525252', marginTop: '6px' }}>
                  {isMarathi ? 'कृपया काही सेकंद प्रतीक्षा करा, व्हॉट्सॲप सर्व्हरशी कनेक्ट करत आहे.' : 'Please wait a few seconds while we connect to WhatsApp servers.'}
                </div>
              </div>
            )}

            {pairingError && (
              <div style={{ color: '#DA1E28', fontSize: '13px', marginTop: '14px', fontWeight: 500, textAlign: 'center' }}>
                {pairingError}
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid #E0E0E0', paddingTop: '16px' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ flex: 1, minWidth: '150px' }}
                onClick={disconnect}
                disabled={disconnecting}
              >
                {isMarathi ? 'नंबर बदला / पुन्हा टाका' : 'Re-enter Phone Number'}
              </button>
              <button
                className="btn btn-primary btn-sm"
                style={{ flex: 1, minWidth: '150px' }}
                onClick={handleResendCode}
                disabled={disconnecting}
              >
                {pairingLoading ? (
                  <>
                    <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> {isMarathi ? 'लोड होत आहे...' : 'Loading...'}
                  </>
                ) : (
                  isMarathi ? 'कोड पुन्हा पाठवा' : 'Resend Code'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Today's deliveries — send messages */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '16px' }}>
                {isMarathi ? 'आजचे वितरण — संदेश पाठवा' : "Today's Deliveries — Send Messages"}
              </h3>
              <div style={{ fontSize: '12px', color: '#8D8D8D', marginTop: '2px' }}>
                {isMarathi ? 'वितरण झालेल्या ग्राहकांना थेट संदेश पाठवा' : 'Send messages directly to customers whose delivery was marked today'}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={throttledRefreshLogs} disabled={loadingLogs}>
              <RefreshCw size={13} />
            </button>
          </div>

          {loadingLogs ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#8D8D8D', fontSize: '13px' }}>
              {isMarathi ? 'लोड होत आहे...' : 'Loading...'}
            </div>
          ) : todayLogs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8D8D8D', fontSize: '13px' }}>
              {isMarathi ? 'आज कोणतेही वितरण नोंदवले नाही.' : 'No deliveries recorded today.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {todayLogs.map(log => (
                <div key={log._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', border: '1px solid #E0E0E0', backgroundColor: '#FAFAFA',
                  flexWrap: 'wrap', gap: '10px'
                }}>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{log.customerId?.name}</div>
                    <div style={{ fontSize: '12px', color: '#8D8D8D' }}>{log.customerId?.phone}</div>
                    <div style={{ fontSize: '12px', color: '#525252', marginTop: '2px' }}>
                      <span className={`badge ${log.slot === 'morning' ? 'badge-yellow' : 'badge-blue'}`} style={{ fontSize: '10px', marginRight: '6px' }}>
                        {log.slot === 'morning' ? (isMarathi ? '☀ सकाळ' : '☀ Morning') : (isMarathi ? '🌙 संध्याकाळ' : '🌙 Evening')}
                      </span>
                      {log.delivered_qty}{isMarathi ? 'ली.' : 'L'}
                      {log.extra_qty > 0 && <span style={{ color: '#FF832B', marginLeft: '4px' }}>+{log.extra_qty}{isMarathi ? 'ली.' : 'L'} {isMarathi ? 'अतिरिक्त' : 'extra'}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {log.whatsappSent ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#24A148', fontWeight: 600 }}>
                        <CheckCircle size={14} /> {isMarathi ? 'पाठवले' : 'Sent'}
                      </span>
                    ) : (
                      <button
                        className="btn btn-sm"
                        style={{ backgroundColor: isConnected ? '#25D366' : '#0F62FE', color: '#FFFFFF', border: 'none', fontSize: '12px' }}
                        onClick={() => openSendModal(log)}
                        title={isConnected ? (isMarathi ? 'स्वयंचलित पाठवा' : 'Automated Send') : (isMarathi ? 'थेट पाठवा (wa.me)' : 'Direct Send (wa.me)')}
                      >
                        <Send size={12} /> {isConnected ? (isMarathi ? 'पाठवा' : 'Send') : (isMarathi ? 'थेट पाठवा' : 'Direct Send')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upgrade gate for custom templates */}
          {!hasCustomTemplates && (
            <div style={{ marginTop: '16px', backgroundColor: '#FFF8E1', border: '1px solid #F1C21B', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#B28600' }}>
                <Lock size={14} />
                <span>
                  {isMarathi
                    ? 'कस्टम संदेश टेम्पलेट अमृत प्लॅटिनम मध्ये उपलब्ध आहे.'
                    : 'Custom message templates available in Amrit Platinum.'}
                </span>
              </div>
              <button
                className="btn btn-sm"
                style={{ backgroundColor: '#D4AF37', color: '#161616', border: 'none', fontWeight: 700, fontSize: '12px' }}
                onClick={() => navigate('/app/owner/upgrade', { state: { selectedPlan: 'platinum' } })}
              >
                {isMarathi ? 'प्लॅटिनममध्ये अपग्रेड करा' : 'Upgrade to Platinum'} <ArrowRight size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Message Templates (Platinum only) */}
        {hasCustomTemplates && templates.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BookOpen size={18} color="#0F62FE" />
              <h3 style={{ fontWeight: 700, fontSize: '16px' }}>
                {isMarathi ? 'संदेश टेम्पलेट' : 'Message Templates'}
              </h3>
              <span style={{ fontSize: '12px', color: '#8D8D8D' }}>({templates.length})</span>
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {templates.map(tmpl => (
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
                  </div>
                  <div style={{ fontSize: '12px', color: '#525252', fontFamily: 'monospace', backgroundColor: '#FFFFFF', padding: '8px 10px', border: '1px solid #E0E0E0' }}>
                    {tmpl.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Send confirmation modal */}
      {sendModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSendModal(null)}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '6px', fontSize: '18px' }}>
              {isMarathi ? 'संदेश पाठवण्यापूर्वी तपासा' : 'Review before sending'}
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

            {templates.length > 1 && (
              <div className="input-group">
                <label className="input-label">{isMarathi ? 'टेम्पलेट' : 'Template'}</label>
                <select className="input" value={sendModal.template?._id || ''} onChange={e => {
                  const tmpl = templates.find(t => t._id === e.target.value);
                  if (tmpl) {
                    const msg = resolveTemplate(tmpl.body, {
                      customerName: sendModal.log.customerId?.name || '',
                      quantity: sendModal.log.delivered_qty,
                      extraQty: sendModal.log.extra_qty,
                      ownerPhone: user?.phone || '',
                      slot: sendModal.log.slot,
                      customerLang: sendModal.log.customerId?.language || 'en'
                    });
                    setSendModal(prev => ({ ...prev, template: tmpl, message: msg }));
                  }
                }}>
                  {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">{isMarathi ? 'संदेश (संपादित करा)' : 'Message (editable)'}</label>
              <textarea
                className="input"
                rows={4}
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
                onClick={sendMessage}
                disabled={!sendModal.message.trim()}
              >
                <Send size={14} /> {isMarathi ? 'पाठवा' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default WhatsApp;
