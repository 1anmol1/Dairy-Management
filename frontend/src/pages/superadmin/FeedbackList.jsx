import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Star, CheckCircle, Clock, RefreshCw, User, MessageCircle, AlertCircle, Eye } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';

const STATUS_COLORS = {
  pending:   { bg: '#FFF8E1', color: '#B28600', border: '#F1C21B', label: 'Pending', icon: Clock },
  in_review: { bg: '#EDF5FF', color: '#0043CE', border: 'rgba(15,98,254,0.3)', label: 'In Review', icon: Eye },
  resolved:  { bg: '#DEFBE6', color: '#0E6027', border: '#24A148', label: 'Resolved', icon: CheckCircle }
};

const TYPE_COLORS = {
  bug:     { bg: '#FFF1F1', color: '#DA1E28', border: '#DA1E28' },
  feature: { bg: '#E5F6FF', color: '#0053DE', border: 'rgba(0,83,222,0.3)' },
  support: { bg: '#F4F4F4', color: '#525252', border: '#E0E0E0' },
  other:   { bg: '#F4F4F4', color: '#525252', border: '#E0E0E0' }
};

const FeedbackList = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusVal, setStatusVal] = useState('pending');

  const toast = useToast();
  const showSkeleton = useDelayedLoading(loading);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/superadmin/feedback', {
        params: { status: statusFilter || undefined }
      });
      setFeedbacks(data.feedbacks || []);
    } catch {
      toast.error('Failed to load feedbacks.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    setUpdating(true);
    try {
      const { data } = await api.patch(`/superadmin/feedback/${selectedFeedback._id}`, {
        status: statusVal,
        adminNotes
      });
      toast.success('Feedback updated successfully.');
      setFeedbacks(prev => prev.map(f => f._id === selectedFeedback._id ? data.feedback : f));
      setSelectedFeedback(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update feedback.');
    } finally {
      setUpdating(false);
    }
  };

  const openUpdateModal = (feedback) => {
    setSelectedFeedback(feedback);
    setAdminNotes(feedback.adminNotes || '');
    setStatusVal(feedback.status || 'pending');
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Feedbacks & Issues</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            View and manage user-reported feedbacks, issues, and feature requests.
          </div>
        </div>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={fetchFeedbacks}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {['', 'pending', 'in_review', 'resolved'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 14px',
                border: '1px solid #E0E0E0',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: statusFilter === s ? '#161616' : '#FFFFFF',
                color: statusFilter === s ? '#FFFFFF' : '#525252',
                transition: 'all 0.1s'
              }}
            >
              {s === '' ? 'All Statuses' : STATUS_COLORS[s]?.label || s}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 0 }}>
          {showSkeleton ? (
            <div style={{ padding: '16px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ padding: '24px 0', borderBottom: i < 2 ? '1px solid #F4F4F4' : 'none' }}>
                  <div className="skeleton-row" style={{ gap: '8px' }}>
                    <div className="skeleton skeleton-line" style={{ width: '30%' }} />
                    <div className="skeleton skeleton-line-sm" style={{ width: '50%' }} />
                    <div className="skeleton skeleton-line-sm" style={{ width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : loading ? null : feedbacks.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px' }}>
              <div className="empty-state-icon"><MessageSquare size={40} /></div>
              <h3>No feedbacks found</h3>
              <p>User feedback and bug reports will be listed here.</p>
            </div>
          ) : (
            <div>
              {feedbacks.map(fb => {
                const sc = STATUS_COLORS[fb.status] || STATUS_COLORS.pending;
                const tc = TYPE_COLORS[fb.type] || TYPE_COLORS.other;
                const owner = fb.ownerId;

                return (
                  <div key={fb._id} style={{ padding: '24px', borderBottom: '1px solid #E0E0E0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                      
                      {/* Left: Info */}
                      <div style={{ flex: 1, minWidth: '280px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                            backgroundColor: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                            textTransform: 'uppercase'
                          }}>
                            {fb.type}
                          </span>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '6px' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                size={14}
                                fill={star <= fb.rating ? '#F1C21B' : 'transparent'}
                                color={star <= fb.rating ? '#F1C21B' : '#C6C6C6'}
                              />
                            ))}
                          </div>
                        </div>

                        <div style={{ fontSize: '15px', color: '#161616', fontWeight: 600, marginBottom: '8px', lineHeight: 1.4 }}>
                          {fb.feedbackText}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', fontSize: '13px', color: '#525252', marginTop: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={12} color="#8D8D8D" />
                            <strong>{owner?.name || 'Anonymous User'}</strong>
                          </div>
                          {owner?.phone && (
                            <div style={{ fontSize: '13px', color: '#525252' }}>
                              📞 {owner.phone}
                            </div>
                          )}
                          {owner?.businessName && (
                            <div style={{ fontSize: '13px', color: '#525252' }}>
                              🏢 {owner.businessName}
                            </div>
                          )}
                        </div>

                        <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '8px' }}>
                          Submitted: {new Date(fb.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>

                        {fb.adminNotes && (
                          <div style={{
                            backgroundColor: '#F4F4F4',
                            borderLeft: '3px solid #8D8D8D',
                            padding: '8px 12px',
                            fontSize: '12px',
                            color: '#525252',
                            marginTop: '12px',
                            borderRadius: '2px'
                          }}>
                            <strong>Admin Note:</strong> {fb.adminNotes}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openUpdateModal(fb)}
                          style={{ height: '36px', fontSize: '13px' }}
                        >
                          Update Status
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Update Feedback Status Modal */}
      {selectedFeedback && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedFeedback(null)}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#161616', marginBottom: '16px' }}>
              Update Feedback Status
            </h3>
            
            <form onSubmit={handleUpdate}>
              <div className="modal-body" style={{ margin: 0 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#161616', marginBottom: '16px' }}>
                  Update Feedback Status
                </h3>
                
                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <label className="input-label">Status</label>
                  <select
                    className="input"
                    value={statusVal}
                    onChange={e => setStatusVal(e.target.value)}
                    style={{ height: '40px', backgroundColor: '#FFF' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_review">In Review</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: '8px' }}>
                  <label className="input-label">Admin Notes</label>
                  <textarea
                    className="input"
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="e.g. Added to future feature requests backlog, fixed bug in hotfix, etc."
                    style={{ minHeight: '100px', resize: 'vertical', padding: '10px' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-full"
                  onClick={() => setSelectedFeedback(null)}
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackList;
