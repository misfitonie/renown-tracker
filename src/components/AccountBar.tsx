import { Cloud, CloudOff, RefreshCw, AlertTriangle, LogIn, LogOut, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SyncStatus } from '../hooks/usePlayers';

export interface AccountInfo {
  email: string | null;   // null : mode sans compte
  syncStatus: SyncStatus;
  onSignIn: () => void;
  onSignOut: () => void;
}

const SYNC_ICONS = {
  local: HardDrive,
  syncing: RefreshCw,
  synced: Cloud,
  offline: CloudOff,
  error: AlertTriangle,
};

const SYNC_COLORS: Record<SyncStatus, string> = {
  local: 'text-gray-500',
  syncing: 'text-accent-blue',
  synced: 'text-green-400',
  offline: 'text-gray-500',
  error: 'text-red-400',
};

export function AccountBar({
  account,
  stacked = false,
  className = '',
}: {
  account: AccountInfo;
  stacked?: boolean; // menu étroit : action sous l'email
  className?: string;
}) {
  const { t } = useTranslation();
  const Icon = SYNC_ICONS[account.syncStatus];

  return (
    <div className={`flex items-center gap-x-2 gap-y-1.5 text-xs ${stacked ? 'flex-wrap' : ''} ${className}`}>
      <span title={t(`auth.sync.${account.syncStatus}`)} className={SYNC_COLORS[account.syncStatus]}>
        <Icon size={14} className={account.syncStatus === 'syncing' ? 'animate-spin' : ''} />
      </span>
      <span className={`min-w-0 truncate text-gray-400 ${stacked ? 'w-[calc(100%-22px)]' : 'flex-1'}`}>
        {account.email ? t('auth.account.signedInAs', { email: account.email }) : t('auth.account.guest')}
      </span>
      <button
        onClick={account.email ? account.onSignOut : account.onSignIn}
        className="flex items-center gap-1 shrink-0 text-gray-400 hover:text-white transition-colors"
      >
        {account.email ? <LogOut size={12} /> : <LogIn size={12} />}
        {account.email ? t('auth.account.signOut') : t('auth.account.signIn')}
      </button>
    </div>
  );
}
