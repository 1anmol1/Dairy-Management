import React, { useEffect, useState, useCallback } from 'react';
import { Plus, UserX, UserCheck, KeyRound, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';
import useThrottle from '../../hooks/useThrottle';
import { useMarathi } from '../../i18n/marathi';
import ConfirmModal from '../../components/ConfirmModal';
import { getCache, setCache, invalidateCache } from '../../utils/cache';

const CACHE_KEY = 'owner/staff';

const Staff = () => {
  const [staff, setStaff] = useState(() => getCache(CACHE_KEY) || []);
  const [loading, setLoading] = useState(!getCache(CACHE_KEY));
  const [showAddModal, setShowAddModal] = useState(false);
  const [pwTarget, setPwTarget] = useState(null);
  const [confirmDisable, setConfirmDisable] = useState(null);
  const [disabling, setDisabling] = useState(false);
  const toast = useToast();
  // Only show skeleton if no cached data — prevents blank flash
  const showSkeleton = useDelayedLoading(loading && staff.length === 0, 800);
  const { isMarathi } = useMarathi();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const [expandedId, setExpandedId] = useState(null);

  const fetchStaff = useCallback(async (force = false) => {
    if (!force) {
      const cached = getCache(CACHE_KEY);
      if (cached) { setStaff(cached); setLoading(false); return; }
    }
    setLoading(true);
    try {
      const { data } = await api.get('/owner/staff');
      setCache(CACHE_KEY, data.staff, 5 * 60 * 1000); // 5 min TTL
      setStaff(data.staff);
    } catch {
      toast.error('Failed to load staff.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const throttledRefresh = useThrottle(() => fetchStaff(true));

  const toggleStaff = async (member) => {
    setDisabling(true);
    try {
      await api.delete(`/owner/staff/${member._id}`);
      toast.success(isMarathi ? 'कर्मचारी खाते अक्षम केले.' : 'Staff account disabled.');
      invalidateCache(CACHE_KEY);
      fetchStaff(true);
    } catch {
      toast.error(isMarathi ? 'कर्मचारी अपडेट करण्यात अयशस्वी.' : 'Failed to update staff.');
    } finally {
      setDisabling(false);
      setConfirmDisable(null);
    }
  };

  return (
    <div style={{ maxWidth: '100%' }}>
      <div className="page-header">
        <h1 className="page-title">{isMarathi ? 'कर्मचारी' : 'Staff Members'}</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={throttledRefresh} disabled={loading} title={isMarathi ? 'रिफ्रेश' : 'Refresh'}>
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> {isMarathi ? 'कर्मचारी जोडा' : 'Add Staff'}
          </button>
        </div>
      </div>

      <div className="page-body">
        <div style={{
          backgroundColor: '#EDF5FF', border: '1px solid rgba(15,98,254,0.2)',
          padding: '14px 20px', marginBottom: '20px', fontSize: '14px', color: '#0043CE'
        }}>
          {isMarathi
            ? 'कर्मचारी फक्त वितरण नोंदवू शकतात. ते बिलिंग, किंमत किंवा मागील नोंदी पाहू शकत नाहीत.'
            : 'Staff can only record deliveries. They cannot view billing, pricing, or past records.'}
        </div>

        <div className="card" style={{ padding: 0 }}>
          {showSkeleton ? (
            <div style={{ padding: '16px' }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '12px', padding: '14px 0', borderBottom: i < 3 ? '1px solid #F4F4F4' : 'none' }}>
                  <div className="skeleton skeleton-line" style={{ width: '60%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '40%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '50%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '45%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '55%' }} />
                </div>
              ))}
            </div>
          ) : loading ? null : staff.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><UserCheck size={40} /></div>
              <h3>{isMarathi ? 'अद्याप कोणतेही कर्मचारी नाहीत' : 'No staff members yet'}</h3>
              <p>{isMarathi ? 'सुरुवात करण्यासाठी वितरण कर्मचारी जोडा.' : 'Add a delivery staff member to get started.'}</p>
            </div>
          ) : (
            <>
              {isMobile ? (
                /* ── Mobile card list ── */
                <div style={{ padding: '8px' }}>
                  {staff.map(s => {
                    const isExpanded = expandedId === s._id;
                    return (
                      <div key={s._id} style={{ border: '1px solid #E0E0E0', marginBottom: '8px', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : s._id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.name}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span className={`badge ${s.isActive ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '10px' }}>
                              {s.isActive ? (isMarathi ? 'सक्रिय' : 'Active') : (isMarathi ? 'अक्षम' : 'Disabled')}
                            </span>
                            {isExpanded ? <ChevronUp size={16} color="#8D8D8D" /> : <ChevronDown size={16} color="#8D8D8D" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #F4F4F4', padding: '12px 14px', backgroundColor: '#FAFAFA' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '13px' }}>
                              <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'फोन' : 'Phone'}: </span><strong>{s.phone}</strong></div>
                              <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'जोडले' : 'Added'}: </span><strong>{new Date(s.createdAt).toLocaleDateString('en-IN')}</strong></div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {s.isActive && (
                                <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => setConfirmDisable(s)}>
                                  <UserX size={13} /> {isMarathi ? 'अक्षम करा' : 'Disable'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{isMarathi ? 'नाव' : 'Name'}</th>
                        <th>{isMarathi ? 'फोन' : 'Phone'}</th>
                        <th>{isMarathi ? 'स्थिती' : 'Status'}</th>
                        <th>{isMarathi ? 'जोडले' : 'Added'}</th>
                        <th>{isMarathi ? 'क्रिया' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map(s => (
                        <tr key={s._id}>
                          <td style={{ fontWeight: 600 }}>{s.name}</td>
                          <td>{s.phone}</td>
                          <td>
                            <span className={`badge ${s.isActive ? 'badge-green' : 'badge-red'}`}>
                              {s.isActive ? (isMarathi ? 'सक्रिय' : 'Active') : (isMarathi ? 'अक्षम' : 'Disabled')}
                            </span>
                          </td>
                          <td style={{ fontSize: '13px', color: '#8D8D8D' }}>
                            {new Date(s.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {s.isActive && (
                                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDisable(s)}>
                                  <UserX size={13} /> {isMarathi ? 'अक्षम करा' : 'Disable'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showAddModal && <AddStaffModal onClose={() => setShowAddModal(false)} onCreated={fetchStaff} />}

      {confirmDisable && (
        <ConfirmModal
          title={isMarathi ? 'कर्मचारी अक्षम करायचा?' : 'Disable Staff Member?'}
          message={isMarathi
            ? `${confirmDisable.name} चे खाते अक्षम करायचे आहे का? ते यापुढे लॉगिन करू शकणार नाहीत.`
            : `Are you sure you want to disable ${confirmDisable.name}? They will no longer be able to log in.`}
          confirmText={isMarathi ? 'अक्षम करा' : 'Disable'}
          cancelText={isMarathi ? 'रद्द करा' : 'Cancel'}
          danger={true}
          loading={disabling}
          onConfirm={() => toggleStaff(confirmDisable)}
          onCancel={() => setConfirmDisable(null)}
        />
      )}
    </div>
  );
};

// ── Add Staff Modal ───────────────────────────────────────────
const AddStaffModal = ({ onClose, onCreated }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { isMarathi } = useMarathi();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/owner/staff', form);
      toast.success(isMarathi ? 'कर्मचारी खाते तयार केले.' : 'Staff account created.');
      invalidateCache(CACHE_KEY);
      onCreated();
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.error || '';
      if (errMsg.toLowerCase().includes('limit reached')) {
        if (user?.subscription?.plan === 'platinum') {
          navigate('/app/owner/feedback', {
            state: {
              prefillCategory: 'support',
              prefillMessage: isMarathi 
                ? 'नमस्कार टीम, मी प्लॅटिनम प्लॅनवरील माझी कर्मचारी मर्यादा ओलांडली आहे. कृपया माझी कर्मचारी मर्यादा वाढवा.'
                : 'Hi support team, I have exhausted my staff limit on the Platinum plan. Please increase my staff limit.'
            }
          });
          toast.error(isMarathi ? 'कर्मचारी मर्यादा ओलांडली आहे. सपोर्ट पेजवर रिडायरेक्ट करत आहे...' : 'Staff limit reached. Redirecting to support...');
        } else {
          navigate('/app/owner/upgrade');
          toast.error(isMarathi ? 'कर्मचारी मर्यादा ओलांडली आहे. अपग्रेड पेजवर रिडायरेक्ट करत आहे...' : 'Staff limit reached. Redirecting to upgrade...');
        }
      } else {
        toast.error(errMsg || (isMarathi ? 'कर्मचारी तयार करण्यात अयशस्वी.' : 'Failed to create staff.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '20px' }}>{isMarathi ? 'कर्मचारी जोडा' : 'Add Staff Member'}</h2>
        <p style={{ color: '#525252', fontSize: '14px', marginBottom: '24px' }}>
          {isMarathi ? 'ते त्यांच्या फोन नंबर आणि पासवर्डने लॉगिन करतील.' : 'They will log in with their phone number and password.'}
        </p>
        <form onSubmit={handleSubmit}>
          {[
            { key: 'name', label: isMarathi ? 'पूर्ण नाव' : 'Full Name', type: 'text', placeholder: isMarathi ? 'सुरेश कुमार' : 'Suresh Kumar' },
            { key: 'phone', label: isMarathi ? 'फोन नंबर' : 'Phone Number', type: 'tel', placeholder: '9876543210' },
            { key: 'password', label: isMarathi ? 'पासवर्ड' : 'Password', type: 'password', placeholder: isMarathi ? 'किमान ६ अक्षरे' : 'Min 6 characters' }
          ].map(f => (
            <div key={f.key} className="input-group">
              <label className="input-label">{f.label}</label>
              <input type={f.type} className="input" placeholder={f.placeholder}
                value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: f.key === 'phone' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value }))}
                required {...(f.key === 'phone' ? { inputMode: 'numeric', maxLength: 10 } : {})} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>{isMarathi ? 'रद्द करा' : 'Cancel'}</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? (isMarathi ? 'तयार होत आहे...' : 'Creating...') : (isMarathi ? 'कर्मचारी तयार करा' : 'Create Staff')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Staff;
