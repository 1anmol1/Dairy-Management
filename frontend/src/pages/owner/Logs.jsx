import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ClipboardList, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Edit2, Trash2, X,
  Filter, Search, Calendar, Users, UserCheck, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useThrottle from '../../hooks/useThrottle';
import useWindowWidth from '../../hooks/useWindowWidth';
import { useMarathi } from '../../i18n/marathi';
import { getCache, setCache } from '../../utils/cache';

// ── Skeleton ──────────────────────────────────────────────────
const TableSkeleton = () => (
  <div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', padding: '16px 16px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-row">
            <div className="skeleton skeleton-line-sm" style={{ width: '60%' }} />
            <div className="skeleton skeleton-line-lg" style={{ width: '45%' }} />
          </div>
        </div>
      ))}
    </div>
    <div style={{ padding: '16px' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', padding: '14px 0', borderBottom: i < 5 ? '1px solid #F4F4F4' : 'none' }}>
          <div className="skeleton-row" style={{ gap: '6px' }}>
            <div className="skeleton skeleton-line" style={{ width: '70%' }} />
            <div className="skeleton skeleton-line-sm" style={{ width: '50%' }} />
          </div>
          {[0, 1, 2, 3, 4].map(j => <div key={j} className="skeleton skeleton-line" style={{ width: '60%' }} />)}
        </div>
      ))}
    </div>
  </div>
);

