/**
 * Activities — /app/superadmin/activities
 * Security & auth event log: logins, logouts, password resets, failures.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Filter, X, ShieldAlert, LogIn, LogOut, KeyRound, AlertTriangle, Lock } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';

// ── Event metadata ────────────────────────────────────────────
const EVENT_META = {
  login_success:             { label: 'Login',           color: '#24A148', bg: '#DEFBE6', icon: LogIn },
  login_failure:             { label: 'Login Failed',    color: '#DA1E28', bg: '#FFF1F1', icon: AlertTriangle },
  logout:                    { label: 'Logout',          color: '#525252', bg: '#F4F4F4', icon: LogOut },
  password_reset_request:    { label: 'Reset Requested', color: '#FF832B', bg: '#FFF3E0', icon: KeyRound },
  password_reset_success:    { label: 'Password Reset',  color: '#0F62FE', bg: '#EDF5FF', icon: KeyRound },
  password_change:           { label: 'Password Changed',color: '#8A3FFC', bg: '#F3F0FF', icon: KeyRound },
  account_disabled:          { label: 'Account Disabled',color: '#DA1E28', bg: '#FFF1F1', icon: Lock },
  invalid_verification_code: { label: 'Bad Verify Code', color: '#DA1E28', bg: '#FFF1F1', icon: ShieldAlert },
};

const ROLE_COLORS = {
  superadmin: { color: '#DA1E28', bg: '#FFF1F1' },
  owner:      { color: '#0F62FE', bg: '#EDF5FF' },
  staff:      { color: '#24A148', bg: '#DEFBE6' },
  unknown:    { color: '#8D8D8D', bg: '#F4F4F4' },
};

const EventBadge = ({ event }) => {
  const meta = EVENT_META[event] || { label: event, color: '#525252', bg: '#F4F4F4', icon: ShieldAlert };
  const Icon = meta.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', fontSize: '11px', fontWeight: 700,
      backgroundColor: meta.bg, color: meta.color,
      textTransform: 'uppercase', letterSpacing: '0.4px'
    }}>
      <Icon size={10} /> {meta.label}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  const c = ROLE_COLORS[role] || ROLE_COLORS.unknown;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', fontSize: '10px', fontWeight: 700,
      backgroundColor: c.bg, color: c.color,
      textTransform: 'uppercase', letterSpacing: '0.4px'
    }}>
      {role || 'unknown'}
    </span>
  );
};

const formatTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
};

// ── Main Activities page ──────────────────────────────────────
const Activities = () => {
  const toast = useToast();

  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);

  // Filters
  const [filterEvent,    setFilterEvent]    = useState('');
  const [filterRole,     setFilterRole]     = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');

  const showSkeleton = useDelayedLoading(loading);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const LIMIT = 50;

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEvent)    params.set('event',    filterEvent);
      if (filterRole)     params.set('role',     filterRole);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo)   params.set('dateTo',   filterDateTo);
      params.set('page',  p);
      params.set('limit', LIMIT);

      const { data } = await api.get(`/superadmin/auth-logs?${params}`);
      setLogs(data.logs);
      setTotal(data.total);
      setPage(p);
    } catch {
      toast.error('Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  }, [filterEvent, filterRole, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const totalPages = Math.ceil(total / LIMIT);
  const hasFilters = filterEvent || filterRole || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setFilterEvent('');
    setFilterRole('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Summary counts by event type
  const counts = logs.reduce((acc, l) => {
    acc[l.event] = (acc[l.event] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Activity Log</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            Login, logout, password reset and security events
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => fetchLogs(page)} disabled={loading}>
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '16px 20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={12} /> Filters
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>

            {/* Event type */}
            <div>
              <div style={{ fontSize: '11px', color: '#525252', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Event</div>
              <select className="input" style={{ width: '180px', height: '44px' }}
                value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
                <option value="">All events</option>
                {Object.entries(EVENT_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div>
              <div style={{ fontSize: '11px', color: '#525252', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Role</div>
              <select className="input" style={{ width: '140px', height: '44px' }}
                value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="">All roles</option>
                <option value="superadmin">Superadmin</option>
                <option value="owner">Owner</option>
                <option value="staff">Staff</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            {/* Date range */}
            <div>
              <div style={{ fontSize: '11px', color: '#525252', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Date range</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="date" className="input" style={{ width: '150px', height: '44px' }}
                  value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                <span style={{ color: '#8D8D8D', fontSize: '13px' }}>to</span>
                <input type="date" className="input" style={{ width: '150px', height: '44px' }}
                  value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
              </div>
            </div>

            {hasFilters && (
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }} onClick={clearFilters}>
                <X size={13} /> Clear
              </button>
            )}
          </div>
        </div>
        </div>

        {/* Summary chips */}
        {!loading && logs.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div className="stat-card" style={{ padding: '12px 20px', flex: 'none' }}>
              <div className="stat-label">Total Events</div>
              <div className="stat-value" style={{ fontSize: '22px' }}>{total}</div>
            </div>
            {Object.entries(counts).map(([evt, cnt]) => {
              const meta = EVENT_META[evt];
              if (!meta) return null;
              return (
                <div key={evt} style={{
                  padding: '10px 16px', border: `1px solid ${meta.color}40`,
                  backgroundColor: meta.bg, display: 'flex', flexDirection: 'column', gap: '2px',
                  cursor: 'pointer', transition: 'opacity 0.1s'
                }}
                  onClick={() => setFilterEvent(evt === filterEvent ? '' : evt)}
                  title={`Filter by: ${meta.label}`}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{meta.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: meta.color, lineHeight: 1 }}>{cnt}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table */}
        <div className="card" style={{ padding: 0 }}>
          {showSkeleton ? (
            <div style={{ padding: '16px' }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 2fr', gap: '12px', padding: '14px 0', borderBottom: i < 4 ? '1px solid #F4F4F4' : 'none' }}>
                  {[0,1,2,3,4].map(j => <div key={j} className="skeleton skeleton-line" style={{ width: '70%' }} />)}
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><ShieldAlert size={40} /></div>
              <h3>No activity logs found</h3>
              <p>Events will appear here as users log in, reset passwords, and more.</p>
            </div>
          ) : (
            <>
              {isMobile ? (
                /* Mobile card list */
                <div style={{ padding: '8px' }}>
                  {logs.map(log => {
                    const meta = EVENT_META[log.event] || { label: log.event, color: '#525252', bg: '#F4F4F4', icon: ShieldAlert };
                    const roleColor = ROLE_COLORS[log.role] || ROLE_COLORS.unknown;
                    return (
                      <div key={log._id} style={{ border: '1px solid #E0E0E0', marginBottom: '8px', backgroundColor: '#FFFFFF', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <EventBadge event={log.event} />
                          <span style={{ fontSize: '11px', color: '#8D8D8D' }}>{formatTime(log.createdAt)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                          <RoleBadge role={log.role} />
                          {log.userId && (
                            <div>
                              <span style={{ fontWeight: 600, fontSize: '13px' }}>{log.userName || '—'}</span>
                              {log.userPhone && <span style={{ fontSize: '11px', color: '#8D8D8D', marginLeft: '6px' }}>{log.userPhone}</span>}
                            </div>
                          )}
                        </div>
                        {log.detail && (
                          <div style={{ fontSize: '12px', color: '#525252', marginTop: '4px' }}>{log.detail}</div>
                        )}
                        {log.ip && (
                          <div style={{ fontSize: '10px', color: '#A8A8A8', marginTop: '2px' }}>IP: {log.ip}</div>
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
                        <th>Time</th>
                        <th>Event</th>
                        <th>Role</th>
                        <th>User</th>
                        <th>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log._id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: '#525252' }}>
                            {formatTime(log.createdAt)}
                          </td>
                          <td>
                            <EventBadge event={log.event} />
                          </td>
                          <td>
                            <RoleBadge role={log.role} />
                          </td>
                          <td>
                            {log.userId ? (
                              <>
                                <div style={{ fontWeight: 600, fontSize: '13px' }}>{log.userName || log.userId?.name || '—'}</div>
                                <div style={{ fontSize: '11px', color: '#8D8D8D' }}>{log.userPhone || log.userId?.phone}</div>
                              </>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#8D8D8D' }}>—</span>
                            )}
                          </td>
                          <td style={{ fontSize: '12px', color: '#525252', maxWidth: '260px' }}>
                            {log.detail || '—'}
                            {log.ip && (
                              <div style={{ fontSize: '10px', color: '#A8A8A8', marginTop: '2px' }}>
                                IP: {log.ip}
                              </div>
                            )}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => fetchLogs(page - 1)} disabled={page <= 1}>
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#525252', padding: '0 12px' }}>
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => fetchLogs(page + 1)} disabled={page >= totalPages}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Activities;
