import { useRef, useEffect, useCallback } from 'react';

export function useDragSelect(selected, setSelected) {
  const isDragging = useRef(false);
  const dragValue  = useRef(null);

  useEffect(() => {
    const stop = () => { isDragging.current = false; };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  const onMouseDown = useCallback((key) => (e) => {
    e.preventDefault();
    isDragging.current = true;
    dragValue.current  = !selected.has(key);
    setSelected(prev => {
      const next = new Set(prev);
      dragValue.current ? next.add(key) : next.delete(key);
      return next;
    });
  }, [selected, setSelected]);

  const onMouseEnter = useCallback((key) => () => {
    if (!isDragging.current) return;
    setSelected(prev => {
      const next = new Set(prev);
      dragValue.current ? next.add(key) : next.delete(key);
      return next;
    });
  }, [setSelected]);

  return { onMouseDown, onMouseEnter, isDragging };
}
