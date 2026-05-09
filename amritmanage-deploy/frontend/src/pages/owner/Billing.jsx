import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Receipt, IndianRupee, Plus, Eye, EyeOff, RefreshCw, MessageSquare, FileText, ChevronUp, ChevronDown, Zap, Download, Image, Table } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';
import useThrottle from '../../hooks/useThrottle';
import ExportButton from '../../components/ExportButton';
import { useMarathi } from '../../i18n/marathi';

// ── Generate ration-card style bill text for WhatsApp ─────────
const generateBillText = (bill, monthName, year, businessName) => {
  const logs = bill.logSnapshot || [];
  const divider = '━━━━━━━━━━━━━━━━━━━━━━━━';

  let dateRows = '';
  if (logs.length > 0) {
    // Group by date
    const byDate = {};
    logs.forEach(l => {
      if (!byDate[l.date]) byDate[l.date] = { morning: 0, evening: 0, extra: 0, amount: 0 };
      if (l.slot === 'morning') byDate[l.date].morning += l.delivered_qty;
      else byDate[l.date].evening += l.delivered_qty;
      byDate[l.date].extra += (l.extra_qty || 0);
      byDate[l.date].amount += l.amount_calculated;
    });
    const dates = Object.keys(byDate).sort();
    dateRows = '\n' + dates.map(d => {
      const r = byDate[d];
      const day = new Date(d + 'T00:00:00').getDate();
      return `${String(day).padStart(2)} | ${r.morning > 0 ? r.morning.toFixed(1) : '-'} | ${r.evening > 0 ? r.evening.toFixed(1) : '-'} | ${r.extra > 0 ? r.extra.toFixed(1) : '-'} | ₹${r.amount.toFixed(0)}`;
    }).join('\n');
  }

  return `📋 MILK BILL — ${monthName} ${year}
${businessName}
${divider}
Customer: ${bill.customerId?.name}
Phone: ${bill.customerId?.phone}
${divider}
Day | Morn | Eve | Extra | Amount${dateRows}
${divider}
Total Liters: ${bill.totalLiters?.toFixed(1)}L
Amount:       ₹${bill.totalAmount?.toFixed(0)}
Prev Balance: ₹${(bill.previousBalance || 0).toFixed(0)}
Grand Total:  ₹${(bill.grandTotal ?? bill.totalAmount)?.toFixed(0)}
Paid:         ₹${bill.amountPaid?.toFixed(0)}
BALANCE DUE:  ₹${Math.max(0, bill.balance)?.toFixed(0)}
${divider}
Pay to: ${businessName}`;
};

