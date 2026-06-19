import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const AccessDenied: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-divider bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-danger-red/10 text-danger-red">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">{t('rbac.deniedTitle')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('rbac.deniedDescription')}
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-primary-blue px-4 text-sm font-semibold text-white transition hover:bg-primary-blue-dark"
        >
          {t('rbac.backHome')}
        </Link>
      </div>
    </div>
  );
};

export default AccessDenied;
