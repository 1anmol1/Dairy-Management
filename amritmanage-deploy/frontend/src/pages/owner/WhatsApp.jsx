import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquare, RefreshCw, Wifi, WifiOff, Send, X, Loader, BookOpen, CheckCircle, XCircle, Lock, ArrowRight } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useMarathi } from '../../i18n/marathi';
import { useNavigate } from 'react-router-dom';
import useThrottle from '../../hooks/useThrottle';

// ── Resolve template variables ────────────────────────────────
const resolveTemplate = (body, { customerName, quantity, extraQty, ownerPhone, slot, isMarathi }) => {
  return body
    .replace(/{{customerName}}/g, customerName || '')
    .replace(/{{quantity}}/g, quantity ?? '')
    .replace(/{{extraQty}}/g, extraQty ?? '')
    .replace(/{{ownerPhone}}/g, ownerPhone || '')
    .replace(/{{slot}}/g, slot === 'morning' ? (isMarathi ? 'सकाळ' : 'Morning') : (isMarathi ? 'संध्याकाळ' : 'Evening'))
    .replace(/{{date}}/g, new Date().toLocaleDateString('en-IN'));
};

const WhatsApp = () => {
  const { user } = useAuth();
  const { isMarathi } = useMarathi();
  const navigate = useNavigate();
  const toast = useToast();

  const [status, setStatus] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [sendModal, setSendModal] = useState(null); // { log, template, message }
  const pollRef = useRef(null);

  const hasWhatsApp = user?.features?.whatsapp_alerts;
  const hasCustomTemplates = user?.features?.custom_message_templates;

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/whatsapp/status');
      setStatus(data.status);
      if (data.status === 'connected') {
        setQrData(null);
        setLoadingQr(false);
        stopPolling();
      }
    } catch {
      setStatus('unavailable');
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

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const pollForQR = useCallback(() => {
    stopPolling();
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const { data } = await api.get('/whatsapp/qr');
        if (data.status === 'connected') {
          setStatus('connected'); setQrData(null); setLoadingQr(false); stopPolling();
          toast.success(isMarathi ? 'WhatsApp जोडले!' : 'WhatsApp connected!');
        } else if (data.qr) {
          setQrData(data.qr); setStatus('qr_ready'); setLoadingQr(false); stopPolling();
          startStatusPolling();
        } else if (attempts >= 30) {
          setLoadingQr(false); stopPolling();
          toast.error(isMarathi ? 'QR कोड लोड होण्यास वेळ लागला.' : 'QR code took too long.');
        }
      } catch { setLoadingQr(false); stopPolling(); }
    }, 2000);
  }, [isMarathi]);

  const startStatusPolling = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get('/whatsapp/status');
        setStatus(data.status);
        if (data.status === 'connected') {
          setQrData(null); clearInterval(interval);
          toast.success(isMarathi ? 'WhatsApp यशस्वीरित्या जोडले!' : 'WhatsApp connected successfully!');
        }
      } catch { /* ignore */ }
    }, 3000);
    return interval;
  }, [isMarathi]);

  useEffect(() => {
    if (!hasWhatsApp) return;
    fetchStatus();
    fetchTemplates();
    fetchTodayLogs();

    // Use SSE for real-time status — replaces polling entirely
    const token = localStorage.getItem('amrit_token');
    let eventSource = null;
    try {
      eventSource = new EventSource(`/api/whatsapp/status/stream?token=${encodeURIComponent(token || '')}`);
      eventSource.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.status) {
            setStatus(d.status);
            if (d.status === 'connected') { setQrData(null); setLoadingQr(false); stopPolling(); }
          }
        } catch { /* ignore */ }
      };
      eventSource.onerror = () => { eventSource?.close(); };
    } catch { /* SSE not supported — status already fetched above */ }

    return () => { eventSource?.close(); stopPolling(); };
  }, [fetchStatus, fetchTemplates, fetchTodayLogs, hasWhatsApp]);

  const loadQR = async () => {
    if (loadingQr) return;
    setLoadingQr(true); setQrData(null);
    try {
      const { data } = await api.get('/whatsapp/qr');
      if (data.status === 'connected') { setStatus('connected'); setLoadingQr(false); return; }
      if (data.qr) { setQrData(data.qr); setStatus('qr_ready'); setLoadingQr(false); startStatusPolling(); return; }
      setStatus('initializing'); pollForQR();
    } catch (err) {
      setLoadingQr(false);
      toast.error(err.response?.data?.error || (isMarathi ? 'WhatsApp सत्र सुरू करण्यात अयशस्वी.' : 'Failed to start WhatsApp session.'));
    }
  };

  const disconnect = async () => {
    setDisconnecting(true); stopPolling();
    try {
      await api.post('/whatsapp/disconnect');
      setStatus('disconnected'); setQrData(null);
      toast.success(isMarathi ? 'WhatsApp डिस्कनेक्ट झाले.' : 'WhatsApp disconnected.');
    } catch { toast.error(isMarathi ? 'डिस्कनेक्ट करण्यात अयशस्वी.' : 'Failed to disconnect.'); }
    finally { setDisconnecting(false); }
  };

  // Open send modal for a delivery log — auto-select best template
  const openSendModal = (log) => {
    const hasExtra = log.extra_qty > 0;
    let best = null;
    if (hasExtra) {
      best = templates.find(t => t.type === 'extra_delivery' && t.isDefault) || templates.find(t => t.type === 'extra_delivery');
    }
    if (!best) {
      best = templates.find(t => t.type === 'delivery' && t.isDefault) || templates.find(t => t.type === 'delivery');
    }
    if (!best && templates.length > 0) best = templates[0];

    const message = best ? resolveTemplate(best.body, {
      customerName: log.customerId?.name || '',
      quantity: log.delivered_qty,
      extraQty: log.extra_qty,
      ownerPhone: user?.phone || '',
      slot: log.slot,
      isMarathi
    }) : '';

    setSendModal({ log, template: best, message });
  };

  const sendMessage = async () => {
    if (!sendModal) return;
    const phone = sendModal.log.customerId?.phone;
    if (!phone) { toast.error(isMarathi ? 'ग्राहकाचा फोन नंबर उपलब्ध नाही.' : 'Customer phone not available.'); return; }
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

  const isConnected = status === 'connected';
  const isInitializing = loadingQr || status === 'initializing';

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
        {/* Connection status */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: 48, height: 48, backgroundColor: isConnected ? '#DEFBE6' : isInitializing ? '#EDF5FF' : '#F4F4F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isConnected ? <Wifi size={24} color="#24A148" /> : isInitializing ? <Loader size={24} color="#0F62FE" style={{ animation: 'spin 1s linear infinite' }} /> : <WifiOff size={24} color="#8D8D8D" />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>
                  {isConnected ? (isMarathi ? 'जोडलेले' : 'Connected') : isInitializing ? (isMarathi ? 'लोड होत आहे...' : 'Loading...') : status === 'qr_ready' ? (isMarathi ? 'QR स्कॅन करा' : 'Scan QR') : (isMarathi ? 'जोडलेले नाही' : 'Not Connected')}
                </div>
                <div style={{ fontSize: '13px', color: '#525252', marginTop: '2px' }}>
                  {isConnected ? (isMarathi ? 'वितरण सूचना पाठवण्यास तयार.' : 'Ready to send delivery notifications.') : (isMarathi ? 'WhatsApp लिंक करण्यासाठी QR कोड लोड करा.' : 'Load QR Code to link WhatsApp.')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {!isConnected && !isInitializing && (
                <button className="btn btn-primary" onClick={loadQR}>{isMarathi ? 'QR कोड लोड करा' : 'Load QR Code'}</button>
              )}
              {isInitializing && <button className="btn btn-ghost" disabled><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> {isMarathi ? 'लोड होत आहे...' : 'Loading...'}</button>}
              {isConnected && (
                <button className="btn btn-danger btn-sm" onClick={disconnect} disabled={disconnecting}>
                  <X size={13} /> {disconnecting ? (isMarathi ? 'डिस्कनेक्ट होत आहे...' : 'Disconnecting...') : (isMarathi ? 'डिस्कनेक्ट' : 'Disconnect')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* QR Code */}
        {qrData && !isConnected && (
          <div className="card" style={{ textAlign: 'center', maxWidth: '380px', margin: '0 auto 20px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>{isMarathi ? 'WhatsApp ने स्कॅन करा' : 'Scan with WhatsApp'}</h3>
            <p style={{ fontSize: '13px', color: '#525252', marginBottom: '16px' }}>
              {isMarathi ? 'WhatsApp → लिंक केलेली उपकरणे → उपकरण लिंक करा → स्कॅन करा' : 'WhatsApp → Linked Devices → Link a Device → Scan'}
            </p>
            <img src={qrData} alt="WhatsApp QR Code" style={{ width: '200px', height: '200px', maxWidth: '100%', border: '1px solid #E0E0E0' }} />
            <button className="btn btn-ghost btn-sm" style={{ marginTop: '12px' }} onClick={loadQR}>
              <RefreshCw size={13} /> {isMarathi ? 'QR रिफ्रेश करा' : 'Refresh QR'}
            </button>
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
                        style={{ backgroundColor: '#25D366', color: '#FFFFFF', border: 'none', fontSize: '12px' }}
                        onClick={() => openSendModal(log)}
                        disabled={!isConnected || templates.length === 0}
                        title={!isConnected ? (isMarathi ? 'WhatsApp जोडलेले नाही' : 'WhatsApp not connected') : templates.length === 0 ? (isMarathi ? 'टेम्पलेट नाही' : 'No templates') : ''}
                      >
                        <Send size={12} /> {isMarathi ? 'पाठवा' : 'Send'}
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

            {/* Delivery summary — no amount shown */}
            <div style={{ backgroundColor: '#F4F4F4', padding: '12px 16px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'वेळ: ' : 'Slot: '}</span><strong>{sendModal.log.slot === 'morning' ? (isMarathi ? 'सकाळ' : 'Morning') : (isMarathi ? 'संध्याकाळ' : 'Evening')}</strong></div>
                <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'प्रमाण: ' : 'Qty: '}</span><strong>{sendModal.log.delivered_qty}{isMarathi ? 'ली.' : 'L'}</strong></div>
                {sendModal.log.extra_qty > 0 && <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'अतिरिक्त: ' : 'Extra: '}</span><strong style={{ color: '#FF832B' }}>+{sendModal.log.extra_qty}{isMarathi ? 'ली.' : 'L'}</strong></div>}
              </div>
            </div>

            {/* Template selector */}
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
                      isMarathi
                    });
                    setSendModal(prev => ({ ...prev, template: tmpl, message: msg }));
                  }
                }}>
                  {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
            )}

            {/* Message preview + edit */}
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
