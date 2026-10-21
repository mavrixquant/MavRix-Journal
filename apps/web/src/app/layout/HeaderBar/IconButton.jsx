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

export function IconButton({ icon, label, onClick, variant, text }) {
  const variantClass =
    variant === 'danger' ? ' is-danger'
    : variant === 'accent' ? ' is-accent'
    : '';

  const hasText = typeof text === 'string' && text.trim().length > 0;
  const cls = `hb-icon-btn${variantClass}${hasText ? ' has-text' : ''}`;

  return (
    <HBTooltip label={label}>
      <button
        type="button"
        className={cls}
        onClick={onClick}
        aria-label={label}
      >
        {icon}
        {hasText && <span className="hb-icon-btn-text">{text}</span>}
      </button>
    </HBTooltip>
  );
}