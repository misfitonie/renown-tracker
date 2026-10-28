import { useCallback, useRef, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';

// Remplace window.confirm() par une modale : `await confirm(message)` renvoie true si l'utilisateur valide
export function useConfirm() {
  const [message, setMessage] = useState<string | null>(null);
  const resolveRef = useRef<(value: boolean) => void>();

  const confirm = useCallback((text: string) => {
    resolveRef.current?.(false);
    setMessage(text);
    return new Promise<boolean>(resolve => { resolveRef.current = resolve; });
  }, []);

  const close = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = undefined;
    setMessage(null);
  }, []);

  const onConfirm = useCallback(() => close(true), [close]);
  const onCancel = useCallback(() => close(false), [close]);

  const confirmDialog = message !== null
    ? <ConfirmModal message={message} onConfirm={onConfirm} onCancel={onCancel} />
    : null;

  return { confirm, confirmDialog };
}
