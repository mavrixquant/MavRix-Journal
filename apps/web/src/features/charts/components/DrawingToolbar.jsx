import { Eye, EyeOff, Magnet, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { TOOLS, DRAW_COLORS } from '../lib/drawings';
import { ToolIcon } from './ChartIcons';

export default function DrawingToolbar({
  tool, onTool, magnet, onMagnet, color, onColor,
  hidden, onToggleHidden, count, onClear,
}) {
  return (
    <div className="mk-rail" role="toolbar" aria-label="Drawing tools" aria-orientation="vertical">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`mk-tool${tool === t.id ? ' is-on' : ''}`}
          onClick={() => onTool(tool === t.id && t.id !== 'cursor' ? 'cursor' : t.id)}
          aria-pressed={tool === t.id}
          aria-label={t.label}
          title={`${t.label} (${t.key})`}
        >
          <ToolIcon id={t.id} />
        </button>
      ))}

      <span className="mk-rail-sep" />

      <button type="button" className={`mk-tool${magnet ? ' is-on' : ''}`} onClick={onMagnet} aria-pressed={magnet} aria-label="Magnet mode" title="Snap to OHLC (Q)"><Magnet size={15} /></button>

      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="mk-tool" aria-label="Drawing color" title="Drawing color"><i className="mk-color-dot" style={{ background: color }} /></button>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={8} className="mk-pop mk-pop-colors">
          {DRAW_COLORS.map((c) => (
            <button key={c} type="button" className={`mk-swatch${c === color ? ' is-on' : ''}`} style={{ background: c }} onClick={() => onColor(c)} aria-label={`Color ${c}`} />
          ))}
        </PopoverContent>
      </Popover>

      <span className="mk-rail-grow" />

      <button type="button" className={`mk-tool${hidden ? ' is-on' : ''}`} onClick={onToggleHidden} aria-pressed={hidden} aria-label={hidden ? 'Show drawings' : 'Hide drawings'} title={hidden ? 'Show drawings' : 'Hide drawings'}>
        {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <button type="button" className="mk-tool" onClick={onClear} disabled={count === 0} aria-label={`Remove all drawings (${count})`} title={`Remove all drawings (${count})`}><Trash2 size={15} /></button>
    </div>
  );
}
