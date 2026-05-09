/**
 * Daily Collection — /app/owner/collection
 * Owner logs today's total milk collected and assigns quotas to each staff member.
 * Staff cannot deliver more than their assigned quota.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Droplets, Save, RefreshCw, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';
import useThrottle from '../../hooks/useThrottle';
import { useMarathi } from '../../i18n/marathi';

const DailyCollection = () => {
  const toast = useToast();
  const { isMarathi } = useMarathi();
  const L = isMarathi ? 'ली.' : 'L';
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const [expandedId, setExpandedId] = useState(null);

  // Date navigation
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [collection, setCollection] = useState(null);
  const [staff, setStaff] = useState([]);
  const [deliveredByStaff, setDeliveredByStaff] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const showSkeleton = useDelayedLoading(loading);

  // Form state
  const [totalLiters, setTotalLiters] = useState('');
  const [source, setSource] = useState('');
  const [procurementRate, setProcurementRate] = useState('');
  const [notes, setNotes] = useState('');
  const [quotas, setQuotas] = useState({}); // { staffId: liters }

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/owner/collection?date=${date}`);
      setCollection(data.collection);
      setStaff(data.staff || []);
      setDeliveredByStaff(data.deliveredByStaff || {});

      // Populate form from existing collection
      if (data.collection) {
        setTotalLiters(data.collection.totalLiters?.toString() || '');
        setSource(data.collection.source || '');
        setProcurementRate(data.collection.procurementRate?.toString() || '');
        setNotes(data.collection.notes || '');
        const q = {};
        (data.collection.staffQuotas || []).forEach(sq => {
          q[sq.staffId] = sq.assignedLiters?.toString() || '';
        });
        setQuotas(q);
      } else {
        setTotalLiters('');
        setSource('');
        setProcurementRate('');
        setNotes('');
        setQuotas({});
      }
    } catch {
      toast.error('Failed to load collection data.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { fetchCollection(); }, [fetchCollection]);

  const throttledRefresh = useThrottle(fetchCollection);

  const totalAssigned = Object.values(quotas).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalL = parseFloat(totalLiters) || 0;
  const unallocated = Math.max(0, totalL - totalAssigned);
  const overAllocated = totalAssigned > totalL && totalL > 0;

  const handleSave = async () => {
    if (!totalLiters || parseFloat(totalLiters) < 0) {
      toast.error(isMarathi ? 'वैध एकूण लिटर मूल्य टाका.' : 'Enter a valid total liters value.');
      return;
    }
    if (overAllocated) {
      toast.error(isMarathi
        ? `कर्मचारी कोटा (${totalAssigned}${L}) एकूण संकलनापेक्षा (${totalL}${L}) जास्त आहे.`
        : `Staff quotas (${totalAssigned}L) exceed total collection (${totalL}L).`);
      return;
    }

    setSaving(true);
    try {
      const staffQuotas = staff
        .filter(s => quotas[s._id] && parseFloat(quotas[s._id]) > 0)
        .map(s => ({ staffId: s._id, assignedLiters: parseFloat(quotas[s._id]) }));

      await api.post('/owner/collection', {
        date,
        totalLiters: parseFloat(totalLiters),
        source: source.trim(),
        procurementRate: procurementRate ? parseFloat(procurementRate) : null,
        staffQuotas,
        notes: notes.trim()
      });

      toast.success(isMarathi ? 'दैनिक संकलन जतन केले.' : 'Daily collection saved.');
      fetchCollection();
    } catch (err) {
      toast.error(err.response?.data?.error || (isMarathi ? 'संकलन जतन करता आले नाही.' : 'Failed to save collection.'));
    } finally {
      setSaving(false);
    }
  };

  const shiftDate = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const isToday = date === new Date().toISOString().split('T')[0];
  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // Metrics
  const totalDeliveredToday = Object.values(deliveredByStaff).reduce((s, v) => s + v, 0);

  return (
    <div style={{ maxWidth: '100%' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isMarathi ? 'दैनिक संकलन' : 'Daily Collection'}</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            {isMarathi ? 'आजचे दूध संकलन नोंदवा आणि कर्मचारी कोटा नियुक्त करा' : "Log today's milk intake and assign staff delivery quotas"}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Date navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button className="date-nav-btn" onClick={() => shiftDate(-1)}>
            <ChevronLeft size={16} />
          </button>
          <div style={{
            padding: '8px 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #0F62FE',
            fontSize: '14px', fontWeight: 600, color: '#0F62FE', minWidth: '220px', textAlign: 'center'
          }}>
            {displayDate} {isToday && <span style={{ fontSize: '11px', color: '#24A148', marginLeft: '6px' }}>{isMarathi ? 'आज' : 'TODAY'}</span>}
          </div>
          <button className="date-nav-btn" onClick={() => shiftDate(1)} disabled={isToday}>
            <ChevronRight size={16} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={throttledRefresh} disabled={loading}>
            <RefreshCw size={13} />
          </button>
        </div>

        {showSkeleton ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {[0,1,2].map(i => (
              <div key={i} className="skeleton-card" style={{ height: '80px' }}>
                <div className="skeleton-row">
                  <div className="skeleton skeleton-line" style={{ width: '40%' }} />
                  <div className="skeleton skeleton-line-sm" style={{ width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : isMobile ? (
          /* ── Mobile single-column layout (no accordion) ── */
          <div style={{ maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Collection entry card */}
            <div className="card">
              <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Droplets size={16} color="#0F62FE" /> {isMarathi ? 'दूध संकलन नोंद' : 'Milk Collection Entry'}
              </h3>

              <div className="input-group">
                <label className="input-label">{isMarathi ? `एकूण दूध संकलन (${L}) *` : 'Total Milk Collected (Liters) *'}</label>
                <input
                  type="number" className="input" min="0" step="0.5"
                  placeholder={isMarathi ? 'उदा. ६०' : 'e.g. 60'}
                  value={totalLiters}
                  onChange={e => setTotalLiters(e.target.value)}
                  style={{ fontSize: '20px', fontWeight: 700, height: '52px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'स्रोत' : 'Source'}</label>
                  <input type="text" className="input" placeholder={isMarathi ? 'उदा. शर्मा फार्म' : 'e.g. Sharma Farm'}
                    value={source} onChange={e => setSource(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">{isMarathi ? `खरेदी दर (₹/${L})` : `Rate (₹/${L})`}</label>
                  <input type="number" className="input" min="0" step="0.5" placeholder={isMarathi ? 'उदा. ३५' : 'e.g. 35'}
                    value={procurementRate} onChange={e => setProcurementRate(e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{isMarathi ? 'नोंदी' : 'Notes'}</label>
                <input type="text" className="input" placeholder={isMarathi ? 'आजच्या संकलनाबद्दल नोंदी' : "Any notes about today's collection"}
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              {/* Summary metrics */}
              {totalL > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  <div className="stat-card" style={{ padding: '10px 12px' }}>
                    <div className="stat-label" style={{ fontSize: '10px' }}>{isMarathi ? 'एकूण' : 'Collected'}</div>
                    <div className="stat-value" style={{ fontSize: '18px', color: '#0F62FE' }}>{totalL}{L}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '10px 12px' }}>
                    <div className="stat-label" style={{ fontSize: '10px' }}>{isMarathi ? 'नियुक्त' : 'Assigned'}</div>
                    <div className="stat-value" style={{ fontSize: '18px', color: overAllocated ? '#DA1E28' : '#161616' }}>{totalAssigned.toFixed(1)}{L}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '10px 12px' }}>
                    <div className="stat-label" style={{ fontSize: '10px' }}>{isMarathi ? 'शिल्लक' : 'Remaining'}</div>
                    <div className="stat-value" style={{ fontSize: '18px', color: unallocated > 0 ? '#FF832B' : '#24A148' }}>{unallocated.toFixed(1)}{L}</div>
                  </div>
                </div>
              )}

              {overAllocated && (
                <div style={{ backgroundColor: '#FFF1F1', border: '1px solid #DA1E28', padding: '10px 12px', marginBottom: '12px', display: 'flex', gap: '8px', fontSize: '12px', color: '#DA1E28' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                  {isMarathi
                    ? `कर्मचारी कोटा (${totalAssigned.toFixed(1)}${L}) एकूण संकलनापेक्षा जास्त आहे.`
                    : `Staff quotas (${totalAssigned.toFixed(1)}L) exceed total collection (${totalL}L).`}
                </div>
              )}

              <button
                className="btn btn-primary btn-full"
                onClick={handleSave}
                disabled={saving || !totalLiters || overAllocated}
                style={{ height: '48px', fontSize: '15px' }}
              >
                {saving
                  ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {isMarathi ? 'जतन होत आहे...' : 'Saving...'}</>
                  : <><Save size={16} /> {isMarathi ? 'संकलन जतन करा' : 'Save Collection'}</>}
              </button>
            </div>

            {/* Staff quota card */}
            {staff.length > 0 && (
              <div className="card">
                <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>
                  {isMarathi ? 'कर्मचारी कोटा' : 'Staff Quotas'}
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {staff.map(s => {
                    const assigned = parseFloat(quotas[s._id] || 0);
                    const delivered = deliveredByStaff[s._id] || 0;
                    const pct = assigned > 0 ? Math.min(100, (delivered / assigned) * 100) : 0;
                    const overDelivered = delivered > assigned && assigned > 0;
                    return (
                      <div key={s._id} style={{ backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: assigned > 0 ? '8px' : 0 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.name}</div>
                            <div style={{ fontSize: '11px', color: '#8D8D8D' }}>{s.phone}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number" min="0" step="0.5"
                              placeholder="0"
                              value={quotas[s._id] || ''}
                              onChange={e => setQuotas(prev => ({ ...prev, [s._id]: e.target.value }))}
                              style={{
                                width: '72px', height: '40px', padding: '0 8px',
                                border: '1px solid #8D8D8D', fontSize: '16px', fontWeight: 700,
                                textAlign: 'center', fontFamily: 'inherit',
                                backgroundColor: '#FFFFFF', outline: 'none',
                              }}
                            />
                            <span style={{ fontSize: '13px', color: '#525252' }}>{L}</span>
                          </div>
                        </div>
                        {assigned > 0 && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#525252', marginBottom: '4px' }}>
                              <span>{isMarathi ? 'वितरित' : 'Delivered'}: <strong>{delivered.toFixed(1)}{L}</strong></span>
                              <span style={{ color: overDelivered ? '#DA1E28' : '#525252' }}>
                                {isMarathi ? 'कोटा' : 'Quota'}: {assigned.toFixed(1)}{L}
                              </span>
                            </div>
                            <div style={{ height: '5px', backgroundColor: '#E0E0E0', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${pct}%`,
                                backgroundColor: overDelivered ? '#DA1E28' : pct >= 100 ? '#24A148' : '#0F62FE',
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                            {pct >= 100 && (
                              <div style={{ fontSize: '11px', color: '#24A148', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={10} /> {isMarathi ? 'कोटा पूर्ण' : 'Quota fulfilled'}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {totalDeliveredToday > 0 && (
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#DEFBE6', border: '1px solid #24A148' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0E6027', marginBottom: '2px' }}>
                      {isMarathi ? 'आज एकूण वितरित' : 'Total Delivered Today'}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#0E6027' }}>
                      {totalDeliveredToday.toFixed(1)}{L}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── Desktop two-column layout ── */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="collection-grid">

            {/* Left — Collection entry */}
            <div>
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Droplets size={18} color="#0F62FE" /> {isMarathi ? 'दूध संकलन नोंद' : 'Milk Collection Entry'}
                </h3>

                <div className="input-group">
                  <label className="input-label">{isMarathi ? `आजचे एकूण दूध संकलन (${L}) *` : 'Total Milk Collected Today (Liters) *'}</label>
                  <input
                    type="number" className="input" min="0" step="0.5"
                    placeholder={isMarathi ? 'उदा. ६०' : 'e.g. 60'}
                    value={totalLiters}
                    onChange={e => setTotalLiters(e.target.value)}
                    style={{ fontSize: '20px', fontWeight: 700, height: '52px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '4px' }}>
                    {isMarathi ? 'आज तुम्ही पुरवठादाराकडून किती दूध घेतले.' : 'This is the total milk you procured/collected today from your supplier.'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">{isMarathi ? 'स्रोत / पुरवठादार' : 'Source / Supplier'}</label>
                    <input type="text" className="input" placeholder={isMarathi ? 'उदा. शर्मा फार्म' : 'e.g. Sharma Farm'}
                      value={source} onChange={e => setSource(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">{isMarathi ? `खरेदी दर (₹/${L})` : 'Procurement Rate (₹/L)'}</label>
                    <input type="number" className="input" min="0" step="0.5" placeholder={isMarathi ? 'उदा. ३५' : 'e.g. 35'}
                      value={procurementRate} onChange={e => setProcurementRate(e.target.value)} />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'नोंदी' : 'Notes'}</label>
                  <input type="text" className="input" placeholder={isMarathi ? 'आजच्या संकलनाबद्दल नोंदी' : "Any notes about today's collection"}
                    value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>

              {/* Summary metrics */}
              {totalL > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  <div className="stat-card">
                    <div className="stat-label">{isMarathi ? 'एकूण संकलन' : 'Total Collected'}</div>
                    <div className="stat-value" style={{ fontSize: '22px', color: '#0F62FE' }}>{totalL}{L}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">{isMarathi ? 'कर्मचाऱ्यांना नियुक्त' : 'Assigned to Staff'}</div>
                    <div className="stat-value" style={{ fontSize: '22px', color: overAllocated ? '#DA1E28' : '#161616' }}>
                      {totalAssigned.toFixed(1)}{L}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">{isMarathi ? 'शिल्लक' : 'Unallocated'}</div>
                    <div className="stat-value" style={{ fontSize: '22px', color: unallocated > 0 ? '#FF832B' : '#24A148' }}>
                      {unallocated.toFixed(1)}{L}
                    </div>
                  </div>
                </div>
              )}

              {overAllocated && (
                <div style={{ backgroundColor: '#FFF1F1', border: '1px solid #DA1E28', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '8px', fontSize: '13px', color: '#DA1E28' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                  {isMarathi
                    ? `कर्मचारी कोटा (${totalAssigned.toFixed(1)}${L}) एकूण संकलनापेक्षा (${totalL}${L}) जास्त आहे.`
                    : `Staff quotas (${totalAssigned.toFixed(1)}L) exceed total collection (${totalL}L). Reduce quotas before saving.`}
                </div>
              )}

              <button
                className="btn btn-primary btn-full"
                onClick={handleSave}
                disabled={saving || !totalLiters || overAllocated}
                style={{ height: '48px', fontSize: '15px' }}
              >
                {saving
                  ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {isMarathi ? 'जतन होत आहे...' : 'Saving...'}</>
                  : <><Save size={16} /> {isMarathi ? 'संकलन जतन करा' : 'Save Collection'}</>}
              </button>
            </div>

            {/* Right — Staff quota assignment */}
            <div>
              <div className="card">
                <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>{isMarathi ? 'कर्मचारी कोटा नियुक्ती' : 'Staff Quota Assignment'}</h3>
                <p style={{ fontSize: '13px', color: '#525252', marginBottom: '20px' }}>
                  {isMarathi
                    ? 'प्रत्येक कर्मचाऱ्याला किती लिटर वितरण करता येईल ते नियुक्त करा.'
                    : 'Assign how many liters each staff member can deliver today. Staff cannot exceed their quota.'}
                </p>

                {staff.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px 0' }}>
                    <h3>{isMarathi ? 'कर्मचारी नाहीत' : 'No staff members'}</h3>
                    <p>{isMarathi ? 'कोटा नियुक्त करण्यासाठी कर्मचारी जोडा.' : 'Add staff from the Staff page to assign quotas.'}</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {staff.map(s => {
                      const assigned = parseFloat(quotas[s._id] || 0);
                      const delivered = deliveredByStaff[s._id] || 0;
                      const pct = assigned > 0 ? Math.min(100, (delivered / assigned) * 100) : 0;
                      const overDelivered = delivered > assigned && assigned > 0;

                      return (
                        <div key={s._id} style={{ backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.name}</div>
                              <div style={{ fontSize: '12px', color: '#8D8D8D' }}>{s.phone}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="number" min="0" step="0.5"
                                placeholder="0"
                                value={quotas[s._id] || ''}
                                onChange={e => setQuotas(prev => ({ ...prev, [s._id]: e.target.value }))}
                                style={{
                                  width: '80px', height: '36px', padding: '0 10px',
                                  border: '1px solid #8D8D8D', fontSize: '14px', fontWeight: 700,
                                  textAlign: 'center', fontFamily: 'inherit',
                                  backgroundColor: '#FFFFFF', outline: 'none'
                                }}
                              />
                              <span style={{ fontSize: '13px', color: '#525252' }}>{L}</span>
                            </div>
                          </div>

                          {/* Delivery progress */}
                          {assigned > 0 && (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#525252', marginBottom: '4px' }}>
                                <span>{isMarathi ? 'वितरित' : 'Delivered'}: <strong>{delivered.toFixed(1)}{L}</strong></span>
                                <span style={{ color: overDelivered ? '#DA1E28' : '#525252' }}>
                                  {isMarathi ? 'कोटा' : 'Quota'}: {assigned.toFixed(1)}{L}
                                </span>
                              </div>
                              <div style={{ height: '6px', backgroundColor: '#E0E0E0', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  backgroundColor: overDelivered ? '#DA1E28' : pct >= 100 ? '#24A148' : '#0F62FE',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              {pct >= 100 && (
                                <div style={{ fontSize: '11px', color: '#24A148', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircle size={11} /> {isMarathi ? 'कोटा पूर्ण' : 'Quota fulfilled'}
                                </div>
                              )}
                            </>
                          )}
                          {!assigned && delivered > 0 && (
                            <div style={{ fontSize: '12px', color: '#8D8D8D', marginTop: '4px' }}>
                              {isMarathi ? `${delivered.toFixed(1)}${L} वितरित (कोटा नाही)` : `Delivered ${delivered.toFixed(1)}L (no quota set)`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Today's delivery summary */}
                {totalDeliveredToday > 0 && (
                  <div style={{ marginTop: '20px', padding: '12px 16px', backgroundColor: '#DEFBE6', border: '1px solid #24A148' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0E6027', marginBottom: '4px' }}>
                      {isMarathi ? 'आज एकूण वितरित' : 'Total Delivered Today'}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#0E6027' }}>
                      {totalDeliveredToday.toFixed(1)}{L}
                    </div>
                    {totalL > 0 && (
                      <div style={{ fontSize: '12px', color: '#525252', marginTop: '2px' }}>
                        {isMarathi
                          ? `${totalL}${L} संकलनापैकी (${((totalDeliveredToday / totalL) * 100).toFixed(0)}% वितरित)`
                          : `of ${totalL}L collected (${((totalDeliveredToday / totalL) * 100).toFixed(0)}% distributed)`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyCollection;
