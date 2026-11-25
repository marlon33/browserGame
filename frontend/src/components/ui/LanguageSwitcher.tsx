import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || 'pt';

  const toggleLanguage = (lang: 'pt' | 'en') => {
    if (current !== lang) {
      i18n.changeLanguage(lang);
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--bg-void)',
        borderRadius: '8px',
        padding: '2px',
        border: '1px solid var(--border-subtle)',
      }}
      role="group"
      aria-label="Language selector"
    >
      <button
        type="button"
        onClick={() => toggleLanguage('pt')}
        style={{
          padding: '0.22rem 0.5rem',
          borderRadius: '6px',
          border: 'none',
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: 'pointer',
          background: current.startsWith('pt') ? 'var(--gold-primary)' : 'transparent',
          color: current.startsWith('pt') ? '#090b10' : 'var(--text-muted)',
        }}
      >
        PT
      </button>
      <button
        type="button"
        onClick={() => toggleLanguage('en')}
        style={{
          padding: '0.22rem 0.5rem',
          borderRadius: '6px',
          border: 'none',
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: 'pointer',
          background: current.startsWith('en') ? 'var(--gold-primary)' : 'transparent',
          color: current.startsWith('en') ? '#090b10' : 'var(--text-muted)',
        }}
      >
        EN
      </button>
    </div>
  );
}
