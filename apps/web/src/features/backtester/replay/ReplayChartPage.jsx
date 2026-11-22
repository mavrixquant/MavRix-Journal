import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { resolveTimezone } from '@/shared/format/datetime';
import { useMarketCatalog } from '@/shared/api/marketData';
import {
  useBacktestSession, useBacktestTrades, useCreateBacktestTrade, useUpdateBacktestTrade,
  useDeleteBacktestTrade, useUpdateBacktestSession,
} from '@/shared/api/backtestSessions';
import DrawingToolbar from '@/features/charts/components/DrawingToolbar';
import { CSS as MK_CSS } from '@/features/charts/lib/chartStyles';
import { pricePrecision } from '@/features/charts/lib/chartTheme';
import { DRAW_COLORS } from '@/features/charts/lib/drawings';

import ReplayChart from './components/ReplayChart';
import ReplayHeader from './components/ReplayHeader';
import ReplayToolbar from './components/ReplayToolbar';
import ReplayStatus from './components/ReplayStatus';
import TradeTicket from './components/TradeTicket';
import PropHud from './components/PropHud';
import useReplayBars from './hooks/useReplayBars';
import useReplayEngine from './hooks/useReplayEngine';
import { netOf, isClosed } from '../lib/sessionStats';
import { dayKey } from '../lib/time';
import { REPLAY_CSS } from './replayStyles';

const EMPTY = [];
const INDICATORS_KEY = 'mavrix:replay:indicators:v1';
const drawKey = (sid, sym) => `mavrix:replay:drawings:${sid}:${sym}`;
const readJson = (k, f) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; } };
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

function Splash({ title, text, action }) {
  return (
    <div className="rp-splash">
      <AlertTriangle size={22} color="#F5B544" />
      <b>{title}</b>
      <p>{text}</p>
      {action}
    </div>
  );
}

