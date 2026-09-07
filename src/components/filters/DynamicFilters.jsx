// src/components/filters/DynamicFilters.jsx
import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useFilters } from '../../hooks/useFilters';

export default function DynamicFilters() {
  const { state } = useAppContext();
  const { setFilterSelection } = useFilters();
  const [openPanelKey, setOpenPanelKey] = useState(null);
  const panelRefs = useRef({});

  // Compute possible values for each dynamic key from trades
  const getOptions = (key) => {
    const values = [...new Set(state.trades.map(t => t.dynamic[key]))]
      .filter(v => v && v !== '—')
      .sort();
    return values;
  };

  const togglePanel = (key) => {
    setOpenPanelKey(prev => (prev === key ? null : key));
  };

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openPanelKey !== null) {
        const panel = panelRefs.current[openPanelKey];
        if (panel && !panel.contains(e.target)) {
          setOpenPanelKey(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openPanelKey]);

  const handleCheckboxChange = (key, value, checked) => {
    const currentSelections = state.filterSelections[key] || [];
    let newSelections;
    if (checked) {
      newSelections = [...currentSelections, value];
    } else {
      newSelections = currentSelections.filter(v => v !== value);
    }
    setFilterSelection(key, newSelections);
  };

  // Helper to get button label
  const getButtonLabel = (key) => {
    const selected = state.filterSelections[key] || [];
    if (selected.length === 0) return `${key}: All`;
    return `${key}: ${selected.length} selected`;
  };

  if (state.dynamicFilterKeys.length === 0) return null;

  return (
    <div className="filter-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      {state.dynamicFilterKeys.map(key => {
        const options = getOptions(key);
        const selected = state.filterSelections[key] || [];
        const isOpen = openPanelKey === key;

        return (
          <div key={key} className="ms-filter" ref={el => panelRefs.current[key] = el}>
            <button
              className={`ms-btn ${selected.length > 0 ? 'active' : ''}`}
              onClick={() => togglePanel(key)}
            >
              {getButtonLabel(key)}
            </button>
            <div className={`ms-panel ${isOpen ? 'open' : ''}`}>
              {options.length === 0 ? (
                <div className="ms-empty">No options</div>
              ) : (
                options.map(val => (
                  <label key={val} className="ms-option">
                    <input
                      type="checkbox"
                      checked={selected.includes(val)}
                      onChange={(e) => handleCheckboxChange(key, val, e.target.checked)}
                    />
                    <span>{val}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}