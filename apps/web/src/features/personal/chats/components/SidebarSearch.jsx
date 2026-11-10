import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

const SidebarSearch = forwardRef(function SidebarSearch(
  { value, onChange, placeholder = 'Search conversations' },
  ref
) {
  return (
    <div className="chat-sidebar-search">
      <Search size={15} aria-hidden />
      <input
        ref={ref}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.stopPropagation();
            onChange('');
          }
        }}
        spellCheck={false}
        autoComplete="off"
        aria-label="Search conversations"
      />
      {value ? (
        <button
          type="button"
          className="chat-sidebar-search-clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      ) : (
        <kbd className="chat-sidebar-search-kbd" aria-hidden>Ctrl K</kbd>
      )}
    </div>
  );
});

export default SidebarSearch;