// ── Date helpers ──────────────────────────────────────────────
const toDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getTodayStr = () => toDateStr(new Date());
const todayStr = getTodayStr(); // module-level for initial state only

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  const today = parseLocalDate(getTodayStr());
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const stepDate = (dateStr, delta) => {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + delta);
  return toDateStr(d);
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ── View modes ────────────────────────────────────────────────
const VIEW = { DAY: 'day', RANGE: 'range', MONTH: 'month' };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Compact multi-select component ───────────────────────────
const CompactMultiSelect = ({ label, icon: Icon, items, selected, onToggle, onClear, searchPlaceholder }) => {
  const [search, setSearch] = useState('');
  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.phone && item.phone.includes(search))
  );

  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {Icon && <Icon size={11} />} {label}
        {selected.length > 0 && (
          <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DA1E28', fontSize: '10px', padding: 0, marginLeft: '4px' }}>
            Clear ({selected.length})
          </button>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
          {selected.map(id => {
            const item = items.find(i => i._id === id);
            if (!item) return null;
            return (
              <span key={id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                backgroundColor: '#EDF5FF', border: '1px solid rgba(15,98,254,0.3)',
                color: '#0043CE', fontSize: '11px', fontWeight: 600,
                padding: '2px 6px', borderRadius: '2px'
              }}>
                {item.name}
                <button onClick={() => onToggle(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0043CE', padding: 0, lineHeight: 1, fontSize: '12px' }}>×</button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: '4px' }}>
        <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
        <input
          type="text"
          placeholder={searchPlaceholder || 'Search...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', height: '30px', paddingLeft: '26px', paddingRight: '8px',
            border: '1px solid #E0E0E0', fontSize: '12px', outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Scrollable list */}
      <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #E0E0E0' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '8px 10px', fontSize: '12px', color: '#8D8D8D' }}>No results</div>
        ) : (
          filtered.map(item => (
            <label key={item._id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 10px', cursor: 'pointer', fontSize: '13px',
              backgroundColor: selected.includes(item._id) ? '#EDF5FF' : 'transparent',
              borderBottom: '1px solid #F4F4F4'
            }}>
              <input
                type="checkbox"
                checked={selected.includes(item._id)}
                onChange={() => onToggle(item._id)}
                style={{ cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontWeight: selected.includes(item._id) ? 600 : 400 }}>{item.name}</span>
              {item.phone && <span style={{ fontSize: '11px', color: '#8D8D8D', marginLeft: 'auto' }}>{item.phone}</span>}
            </label>
          ))
        )}
      </div>
    </div>
  );
};

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editLog, setEditLog] = useState(null);
  const { isMarathi } = useMarathi();
  const L = isMarathi ? 'ली.' : 'L';
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const [expandedId, setExpandedId] = useState(null);

  // ── View / date state ─────────────────────────────────────
  const [view, setView] = useState(VIEW.DAY);
  const [date, setDate] = useState(todayStr);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return toDateStr(d);
  });
  const [dateTo, setDateTo] = useState(todayStr);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // ── Pending filter state (shown in UI, not yet applied) ───
  const [pendingSlot, setPendingSlot] = useState('');
  const [pendingCustomers, setPendingCustomers] = useState([]);
  const [pendingStaff, setPendingStaff] = useState([]);

  // ── Applied filter state (used for API queries) ───────────
  const [appliedSlot, setAppliedSlot] = useState('');
  const [appliedCustomers, setAppliedCustomers] = useState([]);
  const [appliedStaff, setAppliedStaff] = useState([]);

  const [showFilters, setShowFilters] = useState(false);

  // ── Dropdown data ─────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const dateInputRef = useRef(null);
  const filterPanelRef = useRef(null);
  const toast = useToast();
  const showSkeleton = useDelayedLoading(loading);

  // Fetch customers + staff for filter dropdowns (once per session — cached via shared cache)
  useEffect(() => {
    const cachedCustomers = getCache('owner/customers-filter');
    if (cachedCustomers) {
      setCustomers(cachedCustomers);
    } else {
      api.get('/owner/customers', { params: { active: 'true', limit: 200 } })
        .then(r => {
          const list = r.data.customers || [];
          setCache('owner/customers-filter', list, 5 * 60 * 1000);
          setCustomers(list);
        })
        .catch(() => {});
    }

    const cachedStaff = getCache('owner/staff');
    if (cachedStaff) {
      setStaffList(cachedStaff);
    } else {
      api.get('/owner/staff')
        .then(r => {
          const list = r.data.staff || [];
          setCache('owner/staff', list, 5 * 60 * 1000);
          setStaffList(list);
        })
        .catch(() => {});
    }
  }, []);

  // Close filter panel when clicking outside
  useEffect(() => {
    if (!showFilters) return;
    const handleClick = (e) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFilters]);

  // Build query params from APPLIED filter state
  const buildParams = useCallback(() => {
    const p = {};
    if (view === VIEW.DAY) {
      p.date = date;
    } else if (view === VIEW.RANGE) {
      p.dateFrom = dateFrom;
      p.dateTo = dateTo;
    } else {
      p.month = month;
      p.year = year;
    }
    if (appliedSlot) p.slot = appliedSlot;
    if (appliedCustomers.length === 1) p.customerId = appliedCustomers[0];
    else if (appliedCustomers.length > 1) p.customerIds = appliedCustomers.join(',');
    if (appliedStaff.length === 1) p.staffId = appliedStaff[0];
    else if (appliedStaff.length > 1) p.staffIds = appliedStaff.join(',');
    return p;
  }, [view, date, dateFrom, dateTo, month, year, appliedSlot, appliedCustomers, appliedStaff]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/owner/logs', { params: buildParams() });
      setLogs(data.logs);
    } catch (err) {
      // Ignore aborted requests (user changed filters quickly)
      if (err?.code !== 'ERR_CANCELED') {
        toast.error('Failed to load logs.');
      }
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Auto-fetch when date/view changes (not on filter changes)
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const applyFilters = () => {
    setAppliedSlot(pendingSlot);
    setAppliedCustomers(pendingCustomers);
    setAppliedStaff(pendingStaff);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setPendingSlot('');
    setPendingCustomers([]);
    setPendingStaff([]);
    setAppliedSlot('');
    setAppliedCustomers([]);
    setAppliedStaff([]);
    setShowFilters(false);
  };

  const deleteLog = async (logId) => {
    if (!window.confirm('Delete this log entry? This cannot be undone.')) return;
    try {
      await api.delete(`/owner/logs/${logId}`);
      toast.success('Log entry deleted.');
      setLogs(prev => prev.filter(l => l._id !== logId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete log.');
    }
  };

  const totalLiters = logs.reduce((s, l) => s + l.delivered_qty, 0);
  const totalAmount = logs.reduce((s, l) => s + l.amount_calculated, 0);

  const openPicker = (ref) => {
    if (!ref.current) return;
    try { ref.current.showPicker(); } catch { ref.current.click(); }
  };

  // Count of APPLIED filters for badge
  const activeFilterCount = [
    appliedSlot ? 1 : 0,
    appliedCustomers.length > 0 ? 1 : 0,
    appliedStaff.length > 0 ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  // Count of PENDING filters (to show "unsaved" state)
  const pendingFilterCount = [
    pendingSlot ? 1 : 0,
    pendingCustomers.length > 0 ? 1 : 0,
    pendingStaff.length > 0 ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  const dateFromRef = useRef(null);
  const dateToRef = useRef(null);

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '12px', position: 'relative' }}>
        <h1 className="page-title">{isMarathi ? 'नोंदी' : 'Logs'}</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* View mode tabs */}
          <div style={{ display: 'flex', border: '1px solid #E0E0E0', overflow: 'hidden' }}>
            {[
              { v: VIEW.DAY,   label: isMarathi ? 'दिवस' : 'Day' },
              { v: VIEW.RANGE, label: isMarathi ? 'कालावधी' : 'Range' },
              { v: VIEW.MONTH, label: isMarathi ? 'महिना' : 'Month' }
            ].map(t => (
              <button key={t.v} onClick={() => setView(t.v)} style={{
                height: '36px', padding: '0 14px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
                backgroundColor: view === t.v ? '#161616' : '#FFFFFF',
                color: view === t.v ? '#FFFFFF' : '#525252',
                transition: 'all 0.1s'
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Day navigator */}
          {view === VIEW.DAY && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="date-nav-btn" style={{ borderRight: 'none' }}
                onClick={() => setDate(d => stepDate(d, -1))} type="button">
                <ChevronLeft size={16} />
              </button>
              <div className="date-nav-center" onClick={() => openPicker(dateInputRef)}>
                <div className="date-nav-label">{fmtDate(date)}</div>
                <input ref={dateInputRef} type="date" value={date}
                  onChange={e => e.target.value && setDate(e.target.value)}
                  max={getTodayStr()} tabIndex={-1} />
              </div>
              <button className="date-nav-btn" style={{ borderLeft: 'none' }}
                onClick={() => {
                  const today = getTodayStr();
                  const next = stepDate(date, 1);
                  if (next <= today) setDate(next);
                }}
                disabled={date >= getTodayStr()} type="button">
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Range picker */}
          {view === VIEW.RANGE && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="date-nav-center" onClick={() => openPicker(dateFromRef)} style={{ minWidth: '110px' }}>
                <div className="date-nav-label" style={{ minWidth: '110px', fontSize: '12px' }}>{fmtDate(dateFrom)}</div>
                <input ref={dateFromRef} type="date" value={dateFrom}
                  onChange={e => e.target.value && setDateFrom(e.target.value)}
                  max={dateTo || getTodayStr()} tabIndex={-1} />
              </div>
              <span style={{ fontSize: '12px', color: '#8D8D8D' }}>→</span>
              <div className="date-nav-center" onClick={() => openPicker(dateToRef)} style={{ minWidth: '110px' }}>
                <div className="date-nav-label" style={{ minWidth: '110px', fontSize: '12px' }}>{fmtDate(dateTo)}</div>
                <input ref={dateToRef} type="date" value={dateTo}
                  onChange={e => e.target.value && setDateTo(e.target.value)}
                  min={dateFrom} max={getTodayStr()} tabIndex={-1} />
              </div>
            </div>
          )}

          {/* Month picker */}
          {view === VIEW.MONTH && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <select className="input" style={{ height: '36px', width: 'auto', fontSize: '13px' }}
                value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select className="input" style={{ height: '36px', width: 'auto', fontSize: '13px' }}
                value={year} onChange={e => setYear(parseInt(e.target.value))}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {/* Filter toggle — positioned relative so dropdown anchors to it */}
          <div style={{ position: 'relative' }} ref={filterPanelRef}>
            <button
              className={`btn btn-sm ${showFilters || activeFilterCount > 0 ? 'btn-dark' : 'btn-ghost'}`}
              onClick={() => {
                if (!showFilters) {
                  // Sync pending with applied when opening
                  setPendingSlot(appliedSlot);
                  setPendingCustomers(appliedCustomers);
                  setPendingStaff(appliedStaff);
                }
                setShowFilters(p => !p);
              }}
              style={{ position: 'relative' }}
            >
              <Filter size={14} /> {isMarathi ? 'फिल्टर' : 'Filters'}
              {activeFilterCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  backgroundColor: '#DA1E28', color: '#FFFFFF',
                  fontSize: '10px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* ── Filter dropdown panel — absolutely positioned, no layout shift ── */}
            {showFilters && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                zIndex: 200,
                backgroundColor: '#FFFFFF',
                border: '1px solid #E0E0E0',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                padding: '16px',
                minWidth: '320px',
                maxWidth: '480px',
                width: 'max-content'
              }}>
                {/* Slot filter */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    {isMarathi ? 'वेळ' : 'Slot'}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { v: '', label: isMarathi ? 'सर्व' : 'All' },
                      { v: 'morning', label: isMarathi ? '☀ सकाळ' : '☀ Morning' },
                      { v: 'evening', label: isMarathi ? '🌙 संध्याकाळ' : '🌙 Evening' }
                    ].map(s => (
                      <button key={s.v} onClick={() => setPendingSlot(s.v)} style={{
                        padding: '6px 12px', border: '1px solid #E0E0E0', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 600,
                        backgroundColor: pendingSlot === s.v ? '#161616' : '#FFFFFF',
                        color: pendingSlot === s.v ? '#FFFFFF' : '#525252',
                        transition: 'all 0.1s'
                      }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer filter */}
                <div style={{ marginBottom: '16px' }}>
                  <CompactMultiSelect
                    label={isMarathi ? 'ग्राहक' : 'Customers'}
                    icon={Users}
                    items={customers}
                    selected={pendingCustomers}
                    onToggle={(id) => setPendingCustomers(prev =>
                      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                    )}
                    onClear={() => setPendingCustomers([])}
                    searchPlaceholder={isMarathi ? 'ग्राहक शोधा...' : 'Search customers...'}
                  />
                </div>

                {/* Staff filter */}
                <div style={{ marginBottom: '16px' }}>
                  <CompactMultiSelect
                    label="Staff"
                    icon={UserCheck}
                    items={staffList}
                    selected={pendingStaff}
                    onToggle={(id) => setPendingStaff(prev =>
                      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                    )}
                    onClear={() => setPendingStaff([])}
                    searchPlaceholder={isMarathi ? 'कर्मचारी शोधा...' : 'Search staff...'}
                  />
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #E0E0E0', paddingTop: '12px' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={clearFilters}
                    style={{ flex: 1 }}
                  >
                    <X size={13} /> {isMarathi ? 'साफ करा' : 'Clear'}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={applyFilters}
                    style={{ flex: 2 }}
                  >
                    {isMarathi ? 'फिल्टर लागू करा' : 'Apply Filters'}
                    {pendingFilterCount > 0 && (
                      <span style={{
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        borderRadius: '10px',
                        padding: '1px 6px',
                        fontSize: '11px',
                        marginLeft: '4px'
                      }}>
                        {pendingFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        {showSkeleton ? (
          <div className="card" style={{ padding: 0 }}><TableSkeleton /></div>
        ) : loading ? null : (
          <>
            {/* Summary stats */}
            {logs.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div className="stat-card">
                  <div className="stat-label">{isMarathi ? 'वितरण' : 'Deliveries'}</div>
                  <div className="stat-value">{logs.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">{isMarathi ? 'एकूण ली.' : 'Total Liters'}</div>
                  <div className="stat-value">{totalLiters.toFixed(1)}{L}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">{isMarathi ? 'एकूण रक्कम' : 'Total Amount'}</div>
                  <div className="stat-value">₹{totalAmount.toFixed(0)}</div>
                </div>
                {view !== VIEW.DAY && (
                  <div className="stat-card">
                    <div className="stat-label">{isMarathi ? 'सरासरी / दिवस' : 'Avg / Day'}</div>
                    <div className="stat-value">
                      {logs.length > 0
                        ? (totalLiters / new Set(logs.map(l => l.date)).size).toFixed(1) + L
                        : '—'}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="card" style={{ padding: 0 }}>
              {logs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><ClipboardList size={40} /></div>
                  <h3>{isMarathi ? 'वितरण आढळले नाही' : 'No deliveries found'}</h3>
                  <p>{isMarathi ? 'तारीख किंवा फिल्टर बदलून पाहा.' : 'Try adjusting the date range or filters.'}</p>
                </div>
              ) : isMobile ? (
                /* ── Mobile card list ── */
                <div style={{ padding: '8px' }}>
                  {logs.map(log => {
                    const isExpanded = expandedId === log._id;
                    return (
                      <div key={log._id} style={{
                        border: '1px solid #E0E0E0', marginBottom: '8px',
                        backgroundColor: '#FFFFFF', overflow: 'hidden'
                      }}>
                        {/* Collapsed row */}
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : log._id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{log.customerId?.name}</div>
                            <div style={{ fontSize: '12px', color: '#525252', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <span className={`badge ${log.slot === 'morning' ? 'badge-yellow' : 'badge-blue'}`} style={{ fontSize: '11px' }}>
                                {log.slot === 'morning' ? '☀' : '🌙'} {isMarathi ? (log.slot === 'morning' ? 'सकाळ' : 'संध्याकाळ') : log.slot}
                              </span>
                              <span style={{ fontWeight: 700 }}>{log.delivered_qty}{L}</span>
                              {view !== VIEW.DAY && (
                                <span style={{ color: '#8D8D8D' }}>
                                  {formatShortDate(log.date)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontWeight: 700, color: '#0F62FE' }}>₹{log.amount_calculated.toFixed(0)}</span>
                            {isExpanded ? <ChevronUp size={16} color="#8D8D8D" /> : <ChevronDown size={16} color="#8D8D8D" />}
                          </div>
                        </div>
                        {/* Expanded details */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #F4F4F4', padding: '12px 14px', backgroundColor: '#FAFAFA' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '13px' }}>
                              <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'मूळ' : 'Base'}: </span><strong>{log.base_qty}{L}</strong></div>
                              <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'अतिरिक्त' : 'Extra'}: </span>
                                {log.extra_qty > 0
                                  ? <strong style={{ color: '#FF832B' }}>+{log.extra_qty}{L}</strong>
                                  : <span>—</span>}
                              </div>
                              <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'रक्कम' : 'Amount'}: </span><strong>₹{log.amount_calculated.toFixed(2)}</strong></div>
                              <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'कर्मचारी' : 'Staff'}: </span><strong>{log.staffId?.name || '—'}</strong></div>
                              <div><span style={{ color: '#8D8D8D' }}>WA: </span>
                                {log.whatsappSent
                                  ? <CheckCircle size={14} color="#24A148" style={{ verticalAlign: 'middle' }} />
                                  : <XCircle size={14} color="#C6C6C6" style={{ verticalAlign: 'middle' }} />}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setEditLog(log)}>
                                <Edit2 size={13} /> {isMarathi ? 'संपादित करा' : 'Edit'}
                              </button>
                              <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => deleteLog(log._id)}>
                                <Trash2 size={13} /> {isMarathi ? 'हटवा' : 'Delete'}
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
                        {view !== VIEW.DAY && <th>{isMarathi ? 'तारीख' : 'Date'}</th>}
                        <th>{isMarathi ? 'ग्राहक' : 'Customer'}</th>
                        <th>{isMarathi ? 'वेळ' : 'Slot'}</th>
                        <th>{isMarathi ? 'मूळ' : 'Base'}</th>
                        <th>{isMarathi ? 'अतिरिक्त' : 'Extra'}</th>
                        <th>{isMarathi ? 'एकूण' : 'Total'}</th>
                        <th>{isMarathi ? 'रक्कम' : 'Amount'}</th>
                        <th>{isMarathi ? 'कर्मचारी' : 'Staff'}</th>
                        <th>WA</th>
                        <th>{isMarathi ? 'क्रिया' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log._id}>
                          {view !== VIEW.DAY && (
                            <td style={{ fontSize: '12px', color: '#525252', whiteSpace: 'nowrap' }}>
                              {formatShortDate(log.date)}
                            </td>
                          )}
                          <td>
                            <div style={{ fontWeight: 600 }}>{log.customerId?.name}</div>
                            <div style={{ fontSize: '12px', color: '#8D8D8D' }}>{log.customerId?.phone}</div>
                          </td>
                          <td>
                            <span className={`badge ${log.slot === 'morning' ? 'badge-yellow' : 'badge-blue'}`}>
                              {log.slot === 'morning' ? '☀' : '🌙'} {isMarathi ? (log.slot === 'morning' ? 'सकाळ' : 'संध्याकाळ') : log.slot}
                            </span>
                          </td>
                          <td>{log.base_qty}{L}</td>
                          <td>
                            {log.extra_qty > 0
                              ? <span style={{ color: '#FF832B', fontWeight: 600 }}>+{log.extra_qty}{L}</span>
                              : '—'}
                          </td>
                          <td style={{ fontWeight: 700 }}>{log.delivered_qty}{L}</td>
                          <td style={{ fontWeight: 600 }}>₹{log.amount_calculated.toFixed(2)}</td>
                          <td style={{ fontSize: '13px', color: '#525252' }}>{log.staffId?.name}</td>
                          <td>
                            {log.whatsappSent
                              ? <CheckCircle size={15} color="#24A148" />
                              : <XCircle size={15} color="#C6C6C6" />}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="btn btn-ghost btn-sm"
                                style={{ height: '28px', padding: '0 8px' }}
                                onClick={() => setEditLog(log)} title="Edit">
                                <Edit2 size={12} />
                              </button>
                              <button className="btn btn-danger btn-sm"
                                style={{ height: '28px', padding: '0 8px' }}
                                onClick={() => deleteLog(log._id)} title="Delete">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {editLog && (
        <EditLogModal
          log={editLog}
          onClose={() => setEditLog(null)}
          onSaved={(updated) => {
            setLogs(prev => prev.map(l => l._id === updated._id ? updated : l));
            setEditLog(null);
          }}
        />
      )}
    </div>
  );
};

// ── Edit Log Modal ────────────────────────────────────────────
const EditLogModal = ({ log, onClose, onSaved }) => {
  const mouseDownOnOverlay = React.useRef(false);
  const [extraQty, setExtraQty] = useState(String(log.extra_qty ?? 0));
  const [notes, setNotes] = useState(log.notes || '');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { isMarathi } = useMarathi();
  const L = isMarathi ? 'ली.' : 'L';

  const preview = {
    delivered: log.base_qty + (parseFloat(extraQty) || 0),
    amount: (log.base_qty + (parseFloat(extraQty) || 0)) * log.price_per_liter
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const extra = parseFloat(extraQty);
    if (isNaN(extra) || extra < 0) { toast.error(isMarathi ? 'वैध अतिरिक्त प्रमाण टाका.' : 'Enter a valid extra quantity.'); return; }
    setLoading(true);
    try {
      const { data } = await api.patch(`/owner/logs/${log._id}`, { extra_qty: extra, notes });
      toast.success(isMarathi ? 'नोंद अपडेट केली.' : 'Log updated.');
      onSaved(data.log);
    } catch (err) {
      toast.error(err.response?.data?.error || (isMarathi ? 'नोंद अपडेट करता आली नाही.' : 'Failed to update log.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onMouseUp={e => { if (e.target === e.currentTarget && mouseDownOnOverlay.current) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: '420px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingRight: '24px' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '18px' }}>{isMarathi ? 'नोंद संपादित करा' : 'Edit Log Entry'}</h2>
            <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
              {log.customerId?.name} · {isMarathi ? (log.slot === 'morning' ? 'सकाळ' : 'संध्याकाळ') : log.slot} · {log.date}
            </div>
          </div>
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
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F4F4F4'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ backgroundColor: '#F4F4F4', padding: '12px 16px', marginBottom: '20px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#525252' }}>{isMarathi ? 'मूळ प्रमाण' : 'Base quantity'}</span>
            <span style={{ fontWeight: 600 }}>{log.base_qty}{L}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#525252' }}>{isMarathi ? 'दर' : 'Rate'}</span>
            <span style={{ fontWeight: 600 }}>₹{log.price_per_liter}/{L}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E0E0E0', paddingTop: '8px', marginTop: '4px' }}>
            <span style={{ color: '#525252' }}>{isMarathi ? 'एकूण पूर्वावलोकन' : 'Preview total'}</span>
            <span style={{ fontWeight: 700, color: '#0F62FE' }}>
              {preview.delivered.toFixed(1)}{L} = ₹{preview.amount.toFixed(2)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">{isMarathi ? 'अतिरिक्त लिटर (संपादन करता येते)' : 'Extra Liters (editable)'}</label>
            <input type="text" inputMode="decimal" className="input" placeholder="0"
              value={extraQty} onChange={e => setExtraQty(e.target.value)} autoFocus />
            <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '4px' }}>
              {isMarathi ? 'मूळ प्रमाण बदलता येत नाही. फक्त अतिरिक्त लिटर बदलता येतात.' : 'Base qty is locked. Only extra liters can be adjusted.'}
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">{isMarathi ? 'नोंदी' : 'Notes'}</label>
            <input type="text" className="input" placeholder={isMarathi ? 'पर्यायी नोंद...' : 'Optional note...'}
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>{isMarathi ? 'रद्द करा' : 'Cancel'}</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? (isMarathi ? 'जतन होत आहे...' : 'Saving...') : (isMarathi ? 'बदल जतन करा' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Logs;
