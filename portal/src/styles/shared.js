export const css = {
  // Layout
  loading: { fontSize: 14, color: 'var(--slate)', padding: 24 },
  empty: { fontSize: 14, color: 'var(--slate)', textAlign: 'center', padding: '24px 0' },

  // Cards
  card: { background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, boxShadow: 'var(--shadow)' },
  cardTitle: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--slate)', marginBottom: 16 },

  // Summary boxes
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 },
  summaryCard: { background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 28px', boxShadow: 'var(--shadow)' },
  summaryLabel: { fontSize: 11, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, fontWeight: 700 },
  summaryValue: { fontFamily: "'GaramondPro', Georgia, serif", fontSize: 36 },
  summarySub: { fontSize: 12, color: 'var(--slate)', marginTop: 4 },

  // Table
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 12px 12px', borderBottom: '1px solid var(--border)' },
  td: { padding: '14px 12px', borderBottom: '1px solid var(--border)' },
  tr: {},

  // Status pills
  pill: { fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '3px 10px', display: 'inline-block' },
  pill_paid: { background: 'var(--blue-light)', color: 'var(--blue)' },
  pill_due: { background: 'var(--orange-light)', color: 'var(--orange)' },
  pill_pending: { background: '#eef0f2', color: 'var(--slate)' },
  pill_open: { background: 'var(--orange-light)', color: 'var(--orange)' },
  pill_completed: { background: 'var(--blue-light)', color: 'var(--blue)' },
  pill_awaiting: { background: '#f3f0fb', color: '#7c5cbf' },
  pill_in_progress: { background: 'var(--orange-light)', color: 'var(--orange)' },
  pill_on_hold: { background: '#eef0f2', color: 'var(--slate)' },
  pill_rejected: { background: '#fee2e2', color: '#dc2626' },

  // Buttons
  primaryBtn: { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  secondaryBtn: { background: 'var(--white)', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 7, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  payBtn: { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },

  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(30,41,59,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--white)', borderRadius: 14, padding: 32, width: 480, maxWidth: '95vw', boxShadow: '0 24px 64px rgba(30,41,59,0.22)' },
  modalTitle: { fontFamily: "'GaramondPro', Georgia, serif", fontSize: 24, marginBottom: 24 },
  modalSub: { fontSize: 14, color: 'var(--slate)', marginBottom: 20 },
  modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 },
  btnCancel: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '10px 20px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },
  btnSubmit: { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },

  // Forms
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--slate)', marginBottom: 6, display: 'block' },
  formInput: { width: '100%', border: '1px solid var(--border)', borderRadius: 7, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', background: 'var(--cream)', outline: 'none' },
  formSelect: { width: '100%', border: '1px solid var(--border)', borderRadius: 7, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', background: 'var(--cream)', outline: 'none' },
  formTextarea: { width: '100%', border: '1px solid var(--border)', borderRadius: 7, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', background: 'var(--cream)', outline: 'none', resize: 'vertical', minHeight: 90 },
};
