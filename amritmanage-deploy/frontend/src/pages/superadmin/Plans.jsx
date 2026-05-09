import React, { useState, useEffect, useCallback } from 'react';
import {
  Check, X, Users, CreditCard, Zap, Star, Edit2, Save,
  ChevronDown, ChevronUp, KeyRound, ToggleLeft, ToggleRight, Info, RefreshCw
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';

// ── Static display info (colors, icons) ──────────────────────
const PLAN_DISPLAY = {
  silver:   { color: '#8D8D8D', bg: '#F4F4F4', border: '#8D8D8D', icon: CreditCard, label: 'Silver' },
  gold:     { color: '#D4AF37', bg: '#FFF8E1', border: '#D4AF37', icon: Star,       label: 'Gold ⭐', recommended: true },
  platinum: { color: '#8A3FFC', bg: '#F3F0FF', border: '#8A3FFC', icon: Zap,        label: 'Platinum' }
};

const ALL_FEATURES = [
  { key: 'whatsapp_alerts',          label: 'WhatsApp Alerts',           desc: 'Send delivery alerts & bills via WhatsApp' },
  { key: 'pdf_billing',              label: 'PDF Billing',               desc: 'Generate and share PDF bills' },
  { key: 'advanced_reports',         label: 'Advanced Reports',          desc: 'Monthly trends, insights, data export' },
  { key: 'custom_message_templates', label: 'Custom Message Templates',  desc: 'Create and manage custom WhatsApp message templates' }
];

const STATUSES = ['trial', 'active', 'inactive', 'expired'];

// ── Plan Config Editor ────────────────────────────────────────
const PlanConfigEditor = ({ configs, onUpdated }) => {
  const [editing, setEditing] = useState(null); // plan key being edited
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const startEdit = (cfg) => {
    setEditing(cfg.plan);
    setDraft({
      monthlyPrice: cfg.monthlyPrice,
      setupFee: cfg.setupFee,
      description: cfg.description,
      features: { ...cfg.features }
    });
  };

  const cancelEdit = () => { setEditing(null); setDraft({}); };

  const saveEdit = async (plan) => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/superadmin/plan-configs/${plan}`, draft);
      toast.success(data.notice || 'Plan config updated.');
      onUpdated();
      setEditing(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update plan config.');
    } finally {
      setSaving(false);
    }
  };

  if (!configs || configs.length === 0) {
    return (
      <div style={{
        backgroundColor: '#FFF8E1', border: '1px solid #F1C21B',
        padding: '14px 20px', marginBottom: '28px', fontSize: '13px', color: '#B28600'
      }}>
        ⚠️ Plan configs not seeded yet. Run: <code>node backend/scripts/seedPlanConfigs.js</code>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Plan Configuration</h2>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          backgroundColor: '#EDF5FF', border: '1px solid rgba(15,98,254,0.2)',
          padding: '4px 10px', fontSize: '11px', color: '#0043CE'
        }}>
          <Info size={11} />
          Changes apply to new/renewing subscribers only — existing users keep their current features
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {configs.map(cfg => {
          const display = PLAN_DISPLAY[cfg.plan] || PLAN_DISPLAY.silver;
          const Icon = display.icon;
          const isEditing = editing === cfg.plan;

          return (
            <div key={cfg.plan} style={{
              border: `2px solid ${isEditing ? display.color : display.border}`,
              backgroundColor: isEditing ? display.bg : '#FFFFFF',
              padding: '20px',
              maxWidth: '100%',
              transition: 'border-color 0.15s, background-color 0.15s'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon size={18} color={display.color} />
                  <span style={{ fontWeight: 700, fontSize: '15px', color: display.color }}>
                    {display.label}
                  </span>
                  {display.recommended && (
                    <span style={{
                      fontSize: '9px', fontWeight: 700, backgroundColor: display.color,
                      color: '#FFFFFF', padding: '1px 6px', textTransform: 'uppercase'
                    }}>POPULAR</span>
                  )}
                </div>
                {!isEditing ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ height: '28px', padding: '0 10px', fontSize: '12px' }}
                    onClick={() => startEdit(cfg)}
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ height: '28px', padding: '0 10px', fontSize: '12px' }}
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ height: '28px', padding: '0 10px', fontSize: '12px' }}
                      onClick={() => saveEdit(cfg.plan)}
                      disabled={saving}
                    >
                      <Save size={12} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {/* Pricing */}
              {isEditing ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Monthly (₹)
                    </label>
                    <input
                      type="number" className="input" style={{ height: '36px', fontSize: '13px' }}
                      value={draft.monthlyPrice}
                      onChange={e => setDraft(d => ({ ...d, monthlyPrice: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Setup Fee (₹)
                    </label>
                    <input
                      type="number" className="input" style={{ height: '36px', fontSize: '13px' }}
                      value={draft.setupFee}
                      onChange={e => setDraft(d => ({ ...d, setupFee: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#8D8D8D', textTransform: 'uppercase', fontWeight: 700 }}>Monthly</div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>₹{cfg.monthlyPrice}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#8D8D8D', textTransform: 'uppercase', fontWeight: 700 }}>Setup</div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>₹{cfg.setupFee}</div>
                  </div>
                </div>
              )}

              {/* Features */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', marginBottom: '8px' }}>
                Features
              </div>
              <div style={{ display: 'grid', gap: '6px' }}>
                {ALL_FEATURES.map(f => {
                  const enabled = isEditing ? draft.features?.[f.key] : cfg.features?.[f.key];
                  return (
                    <div key={f.key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: isEditing ? '#FFFFFF' : (enabled ? '#F6FEF9' : '#FAFAFA'),
                      border: `1px solid ${enabled ? '#24A14830' : '#E0E0E0'}`
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{f.label}</div>
                        <div style={{ fontSize: '10px', color: '#8D8D8D' }}>{f.desc}</div>
                      </div>
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => setDraft(d => ({
                            ...d,
                            features: { ...d.features, [f.key]: !d.features[f.key] }
                          }))}
                          style={{
                            minWidth: '52px', height: '26px', border: 'none', cursor: 'pointer',
                            backgroundColor: enabled ? '#24A148' : '#E0E0E0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '3px', fontSize: '10px', fontWeight: 700,
                            color: enabled ? '#FFFFFF' : '#525252',
                            transition: 'background-color 0.15s', flexShrink: 0
                          }}
                        >
                          {enabled ? <><Check size={10} /> ON</> : <><X size={10} /> OFF</>}
                        </button>
                      ) : (
                        <span style={{
                          fontSize: '11px', fontWeight: 700,
                          color: enabled ? '#24A148' : '#8D8D8D'
                        }}>
                          {enabled ? '✓ ON' : '✗ OFF'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Last updated */}
              {cfg.updatedAt && (
                <div style={{ fontSize: '10px', color: '#8D8D8D', marginTop: '10px' }}>
                  Last updated: {new Date(cfg.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main Plans Page ───────────────────────────────────────────
const Plans = () => {
  const [owners, setOwners] = useState([]);
  const [planConfigs, setPlanConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [pwModal, setPwModal] = useState(null);
  const toast = useToast();
  const showSkeleton = useDelayedLoading(loading, 2000);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const [ownersRes, configsRes] = await Promise.all([
        api.get('/superadmin/owners', { params }),
        api.get('/superadmin/plan-configs').catch(() => ({ data: { configs: [] } }))
      ]);
      setOwners(ownersRes.data.owners);
      setPlanConfigs(configsRes.data.configs || []);
    } catch {
      toast.error('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchAll, 300);
    return () => clearTimeout(t);
  }, [fetchAll]);

  // Get plan features from live config (falls back to hardcoded)
  const getPlanFeatures = (planKey) => {
    const cfg = planConfigs.find(c => c.plan === planKey);
    if (cfg) return cfg.features;
    // Fallback
    const fallback = {
      silver:   { whatsapp_alerts: false, pdf_billing: false, advanced_reports: false },
      gold:     { whatsapp_alerts: true,  pdf_billing: true,  advanced_reports: false },
      platinum: { whatsapp_alerts: true,  pdf_billing: true,  advanced_reports: true  }
    };
    return fallback[planKey] || {};
  };

  const updateSubscription = async (ownerId, updates) => {
    try {
      const { data } = await api.patch(`/superadmin/owners/${ownerId}/subscription`, updates);
      setOwners(prev => prev.map(o => o._id === ownerId ? { ...o, ...data.owner } : o));
      toast.success(updates.plan ? `Plan changed to ${updates.plan}.` : 'Subscription updated.');
    } catch {
      toast.error('Failed to update subscription.');
    }
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

  const toggleAccount = async (owner) => {
    try {
      const { data } = await api.patch(`/superadmin/owners/${owner._id}/toggle`);
      setOwners(prev => prev.map(o => o._id === owner._id ? data.owner : o));
      toast.success(data.message);
    } catch {
      toast.error('Failed to update account.');
    }
  };

  const statusBadge = (status) => {
    const map = { active: 'badge-green', trial: 'badge-blue', inactive: 'badge-red', expired: 'badge-yellow' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status?.toUpperCase()}</span>;
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Plans & Features</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            Edit plan configs and manage owner assignments
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchAll} disabled={loading} title="Refresh">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="page-body">
        {/* ── Plan Config Editor ── */}
        <PlanConfigEditor configs={planConfigs} onUpdated={fetchAll} />

        {/* ── Owner plan management ── */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            className="input" style={{ flex: 1, minWidth: '200px' }}
            placeholder="Search owners..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <select className="input" style={{ width: 'auto', minWidth: '140px' }}
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E0E0E0', fontWeight: 700, fontSize: '14px' }}>
            Owner Plan Assignments
          </div>

          {showSkeleton ? (
            <div style={{ padding: '16px' }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < 3 ? '1px solid #F4F4F4' : 'none', flexWrap: 'wrap', gap: '12px' }}>
                  <div className="skeleton-row" style={{ gap: '6px', flex: 1, minWidth: '200px' }}>
                    <div className="skeleton skeleton-line" style={{ width: '55%' }} />
                    <div className="skeleton skeleton-line-sm" style={{ width: '40%' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="skeleton skeleton-line" style={{ width: '80px', height: '32px' }} />
                    <div className="skeleton skeleton-line" style={{ width: '80px', height: '32px' }} />
                    <div className="skeleton skeleton-line" style={{ width: '90px', height: '32px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : loading ? null : owners.length === 0 ? (
            <div className="empty-state"><h3>No owners found</h3></div>
          ) : (
            <div>
              {isMobile ? (
                <div style={{ padding: '8px' }}>
                  {owners.map(owner => {
                    const planKey = owner.subscription?.plan || 'silver';
                    const display = PLAN_DISPLAY[planKey] || PLAN_DISPLAY.silver;
                    const isExpanded = expandedId === owner._id;
                    return (
                      <div key={owner._id} style={{ border: '1px solid #E0E0E0', marginBottom: '8px', backgroundColor: '#FFFFFF' }}>
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : owner._id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{owner.name}</div>
                            <div style={{ fontSize: '12px', color: '#525252' }}>{owner.businessName || owner.phone}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {statusBadge(owner.subscription?.status)}
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', backgroundColor: display.bg, color: display.color, border: `1px solid ${display.border}` }}>
                              {display.label}
                            </span>
                            {isExpanded ? <ChevronUp size={16} color="#8D8D8D" /> : <ChevronDown size={16} color="#8D8D8D" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #F4F4F4', padding: '14px', backgroundColor: '#FAFAFA' }}>
                            {/* Plan selector */}
                            <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', color: '#525252' }}>Change Plan</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                              {Object.entries(PLAN_DISPLAY).map(([key, info]) => {
                                const active = owner.subscription?.plan === key;
                                return (
                                  <button key={key} onClick={() => updateSubscription(owner._id, { plan: key })}
                                    style={{ padding: '6px 14px', border: `2px solid ${active ? info.border : '#E0E0E0'}`, backgroundColor: active ? info.bg : '#FFFFFF', color: active ? info.color : '#525252', fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer' }}>
                                    {info.label}
                                  </button>
                                );
                              })}
                            </div>
                            {/* Status */}
                            <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', color: '#525252' }}>Status</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                              {STATUSES.map(s => (
                                <button key={s} className={`btn btn-sm ${owner.subscription?.status === s ? 'btn-dark' : 'btn-ghost'}`}
                                  onClick={() => updateSubscription(owner._id, { status: s })}>
                                  {s}
                                </button>
                              ))}
                            </div>
                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                                onClick={() => setPwModal({ type: 'owner', id: owner._id, name: owner.name })}>
                                <KeyRound size={13} /> Reset PW
                              </button>
                              <button className={`btn btn-sm ${owner.isActive ? 'btn-danger' : 'btn-success'}`} style={{ flex: 1 }}
                                onClick={() => toggleAccount(owner)}>
                                {owner.isActive ? 'Disable' : 'Enable'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  {owners.map(owner => {
                    const planKey = owner.subscription?.plan || 'silver';
                    const display = PLAN_DISPLAY[planKey] || PLAN_DISPLAY.silver;
                    const isExpanded = expandedId === owner._id;

                    return (
                      <div key={owner._id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 20px', flexWrap: 'wrap', gap: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '200px' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '14px' }}>{owner.name}</div>
                              <div style={{ fontSize: '12px', color: '#8D8D8D' }}>
                                {owner.businessName || owner.phone}
                              </div>
                            </div>
                            {statusBadge(owner.subscription?.status)}
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                              backgroundColor: display.bg, color: display.color,
                              border: `1px solid ${display.border}`
                            }}>
                              {display.label}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost btn-sm"
                              onClick={() => setPwModal({ type: 'owner', id: owner._id, name: owner.name })}>
                              <KeyRound size={13} /> Reset PW
                            </button>
                            <button
                              className={`btn btn-sm ${owner.isActive ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => toggleAccount(owner)}>
                              {owner.isActive ? <><ToggleRight size={13} /> Disable</> : <><ToggleLeft size={13} /> Enable</>}
                            </button>
                            <button className="btn btn-ghost btn-sm"
                              onClick={() => setExpandedId(isExpanded ? null : owner._id)}>
                              Manage {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ backgroundColor: '#F9F9F9', padding: '20px 24px', borderTop: '1px solid #E0E0E0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
                              {/* Plan selector */}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#525252' }}>
                                  Change Plan
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                  {Object.entries(PLAN_DISPLAY).map(([key, info]) => {
                                    const active = owner.subscription?.plan === key;
                                    return (
                                      <button key={key}
                                        onClick={() => updateSubscription(owner._id, { plan: key })}
                                        style={{
                                          padding: '8px 16px',
                                          border: `2px solid ${active ? info.border : '#E0E0E0'}`,
                                          backgroundColor: active ? info.bg : '#FFFFFF',
                                          color: active ? info.color : '#525252',
                                          fontWeight: active ? 700 : 500,
                                          fontSize: '13px', cursor: 'pointer',
                                          textTransform: 'capitalize', transition: 'all 0.1s'
                                        }}>
                                        {info.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#525252' }}>
                                  Subscription Status
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {STATUSES.map(s => (
                                    <button key={s}
                                      className={`btn btn-sm ${owner.subscription?.status === s ? 'btn-dark' : 'btn-ghost'}`}
                                      onClick={() => updateSubscription(owner._id, { status: s })}>
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Per-owner feature overrides */}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#525252' }}>
                                  Feature Flags (per-owner override)
                                </div>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                  {ALL_FEATURES.map(f => {
                                    const planDefault = getPlanFeatures(owner.subscription?.plan)?.[f.key];
                                    const current = owner.features?.[f.key];
                                    const overridden = current !== planDefault;
                                    return (
                                      <div key={f.key} style={{
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between', padding: '10px 14px',
                                        backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0'
                                      }}>
                                        <div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{f.label}</span>
                                            {overridden && (
                                              <span style={{ fontSize: '10px', color: '#FF832B', fontWeight: 700 }}>OVERRIDDEN</span>
                                            )}
                                          </div>
                                          <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '2px' }}>{f.desc}</div>
                                        </div>
                                        <button
                                          onClick={() => updateFeatures(owner._id, { [f.key]: !current })}
                                          style={{
                                            minWidth: '60px', height: '30px', border: 'none', cursor: 'pointer',
                                            backgroundColor: current ? '#24A148' : '#E0E0E0',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            gap: '4px', fontSize: '11px', fontWeight: 700,
                                            color: current ? '#FFFFFF' : '#525252',
                                            transition: 'background-color 0.15s', flexShrink: 0
                                          }}>
                                          {current ? <><Check size={11} /> ON</> : <><X size={11} /> OFF</>}
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
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {pwModal && <PasswordModal target={pwModal} onClose={() => setPwModal(null)} />}
    </div>
  );
};

// ── Password Reset Modal ──────────────────────────────────────
const PasswordModal = ({ target, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) { toast.error('Passwords do not match.'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    if (!verificationCode.trim()) { toast.error('Verification code is required.'); return; }
    setLoading(true);
    try {
      const url = target.type === 'owner'
        ? `/superadmin/owners/${target.id}/password`
        : `/superadmin/staff/${target.id}/password`;
      await api.patch(url, { newPassword, verificationCode: verificationCode.trim() });
      toast.success(`Password updated for ${target.name}.`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <KeyRound size={20} color="#0F62FE" />
          <h2 style={{ fontWeight: 700, fontSize: '20px' }}>Reset Password</h2>
        </div>
        <p style={{ color: '#525252', fontSize: '14px', marginBottom: '24px' }}>
          Setting new password for <strong>{target.name}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">New Password</label>
            <input type="password" className="input" placeholder="Min 6 characters"
              value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          </div>
          <div className="input-group">
            <label className="input-label">Confirm Password</label>
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
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Plans;
