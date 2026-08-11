/**
 * ExportButton — dropdown to export data as CSV or PDF.
 * No external libraries. PDF uses browser print-to-PDF.
 *
 * Props:
 *   data        — array of row objects
 *   columns     — [{ key, label, format? }] — format(value, row) optional
 *   filename    — base filename without extension
 *   title       — heading shown in PDF
 *   subtitle    — optional subtitle line in PDF
 *   disabled    — disable the button
 */
import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, Table } from 'lucide-react';

const ExportButton = ({ data = [], columns = [], filename = 'export', title = 'Export', subtitle = '', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── CSV export ────────────────────────────────────────────
  const exportCSV = () => {
    setOpen(false);
    const headers = columns.map(c => c.label);
    const rows = data.map(row =>
      columns.map(c => {
        const val = c.format ? c.format(row[c.key], row) : (row[c.key] ?? '');
        return `"${String(val).replace(/"/g, '""')}"`;
      })
    );
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── PDF export via print ──────────────────────────────────
  const exportPDF = () => {
    setOpen(false);

    const tableRows = data.map(row =>
      `<tr>${columns.map(c => {
        const val = c.format ? c.format(row[c.key], row) : (row[c.key] ?? '');
        return `<td>${String(val)}</td>`;
      }).join('')}</tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; font-size: 11px; color: #161616; padding: 24px; }
    .header { margin-bottom: 20px; border-bottom: 2px solid #161616; padding-bottom: 12px; }
    .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .header p { font-size: 11px; color: #525252; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #161616; color: #FFFFFF; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
    td { padding: 7px 10px; border-bottom: 1px solid #E0E0E0; font-size: 11px; vertical-align: top; }
    tr:nth-child(even) td { background: #F9F9F9; }
    .footer { margin-top: 16px; font-size: 10px; color: #8D8D8D; text-align: right; }
    @media print {
      body { padding: 0; }
      @page { margin: 15mm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
    <p>Generated: ${new Date().toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
  <table>
    <thead>
      <tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">Total records: ${data.length} &nbsp;|&nbsp; Dairy Management</div>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  };

  if (disabled || data.length === 0) return null;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
        title="Export data"
      >
        <Download size={14} />
        Export
        <ChevronDown size={12} style={{ marginLeft: '1px', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0,
          backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          zIndex: 200, minWidth: '160px', overflow: 'hidden'
        }}>
          <button
            onClick={exportCSV}
            style={{
              width: '100%', padding: '10px 16px', border: 'none', cursor: 'pointer',
              backgroundColor: 'transparent', textAlign: 'left', fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '10px', color: '#161616',
              transition: 'background-color 0.1s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#F4F4F4'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Table size={14} color="#24A148" />
            <div>
              <div style={{ fontWeight: 600 }}>CSV</div>
              <div style={{ fontSize: '11px', color: '#8D8D8D' }}>Excel / Sheets compatible</div>
            </div>
          </button>

          <div style={{ height: '1px', backgroundColor: '#F4F4F4' }} />

          <button
            onClick={exportPDF}
            style={{
              width: '100%', padding: '10px 16px', border: 'none', cursor: 'pointer',
              backgroundColor: 'transparent', textAlign: 'left', fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '10px', color: '#161616',
              transition: 'background-color 0.1s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#F4F4F4'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FileText size={14} color="#DA1E28" />
            <div>
              <div style={{ fontWeight: 600 }}>PDF</div>
              <div style={{ fontSize: '11px', color: '#8D8D8D' }}>Print or save as PDF</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
