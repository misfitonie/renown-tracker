import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LegalModal } from './LegalModal';

export function AppFooter({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const [showLegal, setShowLegal] = useState(false);
  const linkClass = 'hover:text-gray-500 transition-colors';

  return (
    <footer className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-gray-700 ${className}`}>
      <a href="https://github.com/misfitonie" target="_blank" rel="noopener noreferrer" className={linkClass}>
        github.com/misfitonie
      </a>
      <span aria-hidden>·</span>
      <button onClick={() => setShowLegal(true)} className={linkClass}>
        {t('footer.legal')}
      </button>
      <span aria-hidden>·</span>
      <span title={__APP_COMMIT__ || undefined}>{t('footer.version', { version: __APP_VERSION__ })}</span>
      {showLegal && <LegalModal onClose={() => setShowLegal(false)} />}
    </footer>
  );
}
