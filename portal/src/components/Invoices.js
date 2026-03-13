import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';

export default function Invoices({ clientId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, [clientId]);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .order('issued_date', { ascending: false });
    if (!error) setInvoices(data || []);
    setLoading(false);
  };

  const amountDue = invoices.filter(i => i.status === 'due').reduce((sum, i) => sum + Number(i.amount), 0);
  const amountPending = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + Number(i.amount), 0);

  const fmt = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const statusLabel = { due: 'Due', pending: 'Pending', paid: 'Paid' };

  if (loading) return <div style={css.loading}>Loading invoices…</div>;

  return (
    <>
      <div style={css.summaryRow}>
        <div style={css.summaryCard}>
          <div style={css.summaryLabel}>Amount Due</div>
          <div style={{...css.summaryValue, color: amountDue > 0 ? 'var(--orange)' : 'var(--navy)'}}>{fmt(amountDue)}</div>
          {invoices.find(i => i.status === 'due') && (
            <div style={css.summarySub}>Due {fmtDate(invoices.find(i => i.status === 'due')?.due_date)}</div>
          )}
        </div>
        <div style={css.summaryCard}>
          <div style={css.summaryLabel}>Amount Pending</div>
          <div style={{...css.summaryValue, color: 'var(--slate)'}}>{fmt(amountPending)}</div>
          <div style={css.summarySub}>Awaiting confirmation</div>
        </div>
      </div>

      <div style={css.card}>
        {invoices.length === 0 ? (
          <div style={css.empty}>No invoices yet.</div>
        ) : (
          <table style={css.table}>
            <thead>
              <tr>
                {['Invoice', 'Description', 'Issued', 'Due', 'Amount', 'Status', ''].map(h => (
                  <th key={h} style={css.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={css.tr}>
                  <td style={{...css.td, fontWeight:700}}>{inv.invoice_number}</td>
                  <td style={{...css.td, color:'var(--slate)'}}>{inv.description}</td>
                  <td style={css.td}>{fmtDate(inv.issued_date)}</td>
                  <td style={css.td}>{fmtDate(inv.due_date)}</td>
                  <td style={{...css.td, fontWeight:700}}>{fmt(inv.amount)}</td>
                  <td style={css.td}>
                    <span style={{...css.pill, ...css[`pill_${inv.status}`]}}>{statusLabel[inv.status]}</span>
                  </td>
                  <td style={css.td}>
                    {inv.status === 'due' && (
                      <button style={css.payBtn} onClick={() => { setSelectedInvoice(inv); setModal('pay'); }}>Pay Now</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pay Modal */}
      {modal === 'pay' && selectedInvoice && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>Pay Invoice</div>
            <div style={css.modalSub}>{selectedInvoice.invoice_number} · {fmt(selectedInvoice.amount)} due {fmtDate(selectedInvoice.due_date)}</div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Pay with</label>
              <select style={css.formSelect}>
                <option>Card on file (Visa ···· 4242)</option>
                <option>Add new card</option>
              </select>
            </div>
            <div style={{fontSize:13, color:'var(--slate)', marginTop:4}}>Payment processed securely via QuickBooks.</div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={css.btnSubmit} onClick={() => setModal(null)}>Pay {fmt(selectedInvoice.amount)}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
