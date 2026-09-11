// src/components/dashboard/DashboardConfigModal.jsx
import Portal from '../common/Portal';
import { FaTimes, FaUndo, FaCheck } from 'react-icons/fa';

export const SECTION_LABELS = {
  calendar: 'Monthly Calendar & Weekly',
  hero: 'Cumulative Equity Hero',
  monthly: 'Monthly R / Net P&L',
  underwater: 'Underwater Curve',
  kpiGrid: 'Core KPI Grid',
  advancedKpiGrid: 'Advanced KPI Grid',
  timeChart: 'Time of Day Chart',
  durationWidget: 'Holding Time Widget',
  rollingExpectancy: 'Rolling 20-Trade Expectancy',
  rrCompare: 'RR Comparison / Symbol Breakdown',
  categoryCharts: 'Session / DOW / Direction Charts',
};

export const SECTION_GROUPS = [
  { title: 'Left Column',  keys: ['calendar', 'hero', 'monthly', 'underwater'] },
  { title: 'Right Column', keys: ['kpiGrid', 'advancedKpiGrid', 'timeChart', 'durationWidget', 'rollingExpectancy', 'rrCompare', 'categoryCharts'] },
];

export const DEFAULT_VISIBLE = {
  calendar: true,
  hero: true,
  monthly: true,
  underwater: true,
  kpiGrid: true,
  advancedKpiGrid: true,
  timeChart: true,
  durationWidget: true,
  rollingExpectancy: true,
  rrCompare: true,
  categoryCharts: true,
};

export default function DashboardConfigModal({ isOpen, onClose, visibleSections, onToggle, onReset }) {
  if (!isOpen) return null;

  return (
    <Portal>
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(5, 7, 10, 0.82)', backdropFilter: 'blur(6px)', padding: '16px',
        }}
      >
        <div style={{
          width: '100%', maxWidth: '560px', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          background: '#0D1117', border: '1px solid #212836', borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)', color: '#E7E9EE',
          fontFamily: "'Inter', sans-serif", overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #1A2029', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '17px', fontWeight: 600, color: '#FFF' }}>
                Customize Dashboard
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#8892A3' }}>
                Toggle sections and drag the divider on the dashboard to resize columns.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#8892A3', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E7E9EE')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8892A3')}
            ><FaTimes size={16} /></button>
          </div>

          {/* Body */}
          <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {SECTION_GROUPS.map((group) => (
              <div key={group.title}>
                <div style={{
                  fontSize: '10.5px', fontWeight: 700, color: '#8892A3',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px',
                }}>{group.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {group.keys.map((key) => {
                    const isOn = visibleSections[key];
                    return (
                      <button
                        key={key}
                        onClick={() => onToggle(key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 12px',
                          background: isOn ? 'rgba(255, 176, 32, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${isOn ? 'rgba(255, 176, 32, 0.35)' : '#212836'}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          color: isOn ? '#E7E9EE' : '#8892A3',
                          textAlign: 'left',
                          fontSize: '13px', fontWeight: 500,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '18px', height: '18px', borderRadius: '5px',
                          background: isOn ? '#FFB020' : 'transparent',
                          border: `1.5px solid ${isOn ? '#FFB020' : '#3A4456'}`,
                          flexShrink: 0,
                          color: isOn ? '#0D1117' : 'transparent',
                        }}>
                          {isOn && <FaCheck size={10} />}
                        </span>
                        {SECTION_LABELS[key]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 22px', borderTop: '1px solid #1A2029',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            background: 'rgba(0,0,0,0.15)',
          }}>
            <button
              onClick={onReset}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '8px 14px', background: 'transparent',
                border: '1px solid #212836', borderRadius: '8px',
                color: '#8892A3', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#FF5C5C'; e.currentTarget.style.borderColor = 'rgba(255, 92, 92, 0.35)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#8892A3'; e.currentTarget.style.borderColor = '#212836'; }}
            >
              <FaUndo size={11} /> Reset to default
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 22px', background: '#FFB020', color: '#0D1117',
                border: 'none', borderRadius: '8px',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              }}
            >Done</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}