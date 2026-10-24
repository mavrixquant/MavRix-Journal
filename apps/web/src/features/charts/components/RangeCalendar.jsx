import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CSS = `
  .rc-wrap { display: flex; flex-direction: column; gap: 12px; }
  .rc-grid { display: flex; gap: 16px; }
  .rc-month { width: 210px; }
  .rc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .rc-title { font-size: 11.5px; font-weight: 700; color: #E7E9EE; font-family: 'IBM Plex Mono', monospace; }
  .rc-nav { background: none; border: none; color: #8892A3; cursor: pointer; padding: 4px; border-radius: 6px; }
  .rc-nav:hover { background: rgba(255,255,255,.06); color: var(--accent); }
  .rc-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 4px; }
  .rc-dow { text-align: center; font-size: 9px; font-weight: 700; color: #545E6E; font-family: 'IBM Plex Mono', monospace; letter-spacing: .06em; }
  .rc-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .rc-day {
    aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
    font-size: 11.5px; font-family: 'IBM Plex Mono', monospace;
    background: transparent; border: 1px solid transparent; border-radius: 6px;
    color: #E7E9EE; cursor: pointer; transition: all .1s;
  }
  .rc-day:hover:not(:disabled) { background: rgba(255,255,255,.08); }
  .rc-day:disabled { color: #545E6E; opacity: .3; cursor: not-allowed; }
  .rc-day.is-outside { color: #545E6E; opacity: .4; }
  .rc-day.is-today { font-weight: 700; color: var(--accent); border-color: rgba(245,158,11,.4); }
  .rc-day.is-range { background: rgba(245,158,11,.12); border-radius: 0; }
  .rc-day.is-start { background: linear-gradient(90deg, transparent 50%, rgba(245,158,11,.12) 50%); border-radius: 6px 0 0 6px; }
  .rc-day.is-end { background: linear-gradient(90deg, rgba(245,158,11,.12) 50%, transparent 50%); border-radius: 0 6px 6px 0; }
  .rc-day.is-selected { background: var(--accent) !important; color: #0D1117 !important; font-weight: 700; border-radius: 6px; }
  .rc-foot { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.06); }
  .rc-btn { background: transparent; border: none; font-size: 11.5px; font-weight: 600; color: #8892A3; cursor: pointer; padding: 6px 12px; border-radius: 6px; font-family: 'IBM Plex Mono', monospace; }
  .rc-btn:hover { color: #E7E9EE; background: rgba(255,255,255,.06); }
  .rc-btn-primary { background: var(--accent); color: #0D1117; }
  .rc-btn-primary:hover { background: var(--accent-2); color: #0D1117; }
`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOWS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function RangeCalendar({ initialFrom, initialTo, onApply, onClose }) {
  const [from, setFrom] = useState(initialFrom ? new Date(initialFrom) : new Date());
  const [to, setTo] = useState(initialTo ? new Date(initialTo) : new Date());
  const [selecting, setSelecting] = useState('from'); // 'from' | 'to'
  
  const [viewYear, setViewYear] = useState(from.getFullYear());
  const [viewMonth, setViewMonth] = useState(from.getMonth());

  const nextMonth = viewMonth === 11 ? { y: viewYear + 1, m: 0 } : { y: viewYear, m: viewMonth + 1 };

  const handleDayClick = (d) => {
    if (selecting === 'from') {
      setFrom(d);
      if (d > to) setTo(d);
      setSelecting('to');
    } else {
      if (d < from) { setFrom(d); setTo(from); }
      else setTo(d);
      setSelecting('from');
    }
  };

  const isSelected = (d) => 
    (from && d.toDateString() === from.toDateString()) || 
    (to && d.toDateString() === to.toDateString());

  const isInRange = (d) => from && to && d > from && d < to;

  const renderMonth = (y, m, isSecondary) => {
    const daysInMonth = getDaysInMonth(y, m);
    const firstDay = getFirstDayOfMonth(y, m);
    const today = new Date();
    
    const blanks = Array.from({ length: firstDay }).map((_, i) => <div key={`b-${i}`} />);
    const days = Array.from({ length: daysInMonth }).map((_, i) => {
      const d = new Date(y, m, i + 1);
      const sel = isSelected(d);
      const rng = isInRange(d);
      const isStart = from && d.toDateString() === from.toDateString();
      const isEnd = to && d.toDateString() === to.toDateString();
      
      let cls = 'rc-day';
      if (sel) cls += ' is-selected';
      else if (isStart) cls += ' is-start';
      else if (isEnd) cls += ' is-end';
      else if (rng) cls += ' is-range';
      if (d.toDateString() === today.toDateString()) cls += ' is-today';
      
      return (
        <button key={i} className={cls} onClick={() => handleDayClick(d)}>
          {i + 1}
        </button>
      );
    });

    return (
      <div className="rc-month">
        <div className="rc-head">
          <span className="rc-title">{MONTHS[m]} {y}</span>
          {!isSecondary && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="rc-nav" onClick={() => { if (m===0){setViewMonth(11);setViewYear(y-1)}else setViewMonth(m-1) }}><ChevronLeft size={14}/></button>
              <button className="rc-nav" onClick={() => { if (m===11){setViewMonth(0);setViewYear(y+1)}else setViewMonth(m+1) }}><ChevronRight size={14}/></button>
            </div>
          )}
        </div>
        <div className="rc-week">{DOWS.map(d => <span key={d} className="rc-dow">{d}</span>)}</div>
        <div className="rc-days">{blanks}{days}</div>
      </div>
    );
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="rc-wrap">
        <div className="rc-grid">
          {renderMonth(viewYear, viewMonth, false)}
          {renderMonth(nextMonth.y, nextMonth.m, true)}
        </div>
        <div className="rc-foot">
          <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: 'var(--ink-2)' }}>
            {from.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})} – {to.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="rc-btn" onClick={onClose}>Cancel</button>
            <button 
              className="rc-btn rc-btn-primary" 
              onClick={() => onApply(from, to)}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </>
  );
}