import { useCallback, useEffect, useRef, useState } from 'react';

export interface MesaToastState {
  msg: string;
  ok: boolean;
}

export function useMesaToast() {
  const [toast, setToast] = useState<MesaToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, ok });
    timerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { toast, showToast };
}
