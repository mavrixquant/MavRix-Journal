// apps/web/src/features/personal/chats/components/MessageBody.jsx
//
// Renders a message body with clickable links.
//
// Parses two forms:
//   1. Markdown-style links:  [text](url)
//   2. Bare URLs:             https://…, http://…, www.…
//
// All links open in a new window (target="_blank") per product requirement.
// Internal paths like [/journal](/journal) are treated as links and open in a
// new tab, which loads the SPA fresh.
//
// The parser is XSS-safe: it returns React elements (never dangerouslySetInnerHTML).
// Trailing punctuation (., ,, ;, :, !, ?, ), ]) is split off a bare URL so
// `see www.google.com.` renders as `<a>www.google.com</a>.`
//
// The <style> block is injected exactly ONCE at module level so every message
// shares the same `<a class="msg-link">` styling without duplicating rules.

import { useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Parser                                                             */
/* ------------------------------------------------------------------ */

// Greedy URL match. We greedily capture trailing punctuation and strip it
// inside the loop, so URLs wrapped in brackets/periods still linkify the
// core part.
const PATTERN =
  /\[([^\]\n]+)\]\(([^)\s]+)\)|((?:https?:\/\/|www\.)[^\s<>()\[\]]+)/gi;

function parseBody(rawText) {
  if (rawText == null) return [{ type: 'text', value: '' }];

  const text = String(rawText);
  if (!text) return [{ type: 'text', value: '' }];

  const parts = [];
  let lastIndex = 0;
  let match;

  // Reset regex state (module-level /g regex is stateful).
  PATTERN.lastIndex = 0;

  while ((match = PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      // ---- Markdown link: [text](href) ----
      let href = match[2];
      // Add https:// for schemeless external hrefs like "google.com"
      if (!/^(https?:\/\/|mailto:|\/)/i.test(href)) {
        href = `https://${href}`;
      }
      parts.push({ type: 'link', text: match[1], href });
    } else if (match[3] !== undefined) {
      // ---- Bare URL ----
      let url = match[3];

      // Strip trailing punctuation that's almost certainly not part of the URL
      const trailing = [];
      while (url.length > 0 && /[.,;:!?)\]]$/.test(url)) {
        trailing.unshift(url.slice(-1));
        url = url.slice(0, -1);
      }

      if (url.length > 0) {
        const href = /^www\./i.test(url) ? `https://${url}` : url;
        parts.push({ type: 'link', text: url, href });
      }

      if (trailing.length > 0) {
        parts.push({ type: 'text', value: trailing.join('') });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: text }];
}

/* ------------------------------------------------------------------ */
/*  Styles — injected once at module load                              */
/* ------------------------------------------------------------------ */

const STYLE_ID = 'msg-body-link-styles';
const CSS = `
  .msg-link {
    color: var(--accent);
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--accent) 40%, transparent);
    text-underline-offset: 2px;
    word-break: break-all;
    transition: color .15s ease, text-decoration-color .15s ease;
  }
  .msg-link:hover {
    color: var(--accent-2);
    text-decoration-color: var(--accent);
  }
  .msg-row.is-own .msg-link {
    color: #0D1117;
    text-decoration-color: rgba(13, 17, 23, 0.45);
    font-weight: 600;
  }
  .msg-row.is-own .msg-link:hover {
    color: #000000;
    text-decoration-color: #000000;
  }
  @media (prefers-reduced-motion: reduce) {
    .msg-link { transition: none !important; }
  }
`;

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MessageBody({ body }) {
  const parts = useMemo(() => parseBody(body), [body]);

  return (
    <>
      {parts.map((part, idx) =>
        part.type === 'link' ? (
          <a
            key={idx}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="msg-link"
          >
            {part.text}
          </a>
        ) : (
          <span key={idx}>{part.value}</span>
        )
      )}
    </>
  );
}