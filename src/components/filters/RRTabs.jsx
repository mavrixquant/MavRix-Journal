// src/components/filters/RRTabs.jsx
import { useAppContext, actions } from '../../context/AppContext';

const RR_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function RRTabs() {
  const { state, dispatch } = useAppContext();

  const handleSetR = (r) => {
    dispatch({ type: actions.SET_CURRENT_R, payload: r });
  };

  return (
    <div className="rr-tabs">
      {RR_LEVELS.map(r => (
        <button
          key={r}
          className={`rr-tab ${r === state.currentR ? 'active' : ''}`}
          onClick={() => handleSetR(r)}
        >
          1:{r}
        </button>
      ))}
    </div>
  );
}