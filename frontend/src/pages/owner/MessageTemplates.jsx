/**
 * Message Templates — /app/owner/message-templates
 * Owner creates and manages WhatsApp message templates.
 * Staff use these templates when sending delivery notifications.
 *
 * Supported variables:
 *   {{customerName}}  — customer's name
 *   {{quantity}}      — total delivered quantity (L)
 *   {{extraQty}}      — extra quantity delivered
 *   {{ownerPhone}}    — owner's phone number
 *   {{slot}}          — morning / evening
 *   {{date}}          — today's date
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, Copy, BookOpen, Lock, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import UpgradeGate from '../../components/UpgradeGate';
import { useMarathi } from '../../i18n/marathi';
import { getCache, setCache, invalidateCache } from '../../utils/cache';

const CACHE_KEY = 'owner/message-templates';

// ── Variable chips ────────────────────────────────────────────
const VARIABLES = [
  { key: '{{customerName}}', label: 'Customer Name', desc: 'Replaced with customer name or "Hi" if unavailable' },
  { key: '{{quantity}}',     label: 'Quantity (L)',   desc: 'Total milk delivered in litres' },
  { key: '{{extraQty}}',     label: 'Extra Qty (L)',  desc: 'Extra litres delivered today' },
  { key: '{{ownerPhone}}',   label: 'Owner Phone',    desc: 'Your phone number for contact' },
  { key: '{{slot}}',         label: 'Slot',           desc: 'Morning or Evening' },
  { key: '{{date}}',         label: 'Date',           desc: "Today's date" },
];

// ── Smart Builder variable categories ────────────────────────
const VARIABLE_CATEGORIES = [
  {
    label: '👤 Customer',
    color: '#0F62FE',
    bg: '#EDF5FF',
    vars: [
      { key: '{{customerName}}', label: 'Name' },
      { key: '{{customerPhone}}', label: 'Phone' },
    ]
  },
  {
    label: '📦 Delivery',
    color: '#FF832B',
    bg: '#FFF3E0',
    vars: [
      { key: '{{quantity}}',  label: 'Qty' },
      { key: '{{extraQty}}',  label: 'Extra Qty' },
      { key: '{{slot}}',      label: 'Slot' },
      { key: '{{date}}',      label: 'Date' },
      { key: '{{time}}',      label: 'Time' },
    ]
  },
  {
    label: '💰 Billing',
    color: '#24A148',
    bg: '#DEFBE6',
    vars: [
      { key: '{{amountDue}}',   label: 'Amount Due' },
      { key: '{{totalPaid}}',   label: 'Total Paid' },
      { key: '{{balance}}',     label: 'Balance' },
      { key: '{{grandTotal}}',  label: 'Grand Total' },
      { key: '{{monthName}}',   label: 'Month' },
    ]
  },
  {
    label: '📞 Contact',
    color: '#6929C4',
    bg: '#F3F0FF',
    vars: [
      { key: '{{ownerPhone}}',    label: 'Owner Phone' },
      { key: '{{businessName}}',  label: 'Business Name' },
    ]
  },
];

// ── Variable Color & Background mapping ───────────────────────
const VAR_MAP = {
  '{{customerName}}': { label: 'Customer Name', color: '#0F62FE', bg: '#EDF5FF' },
  '{{customerPhone}}': { label: 'Customer Phone', color: '#0F62FE', bg: '#EDF5FF' },
  '{{quantity}}': { label: 'Quantity', color: '#FF832B', bg: '#FFF3E0' },
  '{{extraQty}}': { label: 'Extra Qty', color: '#FF832B', bg: '#FFF3E0' },
  '{{slot}}': { label: 'Slot', color: '#FF832B', bg: '#FFF3E0' },
  '{{date}}': { label: 'Date', color: '#FF832B', bg: '#FFF3E0' },
  '{{time}}': { label: 'Time', color: '#FF832B', bg: '#FFF3E0' },
  '{{amountDue}}': { label: 'Amount Due', color: '#24A148', bg: '#DEFBE6' },
  '{{totalPaid}}': { label: 'Total Paid', color: '#24A148', bg: '#DEFBE6' },
  '{{balance}}': { label: 'Balance', color: '#24A148', bg: '#DEFBE6' },
  '{{grandTotal}}': { label: 'Grand Total', color: '#24A148', bg: '#DEFBE6' },
  '{{monthName}}': { label: 'Month', color: '#24A148', bg: '#DEFBE6' },
  '{{ownerPhone}}': { label: 'Owner Phone', color: '#6929C4', bg: '#F3F0FF' },
  '{{businessName}}': { label: 'Business Name', color: '#6929C4', bg: '#F3F0FF' },
};

// ── Translated Variable labels ────────────────────────────────
const getVarLabel = (key, language) => {
  const isMr = language === 'mr';
  switch (key) {
    case '{{customerName}}': return isMr ? 'ग्राहकाचे नाव' : 'Customer Name';
    case '{{customerPhone}}': return isMr ? 'ग्राहकाचा फोन' : 'Customer Phone';
    case '{{quantity}}': return isMr ? 'प्रमाण' : 'Quantity';
    case '{{extraQty}}': return isMr ? 'अतिरिक्त प्रमाण' : 'Extra Qty';
    case '{{slot}}': return isMr ? 'वेळ' : 'Slot';
    case '{{date}}': return isMr ? 'तारीख' : 'Date';
    case '{{time}}': return isMr ? 'वेळ (नक्की)' : 'Time';
    case '{{amountDue}}': return isMr ? 'देय रक्कम' : 'Amount Due';
    case '{{totalPaid}}': return isMr ? 'भरलेली रक्कम' : 'Total Paid';
    case '{{balance}}': return isMr ? 'शिल्लक' : 'Balance';
    case '{{grandTotal}}': return isMr ? 'एकूण रक्कम' : 'Grand Total';
    case '{{monthName}}': return isMr ? 'महिना' : 'Month';
    case '{{ownerPhone}}': return isMr ? 'डेअरी फोन' : 'Dairy Phone';
    case '{{businessName}}': return isMr ? 'डेअरीचे नाव' : 'Dairy Name';
    default: return key;
  }
};

// Convert raw text into styled HTML elements inside ContentEditable editor
const rawToHtml = (rawText, language) => {
  if (!rawText) return '';
  let html = rawText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  Object.keys(VAR_MAP).forEach(key => {
    const meta = VAR_MAP[key];
    const label = getVarLabel(key, language);
    const regex = new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    const chip = `<span class="var-chip" contenteditable="false" data-var="${key}" style="background-color: ${meta.bg}; color: ${meta.color}; padding: 2px 8px; margin: 0 4px; font-weight: 600; border-radius: 4px; border: 1px solid ${meta.color}40; font-size: 13px; display: inline-flex; align-items: center; user-select: none;">${label}</span>`;
    html = html.replace(regex, chip);
  });
  
  html = html.replace(/\n/g, '<br>');
  return html;
};

// Extracts plain text representation with variable keys from styled editor HTML
const getRawTextFromHtml = (element) => {
  if (!element) return '';
  let text = '';
  
  const traverse = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.nodeValue;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList.contains('var-chip') || node.getAttribute('data-var')) {
        text += node.getAttribute('data-var');
      } else {
        if (node.nodeName === 'BR') {
          text += '\n';
        } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
          if (text.length > 0 && !text.endsWith('\n')) {
            text += '\n';
          }
          for (let child of node.childNodes) {
            traverse(child);
          }
        } else {
          for (let child of node.childNodes) {
            traverse(child);
          }
        }
      }
    }
  };

  for (let child of element.childNodes) {
    traverse(child);
  }
  return text;
};

// ── Rich Template Editor Component with Double Backspace Behavior ──
const RichTemplateEditor = React.forwardRef(({ value, onChange, placeholder, language }, ref) => {
  const editorRef = React.useRef(null);
  const [backspacePressed, setBackspacePressed] = useState(false);

  useEffect(() => {
    if (editorRef.current) {
      const currentRaw = getRawTextFromHtml(editorRef.current);
      if (currentRaw !== value) {
        editorRef.current.innerHTML = rawToHtml(value, language);
      }
    }
  }, [value, language]);

  const handleInput = () => {
    if (editorRef.current) {
      const raw = getRawTextFromHtml(editorRef.current);
      onChange(raw);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      
      let nodeToDelete = null;
      if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
        let prev = range.startContainer.previousSibling;
        if (prev && prev.nodeType === Node.ELEMENT_NODE && prev.classList.contains('var-chip')) {
          nodeToDelete = prev;
        }
      } else if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
        let child = range.startContainer.childNodes[range.startOffset - 1];
        if (child && child.nodeType === Node.ELEMENT_NODE && child.classList.contains('var-chip')) {
          nodeToDelete = child;
        }
      }

      if (nodeToDelete) {
        e.preventDefault();
        if (!backspacePressed) {
          nodeToDelete.style.outline = '2px solid #DA1E28';
          setBackspacePressed(true);
          const clearHighlight = () => {
            if (nodeToDelete) nodeToDelete.style.outline = 'none';
            setBackspacePressed(false);
            document.removeEventListener('click', clearHighlight);
          };
          document.addEventListener('click', clearHighlight);
        } else {
          nodeToDelete.remove();
          setBackspacePressed(false);
          handleInput();
        }
        return;
      }
    }
    setBackspacePressed(false);
  };

  React.useImperativeHandle(ref, () => ({
    insertChip: (varKey) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();

      const meta = VAR_MAP[varKey] || { label: varKey, color: '#525252', bg: '#F4F4F4' };
      const label = getVarLabel(varKey, language);
      const chipHtml = `<span class="var-chip" contenteditable="false" data-var="${varKey}" style="background-color: ${meta.bg}; color: ${meta.color}; padding: 2px 8px; margin: 0 4px; font-weight: 600; border-radius: 4px; border: 1px solid ${meta.color}40; font-size: 13px; display: inline-flex; align-items: center; user-select: none;">${label}</span>&nbsp;`;

      const selection = window.getSelection();
      if (selection.rangeCount) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = chipHtml;
        
        const fragment = document.createDocumentFragment();
        let lastNode;
        while (tempDiv.firstChild) {
          lastNode = tempDiv.firstChild;
          fragment.appendChild(lastNode);
        }
        range.insertNode(fragment);
        
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        el.innerHTML += chipHtml;
      }
      
      handleInput();
    }
  }));

  return (
    <>
      <style>{`
        .rich-template-editor:empty:before {
          content: attr(data-placeholder);
          color: #8D8D8D;
          pointer-events: none;
          display: block;
        }
      `}</style>
      <div
        ref={editorRef}
        contentEditable={true}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        style={{
          minHeight: '120px',
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid #8D8D8D',
          padding: '12px 16px',
          backgroundColor: '#FFFFFF',
          fontFamily: 'inherit',
          fontSize: '14px',
          lineHeight: 1.6,
          outline: 'none'
        }}
        data-placeholder={placeholder}
        className="rich-template-editor input"
      />
    </>
  );
});

// ── Default bodies per message type ──────────────────────────
const DEFAULT_BODIES_EN = {
  delivery:         'Hi {{customerName}}, {{quantity}} of milk has been delivered today ({{slot}}). Contact: {{ownerPhone}}',
  extra_delivery:   'Hi {{customerName}}, {{quantity}} delivered today ({{extraQty}} extra). Contact: {{ownerPhone}}',
  no_delivery:      'Hi {{customerName}}, no milk delivery today. Contact: {{ownerPhone}}',
  payment_reminder: 'Dear {{customerName}}, your milk bill for {{monthName}} is {{grandTotal}}. Paid: {{totalPaid}}. Balance due: {{balance}}. Please pay at your earliest. — {{businessName}}',
  monthly_bill:     'Hi {{customerName}}, your milk statement for {{monthName}}:\nTotal: {{grandTotal}}\nPaid: {{totalPaid}}\nBalance: {{balance}}\nContact: {{ownerPhone}}',
  custom:           '',
};

const DEFAULT_BODIES_MR = {
  delivery:         'नमस्कार {{customerName}}, आज तुम्हाला {{quantity}} दूध वितरित केले गेले आहे ({{slot}}). संपर्क: {{ownerPhone}}',
  extra_delivery:   'नमस्कार {{customerName}}, आज तुम्हाला {{quantity}} दूध वितरित केले गेले आहे (अतिरिक्त: {{extraQty}}). संपर्क: {{ownerPhone}}',
  no_delivery:      'नमस्कार {{customerName}}, आज कोणतेही दूध वितरण नाही. संपर्क: {{ownerPhone}}',
  payment_reminder: 'प्रिय {{customerName}}, तुमचे {{monthName}} महिन्याचे दूध बिल {{grandTotal}} आहे. भरलेले: {{totalPaid}}. थकीत रक्कम: {{balance}}. कृपया लवकरात लवकर भरणा करावा. — {{businessName}}',
  monthly_bill:     'नमस्कार {{customerName}}, तुमचे {{monthName}} महिन्याचे बिल विवरण:\nएकूण: {{grandTotal}}\nभरलेले: {{totalPaid}}\nथकीत: {{balance}}\nसंपर्क: {{ownerPhone}}',
  custom:           '',
};

const MESSAGE_TYPES = [
  { type: 'delivery',         label: '✅ Regular Delivery' },
  { type: 'extra_delivery',   label: '➕ Extra Delivery' },
  { type: 'no_delivery',      label: '❌ No Delivery' },
  { type: 'payment_reminder', label: '💸 Pending Payment' },
  { type: 'monthly_bill',     label: '📋 Monthly Bill' },
  { type: 'custom',           label: '💬 Custom' },
];

const TYPE_LABELS = {
  delivery:         { label: 'Regular Delivery',  color: '#24A148', bg: '#DEFBE6' },
  extra_delivery:   { label: 'Extra Delivery',    color: '#FF832B', bg: '#FFF3E0' },
  no_delivery:      { label: 'No Delivery',       color: '#8D8D8D', bg: '#F4F4F4' },
  payment_reminder: { label: 'Payment Reminder',  color: '#DA1E28', bg: '#FFF1F1' },
  monthly_bill:     { label: 'Monthly Bill',      color: '#8A3FFC', bg: '#F3F0FF' },
  custom:           { label: 'Custom',            color: '#0F62FE', bg: '#EDF5FF' },
};

// Translate variable category and variable labels
const getCategoryLabel = (label, isMr) => {
  if (!isMr) return label;
  switch (label) {
    case '👤 Customer': return '👤 ग्राहक';
    case '📦 Delivery': return '📦 वितरण';
    case '💰 Billing': return '💰 बिलिंग';
    case '📞 Contact': return '📞 संपर्क';
    default: return label;
  }
};

const getVarLabelMR = (label, isMr) => {
  if (!isMr) return label;
  switch (label) {
    case 'Name': return 'नाव';
    case 'Phone': return 'फोन';
    case 'Qty': return 'प्रमाण';
    case 'Extra Qty': return 'अतिरिक्त';
    case 'Slot': return 'वेळ';
    case 'Date': return 'तारीख';
    case 'Time': return 'वेळ (नक्की)';
    case 'Amount Due': return 'देय रक्कम';
    case 'Total Paid': return 'भरलेली रक्कम';
    case 'Balance': return 'शिल्लक';
    case 'Grand Total': return 'एकूण';
    case 'Month': return 'महिना';
    case 'Owner Phone': return 'डेअरी फोन';
    case 'Business Name': return 'डेअरीचे नाव';
    default: return label;
  }
};

// ── Preview helper — replaces variables with sample values ────
const previewMessage = (body, ownerPhone, language) => {
  const isMr = language === 'mr';
  const qtyStr = `2${isMr ? ' लीटर' : ' L'}`;
  const extraStr = `0.5${isMr ? ' लीटर' : ' L'}`;
  const formatAmount = (amt) => `₹${amt}`;

  return body
    .replace(/{{customerName}}/g, isMr ? 'रमेश' : 'Ramesh')
    .replace(/{{quantity}}/g, qtyStr)
    .replace(/{{extraQty}}/g, extraStr)
    .replace(/{{ownerPhone}}/g, ownerPhone || '9876543210')
    .replace(/{{slot}}/g, isMr ? 'सकाळ' : 'Morning')
    .replace(/{{date}}/g, new Date().toLocaleDateString('en-IN'))
    .replace(/{{time}}/g, '7:30 AM')
    .replace(/₹?{{amountDue}}/g, formatAmount('1200'))
    .replace(/₹?{{totalPaid}}/g, formatAmount('800'))
    .replace(/₹?{{balance}}/g, formatAmount('400'))
    .replace(/₹?{{grandTotal}}/g, formatAmount('1200'))
    .replace(/{{monthName}}/g, isMr ? 'मे' : 'May')
    .replace(/{{businessName}}/g, isMr ? 'अमृत डेअरी' : 'Amrit Dairy')
    .replace(/{{customerPhone}}/g, '9876543210');
};

// ── Smart Message Builder (Platinum only) ────────────────────
const SmartMessageBuilder = ({ onSave, ownerPhone }) => {
  const [selectedType, setSelectedType] = useState('delivery');
  const [language, setLanguage] = useState('en'); // 'en' or 'mr'
  const [body, setBody] = useState(DEFAULT_BODIES_EN['delivery']);
  const [name, setName] = useState('Regular Delivery');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [bodyError, setBodyError] = useState('');
  const editorRef = React.useRef(null);
  const toast = useToast();

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    const defaults = language === 'mr' ? DEFAULT_BODIES_MR : DEFAULT_BODIES_EN;
    setBody(defaults[type] || '');
    const found = MESSAGE_TYPES.find(t => t.type === type);
    setName(found ? found.label.replace(/^[^\s]+\s/, '') : 'Custom');
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    const currentDefaults = language === 'mr' ? DEFAULT_BODIES_MR : DEFAULT_BODIES_EN;
    const nextDefaults = lang === 'mr' ? DEFAULT_BODIES_MR : DEFAULT_BODIES_EN;
    if (!body || body === currentDefaults[selectedType]) {
      setBody(nextDefaults[selectedType] || '');
    }
  };

  const insertVariable = (v) => {
    if (editorRef.current) {
      editorRef.current.insertChip(v);
    }
  };

  const handleSave = async () => {
    let hasError = false;
    if (!name.trim()) { setNameError('Template name is required.'); hasError = true; }
    if (!body.trim()) { setBodyError('Message body is required.'); hasError = true; }
    if (hasError) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type: selectedType, body: body.trim(), isDefault, language });
      toast.success('Template saved.');
      // Reset to default state
      setSelectedType('delivery');
      setLanguage('en');
      setBody(DEFAULT_BODIES_EN['delivery']);
      setName('Regular Delivery');
      setIsDefault(false);
      setNameError('');
      setBodyError('');
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const typeMeta = TYPE_LABELS[selectedType] || TYPE_LABELS.custom;
  const isMr = language === 'mr';

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '2px solid #8A3FFC', padding: '20px 24px', marginBottom: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
        <span style={{ fontSize: '18px' }}>✨</span>
        <h3 style={{ fontWeight: 700, fontSize: '16px', color: '#6929C4', margin: 0 }}>
          {isMr ? 'स्मार्ट संदेश निर्माता' : 'Smart Message Builder'}
        </h3>
        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', backgroundColor: '#F3F0FF', color: '#8A3FFC', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PLATINUM</span>
      </div>

      {/* Language Selector */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          {isMr ? 'भाषा निवडा' : 'Language / भाषा'}
        </div>
        <select
          className="input"
          value={language}
          onChange={e => handleLanguageChange(e.target.value)}
          style={{ maxWidth: '200px' }}
        >
          <option value="en">English</option>
          <option value="mr">मराठी (Marathi)</option>
        </select>
      </div>

      {/* Message type selector */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          {isMr ? 'संदेश प्रकार' : 'Message Type'}
        </div>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {MESSAGE_TYPES.map(t => {
            const meta = TYPE_LABELS[t.type] || TYPE_LABELS.custom;
            const isSelected = selectedType === t.type;
            const label = isMr 
              ? t.label.replace('Regular Delivery', 'नियमित वितरण').replace('Extra Delivery', 'अतिरिक्त वितरण').replace('No Delivery', 'वितरण नाही').replace('Pending Payment', 'थकीत पेमेंट').replace('Monthly Bill', 'मासिक बिल').replace('Custom', 'कस्टम')
              : t.label;
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => handleTypeSelect(t.type)}
                style={{
                  padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                  border: `2px solid ${isSelected ? meta.color : '#E0E0E0'}`,
                  backgroundColor: isSelected ? meta.bg : '#FFFFFF',
                  color: isSelected ? meta.color : '#525252',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.1s', borderRadius: '20px'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Variable categories */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          {isMr ? 'व्हेरिएबल समाविष्ट करण्यासाठी टॅप करा' : 'Tap to Insert Variable'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {VARIABLE_CATEGORIES.map(cat => (
            <div key={cat.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: cat.color, minWidth: '90px', paddingTop: '4px' }}>
                {getCategoryLabel(cat.label, isMr)}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {cat.vars.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    style={{
                      padding: '3px 8px', fontSize: '11px', fontWeight: 600,
                      backgroundColor: cat.bg, color: cat.color,
                      border: `1px solid ${cat.color}40`,
                      cursor: 'pointer', fontFamily: 'monospace',
                      transition: 'opacity 0.1s'
                    }}
                    title={v.key}
                  >
                    {getVarLabelMR(v.label, isMr)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Template name */}
      <div className="input-group" style={{ marginBottom: '12px' }}>
        <label className="input-label">{isMr ? 'टेम्पलेटचे नाव *' : 'Template Name *'}</label>
        <input
          type="text"
          className="input"
          placeholder={isMr ? 'उदा. मासिक बिल स्मरणपत्र' : 'e.g. Monthly Bill Reminder'}
          value={name}
          onChange={e => { setName(e.target.value); setNameError(''); }}
        />
        {nameError && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{nameError}</div>}
      </div>

      {/* Message body */}
      <div className="input-group" style={{ marginBottom: '12px' }}>
        <label className="input-label">{isMr ? 'संदेश मजकूर *' : 'Message Body *'}</label>
        <RichTemplateEditor
          ref={editorRef}
          placeholder={isMr ? 'तुमचा संदेश टाइप करा किंवा निवडलेला प्रकार पूर्व-भरण्यासाठी निवडा...' : 'Type your message or select a type above to pre-fill...'}
          value={body}
          onChange={val => { setBody(val); setBodyError(''); }}
          language={language}
        />
        {bodyError && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{bodyError}</div>}
        <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '4px' }}>{body.length}/1000 characters</div>
      </div>

      {/* Live preview */}
      {body && (
        <div style={{ backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0', padding: '12px 16px', marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            📱 {isMr ? 'थेट पूर्वावलोकन (नमुना मूल्ये)' : 'Live Preview (sample values)'}
          </div>
          <div style={{ fontSize: '13px', color: '#161616', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
            {previewMessage(body, ownerPhone, language)}
          </div>
        </div>
      )}

      {/* Set as default + Save */}
      <div style={{ display: 'flex', alignItems: 'center', justifySpace: 'between', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#525252' }}>
          <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
          {isMr ? 'या प्रकारासाठी डिफॉल्ट म्हणून सेट करा' : 'Set as default for this type'}
        </label>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ backgroundColor: '#6929C4', borderColor: '#6929C4', minWidth: '160px' }}
        >
          {saving ? (isMr ? 'जतन होत आहे...' : 'Saving...') : (isMr ? '💾 टेम्पलेट जतन करा' : '💾 Save Template')}
        </button>
      </div>
    </div>
  );
};

// ── Template form ─────────────────────────────────────────────
const TemplateForm = ({ initial, onSave, onCancel, ownerPhone }) => {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || 'custom');
  const [language, setLanguage] = useState(initial?.language || 'en');
  const [body, setBody] = useState(initial?.body || '');
  const [isDefault, setIsDefault] = useState(initial?.isDefault || false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const editorRef = React.useRef(null);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    const currentDefaults = language === 'mr' ? DEFAULT_BODIES_MR : DEFAULT_BODIES_EN;
    const nextDefaults = lang === 'mr' ? DEFAULT_BODIES_MR : DEFAULT_BODIES_EN;
    if (!body || body === currentDefaults[type]) {
      setBody(nextDefaults[type] || '');
    }
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    const defaults = language === 'mr' ? DEFAULT_BODIES_MR : DEFAULT_BODIES_EN;
    if (!body || body === defaults[type]) {
      setBody(defaults[newType] || '');
    }
  };

  const insertVariable = (v) => {
    if (editorRef.current) {
      editorRef.current.insertChip(v);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) { toast.error('Name and message body are required.'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type, body: body.trim(), isDefault, language });
    } finally {
      setSaving(false);
    }
  };

  const isMr = language === 'mr';

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">{isMr ? 'टेम्पलेटचे नाव *' : 'Template Name *'}</label>
          <input type="text" className="input" placeholder={isMr ? 'उदा. सकाळचे वितरण' : 'e.g. Morning Delivery'}
            value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">{isMr ? 'प्रकार' : 'Type'}</label>
          <select className="input" value={type} onChange={e => handleTypeChange(e.target.value)}>
            <option value="delivery">{isMr ? 'नियमित वितरण' : 'Regular Delivery'}</option>
            <option value="extra_delivery">{isMr ? 'अतिरिक्त वितरण' : 'Extra Delivery'}</option>
            <option value="no_delivery">{isMr ? 'वितरण नाही' : 'No Delivery'}</option>
            <option value="payment_reminder">{isMr ? 'थकीत पेमेंट' : 'Payment Reminder'}</option>
            <option value="monthly_bill">{isMr ? 'मालिक बिल' : 'Monthly Bill'}</option>
            <option value="custom">{isMr ? 'कस्टम' : 'Custom'}</option>
          </select>
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">{isMr ? 'भाषा' : 'Language'}</label>
          <select className="input" value={language} onChange={e => handleLanguageChange(e.target.value)}>
            <option value="en">English</option>
            <option value="mr">मराठी (Marathi)</option>
          </select>
        </div>
      </div>

      {/* Variable categories for Form */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          {isMr ? 'व्हेरिएबल समाविष्ट करा' : 'Insert Variable'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {Object.keys(VAR_MAP).map(key => {
            const meta = VAR_MAP[key];
            const label = getVarLabel(key, language);
            return (
              <button
                key={key}
                type="button"
                title={key}
                onClick={() => insertVariable(key)}
                style={{
                  padding: '4px 10px', fontSize: '12px', fontWeight: 600,
                  backgroundColor: meta.bg, color: meta.color,
                  border: `1px solid ${meta.color}40`,
                  cursor: 'pointer', fontFamily: 'monospace',
                  transition: 'background-color 0.1s'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Message body */}
      <div className="input-group">
        <label className="input-label">{isMr ? 'संदेश मजकूर *' : 'Message Body *'}</label>
        <RichTemplateEditor
          ref={editorRef}
          placeholder={isMr ? 'तुमचा संदेश लिहा. व्हेरिएबल्स टाकण्यासाठी वरील बटणांवर क्लिक करा.' : 'Type your message here. Click variables above to insert them.'}
          value={body}
          onChange={setBody}
          language={language}
        />
        <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '4px' }}>
          {body.length}/1000 characters
        </div>
      </div>

      {/* Preview */}
      {body && (
        <div style={{ backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0', padding: '12px 16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            {isMr ? 'पूर्वावलोकन (नमुना मूल्ये)' : 'Preview (sample values)'}
          </div>
          <div style={{ fontSize: '14px', color: '#161616', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {previewMessage(body, ownerPhone, language)}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#525252' }}>
          <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
          {isMr ? 'या प्रकारासाठी डिफॉल्ट म्हणून सेट करा' : 'Set as default for this type'}
        </label>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button type="button" className="btn btn-ghost btn-full" onClick={onCancel}>
          {isMr ? 'रद्द करा' : 'Cancel'}
        </button>
        <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
          {saving ? (isMr ? 'जतन होत आहे...' : 'Saving...') : initial ? (isMr ? 'अपडेट करा' : 'Update Template') : (isMr ? 'टेम्पलेट तयार करा' : 'Create Template')}
        </button>
      </div>
    </form>
  );
};

// ── Main page ─────────────────────────────────────────────────
const MessageTemplates = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { isMarathi } = useMarathi();
  const [templates, setTemplates] = useState(() => getCache(CACHE_KEY) || []);
  const [loading, setLoading] = useState(!getCache(CACHE_KEY));
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const plan = user?.subscription?.plan || 'silver';
  const hasWhatsApp        = user?.features?.whatsapp_alerts || plan === 'gold' || plan === 'platinum';
  const hasCustomTemplates = user?.features?.custom_message_templates || plan === 'platinum';
  const isPlatinum = hasCustomTemplates || plan === 'platinum';
  const isGoldOrAbove = hasWhatsApp || hasCustomTemplates || plan === 'gold' || plan === 'platinum' || user?.subscription?.status === 'trial';

  const GOLD_DEFAULT_TEMPLATE = {
    name: 'Regular Delivery',
    type: 'delivery',
    body: 'Hi {{customerName}}, {{quantity}}L of milk has been delivered to you today. Any queries? Contact: {{ownerPhone}}',
    isDefault: true,
    _isGoldDefault: true
  };

  const fetchTemplates = useCallback(async (force = false) => {
    if (!force) {
      const cached = getCache(CACHE_KEY);
      if (cached) { setTemplates(cached); setLoading(false); return; }
    }
    setLoading(true);
    try {
      const { data } = await api.get('/owner/message-templates');
      setCache(CACHE_KEY, data.templates || [], 5 * 60 * 1000);
      setTemplates(data.templates || []);
    } catch {
      toast.error('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      await api.post('/owner/message-templates/seed-defaults');
      toast.success('Default templates created.');
      invalidateCache(CACHE_KEY);
      fetchTemplates(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to seed defaults.');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreate = async (data) => {
    try {
      await api.post('/owner/message-templates', data);
      toast.success('Template created.');
      setShowForm(false);
      invalidateCache(CACHE_KEY);
      fetchTemplates(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create template.');
      throw err;
    }
  };

  const handleUpdate = async (data) => {
    try {
      await api.patch(`/owner/message-templates/${editingTemplate._id}`, data);
      toast.success('Template updated.');
      setEditingTemplate(null);
      invalidateCache(CACHE_KEY);
      fetchTemplates(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update template.');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.delete(`/owner/message-templates/${id}`);
      toast.success('Template deleted.');
      invalidateCache(CACHE_KEY);
      fetchTemplates(true);
    } catch {
      toast.error('Failed to delete template.');
    }
  };

  const handleCopy = (body) => {
    navigator.clipboard.writeText(body).then(() => toast.info('Copied to clipboard.'));
  };

  // Group by type (filtered)
  const filteredTemplates = templates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const grouped = {};
  filteredTemplates.forEach(t => {
    if (!grouped[t.type]) grouped[t.type] = [];
    grouped[t.type].push(t);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isMarathi ? 'संदेश टेम्पलेट' : 'Message Templates'}</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            {isMarathi ? 'वितरण सूचनांसाठी WhatsApp संदेश टेम्पलेट' : 'WhatsApp message templates for delivery notifications'}
          </div>
        </div>
        {isPlatinum && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {templates.length === 0 && !loading && (
              <button className="btn btn-ghost btn-sm" onClick={handleSeedDefaults} disabled={seeding}>
                {seeding ? (isMarathi ? 'तयार होत आहे...' : 'Creating...') : (isMarathi ? 'डिफॉल्ट टेम्पलेट तयार करा' : 'Create Default Templates')}
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(true); setEditingTemplate(null); }}>
              <Plus size={14} /> {isMarathi ? 'नवीन टेम्पलेट' : 'New Template'}
            </button>
          </div>
        )}
      </div>

      <div className="page-body">
        {/* Gold plan — show the fixed default template, read-only */}
        {isGoldOrAbove && !isPlatinum && (
          <>
            <div style={{ backgroundColor: '#EDF5FF', border: '1px solid rgba(15,98,254,0.2)', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#0043CE', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <BookOpen size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>{isMarathi ? 'WhatsApp अलर्ट सक्षम:' : 'WhatsApp Alerts enabled:'}</strong>{' '}
                {isMarathi
                  ? 'तुमचे कर्मचारी खालील मानक संदेश वापरतात. कस्टम टेम्पलेट तयार करण्यासाठी Amrit Platinum वर अपग्रेड करा.'
                  : <>Your staff uses the standard delivery message below. Upgrade to <strong>Amrit Platinum</strong> to create fully customised templates.</>}
              </div>
            </div>

            {/* Gold default template — read-only */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '16px 20px', borderLeft: '4px solid #24A148', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{GOLD_DEFAULT_TEMPLATE.name}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', backgroundColor: '#DEFBE6', color: '#0E6027', textTransform: 'uppercase' }}>{isMarathi ? 'डिफॉल्ट' : 'DEFAULT'}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', backgroundColor: '#EDF5FF', color: '#0043CE', textTransform: 'uppercase' }}>GOLD</span>
                </div>
                <button
                  title={isMarathi ? 'संदेश कॉपी करा' : 'Copy message'}
                  onClick={() => handleCopy(GOLD_DEFAULT_TEMPLATE.body)}
                  style={{ background: 'none', border: '1px solid #E0E0E0', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', color: '#525252' }}
                >
                  <Copy size={13} />
                </button>
              </div>
              <div style={{ fontSize: '13px', color: '#525252', lineHeight: 1.6, fontFamily: 'monospace', backgroundColor: '#F4F4F4', padding: '10px 12px', whiteSpace: 'pre-wrap' }}>
                {GOLD_DEFAULT_TEMPLATE.body}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#8D8D8D' }}>
                {isMarathi ? 'पूर्वावलोकन' : 'Preview'}: <span style={{ color: '#161616' }}>{previewMessage(GOLD_DEFAULT_TEMPLATE.body, user?.phone, isMarathi ? 'mr' : 'en')}</span>
              </div>
            </div>

            {/* Upgrade gate for custom templates */}
            <UpgradeGate
              requiredPlan="platinum"
              currentPlan={plan}
              featureName={isMarathi ? 'कस्टम संदेश टेम्पलेट' : 'Custom Message Templates'}
              inline={false}
            >
              <div style={{ height: '200px', backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8D8D8D' }}>
                {isMarathi ? 'कस्टम टेम्पलेट पूर्वावलोकन' : 'Custom templates preview'}
              </div>
            </UpgradeGate>
          </>
        )}

        {/* Silver plan — no templates at all */}
        {!isGoldOrAbove && (
          <UpgradeGate
            requiredPlan="gold"
            currentPlan={plan}
            featureName={isMarathi ? 'WhatsApp संदेश टेम्पलेट' : 'WhatsApp Message Templates'}
            inline={false}
          >
            <div style={{ height: '200px', backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8D8D8D' }}>
              {isMarathi ? 'टेम्पलेट पूर्वावलोकन' : 'Templates preview'}
            </div>
          </UpgradeGate>
        )}

        {/* Platinum — full template builder */}
        {isPlatinum && (
          <>
            {/* Smart Message Builder — Platinum only */}
            <SmartMessageBuilder onSave={handleCreate} ownerPhone={user?.phone} />

            {/* Variables reference */}
            <div style={{ backgroundColor: '#EDF5FF', border: '1px solid rgba(15,98,254,0.2)', padding: '14px 18px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0043CE', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={14} /> {isMarathi ? 'उपलब्ध व्हेरिएबल्स' : 'Available Variables'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
                {Object.keys(VAR_MAP).map(key => {
                  const getVarDesc = (k, isMr) => {
                    switch (k) {
                      case '{{customerName}}': return isMr ? "ग्राहकाचे नाव (उपलब्ध नसल्यास 'नमस्कार' वापरले जाईल)" : "Customer's name";
                      case '{{customerPhone}}': return isMr ? "ग्राहकाचा फोन नंबर" : "Customer's phone number";
                      case '{{quantity}}': return isMr ? "वितरित केलेले एकूण दूध" : "Delivered quantity";
                      case '{{extraQty}}': return isMr ? "वितरित केलेले अतिरिक्त दूध" : "Extra quantity";
                      case '{{slot}}': return isMr ? "सकाळ किंवा संध्याकाळ" : "Morning or Evening slot";
                      case '{{date}}': return isMr ? "वितरणाची तारीख" : "Delivery date";
                      case '{{time}}': return isMr ? "वितरणाची वेळ" : "Delivery time";
                      case '{{amountDue}}': return isMr ? "देय रक्कम" : "Amount due";
                      case '{{totalPaid}}': return isMr ? "एकूण भरलेली रक्कम" : "Total amount paid";
                      case '{{balance}}': return isMr ? "शिल्लक रक्कम" : "Outstanding balance";
                      case '{{grandTotal}}': return isMr ? "एकूण बिल" : "Grand total bill amount";
                      case '{{monthName}}': return isMr ? "महिन्याचे नाव" : "Month name";
                      case '{{ownerPhone}}': return isMr ? "डेअरीचा संपर्क क्रमांक" : "Dairy contact number";
                      case '{{businessName}}': return isMr ? "डेअरीचे नाव" : "Dairy business name";
                      default: return "";
                    }
                  };
                  return (
                    <div key={key} style={{ fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                      <code style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', border: '1px solid rgba(15,98,254,0.3)', color: '#0F62FE', fontWeight: 700, fontFamily: 'monospace' }}>{key}</code>
                      <span style={{ color: '#525252', marginLeft: '6px' }}>{getVarDesc(key, isMarathi)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create / Edit form */}
            {(showForm || editingTemplate) && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '20px' }}>
                  {editingTemplate ? (isMarathi ? 'टेम्पलेट संपादित करा' : 'Edit Template') : (isMarathi ? 'नवीन टेम्पलेट' : 'New Template')}
                </h3>
                <TemplateForm
                  initial={editingTemplate}
                  ownerPhone={user?.phone}
                  onSave={editingTemplate ? handleUpdate : handleCreate}
                  onCancel={() => { setShowForm(false); setEditingTemplate(null); }}
                />
              </div>
            )}

            {/* Search bar */}
            {templates.length > 0 && (
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
                <input
                  type="text"
                  className="input"
                  placeholder={isMarathi ? 'नाव शोधा...' : 'Search templates by name...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '32px' }}
                />
              </div>
            )}

            {/* Template list */}
            {loading ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {[0,1,2].map(i => (
                  <div key={i} className="skeleton-card" style={{ height: '100px' }}>
                    <div className="skeleton-row">
                      <div className="skeleton skeleton-line" style={{ width: '30%' }} />
                      <div className="skeleton skeleton-line-sm" style={{ width: '80%' }} />
                      <div className="skeleton skeleton-line-sm" style={{ width: '60%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><BookOpen size={40} /></div>
                <h3>{isMarathi ? 'अद्याप टेम्पलेट नाहीत' : 'No templates yet'}</h3>
                <p>{isMarathi ? 'WhatsApp वितरण सूचनांसाठी टेम्पलेट तयार करा.' : 'Create templates for staff to send delivery notifications via WhatsApp.'}</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={handleSeedDefaults} disabled={seeding}>
                  {seeding ? (isMarathi ? 'तयार होत आहे...' : 'Creating...') : (isMarathi ? 'डिफॉल्ट टेम्पलेट तयार करा' : 'Create Default Templates')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '24px' }}>
                {filteredTemplates.length === 0 && searchQuery ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#8D8D8D' }}>
                    {isMarathi ? `"${searchQuery}" साठी कोणतेही टेम्पलेट सापडले नाहीत` : `No templates match "${searchQuery}"`}
                  </div>
                ) : (
                  Object.entries(TYPE_LABELS).map(([typeKey, typeMeta]) => {
                  const group = grouped[typeKey];
                  if (!group?.length) return null;
                  return (
                    <div key={typeKey}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{
                          padding: '3px 10px', fontSize: '12px', fontWeight: 700,
                          backgroundColor: typeMeta.bg, color: typeMeta.color,
                          textTransform: 'uppercase', letterSpacing: '0.5px'
                        }}>
                          {typeMeta.label}
                        </span>
                        <span style={{ fontSize: '12px', color: '#8D8D8D' }}>{group.length} {isMarathi ? 'टेम्पलेट' : `template${group.length !== 1 ? 's' : ''}`}</span>
                      </div>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {group.map(tmpl => (
                          <div key={tmpl._id} style={{
                            backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0',
                            padding: '16px 20px',
                            borderLeft: `4px solid ${typeMeta.color}`
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '15px' }}>{tmpl.name}</span>
                                {tmpl.isDefault && (
                                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', backgroundColor: '#DEFBE6', color: '#0E6027', textTransform: 'uppercase' }}>
                                    {isMarathi ? 'डिफॉल्ट' : 'DEFAULT'}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button title={isMarathi ? 'संदेश कॉपी करा' : 'Copy message'} onClick={() => handleCopy(tmpl.body)}
                                  style={{ background: 'none', border: '1px solid #E0E0E0', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', color: '#525252' }}>
                                  <Copy size={13} />
                                </button>
                                <button title={isMarathi ? 'संपादित करा' : 'Edit'} onClick={() => { setEditingTemplate(tmpl); setShowForm(false); }}
                                  style={{ background: 'none', border: '1px solid #E0E0E0', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', color: '#0F62FE' }}>
                                  <Edit2 size={13} />
                                </button>
                                <button title={isMarathi ? 'हटवा' : 'Delete'} onClick={() => handleDelete(tmpl._id)}
                                  style={{ background: 'none', border: '1px solid #E0E0E0', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', color: '#DA1E28' }}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <div style={{ fontSize: '13px', color: '#525252', lineHeight: 1.6, fontFamily: 'monospace', backgroundColor: '#F4F4F4', padding: '10px 12px', whiteSpace: 'pre-wrap' }}>
                              {tmpl.body}
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#8D8D8D' }}>
                              {isMarathi ? 'पूर्वावलोकन' : 'Preview'}: <span style={{ color: '#161616' }}>{previewMessage(tmpl.body, user?.phone, tmpl.language || 'en')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MessageTemplates;
