import React, { useEffect, useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { appSwal } from '../../lib/appSwal';
import { getApiErrorMessage } from '../../lib/apiResponse';
import { passwordService, type PasswordResetRequest } from '../../services/passwordService';
import { Badge, Button, Card, CardHeader } from '../ui';
import type { ResetTarget } from './ResetPasswordModal';

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

/**
 * Open "forgot password" requests filed from the login screens. Hidden when
 * there are none. `refreshKey` reloads it after a reset made elsewhere.
 */
export const PasswordResetRequestsPanel: React.FC<{
  onReset: (target: ResetTarget) => void;
  refreshKey: number;
}> = ({ onReset, refreshKey }) => {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;
    passwordService
      .listRequests()
      .then(list => active && setRequests(list))
      .catch(() => active && setRequests([]));
    return () => {
      active = false;
    };
  }, [refreshKey, reloadTick]);

  const dismiss = async (request: PasswordResetRequest) => {
    const confirmed = await appSwal.confirm({
      title: 'Abaikan permintaan?',
      text: `Permintaan reset dari ${request.name} akan ditutup tanpa mengubah password.`,
      confirmText: 'Ya, abaikan',
      cancelText: 'Batal',
    });
    if (!confirmed) return;
    setBusyId(request.id);
    try {
      await passwordService.dismissRequest(request.id);
      setReloadTick(tick => tick + 1);
    } catch (err) {
      await appSwal.error({ title: 'Gagal mengabaikan permintaan', text: getApiErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <Card className="overflow-hidden border-warning-amber/30">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Permintaan Reset Password <Badge tone="warning">{requests.length}</Badge>
          </span>
        }
        icon={<KeyRound className="h-4 w-4" />}
      />
      <ul className="divide-y divide-hairline-soft">
        {requests.map(request => (
          <li key={request.id} className="flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-deep">
                {request.name} <span className="font-normal text-stone">@{request.username}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-stone">
                {[request.roleName, request.branches.join(', '), timeAgo(request.createdAt)].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => dismiss(request)}
                loading={busyId === request.id}
                icon={busyId !== request.id ? <X className="h-4 w-4" /> : undefined}
              >
                Abaikan
              </Button>
              <Button
                size="sm"
                onClick={() => onReset({ id: request.userId, name: request.name, username: request.username })}
                icon={<KeyRound className="h-4 w-4" />}
              >
                Reset Password
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
};
