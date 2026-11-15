import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Command } from 'cmdk';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { useHotkey } from '@/shared/hooks/useHotkey';

const PAGE_INDEX = [
  { id: '/journal', title: 'Dashboard', category: 'Journal', path: '/journal', description: 'Track open positions, daily P&L and recent performance' },
  { id: '/journal/analyse', title: 'Analyse', category: 'Journal', path: '/journal/analyse', description: 'Analyze trading performance with detailed metrics and reports' },
  { id: '/journal/logs', title: 'Trade logs', category: 'Journal', path: '/journal/logs', description: 'View and manage your trade history' },
  { id: '/utilities/sessions', title: 'Sessions', category: 'Utilities', path: '/utilities/sessions', description: 'View market trading hours and session times' },
  { id: '/utilities/calendar', title: 'Economic Calendar', category: 'Utilities', path: '/utilities/calendar', description: 'Economic releases and high-impact news' },
  { id: '/utilities/gex', title: 'GEX Levels', category: 'Utilities', path: '/utilities/gex', description: 'Gamma exposure levels and market maker positioning' },
  { id: '/utilities/calculators', title: 'Calculators', category: 'Utilities', path: '/utilities/calculators', description: 'Access all trading calculators and tools' },
  { id: '/utilities/chart', title: 'Chart', category: 'Utilities', path: '/utilities/chart', description: 'Real-time market chart with technical analysis' },
  { id: '/manage/accounts', title: 'Accounts', category: 'Manage', path: '/manage/accounts', description: 'Manage trading accounts and balances' },
  { id: '/manage/strategies', title: 'Strategies', category: 'Manage', path: '/manage/strategies', description: 'Create and manage trading strategies' },
  { id: '/backtester', title: 'Backtester Dashboard', category: 'Backtest', path: '/backtester', description: 'Backtest trading strategies and analyze performance' },
  { id: '/backtester/logs', title: 'Test logs', category: 'Backtest', path: '/backtester/logs', description: 'View simulated trades from backtests' },
  { id: '/backtester/simulator', title: 'Simulator', category: 'Backtest', path: '/backtester/simulator', description: 'Monte Carlo probability simulation' },
  { id: '/personal/chats', title: 'Chats', category: 'Personal Space', path: '/personal/chats', description: 'Direct messages, channels and discussions' },
];

function GlobalSearchDialog({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return PAGE_INDEX;
    const q = search.toLowerCase();
    return PAGE_INDEX.filter((page) =>
      page.title.toLowerCase().includes(q) ||
      page.description.toLowerCase().includes(q) ||
      page.category.toLowerCase().includes(q)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const m = new Map();
    filtered.forEach((page) => {
      if (!m.has(page.category)) m.set(page.category, []);
      m.get(page.category).push(page);
    });
    return [...m.entries()];
  }, [filtered]);

  const handleSelect = (path) => {
    onOpenChange(false);
    setSearch('');
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gs-dialog" showCloseButton={false}>
        <Command className="gs-cmd" loop>
          <div className="gs-input-wrapper">
            <Search size={16} className="gs-icon" />
            <Command.Input
              autoFocus
              placeholder="Search user pages..."
              value={search}
              onValueChange={setSearch}
              className="gs-input"
              spellCheck={false}
              autoComplete="off"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="gs-clear"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <Command.List className="gs-list">
            <Command.Empty className="gs-empty">
              No pages found for &ldquo;{search}&rdquo;
            </Command.Empty>

            {grouped.map(([category, pages]) => (
              <Command.Group key={category} heading={category} className="gs-group">
                {pages.map((page) => (
                  <Command.Item
                    key={page.id}
                    value={page.title + ' ' + page.description}
                    onSelect={() => handleSelect(page.path)}
                    className="gs-item"
                  >
                    <span className="gs-item-title">{page.title}</span>
                    {page.description && (
                      <span className="gs-item-desc">{page.description}</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);

  useHotkey('mod+k', () => {
    setOpen((v) => !v);
  });

  return (
    <>
      <button
        type="button"
        className="gs-trigger"
        onClick={() => setOpen(true)}
        title="Search pages (Ctrl+K)"
        aria-label="Search pages"
      >
        <Search size={15} className="gs-trigger-icon" />
        <span className="gs-trigger-text">Search pages</span>
        <kbd className="gs-trigger-kbd">
          <span className="gs-trigger-kbd-mod">⌘</span>K
        </kbd>
      </button>

      <GlobalSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
