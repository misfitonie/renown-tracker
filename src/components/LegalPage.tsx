import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LEGAL, LEGAL_SECTIONS } from '../legal';
import { useTheme } from '../hooks/useTheme';
import { AppFooter } from './AppFooter';

export function LegalPage() {
  const { t, i18n } = useTranslation();
  useTheme();
  const updatedAt = new Date(LEGAL.updatedAt).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-dark via-[var(--theme-glow)] to-bg-dark px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} />
          {t('legal.back')}
        </a>

        <h1 className="font-title text-3xl sm:text-4xl text-accent-gold mb-8">{t('legal.title')}</h1>

        <div className="space-y-6 text-sm">
          {LEGAL_SECTIONS.map(section => (
            <section key={section}>
              <h2 className="font-bold text-white text-base mb-1.5">{t(`legal.sections.${section}.title`)}</h2>
              <p className="text-gray-400 whitespace-pre-line leading-relaxed">
                {t(`legal.sections.${section}.body`, { publisher: LEGAL.publisher, email: LEGAL.contactEmail })}
              </p>
            </section>
          ))}
          <p className="text-xs text-gray-500">{t('legal.updatedAt', { date: updatedAt })}</p>
        </div>

        <AppFooter className="mt-12" />
      </div>
    </div>
  );
}
