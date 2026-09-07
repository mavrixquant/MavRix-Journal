// src/hooks/useTrades.js
import { useAppContext, actions } from '../context/AppContext';
import { parseWorkbook } from '../utils/excelParser';

export function useTrades() {
  const { state, dispatch } = useAppContext();

  const setFileStatus = (message) => {
    dispatch({ type: actions.SET_UI, payload: { fileStatus: message } });
  };

  const setUploadGateVisible = (visible) => {
    dispatch({ type: actions.SET_UI, payload: { isUploadGateVisible: visible } });
  };

  const loadWorkbook = (workbook, sheetName) => {
    try {
      const { trades, dynamicKeys } = parseWorkbook(workbook, sheetName);
      if (trades.length === 0) {
        setFileStatus('✕ No valid trades found in sheet.');
        return { success: false, error: 'No valid trades' };
      }
      dispatch({ type: actions.SET_TRADES, payload: trades });
      dispatch({ type: actions.SET_DYNAMIC_FILTER_KEYS, payload: dynamicKeys });
      dispatch({ type: actions.RESET_FILTERS });
      setUploadGateVisible(false);
      setFileStatus(`✓ loaded sheet "${sheetName}" — ${trades.length} trades`);
      return { success: true, trades, dynamicKeys };
    } catch (error) {
      setFileStatus(`✕ Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  return {
    trades: state.trades,
    dynamicKeys: state.dynamicFilterKeys,
    isUploadGateVisible: state.isUploadGateVisible,
    fileStatus: state.fileStatus,
    loadWorkbook,
    setFileStatus,
    setUploadGateVisible,
  };
}