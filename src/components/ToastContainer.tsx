import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Toast } from '../hooks/useToast';

const icons = {
  success: <CheckCircle size={18} className="shrink-0 text-green-400" />,
  error: <AlertCircle size={18} className="shrink-0 text-red-400" />,
  info: <Info size={18} className="shrink-0 text-accent-blue" />,
};

const styles = {
  success: 'border-green-500/40 bg-green-900/20',
  error: 'border-red-500/40 bg-red-900/20',
  info: 'border-accent-blue/40 bg-blue-900/20',
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: number) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border bg-bg-card shadow-xl pointer-events-auto
            animate-[slideIn_0.2s_ease-out] ${styles[toast.type]}`}
        >
          {icons[toast.type]}
          <p className="flex-1 text-sm text-gray-100 leading-snug">{toast.message}</p>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-gray-500 hover:text-white transition-colors mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
