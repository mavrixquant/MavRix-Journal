// src/components/common/Portal.jsx
import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';

export default function Portal({ children }) {
  const portalRef = useRef(document.createElement('div'));

  useEffect(() => {
    const portal = portalRef.current;
    document.body.appendChild(portal);
    return () => {
      document.body.removeChild(portal);
    };
  }, []);

  return createPortal(children, portalRef.current);
}