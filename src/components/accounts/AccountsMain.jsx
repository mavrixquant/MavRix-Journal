// src/components/accounts/AccountsMain.jsx
import { useState, useEffect } from 'react';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaWallet,
  FaChartLine,
  FaShieldAlt,
  FaSlidersH,
  FaExchangeAlt,
  FaFolderOpen,
  FaFilter,
  FaCoins,
  FaTimes,
} from 'react-icons/fa';
import Portal from '../common/Portal';
import Alert from '../common/Alert';
import LoadingOverlay from '../common/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import {
  createAccount,
  updateAccount,
  deleteAccount,
  subscribeToAccounts,
} from '../../firebase/accountsService';
import {
  getTrades,
  deleteTradesByAccountId,
} from '../../firebase/tradesService';

const CURRENCIES = ['USD', 'EUR', 'INR', 'GBP'];
const ACCOUNT_TYPES = ['Backtest', 'Live', 'Demo'];

/* ------------------------------------------------------------------ */
/*  Scoped CSS — matches JournalMain / UploadModal / DashboardHeader   */
/* ------------------------------------------------------------------ */
const ACC_CSS = `
  /* ---------- Root ---------- */
  .acc-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --win: #22c55e;
    --win-2: #86efac;
    --loss: #ef4444;
    --loss-2: #fca5a5;

    padding: 24px;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 20px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ---------- Generic glass card ---------- */
  .acc-card {
    position: relative;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }

  /* ---------- Header ---------- */
  .acc-header {
    padding: 18px 22px 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }
  .acc-header::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    border-radius: 18px 18px 0 0;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: accGrad 4s linear infinite;
    pointer-events: none;
  }
  .acc-header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .acc-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -.02em;
    color: var(--ink-1);
    line-height: 1.1;
  }
  .acc-subtitle {
    margin: 5px 0 0;
    font-size: 12.5px;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .01em;
  }
  .acc-header-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  /* ---------- Type tabs (segmented filter) ---------- */
  .acc-type-tabs {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    background: rgba(0,0,0,.32);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.06);
    backdrop-filter: blur(8px);
  }
  .acc-type-label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 10px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .acc-type-tab {
    display: inline-flex;
    align-items: center;
    padding: 7px 13px;
    font-size: 11.5px;
    font-weight: 600;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .02em;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: var(--ink-2);
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .acc-type-tab:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.04);
  }
  .acc-type-tab.active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    box-shadow: 0 8px 20px -10px rgba(245,158,11,.6), inset 0 1px 0 rgba(255,255,255,.4);
  }

  /* ---------- Buttons ---------- */
  .acc-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .acc-btn:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .acc-btn:active { transform: translateY(0) scale(.98); }

  .acc-btn-primary {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 10px 18px;
    border-radius: 10px;
    border: none;
    overflow: hidden;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .02em;
    cursor: pointer;
    box-shadow:
      0 10px 30px -8px rgba(245,158,11,.55),
      inset 0 1px 0 rgba(255,255,255,.4);
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s;
    white-space: nowrap;
  }
  .acc-btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%);
    animation: accShine 4.2s ease-in-out infinite;
  }
  .acc-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .acc-btn-primary:active { transform: translateY(0) scale(.98); }

  /* Compact icon-only button for card footers */
  .acc-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .18s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .acc-icon-btn:hover {
    color: var(--accent);
    background: rgba(245,158,11,.08);
    border-color: var(--accent-soft2);
    transform: translateY(-1px);
  }
  .acc-icon-btn.is-danger:hover {
    color: var(--loss-2);
    background: rgba(239,68,68,.08);
    border-color: rgba(239,68,68,.4);
  }

  /* ---------- KPI summary bar ---------- */
  .acc-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 14px;
  }
  .acc-kpi {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    transition: border-color .25s, transform .25s;
  }
  .acc-kpi:hover {
    border-color: var(--accent-soft2);
    transform: translateY(-1px);
  }
  .acc-kpi-icon {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    background: rgba(255,255,255,.04);
    border: 1px solid var(--line);
    color: var(--ink-2);
  }
  .acc-kpi-icon.is-amber {
    color: var(--accent);
    background: rgba(245,158,11,.10);
    border-color: var(--accent-soft2);
    box-shadow: 0 0 24px -10px rgba(245,158,11,.5);
  }
  .acc-kpi-icon.is-win {
    color: var(--win);
    background: rgba(34,197,94,.10);
    border-color: rgba(34,197,94,.28);
    box-shadow: 0 0 24px -10px rgba(34,197,94,.5);
  }
  .acc-kpi-icon.is-loss {
    color: var(--loss);
    background: rgba(239,68,68,.10);
    border-color: rgba(239,68,68,.28);
    box-shadow: 0 0 24px -10px rgba(239,68,68,.5);
  }
  .acc-kpi-label {
    display: block;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 3px;
  }
  .acc-kpi-value {
    display: block;
    font-size: 18px;
    font-weight: 700;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    color: var(--ink-1);
    letter-spacing: -.01em;
    line-height: 1.15;
  }
  .acc-kpi-value.pos { color: var(--win); }
  .acc-kpi-value.neg { color: var(--loss); }
  .acc-kpi-value.zero { color: var(--ink-1); }

  /* ---------- Accounts grid ---------- */
  .acc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 18px;
  }

  /* ---------- Account card ---------- */
  .acc-account {
    padding: 18px 20px 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
    transition: border-color .25s ease, transform .25s cubic-bezier(.2,.8,.25,1), box-shadow .25s;
  }
  .acc-account:hover {
    border-color: var(--accent-soft2);
    transform: translateY(-2px);
    box-shadow:
      0 24px 60px -30px rgba(0,0,0,.95),
      0 0 40px -18px var(--accent-soft2),
      inset 0 1px 0 rgba(255,255,255,.04);
  }

  .acc-account-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }
  .acc-name {
    margin: 0;
    font-size: 15.5px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
    line-height: 1.2;
  }
  .acc-base {
    display: block;
    margin-top: 3px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .acc-badge {
    flex-shrink: 0;
    padding: 3px 10px;
    border-radius: 99px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    border: 1px solid;
    white-space: nowrap;
  }
  .acc-badge.is-live {
    color: #4ade80;
    background: rgba(74,222,128,.10);
    border-color: rgba(74,222,128,.35);
  }
  .acc-badge.is-demo {
    color: var(--accent);
    background: rgba(245,158,11,.10);
    border-color: var(--accent-soft2);
  }
  .acc-badge.is-backtest {
    color: #60a5fa;
    background: rgba(96,165,250,.10);
    border-color: rgba(96,165,250,.32);
  }

  /* ---------- Metric bar (Starting Capital | Total P&L) ---------- */
  .acc-metric-bar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(0,0,0,.22);
    border: 1px solid var(--line-soft);
  }
  .acc-metric {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .acc-metric.right { text-align: right; }
  .acc-metric-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .acc-metric-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 15px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .acc-metric-value.pos { color: var(--win); }
  .acc-metric-value.neg { color: var(--loss); }
  .acc-metric-value.dim { color: var(--ink-2); font-weight: 600; }

  /* ---------- Settings list ---------- */
  .acc-settings {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .acc-setting {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
  }
  .acc-setting-icon {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(245,158,11,.08);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-size: 11px;
    margin-top: 1px;
  }
  .acc-setting-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .acc-setting-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .acc-setting-value {
    font-size: 12.5px;
    color: var(--ink-1);
    font-weight: 500;
    word-break: break-word;
  }
  .acc-setting-value .dim { color: var(--ink-3); font-weight: 400; }

  /* ---------- Account footer ---------- */
  .acc-account-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid var(--line-soft);
    gap: 10px;
  }
  .acc-trades-count {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    color: var(--ink-2);
    letter-spacing: .02em;
  }
  .acc-account-actions {
    display: flex;
    gap: 6px;
  }

  /* ---------- Empty state ---------- */
  .acc-empty {
    padding: 60px 24px;
    text-align: center;
    border: 1px dashed rgba(255,255,255,.10);
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.005));
  }
  .acc-empty-icon {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(245,158,11,.14), rgba(245,158,11,.04));
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    margin-bottom: 16px;
    box-shadow: 0 0 30px -10px rgba(245,158,11,.55);
  }
  .acc-empty h3 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
  }
  .acc-empty p {
    margin: 0 auto;
    max-width: 360px;
    font-size: 12.5px;
    line-height: 1.65;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .acc-empty-btn {
    margin-top: 20px;
  }

  /* ---------- Modal (Portal — vars must live on overlay) ---------- */
  .acc-overlay {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --win: #22c55e;
    --loss: #ef4444;

    position: fixed;
    inset: 0;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
    overflow-y: auto;
    animation: accFade .18s ease;
  }
  .acc-modal {
    width: 100%;
    max-width: 520px;
    max-height: calc(100vh - 32px);
    margin: auto;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px var(--accent-soft);
    color: var(--ink-1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: accModalIn .28s cubic-bezier(.2,.8,.25,1);
  }
  .acc-modal-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    flex-shrink: 0;
  }
  .acc-modal-head::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: accGrad 4s linear infinite;
  }
  .acc-modal-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -.01em;
  }
  .acc-modal-sub {
    margin: 4px 0 0;
    font-size: 11.5px;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .acc-modal-close {
    background: none;
    border: none;
    color: var(--ink-2);
    font-size: 15px;
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    transition: all .2s;
  }
  .acc-modal-close:hover {
    color: var(--accent);
    background: rgba(245,158,11,.08);
  }
  .acc-modal-body {
    padding: 20px 22px;
    overflow-y: auto;
    flex: 1 1 0%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .acc-modal-foot {
    padding: 14px 22px;
    border-top: 1px solid var(--line-soft);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: rgba(0,0,0,.15);
    flex-shrink: 0;
  }

  /* ---------- Form fields ---------- */
  .acc-label {
    display: block;
    margin-bottom: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .acc-input {
    width: 100%;
    padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: var(--ink-1);
    font-size: 13px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    outline: none;
    box-sizing: border-box;
    transition: all .2s;
  }
  .acc-input::placeholder { color: var(--ink-3); }
  .acc-input:hover { border-color: rgba(255,255,255,.2); }
  .acc-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  select.acc-input {
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%23545E6E'><path d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 32px;
    cursor: pointer;
  }

  .acc-input-wrap {
    position: relative;
  }
  .acc-input-suffix {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--ink-3);
    pointer-events: none;
  }
  .acc-input.has-suffix { padding-right: 30px; }

  .acc-field-group {
    padding: 14px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .acc-field-group-title {
    display: block;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 2px;
  }
  .acc-hint {
    margin: 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--ink-2);
    letter-spacing: .01em;
  }
  .acc-hint b { color: var(--ink-1); font-weight: 700; }

  .acc-grid-3 {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1.2fr;
    gap: 12px;
  }
  .acc-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  /* ---------- Animations ---------- */
  @keyframes accGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes accShine {
    0%,100% { transform: translateX(-130%) skewX(-18deg); }
    55%     { transform: translateX(230%) skewX(-18deg); }
  }
  @keyframes accFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes accModalIn {
    from { opacity: 0; transform: translateY(-12px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .acc-header::before,
    .acc-modal-head::before,
    .acc-btn-primary::after { animation: none !important; }
    .acc-btn, .acc-btn-primary, .acc-icon-btn, .acc-kpi, .acc-account { transition: none !important; }
  }

  @media (max-width: 640px) {
    .acc-root { padding: 16px; }
    .acc-header { padding: 16px 18px; }
    .acc-grid-3 { grid-template-columns: 1fr; }
  }
`;

