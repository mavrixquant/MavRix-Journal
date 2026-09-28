// apps/web/src/app/shell/IconButton.jsx
import { Tooltip as TooltipPrimitive } from 'radix-ui';

export function HBTooltip({ label, children }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="bottom"
          align="center"
          sideOffset={8}
          className="hb-tip"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function IconButton({ icon, label, onClick, variant }) {
  const variantClass =
    variant === 'danger' ? ' is-danger'
    : variant === 'accent' ? ' is-accent'
    : '';

  return (
    <HBTooltip label={label}>
      <button
        type="button"
        className={`hb-icon-btn${variantClass}`}
        onClick={onClick}
        aria-label={label}
      >
        {icon}
      </button>
    </HBTooltip>
  );
}