export default function ReplayChartPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();
  const tz = useMemo(() => resolveTimezone(settings?.preferences?.timezone || 'auto'), [settings]);
  const chartRef = useRef(null);

  const sessionQ = useBacktestSession(sessionId);
  const tradesQ = useBacktestTrades(sessionId);
  const session = sessionQ.data;
  const trades = tradesQ.data || EMPTY;

  const requested = (searchParams.get('symbol') || '').toUpperCase();
  const symbol = session
    ? (session.instruments.includes(requested) ? requested : session.instruments[0])
    : '';
  const [viewInterval, setViewInterval] = useState(null);
  const view = viewInterval || session?.interval || '5m';

  usePageHeader({ title: 'Replay', subtitle: session?.name });

  const { data: catalog } = useMarketCatalog();
  const symInfo = catalog?.symbols?.find((s) => s.code === symbol);
  const precision = pricePrecision(symInfo, symbol);

  const barsQ = useReplayBars({
    symbol, interval: session?.interval,
    fromDate: session?.fromDate, toDate: session?.toDate,
    enabled: !!session && !!catalog,
  });

  const createM = useCreateBacktestTrade(sessionId);
  const updateM = useUpdateBacktestTrade(sessionId);
  const deleteM = useDeleteBacktestTrade(sessionId);
  const sessionM = useUpdateBacktestSession();

  const engine = useReplayEngine({
    session, symbol, bars: barsQ.bars, trades, tz,
    createTrade: createM.mutateAsync,
    updateTrade: updateM.mutateAsync,
    deleteTrade: deleteM.mutateAsync,
    updateSession: sessionM.mutateAsync,
    precision,
    onConcluded: (reason) => {
      toast(reason === 'prop_breach' ? 'Session ended: prop rule breached.' : 'Session concluded.');
      navigate(`/backtester/${sessionId}`);
    },
  });

  /* ------------------------------ ui state ------------------------------ */
  const [panelOpen, setPanelOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [crosshairOhlc, setCrosshairOhlc] = useState(null);

  // Indicators: instance ids (see IndicatorMenu). Computed only from candles up to the replay cursor.
  const [indicators, setIndicators] = useState(() => readJson(INDICATORS_KEY, EMPTY));
  const [indOpen, setIndOpen] = useState(false);
  const toggleIndicator = useCallback((id) => setIndicators((p) => {
    const next = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
    writeJson(INDICATORS_KEY, next);
    return next;
  }), []);
  const clearIndicators = useCallback(() => { setIndicators([]); writeJson(INDICATORS_KEY, []); }, []);
  const activeOrders = engine.openPositions.length + engine.pendingOrders.length;

  /* ------------------------------ full screen ------------------------------ */
  const [fs, setFs] = useState(false);
  const nativeFs = useRef(false);
  const toggleFs = useCallback(async () => {
    if (!fs) {
      setFs(true);
      try {
        if (document.fullscreenEnabled && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          nativeFs.current = true;
        }
      } catch { nativeFs.current = false; } // CSS-only full screen (e.g. iOS)
    } else {
      setFs(false);
      nativeFs.current = false;
      if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* already out */ } }
    }
  }, [fs]);
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && nativeFs.current) { nativeFs.current = false; setFs(false); }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const setSymbol = useCallback((s) => {
    if (s === symbol) return;
    if (activeOrders > 0) {
      toast('Close your open position or cancel your pending order before switching instrument.');
      return;
    }
    const sp = new URLSearchParams(searchParams);
    sp.set('symbol', s);
    setSearchParams(sp, { replace: true });
  }, [symbol, activeOrders, searchParams, setSearchParams]);

  // Arm the one-click position tool (or disarm it).
  const armTool = useCallback((t) => {
    setTool(t);
    if (t !== 'cursor') { setSelectedId(null); setSelectedTradeId(null); }
  }, []);

  /* ------------------------------ drawings ------------------------------ */
  const [tool, setTool] = useState('cursor');
  const [magnet, setMagnet] = useState(false);
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [hideDrawings, setHideDrawings] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [drawings, setDrawingsState] = useState(EMPTY);
  const symRef = useRef(symbol);

  useEffect(() => {
    symRef.current = symbol;
    if (!sessionId || !symbol) return;
    setDrawingsState(readJson(drawKey(sessionId, symbol), EMPTY));
    setSelectedId(null);
    setTool('cursor');
  }, [sessionId, symbol]);

  const setDrawings = useCallback((next) => {
    setDrawingsState(next);
    writeJson(drawKey(sessionId, symRef.current), next);
  }, [sessionId]);

  /* ------------------------------ keyboard ------------------------------ */
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'Space') { e.preventDefault(); engine.toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); engine.step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); engine.step(-1); }
      else if (e.key === '[') setPanelOpen((v) => !v);
      else if (e.key === 'f' || e.key === 'F') toggleFs();
      else if (e.key === 'i' || e.key === 'I') setIndOpen((v) => !v);
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        setDrawings(drawings.filter((d) => d.id !== selectedId));
        setSelectedId(null);
      } else if (e.key === 'Escape') {
        if (fs && !nativeFs.current) setFs(false);
        setTool('cursor'); setSelectedId(null); setDrawer(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, selectedId, drawings, setDrawings, toggleFs, fs]);

  /* ------------------------------ derived ------------------------------ */
  const balance = useMemo(
    () => (session ? session.startingBalance + trades.filter(isClosed).reduce((s, t) => s + netOf(t), 0) : 0),
    [session, trades],
  );
  const equity = balance + engine.openPnl;

  // A selected 3-point position drawing is what the order panel works with.
  const selectedDrawing = useMemo(
    () => drawings.find((d) => d.id === selectedId && d.type === 'rr' && d.pts?.length >= 3) || null,
    [drawings, selectedId],
  );
  const removeDrawing = useCallback((id) => {
    setDrawings(drawings.filter((d) => d.id !== id));
    setSelectedId(null);
  }, [drawings, setDrawings]);

  // Dates the replay can jump to = the days actually covered by the loaded bars.
  const dateRange = useMemo(() => {
    const b = barsQ.bars;
    if (!b.length) return null;
    return { min: dayKey(b[0].utc * 1000, tz), max: dayKey(b[b.length - 1].utc * 1000, tz) };
  }, [barsQ.bars, tz]);

  const onConclude = () => {
    const n = engine.openPositions.length;
    const ok = window.confirm(
      `Conclude this session?${n ? ` ${n} open position${n === 1 ? '' : 's'} will be closed at the current price.` : ''} Trades will be locked (you can reopen from the dashboard).`,
    );
    if (ok) engine.conclude();
  };

  /* ------------------------------ states ------------------------------ */
  if (sessionQ.isLoading || tradesQ.isLoading) {
    return <><style>{MK_CSS}{REPLAY_CSS}</style><div className="rp-page-state"><div className="rp-splash"><div className="rp-spinner" /><b>Loading session…</b></div></div></>;
  }
  if (sessionQ.isError || !session) {
    return (
      <><style>{MK_CSS}{REPLAY_CSS}</style>
        <div className="rp-page-state">
          <Splash title="Session not found" text="It may have been deleted, or it belongs to another account."
            action={<Link className="rp-btn" to="/backtester">Back to sessions</Link>} />
        </div>
      </>
    );
  }

  const loading = barsQ.isLoading || (!barsQ.done && !barsQ.isError);
  const propLabel = session.propFirmConfig
    ? (session.propFirmConfig.firmName === 'Other' ? session.propFirmConfig.firmNameCustom : session.propFirmConfig.firmName)
    : '';

  return (
    <>
      <style>{MK_CSS}{REPLAY_CSS}</style>
      <div className={`mk-root rp-root page-fade-in${panelOpen ? '' : ' is-panel-closed'}${drawer ? ' is-drawer' : ''}${fs ? ' is-fs' : ''}`}>
        <div className="mk-shell">
          <ReplayHeader
            session={session} symbol={symbol} onSymbol={setSymbol} canSwitch={activeOrders === 0}
            currentBar={engine.currentBar} precision={precision} tz={tz}
            balance={balance} equity={equity}
            onConclude={onConclude} concludeDisabled={!engine.writable || engine.busy}
            panelOpen={panelOpen} onTogglePanel={() => { setPanelOpen((v) => !v); setDrawer((v) => !v); }}
            propLabel={propLabel}
            fullscreen={fs} onToggleFullscreen={toggleFs}
          />

          <ReplayToolbar
            engine={engine} baseInterval={session.interval} viewInterval={view} onViewInterval={setViewInterval}
            tz={tz} currentBar={engine.currentBar} onArm={armTool} tool={tool} disabled={loading} range={dateRange}
            indicators={indicators} onToggleIndicator={toggleIndicator} onClearIndicators={clearIndicators}
            indicatorsOpen={indOpen} onIndicatorsOpenChange={setIndOpen}
          />

          <div className="mk-body">
            <DrawingToolbar
              tool={tool} onTool={setTool} magnet={magnet} onMagnet={() => setMagnet((v) => !v)}
              color={drawColor} onColor={setDrawColor} hidden={hideDrawings}
              onToggleHidden={() => setHideDrawings((v) => !v)}
              count={drawings.length} onClear={() => { setDrawings([]); setSelectedId(null); }}
            />

            <div className="mk-stage">
              {loading && <div className="mk-bar"><i /></div>}
              <ReplayChart
                ref={chartRef}
                sessionId={session.id} symbol={symbol}
                baseInterval={session.interval} viewInterval={view}
                bars={barsQ.bars} idx={engine.idx} trades={trades} tz={tz} precision={precision}
                onSelectTrade={setSelectedTradeId}
                onOhlcChange={setCrosshairOhlc}
                chartProps={{
                  tool, onToolChange: setTool, magnet,
                  drawings: hideDrawings ? EMPTY : drawings, onDrawingsChange: setDrawings,
                  selectedId, onSelect: setSelectedId, drawColor,
                  enabledIndicators: indicators, onToggleIndicator: toggleIndicator, showVolume: true,
                }}
              />

              {session.type === 'prop' && <PropHud prop={engine.prop} currency={session.currency} />}

              {loading && (
                <div className="rp-loader" role="status">
                  <div className="rp-spinner" />
                  <b>Loading {symbol} {session.interval.toUpperCase()}</b>
                  <span>{barsQ.bars.length.toLocaleString()} bars · {session.fromDate} → {session.toDate}</span>
                </div>
              )}

              {barsQ.isError && barsQ.bars.length === 0 && (
                <Splash
                  title={`Couldn’t load ${symbol} data`}
                  text="The market data service didn’t respond. Check your connection and try again."
                  action={<button type="button" className="rp-btn" onClick={() => barsQ.refetch()}><RotateCw size={12} /> Retry</button>}
                />
              )}

              {barsQ.done && barsQ.bars.length === 0 && (
                <Splash
                  title="No data in this range"
                  text={`There are no ${symbol} ${session.interval} bars between ${session.fromDate} and ${session.toDate}. Try another range or instrument.`}
                  action={<Link className="rp-btn" to="/backtester">Back to sessions</Link>}
                />
              )}
            </div>

            {drawer && <div className="mk-scrim" onClick={() => setDrawer(false)} />}

            <aside className="mk-panel rp-panel" aria-label="Order panel">
              <TradeTicket
                session={session} symbol={symbol} currentBar={engine.currentBar} precision={precision}
                trades={trades} engine={engine}
                drawing={selectedDrawing} onPlaced={removeDrawing} onArm={armTool}
                selectedTradeId={selectedTradeId}
              />
            </aside>
          </div>

          <ReplayStatus
            symbol={symbol} baseInterval={session.interval} barCount={barsQ.bars.length} idx={engine.idx}
            tz={tz} loading={loading} loaded={barsQ.bars.length} filling={false}
            currentBar={engine.currentBar} open={engine.openPositions.length} pending={engine.pendingOrders.length}
            ohlc={crosshairOhlc} viewInterval={view} precision={precision}
          />
        </div>
      </div>
    </>
  );
}
