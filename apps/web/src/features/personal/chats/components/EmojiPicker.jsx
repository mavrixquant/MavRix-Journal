import { useEffect, useRef, useState } from 'react';

const GROUPS = [
  { id: 'smile', icon: '😀', label: 'Smileys', items: '😀 😁 😂 🤣 😊 😍 🥰 😘 😎 🤩 🥳 😉 🙂 🤔 😅 😭 😢 😡 🥺 😴 🤯 😇 🙃 😬'.split(' ') },
  { id: 'hands', icon: '👍', label: 'Gestures', items: '👍 👎 👏 🙌 🙏 🤝 💪 👋 🤞 ✌️ 🤟 👌 🫶 ✍️ 🫡 🤌 👀 🧠 🔥 ✨ 💯 ✅ ❌ ⚡'.split(' ') },
  { id: 'hearts', icon: '❤️', label: 'Hearts', items: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 ❣️ 💕 💖 💗 💘 💝 😻 🌹 🌸 ⭐ 🌟 🎉 🎊 🎁 🏆'.split(' ') },
  { id: 'things', icon: '🚀', label: 'Things', items: '🚀 💡 📌 📎 📈 📊 💰 💼 🗓️ ⏰ 📝 📚 💻 📱 🎧 ☕ 🍕 🍿 🎯 🔔 🔒 🔑 🛠️ 🌍'.split(' ') },
];

export default function EmojiPicker({ onPick, onClose }) {
  const [group, setGroup] = useState(GROUPS[0].id);
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const current = GROUPS.find((g) => g.id === group) || GROUPS[0];

  return (
    <div className="emoji-pop" ref={ref} role="dialog" aria-label="Emoji picker">
      <div className="emoji-tabs" role="tablist">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === group}
            aria-label={g.label}
            title={g.label}
            className={`emoji-tab${g.id === group ? ' is-active' : ''}`}
            onClick={() => setGroup(g.id)}
          >
            {g.icon}
          </button>
        ))}
      </div>
      <div className="emoji-grid">
        {current.items.map((e) => (
          <button
            key={e}
            type="button"
            className="emoji-btn"
            onClick={() => onPick(e)}
            aria-label={`Insert ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
