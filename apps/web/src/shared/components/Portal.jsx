import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export default function Portal({ children }) {
  const [container] = useState(() => document.createElement('div'));

  useEffect(() => {
    container.setAttribute('data-portal-root', '');
    document.body.appendChild(container);

    return () => {
      // .remove() is idempotent and safe even if the node was moved by an
      // extension or already detached (strict-mode double-invocation, etc.).
      try {
        container.remove();
      } catch {
        // no-op
      }
    };
  }, [container]);

  return createPortal(children, container);
}