export default function AccountsMain() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state defaulting to 'Live'
  const [selectedType, setSelectedType] = useState('Live');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    balance: '',
    currency: 'USD',
    type: 'Backtest',
  });
  const [riskType, setRiskType] = useState('fixed');
  const [riskValue, setRiskValue] = useState('');
  const [riskUnit, setRiskUnit] = useState('percent');

  const [slValue, setSlValue] = useState('');
  const [slUnit, setSlUnit] = useState('ticks');

  const [commissionMode, setCommissionMode] = useState('none');
  const [commissionValue, setCommissionValue] = useState('');

  const [deleteAlert, setDeleteAlert] = useState({ show: false, accountId: null, accountName: '', tradesCount: 0 });
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [successAlert, setSuccessAlert] = useState({ show: false, message: '' });
  const [errorAlert, setErrorAlert] = useState({ show: false, message: '' });

  const [pnlMap, setPnlMap] = useState({});

  // Real-time subscription to user's accounts
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = subscribeToAccounts(user.uid, (fetchedAccounts) => {
      setAccounts(fetchedAccounts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!accounts.length) return;
    let isMounted = true;

    const fetchPnlForAccounts = async () => {
      const map = {};
      await Promise.all(
        accounts.map(async (acc) => {
          try {
            const trades = await getTrades(acc.id);
            const totalPnl = trades.reduce((sum, t) => {
              const pnl = parseFloat(t.pnl);
              return sum + (isNaN(pnl) ? 0 : pnl);
            }, 0);
            map[acc.id] = { pnl: totalPnl, count: trades.length };
          } catch (err) {
            console.error(`Error fetching trades for account ${acc.id}:`, err);
            map[acc.id] = { pnl: 0, count: 0 };
          }
        })
      );
      if (isMounted) setPnlMap(map);
    };

    fetchPnlForAccounts();
    return () => { isMounted = false; };
  }, [accounts]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', balance: '', currency: 'USD', type: 'Backtest' });
    setRiskType('fixed');
    setRiskValue('');
    setRiskUnit('percent');
    setSlValue('');
    setSlUnit('ticks');
    setCommissionMode('none');
    setCommissionValue('');
    setModalOpen(true);
  };

  const openEdit = (account) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      balance: account.balance,
      currency: account.currency,
      type: account.type || 'Backtest',
    });
    setRiskType(account.riskType || 'fixed');
    setRiskValue(account.riskValue !== undefined && account.riskValue !== null ? account.riskValue : '');
    setRiskUnit(account.riskUnit || 'percent');
    setSlValue(account.slValue !== undefined && account.slValue !== null ? account.slValue : '');
    setSlUnit(account.slUnit || 'ticks');
    setCommissionMode(account.commissionMode || 'none');
    setCommissionValue(
      account.commissionValue !== undefined && account.commissionValue !== null
        ? account.commissionValue
        : ''
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, balance, currency, type } = formData;
    if (!name.trim() || !balance) return;

    const parsedSl = slValue === '' ? null : parseFloat(slValue);
    const hasSl = parsedSl !== null && !isNaN(parsedSl) && parsedSl > 0;

    const parsedCommission = commissionValue === '' ? null : parseFloat(commissionValue);
    const hasCommission = parsedCommission !== null && !isNaN(parsedCommission) && parsedCommission >= 0;

    const accountData = {
      name: name.trim(),
      balance: parseFloat(balance),
      currency,
      type,
      riskType,
      riskValue: riskType === 'fixed' ? parseFloat(riskValue) || 0 : null,
      riskUnit: riskType === 'fixed' ? riskUnit : null,
      slUnit: type === 'Backtest' ? slUnit : null,
      slValue: type === 'Backtest' && hasSl ? parsedSl : null,
      commissionMode: commissionMode,
      commissionValue:
        commissionMode !== 'none' && hasCommission ? parsedCommission : null,
    };

    try {
      if (editingId) {
        await updateAccount(editingId, accountData);
      } else {
        await createAccount(user.uid, accountData);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Failed to save account. Please try again.');
    }
  };

  const handleDelete = async (account) => {
    try {
      const trades = await getTrades(account.id);
      const tradesCount = trades.length;
      setDeleteAlert({
        show: true,
        accountId: account.id,
        accountName: account.name,
        tradesCount,
      });
    } catch (error) {
      console.error('Error fetching trades count:', error);
      setErrorAlert({ show: true, message: 'Failed to fetch trades count. Please try again.' });
    }
  };

  const confirmDelete = async () => {
    const { accountId, accountName, tradesCount } = deleteAlert;
    if (!accountId) return;
    setLoadingDelete(true);
    try {
      await deleteTradesByAccountId(accountId);
      await deleteAccount(accountId);
      setDeleteAlert({ show: false, accountId: null, accountName: '', tradesCount: 0 });
      setSuccessAlert({ show: true, message: `Account "${accountName}" and ${tradesCount} trade(s) deleted successfully.` });
    } catch (error) {
      console.error('Error deleting account and trades:', error);
      setDeleteAlert({ show: false, accountId: null, accountName: '', tradesCount: 0 });
      setErrorAlert({ show: true, message: 'Failed to delete account and trades. Please try again.' });
    } finally {
      setLoadingDelete(false);
    }
  };

  const cancelDelete = () => {
    setDeleteAlert({ show: false, accountId: null, accountName: '', tradesCount: 0 });
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'INR': return '₹';
      case 'GBP': return '£';
      default: return '$';
    }
  };

  const formatRiskValue = (account) => {
    if (account.riskType === 'variable' || !account.riskType) return 'Variable';
    const value = account.riskValue !== undefined && account.riskValue !== null ? account.riskValue : 0;
    const unit = account.riskUnit === 'percent' ? '%' : getCurrencySymbol(account.currency);
    return `${value}${unit}`;
  };

  const formatSlUnit = (account) => {
    if (account.slUnit === 'ticks') return 'Ticks';
    if (account.slUnit === 'points') return 'Points';
    return '—';
  };

  const formatSlDefault = (account) => {
    if (account.slValue === undefined || account.slValue === null) return null;
    const unit = account.slUnit === 'ticks' ? ' ticks' : ' pts';
    return `${account.slValue}${unit}`;
  };

  const formatCommission = (account) => {
    const mode = account.commissionMode || 'none';
    if (mode === 'none') return 'None';
    const val = account.commissionValue;
    if (val === undefined || val === null) return 'None';
    const sym = getCurrencySymbol(account.currency);
    if (mode === 'flat') return `${sym}${val} flat`;
    if (mode === 'per_contract') return `${sym}${val}/contract`;
    return 'None';
  };

  const filteredAccounts = accounts.filter(acc => {
    if (selectedType === 'All') return true;
    return (acc.type || 'Backtest') === selectedType;
  });

  const totalBalance = filteredAccounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
  const totalPnlAll = filteredAccounts.reduce((sum, acc) => sum + (pnlMap[acc.id]?.pnl || 0), 0);
  const totalTradesAll = filteredAccounts.reduce((sum, acc) => sum + (pnlMap[acc.id]?.count || 0), 0);

  if (loading) {
    return (
      <>
        <style>{ACC_CSS}</style>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <LoadingOverlay message="Loading account metrics..." />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{ACC_CSS}</style>
      <div className="acc-root">

        {/* ---------- Header ---------- */}
        <div className="acc-card acc-header">
          <div className="acc-header-left">
            <div>
              <h2 className="acc-title">Portfolio Accounts</h2>
              <p className="acc-subtitle">
                Monitor account capital, risk parameters, and aggregate net return
              </p>
            </div>
          </div>

          <div className="acc-header-right">
            <div className="acc-type-tabs">
              <span className="acc-type-label">
                <FaFilter size={9} />
                Type
              </span>
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`acc-type-tab ${selectedType === type ? 'active' : ''}`}
                  onClick={() => setSelectedType(type)}
                >
                  {type}
                </button>
              ))}
            </div>

            <button type="button" className="acc-btn-primary" onClick={openCreate}>
              <FaPlus size={11} /> New Account
            </button>
          </div>
        </div>

        {/* ---------- KPI summary ---------- */}
        <div className="acc-kpi-grid">
          <div className="acc-kpi">
            <div className="acc-kpi-icon is-amber"><FaWallet /></div>
            <div>
              <span className="acc-kpi-label">Combined Capital</span>
              <span className="acc-kpi-value">{formatCurrency(totalBalance, 'USD')}</span>
            </div>
          </div>

          <div className="acc-kpi">
            <div className={`acc-kpi-icon ${totalPnlAll > 0 ? 'is-win' : totalPnlAll < 0 ? 'is-loss' : ''}`}>
              <FaChartLine />
            </div>
            <div>
              <span className="acc-kpi-label">Cumulative P&L</span>
              <span className={`acc-kpi-value ${
                totalPnlAll > 0 ? 'pos' : totalPnlAll < 0 ? 'neg' : 'zero'
              }`}>
                {formatCurrency(totalPnlAll, 'USD')}
              </span>
            </div>
          </div>

          <div className="acc-kpi">
            <div className="acc-kpi-icon"><FaExchangeAlt /></div>
            <div>
              <span className="acc-kpi-label">Total Executed Trades</span>
              <span className="acc-kpi-value">{totalTradesAll}</span>
            </div>
          </div>
        </div>

        {/* ---------- Accounts grid ---------- */}
        {filteredAccounts.length === 0 ? (
          <div className="acc-empty">
            <div className="acc-empty-icon"><FaFolderOpen /></div>
            <h3>No {selectedType} Accounts Found</h3>
            <p>
              No accounts matching the selected filter category ({selectedType}).
            </p>
            <button type="button" className="acc-btn acc-empty-btn" onClick={openCreate}>
              <FaPlus size={10} /> Create Account
            </button>
          </div>
        ) : (
          <div className="acc-grid">
            {filteredAccounts.map((acc) => {
              const accPnl = pnlMap[acc.id]?.pnl || 0;
              const tradesCount = pnlMap[acc.id]?.count || 0;
              const badgeClass = acc.type === 'Live'
                ? 'is-live'
                : acc.type === 'Demo'
                  ? 'is-demo'
                  : 'is-backtest';
              const slDefault = formatSlDefault(acc);
              const pnlClass = tradesCount === 0
                ? 'dim'
                : accPnl > 0
                  ? 'pos'
                  : accPnl < 0
                    ? 'neg'
                    : 'dim';

              return (
                <div key={acc.id} className="acc-card acc-account">
                  {/* Head */}
                  <div className="acc-account-head">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="acc-name">{acc.name}</h3>
                      <span className="acc-base">Base: {acc.currency}</span>
                    </div>
                    <span className={`acc-badge ${badgeClass}`}>
                      {acc.type || 'Backtest'}
                    </span>
                  </div>

                  {/* Metric bar */}
                  <div className="acc-metric-bar">
                    <div className="acc-metric">
                      <span className="acc-metric-label">Starting Capital</span>
                      <span className="acc-metric-value">
                        {formatCurrency(acc.balance, acc.currency)}
                      </span>
                    </div>
                    <div className="acc-metric right">
                      <span className="acc-metric-label">Total P&L</span>
                      <span className={`acc-metric-value ${pnlClass}`}>
                        {tradesCount === 0 ? '—' : formatCurrency(accPnl, acc.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="acc-settings">
                    <div className="acc-setting">
                      <span className="acc-setting-icon"><FaShieldAlt /></span>
                      <div className="acc-setting-text">
                        <span className="acc-setting-label">Risk Model</span>
                        <span className="acc-setting-value" style={{ textTransform: 'capitalize' }}>
                          {acc.riskType || '—'} <span className="dim">({formatRiskValue(acc)})</span>
                        </span>
                      </div>
                    </div>

                    {acc.type === 'Backtest' && (
                      <div className="acc-setting">
                        <span className="acc-setting-icon"><FaSlidersH /></span>
                        <div className="acc-setting-text">
                          <span className="acc-setting-label">SL Column</span>
                          <span className="acc-setting-value">
                            {formatSlUnit(acc)}
                            {slDefault && <span className="dim"> · default {slDefault}</span>}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="acc-setting">
                      <span className="acc-setting-icon"><FaCoins /></span>
                      <div className="acc-setting-text">
                        <span className="acc-setting-label">Commission</span>
                        <span className="acc-setting-value">{formatCommission(acc)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="acc-account-footer">
                    <span className="acc-trades-count">
                      {tradesCount} {tradesCount === 1 ? 'trade' : 'trades'}
                    </span>
                    <div className="acc-account-actions">
                      <button
                        type="button"
                        className="acc-icon-btn"
                        onClick={() => openEdit(acc)}
                        title="Edit Account"
                      >
                        <FaEdit size={11} /> Edit
                      </button>
                      <button
                        type="button"
                        className="acc-icon-btn is-danger"
                        onClick={() => handleDelete(acc)}
                        title="Delete Account"
                      >
                        <FaTrash size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------- Account modal ---------- */}
        {modalOpen && (
          <Portal>
            <div
              className="acc-overlay"
              onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
            >
              <div className="acc-modal">
                <div className="acc-modal-head">
                  <div>
                    <h2 className="acc-modal-title">
                      {editingId ? 'Edit Trading Account' : 'Create Trading Account'}
                    </h2>
                    <p className="acc-modal-sub">
                      {editingId
                        ? 'Update risk rules and account parameters'
                        : 'Set up a portfolio with default risk rules'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="acc-modal-close"
                    onClick={closeModal}
                    aria-label="Close"
                  >
                    <FaTimes />
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <div className="acc-modal-body">

                    {/* Name */}
                    <div>
                      <label className="acc-label">Account Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="acc-input"
                        placeholder="e.g., Main Prop Account"
                      />
                    </div>

                    {/* Balance / Currency / Type */}
                    <div className="acc-grid-3">
                      <div>
                        <label className="acc-label">Balance</label>
                        <input
                          type="number"
                          name="balance"
                          value={formData.balance}
                          onChange={handleChange}
                          required
                          min="0"
                          step="0.01"
                          className="acc-input"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="acc-label">Currency</label>
                        <select
                          name="currency"
                          value={formData.currency}
                          onChange={handleChange}
                          className="acc-input"
                        >
                          {CURRENCIES.map(curr => (
                            <option key={curr} value={curr}>{curr}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="acc-label">Type</label>
                        <select
                          name="type"
                          value={formData.type}
                          onChange={handleChange}
                          className="acc-input"
                        >
                          {ACCOUNT_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Risk */}
                    <div className="acc-field-group">
                      <span className="acc-field-group-title">Risk Strategy</span>

                      <div className={riskType === 'fixed' ? 'acc-grid-2' : ''}>
                        <div>
                          <label className="acc-label">Risk Model</label>
                          <select
                            value={riskType}
                            onChange={(e) => setRiskType(e.target.value)}
                            className="acc-input"
                          >
                            <option value="fixed">Fixed Risk</option>
                            <option value="variable">Variable Risk</option>
                          </select>
                        </div>

                        {riskType === 'fixed' && (
                          <div>
                            <label className="acc-label">Per Trade Target</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <div className="acc-input-wrap" style={{ flex: 1 }}>
                                <input
                                  type="number"
                                  value={riskValue}
                                  onChange={(e) => setRiskValue(e.target.value)}
                                  required
                                  min="0"
                                  step="0.01"
                                  className="acc-input has-suffix"
                                  placeholder="0.00"
                                />
                                <span className="acc-input-suffix">
                                  {riskUnit === 'percent' ? '%' : getCurrencySymbol(formData.currency)}
                                </span>
                              </div>
                              <select
                                value={riskUnit}
                                onChange={(e) => setRiskUnit(e.target.value)}
                                className="acc-input"
                                style={{ width: 92, flexShrink: 0 }}
                              >
                                <option value="percent">%</option>
                                <option value="amount">{formData.currency}</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {riskType === 'variable' && (
                        <p className="acc-hint">
                          ℹ Variable Risk allows individual position sizes per logged trade.
                        </p>
                      )}
                    </div>

                    {/* Stop Loss (Backtest only) */}
                    {formData.type === 'Backtest' && (
                      <div className="acc-field-group">
                        <span className="acc-field-group-title">Stop Loss Settings</span>

                        <div className="acc-grid-2">
                          <div>
                            <label className="acc-label">
                              Default SL <span style={{ color: 'var(--ink-3)', letterSpacing: 0, textTransform: 'none' }}>(optional)</span>
                            </label>
                            <input
                              type="number"
                              value={slValue}
                              onChange={(e) => setSlValue(e.target.value)}
                              min="0"
                              step="0.01"
                              className="acc-input"
                              placeholder="e.g. 12.5"
                            />
                          </div>
                          <div>
                            <label className="acc-label">Unit</label>
                            <select
                              value={slUnit}
                              onChange={(e) => setSlUnit(e.target.value)}
                              className="acc-input"
                            >
                              <option value="points">Points</option>
                              <option value="ticks">Ticks</option>
                            </select>
                          </div>
                        </div>

                        <p className="acc-hint">
                          ℹ Stop-loss is read from your trade log's <b>SL</b> column (in the unit above).
                          The default value is used only for trades whose SL cell is empty.
                        </p>
                      </div>
                    )}

                    {/* Commission */}
                    <div className="acc-field-group">
                      <span className="acc-field-group-title">Commission</span>

                      <div className={commissionMode === 'none' ? '' : 'acc-grid-2'}>
                        <div>
                          <label className="acc-label">Mode</label>
                          <select
                            value={commissionMode}
                            onChange={(e) => setCommissionMode(e.target.value)}
                            className="acc-input"
                          >
                            <option value="none">None</option>
                            <option value="flat">Flat per trade</option>
                            <option value="per_contract">Per contract</option>
                          </select>
                        </div>

                        {commissionMode !== 'none' && (
                          <div>
                            <label className="acc-label">
                              {commissionMode === 'per_contract' ? 'Per Contract' : 'Per Trade'}
                            </label>
                            <div className="acc-input-wrap">
                              <input
                                type="number"
                                value={commissionValue}
                                onChange={(e) => setCommissionValue(e.target.value)}
                                min="0"
                                step="0.01"
                                className="acc-input has-suffix"
                                placeholder="0.00"
                              />
                              <span className="acc-input-suffix">
                                {getCurrencySymbol(formData.currency)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {commissionMode === 'per_contract' && (
                        <p className="acc-hint">
                          ℹ Your Excel must include a <b>Contracts</b> column.
                          Commission per trade = value × contracts.
                        </p>
                      )}
                      {commissionMode === 'flat' && (
                        <p className="acc-hint">
                          ℹ Same amount charged on every trade.
                        </p>
                      )}
                      {commissionMode === 'none' && (
                        <p className="acc-hint">
                          ℹ No fees — net P&L will equal gross P&L.
                        </p>
                      )}
                    </div>

                  </div>

                  <div className="acc-modal-foot">
                    <button type="button" className="acc-btn" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="acc-btn-primary">
                      {editingId ? 'Save Changes' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Portal>
        )}

        {/* ---------- Alerts ---------- */}
        <Alert
          isOpen={deleteAlert.show}
          title="Delete Account"
          message={`Deleting account "${deleteAlert.accountName}" will also delete ${deleteAlert.tradesCount} associated trade(s). This action cannot be reversed.`}
          type="confirm"
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          showCancel={true}
        />

        {loadingDelete && <LoadingOverlay message="Deleting account and trades..." />}

        <Alert
          isOpen={successAlert.show}
          title="Success"
          message={successAlert.message}
          type="success"
          confirmText="OK"
          onConfirm={() => setSuccessAlert({ show: false, message: '' })}
          showCancel={false}
        />

        <Alert
          isOpen={errorAlert.show}
          title="Error"
          message={errorAlert.message}
          type="error"
          confirmText="OK"
          onConfirm={() => setErrorAlert({ show: false, message: '' })}
          showCancel={false}
        />
      </div>
    </>
  );
}