import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div role="alertdialog" aria-modal="true" className="relative bg-bg-card border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-start gap-3 mb-6">
          <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-white">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-bg-dark hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors border border-gray-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="flex-1 bg-red-600 hover:bg-red-500 text-on-accent font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
