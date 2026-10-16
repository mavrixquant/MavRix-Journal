// src/shared/components/Portal.jsx
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export default function Portal({ children }) {
  const [container] = useState(() => document.createElement('div'));

  useEffect(() => {
    // Tag every portal container so global document listeners can
    // recognise that a click belongs to a portalled surface. The
    // sidebar's outside-click handler checks this attribute and
    // skips its own logic when it matches.
    container.setAttribute('data-portal-root', '');
    document.body.appendChild(container);

    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  return createPortal(children, container);
}