import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, UserX, UserCheck, Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useDebounce from '../../hooks/useDebounce';
import useThrottle from '../../hooks/useThrottle';
import useWindowWidth from '../../hooks/useWindowWidth';
import ExportButton from '../../components/ExportButton';
import { useMarathi } from '../../i18n/marathi';
import ConfirmModal from '../../components/ConfirmModal';
import { getCache, setCache, invalidateCache } from '../../utils/cache';

const STAFF_CACHE_KEY = 'owner/staff';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 15;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('true');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [showRate, setShowRate] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [toggling, setToggling] = useState(false);
  const { user } = useAuth();
  const toast = useToast();
  const showSkeleton = useDelayedLoading(loading && customers.length === 0, 800);
  const canExport = user?.features?.advanced_reports;
  const { isMarathi } = useMarathi();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const [expandedId, setExpandedId] = useState(null);

  // Debounce search — wait 350ms after user stops typing before fetching
  const debouncedSearch = useDebounce(search, 350);

  const fetchCustomers = useCallback(async (resetPage = true) => {
    const currentPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);
    setLoading(resetPage);
    if (!resetPage) setLoadingMore(true);
    try {
      const params = { active: activeFilter, page: currentPage, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      const { data } = await api.get('/owner/customers', { params });
      if (resetPage) {
        setCustomers(data.customers);
      } else {
        setCustomers(prev => [...prev, ...data.customers]);
      }
      setTotal(data.total);
      setHasMore(data.customers.length === PAGE_SIZE && (currentPage * PAGE_SIZE) < data.total);
    } catch {
      toast.error('Failed to load customers.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, activeFilter, page]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCustomers(false);
  }, [page, fetchCustomers]);

  // Throttled refresh — max once per 10s to prevent spam
  const throttledRefresh = useThrottle(() => fetchCustomers(true));

  // Fetch staff list for assignment dropdown — cached for the session
  const fetchStaff = useCallback(async () => {
    const cached = getCache(STAFF_CACHE_KEY);
    if (cached) {
      setStaffList(cached.filter(s => s.isActive));
      return;
    }
    try {
      const { data } = await api.get('/owner/staff');
      setCache(STAFF_CACHE_KEY, data.staff, 5 * 60 * 1000);
      setStaffList(data.staff.filter(s => s.isActive));
    } catch { /* ignore */ }
  }, []);

  // Reset page and fetch when search/filter changes
  useEffect(() => { fetchCustomers(true); }, [debouncedSearch, activeFilter]);
  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const toggleActive = async (customer) => {
    setToggling(true);
    // Optimistic update — flip isActive immediately in UI
    setCustomers(prev => prev.map(c =>
      c._id === customer._id ? { ...c, isActive: !c.isActive } : c
    ));
    setConfirmToggle(null);
    try {
      await api.put(`/owner/customers/${customer._id}`, { isActive: !customer.isActive });
      toast.success(isMarathi ? `ग्राहक ${customer.isActive ? 'निष्क्रिय' : 'सक्रिय'} केला.` : `Customer ${customer.isActive ? 'deactivated' : 'activated'}.`);
      // Refresh to sync with server (filter may need updating)
      fetchCustomers();
    } catch {
      // Rollback on failure
      setCustomers(prev => prev.map(c =>
        c._id === customer._id ? { ...c, isActive: customer.isActive } : c
      ));
      toast.error(isMarathi ? 'ग्राहक अपडेट करण्यात अयशस्वी.' : 'Failed to update customer.');
    } finally {
      setToggling(false);
    }
  };

  const exportColumns = [
    { key: 'name',    label: 'Name',          format: (_, c) => c.name || '' },
    { key: 'phone',   label: 'Phone',         format: (_, c) => c.phone || '' },
    { key: 'address', label: 'Address',       format: (_, c) => c.address || '' },
    { key: 'morning', label: 'Morning (L)',   format: (_, c) => c.base_requirement?.morning || 0 },
    { key: 'evening', label: 'Evening (L)',   format: (_, c) => c.base_requirement?.evening || 0 },
    { key: 'rate',    label: 'Rate (₹/L)',    format: (_, c) => c.custom_price != null ? c.custom_price : c.default_price },
    { key: 'balance', label: 'Balance',       format: (_, c) => Math.abs(c.balance || 0).toFixed(0) + ((c.balance || 0) < 0 ? ' due' : ' cr') },
    { key: 'status',  label: 'Status',        format: (_, c) => c.isActive ? 'Active' : 'Inactive' },
  ];

  return (
    <div style={{ maxWidth: '100%' }}>
      <div className="page-header">
        <h1 className="page-title">
          {isMarathi ? 'ग्राहक' : 'Customers'} <span style={{ color: '#8D8D8D', fontWeight: 400, fontSize: '16px' }}>({total})</span>
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={throttledRefresh} disabled={loading} title={isMarathi ? 'रिफ्रेश' : 'Refresh'}>
            <RefreshCw size={14} />
          </button>
          {canExport && (
            <ExportButton
              data={customers}
              columns={exportColumns}
              filename={`customers-${new Date().toISOString().split('T')[0]}`}
              title={isMarathi ? 'ग्राहक' : 'Customers'}
              subtitle={user?.businessName || ''}
            />
          )}
          <button className="btn btn-primary btn-sm" onClick={() => { setEditCustomer(null); setShowModal(true); }}>
            <Plus size={16} /> {isMarathi ? 'ग्राहक जोडा' : 'Add Customer'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input
              className="input" style={{ paddingLeft: '36px' }}
              placeholder={isMarathi ? 'नाव किंवा फोनने शोधा...' : 'Search by name or phone...'}
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
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '12px', padding: '14px 0', borderBottom: i < 5 ? '1px solid #F4F4F4' : 'none' }}>
                  <div className="skeleton-row" style={{ gap: '6px' }}>
                    <div className="skeleton skeleton-line" style={{ width: '65%' }} />
                    <div className="skeleton skeleton-line-sm" style={{ width: '45%' }} />
                  </div>
                  {[0,1,2,3].map(j => <div key={j} className="skeleton skeleton-line" style={{ width: '50%' }} />)}
                </div>
              ))}
            </div>
          ) : loading ? null : customers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><UserCheck size={40} /></div>
              <h3>{isMarathi ? 'कोणतेही ग्राहक सापडले नाहीत' : 'No customers found'}</h3>
              <p>{isMarathi ? 'सुरुवात करण्यासाठी पहिला ग्राहक जोडा.' : 'Add your first customer to get started.'}</p>
            </div>
          ) : (
            <>
              {isMobile ? (
                /* ── Mobile card list ── */
                <div style={{ padding: '8px' }}>
                  {customers.map(c => {
                    const isExpanded = expandedId === c._id;
                    const balance = c.balance || 0;
                    return (
                      <div key={c._id} style={{ border: '1px solid #E0E0E0', marginBottom: '8px', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : c._id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</div>
                            <div style={{ fontSize: '12px', color: '#525252', marginTop: '2px', display: 'flex', gap: '8px' }}>
                              <span>{c.phone}</span>
                              <span style={{ color: balance < 0 ? '#DA1E28' : '#24A148', fontWeight: 600 }}>
                                ₹{Math.abs(balance).toFixed(0)}{balance < 0 ? (isMarathi ? ' देणे' : ' due') : (isMarathi ? ' जमा' : ' cr')}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span className={`badge ${c.isActive ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '10px' }}>
                              {c.isActive ? (isMarathi ? 'सक्रिय' : 'Active') : (isMarathi ? 'निष्क्रिय' : 'Inactive')}
                            </span>
                            {isExpanded ? <ChevronUp size={16} color="#8D8D8D" /> : <ChevronDown size={16} color="#8D8D8D" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #F4F4F4', padding: '12px 14px', backgroundColor: '#FAFAFA' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '13px' }}>
                              <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'सकाळ' : 'Morning'}: </span><strong>{c.base_requirement?.morning || 0}{isMarathi ? 'ली.' : 'L'}</strong></div>
                              <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'संध्याकाळ' : 'Evening'}: </span><strong>{c.base_requirement?.evening || 0}{isMarathi ? 'ली.' : 'L'}</strong></div>
                              <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'दर' : 'Rate'}: </span>
                                {showRate
                                  ? <strong>₹{c.custom_price != null ? c.custom_price : c.default_price}</strong>
                                  : <span style={{ color: '#C6C6C6' }}>••••</span>}
                              </div>
                              <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'कर्मचारी' : 'Staff'}: </span>
                                <strong>{c.assignedStaffId ? (staffList.find(s => s._id === c.assignedStaffId)?.name || '—') : (isMarathi ? 'नियुक्त नाही' : 'Unassigned')}</strong>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => { setEditCustomer(c); setShowModal(true); }}>
                                <Edit2 size={13} /> {isMarathi ? 'संपादित करा' : 'Edit'}
                              </button>
                              <button className={`btn btn-sm ${c.isActive ? 'btn-danger' : 'btn-success'}`} style={{ flex: 1 }} onClick={() => setConfirmToggle(c)}>
                                {c.isActive ? <><UserX size={13} /> {isMarathi ? 'निष्क्रिय' : 'Deactivate'}</> : <><UserCheck size={13} /> {isMarathi ? 'सक्रिय' : 'Activate'}</>}
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
                        <th>{isMarathi ? 'सकाळ' : 'Morning'}</th>
                        <th>{isMarathi ? 'संध्याकाळ' : 'Evening'}</th>
                        <th>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isMarathi ? `दर (₹/ली.)` : 'Rate (₹/L)'}
                            <button
                              onClick={() => setShowRate(v => !v)}
                              title={showRate ? (isMarathi ? 'दर लपवा' : 'Hide rate') : (isMarathi ? 'दर दाखवा' : 'Show rate')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#8D8D8D', display: 'flex', alignItems: 'center' }}
                            >
                              {showRate ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </th>
                        <th>{isMarathi ? 'नियुक्त कर्मचारी' : 'Assigned Staff'}</th>
                        <th>{isMarathi ? 'शिल्लक' : 'Balance'}</th>
                        <th>{isMarathi ? 'क्रिया' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map(c => (
                        <tr key={c._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{c.name}</div>
                            {c.customerCode && (
                              <div style={{ fontSize: '11px', color: '#0F62FE', fontWeight: 600, marginTop: '2px' }}>#{c.customerCode}</div>
                            )}
                            {c.address && <div style={{ fontSize: '12px', color: '#8D8D8D' }}>{c.address}</div>}
                          </td>
                          <td>{c.phone}</td>
                          <td>{c.base_requirement?.morning || 0}{isMarathi ? 'ली.' : 'L'}</td>
                          <td>{c.base_requirement?.evening || 0}{isMarathi ? 'ली.' : 'L'}</td>
                          <td>
                            {showRate
                              ? <span style={{ fontWeight: 600 }}>₹{c.custom_price != null ? c.custom_price : c.default_price}</span>
                              : <span style={{ color: '#C6C6C6', fontSize: '12px' }}>••••</span>}
                          </td>
                          <td style={{ fontSize: '13px', color: '#525252' }}>
                            {c.assignedStaffId
                              ? (staffList.find(s => s._id === c.assignedStaffId)?.name || '—')
                              : <span style={{ color: '#C6C6C6' }}>{isMarathi ? 'नियुक्त नाही' : 'Unassigned'}</span>}
                          </td>
                          <td>
                            <span style={{ color: (c.balance || 0) < 0 ? '#DA1E28' : '#24A148', fontWeight: 600 }}>
                              ₹{Math.abs(c.balance || 0).toFixed(0)}
                              {(c.balance || 0) < 0 ? (isMarathi ? ' देणे' : ' due') : (isMarathi ? ' जमा' : ' cr')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-ghost btn-sm"
                                onClick={() => { setEditCustomer(c); setShowModal(true); }}>
                                <Edit2 size={13} />
                              </button>
                              <button
                                className={`btn btn-sm ${c.isActive ? 'btn-danger' : 'btn-success'}`}
                                onClick={() => setConfirmToggle(c)}>
                                {c.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Load More */}
              {hasMore && (
                <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #F4F4F4' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={loadMore}
                    disabled={loadingMore}
                    style={{ minWidth: '140px' }}
                  >
                    {loadingMore
                      ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> {isMarathi ? 'लोड होत आहे...' : 'Loading...'}</>
                      : isMarathi ? `आणखी दाखवा (${total - customers.length} शिल्लक)` : `Load more (${total - customers.length} remaining)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <CustomerModal
          customer={editCustomer}
          staffList={staffList}
          onClose={() => setShowModal(false)}
          onSaved={() => fetchCustomers(true)}
        />
      )}

      {confirmToggle && (
        <ConfirmModal
          title={isMarathi
            ? (confirmToggle.isActive ? 'ग्राहक निष्क्रिय करायचा?' : 'ग्राहक सक्रिय करायचा?')
            : (confirmToggle.isActive ? 'Deactivate Customer?' : 'Activate Customer?')}
          message={isMarathi
            ? `${confirmToggle.name} ला ${confirmToggle.isActive ? 'निष्क्रिय' : 'सक्रिय'} करायचे आहे का?`
            : `Are you sure you want to ${confirmToggle.isActive ? 'deactivate' : 'activate'} ${confirmToggle.name}?`}
          confirmText={isMarathi
            ? (confirmToggle.isActive ? 'निष्क्रिय करा' : 'सक्रिय करा')
            : (confirmToggle.isActive ? 'Deactivate' : 'Activate')}
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

// ── Customer Modal ────────────────────────────────────────────
const CustomerModal = ({ customer, staffList, onClose, onSaved }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState({
    name:            customer?.name || '',
    phone:           customer?.phone || '',
    address:         customer?.address || '',
    morning:         String(customer?.base_requirement?.morning ?? 0),
    evening:         String(customer?.base_requirement?.evening ?? 0),
    default_price:   String(customer?.default_price ?? ''),
    custom_price:    customer?.custom_price != null ? String(customer.custom_price) : '',
    notes:           customer?.notes || '',
    assignedStaffId: customer?.assignedStaffId || '',
    customerCode:    customer?.customerCode ? customer.customerCode.replace(/\D/g, '') : '',
    showCodeToStaff: customer?.showCodeToStaff ?? false,
    onlyQuantityAdding: customer ? (customer?.base_requirement?.morning === 0 && customer?.base_requirement?.evening === 0) : false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  // Custom rate toggle — enabled only when owner explicitly wants to override
  const [useCustomRate, setUseCustomRate] = useState(customer?.custom_price != null);
  const [loadingRate, setLoadingRate] = useState(false);
  const toast = useToast();
  const { isMarathi } = useMarathi();

  const codeRef = useRef(null);
  const nameRef = useRef(null);
  const phoneRef = useRef(null);

  // Fetch default rate on mount (for new customers only)
  useEffect(() => {
    if (!customer) {
      setLoadingRate(true);
      api.get('/owner/default-rate')
        .then(r => {
          if (r.data.current?.rate) {
            setForm(p => ({ ...p, default_price: String(r.data.current.rate) }));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingRate(false));
    }
  }, [customer]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Validate a single field — returns error string or ''
  const validate = (name, value) => {
    if (name === 'name' && !value.trim()) return 'Name is required.';
    if (name === 'phone') {
      if (!value.trim()) return 'Phone is required.';
      if (!/^\d{10}$/.test(value.trim())) return 'Enter a valid 10-digit phone number.';
    }
    if (name === 'default_price') {
      if (value === '') return 'Rate is required.';
      if (isNaN(parseFloat(value)) || parseFloat(value) < 0) return 'Enter a valid rate.';
    }
    if (name === 'custom_price' && value !== '') {
      if (isNaN(parseFloat(value)) || parseFloat(value) < 0) return 'Enter a valid rate or leave blank.';
    }
    if (['morning', 'evening'].includes(name) && value !== '') {
      if (isNaN(parseFloat(value)) || parseFloat(value) < 0) return 'Enter a valid quantity.';
    }
    return '';
  };

  const handleChange = (name, value) => {
    let cleanVal = value;
    if (name === 'customerCode') {
      cleanVal = value.replace(/\D/g, ''); // numeric only
    }
    setForm(p => ({ ...p, [name]: cleanVal }));
    // Clear error as user types
    if (errors[name]) {
      setErrors(p => ({ ...p, [name]: '' }));
    }
  };

  const [canSubmit, setCanSubmit] = useState(true);

  const validatePage1 = () => {
    const newErrors = {};
    ['name', 'phone'].forEach(f => {
      const err = validate(f, form[f]);
      if (err) newErrors[f] = err;
    });
    return newErrors;
  };

  const handleNextPage = () => {
    const newErrors = validatePage1();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setCurrentPage(2);
    // Prevent mobile ghost-clicks from immediately hitting the Save button
    setCanSubmit(false);
    setTimeout(() => setCanSubmit(true), 400);
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

    if (currentPage === 1) {
      handleNextPage();
      return;
    }

    // Validate all required fields
    const newErrors = validatePage1();
    if (currentPage === 2) {
      if (useCustomRate && form.custom_price !== '') {
        const err = validate('custom_price', form.custom_price);
        if (err) newErrors.custom_price = err;
      }
      if (!form.onlyQuantityAdding) {
        ['morning', 'evening'].forEach(f => {
          const err = validate(f, form[f]);
          if (err) newErrors[f] = err;
        });
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name || newErrors.phone) {
        setCurrentPage(1);
      }
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name:             form.name.trim(),
        phone:            form.phone.trim(),
        address:          form.address.trim(),
        base_requirement: {
          morning: form.onlyQuantityAdding ? 0 : (parseFloat(form.morning) || 0),
          evening: form.onlyQuantityAdding ? 0 : (parseFloat(form.evening) || 0)
        },
        default_price: parseFloat(form.default_price) || 0,
        custom_price:  useCustomRate && form.custom_price !== '' ? parseFloat(form.custom_price) : null,
        notes:         form.notes.trim(),
        assignedStaffId: form.assignedStaffId || null,
        customerCode:  form.customerCode.trim() || null,
        showCodeToStaff: form.showCodeToStaff
      };

      if (customer) {
        await api.put(`/owner/customers/${customer._id}`, payload);
        toast.success(isMarathi ? 'ग्राहक अपडेट केला.' : 'Customer updated.');
      } else {
        await api.post('/owner/customers', payload);
        toast.success(isMarathi ? 'ग्राहक जोडला.' : 'Customer added.');
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
        toast.error(errMsg || (isMarathi ? 'ग्राहक जतन करण्यात अयशस्वी.' : 'Failed to save customer.'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Reusable field component
  const Field = ({ label, name, placeholder, required: req, onKeyDown }) => (
    <div className="input-group">
      <label className="input-label">{label}{req && ' *'}</label>
      <input
        type="text"
        inputMode={['morning','evening','default_price','custom_price'].includes(name) ? 'decimal' : 'text'}
        className="input"
        placeholder={placeholder}
        value={form[name]}
        onChange={e => handleChange(name, e.target.value)}
        style={errors[name] ? { borderColor: '#DA1E28' } : {}}
        autoComplete="off"
        onKeyDown={onKeyDown}
      />
      {errors[name] && (
        <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '4px' }}>{errors[name]}</div>
      )}
    </div>
  );

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

        <h2 style={{ fontWeight: 700, marginBottom: '10px', fontSize: '20px', paddingRight: '24px' }}>
          {customer ? (isMarathi ? 'ग्राहक संपादित करा' : 'Edit Customer') : (isMarathi ? 'ग्राहक जोडा' : 'Add Customer')}
        </h2>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '4px', backgroundColor: '#0F62FE' }} />
          <div style={{ flex: 1, height: '4px', backgroundColor: currentPage === 2 ? '#0F62FE' : '#E0E0E0' }} />
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {currentPage === 1 ? (
              /* PAGE 1: customerCode, name, phone */
              <>
                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'ग्राहक कोड (फक्त अंक) *' : 'Customer Code (digits only) *'}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. 101"
                    ref={codeRef}
                    value={form.customerCode}
                    onChange={e => handleChange('customerCode', e.target.value)}
                    autoComplete="off"
                    maxLength={20}
                    onKeyDown={e => handleKeyDownPage1(e, nameRef)}
                    autoFocus
                  />
                  {form.customerCode.trim() && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', cursor: 'pointer', fontSize: '12px', color: '#525252' }}>
                      <input
                        type="checkbox"
                        checked={form.showCodeToStaff}
                        onChange={e => handleChange('showCodeToStaff', e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      {isMarathi ? 'कर्मचाऱ्यांना दाखवा' : 'Show to staff'}
                    </label>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'पूर्ण नाव *' : 'Full Name *'}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ramesh Patel"
                    ref={nameRef}
                    value={form.name}
                    onChange={e => handleChange('name', e.target.value)}
                    style={errors.name ? { borderColor: '#DA1E28' } : {}}
                    autoComplete="off"
                    onKeyDown={e => handleKeyDownPage1(e, phoneRef)}
                  />
                  {errors.name && (
                    <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '4px' }}>{errors.name}</div>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'फोन नंबर *' : 'Phone Number *'}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="9876543210"
                    ref={phoneRef}
                    value={form.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    style={errors.phone ? { borderColor: '#DA1E28' } : {}}
                    autoComplete="off"
                    onKeyDown={e => handleKeyDownPage1(e, null)}
                  />
                  {errors.phone && (
                    <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '4px' }}>{errors.phone}</div>
                  )}
                </div>
              </>
            ) : (
              /* PAGE 2: address, requirements, rates, staff assignment, notes */
              <>
                <Field label={isMarathi ? 'पत्ता' : 'Address'} name="address" placeholder={isMarathi ? 'मुख्य रस्ता, पुणे' : '123 Main Street, Pune'} onKeyDown={handleKeyDownPage2} />

                {/* Regular Quantity toggle (checked by default) */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#161616' }}>
                  <input
                    type="checkbox"
                    checked={!form.onlyQuantityAdding}
                    onChange={e => {
                      const isRegular = e.target.checked;
                      setForm(prev => ({
                        ...prev,
                        onlyQuantityAdding: !isRegular,
                        morning: isRegular ? (prev.morning === '0' ? '1' : prev.morning) : '0',
                        evening: isRegular ? (prev.evening === '0' ? '1' : prev.evening) : '0'
                      }));
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  {isMarathi ? 'नियमित मात्रा (सकाळ / संध्याकाळ निश्चित मात्रा)' : 'Regular Quantity (Enable morning/evening base quantities)'}
                </label>

                {!form.onlyQuantityAdding && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <Field label={isMarathi ? 'सकाळ (लिटर)' : 'Morning (Liters)'} name="morning" placeholder="0" onKeyDown={handleKeyDownPage2} />
                    <Field label={isMarathi ? 'संध्याकाळ (लिटर)' : 'Evening (Liters)'} name="evening" placeholder="0" onKeyDown={handleKeyDownPage2} />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Default rate */}
                  <div className="input-group">
                    <label className="input-label">
                      {isMarathi ? 'डिफॉल्ट दर (₹/ली.)' : 'Default Rate (₹/L)'}
                      <span style={{ fontSize: '10px', color: '#8D8D8D', marginLeft: '6px', fontWeight: 400 }}>
                        {isMarathi ? '(बदलता येत नाही)' : '(read-only)'}
                      </span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={loadingRate ? (isMarathi ? 'लोड होत आहे...' : 'Loading...') : form.default_price}
                      readOnly
                      disabled
                      style={{ backgroundColor: '#F4F4F4', color: '#525252', cursor: 'not-allowed' }}
                    />
                  </div>

                  {/* Custom rate */}
                  <div className="input-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <label className="input-label" style={{ margin: 0 }}>
                        {isMarathi ? 'कस्टम दर (₹/ली.)' : 'Custom Rate (₹/L)'}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: useCustomRate ? '#0F62FE' : '#8D8D8D', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={useCustomRate}
                          onChange={e => {
                            setUseCustomRate(e.target.checked);
                            if (!e.target.checked) handleChange('custom_price', '');
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        {isMarathi ? 'कस्टम दर सेट करा' : 'Set custom rate'}
                      </label>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input"
                      placeholder={useCustomRate ? (isMarathi ? 'उदा. ६५' : 'e.g. 65') : (isMarathi ? 'डिफॉल्ट वापरला जाईल' : 'Default will be used')}
                      value={form.custom_price}
                      onChange={e => handleChange('custom_price', e.target.value)}
                      disabled={!useCustomRate}
                      style={!useCustomRate ? { backgroundColor: '#F4F4F4', color: '#8D8D8D', cursor: 'not-allowed' } : errors.custom_price ? { borderColor: '#DA1E28' } : {}}
                      autoComplete="off"
                      onKeyDown={handleKeyDownPage2}
                    />
                    {errors.custom_price && (
                      <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '4px' }}>{errors.custom_price}</div>
                    )}
                  </div>
                </div>

                {/* Staff assignment */}
                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'नियुक्त कर्मचारी' : 'Assigned Staff'}</label>
                  <select
                    className="input"
                    value={form.assignedStaffId}
                    onChange={e => handleChange('assignedStaffId', e.target.value)}
                    onKeyDown={handleKeyDownPage2}
                  >
                    <option value="">{isMarathi ? '— नियुक्त नाही (सर्व कर्मचारी वितरण करू शकतात) —' : '— Unassigned (all staff can deliver) —'}</option>
                    {staffList.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.phone})</option>
                    ))}
                  </select>
                </div>

                <Field label={isMarathi ? 'नोंदी' : 'Notes'} name="notes" placeholder={isMarathi ? 'कोणत्याही विशेष सूचना...' : 'Any special instructions...'} onKeyDown={handleKeyDownPage2} />
              </>
            )}
          </div>

          <div className="modal-footer">
            {currentPage === 1 ? (
              <>
                <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>{isMarathi ? 'रद्द करा' : 'Cancel'}</button>
                <button type="button" className="btn btn-primary btn-full" onClick={handleNextPage}>
                  {isMarathi ? 'पुढे (Next)' : 'Next'}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-ghost btn-full" onClick={() => setCurrentPage(1)}>{isMarathi ? 'मागे' : 'Back'}</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading || !canSubmit}>
                  {loading ? (isMarathi ? 'जतन होत आहे...' : 'Saving...') : customer ? (isMarathi ? 'अपडेट करा' : 'Update') : (isMarathi ? 'ग्राहक जोडा (Submit)' : 'Save & Submit')}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Customers;
