import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext, actions } from '@/app/providers/AppProvider';


const DYN_KEY = 'fs';
const ST_MODE_KEY = 'stm';
const SESSIONS_KEY = 'ss';
const BLOCKS_KEY = 'stb';
const ACTIVE_FILTER_KEY = 'aft';
const FILTER_PARAMS_KEY = 'fp';
const STRATEGY_KEY = 'strat';

function serializeSelections(selections) {
  const parts = [];
  for (const [key, values] of Object.entries(selections || {})) {
    if (!Array.isArray(values) || values.length === 0) continue;
    parts.push(`${key}:${values.join(',')}`);
  }
  return parts.join('|');
}

function deserializeSelections(str) {
  if (!str) return {};
  const result = {};
  for (const part of str.split('|')) {
    if (!part) continue;
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const key = part.slice(0, idx);
    const values = part.slice(idx + 1);
    if (!key || !values) continue;
    result[key] = values.split(',').filter(Boolean);
  }
  return result;
}

function serializeParams(params) {
  const parts = [];
  for (const [key, value] of Object.entries(params || {})) {
    if (value == null || value === '') continue;
    parts.push(`${key}:${value}`);
  }
  return parts.join('|');
}

function deserializeParams(str) {
  if (!str) return null;
  const result = {};
  for (const part of str.split('|')) {
    if (!part) continue;
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const key = part.slice(0, idx);
    const value = part.slice(idx + 1);
    if (!key) continue;
    const num = Number(value);
    result[key] = Number.isFinite(num) ? num : value;
  }
  return result;
}

export function useFilterUrlSync() {
  const { state, dispatch } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const fs = searchParams.get(DYN_KEY);
    const stm = searchParams.get(ST_MODE_KEY);
    const ss = searchParams.get(SESSIONS_KEY);
    const stb = searchParams.get(BLOCKS_KEY);
    const aft = searchParams.get(ACTIVE_FILTER_KEY);
    const fp = searchParams.get(FILTER_PARAMS_KEY);
    const strat = searchParams.get(STRATEGY_KEY);

    if (!fs && !stm && !ss && !stb && !aft && !fp && !strat) return;

    if (fs) {
      dispatch({
        type: actions.SET_FILTER_SELECTIONS,
        payload: deserializeSelections(fs),
      });
    }
    if (strat) {
      dispatch({
        type: actions.SET_STRATEGY_IDS,
        payload: strat.split(',').filter(Boolean),
      });
    }
    if (stm) {
      dispatch({ type: actions.SET_ST_MODE, payload: stm });
    }
    if (ss) {
      dispatch({
        type: actions.SET_SELECTED_SESSIONS,
        payload: ss.split('|').filter(Boolean),
      });
    }
    if (stb) {
      dispatch({
        type: actions.SET_SELECTED_TIME_BLOCKS,
        payload: stb.split('|').filter(Boolean),
      });
    }
    if (aft) {
      dispatch({ type: actions.SET_ACTIVE_FILTER_TYPE, payload: aft });
    }
    if (fp) {
      const parsed = deserializeParams(fp);
      if (parsed) {
        dispatch({ type: actions.SET_FILTER_PARAMS, payload: parsed });
      }
    }
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);

    const setOrDelete = (key, value) => {
      if (value && value.length > 0 && value !== '|') next.set(key, value);
      else next.delete(key);
    };

    setOrDelete(DYN_KEY, serializeSelections(state.filterSelections));
    setOrDelete(STRATEGY_KEY, (state.strategyIds || []).join(','));
    setOrDelete(ST_MODE_KEY, state.stMode === 'session' ? '' : state.stMode);
    setOrDelete(SESSIONS_KEY, state.selectedSessions.join('|'));
    setOrDelete(BLOCKS_KEY, state.selectedTimeBlocks.join('|'));
    setOrDelete(
      ACTIVE_FILTER_KEY,
      state.activeFilterType === 'none' ? '' : state.activeFilterType
    );

    const defaults = {
      sessionLimit: 2,
      dayLimit: 2,
      winLimit: 2,
      lossLimit: 2,
    };
    const dirtyParams = {};
    for (const [k, v] of Object.entries(state.filterParams || {})) {
      if (v !== defaults[k]) dirtyParams[k] = v;
    }
    setOrDelete(FILTER_PARAMS_KEY, serializeParams(dirtyParams));

    const nextStr = next.toString();
    const currentStr = searchParams.toString();
    if (nextStr !== currentStr) {
      setSearchParams(next, { replace: true });
    }
  }, [
    state.filterSelections,
    state.strategyIds,
    state.stMode,
    state.selectedSessions,
    state.selectedTimeBlocks,
    state.activeFilterType,
    state.filterParams,
  ]);
}