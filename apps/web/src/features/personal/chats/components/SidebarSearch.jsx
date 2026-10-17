// apps/web/src/features/personal/chats/components/SidebarSearch.jsx
import { Search } from 'lucide-react';

export default function SidebarSearch({
  value,
  onChange,
  placeholder = 'Search conversations…',
}) {
  return (
    <div className="chat-sidebar-search">
      <Search size={13} aria-hidden />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        aria-label="Search conversations"
      />
    </div>
  );
}