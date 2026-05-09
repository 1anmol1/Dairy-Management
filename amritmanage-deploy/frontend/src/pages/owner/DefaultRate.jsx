import React, { useState, useCallback } from 'react';
import { Milk, TrendingUp, TrendingDown, Minus, Plus, History } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';
import { useMarathi } from '../../i18n/marathi';
import { getCache, setCache, invalidateCache } from '../../utils/cache';

const CACHE_KEY = 'owner/default-rate';

const DefaultRate = () => {
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
          <h1 className="page-title">{isMarathi ? 'डिफॉल्ट दूध दर' : 'Default Milk Rate'}</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            {isMarathi ? 'नवीन ग्राहकांसाठी डिफॉल्ट दर सेट करा' : 'Set the default rate applied to new customers'}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowSetModal(true)}>
          <Plus size={16} /> {isMarathi ? 'नवीन दर सेट करा' : 'Set New Rate'}
        </button>
      </div>

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

export default DefaultRate;
