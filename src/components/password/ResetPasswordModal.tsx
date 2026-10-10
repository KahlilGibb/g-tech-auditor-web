import React, { useState } from 'react';
import { Copy, KeyRound, RefreshCcw } from 'lucide-react';
import { appSwal } from '../../lib/appSwal';
import { getApiErrorMessage } from '../../lib/apiResponse';
import { generateTempPassword, passwordService } from '../../services/passwordService';
import { Alert, Button, Field, IconButton, Input, Modal } from '../ui';

export interface ResetTarget {
  id: string;
  name: string;
  username: string;
}

/** Admin sets a temporary password; the user is signed out everywhere. */
export const ResetPasswordModal: React.FC<{
  target: ResetTarget | null;
  onClose: () => void;
  onDone?: () => void;
}> = ({ target, ...props }) => (target ? <ResetPasswordDialog key={target.id} target={target} {...props} /> : null);

// Mounted per target, so each opening gets a fresh temporary password.
const ResetPasswordDialog: React.FC<{
  target: ResetTarget;
  onClose: () => void;
  onDone?: () => void;
}> = ({ target, onClose, onDone }) => {
  const [password, setPassword] = useState(generateTempPassword);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard can be unavailable (non-HTTPS); the password stays visible.
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password sementara minimal 8 karakter.');
      return;
    }
    setSaving(true);
    try {
      await passwordService.resetUser(target.id, password);
      await copy(password);
      onClose();
      onDone?.();
      await appSwal.success({
        title: 'Password berhasil direset',
        text: `Password sementara untuk @${target.username}: ${password} (sudah disalin). Berikan ke user lewat WA/telepon dan minta segera diganti dari menu Ubah Password.`,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal mereset password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Keamanan"
      title="Reset Password"
      subtitle={`${target.name} (@${target.username}) akan dikeluarkan dari semua perangkat.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form="reset-password-form"
            loading={saving}
            icon={!saving ? <KeyRound className="h-4 w-4" /> : undefined}
          >
            Reset Password
          </Button>
        </>
      }
    >
      <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Password sementara" htmlFor="temp-password">
          <div className="flex items-center gap-2">
            <Input
              id="temp-password"
              className="font-mono"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="off"
            />
            <IconButton type="button" onClick={() => setPassword(generateTempPassword())} aria-label="Buat password baru">
              <RefreshCcw className="h-4 w-4" />
            </IconButton>
            <IconButton type="button" onClick={() => copy(password)} aria-label="Salin password">
              <Copy className="h-4 w-4" />
            </IconButton>
          </div>
        </Field>
        <p className="text-xs text-stone">
          Berikan password ini ke user secara langsung (WA/telepon). User sebaiknya segera menggantinya dari menu Ubah
          Password.
        </p>
      </form>
    </Modal>
  );
};
