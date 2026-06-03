import React, { useState, useEffect, useCallback } from 'react';
import { Phone, CheckCircle, X, RefreshCw, MapPin, Mail, Building2, Calculator, Clock, XCircle, AlertCircle, Sparkles, TrendingUp, TrendingDown, Activity, Megaphone } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';
import { PricingCalculatorModal, AddOwnerModal } from './Owners';

const STATUS_COLORS = {
  pending:   { bg: '#FFF8E1', color: '#B28600', border: '#F1C21B', label: 'Pending', icon: Clock },
  called:    { bg: '#EDF5FF', color: '#0043CE', border: 'rgba(15,98,254,0.3)', label: 'Called', icon: Phone },
  activated: { bg: '#DEFBE6', color: '#0E6027', border: '#24A148', label: 'Activated', icon: CheckCircle },
  cancelled: { bg: '#F4F4F4', color: '#8D8D8D', border: '#E0E0E0', label: 'Cancelled', icon: XCircle },
  not_called: { bg: '#FFF1F1', color: '#DA1E28', border: '#DA1E28', label: 'Not Called', icon: AlertCircle }
};

const PLAN_COLORS = {
  silver:   '#8D8D8D',
  gold:     '#D4AF37',
  platinum: '#8A3FFC'
};

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [addOwnerFor, setAddOwnerFor] = useState(null); // prefill data for AddOwnerModal
  const toast = useToast();
  const showSkeleton = useDelayedLoading(loading);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payment/requests', { params: { status: statusFilter || undefined } });
      setRequests(data.requests);
    } catch {
      toast.error('Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const markCalled = async (id) => {
    try {
      await api.patch(`/payment/requests/${id}/status`, { status: 'called' });
      setRequests(prev => prev.map(r => r._id === id ? { ...r, status: 'called' } : r));
      toast.success('Marked as called.');
    } catch {
      toast.error('Failed to update status.');
    }
  };

  const markNotCalled = async (id) => {
    try {
      await api.patch(`/payment/requests/${id}/status`, { status: 'pending' });
      setRequests(prev => prev.map(r => r._id === id ? { ...r, status: 'pending' } : r));
      toast.success('Marked as not called (pending).');
    } catch {
      toast.error('Failed to update status.');
    }
  };

  const activate = async (req) => {
    const id = req._id;
    try {
      const { data } = await api.patch(`/payment/requests/${id}/activate`, {});
      toast.success(data.message || 'Subscription activated.');
      setRequests(prev => prev.map(r => r._id === id ? { ...r, status: 'activated' } : r));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to activate.');
    }
  };

  const cancel = async (id) => {
    try {
      await api.patch(`/payment/requests/${id}/status`, { status: 'cancelled' });
      setRequests(prev => prev.map(r => r._id === id ? { ...r, status: 'cancelled' } : r));
      toast.success('Request cancelled.');
    } catch {
      toast.error('Failed to cancel.');
    }
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription Requests</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            Owners who have requested a subscription — call them and activate
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCalculator(true)}>
            <Calculator size={14} /> Calculator
          </button>
          <button className="btn btn-ghost btn-sm" onClick={fetchRequests}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Status filter */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {['', 'pending', 'called', 'activated', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '6px 14px', border: '1px solid #E0E0E0', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600,
              backgroundColor: statusFilter === s ? '#161616' : '#FFFFFF',
              color: statusFilter === s ? '#FFFFFF' : '#525252',
              transition: 'all 0.1s'
            }}>
              {s === '' ? 'All' : STATUS_COLORS[s]?.label || s}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 0 }}>
          {showSkeleton ? (
            <div style={{ padding: '16px' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ padding: '16px 0', borderBottom: i < 2 ? '1px solid #F4F4F4' : 'none' }}>
                  <div className="skeleton-row" style={{ gap: '8px' }}>
                    <div className="skeleton skeleton-line" style={{ width: '40%' }} />
                    <div className="skeleton skeleton-line-sm" style={{ width: '60%' }} />
                    <div className="skeleton skeleton-line-sm" style={{ width: '30%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : loading ? null : requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Phone size={40} /></div>
              <h3>No {statusFilter || ''} requests</h3>
              <p>Subscription requests from owners will appear here.</p>
            </div>
          ) : (
            <div>
              {requests.map(req => {
                const sc = STATUS_COLORS[req.status] || STATUS_COLORS.pending;
                const owner = req.ownerId;

                return (
                  <div key={req._id} style={{ padding: '20px 24px', borderBottom: '1px solid #E0E0E0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>

                      {/* Left: owner + request info */}
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 700, fontSize: '15px' }}>{owner?.name || req.contactName}</div>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                            backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`
                          }}>
                            {sc.icon && React.createElement(sc.icon, { size: 11 })}
                            {sc.label}
                          </span>
                          <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                            backgroundColor: `${PLAN_COLORS[req.plan]}18`,
                            color: PLAN_COLORS[req.plan],
                            border: `1px solid ${PLAN_COLORS[req.plan]}40`,
                            textTransform: 'capitalize'
                          }}>
                            {req.plan} — {req.billingCycle === 'yearly' ? '12 mo' : `${req.months} mo`}
                          </span>

                          {req.isRenewal ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                              backgroundColor: '#EDF5FF',
                              color: '#0043CE',
                              border: '1px solid rgba(15,98,254,0.3)',
                              textTransform: 'capitalize'
                            }}>
                              <RefreshCw size={11} /> Renewal
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                              backgroundColor: '#E5F6FF',
                              color: '#0053DE',
                              border: '1px solid rgba(0,83,222,0.3)',
                              textTransform: 'capitalize'
                            }}>
                              <Sparkles size={11} /> New Purchase
                            </span>
                          )}

                          {req.isRenewal && req.changeType && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                              backgroundColor: req.changeType === 'upgrade' ? '#DEFBE6' : req.changeType === 'downgrade' ? '#FFF1F1' : '#F4F4F4',
                              color: req.changeType === 'upgrade' ? '#0E6027' : req.changeType === 'downgrade' ? '#DA1E28' : '#525252',
                              border: `1px solid ${req.changeType === 'upgrade' ? '#24A148' : req.changeType === 'downgrade' ? '#DA1E28' : '#E0E0E0'}`,
                              textTransform: 'capitalize'
                            }}>
                              {req.changeType === 'upgrade' ? <TrendingUp size={11} /> : req.changeType === 'downgrade' ? <TrendingDown size={11} /> : <Activity size={11} />}
                              {req.changeType === 'upgrade' ? 'Upgrade' : req.changeType === 'downgrade' ? 'Downgrade' : 'Same Plan'}
                              {req.currentPlan && ` (from ${req.currentPlan})`}
                            </span>
                          )}

                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                            backgroundColor: req.source === 'ads_landing' ? '#FFF3E0' : '#F4F4F4',
                            color: req.source === 'ads_landing' ? '#E65100' : '#525252',
                            border: `1px solid ${req.source === 'ads_landing' ? '#FFB74D' : '#E0E0E0'}`,
                            textTransform: 'uppercase'
                          }}>
                            {req.source === 'ads_landing' ? <><Megaphone size={11} /> Ads Landing</> : `Source: ${req.source || 'organic'}`}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', fontSize: '13px', color: '#525252' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={12} color="#8D8D8D" />
                            <strong style={{ color: '#161616' }}>{req.contactPhone}</strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={12} color="#8D8D8D" />
                            {req.contactEmail}
                          </div>
                          {req.companyName && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Building2 size={12} color="#8D8D8D" />
                              {req.companyName}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={12} color="#8D8D8D" />
                            {req.address}, {req.state} — {req.pincode}
                          </div>
                        </div>

                        <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '8px' }}>
                          Requested: {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {req.adminNotes && (
                          <div style={{ fontSize: '12px', color: '#525252', marginTop: '6px', fontStyle: 'italic' }}>
                            Note: {req.adminNotes}
                          </div>
                        )}
                      </div>

                      {/* Right: actions */}
                      {req.status !== 'activated' && req.status !== 'cancelled' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...(isMobile ? { width: '100%' } : { minWidth: '160px' }) }}>
                          {req.status === 'pending' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => markCalled(req._id)}>
                              <Phone size={13} /> Mark Called
                            </button>
                          )}
                          {req.status === 'called' && (
                            <button className="btn btn-ghost btn-sm" style={{ color: '#DA1E28', borderColor: '#DA1E28' }} onClick={() => markNotCalled(req._id)}>
                              <X size={13} /> Mark Not Called
                            </button>
                          )}

                          {/* Activate — directly opens AddOwnerModal pre-filled with request data */}
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => {
                              setAddOwnerFor({
                                contactName:  req.contactName  || req.ownerId?.name  || '',
                                contactPhone: req.contactPhone || req.ownerId?.phone || '',
                                contactEmail: req.contactEmail || req.ownerId?.email || '',
                                companyName:  req.companyName  || req.ownerId?.businessName || '',
                                plan:         req.plan         || 'gold',
                                billingCycle: req.billingCycle || 'monthly',
                                months:       req.months       || 1,
                                source:       req.source       || 'organic',
                                _requestId:   req._id
                              });
                            }}
                          >
                            <CheckCircle size={13} /> Activate
                          </button>

                          <button
                            className="btn btn-danger btn-sm"
                            style={{ fontSize: '12px' }}
                            onClick={() => cancel(req._id)}
                          >
                            <X size={12} /> Cancel Request
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCalculator && (
        <PricingCalculatorModal
          onClose={() => setShowCalculator(false)}
          onAddOwner={() => setShowCalculator(false)}
          context="requests"
        />
      )}

      {/* Add Owner modal — opens directly on Activate click, pre-filled with request data */}
      {addOwnerFor && (
        <AddOwnerModal
          prefillData={addOwnerFor}
          onClose={() => setAddOwnerFor(null)}
          onCreated={async () => {
            setAddOwnerFor(null);
            // If this came from a request, try to activate it now
            if (addOwnerFor._requestId) {
              try {
                const { data } = await api.patch(`/payment/requests/${addOwnerFor._requestId}/activate`, {});
                toast.success(data.message || 'Owner created and subscription activated.');
              } catch {
                toast.success('Owner account created. Subscription can now be activated.');
              }
            }
            fetchRequests();
          }}
        />
      )}
    </div>
  );
};

export default Requests;
