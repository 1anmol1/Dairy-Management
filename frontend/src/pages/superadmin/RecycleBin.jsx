import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, X, ShieldAlert, RefreshCw, Layers } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';

const RecycleBin = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionModal, setActionModal] = useState(null); // { type: 'restore' | 'delete', ids: [], msg: '' }
  const [password, setPassword] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  
  const toast = useToast();
  const showSkeleton = useDelayedLoading(loading);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/superadmin/recycle-bin');
      setItems(data.items || []);
      setSelectedIds([]);
    } catch {
      toast.error('Failed to load Recycle Bin items.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(items.map(i => i._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const executeAction = async (e) => {
    e.preventDefault();
    if (!actionModal) return;
    
    // Deletion requires password verification
    if (actionModal.type === 'delete' && !password.trim()) {
      toast.error('Superadmin password is required.');
      return;
    }

    setModalLoading(true);
    try {
      if (actionModal.type === 'restore') {
        const { data } = await api.post('/superadmin/recycle-bin/restore', { ids: actionModal.ids });
        toast.success(data.message || 'Items restored successfully.');
      } else {
        const { data } = await api.post('/superadmin/recycle-bin/hard-delete', {
          ids: actionModal.ids,
          password: password.trim()
        });
        toast.success(data.message || 'Items permanently deleted.');
      }
      setActionModal(null);
      setPassword('');
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed.');
    } finally {
      setModalLoading(false);
    }
  };

  const getDetailText = (item) => {
    const d = item.data;
    if (!d) return 'No data';
    switch (item.modelType) {
      case 'User':
        const roleStr = d.role === 'owner' ? 'Owner' : 'Staff';
        return `${roleStr}: ${d.name} (${d.phone})`;
      case 'Customer':
        return `Customer: ${d.name} (${d.phone}) ${d.address ? `- ${d.address}` : ''}`;
      case 'Bill':
        return `Bill: Month ${d.month}/${d.year} - Amount: ₹${d.totalAmount} (Balance: ₹${d.balance})`;
      case 'DailyLog':
        return `Daily Log: ${d.date} (${d.slot}) - Qty: ${d.delivered_qty}L - Rate: ₹${d.price_per_liter}`;
      case 'DailyCollection':
        return `Daily Collection: ${d.date} - Total Liters: ${d.totalLiters}L`;
      default:
        return `${item.modelType} document: ${item.originalId}`;
    }
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Recycle Bin</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            Soft-deleted data is preserved here for 90 days before permanent deletion.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchItems} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {selectedIds.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
            backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0', marginBottom: '16px',
            justifyContent: 'space-between', borderRadius: '4px', animation: 'fadeIn 0.2s'
          }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>
              {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-success btn-sm"
                style={{ height: '32px' }}
                onClick={() => setActionModal({
                  type: 'restore',
                  ids: selectedIds,
                  msg: 'Restore all selected items? Any associated child items (e.g. bills, collections, staff) will also be restored.'
                })}>
                <RotateCcw size={13} /> Restore Selected
              </button>
              <button className="btn btn-danger btn-sm"
                style={{ height: '32px' }}
                onClick={() => setActionModal({
                  type: 'delete',
                  ids: selectedIds,
                  msg: 'Are you sure you want to PERMANENTLY delete these selected items? This action is irreversible and requires password confirmation.'
                })}>
                <Trash2 size={13} /> Permanent Delete
              </button>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 0 }}>
          {showSkeleton ? (
            <div style={{ padding: '24px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 2fr 1fr 1fr 1fr', gap: '12px', padding: '16px 0', borderBottom: i < 2 ? '1px solid #F4F4F4' : 'none' }}>
                  <div className="skeleton skeleton-line" style={{ width: '40px' }} />
                  <div className="skeleton skeleton-line" style={{ width: '70%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '50%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '60%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '40%' }} />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px' }}>
              <div className="empty-state-icon"><Trash2 size={40} /></div>
              <h3>Recycle Bin is empty</h3>
              <p>No soft-deleted records found.</p>
            </div>
          ) : isMobile ? (
            /* Mobile View */
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={selectedIds.length === items.length} onChange={handleSelectAll} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Select All</span>
              </div>
              {items.map(item => {
                const daysRemaining = Math.max(0, Math.ceil((new Date(item.expiresAt) - Date.now()) / (1000 * 60 * 60 * 24)));
                return (
                  <div key={item._id} style={{ border: '1px solid #E0E0E0', padding: '14px', backgroundColor: '#FFFFFF', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleSelectOne(item._id)} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="badge badge-gray" style={{ textTransform: 'capitalize', fontSize: '11px', fontWeight: 700 }}>
                            {item.modelType}
                          </span>
                          <span style={{ fontSize: '11px', color: daysRemaining < 10 ? '#DA1E28' : '#24A148', fontWeight: 700 }}>
                            {daysRemaining} days left
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#161616', marginTop: '6px' }}>
                          {getDetailText(item)}
                        </div>
                        {item.ownerId && (
                          <div style={{ fontSize: '12px', color: '#525252', marginTop: '4px' }}>
                            Owner: <strong>{item.ownerId.name}</strong> {item.ownerId.businessName ? `(${item.ownerId.businessName})` : ''}
                          </div>
                        )}
                        {item.cascadedFrom && item.cascadedFrom.modelType && (
                          <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Layers size={11} /> Cascaded from {item.cascadedFrom.modelType}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '6px' }}>
                          Deleted: {new Date(item.deletedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button className="btn btn-ghost btn-sm"
                        style={{ flex: 1, borderColor: '#24A148', color: '#0E6027' }}
                        onClick={() => setActionModal({
                          type: 'restore',
                          ids: [item._id],
                          msg: 'Restore this item and all its associated cascaded records?'
                        })}>
                        <RotateCcw size={12} /> Restore
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        style={{ flex: 1, borderColor: '#DA1E28', color: '#DA1E28' }}
                        onClick={() => setActionModal({
                          type: 'delete',
                          ids: [item._id],
                          msg: 'Are you sure you want to PERMANENTLY delete this item? This action cannot be undone and requires password confirmation.'
                        })}>
                        <Trash2 size={12} /> Delete Perm
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop View */
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedIds.length === items.length && items.length > 0} onChange={handleSelectAll} />
                    </th>
                    <th>Type</th>
                    <th>Detail</th>
                    <th>Associated Owner</th>
                    <th>Deleted At</th>
                    <th>Expires In</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const daysRemaining = Math.max(0, Math.ceil((new Date(item.expiresAt) - Date.now()) / (1000 * 60 * 60 * 24)));
                    return (
                      <tr key={item._id}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleSelectOne(item._id)} />
                        </td>
                        <td>
                          <span className="badge badge-gray" style={{ textTransform: 'capitalize', fontWeight: 700 }}>
                            {item.modelType}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#161616', fontSize: '13px' }}>
                            {getDetailText(item)}
                          </div>
                          {item.cascadedFrom && item.cascadedFrom.modelType && (
                            <div style={{ fontSize: '10px', color: '#8D8D8D', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Layers size={10} /> Cascaded from {item.cascadedFrom.modelType}
                            </div>
                          )}
                        </td>
                        <td>
                          {item.ownerId ? (
                            <div>
                              <div style={{ fontWeight: 600, color: '#161616', fontSize: '13px' }}>{item.ownerId.name}</div>
                              <div style={{ fontSize: '11px', color: '#525252' }}>{item.ownerId.businessName || item.ownerId.phone}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#8D8D8D', fontSize: '12px' }}>N/A</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', color: '#525252' }}>
                            {new Date(item.deletedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: daysRemaining < 10 ? '#DA1E28' : '#24A148', fontWeight: 700 }}>
                            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm"
                              onClick={() => setActionModal({
                                type: 'restore',
                                ids: [item._id],
                                msg: 'Restore this item and all its associated records?'
                              })}
                              title="Restore">
                              <RotateCcw size={13} color="#0E6027" />
                            </button>
                            <button className="btn btn-ghost btn-sm"
                              onClick={() => setActionModal({
                                type: 'delete',
                                ids: [item._id],
                                msg: 'PERMANENTLY delete this item? This action is irreversible and requires password confirmation.'
                              })}
                              title="Delete Permanently">
                              <Trash2 size={13} color="#DA1E28" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {actionModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '440px', position: 'relative' }}>
            <button type="button" className="modal-close" onClick={() => { setActionModal(null); setPassword(''); }}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: actionModal.type === 'delete' ? '#DA1E28' : '#0F62FE' }}>
              <ShieldAlert size={24} />
              <h2 style={{ fontWeight: 700, fontSize: '18px' }}>
                {actionModal.type === 'delete' ? 'Confirm Permanent Deletion' : 'Confirm Restoration'}
              </h2>
            </div>
            <p style={{ color: '#525252', fontSize: '14px', marginBottom: '20px', lineHeight: 1.4 }}>
              {actionModal.msg}
            </p>

            <form onSubmit={executeAction}>
              {actionModal.type === 'delete' && (
                <div className="input-group" style={{ marginBottom: '20px' }}>
                  <label className="input-label">Superadmin Password *</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Enter password to confirm"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}

              <div className="modal-footer" style={{ gap: '10px' }}>
                <button type="button" className="btn btn-ghost btn-full"
                  onClick={() => { setActionModal(null); setPassword(''); }}
                  disabled={modalLoading}>
                  Cancel
                </button>
                <button type="submit"
                  className={`btn btn-full ${actionModal.type === 'delete' ? 'btn-danger' : 'btn-primary'}`}
                  disabled={modalLoading}>
                  {modalLoading ? 'Processing...' : actionModal.type === 'delete' ? 'Permanently Delete' : 'Restore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecycleBin;
