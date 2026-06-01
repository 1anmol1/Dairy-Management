import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldAlert, UserCheck, ArrowRight } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const Impersonation = () => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleImpersonate = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/superadmin/impersonate', { phone: phone.trim() });
      toast.success(`Access granted! Impersonating ${data.user.name}`);
      
      // Save to sessionStorage so it doesn't pollute localStorage
      sessionStorage.setItem('amrit_impersonate_token', data.token);
      sessionStorage.setItem('amrit_impersonate_user', JSON.stringify(data.user));

      // Trigger a page reload to let AuthContext and Axios interceptors re-initialize
      // And redirect to the correct home page depending on role
      window.location.href = data.user.role === 'owner' ? '/app/owner' : '/app/staff';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Direct login failed. Check the phone number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px', fontFamily: 'Inter, sans-serif' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Direct Impersonation</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            Securely access any Owner or Staff account without their password or verification code.
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '32px', border: '1px solid #E0E0E0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', backgroundColor: '#FFF3E0', padding: '12px 16px', borderLeft: '4px solid #E65100', color: '#E65100' }}>
          <ShieldAlert size={20} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
            <strong>Super Admin Privilege Warning:</strong> You are entering a passwordless login session. All actions taken in this session will reflect target user actions in system logs.
          </div>
        </div>

        <form onSubmit={handleImpersonate}>
          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label className="input-label" style={{ fontWeight: 600, color: '#161616', marginBottom: '8px', display: 'block' }}>
              Target Mobile Number
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="tel"
                className="input"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                style={{ fontSize: '16px', letterSpacing: '0.5px' }}
                disabled={loading}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '4px' }}>
              Enter the exact 10-digit mobile number associated with the owner or staff member's account.
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? (
              'Initiating session...'
            ) : (
              <>
                <UserCheck size={18} />
                Access Account Directly
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Impersonation;
