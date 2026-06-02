/**
 * ConfirmModal — reusable confirmation dialog.
 * Props:
 *   title       — heading text
 *   message     — body text
 *   confirmText — confirm button label (default: "Confirm")
 *   cancelText  — cancel button label (default: "Cancel")
 *   danger      — if true, confirm button is red (default: false)
 *   onConfirm   — called when confirmed
 *   onCancel    — called when cancelled
 */
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const mouseDownOnOverlay = React.useRef(false);

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onMouseUp={e => { if (e.target === e.currentTarget && mouseDownOnOverlay.current) onCancel(); }}
    >
      <div className="modal" style={{ maxWidth: '400px', textAlign: 'center', position: 'relative' }}>
        <button
          type="button"
          onClick={onCancel}
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

        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          backgroundColor: danger ? '#FFF1F1' : '#FFF8E1',
          border: `2px solid ${danger ? '#DA1E28' : '#F1C21B'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <AlertTriangle size={24} color={danger ? '#DA1E28' : '#B28600'} />
        </div>
        <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>{title}</h3>
        {message && (
          <p style={{ color: '#525252', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>{message}</p>
        )}
        <div style={{ display: 'flex', gap: '12px', marginTop: message ? '0' : '24px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-full"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn btn-full ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {confirmText}...</>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
