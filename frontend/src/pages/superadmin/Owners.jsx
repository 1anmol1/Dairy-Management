import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, ToggleLeft, ToggleRight, Settings,
  ChevronDown, ChevronUp, KeyRound, Users, Check, X, RefreshCw, Calculator
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';

const PLANS = ['silver', 'gold', 'platinum'];
const STATUSES = ['trial', 'active', 'inactive', 'expired'];

// Plan → feature matrix (mirrors backend PLAN_FEATURES)
const PLAN_FEATURES = {
  silver:   { whatsapp_alerts: false, pdf_billing: false, advanced_reports: false, custom_message_templates: false },
  gold:     { whatsapp_alerts: true,  pdf_billing: true,  advanced_reports: false, custom_message_templates: false },
  platinum: { whatsapp_alerts: true,  pdf_billing: true,  advanced_reports: true,  custom_message_templates: true  }
};

const PLAN_LIMITS = {
  silver:   { customers: '50', users: '2', billing: 'Manual', support: 'Minimal' },
  gold:     { customers: '150', users: '5', billing: 'Auto', support: 'Standard' },
  platinum: { customers: 'Unlimited', users: '15', billing: 'Auto + Export', support: 'Priority' }
};

const PLAN_COLORS = {
  silver:   { bg: '#F4F4F4', border: '#8D8D8D', text: '#525252', badge: 'badge-gray' },
  gold:     { bg: '#FFF8E1', border: '#D4AF37', text: '#B8860B', badge: 'badge-yellow' },
  platinum: { bg: '#F3F0FF', border: '#8A3FFC', text: '#6929C4', badge: 'badge-blue' }
};

const ALL_FEATURES = [
  { key: 'whatsapp_alerts',          label: 'WhatsApp Alerts' },
  { key: 'pdf_billing',              label: 'PDF Billing' },
  { key: 'advanced_reports',         label: 'Advanced Reports' },
  { key: 'custom_message_templates', label: 'Custom Message Templates' }
];

