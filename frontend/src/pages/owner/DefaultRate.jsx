import React, { useState, useCallback, useEffect } from 'react';
import { Milk, TrendingUp, TrendingDown, Minus, Plus, History } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';
import { useMarathi } from '../../i18n/marathi';
import { getCache, setCache, invalidateCache } from '../../utils/cache';
import { useAuth } from '../../context/AuthContext';

const CACHE_KEY = 'owner/default-rate';

const DefaultRate = () => {
  const { user } = useAuth();
  const isDairyOwner = user?.ownerRole === 'dairy_owner';
  const [activeCategory, setActiveCategory] = useState(isDairyOwner ? 'farmers' : 'customers');
  const [history, setHistory] = useState(() => getCache(CACHE_KEY)?.history || []);
  const [current, setCurrent] = useState(() => getCache(CACHE_KEY)?.current || null);
  const [loading, setLoading] = useState(!getCache(CACHE_KEY));
  const [showSetModal, setShowSetModal] = useState(false);
  const toast = useToast();
  // No skeleton flash if we have cached data
  const showSkeleton = useDelayedLoading(loading && !getCache(CACHE_KEY), 800);
  const { isMarathi } = useMarathi();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  const fetchRate = useCallback(async (force = false) => {
    if (!force) {
      const cached = getCache(CACHE_KEY);
      if (cached) { setCurrent(cached.current); setHistory(cached.history); setLoading(false); return; }
    }
    setLoading(true);
    try {
      const { data } = await api.get('/owner/default-rate');
      setCache(CACHE_KEY, { current: data.current, history: data.history }, 5 * 60 * 1000);
      setCurrent(data.current);
      setHistory(data.history);
    } catch {
      toast.error('Failed to load default rate.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  React.useEffect(() => { fetchRate(); }, [fetchRate]);

  const prevRate = history.length > 1 ? history[1]?.rate : null;
  const change = current && prevRate ? current.rate - prevRate : null;

  return (
    <div style={{ maxWidth: '100%' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isDairyOwner
              ? (activeCategory === 'farmers'
                ? (isMarathi ? 'डिफॉल्ट खरेदी दर (सूत्र)' : 'Default Purchase Rates (Formula)')
                : (isMarathi ? 'डिफॉल्ट विक्री दर' : 'Default Customer Sales Rate'))
              : (isMarathi ? 'डिफॉल्ट दूध दर' : 'Default Milk Rate')}
          </h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            {isDairyOwner
              ? (activeCategory === 'farmers'
                ? (isMarathi ? 'गाय, म्हैस आणि मिश्रित दुधासाठी खरेदी दर मोजणीचे सूत्र सेट करा' : 'Configure pricing formulas for milk procured from farmers')
                : (isMarathi ? 'नवीन ग्राहकांसाठी डिफॉल्ट विक्री दर सेट करा' : 'Set the default sales rate applied to new buyers/customers'))
              : (isMarathi ? 'नवीन ग्राहकांसाठी डिफॉल्ट दर सेट करा' : 'Set the default rate applied to new customers')}
          </div>
        </div>
        {(!isDairyOwner || activeCategory === 'customers') && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowSetModal(true)}>
            <Plus size={16} /> {isMarathi ? 'नवीन दर सेट करा' : 'Set New Rate'}
          </button>
        )}
      </div>

      {isDairyOwner && (
        <div style={{ display: 'flex', borderBottom: '1px solid #E0E0E0', marginBottom: '24px', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveCategory('farmers')}
            style={{
              padding: '12px 20px',
              fontWeight: 600,
              fontSize: '15px',
              border: 'none',
              background: 'none',
              borderBottom: activeCategory === 'farmers' ? '3px solid #0F62FE' : 'none',
              color: activeCategory === 'farmers' ? '#0F62FE' : '#525252',
              cursor: 'pointer',
              transition: 'all 0.1s'
            }}
          >
            {isMarathi ? 'शेतकरी दर (खरेदी सूत्र)' : 'Farmers (Purchase Formula)'}
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('customers')}
            style={{
              padding: '12px 20px',
              fontWeight: 600,
              fontSize: '15px',
              border: 'none',
              background: 'none',
              borderBottom: activeCategory === 'customers' ? '3px solid #0F62FE' : 'none',
              color: activeCategory === 'customers' ? '#0F62FE' : '#525252',
              cursor: 'pointer',
              transition: 'all 0.1s'
            }}
          >
            {isMarathi ? 'ग्राहक दर (विक्री दर)' : 'Customers (Sales Rate)'}
          </button>
        </div>
      )}

      {isDairyOwner && activeCategory === 'farmers' ? (
        <div className="page-body">
          <DairyDefaultRateSection />
        </div>
      ) : (
        <>
          <div className="page-body">
        {/* Current rate card */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{isMarathi ? 'सध्याचा दर' : 'Current Rate'}</div>
                <div className="stat-value">
                  {loading ? '—' : current ? `₹${current.rate}/${isMarathi ? 'ली.' : 'L'}` : (isMarathi ? 'सेट नाही' : 'Not set')}
                </div>
                {current && (
                  <div className="stat-sub">
                    {isMarathi ? 'पासून' : 'Since'} {new Date(current.effectiveFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
              <div style={{ backgroundColor: '#0F62FE18', padding: '10px' }}>
                <Milk size={20} color="#0F62FE" />
              </div>
            </div>
          </div>

          {change !== null && (
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="stat-label">{isMarathi ? 'मागील दरापासून बदल' : 'Change from Previous'}</div>
                  <div className="stat-value" style={{ color: change > 0 ? '#24A148' : change < 0 ? '#DA1E28' : '#525252' }}>
                    {change > 0 ? `+₹${change.toFixed(2)}` : change < 0 ? `-₹${Math.abs(change).toFixed(2)}` : (isMarathi ? 'बदल नाही' : 'No change')}
                  </div>
                  <div className="stat-sub">{isMarathi ? 'मागील' : 'Previous'}: ₹{prevRate}/{isMarathi ? 'ली.' : 'L'}</div>
                </div>
                <div style={{ backgroundColor: change > 0 ? '#24A14818' : change < 0 ? '#DA1E2818' : '#52525218', padding: '10px' }}>
                  {change > 0 ? <TrendingUp size={20} color="#24A148" /> :
                   change < 0 ? <TrendingDown size={20} color="#DA1E28" /> :
                   <Minus size={20} color="#525252" />}
                </div>
              </div>
            </div>
          )}

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{isMarathi ? 'दर बदल' : 'Rate Changes'}</div>
                <div className="stat-value">{loading ? '—' : history.length}</div>
                <div className="stat-sub">{isMarathi ? 'एकूण बदल' : 'total adjustments'}</div>
              </div>
              <div style={{ backgroundColor: '#8A3FFC18', padding: '10px' }}>
                <History size={20} color="#8A3FFC" />
              </div>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div style={{
          backgroundColor: '#EDF5FF',
          border: '1px solid rgba(15,98,254,0.2)',
          padding: '14px 20px',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#0043CE'
        }}>
          <strong>{isMarathi ? 'कसे काम करते:' : 'How it works:'}</strong>{' '}
          {isMarathi
            ? 'नवीन ग्राहक जोडताना डिफॉल्ट दर वापरला जातो. विद्यमान ग्राहकांचे वैयक्तिक दर बदलत नाहीत.'
            : 'The default rate is applied when adding new customers. Existing customers keep their individual rates unless you update them manually.'}
        </div>

        {/* Rate history */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E0E0E0', fontWeight: 700, fontSize: '14px' }}>
            {isMarathi ? 'दर बदल इतिहास' : 'Rate Change History'}
          </div>

          {showSkeleton ? (
            <div style={{ padding: '16px' }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 2fr', gap: '12px', padding: '14px 0', borderBottom: i < 3 ? '1px solid #F4F4F4' : 'none' }}>
                  <div className="skeleton skeleton-line" style={{ width: '40%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '60%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '70%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '50%' }} />
                </div>
              ))}
            </div>
          ) : loading ? null : history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Milk size={40} /></div>
              <h3>{isMarathi ? 'अद्याप दर सेट नाही' : 'No rate set yet'}</h3>
              <p>{isMarathi ? 'पहिला डिफॉल्ट दर सेट करा.' : 'Set your first default milk rate to get started.'}</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowSetModal(true)}>
                <Plus size={14} /> {isMarathi ? 'दर सेट करा' : 'Set Rate'}
              </button>
            </div>
          ) : (
            isMobile ? (
              /* ── Mobile card list ── */
              <div style={{ padding: '8px 12px 12px' }}>
                {history.map((entry, idx) => {
                  const prevEntry = history[idx + 1];
                  const diff = prevEntry ? entry.rate - prevEntry.rate : null;
                  return (
                    <div key={entry._id} style={{
                      border: '1px solid #E0E0E0',
                      borderLeft: idx === 0 ? '4px solid #24A148' : '4px solid #E0E0E0',
                      backgroundColor: '#FFFFFF',
                      padding: '14px 16px',
                      marginBottom: '8px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '20px', color: '#161616' }}>
                            ₹{entry.rate}/{isMarathi ? 'ली.' : 'L'}
                          </span>
                          {diff !== null && (
                            <span style={{
                              fontSize: '12px', fontWeight: 600,
                              color: diff > 0 ? '#24A148' : diff < 0 ? '#DA1E28' : '#8D8D8D'
                            }}>
                              {diff > 0 ? `▲ +${diff.toFixed(2)}` : diff < 0 ? `▼ ${diff.toFixed(2)}` : '—'}
                            </span>
                          )}
                        </div>
                        {idx === 0 && (
                          <span className="badge badge-green" style={{ fontSize: '10px' }}>
                            {isMarathi ? 'सध्याचा' : 'CURRENT'}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: '#525252' }}>
                        <div>
                          <span style={{ color: '#8D8D8D' }}>{isMarathi ? 'प्रभावी: ' : 'Effective: '}</span>
                          {new Date(entry.effectiveFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div>
                          <span style={{ color: '#8D8D8D' }}>{isMarathi ? 'सेट: ' : 'Set on: '}</span>
                          {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        {entry.note && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ color: '#8D8D8D' }}>{isMarathi ? 'नोंद: ' : 'Note: '}</span>
                            {entry.note}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
              <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{isMarathi ? 'दर' : 'Rate'}</th>
                    <th>{isMarathi ? 'प्रभावी तारीख' : 'Effective From'}</th>
                    <th>{isMarathi ? 'नोंद' : 'Note'}</th>
                    <th>{isMarathi ? 'सेट केले' : 'Set On'}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, idx) => {
                    const prevEntry = history[idx + 1];
                    const diff = prevEntry ? entry.rate - prevEntry.rate : null;
                    return (
                      <tr key={entry._id}>
                        <td style={{ color: '#8D8D8D', fontSize: '13px' }}>
                          {idx === 0 && (
                            <span className="badge badge-green" style={{ fontSize: '10px', marginRight: '6px' }}>
                              {isMarathi ? 'सध्याचा' : 'CURRENT'}
                            </span>
                          )}
                          {history.length - idx}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '16px' }}>₹{entry.rate}/{isMarathi ? 'ली.' : 'L'}</span>
                            {diff !== null && (
                              <span style={{
                                fontSize: '11px', fontWeight: 600,
                                color: diff > 0 ? '#24A148' : diff < 0 ? '#DA1E28' : '#8D8D8D'
                              }}>
                                {diff > 0 ? `▲ +${diff.toFixed(2)}` : diff < 0 ? `▼ ${diff.toFixed(2)}` : '—'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {new Date(entry.effectiveFrom).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td style={{ color: '#525252', fontSize: '13px' }}>
                          {entry.note || <span style={{ color: '#C6C6C6' }}>—</span>}
                        </td>
                        <td style={{ fontSize: '13px', color: '#8D8D8D' }}>
                          {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              </div>
            )
          )}
        </div>
      </div>

      {showSetModal && (
        <SetRateModal
          currentRate={current?.rate}
          onClose={() => setShowSetModal(false)}
          onSaved={() => { invalidateCache(CACHE_KEY); fetchRate(true); }}
        />
      )}
        </>
      )}
    </div>
  );
};

// ── Set Rate Modal ────────────────────────────────────────────
const SetRateModal = ({ currentRate, onClose, onSaved }) => {
  const [rate, setRate] = useState(currentRate ? String(currentRate) : '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { isMarathi } = useMarathi();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(rate);
    if (!rate || isNaN(parsed) || parsed < 0) {
      toast.error(isMarathi ? 'वैध दर टाका (उदा. ५५ किंवा ५५.५०).' : 'Enter a valid rate (e.g. 55 or 55.50).');
      return;
    }
    setLoading(true);
    try {
      await api.post('/owner/default-rate', { rate: parsed, note: note.trim() || undefined });
      toast.success(`${isMarathi ? 'डिफॉल्ट दर सेट केला' : 'Default rate set to'} ₹${parsed}/${isMarathi ? 'ली.' : 'L'}`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || (isMarathi ? 'दर सेट करता आला नाही.' : 'Failed to set rate.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Milk size={20} color="#0F62FE" />
          <h2 style={{ fontWeight: 700, fontSize: '20px' }}>{isMarathi ? 'डिफॉल्ट दर सेट करा' : 'Set Default Rate'}</h2>
        </div>
        <p style={{ color: '#525252', fontSize: '14px', marginBottom: '24px' }}>
          {isMarathi
            ? 'हा दर नवीन ग्राहकांसाठी डिफॉल्ट म्हणून वापरला जाईल.'
            : 'This rate will be used as the default for new customers.'}
          {currentRate && ` ${isMarathi ? 'सध्याचा दर' : 'Current rate'}: ₹${currentRate}/${isMarathi ? 'ली.' : 'L'}`}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">{isMarathi ? 'प्रति लिटर दर (₹) *' : 'Rate per Litre (₹) *'}</label>
            <input
              type="number"
              className="input"
              placeholder={isMarathi ? 'उदा. ५५ किंवा ५५.५०' : 'e.g. 55 or 55.50'}
              value={rate}
              onChange={e => setRate(e.target.value)}
              min="0"
              step="0.5"
              required
              autoFocus
            />
          </div>
          <div className="input-group">
            <label className="input-label">{isMarathi ? 'नोंद (पर्यायी)' : 'Note (optional)'}</label>
            <input
              type="text"
              className="input"
              placeholder={isMarathi ? 'उदा. हंगामी दरवाढ' : 'e.g. Seasonal price increase'}
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={200}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>{isMarathi ? 'रद्द करा' : 'Cancel'}</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? (isMarathi ? 'जतन होत आहे...' : 'Saving...') : (isMarathi ? 'दर सेट करा' : 'Set Rate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── DairyDefaultRateSection Component ──────────────────────────
const DairyDefaultRateSection = () => {
  const { isMarathi } = useMarathi();
  const toast = useToast();
  
  const [configs, setConfigs] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('Cow'); // 'Cow', 'Buffalo', 'Mixed'

  // Input states for the active tab config
  const [baseRate, setBaseRate] = useState('');
  const [fatMultiplier, setFatMultiplier] = useState('');
  const [snfMultiplier, setSnfMultiplier] = useState('');
  const [bonusPerLiter, setBonusPerLiter] = useState('');
  const [deductionPerLiter, setDeductionPerLiter] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/owner/dairy-default-rates');
      const configsMap = {};
      data.configs.forEach(c => {
        configsMap[c.milkType] = c;
      });
      setConfigs(configsMap);
      setHistory(data.history || []);

      // Load active tab config values
      const currentConfig = configsMap[activeTab];
      if (currentConfig) {
        setBaseRate(String(currentConfig.baseRate ?? ''));
        setFatMultiplier(String(currentConfig.fatMultiplier ?? ''));
        setSnfMultiplier(String(currentConfig.snfMultiplier ?? ''));
        setBonusPerLiter(String(currentConfig.bonusPerLiter ?? '0'));
        setDeductionPerLiter(String(currentConfig.deductionPerLiter ?? '0'));
        if (currentConfig.effectiveFrom) {
          setEffectiveFrom(new Date(currentConfig.effectiveFrom).toISOString().split('T')[0]);
        }
      } else {
        setBaseRate('');
        setFatMultiplier('');
        setSnfMultiplier('');
        setBonusPerLiter('0');
        setDeductionPerLiter('0');
      }
    } catch (err) {
      toast.error('Failed to load default rate configurations.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!baseRate || !fatMultiplier || !snfMultiplier || !effectiveFrom) {
      toast.error(isMarathi ? 'कृपया सर्व आवश्यक फील्ड भरा.' : 'Please fill all required fields.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/owner/dairy-default-rates', {
        milkType: activeTab,
        baseRate: parseFloat(baseRate),
        fatMultiplier: parseFloat(fatMultiplier),
        snfMultiplier: parseFloat(snfMultiplier),
        bonusPerLiter: parseFloat(bonusPerLiter || 0),
        deductionPerLiter: parseFloat(deductionPerLiter || 0),
        effectiveFrom
      });
      toast.success(isMarathi ? 'दर नियम यशस्वीरित्या जतन केले!' : 'Default rate rules saved successfully!');
      fetchRates();
    } catch (err) {
      toast.error('Failed to save default rates.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E0E0E0' }}>
        {['Cow', 'Buffalo', 'Mixed'].map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveTab(type)}
            style={{
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === type ? '3px solid #0F62FE' : 'none',
              color: activeTab === type ? '#0F62FE' : '#525252',
              cursor: 'pointer'
            }}
          >
            {type === 'Cow' ? (isMarathi ? 'गाय दूध' : 'Cow Milk') : 
             type === 'Buffalo' ? (isMarathi ? 'म्हैस दूध' : 'Buffalo Milk') : 
             (isMarathi ? 'मिश्रित दूध' : 'Mixed Milk')}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '20px' }}>
          {isMarathi ? `${activeTab === 'Cow' ? 'गाय' : activeTab === 'Buffalo' ? 'म्हैस' : 'मिश्रित'} दूध दर नियम` : `${activeTab} Milk Pricing Rules`}
        </h3>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: 'auto' }} />
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              
              <div className="input-group">
                <label className="input-label">{isMarathi ? 'मूळ दर (Base Rate) (₹/L)' : 'Base Rate (₹/L)'}</label>
                <input
                  type="number" className="input" step="0.01" min="0" required
                  value={baseRate} onChange={e => setBaseRate(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">{isMarathi ? 'फॅट Multiplier (FAT Rate)' : 'FAT Rate Multiplier'}</label>
                <input
                  type="number" className="input" step="0.0001" min="0" required
                  value={fatMultiplier} onChange={e => setFatMultiplier(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">{isMarathi ? 'एसएनएफ Multiplier (SNF Rate)' : 'SNF Rate Multiplier'}</label>
                <input
                  type="number" className="input" step="0.0001" min="0" required
                  value={snfMultiplier} onChange={e => setSnfMultiplier(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">{isMarathi ? 'बोनस / लिटर (₹/L)' : 'Bonus Per Liter (₹/L)'}</label>
                <input
                  type="number" className="input" step="0.01" min="0" required
                  value={bonusPerLiter} onChange={e => setBonusPerLiter(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">{isMarathi ? 'वजावट / लिटर (₹/L)' : 'Deduction Per Liter (₹/L)'}</label>
                <input
                  type="number" className="input" step="0.01" min="0" required
                  value={deductionPerLiter} onChange={e => setDeductionPerLiter(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">{isMarathi ? 'अंमलबजावणी तारीख' : 'Effective From Date'}</label>
                <input
                  type="date" className="input" required
                  value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
                />
              </div>

            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', height: '42px', minWidth: '150px' }} disabled={saving}>
              {saving ? <div className="spinner" style={{ width: '18px', height: '18px' }} /> : (isMarathi ? 'दर नियम जतन करा' : 'Save Pricing Rule')}
            </button>
          </form>
        )}
      </div>

      {/* History */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E0E0E0', fontWeight: 700, fontSize: '14px' }}>
          {isMarathi ? 'दर नियम इतिहास' : 'Pricing Formula History'}
        </div>
        {history.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#8D8D8D' }}>
            {isMarathi ? 'कोणताही इतिहास सापडला नाही.' : 'No formula updates recorded yet.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F4F4F4', borderBottom: '1px solid #E0E0E0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>{isMarathi ? 'तारीख' : 'Effective Date'}</th>
                  <th style={{ padding: '12px 16px' }}>{isMarathi ? 'दूध प्रकार' : 'Milk Type'}</th>
                  <th style={{ padding: '12px 16px' }}>{isMarathi ? 'मूळ दर' : 'Base Rate'}</th>
                  <th style={{ padding: '12px 16px' }}>{isMarathi ? 'FAT Multiplier' : 'FAT Mult.'}</th>
                  <th style={{ padding: '12px 16px' }}>{isMarathi ? 'SNF Multiplier' : 'SNF Mult.'}</th>
                  <th style={{ padding: '12px 16px' }}>{isMarathi ? 'बोनस' : 'Bonus'}</th>
                  <th style={{ padding: '12px 16px' }}>{isMarathi ? 'वजावट' : 'Deduction'}</th>
                  <th style={{ padding: '12px 16px' }}>{isMarathi ? 'स्थिती' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h._id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                    <td style={{ padding: '12px 16px' }}>{new Date(h.effectiveFrom).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${h.milkType === 'Cow' ? 'badge-blue' : h.milkType === 'Buffalo' ? 'badge-orange' : 'badge-green'}`}>
                        {h.milkType}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>₹{h.baseRate.toFixed(2)}/L</td>
                    <td style={{ padding: '12px 16px' }}>{h.fatMultiplier.toFixed(4)}</td>
                    <td style={{ padding: '12px 16px' }}>{h.snfMultiplier.toFixed(4)}</td>
                    <td style={{ padding: '12px 16px' }}>+₹{h.bonusPerLiter.toFixed(2)}/L</td>
                    <td style={{ padding: '12px 16px' }}>-₹{h.deductionPerLiter.toFixed(2)}/L</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${h.isActive ? 'badge-green' : 'badge-red'}`}>
                        {h.isActive ? (isMarathi ? 'सक्रिय' : 'Active') : (isMarathi ? 'निष्क्रिय' : 'Inactive')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default DefaultRate;
