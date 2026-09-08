// src/components/filters/DynamicFilters.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useFilters } from '../../../hooks/useFilters';

export default function DynamicFilters() {
  const { state } = useAppContext();
  const { setFilterSelection } = useFilters();
  const [openPanelKey, setOpenPanelKey] = useState(null);
  const panelRefs = useRef({});

  // Compute unique values for a given dynamic key
  const getOptions = (key) => {
    const values = [...new Set(state.trades.map(t => t.dynamic[key]))]
      .filter(v => v && v !== '—')
      .sort();
    return values;
  };

  // Compute the number of unique values for each key
  const uniqueCounts = useMemo(() => {
    const counts = {};
    state.dynamicFilterKeys.forEach(key => {
      counts[key] = new Set(state.trades.map(t => t.dynamic[key])).size;
    });
    return counts;
  }, [state.dynamicFilterKeys, state.trades]);

  // Filter keys to only those with more than 1 and less than 10 unique values
  const eligibleKeys = useMemo(() => {
    return state.dynamicFilterKeys.filter(key => 
      uniqueCounts[key] > 1 && uniqueCounts[key] < 10
    );
  }, [state.dynamicFilterKeys, uniqueCounts]);

  // Clear selections for keys that are no longer eligible (e.g., if data changes)
  useEffect(() => {
    const invalidKeys = Object.keys(state.filterSelections).filter(
      key => !eligibleKeys.includes(key)
    );
    if (invalidKeys.length > 0) {
      invalidKeys.forEach(key => {
        setFilterSelection(key, []);
      });
    }
  }, [eligibleKeys, state.filterSelections, setFilterSelection]);

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

  if (eligibleKeys.length === 0) return null;

  return (
    <div className="filter-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      {eligibleKeys.map(key => {
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