const Owners = () => {
  const [owners, setOwners] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalPrefill, setAddModalPrefill] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [pwModal, setPwModal] = useState(null);       // { type: 'owner'|'staff', id, name }
  const [staffModal, setStaffModal] = useState(null); // owner object
  const toast = useToast();
  const showSkeleton = useDelayedLoading(loading, 2000);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const [mobileExpandedId, setMobileExpandedId] = useState(null);

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/superadmin/owners', { params });
      setOwners(data.owners);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load owners.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchOwners, 300);
    return () => clearTimeout(t);
  }, [fetchOwners]);

  const toggleAccount = async (owner) => {
    try {
      const { data } = await api.patch(`/superadmin/owners/${owner._id}/toggle`);
      setOwners(prev => prev.map(o => o._id === owner._id ? data.owner : o));
      toast.success(data.message);
    } catch {
      toast.error('Failed to update account.');
    }
  };

  // When plan changes, backend auto-applies features — refresh owner in list
  const updateSubscription = async (ownerId, updates) => {
    try {
      const { data } = await api.patch(`/superadmin/owners/${ownerId}/subscription`, updates);
      setOwners(prev => prev.map(o => o._id === ownerId ? { ...o, ...data.owner } : o));
      toast.success(updates.plan ? `Plan changed to ${updates.plan}. Features updated automatically.` : 'Subscription updated.');
    } catch {
      toast.error('Failed to update subscription.');
    }
  };

  const handleStatusChange = (ownerId, newStatus) => {
    if (newStatus === 'active') {
      const confirmed = window.confirm("Are you sure you want to change status to Active (Paid)? This will activate the paid subscription and trigger the Meta subscribe event (if the user is from ads landing page).");
      if (!confirmed) return;
    }
    updateSubscription(ownerId, { status: newStatus });
  };

  const updateFeatures = async (ownerId, features) => {
    try {
      const { data } = await api.patch(`/superadmin/owners/${ownerId}/features`, { features });
      setOwners(prev => prev.map(o => o._id === ownerId ? { ...o, ...data.owner } : o));
      toast.success('Feature updated.');
    } catch {
      toast.error('Failed to update feature.');
    }
  };

  const statusBadge = (status) => {
    const map = { active: 'badge-green', trial: 'badge-blue', inactive: 'badge-red', expired: 'badge-yellow' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status === 'active' ? 'ACTIVE (PAID)' : status?.toUpperCase()}</span>;
  };

  const planBadge = (plan) => {
    const c = PLAN_COLORS[plan] || PLAN_COLORS.silver;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
        backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`
      }}>
        {plan}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header">
        <h1 className="page-title">
          Owner Accounts <span style={{ color: '#8D8D8D', fontWeight: 400, fontSize: '16px' }}>({total})</span>
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchOwners} disabled={loading} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCalculator(true)}>
            <Calculator size={14} /> Calculator
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setAddModalPrefill(null); setShowAddModal(true); }}>
            <Plus size={16} /> Add Owner
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input
              className="input" style={{ paddingLeft: '36px' }}
              placeholder="Search by name, phone, business..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="input" style={{ width: 'auto', minWidth: '140px' }}
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s === 'active' ? 'Active (Paid)' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        {/* Plan legend */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {PLANS.map(p => {
            const c = PLAN_COLORS[p];
            const lim = PLAN_LIMITS[p];
            return (
              <div key={p} style={{
                border: `1px solid ${c.border}`, backgroundColor: c.bg,
                padding: '10px 16px', fontSize: '12px', minWidth: '160px'
              }}>
                <div style={{ fontWeight: 700, color: c.text, textTransform: 'uppercase', marginBottom: '6px' }}>{p}</div>
                <div style={{ color: '#525252' }}>👥 {lim.customers} customers</div>
                <div style={{ color: '#525252' }}>🧑 {lim.users} users</div>
                <div style={{ color: '#525252' }}>🧾 {lim.billing} billing</div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0 }}>
          {showSkeleton ? (
            <div style={{ padding: '16px' }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', padding: '14px 0', borderBottom: i < 4 ? '1px solid #F4F4F4' : 'none' }}>
                  <div className="skeleton-row" style={{ gap: '6px' }}>
                    <div className="skeleton skeleton-line" style={{ width: '65%' }} />
                    <div className="skeleton skeleton-line-sm" style={{ width: '45%' }} />
                    <div className="skeleton skeleton-line-sm" style={{ width: '55%' }} />
                  </div>
                  {[0,1,2,3,4].map(j => (
                    <div key={j} className="skeleton skeleton-line" style={{ width: '50%' }} />
                  ))}
                </div>
              ))}
            </div>
          ) : loading ? null : owners.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Settings size={40} /></div>
              <h3>No owners found</h3>
              <p>Add your first owner account to get started.</p>
            </div>
          ) : isMobile ? (
            /* Mobile card list */
            <div style={{ padding: '8px' }}>
              {owners.map(owner => {
                const isExpanded = mobileExpandedId === owner._id;
                const planKey = owner.subscription?.plan || 'silver';
                const c = PLAN_COLORS[planKey];
                return (
                  <div key={owner._id} style={{ border: '1px solid #E0E0E0', marginBottom: '8px', backgroundColor: '#FFFFFF' }}>
                    <div
                      onClick={() => setMobileExpandedId(isExpanded ? null : owner._id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{owner.name}</div>
                        <div style={{ fontSize: '12px', color: '#525252', marginTop: '2px' }}>{owner.businessName || owner.phone}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {statusBadge(owner.subscription?.status)}
                        {planBadge(owner.subscription?.plan)}
                        {isExpanded ? <ChevronUp size={16} color="#8D8D8D" /> : <ChevronDown size={16} color="#8D8D8D" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #F4F4F4', padding: '12px 14px', backgroundColor: '#FAFAFA' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '12px' }}>
                          <div><span style={{ color: '#8D8D8D' }}>Phone: </span><strong>{owner.phone}</strong></div>
                          <div><span style={{ color: '#8D8D8D' }}>Customers: </span><strong>{owner.customerCount || 0}</strong></div>
                          {owner.email && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#8D8D8D' }}>Email: </span><strong>{owner.email}</strong></div>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                            onClick={() => setExpandedId(expandedId === owner._id ? null : owner._id)}>
                            <Settings size={13} /> Manage
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                            onClick={() => setPwModal({ type: 'owner', id: owner._id, name: owner.name })}>
                            <KeyRound size={13} /> Reset PW
                          </button>
                          <button className={`btn btn-sm ${owner.isActive ? 'btn-danger' : 'btn-success'}`} style={{ flex: 1 }}
                            onClick={() => toggleAccount(owner)}>
                            {owner.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                        {/* Expanded plan management panel */}
                        {expandedId === owner._id && (
                          <div style={{ marginTop: '12px', backgroundColor: '#F9F9F9', padding: '16px', border: '1px solid #E0E0E0' }}>
                            {/* Plan selector */}
                            <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', color: '#525252' }}>Change Plan</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                              {PLANS.map(p => {
                                const pc = PLAN_COLORS[p];
                                const active = owner.subscription?.plan === p;
                                return (
                                  <button key={p} onClick={() => updateSubscription(owner._id, { plan: p })}
                                    style={{ padding: '6px 12px', border: `2px solid ${active ? pc.border : '#E0E0E0'}`, backgroundColor: active ? pc.bg : '#FFFFFF', color: active ? pc.text : '#525252', fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer' }}>
                                    {p}
                                  </button>
                                );
                              })}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', color: '#525252' }}>Status</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                              {STATUSES.map(s => (
                                <button key={s} className={`btn btn-sm ${owner.subscription?.status === s ? 'btn-dark' : 'btn-ghost'}`}
                                  onClick={() => handleStatusChange(owner._id, s)}>
                                  {s === 'active' ? 'active (paid)' : s}
                                </button>
                              ))}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', color: '#525252' }}>Owner Role</div>
                            <select
                              className="input"
                              style={{ height: '36px', width: '100%', fontSize: '13px', marginBottom: '12px' }}
                              value={owner.ownerRole || 'milk_supplier'}
                              onChange={async (e) => {
                                try {
                                  const newRole = e.target.value;
                                  const { data } = await api.patch(`/superadmin/owners/${owner._id}/role`, { ownerRole: newRole });
                                  setOwners(prev => prev.map(o => o._id === owner._id ? { ...o, ownerRole: data.owner.ownerRole } : o));
                                  toast.success('Owner role updated successfully.');
                                } catch {
                                  toast.error('Failed to update owner role.');
                                }
                              }}
                            >
                              <option value="dairy_owner">Dairy Owner</option>
                              <option value="milk_supplier">Milk Supplier</option>
                            </select>

                            <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', color: '#525252' }}>Manage Limits</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '11px', color: '#525252', display: 'block', marginBottom: '4px' }}>Max Customers</label>
                                <input
                                  type="number"
                                  className="input"
                                  style={{ height: '36px', fontSize: '13px' }}
                                  value={owner.maxCustomers ?? 150}
                                  onChange={async (e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setOwners(prev => prev.map(o => o._id === owner._id ? { ...o, maxCustomers: val } : o));
                                  }}
                                  onBlur={async (e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    try {
                                      await api.patch(`/superadmin/owners/${owner._id}/subscription`, { maxCustomers: val });
                                      toast.success('Customer limit updated.');
                                    } catch {
                                      toast.error('Failed to update customer limit.');
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#525252', display: 'block', marginBottom: '4px' }}>Max Staff</label>
                                <input
                                  type="number"
                                  className="input"
                                  style={{ height: '36px', fontSize: '13px' }}
                                  value={owner.maxStaff ?? 5}
                                  onChange={async (e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setOwners(prev => prev.map(o => o._id === owner._id ? { ...o, maxStaff: val } : o));
                                  }}
                                  onBlur={async (e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    try {
                                      await api.patch(`/superadmin/owners/${owner._id}/subscription`, { maxStaff: val });
                                      toast.success('Staff limit updated.');
                                    } catch {
                                      toast.error('Failed to update staff limit.');
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
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
                    <th>Owner</th>
                    <th>Business</th>
                    <th>Status</th>
                    <th>Plan</th>
                    <th>Customers</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map(owner => (
                    <React.Fragment key={owner._id}>
                      <tr>
                        <td>
                          <div style={{ fontWeight: 600 }}>{owner.name}</div>
                          <div style={{ fontSize: '12px', color: '#8D8D8D' }}>{owner.phone}</div>
                          {owner.email && <div style={{ fontSize: '11px', color: '#8D8D8D' }}>{owner.email}</div>}
                        </td>
                        <td>{owner.businessName || '—'}</td>
                        <td>{statusBadge(owner.subscription?.status)}</td>
                        <td>{planBadge(owner.subscription?.plan)}</td>
                        <td>{owner.customerCount || 0}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost btn-sm"
                              onClick={() => setExpandedId(expandedId === owner._id ? null : owner._id)}
                              title="Manage plan & features">
                              <Settings size={13} />
                              {expandedId === owner._id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                            <button className="btn btn-ghost btn-sm"
                              onClick={() => setPwModal({ type: 'owner', id: owner._id, name: owner.name })}
                              title="Reset password">
                              <KeyRound size={13} />
                            </button>
                            <button className="btn btn-ghost btn-sm"
                              onClick={() => setStaffModal(owner)}
                              title="Manage staff passwords">
                              <Users size={13} />
                            </button>
                            <button
                              className={`btn btn-sm ${owner.isActive ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => toggleAccount(owner)}>
                              {owner.isActive ? <><ToggleRight size={13} /> Disable</> : <><ToggleLeft size={13} /> Enable</>}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded plan + feature panel */}
                      {expandedId === owner._id && (
                        <tr>
                          <td colSpan={6} style={{ backgroundColor: '#F9F9F9', padding: '20px 24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>

                              {/* Plan selector */}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#525252' }}>
                                  Plan — auto-applies features
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                  {PLANS.map(p => {
                                    const c = PLAN_COLORS[p];
                                    const active = owner.subscription?.plan === p;
                                    return (
                                      <button key={p}
                                        onClick={() => updateSubscription(owner._id, { plan: p })}
                                        style={{
                                          padding: '8px 16px', border: `2px solid ${active ? c.border : '#E0E0E0'}`,
                                          backgroundColor: active ? c.bg : '#FFFFFF', color: active ? c.text : '#525252',
                                          fontWeight: active ? 700 : 500, fontSize: '13px', cursor: 'pointer',
                                          textTransform: 'capitalize', transition: 'all 0.1s'
                                        }}>
                                        {p}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Status selector */}
                                <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#525252' }}>
                                  Subscription Status
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {STATUSES.map(s => (
                                    <button key={s}
                                      className={`btn btn-sm ${owner.subscription?.status === s ? 'btn-dark' : 'btn-ghost'}`}
                                      onClick={() => handleStatusChange(owner._id, s)}>
                                      {s === 'active' ? 'active (paid)' : s}
                                    </button>
                                  ))}
                                </div>

                                {/* Owner Role Selector */}
                                <div style={{ fontWeight: 700, fontSize: '12px', marginTop: '16px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#525252' }}>
                                  Owner Role / Business Mode
                                </div>
                                <select
                                  className="input"
                                  style={{ height: '36px', width: '100%', fontSize: '13px', marginBottom: '16px' }}
                                  value={owner.ownerRole || 'milk_supplier'}
                                  onChange={async (e) => {
                                    try {
                                      const newRole = e.target.value;
                                      const { data } = await api.patch(`/superadmin/owners/${owner._id}/role`, { ownerRole: newRole });
                                      setOwners(prev => prev.map(o => o._id === owner._id ? { ...o, ownerRole: data.owner.ownerRole } : o));
                                      toast.success('Owner role updated successfully.');
                                    } catch {
                                      toast.error('Failed to update owner role.');
                                    }
                                  }}
                                >
                                  <option value="dairy_owner">Dairy Owner</option>
                                  <option value="milk_supplier">Milk Supplier</option>
                                </select>

                                {/* Account Limits Selector */}
                                <div style={{ fontWeight: 700, fontSize: '12px', marginTop: '16px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#525252' }}>
                                  Manage Account Limits
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '11px', color: '#525252', display: 'block', marginBottom: '4px' }}>Max Customers (999999 = unlimited)</label>
                                    <input
                                      type="number"
                                      className="input"
                                      style={{ height: '36px', fontSize: '13px' }}
                                      value={owner.maxCustomers ?? 150}
                                      onChange={async (e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setOwners(prev => prev.map(o => o._id === owner._id ? { ...o, maxCustomers: val } : o));
                                      }}
                                      onBlur={async (e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        try {
                                          await api.patch(`/superadmin/owners/${owner._id}/subscription`, { maxCustomers: val });
                                          toast.success('Customer limit updated.');
                                        } catch {
                                          toast.error('Failed to update customer limit.');
                                        }
                                      }}
                                    />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '11px', color: '#525252', display: 'block', marginBottom: '4px' }}>Max Staff</label>
                                    <input
                                      type="number"
                                      className="input"
                                      style={{ height: '36px', fontSize: '13px' }}
                                      value={owner.maxStaff ?? 5}
                                      onChange={async (e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setOwners(prev => prev.map(o => o._id === owner._id ? { ...o, maxStaff: val } : o));
                                      }}
                                      onBlur={async (e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        try {
                                          await api.patch(`/superadmin/owners/${owner._id}/subscription`, { maxStaff: val });
                                          toast.success('Staff limit updated.');
                                        } catch {
                                          toast.error('Failed to update staff limit.');
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Feature flags */}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#525252' }}>
                                  Feature Flags (manual override)
                                </div>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                  {ALL_FEATURES.map(f => {
                                    const planDefault = PLAN_FEATURES[owner.subscription?.plan]?.[f.key];
                                    const current = owner.features?.[f.key];
                                    // treat undefined/null as matching plan default — don't show OVERRIDDEN
                                    const effectiveCurrent = current ?? planDefault;
                                    const overridden = effectiveCurrent !== planDefault;
                                    return (
                                      <div key={f.key} style={{
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between', padding: '8px 12px',
                                        backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0'
                                      }}>
                                        <div>
                                          <span style={{ fontSize: '14px', fontWeight: 500 }}>{f.label}</span>
                                          {overridden && (
                                            <span style={{ fontSize: '10px', color: '#FF832B', marginLeft: '8px', fontWeight: 700 }}>
                                              OVERRIDDEN
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => updateFeatures(owner._id, { [f.key]: !effectiveCurrent })}
                                          style={{
                                            width: '52px', height: '28px', border: 'none', cursor: 'pointer',
                                            backgroundColor: effectiveCurrent ? '#24A148' : '#E0E0E0',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            gap: '4px', fontSize: '11px', fontWeight: 700,
                                            color: effectiveCurrent ? '#FFFFFF' : '#525252', transition: 'background-color 0.15s'
                                          }}>
                                          {effectiveCurrent ? <><Check size={11} /> ON</> : <><X size={11} /> OFF</>}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '8px' }}>
                                  Changing plan resets flags to plan defaults.
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddModal && <AddOwnerModal onClose={() => setShowAddModal(false)} onCreated={fetchOwners} prefillData={addModalPrefill} />}
      {pwModal && <PasswordModal target={pwModal} onClose={() => setPwModal(null)} />}
      {staffModal && <StaffPasswordModal owner={staffModal} onClose={() => setStaffModal(null)} />}
      {showCalculator && (
        <PricingCalculatorModal
          onClose={() => setShowCalculator(false)}
          onAddOwner={(prefill) => { setShowCalculator(false); setAddModalPrefill(prefill); setShowAddModal(true); }}
          context="owners"
        />
      )}
    </div>
  );
};

// ── Add Owner Modal ───────────────────────────────────────────
export const AddOwnerModal = ({ onClose, onCreated, prefillData }) => {
  const [step, setStep] = useState('details'); // 'details' | 'subscription'
  const [form, setForm] = useState({
    name: prefillData?.contactName || '',
    phone: prefillData?.contactPhone || '',
    email: prefillData?.contactEmail || '',
    password: '',
    businessName: prefillData?.companyName || '',
    ownerRole: 'milk_supplier'
  });
  const [sub, setSub] = useState({
    plan: prefillData?.plan || 'gold',
    status: 'trial',
    billingCycle: prefillData?.billingCycle || 'monthly',
    months: prefillData?.months || 1,
    startDate: new Date().toISOString().split('T')[0],
    customEndDate: '',
    useCustomEnd: false,
    amountPaid: '',
    setupFeePaid: '',
    notes: '',
    maxCustomers: prefillData?.plan === 'silver' ? 50 : prefillData?.plan === 'platinum' ? 999999 : 150,
    maxStaff: prefillData?.plan === 'silver' ? 2 : prefillData?.plan === 'platinum' ? 15 : 5
  });
  const [planConfigs, setPlanConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customMonthInput, setCustomMonthInput] = useState(String(prefillData?.months || 1));
  const toast = useToast();

  // Load plan configs for pricing
  useEffect(() => {
    api.get('/superadmin/plan-configs')
      .then(r => setPlanConfigs(r.data.configs || []))
      .catch(() => {});
  }, []);

  const getPlanConfig = (planKey) => planConfigs.find(c => c.plan === planKey);

  // Compute subscription end date based on billing cycle
  const computeEndDate = () => {
    if (sub.useCustomEnd && sub.customEndDate) return sub.customEndDate;
    const start = new Date(sub.startDate);
    if (sub.status === 'trial') {
      start.setDate(start.getDate() + 7);
      return start.toISOString().split('T')[0];
    }
    if (sub.billingCycle === 'yearly') {
      start.setFullYear(start.getFullYear() + 1);
    } else {
      start.setMonth(start.getMonth() + parseInt(sub.months || 1));
    }
    return start.toISOString().split('T')[0];
  };

  const getMonthlyPrice = () => {
    const cfg = getPlanConfig(sub.plan);
    return cfg?.monthlyPrice ?? (sub.plan === 'silver' ? 99 : sub.plan === 'gold' ? 199 : 399);
  };

  const getSetupFee = () => {
    const cfg = getPlanConfig(sub.plan);
    return cfg?.setupFee ?? (sub.plan === 'silver' ? 499 : sub.plan === 'gold' ? 1499 : 1999);
  };

  const computeSubscriptionAmount = () => {
    if (sub.status === 'trial') return 0;
    const monthly = getMonthlyPrice();
    if (sub.billingCycle === 'yearly') {
      return Math.round(monthly * 10); // 2 months free
    }
    return monthly * parseInt(sub.months || 1);
  };

  const totalDue = computeSubscriptionAmount() + getSetupFee();
  const endDate = computeEndDate();

  const validateDetails = () => {
    if (!form.name.trim()) { toast.error('Name is required.'); return false; }
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone.trim())) { toast.error('Valid 10-digit phone number required.'); return false; }
    if (!form.email.trim() || !form.email.includes('@')) { toast.error('Valid email required.'); return false; }
    if (!form.password || form.password.length < 6) { toast.error('Password must be at least 6 characters.'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        plan: sub.plan,
        subscriptionStatus: sub.status,
        billingCycle: sub.billingCycle,
        months: parseInt(sub.months || 1),
        startDate: sub.startDate,
        endDate,
        amountPaid: parseFloat(sub.amountPaid) || 0,
        setupFeePaid: parseFloat(sub.setupFeePaid) || 0,
        notes: sub.notes,
        source: prefillData?.source || 'organic',
        maxCustomers: sub.maxCustomers,
        maxStaff: sub.maxStaff,
      };
      await api.post('/superadmin/owners', payload);
      toast.success('Owner account created.');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create owner.');
    } finally {
      setLoading(false);
    }
  };

  const PLAN_COLORS_LOCAL = {
    silver:   { color: '#8D8D8D', bg: '#F4F4F4', border: '#8D8D8D' },
    gold:     { color: '#B8860B', bg: '#FFF8E1', border: '#D4AF37' },
    platinum: { color: '#6929C4', bg: '#F3F0FF', border: '#8A3FFC' },
  };

  const planFeatures = {
    silver:   ['Up to 50 customers', 'Up to 2 staff', 'Manual billing'],
    gold:     ['Up to 150 customers', 'Up to 5 staff', 'Auto billing', 'WhatsApp alerts', 'PDF bills'],
    platinum: ['Unlimited customers', 'Up to 15 staff', 'All Gold features', 'Advanced reports', 'Data export'],
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '6px', fontSize: '20px' }}>Add Owner Account</h2>
        <p style={{ color: '#525252', fontSize: '13px', marginBottom: '24px' }}>
          {step === 'details' ? 'Step 1 of 2 — Account details' : 'Step 2 of 2 — Subscription & payment'}
        </p>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {['details', 'subscription'].map((s, i) => (
            <div key={s} style={{
              flex: 1, height: '3px',
              backgroundColor: step === s || (step === 'subscription' && i === 0) ? '#0F62FE' : '#E0E0E0',
              transition: 'background-color 0.2s'
            }} />
          ))}
        </div>

        {/* ── Step 1: Account details ── */}
        {step === 'details' && (
          <div>
            {[
              { key: 'name',         label: 'Full Name *',              type: 'text',     placeholder: 'Ramesh Patel' },
              { key: 'phone',        label: 'Phone Number *',           type: 'tel',      placeholder: '9876543210' },
              { key: 'email',        label: 'Email Address *',          type: 'email',    placeholder: 'ramesh@example.com' },
              { key: 'password',     label: 'Password *',               type: 'password', placeholder: 'Min 6 characters' },
              { key: 'businessName', label: 'Business Name (optional)', type: 'text',     placeholder: 'Patel Dairy' }
            ].map(f => (
              <div key={f.key} className="input-group">
                <label className="input-label">{f.label}</label>
                <input type={f.type} className="input" placeholder={f.placeholder}
                  value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: f.key === 'phone' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value }))}
                  required={f.key !== 'businessName'} autoComplete="off"
                  {...(f.key === 'phone' ? { inputMode: 'numeric', maxLength: 10 } : {})} />
              </div>
            ))}
            <div className="input-group">
              <label className="input-label">Owner Role / Business Mode</label>
              <select className="input" value={form.ownerRole}
                onChange={e => setForm(p => ({ ...p, ownerRole: e.target.value }))}>
                <option value="dairy_owner">Dairy Owner</option>
                <option value="milk_supplier">Milk Supplier</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary btn-full"
                onClick={() => { if (validateDetails()) setStep('subscription'); }}>
                Next: Subscription →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Subscription & payment ── */}
        {step === 'subscription' && (
          <div>
            {/* Plan selector */}
            <div style={{ marginBottom: '20px' }}>
              <div className="input-label" style={{ marginBottom: '10px' }}>Select Plan</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {['silver', 'gold', 'platinum'].map(p => {
                  const c = PLAN_COLORS_LOCAL[p];
                  const cfg = getPlanConfig(p);
                  const monthly = cfg?.monthlyPrice ?? (p === 'silver' ? 99 : p === 'gold' ? 199 : 399);
                  const active = sub.plan === p;
                  return (
                    <button key={p} type="button"
                      onClick={() => {
                        const DEFAULT_LIMITS = {
                          silver: { maxCustomers: 50, maxStaff: 2 },
                          gold: { maxCustomers: 150, maxStaff: 5 },
                          platinum: { maxCustomers: 999999, maxStaff: 15 }
                        };
                        const lim = DEFAULT_LIMITS[p];
                        setSub(s => ({ ...s, plan: p, maxCustomers: lim.maxCustomers, maxStaff: lim.maxStaff }));
                      }}
                      style={{
                        border: `2px solid ${active ? c.border : '#E0E0E0'}`,
                        backgroundColor: active ? c.bg : '#FFFFFF',
                        padding: '12px 10px', cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.1s'
                      }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: c.color, textTransform: 'capitalize', marginBottom: '4px' }}>{p}</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#161616' }}>₹{monthly}<span style={{ fontSize: '11px', fontWeight: 400, color: '#525252' }}>/mo</span></div>
                      <div style={{ marginTop: '6px', display: 'grid', gap: '2px' }}>
                        {planFeatures[p].slice(0, 3).map((f, i) => (
                          <div key={i} style={{ fontSize: '10px', color: '#525252' }}>✓ {f}</div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Limits Control */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Max Customers Limit</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 150"
                  value={sub.maxCustomers}
                  onChange={e => setSub(s => ({ ...s, maxCustomers: parseInt(e.target.value) || 0 }))}
                />
                <span style={{ fontSize: '10px', color: '#8D8D8D' }}>Use 999999 for unlimited</span>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Max Staff Limit</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 5"
                  value={sub.maxStaff}
                  onChange={e => setSub(s => ({ ...s, maxStaff: parseInt(e.target.value) || 0 }))}
                />
                <span style={{ fontSize: '10px', color: '#8D8D8D' }}>Default plan limit pre-set</span>
              </div>
            </div>

            {/* Status */}
            <div className="input-group">
              <label className="input-label">Subscription Status</label>
              <select className="input" value={sub.status}
                onChange={e => setSub(s => ({ ...s, status: e.target.value }))}>
                <option value="trial">Trial (7 days free)</option>
                <option value="active">Active (paid)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Billing cycle — only for active */}
            {sub.status === 'active' && (
              <>
                <div className="input-group">
                  <label className="input-label">Billing Cycle</label>
                  <div style={{ display: 'flex', border: '1px solid #E0E0E0', overflow: 'hidden' }}>
                    {[
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'yearly',  label: 'Yearly (2 months free)' }
                    ].map(c => (
                      <button key={c.value} type="button"
                        onClick={() => setSub(s => ({ ...s, billingCycle: c.value }))}
                        style={{
                          flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                          backgroundColor: sub.billingCycle === c.value ? '#161616' : '#FFFFFF',
                          color: sub.billingCycle === c.value ? '#FFFFFF' : '#525252',
                          fontWeight: 600, fontSize: '13px', transition: 'all 0.1s'
                        }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {sub.billingCycle === 'monthly' && (
                  <div className="input-group">
                    <label className="input-label">Number of Months</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {[1, 3, 6, 12].map(m => (
                        <button key={m} type="button"
                          onClick={() => { setSub(s => ({ ...s, months: m })); setCustomMonthInput(String(m)); }}
                          style={{
                            width: '48px', height: '40px',
                            border: `1px solid ${sub.months === m ? '#0F62FE' : '#E0E0E0'}`,
                            backgroundColor: sub.months === m ? '#EDF5FF' : '#FFFFFF',
                            color: sub.months === m ? '#0F62FE' : '#525252',
                            cursor: 'pointer', fontSize: '13px', fontWeight: 600
                          }}>
                          {m}
                        </button>
                      ))}
                      <input
                        type="number"
                        min="1"
                        max="60"
                        className="input"
                        style={{ width: '80px', height: '40px', textAlign: 'center' }}
                        placeholder="Custom"
                        value={customMonthInput}
                        onChange={e => {
                          const val = e.target.value;
                          setCustomMonthInput(val);
                          const n = parseInt(val);
                          if (!isNaN(n) && n >= 1 && n <= 60) {
                            setSub(s => ({ ...s, months: n }));
                          }
                        }}
                        inputMode="numeric"
                      />
                      <span style={{ fontSize: '11px', color: '#8D8D8D' }}>months (1–60)</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Start date */}
            <div className="input-group">
              <label className="input-label">Start Date</label>
              <input type="date" className="input" value={sub.startDate}
                onChange={e => setSub(s => ({ ...s, startDate: e.target.value }))} />
            </div>

            {/* End date — computed or custom */}
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>End Date</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 400, cursor: 'pointer' }}>
                  <input type="checkbox" checked={sub.useCustomEnd}
                    onChange={e => setSub(s => ({ ...s, useCustomEnd: e.target.checked }))} />
                  Custom date
                </label>
              </label>
              {sub.useCustomEnd ? (
                <input type="date" className="input" value={sub.customEndDate}
                  onChange={e => setSub(s => ({ ...s, customEndDate: e.target.value }))} />
              ) : (
                <div style={{
                  height: '44px', padding: '0 12px', border: '1px solid #E0E0E0',
                  backgroundColor: '#F4F4F4', display: 'flex', alignItems: 'center',
                  fontSize: '14px', color: '#525252'
                }}>
                  {endDate} <span style={{ marginLeft: '8px', fontSize: '11px', color: '#8D8D8D' }}>
                    (auto-computed from {sub.status === 'trial' ? '7-day trial' : sub.billingCycle === 'yearly' ? '1 year' : `${sub.months} month${sub.months > 1 ? 's' : ''}`})
                  </span>
                </div>
              )}
            </div>

            {/* Payment summary */}
            <div style={{
              backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0',
              padding: '14px 16px', marginBottom: '16px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Payment Summary
              </div>
              {[
                { label: sub.billingCycle === 'yearly' ? 'Yearly subscription (2 months free)' : `${sub.months} month${sub.months > 1 ? 's' : ''} subscription`, value: sub.status === 'trial' ? '₹0 (trial)' : `₹${computeSubscriptionAmount()}` },
                { label: 'One-time setup fee', value: `₹${getSetupFee()}` },
                { label: 'Total due', value: sub.status === 'trial' ? '₹0' : `₹${totalDue}`, bold: true },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#525252' }}>{r.label}</span>
                  <span style={{ fontWeight: r.bold ? 700 : 600, color: r.bold ? '#0F62FE' : '#161616' }}>{r.value}</span>
                </div>
              ))}
              {sub.billingCycle === 'yearly' && sub.status === 'active' && (
                <div style={{ fontSize: '11px', color: '#24A148', marginTop: '4px', fontWeight: 600 }}>
                  ✓ 2 months free — pay for 10, get 12
                </div>
              )}
            </div>

            {/* Amount paid fields */}
            {sub.status === 'active' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Subscription Paid (₹)</label>
                  <input type="number" className="input" placeholder="0"
                    value={sub.amountPaid} onChange={e => setSub(s => ({ ...s, amountPaid: e.target.value }))} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Setup Fee Paid (₹)</label>
                  <input type="number" className="input" placeholder="0"
                    value={sub.setupFeePaid} onChange={e => setSub(s => ({ ...s, setupFeePaid: e.target.value }))} />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="input-group" style={{ marginTop: '12px' }}>
              <label className="input-label">Admin Notes (optional)</label>
              <input type="text" className="input" placeholder="e.g. Paid via UPI, ref #12345"
                value={sub.notes} onChange={e => setSub(s => ({ ...s, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-ghost btn-full"
                onClick={() => setStep('details')}>
                ← Back
              </button>
              <button type="button" className="btn btn-primary btn-full"
                onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating...' : `Create Account (${sub.status === 'trial' ? 'Trial' : sub.status === 'active' ? 'Paid' : 'Inactive'})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Password Reset Modal (owner or staff) ─────────────────────
const PasswordModal = ({ target, onClose }) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) { toast.error('Passwords do not match.'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    if (newUsername && newUsername.trim().length < 3) { toast.error('Username must be at least 3 characters.'); return; }
    if (!verificationCode.trim()) { toast.error('Verification code is required.'); return; }
    setLoading(true);
    try {
      const url = target.type === 'owner'
        ? `/superadmin/owners/${target.id}/password`
        : `/superadmin/staff/${target.id}/password`;
      await api.patch(url, {
        newPassword,
        verificationCode: verificationCode.trim(),
        ...(newUsername.trim() ? { newUsername: newUsername.trim().toLowerCase() } : {})
      });
      toast.success(`Credentials updated for ${target.name}.`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <KeyRound size={20} color="#0F62FE" />
          <h2 style={{ fontWeight: 700, fontSize: '20px' }}>Reset Credentials</h2>
        </div>
        <p style={{ color: '#525252', fontSize: '14px', marginBottom: '24px' }}>
          Updating credentials for <strong>{target.name}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">New Username (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="Leave blank to keep current"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              autoCapitalize="none"
              autoComplete="off"
            />
            <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '3px' }}>
              Only fill this to change the username.
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">New Password *</label>
            <input type="password" className="input" placeholder="Min 6 characters"
              value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          </div>
          <div className="input-group">
            <label className="input-label">Confirm Password *</label>
            <input type="password" className="input" placeholder="Repeat new password"
              value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          <div className="input-group">
            <label className="input-label">Superadmin Verification Code *</label>
            <input
              type="password"
              className="input"
              placeholder="Enter your verification code"
              value={verificationCode}
              onChange={e => setVerificationCode(e.target.value)}
              autoComplete="off"
              required
            />
            <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '3px' }}>
              Your superadmin login verification code.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Credentials'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Staff Password Manager (list staff under an owner) ────────
const StaffPasswordModal = ({ owner, onClose }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pwTarget, setPwTarget] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.get(`/superadmin/owners/${owner._id}/staff`)
      .then(r => setStaff(r.data.staff))
      .catch(() => toast.error('Failed to load staff.'))
      .finally(() => setLoading(false));
  }, [owner._id]);

  return (
    <>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: '520px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Users size={20} color="#0F62FE" />
            <h2 style={{ fontWeight: 700, fontSize: '20px' }}>Staff — {owner.name}</h2>
          </div>
          <p style={{ color: '#525252', fontSize: '14px', marginBottom: '20px' }}>
            Reset passwords for staff members under this owner.
          </p>

          {loading ? (
            <div style={{ padding: '12px 0' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 2 ? '1px solid #F4F4F4' : 'none' }}>
                  <div className="skeleton-row" style={{ gap: '6px', flex: 1 }}>
                    <div className="skeleton skeleton-line" style={{ width: '50%' }} />
                    <div className="skeleton skeleton-line-sm" style={{ width: '35%' }} />
                  </div>
                  <div className="skeleton skeleton-line" style={{ width: '80px', height: '28px', marginLeft: '16px' }} />
                </div>
              ))}
            </div>
          ) : staff.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#8D8D8D' }}>No staff members found.</div>
          ) : (
            <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
              {staff.map(s => (
                <div key={s._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', border: '1px solid #E0E0E0', backgroundColor: '#FAFAFA'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.name}</div>
                    <div style={{ fontSize: '12px', color: '#8D8D8D' }}>{s.phone}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${s.isActive ? 'badge-green' : 'badge-red'}`}>
                      {s.isActive ? 'Active' : 'Disabled'}
                    </span>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => setPwTarget({ type: 'staff', id: s._id, name: s.name })}>
                      <KeyRound size={13} /> Reset PW
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-dark btn-full" onClick={onClose}>Close</button>
        </div>
      </div>

      {pwTarget && <PasswordModal target={pwTarget} onClose={() => setPwTarget(null)} />}
    </>
  );
};

// ── Pricing Calculator Modal ──────────────────────────────────
export const PricingCalculatorModal = ({ onClose, onAddOwner, context, onViewRequests }) => {
  const [plan, setPlan] = useState('gold');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [months, setMonths] = useState(1);
  const [customMonthInput, setCustomMonthInput] = useState('1');
  const [includeSetup, setIncludeSetup] = useState(true);
  const [planConfigs, setPlanConfigs] = useState([]);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/superadmin/plan-configs')
      .then(r => setPlanConfigs(r.data.configs || []))
      .catch(() => {});
  }, []);

  const getPlanConfig = (planKey) => planConfigs.find(c => c.plan === planKey);

  const getMonthlyPrice = () => {
    const cfg = getPlanConfig(plan);
    return cfg?.monthlyPrice ?? (plan === 'silver' ? 99 : plan === 'gold' ? 199 : 399);
  };

  const getSetupFee = () => {
    const cfg = getPlanConfig(plan);
    return cfg?.setupFee ?? (plan === 'silver' ? 499 : plan === 'gold' ? 1499 : 1999);
  };

  const computeSubscriptionAmount = () => {
    const monthly = getMonthlyPrice();
    if (billingCycle === 'yearly') {
      return Math.round(monthly * 10); // 2 months free
    }
    return monthly * months;
  };

  const subscriptionAmount = computeSubscriptionAmount();
  const setupFee = includeSetup ? getSetupFee() : 0;
  const total = subscriptionAmount + setupFee;

  const PLAN_COLORS_LOCAL = {
    silver:   { color: '#8D8D8D', bg: '#F4F4F4', border: '#8D8D8D' },
    gold:     { color: '#B8860B', bg: '#FFF8E1', border: '#D4AF37' },
    platinum: { color: '#6929C4', bg: '#F3F0FF', border: '#8A3FFC' },
  };

  const planFeatures = {
    silver:   ['Up to 50 customers', 'Up to 2 staff', 'Manual billing'],
    gold:     ['Up to 150 customers', 'Up to 5 staff', 'Auto billing', 'WhatsApp alerts', 'PDF bills'],
    platinum: ['Unlimited customers', 'Up to 15 staff', 'All Gold features', 'Advanced reports', 'Data export'],
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '6px', fontSize: '20px' }}>Pricing Calculator</h2>
        <p style={{ color: '#525252', fontSize: '13px', marginBottom: '24px' }}>
          Calculate subscription costs and add owners with pre-filled plans
        </p>

        {/* Plan selector */}
        <div style={{ marginBottom: '20px' }}>
          <div className="input-label" style={{ marginBottom: '10px' }}>Select Plan</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {['silver', 'gold', 'platinum'].map(p => {
              const c = PLAN_COLORS_LOCAL[p];
              const cfg = getPlanConfig(p);
              const monthly = cfg?.monthlyPrice ?? (p === 'silver' ? 99 : p === 'gold' ? 199 : 399);
              const active = plan === p;
              return (
                <button key={p} type="button"
                  onClick={() => setPlan(p)}
                  style={{
                    border: `2px solid ${active ? c.border : '#E0E0E0'}`,
                    backgroundColor: active ? c.bg : '#FFFFFF',
                    padding: '12px 10px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.1s'
                  }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: c.color, textTransform: 'capitalize', marginBottom: '4px' }}>{p}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#161616' }}>₹{monthly}<span style={{ fontSize: '11px', fontWeight: 400, color: '#525252' }}>/mo</span></div>
                  <div style={{ marginTop: '6px', display: 'grid', gap: '2px' }}>
                    {planFeatures[p].slice(0, 3).map((f, i) => (
                      <div key={i} style={{ fontSize: '10px', color: '#525252' }}>✓ {f}</div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Billing cycle */}
        <div className="input-group">
          <label className="input-label">Billing Cycle</label>
          <div style={{ display: 'flex', border: '1px solid #E0E0E0', overflow: 'hidden' }}>
            {[
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly',  label: 'Yearly (2 months free)' }
            ].map(c => (
              <button key={c.value} type="button"
                onClick={() => setBillingCycle(c.value)}
                style={{
                  flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                  backgroundColor: billingCycle === c.value ? '#161616' : '#FFFFFF',
                  color: billingCycle === c.value ? '#FFFFFF' : '#525252',
                  fontWeight: 600, fontSize: '13px', transition: 'all 0.1s'
                }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom month input */}
        {billingCycle === 'monthly' && (
          <div className="input-group">
            <label className="input-label">Number of Months</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {[1, 3, 6, 12].map(m => (
                <button key={m} type="button"
                  onClick={() => { setMonths(m); setCustomMonthInput(String(m)); }}
                  style={{
                    width: '48px', height: '40px',
                    border: `1px solid ${months === m ? '#0F62FE' : '#E0E0E0'}`,
                    backgroundColor: months === m ? '#EDF5FF' : '#FFFFFF',
                    color: months === m ? '#0F62FE' : '#525252',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 600
                  }}>
                  {m}
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="60"
                className="input"
                style={{ width: '80px', height: '40px', textAlign: 'center' }}
                placeholder="Custom"
                value={customMonthInput}
                onChange={e => {
                  const val = e.target.value;
                  setCustomMonthInput(val);
                  const n = parseInt(val);
                  if (!isNaN(n) && n >= 1 && n <= 60) {
                    setMonths(n);
                  }
                }}
                inputMode="numeric"
              />
              <span style={{ fontSize: '11px', color: '#8D8D8D' }}>months (1–60)</span>
            </div>
          </div>
        )}

        {/* Include setup fee checkbox */}
        <div className="input-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeSetup} onChange={e => setIncludeSetup(e.target.checked)} />
            Include Setup Fee (₹{getSetupFee()})
          </label>
          <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '4px', marginLeft: '24px' }}>
            Typically charged for new owners
          </div>
        </div>

        {/* Payment summary */}
        <div style={{
          backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0',
          padding: '16px 20px', marginBottom: '20px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            Payment Summary
          </div>
          {[
            { label: billingCycle === 'yearly' ? 'Yearly subscription (2 months free)' : `${months} month${months > 1 ? 's' : ''} subscription`, value: `₹${subscriptionAmount}` },
            ...(includeSetup ? [{ label: 'One-time setup fee', value: `₹${setupFee}` }] : []),
            { label: 'Total', value: `₹${total}`, bold: true },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span style={{ color: '#525252' }}>{r.label}</span>
              <span style={{ fontWeight: r.bold ? 700 : 600, color: r.bold ? '#0F62FE' : '#161616' }}>{r.value}</span>
            </div>
          ))}
          {billingCycle === 'yearly' && (
            <div style={{ fontSize: '11px', color: '#24A148', marginTop: '4px', fontWeight: 600 }}>
              ✓ 2 months free — pay for 10, get 12
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className="btn btn-primary btn-full"
            onClick={() => {
              onAddOwner({
                plan,
                billingCycle,
                months: billingCycle === 'yearly' ? 12 : months
              });
            }}
          >
            Add Owner with this plan →
          </button>
          <button className="btn btn-ghost btn-full" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Owners;
