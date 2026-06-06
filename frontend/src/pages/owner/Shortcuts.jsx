import React from 'react';
import { useShortcuts } from '../../context/ShortcutContext';
import { useMarathi } from '../../i18n/marathi';
import { Keyboard, RotateCcw, Edit3, HelpCircle } from 'lucide-react';

const Shortcuts = () => {
  const { shortcuts, updateShortcut, resetShortcuts, recordingAction, setRecordingAction } = useShortcuts();
  const { isMarathi } = useMarathi();

  const handleRecord = (actionName) => {
    if (recordingAction === actionName) {
      setRecordingAction(null);
    } else {
      setRecordingAction(actionName);
    }
  };

  const formatKeyName = (key) => {
    if (!key) return '—';
    if (key === ' ') return 'Space';
    if (key === 'ArrowUp') return '↑ Up Arrow';
    if (key === 'ArrowDown') return '↓ Down Arrow';
    if (key === 'ArrowLeft') return '← Left Arrow';
    if (key === 'ArrowRight') return '→ Right Arrow';
    return key;
  };

  return (
    <div style={{ maxWidth: '100%' }}>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Keyboard size={24} color="#0F62FE" />
          {isMarathi ? 'कीबोर्ड शॉर्टकट्स' : 'Keyboard Shortcuts'}
        </h1>
        <button
          className="btn btn-ghost btn-sm"
          onClick={resetShortcuts}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RotateCcw size={14} />
          {isMarathi ? 'डिफॉल्टवर रीसेट करा' : 'Reset to Default'}
        </button>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {/* Instructions banner */}
          <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid #0F62FE', padding: '16px 20px', backgroundColor: '#EDF5FF' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <HelpCircle size={20} color="#0F62FE" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '14.5px', color: '#0043CE', marginBottom: '4px' }}>
                  {isMarathi ? 'शॉर्टकट कसे बदलू?' : 'How to customize shortcuts?'}
                </h4>
                <p style={{ fontSize: '13px', color: '#002D9C', lineHeight: 1.5 }}>
                  {isMarathi
                    ? "कोणत्याही शॉर्टकटच्या समोरील 'बदला' बटणावर क्लिक करा, त्यानंतर तुमच्या कीबोर्डवरील नवीन की दाबा. बदल आपोआप जतन केले जातील."
                    : "Click the 'Change' button next to any action, then press the new key on your keyboard. Changes are saved automatically."}
                </p>
              </div>
            </div>
          </div>

          {/* List of shortcuts */}
          <div className="card" style={{ padding: 0 }}>
            {Object.entries(shortcuts).map(([actionName, { key, label, labelMr }], index) => {
              const isRecording = recordingAction === actionName;
              return (
                <div
                  key={actionName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: index < Object.entries(shortcuts).length - 1 ? '1px solid #E0E0E0' : 'none',
                    backgroundColor: isRecording ? '#EDF5FF' : '#FFFFFF',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#161616' }}>
                      {isMarathi ? labelMr : label}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#8D8D8D', marginTop: '2px' }}>
                      {actionName === 'closeModal' && (isMarathi ? 'उघडलेले कोणतेही पॉपअप/मोडल बंद करण्यासाठी' : 'Closes any open modals or dialogs')}
                      {actionName === 'addRecord' && (isMarathi ? 'ग्राहक किंवा शेतकरी जोडा फॉर्म उघडण्यासाठी' : 'Triggers the Add Customer/Farmer primary action')}
                      {actionName === 'nextPage' && (isMarathi ? 'पुढील मेनू पानावर जाण्यासाठी' : 'Cycles to the next sidebar nav section')}
                      {actionName === 'prevPage' && (isMarathi ? 'मागील मेनू पानावर जाण्यासाठी' : 'Cycles to the previous sidebar nav section')}
                      {actionName === 'toggleSidebar' && (isMarathi ? 'साइडबार लपवून स्क्रीन मोठी करण्यासाठी किंवा पुन्हा दाखवण्यासाठी' : 'Minimizes or expands the main navigation sidebar')}
                      {actionName === 'focusInput' && (isMarathi ? 'शोध किंवा इनपुट क्षेत्रावर थेट जाण्यासाठी' : 'Focuses the primary search input on the active page')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                    <kbd
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '60px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: isRecording ? '#0F62FE' : '#161616',
                        backgroundColor: isRecording ? '#D0E2FF' : '#F4F4F4',
                        border: isRecording ? '2px solid #0F62FE' : '1px solid #C6C6C6',
                        borderRadius: '4px',
                        boxShadow: '0 2px 0 #C6C6C6',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        textAlign: 'center'
                      }}
                    >
                      {isRecording ? (isMarathi ? 'की दाबा...' : 'Press Key...') : formatKeyName(key)}
                    </kbd>

                    <button
                      className={`btn btn-sm ${isRecording ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => handleRecord(actionName)}
                      style={{ minWidth: '85px', height: '36px' }}
                    >
                      <Edit3 size={13} />
                      {isRecording ? (isMarathi ? 'रद्द करा' : 'Cancel') : (isMarathi ? 'बदला' : 'Change')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shortcuts;
