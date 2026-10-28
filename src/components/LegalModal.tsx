import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LEGAL, LEGAL_SECTIONS } from '../legal';

export function LegalModal({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const updatedAt = new Date(LEGAL.updatedAt).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-bg-card border border-gray-700 rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-title text-accent-gold">{t('legal.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto -mx-2 px-2 space-y-4 text-sm">
          {LEGAL_SECTIONS.map(section => (
            <section key={section}>
              <h3 className="font-bold text-white mb-1">{t(`legal.sections.${section}.title`)}</h3>
              <p className="text-gray-400 whitespace-pre-line">
                {t(`legal.sections.${section}.body`, { publisher: LEGAL.publisher, email: LEGAL.contactEmail })}
              </p>
            </section>
          ))}
          <p className="text-xs text-gray-500">
            {t('legal.updatedAt', { date: updatedAt })} · {t('footer.version', { version: __APP_VERSION__ })}
          </p>
        </div>
      </div>
    </div>
  );
}
