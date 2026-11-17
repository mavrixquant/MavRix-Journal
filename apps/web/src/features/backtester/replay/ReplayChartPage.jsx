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
import { REPLAY_CSS } from './replayStyles';

const EMPTY = [];
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
    onConcluded: (reason) => {
      toast(reason === 'prop_breach' ? 'Session ended: prop rule breached.' : 'Session concluded.');
      navigate(`/backtester/${sessionId}`);
    },
  });

  /* ------------------------------ ui state ------------------------------ */
  const [panelOpen, setPanelOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [side, setSide] = useState('long');

  const setSymbol = useCallback((s) => {
    if (s === symbol) return;
    if (engine.openPositions.length > 0) {
      toast('Close your open position before switching instrument.');
      return;
    }
    const sp = new URLSearchParams(searchParams);
    sp.set('symbol', s);
    setSearchParams(sp, { replace: true });
  }, [symbol, engine.openPositions.length, searchParams, setSearchParams]);

  const pickSide = useCallback((s) => {
    setSide(s);
    setPanelOpen(true);
    setDrawer(true);
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
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        setDrawings(drawings.filter((d) => d.id !== selectedId));
        setSelectedId(null);
      } else if (e.key === 'Escape') { setTool('cursor'); setSelectedId(null); setDrawer(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, selectedId, drawings, setDrawings]);

  /* ------------------------------ derived ------------------------------ */
  const balance = useMemo(
    () => (session ? session.startingBalance + trades.filter(isClosed).reduce((s, t) => s + netOf(t), 0) : 0),
    [session, trades],
  );
  const equity = balance + engine.openPnl;

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
      <div className={`mk-root rp-root page-fade-in${panelOpen ? '' : ' is-panel-closed'}${drawer ? ' is-drawer' : ''}`}>
        <div className="mk-shell">
          <ReplayHeader
            session={session} symbol={symbol} onSymbol={setSymbol} canSwitch={engine.openPositions.length === 0}
            currentBar={engine.currentBar} precision={precision} tz={tz}
            balance={balance} equity={equity}
            onConclude={onConclude} concludeDisabled={!engine.writable || engine.busy}
            panelOpen={panelOpen} onTogglePanel={() => { setPanelOpen((v) => !v); setDrawer((v) => !v); }}
            propLabel={propLabel}
          />

          <ReplayToolbar
            engine={engine} baseInterval={session.interval} viewInterval={view} onViewInterval={setViewInterval}
            tz={tz} currentBar={engine.currentBar} onSide={pickSide} ticketSide={side} disabled={loading}
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
                chartProps={{
                  tool, onToolChange: setTool, magnet,
                  drawings: hideDrawings ? EMPTY : drawings, onDrawingsChange: setDrawings,
                  selectedId, onSelect: setSelectedId, drawColor,
                  enabledIndicators: EMPTY, showVolume: true,
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
                openPosition={engine.openPosition} trades={trades} engine={engine}
                side={side} onSide={setSide}
              />
            </aside>
          </div>

          <ReplayStatus
            symbol={symbol} baseInterval={session.interval} barCount={barsQ.bars.length} idx={engine.idx}
            tz={tz} loading={loading} loaded={barsQ.bars.length} filling={false}
            currentBar={engine.currentBar} open={engine.openPositions.length}
          />
        </div>
      </div>
    </>
  );
}
