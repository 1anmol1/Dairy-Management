import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMarathi } from '../../i18n/marathi';
import { useToast } from '../../context/ToastContext';
import api from '../../api/axios';
import { MessageSquare, Star, Send, ShieldCheck } from 'lucide-react';

const FeedbackPage = () => {
  const { isMarathi } = useMarathi();
  const toast = useToast();
  const location = useLocation();

  const [category, setCategory] = useState(location.state?.prefillCategory || 'suggestion');
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState(location.state?.prefillMessage || '');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error(isMarathi ? 'कृपया तुमचा अभिप्राय लिहा.' : 'Please enter your feedback message.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/owner/feedback', {
        category,
        message: message.trim(),
        rating
      });
      toast.success(isMarathi ? 'अभिप्राय यशस्वीरीत्या पाठवला. धन्यवाद!' : 'Feedback submitted successfully. Thank you!');
      setMessage('');
      setCategory('suggestion');
      setRating(5);
    } catch (err) {
      toast.error(err.response?.data?.error || (isMarathi ? 'अभिप्राय पाठवण्यात त्रुटी आली.' : 'Failed to submit feedback.'));
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { value: 'bug', label: isMarathi ? 'त्रुटी / बग (Bug)' : 'Report a Bug' },
    { value: 'suggestion', label: isMarathi ? 'सूचना (Suggestion)' : 'Suggestion' },
    { value: 'support', label: isMarathi ? 'मदत / सपोर्ट (Support)' : 'Support Help' },
    { value: 'other', label: isMarathi ? 'इतर (Other)' : 'Other' }
  ];

  return (
    <div style={{ maxWidth: '680px', margin: '32px auto', padding: '0 16px' }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E0E0E0',
        padding: '32px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#EDF5FF',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0F62FE'
          }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#161616', margin: 0 }}>
              {isMarathi ? 'अभिप्राय आणि मदत' : 'Feedback & Support'}
            </h1>
            <p style={{ fontSize: '13px', color: '#525252', margin: '4px 0 0' }}>
              {isMarathi
                ? 'तुमच्या मौल्यवान सूचना आमच्यासोबत शेअर करा जेणेकरून आम्ही डेअरी मॅनेजमेंट अधिक सुधारू शकू.'
                : 'Help us improve Dairy Management. Share your suggestions, bugs, or feature ideas.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
          {/* Category */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#525252', marginBottom: '8px' }}>
              {isMarathi ? 'श्रेणी निवडा' : 'Feedback Category'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {categories.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  style={{
                    padding: '10px 12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    backgroundColor: category === cat.value ? '#0F62FE' : '#F4F4F4',
                    color: category === cat.value ? '#FFFFFF' : '#161616',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#525252', marginBottom: '8px' }}>
              {isMarathi ? 'तुमचा अनुभव कसा होता? (रेटिंग)' : 'Rate Your Experience'}
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map(star => {
                const filled = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: filled ? '#F1C21B' : '#E0E0E0',
                      transition: 'transform 0.1s ease',
                      transform: filled ? 'scale(1.1)' : 'scale(1)'
                    }}
                  >
                    <Star size={32} fill={filled ? '#F1C21B' : 'none'} strokeWidth={1.5} />
                  </button>
                );
              })}
              <span style={{ fontSize: '14px', fontWeight: 700, marginLeft: '8px', color: '#161616' }}>
                {rating} / 5
              </span>
            </div>
          </div>

          {/* Message */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#525252', marginBottom: '8px' }}>
              {isMarathi ? 'अभिप्राय किंवा संदेश' : 'Your Feedback Message'}
            </label>
            <textarea
              className="input"
              rows={5}
              placeholder={isMarathi ? 'तुमची मते किंवा समस्या येथे सविस्तर लिहा...' : 'Describe your suggestion, bug details, or request here...'}
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                lineHeight: 1.5,
                resize: 'vertical',
                minHeight: '120px'
              }}
              maxLength={1000}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#8D8D8D', marginTop: '4px' }}>
              {message.length} / 1000
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: '48px', fontSize: '15px', fontWeight: 700 }}
            disabled={submitting}
          >
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                {isMarathi ? 'पाठवत आहे...' : 'Submitting...'}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Send size={16} />
                {isMarathi ? 'अभिप्राय सबमिट करा' : 'Submit Feedback'}
              </span>
            )}
          </button>
        </form>

        {/* Support info banner */}
        <div style={{
          marginTop: '32px',
          borderTop: '1px solid #E0E0E0',
          paddingTop: '24px',
          display: 'flex',
          gap: '12px',
          alignItems: 'start'
        }}>
          <ShieldCheck size={20} color="#24A148" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#161616' }}>
              {isMarathi ? 'आम्ही मदतीसाठी सदैव तत्पर आहोत' : 'Direct Support Options'}
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#525252', lineHeight: 1.5 }}>
              {isMarathi
                ? 'तुम्हाला त्वरित मदतीची आवश्यकता असल्यास, आमच्या सपोर्ट टीमशी थेट WhatsApp द्वारे संपर्क साधू शकता.'
                : 'If you need immediate technical assistance, please feel free to reach out to our team via WhatsApp.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
