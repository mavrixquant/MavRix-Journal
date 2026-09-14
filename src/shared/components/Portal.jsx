// src/shared/components/Portal.jsx
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export default function Portal({ children }) {
  const [container] = useState(() => document.createElement('div'));

  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  return createPortal(children, container);
}