// apps/web/src/app/shell/AccountSelect.jsx
import { Select as SelectPrimitive } from 'radix-ui';
import { Wallet, ChevronDown, Check } from 'lucide-react';

function accountTypeClass(type) {
  if (type === 'Live') return 'is-live';
  if (type === 'Demo') return 'is-demo';
  return 'is-backtest';
}

function accountInitials(name) {
  if (!name) return 'AC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AccountSelect({ accounts, value, onChange }) {
  const selected = accounts.find((a) => a.id === value) || null;

  return (
    <SelectPrimitive.Root
      value={value || undefined}
      onValueChange={onChange}
      disabled={accounts.length === 0}
    >
      <SelectPrimitive.Trigger
        className="hb-account-trigger"
        aria-label="Select trading account"
      >
        <span className="hb-account-icon" aria-hidden>
          <Wallet size={15} />
        </span>

        <span className="hb-account-text">
          <span className="hb-account-eyebrow">Active Account</span>
          <SelectPrimitive.Value placeholder="No accounts">
            <span className="hb-account-name">
              {selected ? selected.name : 'No accounts'}
            </span>
          </SelectPrimitive.Value>
        </span>

        <SelectPrimitive.Icon asChild>
          <ChevronDown className="hb-account-chevron" size={14} aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="hb-select-content"
          position="popper"
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
        >
          <div className="hb-select-header">
            <span className="hb-select-header-label">Switch Account</span>
            <span className="hb-select-header-count">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            </span>
          </div>

          <SelectPrimitive.Viewport className="hb-select-viewport">
            {accounts.length === 0 ? (
              <div className="hb-select-empty">No accounts yet</div>
            ) : (
              accounts.map((acc) => (
                <SelectPrimitive.Item
                  key={acc.id}
                  value={acc.id}
                  className="hb-select-item"
                >
                  <span className="hb-select-item-icon" aria-hidden>
                    {accountInitials(acc.name)}
                  </span>

                  <span className="hb-select-item-body">
                    <SelectPrimitive.ItemText>
                      <span className="hb-select-item-name">{acc.name}</span>
                    </SelectPrimitive.ItemText>
                    <span className="hb-select-item-meta">
                      <span
                        className={`hb-select-item-type ${accountTypeClass(acc.type)}`}
                      >
                        {acc.type || 'Backtest'}
                      </span>
                      <span>{acc.currency || 'USD'}</span>
                    </span>
                  </span>

                  <span className="hb-select-item-check" aria-hidden>
                    <Check size={14} strokeWidth={3} />
                  </span>
                </SelectPrimitive.Item>
              ))
            )}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}