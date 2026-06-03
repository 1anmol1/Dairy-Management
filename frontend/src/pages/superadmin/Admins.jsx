import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, KeyRound, Edit, RefreshCw, Check, X, Phone, Mail, User, CheckSquare, Square } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';

const ALL_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard Stats' },
  { id: 'owners', label: 'Owner & Staff Management' },
  { id: 'impersonate', label: 'Direct Impersonate' },
  { id: 'activities', label: 'All Activities & Logs' },
  { id: 'plans', label: 'Plans & Features' },
  { id: 'requests', label: 'Subscription Requests' },
  { id: 'feedback', label: 'User Feedbacks' }
];

const Admins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [resettingAdmin, setResettingAdmin] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Add Form State
  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    roleName: 'Support',
    permissions: ['dashboard']
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    roleName: '',
    permissions: [],
    isActive: true
  });

  // Reset Password State
  const [newPassword, setNewPassword] = useState('');

  const toast = useToast();
  const showSkeleton = useDelayedLoading(loading, 500);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/superadmin/admins');
      setAdmins(data.admins || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load sub-admins.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Handle Add Sub-Admin
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/superadmin/admins', addForm);
      toast.success('Sub-admin account created successfully.');
      setShowAddModal(false);
      setAddForm({
        name: '',
        phone: '',
        email: '',
        username: '',
        password: '',
        roleName: 'Support',
        permissions: ['dashboard']
      });
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create sub-admin.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Sub-Admin
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/superadmin/admins/${editingAdmin._id}`, editForm);
      toast.success('Sub-admin account updated successfully.');
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update sub-admin.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reset Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/superadmin/admins/${resettingAdmin._id}/password`, { password: newPassword });
      toast.success('Sub-admin password reset successfully.');
      setResettingAdmin(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePermissionToggle = (permissionId, isEdit = false) => {
    if (isEdit) {
      setEditForm(prev => {
        const permissions = prev.permissions.includes(permissionId)
          ? prev.permissions.filter(p => p !== permissionId)
          : [...prev.permissions, permissionId];
        return { ...prev, permissions };
      });
    } else {
      setAddForm(prev => {
        const permissions = prev.permissions.includes(permissionId)
          ? prev.permissions.filter(p => p !== permissionId)
          : [...prev.permissions, permissionId];
        return { ...prev, permissions };
      });
    }
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Sub-Admin Management</h1>
          <p style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '4px' }}>
            Create and manage assistant admin accounts with customized role privileges.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchAdmins} disabled={loading} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Sub-Admin
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ padding: 0 }}>
          {showSkeleton ? (
            <div style={{ padding: '24px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', gap: '12px', padding: '16px 0', borderBottom: i < 2 ? '1px solid #F4F4F4' : 'none' }}>
                  <div className="skeleton skeleton-line" style={{ width: '60%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '40%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '30%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '50%' }} />
                </div>
              ))}
            </div>
          ) : admins.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px' }}>
              <div className="empty-state-icon"><Shield size={40} /></div>
              <h3>No sub-admins found</h3>
              <p>Add sub-admin accounts to delegate tasks securely.</p>
            </div>
          ) : isMobile ? (
            /* Mobile Card-based view */
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {admins.map(admin => (
                <div key={admin._id} style={{ border: '1px solid #E0E0E0', padding: '14px', backgroundColor: '#FFFFFF', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#161616' }}>{admin.name}</div>
                      <div style={{ fontSize: '12px', color: '#8D8D8D', marginTop: '2px', fontWeight: 500 }}>@{admin.username}</div>
                    </div>
                    <span className={`badge ${admin.isActive ? 'badge-green' : 'badge-red'}`}>
                      {admin.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#525252', marginBottom: '6px' }}>
                    <strong>Role Name:</strong> {admin.roleName || 'Sub Admin'}
                  </div>

                  <div style={{ fontSize: '13px', color: '#525252', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={12} color="#8D8D8D" /> <span>{admin.phone}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={12} color="#8D8D8D" /> <span style={{ wordBreak: 'break-all' }}>{admin.email}</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', color: '#8D8D8D', fontWeight: 600, display: 'block', marginBottom: '6px' }}>PERMISSIONS</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {admin.permissions && admin.permissions.length > 0 ? (
                        admin.permissions.map(p => (
                          <span key={p} style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0', color: '#393939', borderRadius: '2px' }}>
                            {ALL_PERMISSIONS.find(item => item.id === p)?.label || p}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '11px', color: '#DA1E28' }}>No permissions allowed</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #F4F4F4', paddingTop: '12px' }}>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditingAdmin(admin);
                        setEditForm({
                          roleName: admin.roleName || '',
                          permissions: admin.permissions || [],
                          isActive: admin.isActive
                        });
                      }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid #E0E0E0', borderRadius: '4px', height: '36px' }}>
                      <Edit size={14} /> Edit
                    </button>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => setResettingAdmin(admin)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid #E0E0E0', borderRadius: '4px', height: '36px' }}>
                      <KeyRound size={14} /> Password
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop Table-based view */
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Admin User</th>
                    <th>Contact details</th>
                    <th>Role / Designation</th>
                    <th>Permissions</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(admin => (
                    <tr key={admin._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#161616' }}>{admin.name}</div>
                        <div style={{ fontSize: '12px', color: '#8D8D8D', marginTop: '2px' }}>@{admin.username}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: '#161616' }}>{admin.phone}</div>
                        <div style={{ fontSize: '12px', color: '#8D8D8D', marginTop: '2px' }}>{admin.email}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500, color: '#0F62FE' }}>{admin.roleName || 'Sub Admin'}</span>
                      </td>
                      <td style={{ maxWidth: '280px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {admin.permissions && admin.permissions.length > 0 ? (
                            admin.permissions.map(p => (
                              <span key={p} style={{ fontSize: '10.5px', padding: '1px 6px', backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0', color: '#393939' }}>
                                {ALL_PERMISSIONS.find(item => item.id === p)?.label || p}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '11px', color: '#DA1E28' }}>None</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${admin.isActive ? 'badge-green' : 'badge-red'}`}>
                          {admin.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditingAdmin(admin);
                              setEditForm({
                                roleName: admin.roleName || '',
                                permissions: admin.permissions || [],
                                isActive: admin.isActive
                              });
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Edit size={13} /> Edit
                          </button>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => setResettingAdmin(admin)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <KeyRound size={13} /> Reset PW
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
      </div>

      {/* Add Sub-Admin Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 700 }}>Add Sub-Admin Account</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" type="text" required value={addForm.name}
                    onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Rahul Sharma" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="label">Phone Number</label>
                    <input className="input" type="tel" required value={addForm.phone}
                      onChange={e => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="10-digit phone" />
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <input className="input" type="email" required value={addForm.email}
                      onChange={e => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. rahul@example.com" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="label">Username</label>
                    <input className="input" type="text" required value={addForm.username}
                      onChange={e => setAddForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Unique username" />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input className="input" type="password" required value={addForm.password}
                      onChange={e => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Min 6 characters" />
                  </div>
                </div>
                <div>
                  <label className="label">Role Title / Designation</label>
                  <input className="input" type="text" required value={addForm.roleName}
                    onChange={e => setAddForm(prev => ({ ...prev, roleName: e.target.value }))}
                    placeholder="e.g. Support Executive, Operations Lead" />
                </div>
                <div>
                  <label className="label" style={{ marginBottom: '8px' }}>Assign Access Permissions</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', maxHeight: '180px', overflowY: 'auto', padding: '4px', border: '1px solid #E0E0E0', borderRadius: '4px' }}>
                    {ALL_PERMISSIONS.map(p => {
                      const selected = addForm.permissions.includes(p.id);
                      return (
                        <div key={p.id}
                          onClick={() => handlePermissionToggle(p.id, false)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', backgroundColor: selected ? '#EDF5FF' : 'transparent', borderRadius: '2px', transition: 'background-color 0.15s' }}>
                          {selected ? <CheckSquare size={16} color="#0F62FE" /> : <Square size={16} color="#8D8D8D" />}
                          <span style={{ fontSize: '13px', fontWeight: selected ? 600 : 400, color: selected ? '#0043CE' : '#393939' }}>{p.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Admin'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sub-Admin Modal */}
      {editingAdmin && (
        <div className="modal-overlay" onClick={() => setEditingAdmin(null)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 700 }}>Edit Sub-Admin Permissions</h3>
              <button className="modal-close" onClick={() => setEditingAdmin(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #F4F4F4' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14.5px' }}>{editingAdmin.name}</div>
                    <div style={{ fontSize: '12px', color: '#8D8D8D', marginTop: '2px' }}>@{editingAdmin.username} | {editingAdmin.phone}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#525252' }}>Account Status:</span>
                    <button type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                      style={{
                        width: '52px', height: '28px', border: 'none', cursor: 'pointer',
                        backgroundColor: editForm.isActive ? '#24A148' : '#E0E0E0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '4px', fontSize: '11px', fontWeight: 700,
                        color: editForm.isActive ? '#FFFFFF' : '#525252', transition: 'background-color 0.15s'
                      }}>
                      {editForm.isActive ? <><Check size={11} /> ON</> : <><X size={11} /> OFF</>}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Role Title / Designation</label>
                  <input className="input" type="text" required value={editForm.roleName}
                    onChange={e => setEditForm(prev => ({ ...prev, roleName: e.target.value }))}
                    placeholder="e.g. Support Executive, Operations Lead" />
                </div>

                <div>
                  <label className="label" style={{ marginBottom: '8px' }}>Assign Access Permissions</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', maxHeight: '180px', overflowY: 'auto', padding: '4px', border: '1px solid #E0E0E0', borderRadius: '4px' }}>
                    {ALL_PERMISSIONS.map(p => {
                      const selected = editForm.permissions.includes(p.id);
                      return (
                        <div key={p.id}
                          onClick={() => handlePermissionToggle(p.id, true)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', backgroundColor: selected ? '#EDF5FF' : 'transparent', borderRadius: '2px', transition: 'background-color 0.15s' }}>
                          {selected ? <CheckSquare size={16} color="#0F62FE" /> : <Square size={16} color="#8D8D8D" />}
                          <span style={{ fontSize: '13px', fontWeight: selected ? 600 : 400, color: selected ? '#0043CE' : '#393939' }}>{p.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingAdmin(null)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingAdmin && (
        <div className="modal-overlay" onClick={() => setResettingAdmin(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 700 }}>Reset Password</h3>
              <button className="modal-close" onClick={() => setResettingAdmin(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleResetSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '13.5px', color: '#525252', lineHeight: 1.5 }}>
                  Set a new password for sub-admin <strong>{resettingAdmin.name}</strong> (@{resettingAdmin.username}).
                </p>
                <div>
                  <label className="label">New Password</label>
                  <input className="input" type="password" required value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters" />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setResettingAdmin(null)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Resetting...' : 'Change Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admins;
