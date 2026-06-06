import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, UserX, UserCheck, RefreshCw, ChevronDown, ChevronUp, AlertCircle, Eye, EyeOff, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';
import { useMarathi } from '../../i18n/marathi';
import { useAuth } from '../../context/AuthContext';
import ExportButton from '../../components/ExportButton';
import ConfirmModal from '../../components/ConfirmModal';
import useDebounce from '../../hooks/useDebounce';
import useThrottle from '../../hooks/useThrottle';

const Farmers = () => {
  const [farmers, setFarmers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 15;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('true');
  const [showModal, setShowModal] = useState(false);
  const [editFarmer, setEditFarmer] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [toggling, setToggling] = useState(false);
  const { user } = useAuth();
  const toast = useToast();
  const showSkeleton = useDelayedLoading(loading && farmers.length === 0, 800);
  const canExport = user?.features?.advanced_reports;
  const { isMarathi } = useMarathi();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const [expandedId, setExpandedId] = useState(null);

  const debouncedSearch = useDebounce(search, 350);

  const fetchFarmers = useCallback(async (resetPage = true) => {
    const currentPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);
    setLoading(resetPage);
    if (!resetPage) setLoadingMore(true);
    try {
      const params = { active: activeFilter, page: currentPage, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      const { data } = await api.get('/owner/farmers', { params });
      if (resetPage) {
        setFarmers(data.customers); // backend returns 'customers' key for array
      } else {
        setFarmers(prev => [...prev, ...data.customers]);
      }
      setTotal(data.total);
      setHasMore(data.customers.length === PAGE_SIZE && (currentPage * PAGE_SIZE) < data.total);
    } catch {
      toast.error(isMarathi ? 'शेतकरी लोड करण्यात अयशस्वी.' : 'Failed to load farmers.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, activeFilter, page, isMarathi]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFarmers(false);
  }, [page, fetchFarmers]);

  const throttledRefresh = useThrottle(() => fetchFarmers(true));

  useEffect(() => { fetchFarmers(true); }, [debouncedSearch, activeFilter]);

  const toggleActive = async (farmer) => {
    setToggling(true);
    setFarmers(prev => prev.map(f =>
      f._id === farmer._id ? { ...f, isActive: !f.isActive } : f
    ));
    setConfirmToggle(null);
    try {
      await api.put(`/owner/farmers/${farmer._id}`, { isActive: !farmer.isActive });
      toast.success(isMarathi ? `शेतकरी ${farmer.isActive ? 'निष्क्रिय' : 'सक्रिय'} केला.` : `Farmer ${farmer.isActive ? 'deactivated' : 'activated'}.`);
      fetchFarmers();
    } catch {
      setFarmers(prev => prev.map(f =>
        f._id === farmer._id ? { ...f, isActive: farmer.isActive } : f
      ));
      toast.error(isMarathi ? 'शेतकरी अपडेट करण्यात अयशस्वी.' : 'Failed to update farmer.');
    } finally {
      setToggling(false);
    }
  };

  const exportColumns = [
    { key: 'name',         label: 'Name',             format: (_, f) => f.name || '' },
    { key: 'phone',        label: 'Phone',            format: (_, f) => f.phone || '' },
    { key: 'customerCode', label: 'Farmer Code',      format: (_, f) => f.customerCode || '' },
    { key: 'address',      label: 'Village/Address',  format: (_, f) => f.address || '' },
    { key: 'balance',      label: 'Balance',          format: (_, f) => Math.abs(f.balance || 0).toFixed(0) + ((f.balance || 0) < 0 ? ' due' : ' cr') },
    { key: 'status',       label: 'Status',           format: (_, f) => f.isActive ? 'Active' : 'Inactive' },
  ];

  return (
    <div style={{ maxWidth: '100%' }}>
      <div className="page-header">
        <h1 className="page-title">
          {isMarathi ? 'शेतकरी' : 'Farmers'} <span style={{ color: '#8D8D8D', fontWeight: 400, fontSize: '16px' }}>({total})</span>
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={throttledRefresh} disabled={loading} title={isMarathi ? 'रिफ्रेश' : 'Refresh'}>
            <RefreshCw size={14} />
          </button>
          {canExport && (
            <ExportButton
              data={farmers}
              columns={exportColumns}
              filename={`farmers-${new Date().toISOString().split('T')[0]}`}
              title={isMarathi ? 'शेतकरी' : 'Farmers'}
              subtitle={user?.businessName || ''}
            />
          )}
          <button className="btn btn-primary btn-sm" onClick={() => { setEditFarmer(null); setShowModal(true); }}>
            <Plus size={16} /> {isMarathi ? 'शेतकरी जोडा' : 'Add Farmer'}
          </button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input
              className="input" style={{ paddingLeft: '36px' }}
              placeholder={isMarathi ? 'नाव, फोन किंवा कोडने शोधा...' : 'Search by name, phone or code...'}
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', border: '1px solid #E0E0E0', overflow: 'hidden' }}>
            {[{ v: 'true', l: isMarathi ? 'सक्रिय' : 'Active' }, { v: 'false', l: isMarathi ? 'निष्क्रिय' : 'Inactive' }, { v: '', l: isMarathi ? 'सर्व' : 'All' }].map(opt => (
              <button key={opt.v} onClick={() => setActiveFilter(opt.v)} style={{
                padding: '0 16px', height: '44px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
                backgroundColor: activeFilter === opt.v ? '#161616' : '#FFFFFF',
                color: activeFilter === opt.v ? '#FFFFFF' : '#525252',
                transition: 'all 0.1s'
              }}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          {showSkeleton ? (
            <div style={{ padding: '16px' }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', padding: '14px 0', borderBottom: i < 5 ? '1px solid #F4F4F4' : 'none' }}>
                  <div className="skeleton-row" style={{ gap: '6px' }}>
                    <div className="skeleton skeleton-line" style={{ width: '65%' }} />
                    <div className="skeleton skeleton-line-sm" style={{ width: '45%' }} />
                  </div>
                  {[0,1,2].map(j => <div key={j} className="skeleton skeleton-line" style={{ width: '50%' }} />)}
                </div>
              ))}
            </div>
          ) : loading ? null : farmers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><UserCheck size={40} /></div>
              <h3>{isMarathi ? 'कोणतेही शेतकरी सापडले नाहीत' : 'No farmers found'}</h3>
              <p>{isMarathi ? 'सुरुवात करण्यासाठी पहिला शेतकरी जोडा.' : 'Add your first farmer to get started.'}</p>
            </div>
          ) : (
            <>
              {isMobile ? (
                /* ── Mobile card list ── */
                <div style={{ padding: '8px' }}>
                  {farmers.map(f => {
                    const isExpanded = expandedId === f._id;
                    const balance = f.balance || 0;
                    return (
                      <div key={f._id} style={{ border: '1px solid #E0E0E0', marginBottom: '8px', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : f._id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>
                              {f.name} {f.customerCode && <span style={{ color: '#0F62FE', fontSize: '11px', fontWeight: 600 }}>#{f.customerCode}</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: '#525252', marginTop: '2px', display: 'flex', gap: '8px' }}>
                              <span>{f.phone}</span>
                              <span style={{ color: balance < 0 ? '#DA1E28' : '#24A148', fontWeight: 600 }}>
                                ₹{Math.abs(balance).toFixed(0)}{balance < 0 ? (isMarathi ? ' देणे' : ' due') : (isMarathi ? ' जमा' : ' cr')}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span className={`badge ${f.isActive ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '10px' }}>
                              {f.isActive ? (isMarathi ? 'सक्रिय' : 'Active') : (isMarathi ? 'निष्क्रिय' : 'Inactive')}
                            </span>
                            {isExpanded ? <ChevronUp size={16} color="#8D8D8D" /> : <ChevronDown size={16} color="#8D8D8D" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #F4F4F4', padding: '12px 14px', backgroundColor: '#FAFAFA' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '13px' }}>
                              <div style={{ gridColumn: 'span 2' }}>
                                <span style={{ color: '#8D8D8D' }}>{isMarathi ? 'गाव/पत्ता' : 'Village/Address'}: </span>
                                <strong>{f.address || '—'}</strong>
                              </div>
                              {f.notes && (
                                <div style={{ gridColumn: 'span 2' }}>
                                  <span style={{ color: '#8D8D8D' }}>{isMarathi ? 'नोंदी' : 'Notes'}: </span>
                                  <strong>{f.notes}</strong>
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => { setEditFarmer(f); setShowModal(true); }}>
                                <Edit2 size={13} /> {isMarathi ? 'संपादित करा' : 'Edit'}
                              </button>
                              <button className={`btn btn-sm ${f.isActive ? 'btn-danger' : 'btn-success'}`} style={{ flex: 1 }} onClick={() => setConfirmToggle(f)}>
                                {f.isActive ? <><UserX size={13} /> {isMarathi ? 'निष्क्रिय' : 'Deactivate'}</> : <><UserCheck size={13} /> {isMarathi ? 'सक्रिय' : 'Activate'}</>}
                              </button>
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
                        <th>{isMarathi ? 'गाव/पत्ता' : 'Village/Address'}</th>
                        <th>{isMarathi ? 'शिल्लक' : 'Balance'}</th>
                        <th>{isMarathi ? 'क्रिया' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmers.map(f => (
                        <tr key={f._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{f.name}</div>
                            {f.customerCode && (
                              <div style={{ fontSize: '11px', color: '#0F62FE', fontWeight: 600, marginTop: '2px' }}>#{f.customerCode}</div>
                            )}
                          </td>
                          <td>{f.phone}</td>
                          <td>{f.address || <span style={{ color: '#C6C6C6' }}>—</span>}</td>
                          <td>
                            <span style={{ color: (f.balance || 0) < 0 ? '#DA1E28' : '#24A148', fontWeight: 600 }}>
                              ₹{Math.abs(f.balance || 0).toFixed(0)}
                              {(f.balance || 0) < 0 ? (isMarathi ? ' देणे' : ' due') : (isMarathi ? ' जमा' : ' cr')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setEditFarmer(f); setShowModal(true); }}>
                                <Edit2 size={13} />
                              </button>
                              <button className={`btn btn-sm ${f.isActive ? 'btn-danger' : 'btn-success'}`} onClick={() => setConfirmToggle(f)}>
                                {f.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {hasMore && (
                <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #F4F4F4' }}>
                  <button className="btn btn-ghost btn-sm" onClick={loadMore} disabled={loadingMore} style={{ minWidth: '140px' }}>
                    {loadingMore ? (
                      <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> {isMarathi ? 'लोड होत आहे...' : 'Loading...'}</>
                    ) : (
                      isMarathi ? `आणखी दाखवा (${total - farmers.length} शिल्लक)` : `Load more (${total - farmers.length} remaining)`
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <FarmerModal
          farmer={editFarmer}
          onClose={() => setShowModal(false)}
          onSaved={() => fetchFarmers(true)}
        />
      )}

      {confirmToggle && (
        <ConfirmModal
          title={isMarathi ? (confirmToggle.isActive ? 'शेतकरी निष्क्रिय करायचा?' : 'शेतकरी सक्रिय करायचा?') : (confirmToggle.isActive ? 'Deactivate Farmer?' : 'Activate Farmer?')}
          message={isMarathi ? `${confirmToggle.name} ला ${confirmToggle.isActive ? 'निष्क्रिय' : 'सक्रिय'} करायचे आहे का?` : `Are you sure you want to ${confirmToggle.isActive ? 'deactivate' : 'activate'} ${confirmToggle.name}?`}
          confirmText={isMarathi ? (confirmToggle.isActive ? 'निष्क्रिय करा' : 'सक्रिय करा') : (confirmToggle.isActive ? 'Deactivate' : 'Activate')}
          cancelText={isMarathi ? 'रद्द करा' : 'Cancel'}
          danger={confirmToggle.isActive}
          loading={toggling}
          onConfirm={() => toggleActive(confirmToggle)}
          onCancel={() => setConfirmToggle(null)}
        />
      )}
    </div>
  );
};

export const FarmerModal = ({ farmer, onClose, onSaved }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    customerCode: '',
    showCodeToStaff: false,
    language: 'en'
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { isMarathi } = useMarathi();

  const codeRef = useRef(null);
  const nameRef = useRef(null);
  const phoneRef = useRef(null);

  useEffect(() => {
    if (farmer) {
      setForm({
        name: farmer.name || '',
        phone: farmer.phone || '',
        address: farmer.address || '',
        notes: farmer.notes || '',
        customerCode: farmer.customerCode ? farmer.customerCode.replace(/\D/g, '') : '',
        showCodeToStaff: farmer.showCodeToStaff || false,
        language: farmer.language || 'en'
      });
    }
  }, [farmer]);

  const handleChange = (name, val) => {
    let cleanVal = val;
    if (name === 'customerCode') {
      cleanVal = val.replace(/\D/g, ''); // numeric only
    }
    setForm(prev => ({ ...prev, [name]: cleanVal }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validatePage1 = () => {
    const err = {};
    if (!form.name.trim()) err.name = isMarathi ? 'नाव आवश्यक आहे.' : 'Name is required.';
    const cleanPhone = form.phone.trim();
    if (!cleanPhone) {
      err.phone = isMarathi ? 'फोन नंबर आवश्यक आहे.' : 'Phone number is required.';
    } else if (!/^\d{10}$/.test(cleanPhone)) {
      err.phone = isMarathi ? 'कृपया वैध १०-अंकी नंबर टाका.' : 'Enter a valid 10-digit number.';
    }
    return err;
  };

  const handleNextPage = () => {
    const err = validatePage1();
    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }
    setCurrentPage(2);
  };

  const handleKeyDownPage1 = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      } else {
        handleNextPage();
      }
    }
  };

  const handleKeyDownPage2 = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const err = validatePage1();
    if (Object.keys(err).length > 0) {
      setErrors(err);
      setCurrentPage(1);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
        customerCode: form.customerCode.trim() || null,
        showCodeToStaff: form.showCodeToStaff,
        language: form.language,
        default_price: 0 // backend route validation check requirements
      };

      if (farmer) {
        await api.put(`/owner/farmers/${farmer._id}`, payload);
        toast.success(isMarathi ? 'शेतकरी यशस्वीरित्या अपडेट केला!' : 'Farmer updated successfully!');
      } else {
        await api.post('/owner/farmers', payload);
        toast.success(isMarathi ? 'शेतकरी यशस्वीरित्या जोडला!' : 'Farmer added successfully!');
      }
      onSaved();
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.error || '';
      if (errMsg.toLowerCase().includes('limit reached')) {
        if (user?.subscription?.plan === 'platinum') {
          navigate('/app/owner/feedback', {
            state: {
              prefillCategory: 'support',
              prefillMessage: isMarathi 
                ? 'नमस्कार टीम, मी प्लॅटिनम प्लॅनवरील माझी ग्राहक मर्यादा ओलांडली आहे. कृपया माझी ग्राहक मर्यादा वाढवा.'
                : 'Hi support team, I have exhausted my customer limit on the Platinum plan. Please increase my customer limit.'
            }
          });
          toast.error(isMarathi ? 'ग्राहक मर्यादा ओलांडली आहे. सपोर्ट पेजवर रिडायरेक्ट करत आहे...' : 'Customer limit reached. Redirecting to support...');
        } else {
          navigate('/app/owner/upgrade');
          toast.error(isMarathi ? 'ग्राहक मर्यादा ओलांडली आहे. अपग्रेड पेजवर रिडायरेक्ट करत आहे...' : 'Customer limit reached. Redirecting to upgrade...');
        }
      } else {
        toast.error(errMsg || (isMarathi ? 'जतन करण्यात अयशस्वी.' : 'Failed to save.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const mouseDownOnOverlay = React.useRef(false);

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onMouseUp={e => { if (e.target === e.currentTarget && mouseDownOnOverlay.current) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: '520px', width: '90%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#8D8D8D',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
            zIndex: 1
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F4F4F4'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <X size={18} />
        </button>

        <h2 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '10px', paddingRight: '24px' }}>
          {farmer ? (isMarathi ? 'शेतकरी संपादित करा' : 'Edit Farmer') : (isMarathi ? 'नवीन शेतकरी जोडा' : 'Add New Farmer')}
        </h2>
        
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '4px', backgroundColor: '#0F62FE' }} />
          <div style={{ flex: 1, height: '4px', backgroundColor: currentPage === 2 ? '#0F62FE' : '#E0E0E0' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {currentPage === 1 ? (
              /* PAGE 1: Code, Name, Phone */
              <>
                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'शेतकरी कोड (फक्त अंक) *' : 'Farmer Code (digits only) *'}</label>
                  <input
                    type="text" className="input" placeholder="e.g. 101" ref={codeRef}
                    value={form.customerCode} onChange={e => handleChange('customerCode', e.target.value)}
                    onKeyDown={e => handleKeyDownPage1(e, nameRef)} autoFocus
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'पूर्ण नाव *' : 'Full Name *'}</label>
                  <input
                    type="text" className="input" placeholder={isMarathi ? 'उदा. ज्ञानेश्वर पाटील' : 'e.g. Dnyaneshwar Patil'}
                    ref={nameRef} value={form.name} onChange={e => handleChange('name', e.target.value)}
                    style={errors.name ? { borderColor: '#DA1E28' } : {}}
                    onKeyDown={e => handleKeyDownPage1(e, phoneRef)}
                  />
                  {errors.name && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '4px' }}>{errors.name}</div>}
                </div>

                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'फोन नंबर *' : 'Phone Number *'}</label>
                  <input
                    type="tel" className="input" placeholder={isMarathi ? '१०-अंकी नंबर' : '10-digit number'}
                    ref={phoneRef} value={form.phone} onChange={e => handleChange('phone', e.target.value)}
                    maxLength={10} style={errors.phone ? { borderColor: '#DA1E28' } : {}}
                    onKeyDown={e => handleKeyDownPage1(e, null)}
                  />
                  {errors.phone && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '4px' }}>{errors.phone}</div>}
                </div>
              </>
            ) : (
              /* PAGE 2: Address, Language, Notes */
              <>
                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'गाव / पत्ता (पर्यायी)' : 'Village / Address (optional)'}</label>
                  <input
                    type="text" className="input" placeholder={isMarathi ? 'उदा. मु. पो. वडगाव' : 'e.g. Vadgaon'}
                    value={form.address} onChange={e => handleChange('address', e.target.value)}
                    onKeyDown={handleKeyDownPage2} autoFocus
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'पसंतीची भाषा (WhatsApp)' : 'Preferred Language (WhatsApp)'}</label>
                  <select className="input" value={form.language} onChange={e => handleChange('language', e.target.value)} onKeyDown={handleKeyDownPage2}>
                    <option value="en">English</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'नोंदी / रिमार्क (पर्यायी)' : 'Notes / Remarks (optional)'}</label>
                  <textarea
                    className="input" placeholder={isMarathi ? 'शेतकऱ्याबद्दल अधिक माहिती...' : 'Extra notes about the farmer...'}
                    value={form.notes} onChange={e => handleChange('notes', e.target.value)}
                    rows={2} style={{ fontFamily: 'inherit', resize: 'vertical' }}
                    onKeyDown={handleKeyDownPage2}
                  />
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            {currentPage === 1 ? (
              <>
                <button type="button" className="btn btn-ghost btn-full" onClick={onClose} disabled={submitting}>
                  {isMarathi ? 'रद्द करा' : 'Cancel'}
                </button>
                <button type="button" className="btn btn-primary btn-full" onClick={handleNextPage}>
                  {isMarathi ? 'पुढे (Next)' : 'Next'}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-ghost btn-full" onClick={() => setCurrentPage(1)} disabled={submitting}>
                  {isMarathi ? 'मागे' : 'Back'}
                </button>
                <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
                  {submitting ? (isMarathi ? 'जतन होत आहे...' : 'Saving...') : (isMarathi ? 'जतन करा (Submit)' : 'Save & Submit')}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Farmers;
