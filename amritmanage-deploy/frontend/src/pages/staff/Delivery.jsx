import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Plus, Minus, Search, Sun, Moon, RefreshCw, X, Send, WifiOff, Wifi, CloudUpload } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useOfflineSync from '../../hooks/useOfflineSync';
import { useMarathi } from '../../i18n/marathi';

// ── WhatsApp SVG icon (official green brand color) ────────────
const WhatsAppIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// ── Resolve template variables ────────────────────────────────
const resolveTemplate = (body, { customerName, quantity, extraQty, ownerPhone, slot, isMarathi }) => {
  const name = customerName?.trim() ? customerName.trim() : '';
  return body
    .replace(/{{customerName}}/g, name || '')
    .replace(/{{quantity}}/g, quantity ?? '')
    .replace(/{{extraQty}}/g, extraQty ?? '')
    .replace(/{{ownerPhone}}/g, ownerPhone || '')
    .replace(/{{slot}}/g, slot === 'morning' ? (isMarathi ? 'सकाळ' : 'Morning') : (isMarathi ? 'संध्याकाळ' : 'Evening'))
    .replace(/{{date}}/g, new Date().toLocaleDateString('en-IN'));
};

// ── WhatsApp message modal ────────────────────────────────────
const WhatsAppModal = ({ customer, deliveryLog, slot, ownerPhone, templates, onClose, onSend, isMarathi }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const toast = useToast();
  const L = isMarathi ? 'ली.' : 'L';

  // Determine delivery context
  const log = deliveryLog;
  const hasDelivery = !!log;
  const hasExtra = log?.extra_qty > 0;
  const qty = log?.delivered_qty ?? 0;
  const extraQty = log?.extra_qty ?? 0;

  // Auto-select best matching template
  useEffect(() => {
    if (!templates.length) return;
    let best = null;
    if (!hasDelivery) {
      best = templates.find(t => t.type === 'no_delivery' && t.isDefault)
          || templates.find(t => t.type === 'no_delivery');
    } else if (hasExtra) {
      best = templates.find(t => t.type === 'extra_delivery' && t.isDefault)
          || templates.find(t => t.type === 'extra_delivery');
    } else {
      best = templates.find(t => t.type === 'delivery' && t.isDefault)
          || templates.find(t => t.type === 'delivery');
    }
    if (!best) best = templates[0];
    if (best) {
      setSelectedTemplateId(best._id);
      setMessage(resolveTemplate(best.body, {
        customerName: customer.name,
        quantity: qty,
        extraQty,
        ownerPhone,
        slot,
        isMarathi
      }));
    }
  }, [templates]);

  const handleTemplateChange = (id) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find(t => t._id === id);
    if (tmpl) {
      setMessage(resolveTemplate(tmpl.body, {
        customerName: customer.name,
        quantity: qty,
        extraQty,
        ownerPhone,
        slot,
        isMarathi
      }));
    }
  };

  const handleSend = async () => {
    if (!message.trim()) { toast.error(isMarathi ? 'संदेश रिकामा असू शकत नाही.' : 'Message cannot be empty.'); return; }
    setSending(true);
    try {
      await api.post('/staff/send-whatsapp', { customerId: customer._id, message: message.trim() });
      toast.success(isMarathi ? `${customer.name} ला संदेश पाठवला` : `Message sent to ${customer.name}`);
      onSend?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || (isMarathi ? 'संदेश पाठवता आला नाही.' : 'Failed to send message. Check WhatsApp connection.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#25D366' }}><WhatsAppIcon size={20} /></span>
            <h3 style={{ fontWeight: 700, fontSize: '16px' }}>{isMarathi ? 'WhatsApp संदेश पाठवा' : 'Send WhatsApp Message'}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Customer info + big liters display */}
        <div style={{ backgroundColor: '#F4F4F4', padding: '12px 14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{customer.name}</div>
              <div style={{ fontSize: '12px', color: '#525252', marginTop: '2px' }}>{customer.phone}</div>
              {customer.customerCode && (
                <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '1px' }}>#{customer.customerCode}</div>
              )}
            </div>
            {hasDelivery && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#24A148', lineHeight: 1 }}>
                  {qty}{L}
                </div>
                {hasExtra && (
                  <div style={{ fontSize: '12px', color: '#FF832B', fontWeight: 600, marginTop: '2px' }}>
                    +{extraQty}{L} {isMarathi ? 'अतिरिक्त' : 'extra'}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#525252', marginTop: '2px' }}>
                  {isMarathi ? 'वितरित' : 'delivered'}
                </div>
              </div>
            )}
            {!hasDelivery && (
              <div style={{ fontSize: '13px', color: '#8D8D8D', fontStyle: 'italic' }}>
                {isMarathi ? 'आज वितरण नाही' : 'No delivery today'}
              </div>
            )}
          </div>
        </div>

        {/* Template selector */}
        {templates.length > 0 && (
          <div className="input-group">
            <label className="input-label">{isMarathi ? 'टेम्पलेट निवडा' : 'Select Template'}</label>
            <select className="input" value={selectedTemplateId} onChange={e => handleTemplateChange(e.target.value)}>
              <option value="">{isMarathi ? '-- टेम्पलेट निवडा --' : '-- Choose a template --'}</option>
              {templates.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Message — read-only for staff, shows resolved template */}
        <div className="input-group">
          <label className="input-label">{isMarathi ? 'संदेश' : 'Message'}</label>
          <div style={{
            backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0',
            padding: '10px 12px', lineHeight: 1.6, fontSize: '14px',
            minHeight: '100px', whiteSpace: 'pre-wrap', color: '#161616',
            borderRadius: '2px'
          }}>
            {message || <span style={{ color: '#8D8D8D', fontStyle: 'italic' }}>{isMarathi ? 'टेम्पलेट निवडा...' : 'Select a template above...'}</span>}
          </div>
          <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '4px' }}>
            {isMarathi ? 'संदेश टेम्पलेटनुसार आपोआप तयार होतो.' : 'Message is auto-generated from the template.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ghost btn-full" onClick={onClose}>{isMarathi ? 'रद्द करा' : 'Cancel'}</button>
          <button
            className="btn btn-full"
            style={{ backgroundColor: '#25D366', color: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={handleSend}
            disabled={sending || !message.trim()}
          >
            {sending
              ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {isMarathi ? 'पाठवत आहे...' : 'Sending...'}</>
              : <><WhatsAppIcon size={16} /> {isMarathi ? 'WhatsApp वर पाठवा' : 'Send via WhatsApp'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Delivery page ────────────────────────────────────────
const Delivery = () => {
  const { user } = useAuth();
  const { isMarathi, t } = useMarathi();
  const [customers, setCustomers] = useState([]);
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSlot, setActiveSlot] = useState(() => {
    const hour = new Date().getHours();
    return hour < 13 ? 'morning' : 'evening';
  });
  const [delivering, setDelivering] = useState({});
  const [extraQty, setExtraQty] = useState({});
  const [templates, setTemplates] = useState([]);
  const [msgModal, setMsgModal] = useState(null);
  const [expandedAddress, setExpandedAddress] = useState({}); // track which customer's address is expanded
  const toast = useToast();
  const showSkeleton = useDelayedLoading(loading);
  const { isOnline, pendingCount, syncStatus, lastSyncResult, requestSync } = useOfflineSync();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/staff/today');
      setCustomers(data.customers);
      setQuota(data.quota || null);
    } catch {
      toast.error('Failed to load customer list.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data } = await api.get('/staff/message-templates');
      setTemplates(data.templates || []);
    } catch { /* templates optional */ }
  }, []);

  useEffect(() => {
    fetchToday();
    fetchTemplates();
  }, [fetchToday, fetchTemplates]);

  const handleDeliver = async (customer, slot) => {
    if (customer[slot]) return;
    const key = `${customer._id}_${slot}`;
    setDelivering(prev => ({ ...prev, [key]: true }));
    try {
      const extra = parseFloat(extraQty[key] || 0);
      const { data } = await api.post('/staff/deliver', { customerId: customer._id, slot, extra_qty: extra });
      const base = customer.base_requirement?.[slot] || 0;

      // Update UI optimistically — works for both online and offline (queued) responses
      setCustomers(prev => prev.map(c => {
        if (c._id !== customer._id) return c;
        return { ...c, [slot]: { delivered_qty: base + extra, extra_qty: extra, base_qty: base } };
      }));
      setExtraQty(prev => ({ ...prev, [key]: 0 }));

      if (data.offline) {
        // Saved to offline queue
        toast.info(`Saved offline — will sync when internet returns.`);
      } else {
        toast.success(`Delivered to ${customer.name}`);
        // Refresh quota after online delivery
        fetchToday();
      }
    } catch (err) {
      if (err.response?.data?.quotaExceeded) {
        toast.error(err.response.data.error);
      } else {
        toast.error(err.response?.data?.error || 'Failed to record delivery.');
      }
    } finally {
      setDelivering(prev => ({ ...prev, [key]: false }));
    }
  };

  const adjustExtra = (customerId, slot, delta) => {
    const key = `${customerId}_${slot}`;
    setExtraQty(prev => {
      const current = parseFloat(prev[key] || 0);
      return { ...prev, [key]: Math.max(0, +(current + delta).toFixed(1)) };
    });
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.customerCode && c.customerCode.toLowerCase().includes(search.toLowerCase()))
  );

  const deliveredCount = filtered.filter(c => !!c[activeSlot]).length;
  const slotPendingCount = filtered.length - deliveredCount;
  const morningDone = filtered.filter(c => !!c.morning).length;
  const eveningDone = filtered.filter(c => !!c.evening).length;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>

      {/* ── Offline / Sync status banner ─────────────────────── */}
      {!isOnline && (
        <div style={{
          backgroundColor: '#FFF8E1', border: '1px solid #F1C21B',
          padding: '10px 16px', marginBottom: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '10px', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#B28600' }}>
            <WifiOff size={15} />
            {isMarathi
              ? 'तुम्ही ऑफलाइन आहात — वितरण या डिव्हाइसवर जतन होईल आणि इंटरनेट आल्यावर आपोआप सिंक होईल.'
              : "You're offline — deliveries will be saved on this device and synced automatically when internet returns."}
          </div>
          {pendingCount > 0 && (
            <span style={{ fontSize: '12px', fontWeight: 700, backgroundColor: '#F1C21B', color: '#161616', padding: '2px 8px' }}>
              {pendingCount} {isMarathi ? 'प्रलंबित' : 'pending'}
            </span>
          )}
        </div>
      )}

      {isOnline && pendingCount > 0 && syncStatus !== 'done' && (
        <div style={{
          backgroundColor: '#EDF5FF', border: '1px solid rgba(15,98,254,0.3)',
          padding: '10px 16px', marginBottom: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '10px', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#0043CE' }}>
            <CloudUpload size={15} />
            {syncStatus === 'syncing'
              ? (isMarathi ? `${pendingCount} ऑफलाइन वितरण सिंक होत आहे...` : `Syncing ${pendingCount} offline delivery${pendingCount !== 1 ? 'ies' : 'y'}...`)
              : (isMarathi ? `${pendingCount} ऑफलाइन वितरण सिंक होण्याची प्रतीक्षा` : `${pendingCount} offline delivery${pendingCount !== 1 ? 'ies' : 'y'} waiting to sync`)}
          </div>
          {syncStatus !== 'syncing' && (
            <button
              onClick={requestSync}
              style={{
                fontSize: '12px', fontWeight: 700, backgroundColor: '#0F62FE', color: '#FFFFFF',
                border: 'none', padding: '4px 12px', cursor: 'pointer'
              }}
            >
              {isMarathi ? 'आत्ता सिंक करा' : 'Sync Now'}
            </button>
          )}
        </div>
      )}

      {syncStatus === 'done' && lastSyncResult && (
        <div style={{
          backgroundColor: '#DEFBE6', border: '1px solid #24A148',
          padding: '10px 16px', marginBottom: '12px',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '13px', fontWeight: 600, color: '#0E6027'
        }}>
          <Wifi size={15} />
          {isMarathi
            ? `${lastSyncResult.synced} वितरण यशस्वीरित्या सिंक झाले.`
            : `${lastSyncResult.synced} delivery${lastSyncResult.synced !== 1 ? 'ies' : 'y'} synced successfully.`}
        </div>
      )}

      {syncStatus === 'partial' && lastSyncResult && (
        <div style={{
          backgroundColor: '#FFF1F1', border: '1px solid #DA1E28',
          padding: '10px 16px', marginBottom: '12px',
          fontSize: '13px', fontWeight: 600, color: '#DA1E28'
        }}>
          {isMarathi
            ? `अंशतः सिंक: ${lastSyncResult.synced} सिंक झाले, ${lastSyncResult.failed} अयशस्वी. पुन्हा प्रयत्न होईल.`
            : `Sync partial: ${lastSyncResult.synced} synced, ${lastSyncResult.failed} failed. Will retry automatically.`}
        </div>
      )}
      {/* Header */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#8D8D8D', marginBottom: '12px' }}>{today}</div>

        {/* Quota banner */}
        {quota && (
          <div style={{
            backgroundColor: quota.remainingLiters <= 0 ? '#FFF1F1' : '#EDF5FF',
            border: `1px solid ${quota.remainingLiters <= 0 ? '#DA1E28' : '#0F62FE'}`,
            padding: '10px 14px', marginBottom: '14px', fontSize: '13px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ color: quota.remainingLiters <= 0 ? '#DA1E28' : '#0043CE', fontWeight: 600 }}>
              {quota.remainingLiters <= 0
                ? (isMarathi ? 'कोटा पूर्ण' : 'Quota reached')
                : `${quota.remainingLiters.toFixed(1)}${isMarathi ? 'ली.' : 'L'} ${isMarathi ? 'शिल्लक' : 'remaining'}`}
            </span>
            <span style={{ color: '#525252', fontSize: '12px' }}>
              {quota.deliveredLiters.toFixed(1)}{isMarathi ? 'ली.' : 'L'} / {quota.assignedLiters}{isMarathi ? 'ली.' : 'L'} {isMarathi ? 'कोटा' : 'quota'}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#FFF8E1', border: '1px solid #F1C21B', fontSize: '13px', fontWeight: 600, color: '#B28600' }}>
            <Sun size={14} /> {isMarathi ? 'सकाळ' : 'Morning'}: {morningDone}/{filtered.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#EDF5FF', border: '1px solid rgba(15,98,254,0.3)', fontSize: '13px', fontWeight: 600, color: '#0043CE' }}>
            <Moon size={14} /> {isMarathi ? 'संध्याकाळ' : 'Evening'}: {eveningDone}/{filtered.length}
          </div>
        </div>

        <div style={{ marginBottom: '4px', fontSize: '11px', color: '#8D8D8D', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{isMarathi ? 'वेळ निवडा:' : 'Recording slot:'}</div>
        <div style={{ display: 'flex', border: '1px solid #E0E0E0', overflow: 'hidden' }}>
          {[{ value: 'morning', label: isMarathi ? 'सकाळ' : 'Morning', icon: Sun }, { value: 'evening', label: isMarathi ? 'संध्याकाळ' : 'Evening', icon: Moon }].map(s => (
            <button key={s.value} onClick={() => setActiveSlot(s.value)} style={{
              flex: 1, height: '44px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontSize: '14px', fontWeight: 700,
              backgroundColor: activeSlot === s.value ? '#161616' : '#FFFFFF',
              color: activeSlot === s.value ? '#FFFFFF' : '#525252',
              transition: 'all 0.15s'
            }}>
              <s.icon size={15} /> {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
          <span style={{ color: '#525252' }}>
            <strong style={{ color: '#24A148' }}>{deliveredCount}</strong> {isMarathi ? 'झाले' : 'done'} ·{' '}
            <strong style={{ color: '#DA1E28' }}>{slotPendingCount}</strong> {isMarathi ? 'बाकी' : 'pending'}
          </span>
          <span style={{ color: '#8D8D8D' }}>{filtered.length} {isMarathi ? 'एकूण' : 'total'}</span>
        </div>
          <div style={{ height: '5px', backgroundColor: '#F4F4F4', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: filtered.length > 0 ? `${(deliveredCount / filtered.length) * 100}%` : '0%', backgroundColor: '#24A148', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Search + Refresh */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
          <input className="input" style={{ paddingLeft: '40px', height: '44px' }}
            placeholder={isMarathi ? 'नाव, फोन किंवा कोडने शोधा...' : 'Search by name, phone or code...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchToday} disabled={loading}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Customer list */}
      {showSkeleton ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} className="skeleton-card" style={{ minHeight: '100px' }}>
              <div className="skeleton-row">
                <div className="skeleton skeleton-line" style={{ width: '60%' }} />
                <div className="skeleton skeleton-line-sm" style={{ width: '40%' }} />
                <div className="skeleton skeleton-line-sm" style={{ width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : loading ? null : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>{isMarathi ? 'ग्राहक आढळले नाहीत' : 'No customers found'}</h3>
          <p>{isMarathi ? 'वेगळ्या शब्दाने शोधा.' : 'Try a different search term.'}</p>
        </div>
      ) : (
        <div>
          {filtered.map(customer => {
            const morningDelivered = !!customer.morning;
            const eveningDelivered = !!customer.evening;
            const activeDelivered = activeSlot === 'morning' ? morningDelivered : eveningDelivered;
            const activeKey = `${customer._id}_${activeSlot}`;
            const baseQty = customer.base_requirement?.[activeSlot] || 0;
            const extra = parseFloat(extraQty[activeKey] || 0);
            const totalQty = +(baseQty + extra).toFixed(1);
            const isLoading = delivering[activeKey];
            const activeLog = customer[activeSlot];

            return (
              <div key={customer._id} className={`delivery-card ${activeDelivered ? 'delivered' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>{customer.name}</div>
                    {customer.customerCode && (
                      <div style={{ fontSize: '11px', color: '#0F62FE', fontWeight: 600, marginTop: '1px' }}>#{customer.customerCode}</div>
                    )}
                    {/* Address — expandable on tap */}
                    {customer.address && (
                      <div style={{ marginTop: '4px' }}>
                        <button
                          onClick={() => setExpandedAddress(prev => ({ ...prev, [customer._id]: !prev[customer._id] }))}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '11px', fontWeight: 600, color: '#0F62FE',
                            padding: 0, display: 'flex', alignItems: 'center', gap: '3px'
                          }}
                        >
                          {expandedAddress[customer._id]
                            ? (isMarathi ? '▲ पत्ता लपवा' : '▲ Hide Address')
                            : (isMarathi ? '▼ पत्ता पाहा' : '▼ View Address')}
                        </button>
                        {expandedAddress[customer._id] && (
                          <div style={{
                            marginTop: '4px', fontSize: '12px', color: '#525252',
                            backgroundColor: '#F4F4F4', padding: '6px 10px',
                            borderLeft: '3px solid #0F62FE', lineHeight: 1.5
                          }}>
                            {customer.address}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', backgroundColor: morningDelivered ? '#DEFBE6' : '#F4F4F4', color: morningDelivered ? '#0E6027' : '#8D8D8D', border: `1px solid ${morningDelivered ? '#24A148' : '#E0E0E0'}` }}>
                      ☀ {morningDelivered ? `${customer.morning?.delivered_qty}${isMarathi ? 'ली.' : 'L'}` : `${customer.base_requirement?.morning || 0}${isMarathi ? 'ली.' : 'L'}`}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', backgroundColor: eveningDelivered ? '#EDF5FF' : '#F4F4F4', color: eveningDelivered ? '#0043CE' : '#8D8D8D', border: `1px solid ${eveningDelivered ? '#0F62FE' : '#E0E0E0'}` }}>
                      🌙 {eveningDelivered ? `${customer.evening?.delivered_qty}${isMarathi ? 'ली.' : 'L'}` : `${customer.base_requirement?.evening || 0}${isMarathi ? 'ली.' : 'L'}`}
                    </span>
                    {/* WhatsApp button */}
                    <button
                      title={isMarathi ? 'WhatsApp संदेश पाठवा' : 'Send WhatsApp message'}
                      onClick={() => setMsgModal({ customer, slot: activeSlot })}
                      style={{
                        background: 'none', border: '1px solid #25D366', cursor: 'pointer',
                        padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '4px',
                        color: '#25D366', fontSize: '12px', fontWeight: 600,
                        transition: 'background-color 0.1s'
                      }}
                      onMouseOver={e => { e.currentTarget.style.backgroundColor = '#DEFBE6'; }}
                      onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <WhatsAppIcon size={15} />
                    </button>
                  </div>
                </div>

                {activeDelivered ? (
                  <div style={{ backgroundColor: '#DEFBE6', padding: '10px 14px', fontSize: '14px', color: '#0E6027', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} />
                    {isMarathi
                      ? `${activeSlot === 'morning' ? 'सकाळ' : 'संध्याकाळ'} वितरित: ${activeLog?.delivered_qty}${isMarathi ? 'ली.' : 'L'}`
                      : `${activeSlot === 'morning' ? 'Morning' : 'Evening'} delivered: ${activeLog?.delivered_qty}L`}
                    {activeLog?.extra_qty > 0 && <span style={{ fontWeight: 400 }}>({activeLog?.base_qty}{isMarathi ? 'ली.' : 'L'} + {activeLog?.extra_qty}{isMarathi ? 'ली.' : 'L'} {isMarathi ? 'अतिरिक्त' : 'extra'})</span>}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '13px', color: '#525252', marginBottom: '10px' }}>
                      {activeSlot === 'morning' ? '☀ ' : '🌙 '}{isMarathi ? (activeSlot === 'morning' ? 'सकाळ' : 'संध्याकाळ') : (activeSlot === 'morning' ? 'Morning' : 'Evening')} {isMarathi ? 'मूळ' : 'base'}: <strong>{baseQty}{isMarathi ? 'ली.' : 'L'}</strong>
                      {extra > 0 && <span style={{ color: '#FF832B', marginLeft: '8px' }}>+ {extra}{isMarathi ? 'ली.' : 'L'} {isMarathi ? 'अतिरिक्त = ' : 'extra = '}<strong>{totalQty}{isMarathi ? 'ली.' : 'L'}</strong></span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#525252', fontWeight: 600 }}>{isMarathi ? 'अतिरिक्त:' : 'Extra:'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E0E0E0' }}>
                        <button onClick={() => adjustExtra(customer._id, activeSlot, -0.5)} style={{ width: '36px', height: '36px', border: 'none', cursor: 'pointer', backgroundColor: '#F4F4F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Minus size={13} />
                        </button>
                        <div style={{ width: '52px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', borderLeft: '1px solid #E0E0E0', borderRight: '1px solid #E0E0E0' }}>
                          {extra}{isMarathi ? 'ली.' : 'L'}
                        </div>
                        <button onClick={() => adjustExtra(customer._id, activeSlot, 0.5)} style={{ width: '36px', height: '36px', border: 'none', cursor: 'pointer', backgroundColor: '#F4F4F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    <button
                      className="btn btn-success btn-full"
                      style={{ height: '48px', fontSize: '15px' }}
                      onClick={() => handleDeliver(customer, activeSlot)}
                      disabled={isLoading || (baseQty === 0 && extra === 0) || (quota && quota.remainingLiters <= 0)}
                    >
                      {isLoading
                        ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Marking...</>
                        : <><CheckCircle size={16} /> {isMarathi ? `${activeSlot === 'morning' ? 'सकाळ' : 'संध्याकाळ'} नोंदवा (${totalQty}L)` : `Mark ${activeSlot === 'morning' ? 'Morning' : 'Evening'} (${totalQty}L)`}</>}
                    </button>
                    {quota && quota.remainingLiters > 0 && totalQty > quota.remainingLiters && (
                      <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '4px' }}>
                        {isMarathi
                          ? `हे वितरण (${totalQty}${isMarathi ? 'ली.' : 'L'}) तुमच्या शिल्लक कोट्यापेक्षा (${quota.remainingLiters.toFixed(1)}${isMarathi ? 'ली.' : 'L'}) जास्त आहे.`
                          : `This delivery (${totalQty}L) exceeds your remaining quota (${quota.remainingLiters.toFixed(1)}L).`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ height: '32px' }} />

      {/* WhatsApp message modal */}
      {msgModal && (
        <WhatsAppModal
          customer={msgModal.customer}
          deliveryLog={msgModal.customer[msgModal.slot]}
          slot={msgModal.slot}
          ownerPhone={ownerPhone}
          templates={templates}
          onClose={() => setMsgModal(null)}
          onSend={() => setMsgModal(null)}
          isMarathi={isMarathi}
        />
      )}
    </div>
  );
};

export default Delivery;