// ── Build bill HTML (shared between print and WhatsApp send) ──
const buildBillHTML = (bill, monthName, year, businessName) => {
  const logs = bill.logSnapshot || [];
  const byDate = {};
  logs.forEach(l => {
    if (!byDate[l.date]) byDate[l.date] = { morning: 0, evening: 0, extra: 0, amount: 0 };
    if (l.slot === 'morning') byDate[l.date].morning += l.delivered_qty;
    else byDate[l.date].evening += l.delivered_qty;
    byDate[l.date].extra += (l.extra_qty || 0);
    byDate[l.date].amount += l.amount_calculated;
  });
  const dates = Object.keys(byDate).sort();

  const rows = dates.map(d => {
    const r = byDate[d];
    const day = new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `<tr>
      <td>${day}</td>
      <td>${r.morning > 0 ? r.morning.toFixed(1) : '—'}</td>
      <td>${r.evening > 0 ? r.evening.toFixed(1) : '—'}</td>
      <td>${r.extra > 0 ? r.extra.toFixed(1) : '—'}</td>
      <td>₹${r.amount.toFixed(0)}</td>
    </tr>`;
  }).join('');

  const safeCompany = (businessName || 'Dairy').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${safeCompany}_billing_${monthName}_${year}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; font-size: 13px; }
  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
  .header h2 { margin: 0; font-size: 18px; }
  .header p { margin: 4px 0; color: #555; }
  .customer { background: #f5f5f5; padding: 10px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #161616; color: #fff; padding: 8px; text-align: left; font-size: 12px; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #fafafa; }
  .summary { border-top: 2px solid #000; padding-top: 12px; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .balance-due { font-size: 16px; font-weight: bold; color: #DA1E28; border-top: 1px solid #000; padding-top: 8px; margin-top: 8px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="header">
  <h2>${businessName}</h2>
  <p>Milk Bill — ${monthName} ${year}</p>
</div>
<div class="customer">
  <strong>${bill.customerId?.name}</strong><br>
  Phone: ${bill.customerId?.phone}
</div>
<table>
  <thead><tr><th>Date</th><th>Morning (L)</th><th>Evening (L)</th><th>Extra (L)</th><th>Amount (₹)</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#888">No daily logs available</td></tr>'}</tbody>
</table>
<div class="summary">
  <div class="summary-row"><span>Total Liters</span><span>${bill.totalLiters?.toFixed(1)}L</span></div>
  <div class="summary-row"><span>Amount</span><span>₹${bill.totalAmount?.toFixed(0)}</span></div>
  <div class="summary-row"><span>Previous Balance</span><span>₹${(bill.previousBalance || 0).toFixed(0)}</span></div>
  <div class="summary-row"><span>Grand Total</span><span>₹${(bill.grandTotal ?? bill.totalAmount)?.toFixed(0)}</span></div>
  <div class="summary-row"><span>Amount Paid</span><span style="color:#24A148">₹${bill.amountPaid?.toFixed(0)}</span></div>
  <div class="balance-due"><div class="summary-row"><span>BALANCE DUE</span><span>₹${Math.max(0, bill.balance)?.toFixed(0)}</span></div></div>
</div>
</body>
</html>`;
};

// ── View bill in new tab (no print/download — non-platinum) ──
const viewBillInTab = (bill, monthName, year, businessName) => {
  const html = buildBillHTML(bill, monthName, year, businessName);
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow popups for this site.'); return; }
  win.document.write(html);
  win.document.close();
  // No win.print() — view only, no download/print controls
};

// ── Platinum: open bill with print/save-as-PDF dialog ─────────
const printBillPDF = (bill, monthName, year, businessName) => {
  const html = buildBillHTML(bill, monthName, year, businessName);
  const safeCompany = (businessName || 'Dairy').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow popups for this site.'); return; }
  win.document.write(html);
  win.document.close();
  win.document.title = `${safeCompany}_billing_${monthName}_${year}`;
  // Trigger browser print/save-as-PDF dialog
  setTimeout(() => { win.print(); }, 500);
};

// ── Platinum: export all bills as CSV ─────────────────────────
const exportAllBillsCSV = (bills, monthName, year, businessName) => {
  const headers = ['Customer', 'Phone', 'Liters', 'Amount (₹)', 'Prev Balance (₹)', 'Grand Total (₹)', 'Paid (₹)', 'Balance (₹)', 'Status'];
  const rows = bills.map(b => [
    b.customerId?.name || '',
    b.customerId?.phone || '',
    b.totalLiters.toFixed(1),
    b.totalAmount.toFixed(0),
    (b.previousBalance || 0).toFixed(0),
    (b.grandTotal ?? b.totalAmount).toFixed(0),
    b.amountPaid.toFixed(0),
    Math.max(0, b.balance).toFixed(0),
    b.status
  ]);
  const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(businessName || 'Dairy').replace(/\s+/g, '_')}_bills_${monthName}_${year}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── Platinum: export all bills as PDF (print dialog) ──────────
const exportAllBillsPDF = (bills, monthName, year, businessName) => {
  const tableRows = bills.map(b => `<tr>
    <td>${b.customerId?.name || ''}</td>
    <td>${b.customerId?.phone || ''}</td>
    <td>${b.totalLiters.toFixed(1)}L</td>
    <td>₹${b.totalAmount.toFixed(0)}</td>
    <td>₹${(b.previousBalance || 0).toFixed(0)}</td>
    <td>₹${(b.grandTotal ?? b.totalAmount).toFixed(0)}</td>
    <td style="color:#24A148">₹${b.amountPaid.toFixed(0)}</td>
    <td style="color:${b.balance > 0 ? '#DA1E28' : '#24A148'}">₹${Math.max(0, b.balance).toFixed(0)}</td>
    <td>${b.status}</td>
  </tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${businessName} Bills ${monthName} ${year}</title>
  <style>body{font-family:Arial,sans-serif;font-size:11px;padding:20px}h2{margin-bottom:4px}p{color:#555;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}th{background:#161616;color:#fff;padding:7px 8px;text-align:left;font-size:10px}
  td{padding:6px 8px;border-bottom:1px solid #eee}tr:nth-child(even){background:#fafafa}
  @media print{body{padding:0}@page{margin:12mm;size:A4 landscape}}</style></head>
  <body><h2>${businessName} — Bills ${monthName} ${year}</h2>
  <p>Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  <table><thead><tr><th>Customer</th><th>Phone</th><th>Liters</th><th>Amount</th><th>Prev Bal</th><th>Grand Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
  <tbody>${tableRows}</tbody></table></body></html>`;
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow popups for this site.'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 400);
};

// ── Platinum: export all bills as image (PNG via canvas) ──────
const exportAllBillsImage = async (bills, monthName, year, businessName) => {
  // Build an HTML table, render in hidden iframe, use html2canvas-like approach
  // Since no external lib, we use SVG foreignObject trick via canvas
  const tableRows = bills.map(b => `<tr>
    <td>${b.customerId?.name || ''}</td><td>${b.customerId?.phone || ''}</td>
    <td>${b.totalLiters.toFixed(1)}L</td><td>₹${b.totalAmount.toFixed(0)}</td>
    <td>₹${(b.grandTotal ?? b.totalAmount).toFixed(0)}</td>
    <td>₹${b.amountPaid.toFixed(0)}</td>
    <td>₹${Math.max(0, b.balance).toFixed(0)}</td><td>${b.status}</td>
  </tr>`).join('');
  const html = `<html><head><meta charset="utf-8">
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;padding:16px;background:#fff;width:900px}
  h2{font-size:15px;margin-bottom:4px}p{color:#555;font-size:10px;margin-bottom:12px}
  table{width:100%;border-collapse:collapse}th{background:#161616;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
  td{padding:5px 8px;border-bottom:1px solid #eee;font-size:11px}tr:nth-child(even){background:#fafafa}</style></head>
  <body><h2>${businessName} — Bills ${monthName} ${year}</h2>
  <p>Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  <table><thead><tr><th>Customer</th><th>Phone</th><th>Liters</th><th>Amount</th><th>Grand Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
  <tbody>${tableRows}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  // Open in new tab — user can screenshot or use browser's print-to-image
  const win = window.open(url, '_blank');
  if (!win) { alert('Please allow popups for this site.'); return; }
  // Revoke after a delay
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

// ── Platinum: Export All Bills dropdown ───────────────────────
const PlatinumExportDropdown = ({ bills, monthName, year, businessName, isMarathi }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
        title={isMarathi ? 'सर्व बिले निर्यात करा' : 'Export all bills'}
      >
        <Download size={14} />
        {isMarathi ? 'निर्यात' : 'Export All'}
        <ChevronDown size={12} style={{ marginLeft: '1px', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0,
          backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          zIndex: 200, minWidth: '180px', overflow: 'hidden'
        }}>
          {[
            { icon: <Table size={14} color="#24A148" />, label: 'CSV', sub: 'Excel / Sheets', action: () => { setOpen(false); exportAllBillsCSV(bills, monthName, year, businessName); } },
            { icon: <FileText size={14} color="#DA1E28" />, label: 'PDF', sub: 'Save as PDF', action: () => { setOpen(false); exportAllBillsPDF(bills, monthName, year, businessName); } },
            { icon: <Image size={14} color="#0F62FE" />, label: isMarathi ? 'इमेज' : 'Image', sub: 'View as image', action: () => { setOpen(false); exportAllBillsImage(bills, monthName, year, businessName); } },
          ].map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ height: '1px', backgroundColor: '#F4F4F4' }} />}
              <button
                onClick={item.action}
                style={{
                  width: '100%', padding: '10px 16px', border: 'none', cursor: 'pointer',
                  backgroundColor: 'transparent', textAlign: 'left', fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '10px', color: '#161616',
                  transition: 'background-color 0.1s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#F4F4F4'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {item.icon}
                <div>
                  <div style={{ fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: '#8D8D8D' }}>{item.sub}</div>
                </div>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

const Billing = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [showRate, setShowRate] = useState(false);
  const [sendingBill, setSendingBill] = useState(null); // billId being sent
  const { user } = useAuth();
  const toast = useToast();
  const showSkeleton = useDelayedLoading(loading, 800);
  const canExport = user?.features?.advanced_reports;
  const isPlatinum = user?.features?.custom_message_templates;
  const { isMarathi } = useMarathi();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const [expandedId, setExpandedId] = useState(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/owner/bills', { params: { month, year } });
      setBills(data.bills);
    } catch (err) {
      toast.error('Failed to load bills.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const throttledRefresh = useThrottle(fetchBills);

  const generateBills = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/owner/bills/generate', { month, year });
      toast.success(`Generated ${data.count} bill(s).`);
      fetchBills();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate bills.');
    } finally {
      setGenerating(false);
    }
  };

  const totalRevenue = bills.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid    = bills.reduce((s, b) => s + b.amountPaid, 0);
  // Pending = sum of (grandTotal - amountPaid) for unpaid/partial bills only
  const totalPending = bills.reduce((s, b) => {
    const outstanding = (b.grandTotal ?? b.totalAmount) - b.amountPaid;
    return s + Math.max(0, outstanding);
  }, 0);

  const MONTHS = isMarathi
    ? ['जाने','फेब्रु','मार्च','एप्रि','मे','जून','जुलै','ऑग','सप्टें','ऑक्टो','नोव्हें','डिसें']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const L = isMarathi ? 'ली.' : 'L';

  const handleSendPDFWhatsApp = async (bill) => {
    setSendingBill(bill._id);
    try {
      const monthName = MONTHS[bill.month - 1];
      const businessName = user?.businessName || 'Dairy';
      const html = buildBillHTML(bill, monthName, bill.year, businessName);
      const safeCompany = businessName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const filename = `${safeCompany}_billing_${monthName}_${bill.year}.pdf`;
      await api.post(`/owner/bills/${bill._id}/send-pdf-whatsapp`, { html, filename });
      toast.success(isMarathi ? 'PDF WhatsApp वर पाठवले.' : 'PDF sent via WhatsApp.');
    } catch (err) {
      toast.error(err.response?.data?.error || (isMarathi ? 'PDF पाठवता आले नाही.' : 'Failed to send PDF via WhatsApp.'));
    } finally {
      setSendingBill(null);
    }
  };

  // Export column definitions
  const exportColumns = [
    { key: 'customer',      label: isMarathi ? 'ग्राहक'       : 'Customer',      format: (_, b) => b.customerId?.name || '' },
    { key: 'phone',         label: isMarathi ? 'फोन'          : 'Phone',         format: (_, b) => b.customerId?.phone || '' },
    { key: 'totalLiters',   label: isMarathi ? 'लिटर'         : 'Liters',        format: (_, b) => b.totalLiters.toFixed(1) },
    { key: 'totalAmount',   label: isMarathi ? 'रक्कम (₹)'    : 'Amount (₹)',    format: (_, b) => b.totalAmount.toFixed(0) },
    { key: 'prevBalance',   label: isMarathi ? 'मागील शिल्लक' : 'Prev Balance',  format: (_, b) => (b.previousBalance || 0).toFixed(0) },
    { key: 'grandTotal',    label: isMarathi ? 'एकूण'         : 'Grand Total',   format: (_, b) => (b.grandTotal ?? b.totalAmount).toFixed(0) },
    { key: 'amountPaid',    label: isMarathi ? 'भरले (₹)'     : 'Paid (₹)',      format: (_, b) => b.amountPaid.toFixed(0) },
    { key: 'balance',       label: isMarathi ? 'शिल्लक (₹)'  : 'Balance (₹)',   format: (_, b) => Math.max(0, b.balance).toFixed(0) },
    { key: 'status',        label: isMarathi ? 'स्थिती'       : 'Status',        format: (_, b) => b.status },
  ];

  const statusBadge = (status) => {
    const map = { paid: 'badge-green', partial: 'badge-yellow', pending: 'badge-red' };
    const label = isMarathi
      ? { paid: 'भरले', partial: 'अंशतः', pending: 'बाकी' }[status]
      : status;
    return <span className={`badge ${map[status]}`}>{label}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isMarathi ? 'बिलिंग' : 'Billing'}</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 'auto' }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input" style={{ width: 'auto' }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={throttledRefresh} disabled={loading} title={isMarathi ? 'ताजे करा' : 'Refresh'}>
            <RefreshCw size={14} />
          </button>
          {canExport && (
            <ExportButton
              data={bills}
              columns={exportColumns}
              filename={`bills-${MONTHS[month - 1]}-${year}`}
              title={`${isMarathi ? 'बिले' : 'Bills'} — ${MONTHS[month - 1]} ${year}`}
              subtitle={`${user?.businessName || ''} | ${isMarathi ? 'एकूण' : 'Total'}: ₹${totalRevenue.toFixed(0)} | ${isMarathi ? 'जमा' : 'Collected'}: ₹${totalPaid.toFixed(0)} | ${isMarathi ? 'थकबाकी' : 'Pending'}: ₹${totalPending.toFixed(0)}`}
            />
          )}
          {isPlatinum && bills.length > 0 && (
            <PlatinumExportDropdown
              bills={bills}
              monthName={MONTHS[month - 1]}
              year={year}
              businessName={user?.businessName || 'Dairy'}
              isMarathi={isMarathi}
            />
          )}
          <button className="btn btn-primary btn-sm" onClick={generateBills} disabled={generating}>
            {generating
              ? (isMarathi ? 'तयार होत आहे...' : 'Generating...')
              : <><Receipt size={14} /> {isMarathi ? 'बिले तयार करा' : 'Generate Bills'}</>}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Summary */}
        {bills.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-label">{isMarathi ? 'एकूण बिल' : 'Total Billed'}</div>
              <div className="stat-value">₹{totalRevenue.toFixed(0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{isMarathi ? 'जमा' : 'Collected'}</div>
              <div className="stat-value" style={{ color: '#24A148' }}>₹{totalPaid.toFixed(0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{isMarathi ? 'थकबाकी' : 'Pending'}</div>
              <div className="stat-value" style={{ color: '#DA1E28' }}>₹{totalPending.toFixed(0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{isMarathi ? 'ग्राहक' : 'Customers'}</div>
              <div className="stat-value">{bills.length}</div>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 0 }}>
          {showSkeleton ? (
            <div style={{ padding: '16px' }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', padding: '14px 0', borderBottom: i < 4 ? '1px solid #F4F4F4' : 'none' }}>
                  <div className="skeleton-row" style={{ gap: '6px' }}>
                    <div className="skeleton skeleton-line" style={{ width: '60%' }} />
                    <div className="skeleton skeleton-line-sm" style={{ width: '40%' }} />
                  </div>
                  {[0,1,2,3,4].map(j => (
                    <div key={j} className="skeleton skeleton-line" style={{ width: '55%' }} />
                  ))}
                </div>
              ))}
            </div>
          ) : loading ? null : bills.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Receipt size={40} /></div>
              <h3>{isMarathi ? `${MONTHS[month - 1]} ${year} साठी बिले नाहीत` : `No bills for ${MONTHS[month - 1]} ${year}`}</h3>
              <p>{isMarathi ? '"बिले तयार करा" वर क्लिक करा.' : 'Click "Generate Bills" to create bills from this month\'s delivery logs.'}</p>
            </div>
          ) : isMobile ? (
            /* ── Mobile accordion ── */
            <div style={{ padding: '8px' }}>
              {bills.map(bill => {
                const isExpanded = expandedId === bill._id;
                return (
                  <div key={bill._id} style={{ border: '1px solid #E0E0E0', marginBottom: '8px', backgroundColor: '#FFFFFF' }}>
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : bill._id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{bill.customerId?.name}</div>
                        <div style={{ fontSize: '12px', color: '#525252' }}>{MONTHS[bill.month - 1]} {bill.year}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700 }}>₹{(bill.grandTotal ?? bill.totalAmount).toFixed(0)}</span>
                        {statusBadge(bill.status)}
                        {isExpanded ? <ChevronUp size={16} color="#8D8D8D" /> : <ChevronDown size={16} color="#8D8D8D" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #F4F4F4', padding: '12px 14px', backgroundColor: '#FAFAFA' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '12px' }}>
                          <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'ली.' : 'Liters'}: </span><strong>{bill.totalLiters.toFixed(1)}L</strong></div>
                          <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'रक्कम' : 'Amount'}: </span><strong>₹{bill.totalAmount.toFixed(0)}</strong></div>
                          <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'मागील' : 'Prev Bal'}: </span><strong style={{ color: bill.previousBalance > 0 ? '#DA1E28' : '#8D8D8D' }}>₹{(bill.previousBalance || 0).toFixed(0)}</strong></div>
                          <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'एकूण' : 'Grand Total'}: </span><strong>₹{(bill.grandTotal ?? bill.totalAmount).toFixed(0)}</strong></div>
                          <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'भरले' : 'Paid'}: </span><strong style={{ color: '#24A148' }}>₹{bill.amountPaid.toFixed(0)}</strong></div>
                          <div><span style={{ color: '#8D8D8D' }}>{isMarathi ? 'शिल्लक' : 'Balance'}: </span><strong style={{ color: bill.balance > 0 ? '#DA1E28' : '#24A148' }}>₹{Math.max(0, bill.balance).toFixed(0)}</strong></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {bill.status !== 'paid' && (
                            <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => setPaymentModal(bill)}>
                              <Plus size={13} /> {isMarathi ? 'देयक' : 'Pay'}
                            </button>
                          )}
                          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => viewBillInTab(bill, MONTHS[bill.month - 1], bill.year, user?.businessName || 'Dairy')}>
                            <FileText size={13} /> {isMarathi ? 'पाहा' : 'View'}
                          </button>
                          {isPlatinum && (
                            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => printBillPDF(bill, MONTHS[bill.month - 1], bill.year, user?.businessName || 'Dairy')}>
                              <FileText size={13} /> {isMarathi ? 'PDF' : 'PDF'}
                            </button>
                          )}
                          {isPlatinum && (
                            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleSendPDFWhatsApp(bill)} disabled={sendingBill === bill._id}>
                              <MessageSquare size={13} /> WA
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Desktop table ── */
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{isMarathi ? 'ग्राहक' : 'Customer'}</th>
                    <th>{isMarathi ? 'ली.' : 'Liters'}</th>
                    <th>{isMarathi ? 'रक्कम' : 'Amount'}</th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isMarathi ? 'दर' : 'Rate'}
                        <button
                          onClick={() => setShowRate(v => !v)}
                          title={showRate ? (isMarathi ? 'दर लपवा' : 'Hide rate') : (isMarathi ? 'दर दाखवा' : 'Show rate')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#8D8D8D', display: 'flex', alignItems: 'center' }}
                        >
                          {showRate ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </th>
                    <th>{isMarathi ? 'मागील शिल्लक' : 'Prev Balance'}</th>
                    <th>{isMarathi ? 'एकूण' : 'Grand Total'}</th>
                    <th>{isMarathi ? 'भरले' : 'Paid'}</th>
                    <th>{isMarathi ? 'शिल्लक' : 'Balance'}</th>
                    <th>{isMarathi ? 'स्थिती' : 'Status'}</th>
                    <th>{isMarathi ? 'क्रिया' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(bill => (
                    <tr key={bill._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{bill.customerId?.name}</div>
                        <div style={{ fontSize: '12px', color: '#8D8D8D' }}>{bill.customerId?.phone}</div>
                      </td>
                      <td>{bill.totalLiters.toFixed(1)}{L}</td>
                      <td>₹{bill.totalAmount.toFixed(0)}</td>
                      <td>
                        {showRate
                          ? <span style={{ fontWeight: 600 }}>₹{bill.totalLiters > 0 ? (bill.totalAmount / bill.totalLiters).toFixed(1) : '—'}/{L}</span>
                          : <span style={{ color: '#C6C6C6', fontSize: '12px' }}>••••</span>}
                      </td>
                      <td style={{ color: bill.previousBalance > 0 ? '#DA1E28' : '#8D8D8D' }}>
                        {bill.previousBalance > 0 ? `₹${bill.previousBalance.toFixed(0)}` : '—'}
                      </td>
                      <td style={{ fontWeight: 700 }}>₹{(bill.grandTotal ?? bill.totalAmount).toFixed(0)}</td>
                      <td style={{ color: '#24A148', fontWeight: 600 }}>₹{bill.amountPaid.toFixed(0)}</td>
                      <td style={{ color: bill.balance > 0 ? '#DA1E28' : '#24A148', fontWeight: 700 }}>
                        ₹{Math.max(0, bill.balance).toFixed(0)}
                      </td>
                      <td>{statusBadge(bill.status)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {bill.status !== 'paid' && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => setPaymentModal(bill)}
                            >
                              <Plus size={13} /> {isMarathi ? 'देयक' : 'Payment'}
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => viewBillInTab(bill, MONTHS[bill.month - 1], bill.year, user?.businessName || 'Dairy')}
                            title={isMarathi ? 'बिल पाहा' : 'View Bill'}
                          >
                            <FileText size={13} /> {isMarathi ? 'पाहा' : 'View'}
                          </button>
                          {isPlatinum && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => printBillPDF(bill, MONTHS[bill.month - 1], bill.year, user?.businessName || 'Dairy')}
                              title="Download PDF"
                            >
                              <FileText size={13} /> PDF
                            </button>
                          )}
                          {isPlatinum && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleSendPDFWhatsApp(bill)}
                              disabled={sendingBill === bill._id}
                              title="Send PDF via WhatsApp"
                            >
                              {sendingBill === bill._id
                                ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                                : <MessageSquare size={13} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isPlatinum && bills.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#F3F0FF', border: '1px solid rgba(138,63,252,0.2)', fontSize: '13px', color: '#6929C4', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={14} />
            <span>
              <strong>{isMarathi ? 'Platinum फीचर:' : 'Platinum feature:'}</strong>{' '}
              {isMarathi ? 'PDF बिल डाउनलोड करा आणि WhatsApp वर पाठवा.' : 'Download PDF bills and send them directly to customers via WhatsApp.'}{' '}
              <Link to="/app/owner/upgrade" state={{ selectedPlan: 'platinum' }} style={{ color: '#6929C4', fontWeight: 700 }}>
                {isMarathi ? 'Platinum वर अपग्रेड करा →' : 'Upgrade to Platinum →'}
              </Link>
            </span>
          </div>
        )}
      </div>

      {paymentModal && (
        <PaymentModal
          bill={paymentModal}
          onClose={() => setPaymentModal(null)}
          onSaved={(updatedBill) => {
            // Optimistic: update the bill in local state without refetching
            if (updatedBill && updatedBill._id) {
              setBills(prev => prev.map(b => b._id === updatedBill._id ? { ...b, ...updatedBill } : b));
            } else {
              fetchBills(); // fallback
            }
            setPaymentModal(null);
          }}
        />
      )}
    </div>
  );
};

const PaymentModal = ({ bill, onClose, onSaved }) => {
  const outstanding = Math.max(0, (bill.grandTotal ?? bill.totalAmount) - bill.amountPaid);
  const [amount, setAmount] = useState(outstanding.toFixed(0));
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { isMarathi } = useMarathi();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paid = parseFloat(amount);
    if (!paid || paid <= 0) return;
    setLoading(true);

    // ── Optimistic update — update UI instantly, no refetch ──
    const newAmountPaid = bill.amountPaid + paid;
    const newBalance = (bill.grandTotal ?? bill.totalAmount) - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending';
    const optimisticBill = { ...bill, amountPaid: newAmountPaid, balance: newBalance, status: newStatus };

    // Close modal immediately with optimistic data
    onSaved(optimisticBill);
    onClose();

    try {
      await api.post(`/owner/bills/${bill._id}/payment`, { amount: paid, method, note });
      toast.success(isMarathi ? 'देयक नोंदवले.' : 'Payment recorded.');
    } catch (err) {
      // Rollback on failure
      onSaved(bill);
      toast.error(err.response?.data?.error || (isMarathi ? 'देयक नोंदवता आले नाही.' : 'Failed to record payment.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '20px' }}>{isMarathi ? 'देयक नोंदवा' : 'Record Payment'}</h2>
        <p style={{ color: '#525252', fontSize: '14px', marginBottom: '24px' }}>
          {bill.customerId?.name} — {isMarathi ? 'शिल्लक' : 'Balance'}: <strong>₹{outstanding.toFixed(0)}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">{isMarathi ? 'रक्कम (₹)' : 'Amount (₹)'}</label>
            <input
              type="number"
              className="input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="1"
              step="1"
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">{isMarathi ? 'देयक पद्धत' : 'Payment Method'}</label>
            <select className="input" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="cash">{isMarathi ? 'रोख' : 'Cash'}</option>
              <option value="upi">UPI</option>
              <option value="bank">{isMarathi ? 'बँक ट्रान्सफर' : 'Bank Transfer'}</option>
              <option value="other">{isMarathi ? 'इतर' : 'Other'}</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">{isMarathi ? 'नोंद (पर्यायी)' : 'Note (optional)'}</label>
            <input
              type="text"
              className="input"
              placeholder={isMarathi ? 'उदा. PhonePe द्वारे भरले' : 'e.g. Paid via PhonePe'}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>{isMarathi ? 'रद्द करा' : 'Cancel'}</button>
            <button type="submit" className="btn btn-success btn-full" disabled={loading}>
              {loading ? (isMarathi ? 'जतन होत आहे...' : 'Saving...') : <><IndianRupee size={14} /> {isMarathi ? 'देयक नोंदवा' : 'Record Payment'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Billing;
