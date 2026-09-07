// src/components/dashboard/Footer.jsx
export default function Footer() {
  return (
    <footer style={{
      textAlign: 'center',
      color: 'var(--text-faint)',
      fontFamily: 'var(--mono)',
      fontSize: '10.5px',
      marginTop: '50px',
      padding: '0 28px',
      lineHeight: '1.7',
    }}>
      <b>Rules applied:</b> Fixed stop-loss = 12.5pt. SL counted as HIT only when MAE ≥ 12.5 (a real full-stop excursion). 
      Win when MFE ≥ 12.5 × R, regardless of MAE — including MAE = 0, since that can mean price ran straight to TP with 
      zero drawdown before falling back to the stop afterward. Otherwise (target not reached), scored as a loss. 
      No breakeven / scratch bucket.<br/>
      Sessions (ET): Asia 18:00–02:00 · London 02:00–05:00 · NY Pre-Market 05:00–08:30 · NY AM 08:30–11:00 · 
      NY Lunch 11:00–13:30 · NY PM 13:30–16:00 · After Hours 16:00–18:00.
    </footer>
  );
}