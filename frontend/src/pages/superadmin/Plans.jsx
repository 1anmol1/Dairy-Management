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
      features: { ...cfg.features },
      limits: {
        maxCustomers: cfg.limits?.maxCustomers ?? (cfg.plan === 'silver' ? 50 : cfg.plan === 'platinum' ? 999999 : 150),
        maxStaff: cfg.limits?.maxStaff ?? (cfg.plan === 'silver' ? 2 : cfg.plan === 'platinum' ? 15 : 5)
      }
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

              {/* Pricing & Limits */}
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
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Max Customers Limit
                    </label>
                    <input
                      type="number" className="input" style={{ height: '36px', fontSize: '13px' }}
                      value={draft.limits?.maxCustomers}
                      onChange={e => setDraft(d => ({
                        ...d,
                        limits: { ...d.limits, maxCustomers: parseInt(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Max Staff Limit
                    </label>
                    <input
                      type="number" className="input" style={{ height: '36px', fontSize: '13px' }}
                      value={draft.limits?.maxStaff}
                      onChange={e => setDraft(d => ({
                        ...d,
                        limits: { ...d.limits, maxStaff: parseInt(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#8D8D8D', textTransform: 'uppercase', fontWeight: 700 }}>Monthly</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>₹{cfg.monthlyPrice}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#8D8D8D', textTransform: 'uppercase', fontWeight: 700 }}>Setup</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>₹{cfg.setupFee}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#8D8D8D', textTransform: 'uppercase', fontWeight: 700 }}>Customers</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{cfg.limits?.maxCustomers === 999999 ? 'Unlimited' : cfg.limits?.maxCustomers}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#8D8D8D', textTransform: 'uppercase', fontWeight: 700 }}>Staff Limit</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{cfg.limits?.maxStaff}</div>
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
  const [planConfigs, setPlanConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const configsRes = await api.get('/superadmin/plan-configs');
      setPlanConfigs(configsRes.data.configs || []);
    } catch {
      toast.error('Failed to load plan configurations.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Plans & Features</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            Edit plan configs and defaults setup (limits and features)
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchConfigs} disabled={loading} title="Refresh">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="page-body">
        {/* ── Plan Config Editor ── */}
        {loading && planConfigs.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading configurations...</div>
        ) : (
          <PlanConfigEditor configs={planConfigs} onUpdated={fetchConfigs} />
        )}
      </div>
    </div>
  );
};

export default Plans;
